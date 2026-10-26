import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { dateMarks } from "@/lib/app/date-marks";

import { YearView } from "./year-view";

const TODAY = "2026-11-14";
const COMPLETION = "2027-02-26";

const stages = () => [
  { id: "s1", ordinal: 1, label: "Stage 1", name: "Initial Response to the Brief", dueDate: "2026-05-29", items: [] },
  { id: "s2", ordinal: 2, label: "Stage 2", name: "Background Research", dueDate: "2026-06-05", items: [] },
  { id: "s3", ordinal: 3, label: "Stage 3", name: "Designing & Planning the Experiment", dueDate: "2026-09-25", items: [] },
  { id: "s4", ordinal: 4, label: "Stage 4", name: "Conducting the Experiment", dueDate: "2026-10-16", items: [{ id: "i3", text: "Book a re-run slot if your data needs it", dueDate: null }] },
  { id: "s5", ordinal: 5, label: "Stage 5", name: "Data Analysis & Conclusions", dueDate: "2026-11-20", items: [] },
  { id: "s6", ordinal: 6, label: "Stage 6", name: "Finalising the Report", dueDate: "2027-01-22", items: [
    { id: "i1", text: "Catch-up window closes", dueDate: "2026-11-13" },
    { id: "i2", text: "Full draft in for feedback", dueDate: "2026-12-04" },
  ] },
];

const view = (props: Partial<Parameters<typeof YearView>[0]> = {}) =>
  render(
    <YearView
      stages={stages()}
      marks={dateMarks(props.stages ?? stages(), {}, COMPLETION)}
      completionDate={COMPLETION}
      today={TODAY}
      attentionStageIds={[]}
      errorStageIds={[]}
      footnote={null}
      onClose={vi.fn()}
      {...props}
    />,
  );

describe("YearView", () => {
  it("names the numbers as the SEC's and the letters as the teacher's", () => {
    view();
    const key = screen.getByRole("list", { name: "What the marks mean" });
    expect(key).toHaveTextContent("Stage date, numbered by the SEC");
    expect(key).toHaveTextContent("Your item, lettered by date");
    expect(key).toHaveTextContent("Completion date, 26 Feb 2027");
    expect(key).toHaveTextContent("Not saved yet");
    expect(key).toHaveTextContent("Today");
  });

  it("puts every dated stage on the line, in date order, with the weeks between", () => {
    view();
    const line = screen.getByRole("img", { name: /Your dates across the year/ });
    expect(within(line).getByText("S1")).toBeInTheDocument();
    expect(within(line).getByText("S6")).toBeInTheDocument();
    expect(within(line).getByText("16 weeks")).toBeInTheDocument();
    expect(within(line).getByText("9 weeks")).toBeInTheDocument();
  });

  it("lists each item's letter, and says an undated one is not on the line", () => {
    view();
    const list = screen.getByRole("list", { name: "Your items on the line" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Catch-up window closes");
    expect(rows[0]).toHaveTextContent("13 Nov 2026 · stage 6");
    expect(rows[2]).toHaveTextContent("No date · stage 4 · not shown on the line");
  });

  it("has no calendar of its own: the date drawer is the calendar", () => {
    view();
    expect(screen.queryByRole("button", { name: "Show calendar" })).not.toBeInTheDocument();
  });

  it("says the line is empty rather than drawing nothing", () => {
    view({ stages: stages().map((s) => ({ ...s, dueDate: null, items: [] })) });
    expect(screen.getByText("Your dates appear here as you set them.")).toBeInTheDocument();
    expect(screen.getByText("Completion 26 Feb 2027")).toBeInTheDocument();
  });

  it("carries the footnote a refused or out-of-order state hands it", () => {
    view({ footnote: "Stage 6 sits past the completion end-stop.", errorStageIds: ["s6"] });
    expect(screen.getByText("Stage 6 sits past the completion end-stop.")).toBeInTheDocument();
  });
});
