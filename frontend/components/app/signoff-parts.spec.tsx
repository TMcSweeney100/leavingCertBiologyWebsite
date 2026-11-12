import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CheckpointCell, RevokeStrip, SignoffAlert } from "./signoff-parts";

const PLAN = "Plan discussed with the teacher (feasibility and safety)";
const names = { sign: `Sign off ${PLAN} for Aoife Byrne`, undo: `Undo sign-off of ${PLAN} for Aoife Byrne`, revoke: `Revoke sign-off of ${PLAN} for Aoife Byrne` };
const cell = (state: "DUE" | "NOT_DUE" | "SIGNED_OFF") => ({ checkpointId: "c3", state, signedOffOn: state === "SIGNED_OFF" ? "2026-10-02" : null });
const base = { names, busy: null, recent: false, confirming: false, onSign: vi.fn(), onUndo: vi.fn(), onAsk: vi.fn() };

describe("CheckpointCell", () => {
  it("in the grid, a due cell is an amber Sign off that signs off in one click", async () => {
    const onSign = vi.fn();
    render(<CheckpointCell {...base} layout="grid" cell={cell("DUE")} onSign={onSign} />);
    const button = screen.getByRole("button", { name: names.sign });
    expect(button).toHaveTextContent("Sign off");
    await userEvent.click(button);
    expect(onSign).toHaveBeenCalled();
  });

  it("in the grid, a signed-off cell is a tick with its date on hover, and opens the revoke question", async () => {
    const onAsk = vi.fn();
    render(<CheckpointCell {...base} layout="grid" cell={cell("SIGNED_OFF")} onAsk={onAsk} />);
    const button = screen.getByRole("button", { name: names.revoke });
    expect(button).toHaveAttribute("title", "Signed off 2 Oct 2026");
    await userEvent.click(button);
    expect(onAsk).toHaveBeenCalled();
  });

  it("in the grid, a cell not due yet is a quiet dash that still signs off early", () => {
    render(<CheckpointCell {...base} layout="grid" cell={cell("NOT_DUE")} />);
    const button = screen.getByRole("button", { name: names.sign });
    expect(button).toHaveTextContent("Sign off"); // shown on hover and focus
    expect(button).not.toHaveTextContent("Not due yet");
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

  it("in a Progress list the cell is one button: Sign off, or Revoke once signed off", async () => {
    const onAsk = vi.fn();
    const { rerender } = render(<CheckpointCell {...base} layout="row" cell={cell("DUE")} />);
    expect(screen.getByRole("button", { name: names.sign })).toHaveTextContent("Sign off");
    expect(screen.queryByText(/Due/)).not.toBeInTheDocument();
    rerender(<CheckpointCell {...base} layout="row" cell={cell("SIGNED_OFF")} onAsk={onAsk} />);
    await userEvent.click(screen.getByRole("button", { name: names.revoke }));
    expect(onAsk).toHaveBeenCalled();
  });

  it("on a stage card the state is a pill beside one button: Revoke when signed off, Sign off otherwise", async () => {
    const onAsk = vi.fn();
    const onSign = vi.fn();
    const { rerender } = render(<CheckpointCell {...base} layout="card" cell={cell("SIGNED_OFF")} onAsk={onAsk} onSign={onSign} />);
    expect(screen.getByText(/^Signed off/)).toHaveTextContent("Signed off 2 Oct 2026");
    await userEvent.click(screen.getByRole("button", { name: names.revoke }));
    expect(onAsk).toHaveBeenCalled();
    rerender(<CheckpointCell {...base} layout="card" cell={cell("DUE")} onAsk={onAsk} onSign={onSign} />);
    expect(screen.getByText("Due, not signed off")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: names.sign }));
    expect(onSign).toHaveBeenCalled();
    rerender(<CheckpointCell {...base} layout="card" cell={cell("NOT_DUE")} onAsk={onAsk} onSign={onSign} />);
    expect(screen.getByText("Not due yet")).toBeInTheDocument();
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
    render(<SignoffAlert message="Couldn’t sign off for Aoife Byrne." name="Aoife Byrne" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t sign off for Aoife Byrne.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("CheckpointCell, Ready", () => {
  const href = "/teach/classes/k1/students/s1#checkpoint-cp1";
  const readyCell = { checkpointId: "cp1", state: "READY" as const, signedOffOn: null };
  const readyNames = { ...names, review: "Review X for A" };

  it("a Ready cell in the grid is a link to review, not a sign-off button", () => {
    render(<CheckpointCell {...base} names={readyNames} layout="grid" cell={readyCell} reviewHref={href} />);
    const link = screen.getByRole("link", { name: "Review X for A" });
    expect(link).toHaveAttribute("href", href);
    expect(link).toHaveTextContent("Review");
    expect(link).not.toHaveTextContent("Ready");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("in a Progress list a Ready cell is a Review link", () => {
    render(<CheckpointCell {...base} names={readyNames} layout="row" cell={readyCell} reviewHref={href} />);
    expect(screen.getByRole("link", { name: "Review X for A" })).toHaveTextContent("Review");
  });

  it("outside the grid a Ready cell says so in words, with no button", () => {
    render(<CheckpointCell {...base} names={readyNames} layout="one" cell={readyCell} />);
    expect(screen.getByText("Ready for sign-off")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
