import type { ProgressCell } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { keepName, revokeName, type SignoffAction } from "@/lib/app/progress";

import { Button } from "@/components/ui/button";

const BUSY: Record<SignoffAction, string> = { sign: "Signing off…", undo: "Undoing…", revoke: "Revoking…" };
const GRID_BUTTON = "flex min-h-12 w-full flex-col items-start justify-center gap-0.5 rounded-app-control px-2.5 py-1.5 text-left touch-manipulation disabled:cursor-not-allowed";

type CellProps = {
  layout: "grid" | "one";
  cell: ProgressCell;
  names: { sign: string; undo: string; revoke: string };
  busy: SignoffAction | null;
  recent: boolean;
  confirming: boolean;
  onSign: () => void;
  onUndo: () => void;
  onAsk: () => void;
};

/**
 * One checkpoint for one student (pack D-7). In the grid a cell is one button carrying its state word; in a
 * one-stage view or on the student page the state is words beside a separate button. Every button's name says
 * the checkpoint and the student, because thirty buttons called "Sign off" would be useless to a screen reader.
 */
export function CheckpointCell({ layout, cell, names, busy, recent, confirming, onSign, onUndo, onAsk }: CellProps) {
  const date = cell.signedOffOn ? <span data-private>{formatCalendarDate(cell.signedOffOn)}</span> : null;

  if (confirming) {
    return layout === "grid"
      ? <div className="flex flex-col px-2.5 py-1.5 text-app-small"><span className="font-semibold text-app-error">Revoke?</span><span className="text-app-grey">Confirm below</span></div>
      : <p className="text-app-small font-semibold text-app-error">Revoke this sign-off?</p>;
  }

  if (cell.state === "SIGNED_OFF" && recent) {
    return (
      <div className={`flex flex-wrap items-center gap-2 bg-app-signed-recent ${layout === "grid" ? "min-h-12 px-2.5" : "rounded-app-inner px-3 py-2"}`}>
        <span className="text-app-small font-semibold text-app-signed">Signed off today</span>
        <Button type="button" variant="link" aria-label={names.undo} disabled={busy !== null} onClick={onUndo}
          className="min-h-11 px-1">{busy === "undo" ? BUSY.undo : "Undo"}</Button>
      </div>
    );
  }

  if (layout === "grid") {
    if (cell.state === "SIGNED_OFF") {
      return (
        <button type="button" aria-label={names.revoke} disabled={busy !== null} onClick={onAsk} className={`${GRID_BUTTON} hover:bg-app-inset`}>
          <span className="text-app-small font-semibold text-app-signed">{busy === "revoke" ? BUSY.revoke : "Signed off"}</span>
          <span className="font-mono text-app-label text-app-grey">{date}</span>
        </button>
      );
    }
    const due = cell.state === "DUE";
    return (
      <button type="button" aria-label={names.sign} disabled={busy !== null} onClick={onSign}
        className={`${GRID_BUTTON} ${due ? "bg-app-due-tint hover:bg-app-attention-tint" : "hover:bg-app-inset"}`}>
        <span className={`text-app-small font-semibold ${due ? "text-app-due" : "text-app-muted"}`}>{due ? "Due" : "Not due yet"}</span>
        <span className="text-app-small font-semibold text-app-accent">{busy === "sign" ? BUSY.sign : "Sign off"}</span>
      </button>
    );
  }

  const settled = cell.state === "SIGNED_OFF";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className={`text-app-small ${cell.state === "DUE" ? "font-semibold text-app-due" : settled ? "text-app-signed" : "text-app-muted"}`}>
        {settled ? <><strong>Signed off</strong> {date}</> : cell.state === "DUE" ? "Due, not signed off" : "Not due yet"}
      </span>
      <Button type="button" variant="outline" aria-label={settled ? names.revoke : names.sign} disabled={busy !== null}
        onClick={settled ? onAsk : onSign} className="min-h-11 text-app-accent">
        {busy ? BUSY[busy] : settled ? "Revoke" : "Sign off"}
      </Button>
    </div>
  );
}

/** Pack D-2's in-place confirmation. Short visible labels; full names so two open strips can't be confused. */
export function RevokeStrip({ question, text, name, busy, onRevoke, onKeep }:
  { question: string; text: string; name: string; busy: boolean; onRevoke: () => void; onKeep: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-app-inner border border-app-error/30 bg-app-error-tint px-4 py-3">
      <p className="min-w-0 flex-1 text-app-small text-app-copy">{question}</p>
      <Button type="button" variant="confirmDestructive" aria-label={revokeName(text, name)} disabled={busy} onClick={onRevoke}>
        {busy ? "Revoking…" : "Revoke"}
      </Button>
      <Button type="button" variant="outline" aria-label={keepName(text, name)} disabled={busy} onClick={onKeep}>Keep sign-off</Button>
    </div>
  );
}

/** Pack D-1's compact alert, under the row, with Try again. The cell is unchanged. */
export function SignoffAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-app-inner border border-app-error/30 border-l-4 border-l-app-error bg-app-error-tint px-4 py-3">
      <span aria-hidden className="flex size-5 flex-none items-center justify-center rounded-full bg-app-error text-app-label font-bold text-app-surface">!</span>
      <span className="min-w-0 flex-1 text-app-small text-app-copy">{message}</span>
      <Button type="button" variant="outline" onClick={onRetry}>Try again</Button>
    </div>
  );
}
