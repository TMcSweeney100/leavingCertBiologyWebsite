import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassHeader } from "./class-header";

const detail = { id: "c1", name: "6A Biology", subjectName: "Biology", yearGroup: 6, academicYear: "2026/27" };

describe("ClassHeader", () => {
  it("names the class and marks the current tab", () => {
    render(<ClassHeader detail={detail} current="component" />);
    expect(screen.getByRole("heading", { level: 1, name: "6A Biology" })).toBeInTheDocument();
    const tabs = screen.getByRole("navigation", { name: "Class sections" });
    expect(screen.getByRole("link", { name: "Component" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Students" })).toHaveAttribute("href", "/teach/classes/c1");
    expect(tabs).toHaveTextContent("Progress");
    expect(screen.queryByRole("link", { name: "Progress" })).not.toBeInTheDocument();
  });

  it("links back to my classes", () => {
    render(<ClassHeader detail={detail} current="students" />);
    expect(screen.getByRole("link", { name: "My classes" })).toHaveAttribute("href", "/teach");
    expect(screen.getByRole("link", { name: "Component" })).toHaveAttribute("href", "/teach/classes/c1/component");
  });
});
