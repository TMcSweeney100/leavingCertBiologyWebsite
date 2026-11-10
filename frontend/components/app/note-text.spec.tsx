import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoteText } from "./note-text";

describe("NoteText", () => {
  it("keeps line breaks and opens links in a new tab, saying so", () => {
    render(<NoteText text={"Thursday.\nSlots: https://example.ie/slots"} />);
    const link = screen.getByRole("link", { name: "https://example.ie/slots (opens in a new tab)" });
    expect(link).toHaveAttribute("href", "https://example.ie/slots");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows a www. address as typed, linking to it over https", () => {
    render(<NoteText text="Examples at www.example.ie/2025" />);
    const link = screen.getByRole("link", { name: "www.example.ie/2025 (opens in a new tab)" });
    expect(link).toHaveAttribute("href", "https://www.example.ie/2025");
    expect(link).toHaveTextContent(/^www\.example\.ie\/2025$/);
  });
});
