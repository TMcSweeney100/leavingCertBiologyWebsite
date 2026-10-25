"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentLink, OpenRequest } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import {
  NONDIRECTIVE_HELP, REQUEST_GONE, TEACHER_NOTE_MAX, acceptLabel, acceptName, answerFailure, askedLine, noteLabel, notYetName,
} from "@/lib/app/ready";

import { WorkLinkBlock } from "./work-link";

export type Outcome = "ACCEPTED" | "NOT_YET";
/** `message` replaces the default sentence (a rejected note, a lost session); `gone` means retrying cannot work. */
export type AnswerError = { outcome: Outcome; gone: boolean; message?: string };

type Who = { firstName: string; name: string; text: string; stage: string };

/** Pack D-10: what the student asked, in their words, with the work one click away. Used in the row and in the drawer. */
export function RequestBlock({ firstName, request, again, today, link, name, edge = false }:
  { firstName: string; name: string; request: OpenRequest; again: boolean; today: string; link: DocumentLink | null; edge?: boolean }) {
  return (
    <div className={`flex flex-col gap-2.5 bg-app-request-tint p-4 ${edge ? "rounded-app-inner border-l-4 border-l-app-accent" : "lg:px-[18px]"}`}>
      <p className="text-app-small font-bold text-app-accent">
        <span data-private>{askedLine(firstName, request.askedOn, today, again)}</span>
        {again && <span className="font-normal text-app-copy">{` (${formatCalendarDate(request.askedOn)})`}</span>}
      </p>
      {request.note
        ? <blockquote data-private className="text-app-base leading-normal text-app-ink">{`“${request.note}”`}</blockquote>
        : <p className="text-app-meta text-app-copy">No note from <span data-private>{firstName}</span>.</p>}
      {link ? (
        <WorkLinkBlock url={link.url} name={name} firstName={firstName} className="self-start" />
      ) : (
        <p className="border-t border-app-request-rule pt-2.5 text-app-meta leading-[1.45] text-app-copy">
          <strong>No link to <span data-private>{firstName}</span>&rsquo;s work.</strong>{` ${firstName} can add one on their Your work card. Look at the work in class, or answer Not yet.`}
        </p>
      )}
    </div>
  );
}

/** The teacher's half: one note, Accept and Not yet. The draft lives in the parent so the row and the drawer share it. */
export function AnswerForm({ idPrefix, firstName, name, text, stage, note, onNote, busy, error, onAnswer, onRetry }:
  Who & { idPrefix: string; note: string; onNote: (v: string) => void; busy: Outcome | null; error: AnswerError | null;
    onAnswer: (o: Outcome) => void; onRetry: () => void }) {
  const alertRef = useRef<HTMLDivElement>(null);
  const noteId = `${idPrefix}-note`;
  // The alert only exists after React renders the error, so focus moves in an effect, not in the handler.
  useEffect(() => { if (error) alertRef.current?.focus(); }, [error]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={noteId} className="text-app-small font-semibold text-app-ink">{noteLabel(firstName)}</Label>
      <Textarea id={noteId} rows={3} maxLength={TEACHER_NOTE_MAX} value={note} onChange={(e) => onNote(e.target.value)}
        aria-describedby={`${noteId}-help`} className="resize-y" />
      <div className="flex items-start justify-between gap-3">
        <p id={`${noteId}-help`} className="text-app-small leading-[1.4] text-app-grey">{NONDIRECTIVE_HELP}</p>
        <span className="flex-none font-mono text-app-label tabular-nums text-app-muted">{`${note.length} / ${TEACHER_NOTE_MAX}`}</span>
      </div>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <Button type="button" size="form" aria-label={acceptName(text, name)} disabled={busy !== null} onClick={() => onAnswer("ACCEPTED")} className="sm:min-h-11">
          {busy === "ACCEPTED" ? "Accepting…" : acceptLabel(stage)}
        </Button>
        <Button type="button" size="form" variant="outline" aria-label={notYetName(text, name)} disabled={busy !== null} onClick={() => onAnswer("NOT_YET")} className="sm:min-h-11">
          {busy === "NOT_YET" ? "Saving…" : "Not yet"}
        </Button>
      </div>
      {error && (
        <Alert ref={alertRef} tabIndex={-1} variant="error" className="mt-1 flex flex-wrap items-center gap-3">
          <span aria-hidden className="flex size-5 flex-none items-center justify-center rounded-full border-2 border-app-error text-app-label font-bold text-app-error">!</span>
          <span className="min-w-0 flex-1" data-private>{error.message ?? (error.gone ? REQUEST_GONE : answerFailure(error.outcome, text, name))}</span>
          {!error.gone && <Button type="button" variant="outline" onClick={onRetry}>Try again</Button>}
        </Alert>
      )}
    </div>
  );
}

/** R-3 / pack D-10: the teacher answers on the student's page, request on the left, answer on the right. */
export function RequestReview(props: Who & {
  checkpointId: string; request: OpenRequest; again: boolean; today: string; link: DocumentLink | null;
  note: string; onNote: (v: string) => void; busy: Outcome | null; error: AnswerError | null;
  onAnswer: (o: Outcome) => void; onRetry: () => void;
}): ReactNode {
  const { request, again, today, link, checkpointId, ...form } = props;
  return (
    <div className="grid overflow-hidden rounded-app-card border border-app-field-border bg-app-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <RequestBlock firstName={props.firstName} name={props.name} request={request} again={again} today={today} link={link} />
      <div className="p-4 lg:px-[18px]">
        <AnswerForm idPrefix={`answer-${checkpointId}`} {...form} />
      </div>
    </div>
  );
}
