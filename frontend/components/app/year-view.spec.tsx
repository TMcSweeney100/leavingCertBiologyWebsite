import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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
  });

  it("puts every dated stage on the line, in date order, with the weeks between", () => {
    view();
    const line = screen.getByRole("img", { name: /Your dates across the year/ });
    expect(within(line).getByText("1")).toBeInTheDocument();
    expect(within(line).getByText("6")).toBeInTheDocument();
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

  it("opens the calendar on the current month and steps a month at a time", async () => {
    view();
    await userEvent.click(screen.getByRole("button", { name: "Show calendar" }));
    expect(screen.getByRole("heading", { name: "November 2026" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "October 2026" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "December 2026" }));
    expect(screen.getByRole("heading", { name: "December 2026" })).toBeInTheDocument();
  });

  it("shows what falls in the month, read-only, and says dates are set below", async () => {
    view();
    await userEvent.click(screen.getByRole("button", { name: "Show calendar" }));
    const grid = screen.getByRole("table", { name: "November 2026" });
    expect(grid).toHaveTextContent("Stage 5");
    expect(grid).toHaveTextContent("Catch-up window closes");
    expect(within(grid).queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText("Read-only. Dates are set in the rows below; nothing may be set after 26 Feb 2027.")).toBeInTheDocument();
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
