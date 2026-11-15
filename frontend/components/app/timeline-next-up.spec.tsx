import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TimelineItem } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { NextUp } from "./timeline-next-up";

const TODAY = "2026-11-12";
const own = (date: string, title: string, done = false): TimelineItem => ({
  kind: "PERSONAL", date, title, stageLabel: null, subjectCode: null, subjectName: null, classId: null, className: null,
  componentId: null, personalItemId: title, personalKind: "TEST", done,
});
const stage: TimelineItem = {
  kind: "STAGE", date: "2026-12-03", title: "Conducting the Experiment", stageLabel: "Stage 4", subjectCode: "BIOLOGY", subjectName: "Biology",
  classId: "c1", className: "6A Biology", componentId: "k1", personalItemId: null, personalKind: null, done: false,
};

describe("NextUp", () => {
  it("names the next thing not done as the heading, with its day and the things after it", () => {
    render(<NextUp items={[own("2026-11-12", "Maths Assignment", true), own("2026-11-13", "French vocab test"), own("2026-11-19", "Bio Assignment"), stage]} today={TODAY} classes={[]} />);
    const card = screen.getByRole("region", { name: "Next up" });
    expect(within(card).getByRole("heading", { name: "French vocab test" })).toBeInTheDocument();
    expect(card).toHaveTextContent("Next up · tomorrow");
    expect(card).toHaveTextContent("Fri 13 Nov · Test · only you");
    expect(card).toHaveTextContent("After that");
    expect(card).toHaveTextContent("Bio Assignment · Thu 19 Nov");
    expect(within(card).getByRole("button", { name: "Mark French vocab test done" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Edit French vocab test" })).toBeInTheDocument();
  });

  it("links a coursework date to its component and offers no tick", () => {
    render(<NextUp items={[stage]} today={TODAY} classes={[]} />);
    const card = screen.getByRole("region", { name: "Next up" });
    expect(within(card).getByRole("link", { name: "Conducting the Experiment" })).toHaveAttribute("href", "/components/k1");
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
  });

  it("draws nothing when nothing is coming", () => {
    const { container } = render(<NextUp items={[own("2026-11-12", "Maths Assignment", true)]} today={TODAY} classes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
