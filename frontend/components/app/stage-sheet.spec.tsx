import { render, screen, waitFor, within } from "@testing-library/react";
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
  dueDate: "2026-10-10", items: [], prompts: [{ heading: "Prompts", text: "Is it researchable?" }],
};

function renderSheet(props: Partial<Parameters<typeof StageSheet>[0]> = {}) {
  const onDateChange = vi.fn();
  const onSaveDate = vi.fn().mockResolvedValue(undefined);
  render(
    <StageSheet componentId="k1" stage={stage} stages={[stage]} draft={{ s2: "2026-10-10" }} onDateChange={onDateChange}
      onSaveDate={onSaveDate} marks={[]} completionDate="2027-02-26" today="2026-10-01" returnFocus={createRef()}
      onClose={vi.fn()} {...props} />,
  );
  return { onDateChange, onSaveDate };
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

  // The page's refresh lands a round trip after the save, so the draft still differs from the saved date here.
  it("says the date is saved at once, and puts focus on the date box where Save this date was", async () => {
    renderSheet({ draft: { s2: "2026-10-17" } });
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    await userEvent.click(within(sheet).getByRole("button", { name: "Save this date" }));

    expect(await within(sheet).findByText("Stage 2's date saved.")).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: "Save this date" })).not.toBeInTheDocument();
    expect(within(sheet).getByLabelText("Stage date")).toHaveFocus();
  });
});
