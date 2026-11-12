import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { grid, row } from "./progress-fixtures";
import { StageTabs } from "./stage-tabs";

const CLASS = grid([row("a", "Aoife", "Byrne", 2, ["DUE", "DUE"], null), row("c", "Cian", "Murphy", 1, ["SIGNED_OFF", "READY"], 3)]);

describe("StageTabs", () => {
  it("links All and each stage, says what's left, and marks the current one", () => {
    render(<StageTabs grid={CLASS} current="2" basePath="/p" />);
    const nav = within(screen.getByRole("navigation", { name: "Stages" }));
    expect(nav.getByRole("link", { name: /All/ })).toHaveAttribute("href", "/p?stage=all");
    expect(nav.getByRole("link", { name: /Stage 1.*Initial ideas.*1 to sign off/ })).toHaveAttribute("href", "/p?stage=1");
    expect(nav.getByRole("link", { name: /Stage 2.*Investigative log.*2 to sign off/ })).toHaveAttribute("aria-current", "page");
  });

  it("shows a stage with nothing to sign off but doesn't link it (plan P4-22)", () => {
    const business = { ...CLASS, stages: [...CLASS.stages, { stageId: "s6", ordinal: 6, label: "Stage 6", name: "Applying", dueDate: null, checkpoint: null }] };
    render(<StageTabs grid={business} current="all" basePath="/p" />);
    expect(screen.getByText("Nothing to sign off")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Stage 6/ })).not.toBeInTheDocument();
  });
});
