import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { StageCard } from "./stage-card";

const baseStage = {
  id: "s4", ordinal: 4, label: "Stage 4", name: "Conducting the experiment", description: "Carry out the plan.",
  hoursMin: 1, hoursMax: 2, hoursGroup: null, supervised: true, dueDate: "2026-10-16",
  checkpoint: null, items: [], prompts: [],
};

describe("StageCard", () => {
  it("is a button naming the stage, and reports its open state on the row", () => {
    const onToggle = vi.fn();
    render(<StageCard componentId="k1" stage={baseStage} allStages={[baseStage]} state="current" open={false} onToggle={onToggle} />);
    const row = screen.getByRole("button", { name: /Conducting the experiment/ });
    expect(row).toHaveAttribute("aria-expanded", "false");
  });

  it("hides the body from assistive tech when closed, kept mounted so it can animate open", () => {
    const { rerender } = render(<StageCard componentId="k1" stage={baseStage} allStages={[baseStage]} state="current" open={false} onToggle={vi.fn()} />);
    expect(document.getElementById("stage-s4-panel")).toHaveAttribute("aria-hidden", "true");
    rerender(<StageCard componentId="k1" stage={baseStage} allStages={[baseStage]} state="current" open={true} onToggle={vi.fn()} />);
    expect(document.getElementById("stage-s4-panel")).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByText("Carry out the plan.")).toBeInTheDocument();
  });

  it("toggling the row calls onToggle with the stage id", async () => {
    const onToggle = vi.fn();
    render(<StageCard componentId="k1" stage={baseStage} allStages={[baseStage]} state="current" open={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /Conducting the experiment/ }));
    expect(onToggle).toHaveBeenCalledWith("s4");
  });

  it("names each state word, never colour alone", () => {
    render(<StageCard componentId="k1" stage={baseStage} allStages={[baseStage]} state="done" open={false} onToggle={vi.fn()} />);
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows a passed checkpoint without blame, and marks it apart from a done stage", () => {
    const stage = { ...baseStage, checkpoint: { text: "Plan discussed with the teacher", state: "DUE" as const, signedOffOn: null } };
    render(<StageCard componentId="k1" stage={stage} allStages={[stage]} state="current" open={true} onToggle={vi.fn()} />);
    expect(screen.getByText("Plan discussed with the teacher")).toBeInTheDocument();
    expect(screen.getByText(/Not signed off yet/)).toBeInTheDocument();
    expect(screen.getByText(/Bring it up in your next class/)).toBeInTheDocument();
    expect(screen.getByText("Only your teacher can sign this off.")).toBeInTheDocument();
    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
  });

  it("a checkpoint not yet due carries no blame message", () => {
    const stage = { ...baseStage, checkpoint: { text: "Plan discussed with the teacher", state: "NOT_DUE" as const, signedOffOn: null } };
    render(<StageCard componentId="k1" stage={stage} allStages={[stage]} state="current" open={true} onToggle={vi.fn()} />);
    expect(screen.getByText(/Not due yet/)).toBeInTheDocument();
    expect(screen.queryByText(/Bring it up in your next class/)).not.toBeInTheDocument();
  });

  it("says the teacher signed a checkpoint off, with the date, and drops the nudge", () => {
    const stage = { ...baseStage, checkpoint: { text: "Plan discussed with the teacher", state: "SIGNED_OFF" as const, signedOffOn: "2027-01-21" } };
    render(<StageCard componentId="k1" stage={stage} allStages={[stage]} state="current" open={true} onToggle={vi.fn()} />);
    expect(screen.getByText("Checkpoint · Signed off")).toBeInTheDocument();
    expect(screen.getByText("Your teacher signed this off on 21 Jan 2027.")).toBeInTheDocument();
    expect(screen.queryByText(/Bring it up in your next class/)).not.toBeInTheDocument();
  });
});
