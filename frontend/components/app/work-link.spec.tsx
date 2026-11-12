import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkIcon } from "./work-link";

describe("WorkIcon", () => {
  it("opens the work in a new tab, is named for the student, and shows the host on hover", () => {
    render(<WorkIcon url="https://docs.google.com/document/d/1" name="Aoife Byrne" />);
    const link = screen.getByRole("link", { name: "Open Aoife Byrne's work (opens in a new tab)" });
    expect(link).toHaveAttribute("href", "https://docs.google.com/document/d/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("title", "docs.google.com");
  });
});
