import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Proves the spec runner, jsdom, React Testing Library and jest-dom matchers are wired together.
// If this fails, every component spec's failure is a tooling problem, not a product one.
describe("spec tooling", () => {
  it("renders into jsdom and queries by role", () => {
    render(<button type="button">Continue</button>);
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });
});
