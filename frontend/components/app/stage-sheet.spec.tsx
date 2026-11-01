import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { ApiError } from "@/lib/api/client";

import { StageSheet } from "./stage-sheet";

const stage = {
  id: "s2", ordinal: 2, label: "Stage 2", name: "Developing a question", description: "Students develop a research question.",
  hoursMin: 1, hoursMax: 2, hoursGroup: null, supervised: false, checkpoint: "Question discussed with the teacher",
  dueDate: "2026-10-10", items: [{ id: "i1", text: "Bring three questions", dueDate: "2026-10-06" }],
  prompts: [{ heading: "Prompts", text: "Is it researchable?" }], note: null,
};

const grid = {
  componentId: "k1", classId: "c1", className: "6A", today: "2026-10-01", waiting: [],
  stages: [{ stageId: "s2", ordinal: 2, label: "Stage 2", name: "Developing a question", dueDate: null, checkpoint: { id: "c2", text: "Discussed" } }],
  students: [
    { studentId: "a", firstName: "Aoife", lastName: "Byrne", behindBy: 0, lastLogActivityOn: null, daysSinceLastLogActivity: null, documentLink: null, cells: [{ checkpointId: "c2", state: "READY" as const, signedOffOn: null }] },
    { studentId: "b", firstName: "Cian", lastName: "Murphy", behindBy: 0, lastLogActivityOn: null, daysSinceLastLogActivity: null, documentLink: null, cells: [{ checkpointId: "c2", state: "DUE" as const, signedOffOn: null }] },
  ],
  itemTicks: [{ itemId: "i1", studentIds: ["b"] }],
};

function renderSheet(props: Partial<Parameters<typeof StageSheet>[0]> = {}) {
  const onDateChange = vi.fn();
  const onSaveDate = vi.fn().mockResolvedValue(undefined);
  const sheet = (more: Partial<Parameters<typeof StageSheet>[0]> = {}) => (
    <StageSheet componentId="k1" stage={stage} stages={[stage]} draft={{ s2: "2026-10-10" }} onDateChange={onDateChange}
      onSaveDate={onSaveDate} marks={[]} completionDate="2027-02-26" today="2026-10-01" returnFocus={createRef()}
      onClose={vi.fn()} fieldLabel={(field) => field} progress={{ ok: true, data: grid }} classId="c1" hideNames={false}
      noteDrafts={{}} onNoteDraft={vi.fn()} {...props} {...more} />
  );
  const view = render(sheet());
  // What the page does when `onDateChange` is called: hand the sheet the new draft.
  return { onDateChange, onSaveDate, redraw: (draft: Record<string, string>) => view.rerender(sheet({ draft })) };
}

beforeEach(() => vi.clearAllMocks());

describe("StageSheet", () => {
  it("is a dialog named by the stage, with its date, the official text, the checkpoint and the folded prompts", async () => {
    renderSheet();
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    expect(within(sheet).getByLabelText("Stage date")).toHaveTextContent("10/10/2026");
    expect(within(sheet).getByText("Students develop a research question.")).toBeInTheDocument();
    expect(within(sheet).getByText("Question discussed with the teacher")).toBeInTheDocument();
    expect(within(sheet).getByText("Questions students get from the guidelines (1)")).toBeInTheDocument();
  });

  it("swaps to the calendar in the same dialog, and Use this date hands the day back and returns focus to the box", async () => {
    const { onDateChange } = renderSheet();
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    await userEvent.click(within(sheet).getByLabelText("Stage date"));
    const view = within(sheet).getByRole("group", { name: "Choose the Stage 2 date" });
    expect(within(view).getByRole("button", { name: "Back to Stage 2" })).toBeInTheDocument();
    expect(within(view).queryByText("Developing a question")).not.toBeInTheDocument();
    await userEvent.click(within(view).getByRole("button", { name: /^Friday 16 October 2026/ }));
    await userEvent.click(within(view).getByRole("button", { name: "Use this date" }));

    expect(onDateChange).toHaveBeenCalledWith("s2", "2026-10-16");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    await waitFor(() => expect(within(sheet).getByLabelText("Stage date")).toHaveFocus());
  });

  it("offers Save this date for an unsaved date, and shows a refusal inside the sheet", async () => {
    const refusal = new ApiError({ status: 400, code: "COMPLETION_DATE_EXCEEDED", title: "Bad", detail: "Stage 2 is after the completion date." });
    const { onSaveDate } = renderSheet({ draft: { s2: "2026-10-17" } });
    onSaveDate.mockRejectedValueOnce(refusal);
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    expect(within(sheet).getByText("not saved")).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole("button", { name: "Save this date" }));
    expect(onSaveDate).toHaveBeenCalledWith("s2");
    expect(await within(sheet).findByText("Stage 2 is after the completion date.")).toBeInTheDocument();
  });

  it("Undo puts the saved date back and moves focus to the date box", async () => {
    const { onDateChange } = renderSheet({ draft: { s2: "2026-10-17" } });
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    await userEvent.click(within(sheet).getByRole("button", { name: "Undo" }));

    expect(onDateChange).toHaveBeenCalledWith("s2", "2026-10-10");
    expect(within(sheet).getByLabelText("Stage date")).toHaveFocus();
  });

  it("keeps Undo off while the date is saving, or it would put the old date back and the save would still go through", async () => {
    let finish!: () => void;
    const { onSaveDate } = renderSheet({ draft: { s2: "2026-10-17" } });
    onSaveDate.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)));
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    await userEvent.click(within(sheet).getByRole("button", { name: "Save this date" }));

    expect(within(sheet).getByRole("button", { name: "Undo" })).toBeDisabled();
    await act(async () => finish());
  });

  it("names the stage a refusal is about by its label, not its id", async () => {
    const refusal = new ApiError({
      status: 400, code: "COMPLETION_DATE_EXCEEDED", title: "Bad", detail: "A date is after the completion date.",
      fieldErrors: [{ field: "s5", message: "Choose a date on or before 26 Feb 2027." }],
    });
    const { onSaveDate } = renderSheet({ draft: { s2: "2026-10-17" }, fieldLabel: (field) => (field === "s5" ? "Stage 5" : field) });
    onSaveDate.mockRejectedValueOnce(refusal);
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    await userEvent.click(within(sheet).getByRole("button", { name: "Save this date" }));

    expect(await within(sheet).findByText("Stage 5")).toBeInTheDocument();
    expect(within(sheet).queryByText("s5")).not.toBeInTheDocument();
  });

  it("doesn't call a different date saved when the save that finished was for an earlier one", async () => {
    let finish!: () => void;
    const { onSaveDate, redraw } = renderSheet({ draft: { s2: "2026-10-17" } });
    onSaveDate.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)));
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    await userEvent.click(within(sheet).getByRole("button", { name: "Save this date" })); // sends 17 Oct
    await userEvent.click(within(sheet).getByLabelText("Stage date"));
    const view = within(sheet).getByRole("group", { name: "Choose the Stage 2 date" });
    await userEvent.click(within(view).getByRole("button", { name: /^Tuesday 20 October 2026/ }));
    await userEvent.click(within(view).getByRole("button", { name: "Use this date" }));
    redraw({ s2: "2026-10-20" });
    await act(async () => finish());

    expect(await within(sheet).findByRole("button", { name: "Save this date" })).toBeEnabled();
    expect(within(sheet).getByText("not saved")).toBeInTheDocument();
    expect(within(sheet).queryByText("Stage 2's date saved.")).not.toBeInTheDocument();
  });

  // The page's refresh lands a round trip after the save, so the draft still differs from the saved date here.
  it("says the date is saved at once, and puts focus on the date box where Save this date was", async () => {
    renderSheet({ draft: { s2: "2026-10-17" } });
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    await userEvent.click(within(sheet).getByRole("button", { name: "Save this date" }));

    expect(await within(sheet).findByText("Stage 2's date saved.")).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: "Save this date" })).not.toBeInTheDocument();
    expect(within(sheet).getByLabelText("Stage date")).toHaveFocus();
  });

  it("counts the checkpoint across the class, and lists who has and hasn't ticked an item", async () => {
    renderSheet();
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    expect(within(sheet).getByRole("link", { name: "1 waiting for you" })).toHaveAttribute("href", "/teach/classes/c1/progress");
    await userEvent.click(within(sheet).getByRole("button", { name: /Bring three questions.*1 ticked/ }));
    expect(within(sheet).getByRole("list", { name: /^Ticked/ })).toHaveTextContent("Cian Murphy");
    expect(within(sheet).getByRole("list", { name: /^Not ticked yet/ })).toHaveTextContent("Aoife Byrne");
    // Hide names blurs counts too (S-20): only the number is private, so the words around it stay readable.
    for (const heading of [/^Ticked \(1\)/, /^Not ticked yet \(1\)/]) {
      expect(within(sheet).getByRole("heading", { name: heading }).querySelector("[data-private]")).toHaveTextContent(/^1$/);
    }
  });

  it("says so in place when the class's progress didn't load", async () => {
    renderSheet({ progress: { ok: false, error: ApiError.unreachable(new Error("down")) } });
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    expect(within(sheet).getAllByText(/Couldn't load the class's progress/).length).toBeGreaterThan(0);
  });
});
