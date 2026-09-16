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
});
