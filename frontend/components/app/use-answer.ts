"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ApiError, api } from "@/lib/api/client";
import { type Answer, type OpenRequest, progressCellSchema } from "@/lib/api/schemas";
import { ANSWER_NO_ACCESS } from "@/lib/app/ready";

import type { AnswerError, Outcome } from "./request-review";

export type RecentAnswer = { outcome: Outcome; note: string; request: OpenRequest };

/**
 * Pack D-10: the teacher's answer to one checkpoint's request. `note` is the draft the row and the sheet share; it is
 * cleared when an answer lands. `recent` stands until reload, like D-7's Undo, or until the student asks again.
 */
export function useAnswer(componentId: string, studentId: string, checkpointId: string, request: OpenRequest | null, onSent: (outcome: Outcome) => void) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Outcome | null>(null);
  const [error, setError] = useState<AnswerError | null>(null);
  const [recent, setRecent] = useState<RecentAnswer | null>(null);

  // An answer leaves the request open until the refresh lands. Once the page has shown it closed, a request that
  // appears again is a new one: the old answer must not hide its form.
  const sawClosed = useRef(request === null);
  useEffect(() => {
    if (request === null) sawClosed.current = true;
    else if (recent && sawClosed.current) { sawClosed.current = false; setRecent(null); }
  }, [request, recent]);

  async function answer(outcome: Outcome, open: OpenRequest) {
    const sent = note;
    setBusy(outcome);
    setError(null);
    try {
      await api.send("POST", `/components/${componentId}/students/${studentId}/checkpoints/${checkpointId}/request/answer`,
        { outcome, note: sent }, progressCellSchema);
      sawClosed.current = false;
      setRecent({ outcome, note: sent, request: open });
      setNote((now) => (now === sent ? "" : now)); // keep anything typed while the request was in flight
      onSent(outcome);
      router.refresh();
    } catch (err) {
      setError(answerError(outcome, err));
      if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 404 || err.code === "SIGNOFF_REQUEST_NOT_OPEN")) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return {
    note, setNote, busy, error, recent, answer,
    /** The Accept was undone (the API does not reopen the request): drop the answered strip. */
    clearRecent: () => setRecent(null),
  };
}

function answerError(outcome: Outcome, err: unknown): AnswerError {
  if (!(err instanceof ApiError)) return { outcome, gone: false };
  if (err.code === "SIGNOFF_REQUEST_NOT_OPEN") return { outcome, gone: true };
  if (err.status === 401 || err.status === 403 || err.status === 404) return { outcome, gone: true, message: ANSWER_NO_ACCESS };
  if (err.status === 400) return { outcome, gone: false, message: err.detail };
  return { outcome, gone: false };
}

/** The answers as the row should show them: the server's, with this visit's answer on top until the refresh brings it. */
export function withRecent(answers: ReadonlyArray<Answer>, recent: RecentAnswer | null, today: string): ReadonlyArray<Answer> {
  if (!recent) return answers;
  const landed = answers.some((a) => a.askedOn === recent.request.askedOn && a.answeredOn === today && a.outcome === recent.outcome);
  if (landed) return answers;
  return [{ askedOn: recent.request.askedOn, note: recent.request.note, outcome: recent.outcome, answeredOn: today, teacherNote: recent.note || null }, ...answers];
}
