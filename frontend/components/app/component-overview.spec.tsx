import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { StudentComponent } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { ComponentOverview } from "./component-overview";

const stage = (n: number, dueDate: string | null, extra: Partial<StudentComponent["stages"][number]> = {}) => ({
  id: `s${n}`, ordinal: n, label: `Stage ${n}`, name: `Stage name ${n}`, description: `What stage ${n} is.`,
  hoursMin: 1, hoursMax: 2, hoursGroup: null, supervised: false, dueDate,
  checkpoint: { text: `Checkpoint ${n}`, state: "NOT_DUE" as const }, items: [], prompts: [], ...extra,
});

const component = (overrides: Partial<StudentComponent> = {}): StudentComponent => ({
  view: "STUDENT", id: "k1", className: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology",
  weightingPercent: 40, marksTotal: 200,
  brief: {
    examYear: 2027, secCode: "2027L025C2EL", title: "Biology in Practice Investigation", topicTitle: "Membranes, Osmosis, Food Preservation",
    topicBody: "Cells have a selectively permeable plasma membrane.", completionDate: "2027-02-26", wordLimit: 1500,
    wordsNotCounted: "This word count does not include words used in references.", imageLimit: 20, imageNote: "Formulae don't count.",
    rules: [{ key: "Page orientation", value: "Portrait only." }],
  },
  processNote: "Nor is it intended to present the stages as a rigid or linear process.",
  today: "2026-10-12",
  stages: [
    stage(3, "2026-09-25", { checkpoint: { text: "Plan discussed with the teacher (feasibility and safety)", state: "DUE" } }),
    stage(4, "2026-10-16", { items: [{ id: "i1", text: "Book a re-run slot", dueDate: null, done: true }], prompts: [{ heading: "Data analysis may include", text: "calculations and/or graphs" }] }),
    stage(5, null),
  ],
  sections: [{ label: "1", name: "Title and Introduction", suggestedWords: null, indicativeContent: [], stageIds: [] }],
  markBands: [{ label: "D", name: "Scientific Literacy", marks: 50, wholeReport: true, criteria: ["Communication"], sectionLabels: [] }],
  ...overrides,
});

describe("ComponentOverview", () => {
  it("answers first: the current stage and how long is left", () => {
    render(<ComponentOverview component={component()} />);
    const now = screen.getByRole("region", { name: "Where you are" });
    expect(now).toHaveTextContent("Stage 4");
    expect(now).toHaveTextContent("4 days left");
    expect(now).toHaveTextContent("16 Oct 2026");
  });

  it("separates the class's dates from the SEC's completion date", () => {
    render(<ComponentOverview component={component()} />);
    expect(screen.getByText(/completion date/i)).toHaveTextContent("26 Feb 2027");
    expect(screen.getByText(/stage dates are your class's plan, set by your teacher/i)).toBeInTheDocument();
  });

  it("names each stage's state in words, and opens only the current stage", () => {
    render(<ComponentOverview component={component()} />);
    const stages = screen.getByRole("region", { name: "Stages" });
    expect(within(stages).getByText("Done")).toBeInTheDocument();
    expect(within(stages).getByText("Now")).toBeInTheDocument();
    expect(within(stages).getByText("No date yet")).toBeInTheDocument();
    expect(screen.getByText("What stage 4 is.")).toBeVisible();
  });

  it("shows a due checkpoint as not signed off yet, without blame", () => {
    render(<ComponentOverview component={component()} />);
    expect(screen.getByText("Plan discussed with the teacher (feasibility and safety)").closest("div")).toHaveTextContent("Not signed off yet");
  });

  it("says ticks are the student's own record", () => {
    render(<ComponentOverview component={component()} />);
    expect(screen.getByText(/ticks are your own record, not your teacher's sign-off/i)).toBeInTheDocument();
  });

  it("says the stages aren't a fixed order", () => {
    render(<ComponentOverview component={component()} />);
    expect(screen.getByText(/rigid or linear/)).toBeInTheDocument();
  });

  it("shows rules and marks", () => {
    render(<ComponentOverview component={component()} />);
    expect(screen.getByRole("region", { name: "Report rules" })).toHaveTextContent("Portrait only.");
    expect(screen.getByRole("region", { name: "How it's marked" })).toHaveTextContent("200 marks");
  });

  it("says dates are coming when the teacher hasn't set any", () => {
    render(<ComponentOverview component={component({ stages: [stage(1, null), stage(2, null)] })} />);
    expect(screen.getByRole("region", { name: "Where you are" })).toHaveTextContent(/dates are coming from your teacher/i);
  });

  it("is a record after the completion date", () => {
    render(<ComponentOverview component={component({ today: "2027-03-01" })} />);
    expect(screen.getByRole("region", { name: "Where you are" })).toHaveTextContent(/completion date has passed/i);
  });
});
