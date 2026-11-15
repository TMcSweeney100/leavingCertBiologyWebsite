import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NextRequest } from "./next-request";
import { INITIAL, row, waitingFor } from "./progress-fixtures";

describe("NextRequest", () => {
  it("links to the next request at its checkpoint, and says how many others are waiting", () => {
    render(<NextRequest classId="cl1" next={waitingFor(row("a", "Aoife", "Byrne", 1, ["READY", "DUE"], null), 1)} others={3} />);
    const link = screen.getByRole("link", { name: `Next request: Review ${INITIAL} for Aoife Byrne` });
    expect(link).toHaveAttribute("href", "/teach/classes/cl1/students/a#checkpoint-c1");
    expect(link).toHaveTextContent("Next: Aoife Byrne");
    expect(screen.getByText(/waiting/)).toHaveTextContent("3 more requests are waiting for you");
  });
});
