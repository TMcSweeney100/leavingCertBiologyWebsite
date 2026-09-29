import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StagePicker } from "./stage-picker";

const stages = [
  { stageId: "s3", ordinal: 3, label: "Stage 3", name: "Plan", dueDate: "2026-12-11", checkpoint: { id: "c3", text: "Plan discussed with the teacher (feasibility and safety)" } },
  { stageId: "s6", ordinal: 6, label: "Stage 6", name: "Applying learning", dueDate: null, checkpoint: null },
  { stageId: "s7", ordinal: 7, label: null, name: "Compilation of the final report", dueDate: "2027-05-21", checkpoint: { id: "c7", text: "Final report submitted for review and authentication" } },
];

describe("StagePicker", () => {
  it("links each checkpoint's view in the URL and marks the current one", () => {
    render(<StagePicker stages={stages} today="2026-12-14" current="3" basePath="/teach/classes/c1/progress" variant="laptop" />);
    const nav = screen.getByRole("navigation", { name: "Checkpoint view" });
    expect(within(nav).getByRole("link", { name: "All stages" })).toHaveAttribute("href", "/teach/classes/c1/progress?stage=all");
    const three = within(nav).getByRole("link", { name: "Stage 3, Plan discussed, 11 Dec 2026, due" });
    expect(three).toHaveAttribute("aria-current", "true");
    expect(within(nav).getByRole("link", { name: /^Report, Final report/ })).toHaveAttribute("href", "/teach/classes/c1/progress?stage=R");
  });

  it("shows a stage with nothing to sign off but doesn't link it (pack D-7, plan P4-22)", () => {
    render(<StagePicker stages={stages} today="2026-12-14" current="all" basePath="/p" variant="laptop" />);
    expect(screen.getByText("Nothing to sign off")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Stage 6/ })).not.toBeInTheDocument();
  });

  it("on a phone the links are numbers with the same names", () => {
    render(<StagePicker stages={stages} today="2026-12-14" current="3" basePath="/p" variant="phone" />);
    expect(screen.getByRole("link", { name: "Stage 3, Plan discussed, 11 Dec 2026, due" })).toHaveTextContent("3");
  });
});
