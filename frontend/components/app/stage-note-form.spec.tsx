import { render, screen } from "@testing-library/react";
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

function Harness({ note }: { note: StageNote | null }) {
  const [draft, setDraft] = useState(note?.text ?? "");
  return <StageNoteForm componentId="k1" stageId="s2" note={note} draft={draft} onDraft={setDraft} />;
}

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("StageNoteForm", () => {
  it("previews the note as students will see it, links included, and saves it", async () => {
    vi.mocked(api.send).mockResolvedValue({ text: "Slots: https://example.ie/slots", updatedOn: "2026-10-31" });
    render(<Harness note={null} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Your note for students" }), "Slots: https://example.ie/slots");
    expect(screen.getByRole("link", { name: /https:\/\/example\.ie\/slots/ })).toBeInTheDocument();
    expect(screen.getByText("Not saved yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/stages/s2/note", { text: "Slots: https://example.ie/slots" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("an emptied box removes the note", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    render(<Harness note={{ text: "Old", updatedOn: "2026-10-28" }} />);
    expect(screen.getByText("Saved 28 Oct 2026")).toBeInTheDocument();
    await userEvent.clear(screen.getByRole("textbox", { name: "Your note for students" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove note" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/stages/s2/note");
    expect(await screen.findByText("Saved just now")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove note" })).toBeDisabled();
  });

  it("says it is saved at once, while the page has not yet caught up with the note", async () => {
    vi.mocked(api.send).mockResolvedValue({ text: "Bring a lab coat", updatedOn: "2026-10-31" });
    render(<Harness note={null} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Your note for students" }), "Bring a lab coat");
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(await screen.findByText("Saved just now")).toBeInTheDocument();
    expect(screen.queryByText("Not saved yet")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save note" })).toBeDisabled();

    await userEvent.type(screen.getByRole("textbox", { name: "Your note for students" }), "!");
    expect(screen.getByText("Not saved yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save note" })).toBeEnabled();
  });
});
