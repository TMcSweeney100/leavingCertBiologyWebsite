import { Check } from "lucide-react";
import type { ProgressCell } from "@/lib/api/schemas";
import Link from "next/link";

import { formatCalendarDate } from "@/lib/app/component-setup";
import { keepName, revokeName, type SignoffAction } from "@/lib/app/progress";

import { Button, buttonVariants } from "@/components/ui/button";

const BUSY: Record<SignoffAction, string> = { sign: "Signing off…", undo: "Undoing…", revoke: "Revoking…" };
const GRID_BUTTON = "flex min-h-12 w-full flex-col items-start justify-center gap-0.5 rounded-app-control px-2.5 py-1.5 text-left touch-manipulation disabled:cursor-not-allowed";

type CellProps = {
  layout: "grid" | "card" | "row";
  cell: ProgressCell;
  names: { sign: string; undo: string; revoke: string; review?: string };
  reviewHref?: string;
  busy: SignoffAction | null;
  recent: boolean;
  confirming: boolean;
  onSign: () => void;
  onUndo: () => void;
  onAsk: () => void;
};

/**
 * One checkpoint for one student (pack D-7). In the grid a cell is one quiet mark (a tick, an amber Sign off, a
 * dash, Review); on the student page's stage cards (`card`) the state is a pill beside one button; in the Progress
 * tab's lists (`row`) it's the button alone. Every button's name says the checkpoint and the student, because
 * thirty buttons called "Sign off" would be useless to a screen reader.
 */
export function CheckpointCell({ layout, cell, names, busy, recent, confirming, reviewHref, onSign, onUndo, onAsk }: CellProps) {
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

  if (cell.state === "READY") {
    if (reviewHref && layout === "grid") {
      return (
        <Link href={reviewHref} aria-label={names.review} className={`${GRID_BUTTON} hover:bg-app-inset`}>
          <span className="inline-flex h-9 items-center rounded-app-control bg-app-accent px-3 text-app-small font-bold text-app-on-accent">Review</span>
        </Link>
      );
    }
    if (reviewHref && layout === "row") {
      return <Link href={reviewHref} aria-label={names.review} className={buttonVariants()}>Review</Link>;
    }
    return <span className="text-app-small font-semibold text-app-ready">Ready for sign-off</span>;
  }

  // Direction D (plan student-page-redesign, R-10): a pill for the state and one button.
  if (layout === "card") {
    const settled = cell.state === "SIGNED_OFF";
    const due = cell.state === "DUE";
    const pill = settled ? "bg-app-approved-tint text-app-signed" : due ? "bg-app-due-tint text-app-due" : "bg-app-inset text-app-grey";
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-app-small font-semibold ${pill}`}>
          {settled ? <><Check aria-hidden className="size-4" strokeWidth={3} />Signed off {date}</> : due ? "Due, not signed off" : "Not due yet"}
        </span>
        {settled ? (
          <Button type="button" variant="ghost" aria-label={names.revoke} disabled={busy !== null} onClick={onAsk} className="text-app-grey">
            {busy === "revoke" ? BUSY.revoke : "Revoke"}
          </Button>
        ) : (
          <Button type="button" variant="outline" aria-label={names.sign} disabled={busy !== null} onClick={onSign}
            className="border-app-accent text-app-accent hover:bg-app-accent-tint">
            {busy === "sign" ? BUSY.sign : "Sign off"}
          </Button>
        )}
      </div>
    );
  }

  // Plan progress-redesign P-10: quiet marks. Every button keeps its full name, so only the visible words got shorter.
  if (layout === "grid") {
    if (cell.state === "SIGNED_OFF") {
      return (
        <button type="button" aria-label={names.revoke} title={cell.signedOffOn ? `Signed off ${formatCalendarDate(cell.signedOffOn)}` : undefined}
          disabled={busy !== null} onClick={onAsk} className={`${GRID_BUTTON} hover:bg-app-inset`}>
          {busy === "revoke" ? <span className="text-app-small text-app-grey">{BUSY.revoke}</span> : (
            <span aria-hidden className="ml-1.5 inline-flex size-[26px] items-center justify-center rounded-full bg-app-signed text-app-on-accent">
              <Check className="size-4" strokeWidth={3} />
            </span>
          )}
        </button>
      );
    }
    if (cell.state === "DUE") {
      return (
        <button type="button" aria-label={names.sign} disabled={busy !== null} onClick={onSign} className={GRID_BUTTON}>
          <span className="inline-flex h-9 items-center rounded-app-control border border-app-attention-line bg-app-due-tint px-3 text-app-small font-bold text-app-due">
            {busy === "sign" ? BUSY.sign : "Sign off"}
          </span>
        </button>
      );
    }
    return (
      <button type="button" aria-label={names.sign} disabled={busy !== null} onClick={onSign} className={`group ${GRID_BUTTON} hover:bg-app-inset`}>
        {busy === "sign" ? <span className="text-app-small text-app-grey">{BUSY.sign}</span> : (
          <>
            <span aria-hidden className="ml-1.5 block h-0.5 w-3.5 rounded-full bg-app-field-border group-hover:hidden group-focus-visible:hidden" />
            <span className="hidden text-app-small font-semibold text-app-accent group-hover:inline group-focus-visible:inline">Sign off</span>
          </>
        )}
      </button>
    );
  }

  // Plan progress-redesign P-9: the Progress tab's lists. One button; the list's heading says the state.
  return cell.state === "SIGNED_OFF" ? (
    <Button type="button" variant="ghost" aria-label={names.revoke} disabled={busy !== null} onClick={onAsk} className="text-app-grey">
      {busy === "revoke" ? BUSY.revoke : "Revoke"}
    </Button>
  ) : (
    <Button type="button" variant="outline" aria-label={names.sign} disabled={busy !== null} onClick={onSign}
      className="border-app-accent text-app-accent hover:bg-app-accent-tint">
      {busy === "sign" ? BUSY.sign : "Sign off"}
    </Button>
  );
}

/** A sentence with the student's name marked data-private, so Hide names blurs it where it's visible (plan P4-16). */
function withPrivateName(sentence: string, name: string) {
  const [before, ...after] = sentence.split(name);
  if (after.length === 0) return sentence;
  return <>{before}<span data-private>{name}</span>{after.join(name)}</>;
}

/** Pack D-2's in-place confirmation. Short visible labels; full names so two open strips can't be confused. */
export function RevokeStrip({ question, text, name, busy, onRevoke, onKeep }:
  { question: string; text: string; name: string; busy: boolean; onRevoke: () => void; onKeep: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-app-inner border border-app-error/30 bg-app-error-tint px-4 py-3">
      <p className="min-w-0 flex-1 text-app-small text-app-copy">{withPrivateName(question, name)}</p>
      <Button type="button" variant="confirmDestructive" aria-label={revokeName(text, name)} disabled={busy} onClick={onRevoke}>
        {busy ? "Revoking…" : "Revoke"}
      </Button>
      <Button type="button" variant="outline" aria-label={keepName(text, name)} disabled={busy} onClick={onKeep}>Keep sign-off</Button>
    </div>
  );
}

/** Pack D-1's compact alert, under the row, with Try again. The cell is unchanged. */
export function SignoffAlert({ message, name, onRetry }: { message: string; name: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-app-inner border border-app-error/30 border-l-4 border-l-app-error bg-app-error-tint px-4 py-3">
      <span aria-hidden className="flex size-5 flex-none items-center justify-center rounded-full bg-app-error text-app-label font-bold text-app-surface">!</span>
      <span className="min-w-0 flex-1 text-app-small text-app-copy">{withPrivateName(message, name)}</span>
      <Button type="button" variant="outline" onClick={onRetry}>Try again</Button>
    </div>
  );
}
