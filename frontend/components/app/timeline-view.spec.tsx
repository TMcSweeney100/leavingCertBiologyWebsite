import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MyComponent, TimelineItem } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { TimelineView } from "./timeline-view";

const base = { stageLabel: null, subjectCode: "BIOLOGY", subjectName: "Biology", classId: "c1", className: "6A Biology", componentId: "k1", personalItemId: null, personalKind: null };
const items: TimelineItem[] = [
  { ...base, kind: "PERSONAL", date: "2026-12-02", title: "Biology class test", componentId: null, personalItemId: "p1", personalKind: "TEST" },
  { ...base, kind: "TEACHER_ITEM", date: "2026-12-04", title: "Full draft in for feedback", stageLabel: "Stage 6" },
  { ...base, kind: "STAGE", date: "2026-12-09", title: "Data Analysis and Conclusions", stageLabel: "Stage 5" },
  { ...base, kind: "PERSONAL", date: "2026-12-10", title: "Driving test", subjectCode: null, subjectName: null, classId: null, className: null, componentId: null, personalItemId: "p2", personalKind: "OTHER" },
];
const components: MyComponent[] = [{ componentId: "k1", classId: "c1", className: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology", briefTitle: "Brief", completionDate: "2027-02-26" }];

const view = (over: Partial<Parameters<typeof TimelineView>[0]> = {}) =>
  render(<TimelineView range={{ view: "list", from: "2026-12-01", to: "2026-12-28" }} today="2026-12-01" items={items} classes={[]} components={components} calendarOpen={true} {...over} />);

describe("TimelineView", () => {
  it("bands the next item due as the countdown, labelled Next up", () => {
    view();
    const band = screen.getByRole("region", { name: "Next up" });
    expect(band).toHaveTextContent("tomorrow");
    expect(within(band).getByText("Biology class test")).toBeInTheDocument();
  });

  it("lists items in order with date, title, kind in words, subject and days remaining", () => {
    view();
    const rows = within(screen.getByRole("list", { name: "Timeline items" })).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/Wed 2 Dec.*Biology class test.*Test.*Biology.*tomorrow/),
      expect.stringMatching(/Fri 4 Dec.*Full draft in for feedback.*From your teacher.*Biology.*in 3 days/),
      expect.stringMatching(/Wed 9 Dec.*Stage 5.*Data Analysis and Conclusions.*Stage date.*Biology.*in 8 days/),
      expect.stringMatching(/Thu 10 Dec.*Driving test.*Other.*in 9 days/),
    ]);
  });

  it("links coursework items to their component and marks the current view", () => {
    view();
    expect(screen.getByRole("link", { name: /Full draft in for feedback/ })).toHaveAttribute("href", "/components/k1");
    expect(screen.getByRole("link", { name: "List" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Week" })).toHaveAttribute("href", "?view=week&from=2026-12-01&calendar=on");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "?view=list&from=2026-12-29&calendar=on");
  });

  it("offers edit and delete only on the student's own items", () => {
    view();
    expect(screen.getByRole("button", { name: "Edit Biology class test" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Full draft in for feedback" })).not.toBeInTheDocument();
  });

  it("says when nothing is in range", () => {
    view({ range: { view: "week", from: "2026-12-14", to: "2026-12-20" }, items: [] });
    expect(screen.getByText("Nothing due 14–20 Dec 2026.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Timeline items" })).not.toBeInTheDocument();
  });

  it("draws a month as a table of weeks", () => {
    view({ range: { view: "month", from: "2026-12-01", to: "2026-12-31" } });
    const table = screen.getByRole("table", { name: "December 2026" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(within(table).getByText("Full draft in for feedback")).toBeInTheDocument();
  });

  it("marks the leading days from the previous month as disabled, so their low-contrast colour is exempt (plan 2F P2-49)", () => {
    view({ range: { view: "month", from: "2026-12-01", to: "2026-12-31" } });
    const table = screen.getByRole("table", { name: "December 2026" });
    const cells = within(table).getAllByRole("cell", { hidden: true });
    const outOfRangeCells = cells.filter((c) => c.className.includes("text-app-disabled"));
    expect(outOfRangeCells.length).toBeGreaterThan(0);
    for (const cell of outOfRangeCells) expect(cell).toHaveAttribute("aria-disabled", "true");

    const inRangeCell = cells.find((c) => c.textContent?.startsWith("1") && !c.className.includes("text-app-disabled"));
    expect(inRangeCell).not.toHaveAttribute("aria-disabled");
  });

  it("shows the calendar aside with its month, a note and the toggle offering to hide it", () => {
    view();
    expect(screen.getByRole("link", { name: "Hide calendar" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("A dot means something is due. The list beside it says what.")).toBeInTheDocument();
    expect(screen.getByText("Biology")).toBeInTheDocument();
  });

  it("hides the calendar aside and offers to show it again when calendarOpen is false", () => {
    view({ calendarOpen: false });
    const toggle = screen.getByRole("link", { name: "Show calendar" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("A dot means something is due. The list beside it says what.")).not.toBeInTheDocument();
  });
});
