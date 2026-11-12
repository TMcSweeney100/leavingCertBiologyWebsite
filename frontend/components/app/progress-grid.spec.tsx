import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { grid, INITIAL, LOG, row, waitingFor } from "./progress-fixtures";
import { ProgressGrid } from "./progress-grid";

const AOIFE = row("a", "Aoife", "Byrne", 2, ["DUE", "DUE"], 20, "https://docs.example.com/aoife");
const CIAN = row("c", "Cian", "Murphy", 1, ["SIGNED_OFF", "DUE"], null);
const START = grid([AOIFE, CIAN]);
const props = { basePath: "/teach/classes/cl1/progress", hideNames: false };
const left = () => within(screen.getByRole("region", { name: /Still to sign off/ }));

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  document.cookie = "app_hide_names=; max-age=0; path=/";
});

describe("ProgressGrid", () => {
  it("puts the requests first, then the stage's card and who's still to sign off, one button each", () => {
    const ready = { ...CIAN, cells: [CIAN.cells[0], { ...CIAN.cells[1], state: "READY" as const }] };
    render(<ProgressGrid grid={grid([AOIFE, ready], [waitingFor(ready, 2)])} {...props} stage="2" />);
    expect(screen.getByRole("heading", { name: "1 student waiting for you" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Stages" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: LOG })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Still to sign off · 2" })).toBeInTheDocument();
    expect(left().getAllByRole("link", { name: /^(Aoife Byrne|Cian Murphy)$/ }).map((l) => l.textContent)).toEqual(["Aoife Byrne", "Cian Murphy"]);
    expect(left().getByRole("link", { name: "Open Aoife Byrne's work (opens in a new tab)" })).toHaveAttribute("href", "https://docs.example.com/aoife");
    expect(left().getByRole("button", { name: `Sign off ${LOG} for Aoife Byrne` })).toHaveTextContent("Sign off");
    expect(left().getByRole("link", { name: `Review ${LOG} for Cian Murphy` })).toHaveAttribute("href", "/teach/classes/cl1/students/c#checkpoint-c2");
    expect(left().getByText("No entries yet")).not.toHaveClass("font-semibold");
    expect(left().getByText("Last entry 20 days ago")).toHaveClass("font-semibold");
  });

  it("signs off in place: the row stays with Undo, the count goes down, and Re-sort moves it to Signed off", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "c1", state: "SIGNED_OFF", signedOffOn: "2026-12-14" });
    const { rerender } = render(<ProgressGrid grid={START} {...props} stage="1" />);
    expect(screen.getByRole("heading", { name: "Still to sign off · 1" })).toBeInTheDocument();
    await userEvent.click(left().getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/students/a/checkpoints/c1/signoff", { signedOff: true }, expect.anything());
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByText(`Signed off: ${INITIAL}, for Aoife Byrne.`)).toBeInTheDocument();

    const after = grid([{ ...AOIFE, behindBy: 1, cells: [{ ...AOIFE.cells[0], state: "SIGNED_OFF", signedOffOn: "2026-12-14" }, AOIFE.cells[1]] }, CIAN]);
    rerender(<ProgressGrid grid={after} {...props} stage="1" />);
    expect(left().getByRole("button", { name: `Undo sign-off of ${INITIAL} for Aoife Byrne` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Still to sign off · 0" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Re-sort (1 change)" }));
    expect(screen.getByText("Everyone is signed off for this stage.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Signed off · 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Re-sort/ })).not.toBeInTheDocument();
  });

  it("revokes from the folded Signed off list, only after the in-place question", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "c1", state: "DUE", signedOffOn: null });
    render(<ProgressGrid grid={START} {...props} stage="1" />);
    await userEvent.click(screen.getByRole("button", { name: "Show signed-off students" }));
    await userEvent.click(screen.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Cian Murphy` }));
    expect(api.send).not.toHaveBeenCalled();
    expect(screen.getByText(/^Revoke the sign-off of/)).toHaveTextContent(`Revoke the sign-off of “${INITIAL}” for Cian Murphy? It stays in the record as revoked by you.`);
    await userEvent.click(screen.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Cian Murphy` }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/students/c/checkpoints/c1/signoff", { signedOff: false }, expect.anything());
  });

  it("a failed sign-off leaves the row and offers Try again", async () => {
    vi.mocked(api.send).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ checkpointId: "c2", state: "SIGNED_OFF", signedOffOn: "2026-12-14" });
    render(<ProgressGrid grid={START} {...props} stage="2" />);
    await userEvent.click(left().getByRole("button", { name: `Sign off ${LOG} for Cian Murphy` }));
    expect(left().getByRole("alert")).toHaveTextContent(`Couldn’t sign off “${LOG}” for Cian Murphy. Nothing changed.`);
    await userEvent.click(left().getByRole("button", { name: "Try again" }));
    expect(api.send).toHaveBeenCalledTimes(2);
  });

  it("two quick sign-offs each stay busy until their own answer, and a failure survives the next click", async () => {
    const answers: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];
    vi.mocked(api.send).mockImplementation(() => new Promise((resolve, reject) => { answers.push({ resolve, reject }); }));
    render(<ProgressGrid grid={START} {...props} stage="2" />);
    const aoife = () => left().getByRole("button", { name: `Sign off ${LOG} for Aoife Byrne` });
    const cian = () => left().getByRole("button", { name: `Sign off ${LOG} for Cian Murphy` });

    await userEvent.click(aoife());
    await userEvent.click(cian());
    expect(aoife()).toBeDisabled();
    expect(aoife()).toHaveTextContent("Signing off…");
    expect(cian()).toBeDisabled();

    await act(async () => answers[0].reject(new Error("offline")));
    expect(cian()).toBeDisabled(); // its request is still out
    expect(left().getByRole("alert")).toHaveTextContent("for Aoife Byrne");

    await act(async () => answers[1].resolve({ checkpointId: "c2", state: "SIGNED_OFF", signedOffOn: "2026-12-14" }));
    expect(left().getByRole("alert")).toHaveTextContent("for Aoife Byrne"); // Cian's success doesn't clear Aoife's failure
    expect(screen.getByRole("button", { name: "Re-sort (1 change)" })).toBeInTheDocument();
  });

  it("Hide names blurs names and counts, in the revoke question and the failure alert too, and is remembered in a cookie", async () => {
    vi.mocked(api.send).mockRejectedValueOnce(new Error("offline"));
    const { container } = render(<ProgressGrid grid={START} {...props} stage="2" />);
    const hide = screen.getByRole("switch", { name: "Hide names" });
    expect(hide).toHaveAttribute("aria-checked", "false");
    await userEvent.click(hide);
    expect(hide).toHaveAttribute("aria-checked", "true");
    expect(container.firstElementChild).toHaveClass("app-hide-names");
    expect(document.cookie).toContain("app_hide_names=1");
    expect(left().getByRole("link", { name: "Aoife Byrne" })).toHaveAttribute("data-private");
    await userEvent.click(left().getByRole("button", { name: `Sign off ${LOG} for Aoife Byrne` }));
    expect(within(left().getByRole("alert")).getByText("Aoife Byrne")).toHaveAttribute("data-private"); // plan P4-16
  });

  it("All answers in its card, then bands the quiet grid furthest behind first, with Up to date folded", async () => {
    const DARA = row("d", "Dara", "Walsh", 0, ["SIGNED_OFF", "SIGNED_OFF"], 2);
    render(<ProgressGrid grid={grid([AOIFE, CIAN, DARA])} {...props} stage="all" />);
    expect(screen.getByRole("heading", { level: 2, name: "2 of 3 students are behind" })).toBeInTheDocument();
    const table = within(screen.getByRole("table", { name: /Checkpoint sign-offs for 6A Biology/ }));
    expect(table.getAllByRole("link", { name: /^(Aoife Byrne|Cian Murphy)$/ }).map((l) => l.textContent)).toEqual(["Aoife Byrne", "Cian Murphy"]);
    expect(table.getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` })).toHaveTextContent("Sign off");
    expect(table.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Cian Murphy` })).toHaveAttribute("title", "Signed off 2 Oct 2026");
    expect(table.queryByRole("link", { name: "Dara Walsh" })).not.toBeInTheDocument();
    await userEvent.click(table.getByRole("button", { name: "Show 1 more" }));
    expect(table.getByRole("link", { name: "Dara Walsh" })).toBeInTheDocument();
  });

  it("All on a phone is read-only: each student's stage dots in words, and no sign-off buttons", () => {
    render(<ProgressGrid grid={START} {...props} stage="all" />);
    const list = within(screen.getByRole("region", { name: "Students" }));
    expect(list.getByText("Signed off: Stage 1. Due: Stage 2.")).toBeInTheDocument();
    expect(list.getByRole("link", { name: "Cian Murphy" })).toHaveAttribute("href", "/teach/classes/cl1/students/c");
    expect(list.queryByRole("button", { name: /^Sign off/ })).not.toBeInTheDocument();
  });
});
