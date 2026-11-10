import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudentHeader } from "./student-header";

const student = { firstName: "Tim", lastName: "Mc Sweeney" };

describe("StudentHeader", () => {
  it("names the student as the page's heading, says the class and when they last wrote, and links their work", () => {
    render(<StudentHeader student={student} className="6th Year Biology" activity="Last entry 7 days ago"
      link={{ url: "https://drive.google.com/x", setOn: "2026-10-01" }} />);
    expect(screen.getByRole("heading", { level: 1, name: "Tim Mc Sweeney" })).toBeInTheDocument();
    expect(screen.getByText("6th Year Biology · Last entry 7 days ago")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Tim Mc Sweeney's work (opens in a new tab)" })).toHaveAttribute("href", "https://drive.google.com/x");
  });

  it("leaves the work link out when there isn't one", () => {
    render(<StudentHeader student={student} className="6th Year Biology" activity={null} link={null} />);
    expect(screen.getByText("6th Year Biology")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
