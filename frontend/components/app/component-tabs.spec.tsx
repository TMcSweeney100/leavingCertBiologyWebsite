import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComponentTabs } from "./component-tabs";

describe("ComponentTabs", () => {
  it("makes the Log tab a live link and marks the current tab", () => {
    render(<ComponentTabs componentId="k1" current="log" />);
    expect(screen.getByRole("link", { name: "Log" })).toHaveAttribute("href", "/components/k1/log");
    expect(screen.getByRole("link", { name: "Log" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("link", { name: "Sources" })).not.toBeInTheDocument();
  });
});
