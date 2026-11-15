import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TimelineItem } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { TimelineWeek } from "./timeline-week";

const TODAY = "2026-11-12"; // a Thursday
const bio = { stageLabel: null, subjectCode: "BIOLOGY", subjectName: "Biology", classId: "c1", className: "6A Biology", componentId: "k1", personalItemId: null, personalKind: null, done: false };
const none = { ...bio, subjectCode: null, subjectName: null, classId: null, className: null, componentId: null };
const items: TimelineItem[] = [
  { ...bio, kind: "TEACHER_ITEM", date: "2026-11-10", title: "Create Plan in workbook copy" },
  { ...none, kind: "PERSONAL", date: "2026-11-12", title: "Maths Assignment", personalItemId: "p1", personalKind: "DEADLINE" },
  { ...none, kind: "PERSONAL", date: "2026-11-19", title: "Bio Assignment", personalItemId: "p2", personalKind: "TEST" },
];
const week = () => render(<TimelineWeek from="2026-11-09" to="2026-11-15" today={TODAY} items={items} classes={[]} />);

describe("TimelineWeek", () => {
  it("draws seven days, Monday first, with each day's items, and marks today", () => {
    week();
    // Each day's heading carries its full date for screen readers; the short day and number beside it are decoration.
    const days = within(screen.getByRole("list", { name: "Days of the week" })).getAllByRole("heading", { level: 3 });
    expect(days.map((d) => d.querySelector(".sr-only")?.textContent)).toEqual(["Mon 9 Nov", "Tue 10 Nov", "Wed 11 Nov", "Thu 12 Nov, today", "Fri 13 Nov", "Sat 14 Nov", "Sun 15 Nov"]);
    expect(screen.getByRole("list", { name: "Tue 10 Nov" })).toHaveTextContent("Create Plan in workbook copy");
    expect(within(screen.getByRole("list", { name: "Thu 12 Nov" })).getByRole("checkbox", { name: "Done: Maths Assignment" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Thu 12 Nov" })).getByRole("button", { name: "Edit Maths Assignment" })).toBeInTheDocument();
  });

  it("offers Add on today and every day after it, never on a day gone", () => {
    week();
    expect(screen.getAllByRole("button", { name: /^Add my own item on/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Add my own item on Thu 12 Nov", "Add my own item on Fri 13 Nov", "Add my own item on Sat 14 Nov", "Add my own item on Sun 15 Nov",
    ]);
  });

  it("sums the week up in a sentence and lists what comes after it", () => {
    week();
    expect(screen.getByText("This week: 1 of your own, 0 done · 1 from your teacher")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "After this week" })).toHaveTextContent("Bio Assignment");
    expect(screen.queryByRole("list", { name: "Thu 19 Nov" })).not.toBeInTheDocument();
  });
});
