import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CheckpointCell, RevokeStrip, SignoffAlert } from "./signoff-parts";

const PLAN = "Plan discussed with the teacher (feasibility and safety)";
const names = { sign: `Sign off ${PLAN} for Aoife Byrne`, undo: `Undo sign-off of ${PLAN} for Aoife Byrne`, revoke: `Revoke sign-off of ${PLAN} for Aoife Byrne` };
const cell = (state: "DUE" | "NOT_DUE" | "SIGNED_OFF") => ({ checkpointId: "c3", state, signedOffOn: state === "SIGNED_OFF" ? "2026-10-02" : null });
const base = { names, busy: null, recent: false, confirming: false, onSign: vi.fn(), onUndo: vi.fn(), onAsk: vi.fn() };

describe("CheckpointCell", () => {
  it("in the grid, a due cell says Due and signs off in one click", async () => {
    const onSign = vi.fn();
    render(<CheckpointCell {...base} layout="grid" cell={cell("DUE")} onSign={onSign} />);
    await userEvent.click(screen.getByRole("button", { name: names.sign }));
    expect(onSign).toHaveBeenCalled();
    expect(screen.getByText("Due")).toBeInTheDocument();
  });

  it("a signed-off cell shows its date and opens the revoke question", async () => {
    const onAsk = vi.fn();
    render(<CheckpointCell {...base} layout="grid" cell={cell("SIGNED_OFF")} onAsk={onAsk} />);
    expect(screen.getByText("2 Oct 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: names.revoke }));
    expect(onAsk).toHaveBeenCalled();
  });

  it("a sign-off from this visit offers Undo instead", () => {
    render(<CheckpointCell {...base} layout="one" cell={cell("SIGNED_OFF")} recent />);
    expect(screen.getByText("Signed off today")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: names.undo })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: names.revoke })).not.toBeInTheDocument();
  });

  it("while busy the control is disabled and says what it's doing", () => {
    render(<CheckpointCell {...base} layout="one" cell={cell("NOT_DUE")} busy="sign" />);
    expect(screen.getByRole("button", { name: names.sign })).toBeDisabled();
    expect(screen.getByText("Signing off…")).toBeInTheDocument();
  });

  it("in a one-stage view a due cell says so in full", () => {
    render(<CheckpointCell {...base} layout="one" cell={cell("DUE")} />);
    expect(screen.getByText("Due, not signed off")).toBeInTheDocument();
  });

  it("while its revoke question is open the cell isn't a second Revoke button", () => {
    render(<CheckpointCell {...base} layout="grid" cell={cell("SIGNED_OFF")} confirming />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Revoke?")).toBeInTheDocument();
  });
});

describe("RevokeStrip and SignoffAlert", () => {
  it("names both answers in full, with short visible labels", async () => {
    const onRevoke = vi.fn();
    render(<RevokeStrip question="Revoke?" text={PLAN} name="Aoife Byrne" busy={false} onRevoke={onRevoke} onKeep={vi.fn()} />);
    expect(screen.getByRole("button", { name: `Keep sign-off of ${PLAN} for Aoife Byrne` })).toHaveTextContent("Keep sign-off");
    await userEvent.click(screen.getByRole("button", { name: `Revoke sign-off of ${PLAN} for Aoife Byrne` }));
    expect(onRevoke).toHaveBeenCalled();
  });

  it("a failure is an alert with Try again", async () => {
    const onRetry = vi.fn();
    render(<SignoffAlert message="Couldn’t sign off." onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t sign off.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
