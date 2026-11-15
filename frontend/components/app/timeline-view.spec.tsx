import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TimelineItem } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { TimelineView } from "./timeline-view";

const TODAY = "2026-11-12";
const items: TimelineItem[] = [{
  kind: "PERSONAL", date: "2026-11-12", title: "Maths Assignment", stageLabel: null, subjectCode: null, subjectName: null, classId: null,
  className: null, componentId: null, personalItemId: "p1", personalKind: "DEADLINE", done: false,
}];
const view = (range: Parameters<typeof TimelineView>[0]["range"]) =>
  render(<TimelineView range={range} today={TODAY} day={TODAY} items={items} classes={[]} components={[]} />);

describe("TimelineView", () => {
  it("opens on the Timeline view, marks it current, and offers the term's earlier dates", () => {
    view({ view: "timeline", from: "2026-11-09", to: "2027-08-31" });
    expect(screen.getByRole("link", { name: "Timeline" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Week" })).toHaveAttribute("href", "?view=week&from=2026-11-12");
    expect(screen.getByRole("link", { name: "Month" })).toHaveAttribute("href", "?view=month&from=2026-11-12");
    expect(screen.getByRole("link", { name: "Show earlier" })).toHaveAttribute("href", "?view=timeline&from=2026-09-01");
    expect(screen.getByRole("list", { name: "This week" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Previous week" })).not.toBeInTheDocument();
  });

  it("hides Show earlier once the timeline starts at the school year", () => {
    view({ view: "timeline", from: "2026-09-01", to: "2027-08-31" });
    expect(screen.queryByRole("link", { name: "Show earlier" })).not.toBeInTheDocument();
  });

  it("steps a week with named arrow links and comes back with Today", () => {
    view({ view: "week", from: "2026-11-16", to: "2026-11-22" });
    expect(screen.getByRole("heading", { level: 2, name: "16–22 Nov 2026" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous week" })).toHaveAttribute("href", "?view=week&from=2026-11-09");
    expect(screen.getByRole("link", { name: "Next week" })).toHaveAttribute("href", "?view=week&from=2026-11-23");
    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("href", "?view=week");
    expect(screen.getByRole("list", { name: "Days of the week" })).toBeInTheDocument();
    // Off this week, the other views keep the week on screen as their anchor.
    expect(screen.getByRole("link", { name: "Month" })).toHaveAttribute("href", "?view=month&from=2026-11-16");
  });

  it("steps a month the same way", () => {
    view({ view: "month", from: "2026-11-01", to: "2026-11-30" });
    expect(screen.getByRole("link", { name: "Previous month" })).toHaveAttribute("href", "?view=month&from=2026-10-01");
    expect(screen.getByRole("link", { name: "Next month" })).toHaveAttribute("href", "?view=month&from=2026-12-01");
    expect(screen.getByRole("table", { name: "November 2026" })).toBeInTheDocument();
  });
});
