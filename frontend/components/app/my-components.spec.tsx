import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MyComponents } from "./my-components";

describe("MyComponents", () => {
  it("links to each component, labelled by subject", () => {
    render(<MyComponents components={[{ componentId: "k1", className: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology", briefTitle: "Biology in Practice Investigation", completionDate: "2027-02-26" }]} />);
    expect(screen.getByRole("heading", { name: "My components" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Biology/ })).toHaveAttribute("href", "/components/k1");
  });

  it("renders nothing when there are none", () => {
    const { container } = render(<MyComponents components={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
