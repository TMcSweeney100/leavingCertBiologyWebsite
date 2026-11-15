import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MyComponent, TimelineItem } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { TimelineRail } from "./timeline-rail";

const TODAY = "2026-11-12"; // a Thursday
const bio = { stageLabel: null, subjectCode: "BIOLOGY", subjectName: "Biology", classId: "c1", className: "6A Biology", componentId: "k1", personalItemId: null, personalKind: null, done: false };
const none = { ...bio, subjectCode: null, subjectName: null, classId: null, className: null, componentId: null };
const items: TimelineItem[] = [
  { ...bio, kind: "TEACHER_ITEM", date: "2026-11-10", title: "Create Plan in workbook copy" },
  { ...none, kind: "PERSONAL", date: "2026-11-12", title: "Maths Assignment", personalItemId: "p1", personalKind: "DEADLINE" },
  { ...none, kind: "PERSONAL", date: "2026-11-19", title: "History Test", personalItemId: "p2", personalKind: "TEST", done: true },
  { ...bio, kind: "STAGE", date: "2026-12-03", title: "Conducting the Experiment", stageLabel: "Stage 4" },
  { ...bio, kind: "COMPLETION", date: "2027-02-26", title: "Biology in Practice Investigation" },
];
const components: MyComponent[] = [{ componentId: "k1", classId: "c1", className: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology", briefTitle: "Brief", completionDate: "2027-02-26" }];

describe("TimelineRail", () => {
  it("groups by this week, next week and month, each a named list in date order", () => {
    render(<TimelineRail items={items} today={TODAY} classes={[]} components={components} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
      ["This week9–15 Nov", "Next week16–22 Nov", "December 2026", "February 2027"]);
    const thisWeek = within(screen.getByRole("list", { name: "This week" })).getAllByRole("listitem");
    expect(thisWeek.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/Tue 10 Nov.*Create Plan in workbook copy.*From your teacher · Biology.*2 days ago/),
      expect.stringMatching(/Today · Thu 12 Nov/),
      expect.stringMatching(/Thu 12 Nov.*Maths Assignment.*Deadline · only you.*Today/),
    ]);
  });

  it("gives an own item its tick and Edit, and a coursework date its link, stage and kind in words", () => {
    render(<TimelineRail items={items} today={TODAY} classes={[]} components={components} />);
    expect(screen.getByRole("checkbox", { name: "Done: History Test" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Edit Maths Assignment" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Create Plan/ })).not.toBeInTheDocument();

    const december = screen.getByRole("list", { name: "December 2026" });
    expect(within(december).getByRole("link", { name: "Conducting the Experiment" })).toHaveAttribute("href", "/components/k1");
    expect(december).toHaveTextContent("Stage 4");
    expect(december).toHaveTextContent("Stage date · Biology");
    expect(screen.getByRole("list", { name: "February 2027" })).toHaveTextContent("SEC completion date · Biology");
  });

  it("lists each subject's completion date and what the marks mean", () => {
    render(<TimelineRail items={items} today={TODAY} classes={[]} components={components} />);
    expect(screen.getByRole("list", { name: "Completion dates" })).toHaveTextContent("Biology26 Feb 2027");
    expect(screen.getByRole("list", { name: "What the marks mean" })).toHaveTextContent("Your own item. Only you see it");
  });

  it("says when nothing is coming", () => {
    render(<TimelineRail items={[]} today={TODAY} classes={[]} components={[]} />);
    expect(screen.getByText("Nothing due between now and the end of the school year.")).toBeInTheDocument();
  });
});
