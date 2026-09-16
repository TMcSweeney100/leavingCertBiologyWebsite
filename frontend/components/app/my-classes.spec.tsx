import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MyClasses } from "./my-classes";

const cls = (status: "PENDING" | "APPROVED", className = "6A Biology") => ({
  enrolmentId: "e-" + className, classId: "c-" + className, className, subjectName: "Biology", schoolName: "School A", status,
});

describe("MyClasses", () => {
  it("lists classes with their status", () => {
    render(<MyClasses classes={[cls("APPROVED"), cls("PENDING", "6B Chemistry")]} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("6A Biology");
    expect(items[0]).toHaveTextContent("Approved");
    expect(items[1]).toHaveTextContent("Pending approval");
    expect(screen.getByRole("link", { name: "Join a class" })).toHaveAttribute("href", "/join");
  });

  it("explains an empty list", () => {
    render(<MyClasses classes={[]} />);
    expect(screen.getByText(/no classes yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Join a class" })).toBeInTheDocument();
  });

  it("explains when everything is still pending", () => {
    render(<MyClasses classes={[cls("PENDING")]} />);
    expect(screen.getByRole("status")).toHaveTextContent(/waiting for a teacher/i);
  });
});
