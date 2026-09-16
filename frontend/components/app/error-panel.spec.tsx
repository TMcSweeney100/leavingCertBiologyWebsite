import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/problem";

import { ErrorPanel } from "./error-panel";

describe("ErrorPanel", () => {
  it("explains an unreachable service in plain words", () => {
    render(<ErrorPanel error={ApiError.unreachable(new Error("x"))} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Can't reach the service");
    expect(screen.getByRole("link", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows the API's own detail for a problem", () => {
    render(<ErrorPanel error={new ApiError({ code: "NOT_FOUND", status: 404, detail: "No such class." })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No such class.");
  });

  it("lists field errors under the message", () => {
    render(
      <ErrorPanel
        error={new ApiError({ code: "VALIDATION_FAILED", status: 400, detail: "One or more fields are invalid.", fieldErrors: [{ field: "academicYear", message: "must look like 2026/27" }] })}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("academicYear: must look like 2026/27");
  });
});
