import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";
import type { StageNote } from "@/lib/api/schemas";

import { StageNoteForm } from "./stage-note-form";

/** The page keeps the draft (S-21); `initial` stands in for one left unsaved earlier. */
function Harness({ note, initial }: { note: StageNote | null; initial?: string }) {
  const [draft, setDraft] = useState(initial ?? note?.text ?? "");
  return <StageNoteForm componentId="k1" stageId="s2" note={note} draft={draft} onDraft={setDraft} />;
}

// A request the test settles by hand, to look at the form while it is in flight.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const box = () => screen.getByRole("textbox", { name: "Your note for students" });

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("StageNoteForm", () => {
  it("shows a saved note as students see it, links included, and Edit turns it into the box", async () => {
    render(<Harness note={{ text: "Slots: www.example.ie/slots", updatedOn: "2026-10-28" }} />);
    expect(screen.getByRole("link", { name: "www.example.ie/slots (opens in a new tab)" })).toHaveAttribute("href", "https://www.example.ie/slots");
    expect(screen.getByText("Saved 28 Oct 2026")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit your note" }));
    expect(box()).toHaveValue("Slots: www.example.ie/slots");
    expect(box()).toHaveFocus();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("Cancel puts the saved note back and focus on Edit", async () => {
    render(<Harness note={{ text: "Old", updatedOn: "2026-10-28" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit your note" }));
    await userEvent.type(box(), " and new");
    expect(screen.getByText("Not saved yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Old")).toBeInTheDocument();
    expect(screen.queryByText("Not saved yet")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit your note" })).toHaveFocus();
  });

  it("with no note, Add a note opens the box; Save note sends it trimmed and shows it as students will", async () => {
    vi.mocked(api.send).mockResolvedValue({ text: "Bring a lab coat", updatedOn: "2026-10-31" });
    render(<Harness note={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Add a note" }));
    await userEvent.type(box(), "Bring a lab coat ");
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/stages/s2/note", { text: "Bring a lab coat" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
    expect(await screen.findByText("Saved just now")).toBeInTheDocument();
    expect(screen.getByText("Bring a lab coat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit your note" })).toHaveFocus();
  });

  it("an unsaved note from earlier opens on the box (S-21)", () => {
    render(<Harness note={null} initial="Half a thought" />);
    expect(box()).toHaveValue("Half a thought");
    expect(screen.getByText("Not saved yet")).toBeInTheDocument();
  });

  it("an emptied box removes the note, locked while it goes, and the card goes back to Add a note", async () => {
    const request = deferred<void>();
    vi.mocked(api.sendNoContent).mockReturnValue(request.promise);
    const { rerender } = render(<Harness note={{ text: "Old", updatedOn: "2026-10-28" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit your note" }));
    await userEvent.clear(box());
    await userEvent.click(screen.getByRole("button", { name: "Remove note" }));

    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/stages/s2/note");
    expect(box()).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Removing…" })).toBeDisabled();

    request.resolve();
    expect(await screen.findByText("Note removed")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add a note" })).toHaveFocus());

    // The page's refresh lands: the stage has no note now, and the line still says what happened.
    rerender(<Harness note={null} />);
    expect(screen.getByText("Note removed")).toBeInTheDocument();
  });

  it("spaces alone are nothing to save", async () => {
    render(<Harness note={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Add a note" }));
    await userEvent.type(box(), "   ");
    expect(screen.getByRole("button", { name: "Save note" })).toBeDisabled();
    expect(screen.queryByText("Not saved yet")).not.toBeInTheDocument();
  });
});
