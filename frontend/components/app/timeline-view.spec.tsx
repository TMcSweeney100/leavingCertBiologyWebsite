import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TimelineItem } from "@/lib/api/schemas";

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

describe("TimelineView", () => {
  it("lists items in order with date, days remaining, kind in words and subject", () => {
    render(<TimelineView range={{ view: "list", from: "2026-12-01", to: "2026-12-28" }} today="2026-12-01" items={items} classes={[]} />);
    const rows = within(screen.getByRole("list", { name: "Timeline items" })).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/Wed 2 Dec.*tomorrow.*Test.*Biology class test.*Biology/),
      expect.stringMatching(/Fri 4 Dec.*in 3 days.*From your teacher.*Full draft in for feedback.*Biology/),
      expect.stringMatching(/Wed 9 Dec.*in 8 days.*Stage date.*Stage 5.*Data Analysis and Conclusions.*Biology/),
      expect.stringMatching(/Thu 10 Dec.*in 9 days.*Other.*Driving test/),
    ]);
  });

  it("links coursework items to their component and marks the current view", () => {
    render(<TimelineView range={{ view: "list", from: "2026-12-01", to: "2026-12-28" }} today="2026-12-01" items={items} classes={[]} />);
    expect(screen.getByRole("link", { name: /Full draft in for feedback/ })).toHaveAttribute("href", "/components/k1");
    expect(screen.getByRole("link", { name: "List" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Week" })).toHaveAttribute("href", "?view=week&from=2026-12-01");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "?view=list&from=2026-12-29");
  });

  it("offers edit and delete only on the student's own items", () => {
    render(<TimelineView range={{ view: "list", from: "2026-12-01", to: "2026-12-28" }} today="2026-12-01" items={items} classes={[]} />);
    expect(screen.getByRole("button", { name: "Edit Biology class test" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Full draft in for feedback" })).not.toBeInTheDocument();
  });

  it("says when nothing is in range", () => {
    render(<TimelineView range={{ view: "week", from: "2026-12-14", to: "2026-12-20" }} today="2026-12-01" items={[]} classes={[]} />);
    expect(screen.getByText("Nothing due 14–20 Dec 2026.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Timeline items" })).not.toBeInTheDocument();
  });

  it("draws a month as a table of weeks", () => {
    render(<TimelineView range={{ view: "month", from: "2026-12-01", to: "2026-12-31" }} today="2026-12-01" items={items} classes={[]} />);
    const table = screen.getByRole("table", { name: "December 2026" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(within(table).getByText("Full draft in for feedback")).toBeInTheDocument();
  });

  it("marks the leading days from the previous month as disabled, so their low-contrast colour is exempt (plan 2F P2-49)", () => {
    // December 2026 starts on a Tuesday, so the week grid's Monday (30 Nov) is outside the month.
    render(<TimelineView range={{ view: "month", from: "2026-12-01", to: "2026-12-31" }} today="2026-12-01" items={items} classes={[]} />);
    const table = screen.getByRole("table", { name: "December 2026" });
    const cells = within(table).getAllByRole("cell", { hidden: true });
    const outOfRangeCells = cells.filter((c) => c.className.includes("text-app-disabled"));
    expect(outOfRangeCells.length).toBeGreaterThan(0);
    for (const cell of outOfRangeCells) expect(cell).toHaveAttribute("aria-disabled", "true");

    const inRangeCell = cells.find((c) => c.textContent?.startsWith("1") && !c.className.includes("text-app-disabled"));
    expect(inRangeCell).not.toHaveAttribute("aria-disabled");
  });
});
