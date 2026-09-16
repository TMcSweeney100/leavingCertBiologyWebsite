import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassList } from "./class-list";

const summary = { id: "c1", name: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology", yearGroup: 6, academicYear: "2026/27", level: "HIGHER" as const, pendingCount: 2 };

describe("ClassList", () => {
  it("links each class and shows pending requests", () => {
    render(<ClassList classes={[summary, { ...summary, id: "c2", name: "5th", pendingCount: 0 }]} />);
    expect(screen.getByRole("link", { name: /6A Biology/ })).toHaveAttribute("href", "/teach/classes/c1");
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("2 pending requests");
    expect(screen.getAllByRole("listitem")[1]).not.toHaveTextContent("pending");
    expect(screen.getByRole("link", { name: "Create class" })).toHaveAttribute("href", "/teach/classes/new");
  });

  it("explains an empty list", () => {
    render(<ClassList classes={[]} />);
    expect(screen.getByText(/no classes yet/i)).toBeInTheDocument();
  });
});
