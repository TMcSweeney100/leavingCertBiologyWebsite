import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CountsBar } from "./counts-bar";

describe("CountsBar", () => {
  it("draws the counts as a bar named in words, and says them under it", () => {
    const { container } = render(<CountsBar counts={{ signedOff: 12, waiting: 1, notYet: 19 }} showWaiting />);
    expect(screen.getByRole("img", { name: "12 signed off, 1 waiting, 19 not yet, of 32 students" })).toBeInTheDocument();
    expect(container.querySelector("p")).toHaveTextContent(/12 signed off.*1 waiting.*19 not yet/);
  });

  it("leaves the waiting count out when the card says it another way", () => {
    const { container } = render(<CountsBar counts={{ signedOff: 2, waiting: 3, notYet: 1 }} showWaiting={false} />);
    expect(container.querySelector("p")).not.toHaveTextContent("waiting");
  });
});
