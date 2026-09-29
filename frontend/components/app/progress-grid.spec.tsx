import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";
import type { ProgressGrid as Grid } from "@/lib/api/schemas";

import { ProgressGrid } from "./progress-grid";

const INITIAL = "Initial ideas discussed with the teacher";
const LOG = "Investigative log shared with the teacher";
const row = (id: string, first: string, last: string, behindBy: number, s1: "DUE" | "SIGNED_OFF", days: number | null) => ({
  studentId: id, firstName: first, lastName: last, behindBy, lastLogActivityOn: null, daysSinceLastLogActivity: days,
  cells: [
    { checkpointId: "c1", state: s1, signedOffOn: s1 === "SIGNED_OFF" ? "2026-10-02" : null },
    { checkpointId: "c2", state: "DUE" as const, signedOffOn: null },
  ],
});
const grid = (students: Grid["students"]): Grid => ({
  componentId: "k1", classId: "cl1", className: "6A Biology", today: "2026-12-14",
  stages: [
    { stageId: "s1", ordinal: 1, label: "Stage 1", name: "Initial", dueDate: "2026-10-02", checkpoint: { id: "c1", text: INITIAL } },
    { stageId: "s2", ordinal: 2, label: "Stage 2", name: "Research", dueDate: "2026-11-06", checkpoint: { id: "c2", text: LOG } },
  ],
  students,
});
const START = grid([row("a", "Aoife", "Byrne", 2, "DUE", 20), row("c", "Cian", "Murphy", 1, "SIGNED_OFF", 3)]);
const props = { basePath: "/teach/classes/cl1/progress", laptopStage: "all", phoneStage: "2", hideNames: false };
const table = () => within(screen.getByRole("table", { name: /Checkpoint sign-offs for 6A Biology/ }));

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  document.cookie = "app_hide_names=; max-age=0; path=/";
});

describe("ProgressGrid", () => {
  it("answers first, then groups students into bands, furthest behind first", () => {
    render(<ProgressGrid grid={START} {...props} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("2 of 2 students are behind");
    expect(screen.getByText("Stages 1 and 2 are due. Furthest behind first.")).toBeInTheDocument();
    expect(table().getAllByRole("link", { name: /^(Aoife Byrne|Cian Murphy)$/ }).map((l) => l.textContent)).toEqual(["Aoife Byrne", "Cian Murphy"]);
    expect(table().getByText("checkpoints behind")).toBeInTheDocument();
    expect(table().getByRole("link", { name: "Aoife Byrne" })).toHaveAttribute("href", "/teach/classes/cl1/students/a");
    expect(table().getByText("Last entry 20 days ago")).toBeInTheDocument();
    expect(table().getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` })).toBeInTheDocument();
  });

  it("signs off in one click, announces it, offers Undo, and keeps the row where it was until Re-sort", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "c1", state: "SIGNED_OFF", signedOffOn: "2026-12-14" });
    const { rerender } = render(<ProgressGrid grid={START} {...props} />);
    await userEvent.click(table().getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/students/a/checkpoints/c1/signoff", { signedOff: true }, expect.anything());
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByText(`Signed off: ${INITIAL}, for Aoife Byrne.`)).toBeInTheDocument();

    // The server now has Aoife behind by 1 and Cian by 1; the page keeps Aoife first until Re-sort.
    const after = grid([row("c", "Cian", "Murphy", 1, "SIGNED_OFF", 3), { ...row("a", "Aoife", "Byrne", 1, "SIGNED_OFF", 20) }]);
    rerender(<ProgressGrid grid={after} {...props} />);
    expect(table().getAllByRole("link", { name: /Aoife Byrne|Cian Murphy/ }).map((l) => l.textContent)).toEqual(["Aoife Byrne", "Cian Murphy"]);
    expect(table().getByRole("button", { name: `Undo sign-off of ${INITIAL} for Aoife Byrne` })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Re-sort (1 change)" }));
    expect(table().queryByRole("button", { name: /Undo sign-off/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Re-sort/ })).not.toBeInTheDocument();
  });

  it("revokes only after the in-place question, and the question names both answers", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "c1", state: "DUE", signedOffOn: null });
    render(<ProgressGrid grid={START} {...props} />);
    await userEvent.click(table().getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Cian Murphy` }));
    expect(api.send).not.toHaveBeenCalled();
    expect(table().getByText(`Revoke the sign-off of “${INITIAL}” for Cian Murphy? It stays in the record as revoked by you.`)).toBeInTheDocument();
    await userEvent.click(table().getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Cian Murphy` }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/students/c/checkpoints/c1/signoff", { signedOff: false }, expect.anything());
  });

  it("a failed sign-off leaves the cell and offers Try again", async () => {
    vi.mocked(api.send).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ checkpointId: "c2", state: "SIGNED_OFF", signedOffOn: "2026-12-14" });
    render(<ProgressGrid grid={START} {...props} />);
    await userEvent.click(table().getByRole("button", { name: `Sign off ${LOG} for Cian Murphy` }));
    expect(table().getByRole("alert")).toHaveTextContent(`Couldn’t sign off “${LOG}” for Cian Murphy. Nothing changed.`);
    await userEvent.click(table().getByRole("button", { name: "Try again" }));
    expect(api.send).toHaveBeenCalledTimes(2);
  });

  it("Hide names blurs names and counts and is remembered in a cookie", async () => {
    const { container } = render(<ProgressGrid grid={START} {...props} />);
    const hide = screen.getByRole("switch", { name: "Hide names" });
    expect(hide).toHaveAttribute("aria-checked", "false");
    await userEvent.click(hide);
    expect(hide).toHaveAttribute("aria-checked", "true");
    expect(container.firstElementChild).toHaveClass("app-hide-names");
    expect(document.cookie).toContain("app_hide_names=1");
    expect(table().getByRole("link", { name: "Aoife Byrne" })).toHaveAttribute("data-private");
  });

  it("a one-stage view shows the full checkpoint and a Sign off per student", () => {
    render(<ProgressGrid grid={START} {...props} laptopStage="2" />);
    expect(table().getByRole("columnheader", { name: new RegExp(LOG) })).toBeInTheDocument();
    expect(table().getAllByText("Due, not signed off")).toHaveLength(2);
  });

  it("the phone list opens on its stage and, in All, says what's missing", () => {
    const { unmount } = render(<ProgressGrid grid={START} {...props} phoneStage="all" />);
    expect(within(screen.getByRole("region", { name: "Students" })).getByText("Not signed off: Stages 1 and 2")).toBeInTheDocument();
    unmount();
    render(<ProgressGrid grid={START} {...props} />);
    expect(within(screen.getByRole("region", { name: "Students" })).getByRole("button", { name: `Sign off ${LOG} for Aoife Byrne` })).toBeInTheDocument();
  });
});
