import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TimelineItem } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { TimelineMonth } from "./timeline-month";

const TODAY = "2026-11-12";
const bio = { stageLabel: null, subjectCode: "BIOLOGY", subjectName: "Biology", classId: "c1", className: "6A Biology", componentId: "k1", personalItemId: null, personalKind: null, done: false };
const none = { ...bio, subjectCode: null, subjectName: null, classId: null, className: null, componentId: null };
const items: TimelineItem[] = [
  { ...none, kind: "PERSONAL", date: "2026-11-12", title: "Maths Assignment", personalItemId: "p1", personalKind: "DEADLINE" },
  { ...bio, kind: "TEACHER_ITEM", date: "2026-11-20", title: "Make edits to experiment plan" },
];
const month = (day = TODAY) =>
  render(<TimelineMonth range={{ view: "month", from: "2026-11-01", to: "2026-11-30" }} today={TODAY} day={day} items={items} classes={[]} />);

describe("TimelineMonth", () => {
  it("is a table of weeks named by its month, with a chip per item that links to its component", () => {
    month();
    const table = screen.getByRole("table", { name: "November 2026" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(within(table).getByRole("link", { name: "Make edits to experiment plan" })).toHaveAttribute("href", "/components/k1");
    expect(within(table).getByText("Maths Assignment")).toBeInTheDocument();
  });

  it("makes each day a link that picks it, says how much is on it, and marks today", () => {
    month();
    const today = screen.getByRole("link", { name: "Thu 12 Nov, 1 item" });
    expect(today).toHaveAttribute("href", "?view=month&from=2026-11-01&day=2026-11-12");
    expect(today).toHaveAttribute("aria-current", "date");
    expect(screen.getByRole("link", { name: "Sat 14 Nov, nothing" })).not.toHaveAttribute("aria-current");
  });

  it("greys the days outside the month and gives them no link", () => {
    month();
    const cells = within(screen.getByRole("table", { name: "November 2026" })).getAllByRole("cell", { hidden: true });
    const outside = cells.filter((c) => c.getAttribute("aria-disabled") === "true");
    expect(outside.length).toBe(12); // 26–31 Oct and 1–6 Dec
    for (const cell of outside) expect(within(cell).queryByRole("link")).not.toBeInTheDocument();
  });

  it("lists the picked day under the calendar, with its tick, Edit and Add", () => {
    month();
    const picked = screen.getByRole("region", { name: "Thu 12 Nov, today" });
    expect(within(picked).getByRole("checkbox", { name: "Done: Maths Assignment" })).toBeInTheDocument();
    expect(within(picked).getByRole("button", { name: "Edit Maths Assignment" })).toBeInTheDocument();
    expect(within(picked).getByRole("button", { name: "Add my own item on Thu 12 Nov" })).toBeInTheDocument();
  });

  it("says when the picked day is empty", () => {
    month("2026-11-14");
    expect(within(screen.getByRole("region", { name: "Sat 14 Nov" })).getByText("Nothing on this day.")).toBeInTheDocument();
  });
});
