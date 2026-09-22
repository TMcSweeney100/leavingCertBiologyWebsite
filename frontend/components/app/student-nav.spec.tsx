import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudentNav } from "./student-nav";

const cls = (status: "PENDING" | "APPROVED" | "REMOVED", subjectName: string, className = `6A ${subjectName}`) => ({
  enrolmentId: `e-${className}`, classId: `c-${className}`, className, subjectName, schoolName: "School A", status,
});
const component = (subjectName: string, classId = `c-6A ${subjectName}`, className = `6A ${subjectName}`) => ({
  componentId: `k-${subjectName}`, classId, className, subjectCode: subjectName.toUpperCase(), subjectName, briefTitle: "Brief", completionDate: "2027-02-26",
});

describe("StudentNav", () => {
  it("links Timeline and an approved subject with a built component, and offers Join a class", () => {
    render(<StudentNav classes={[cls("APPROVED", "Biology")]} components={[component("Biology")]} />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toHaveTextContent(/Timeline[\s\S]*Biology[\s\S]*Join a class/);
    expect(screen.getByRole("link", { name: "Timeline" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Biology" })).toHaveAttribute("href", "/components/k-Biology");
    expect(screen.getByRole("link", { name: "Join a class" })).toHaveAttribute("href", "/join");
  });

  it("marks a pending class as not yet a link, with Pending approval beside it", () => {
    render(<StudentNav classes={[cls("PENDING", "Business")]} components={[]} />);
    expect(screen.queryByRole("link", { name: "Business" })).not.toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText("Pending approval")).toBeInTheDocument();
  });

  it("leaves out removed classes", () => {
    render(<StudentNav classes={[cls("REMOVED", "Physics")]} components={[]} />);
    expect(screen.queryByText("Physics")).not.toBeInTheDocument();
  });

  it("matches a class to its own component by class id, not by name, when two classes share a name", () => {
    const biology = { enrolmentId: "e1", classId: "class-1", className: "6A", subjectName: "Biology", schoolName: "School A", status: "APPROVED" as const };
    const chemistry = { enrolmentId: "e2", classId: "class-2", className: "6A", subjectName: "Chemistry", schoolName: "School A", status: "APPROVED" as const };
    render(
      <StudentNav
        classes={[biology, chemistry]}
        components={[component("Biology", "class-1"), component("Chemistry", "class-2")]}
      />,
    );
    expect(screen.getByRole("link", { name: "Biology" })).toHaveAttribute("href", "/components/k-Biology");
    expect(screen.getByRole("link", { name: "Chemistry" })).toHaveAttribute("href", "/components/k-Chemistry");
  });

  it("shows an approved subject as plain text when no component has been set up for it yet", () => {
    render(<StudentNav classes={[cls("APPROVED", "Chemistry")]} components={[]} />);
    expect(screen.queryByRole("link", { name: "Chemistry" })).not.toBeInTheDocument();
    expect(screen.getByText("Chemistry")).toBeInTheDocument();
    expect(screen.queryByText("Pending approval")).not.toBeInTheDocument();
  });
});
