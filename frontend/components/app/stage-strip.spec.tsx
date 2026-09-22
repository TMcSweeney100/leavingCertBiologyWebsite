import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StageStrip } from "./stage-strip";

const stages = [
  { id: "s1", ordinal: 1, label: null, name: "Getting started", dueDate: "2026-05-29" },
  { id: "s2", ordinal: 2, label: null, name: "Research", dueDate: "2026-10-16" },
  { id: "s3", ordinal: 3, label: null, name: "Not dated yet", dueDate: null },
];

const states = { s1: "done", s2: "current", s3: "undated" } as const;

describe("StageStrip", () => {
  it("is a navigator: each cell is a button naming its stage and state", () => {
    render(<StageStrip stages={stages} states={states} onSelect={vi.fn()} />);
    const now = screen.getByRole("button", { name: /Stage 2[\s\S]*Research/ });
    expect(now).toBeInTheDocument();
  });

  it("selecting a cell calls onSelect with that stage's id", async () => {
    const onSelect = vi.fn();
    render(<StageStrip stages={stages} states={states} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /Stage 1/ }));
    expect(onSelect).toHaveBeenCalledWith("s1");
  });

  it("carries every state as a word, not only colour, for the legend at 390", () => {
    render(<StageStrip stages={stages} states={states} onSelect={vi.fn()} />);
    expect(screen.getByText("Stage 1 done · Stage 2 now · Stage 3 no date yet")).toBeInTheDocument();
  });
});
