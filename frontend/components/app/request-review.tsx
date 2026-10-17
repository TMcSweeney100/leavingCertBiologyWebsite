"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api/client";
import { type DocumentLink, type OpenRequest, progressCellSchema } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { NONDIRECTIVE_HELP, TEACHER_NOTE_MAX, acceptName, notYetName } from "@/lib/app/ready";

import { WorkLink } from "./work-link";

type Outcome = "ACCEPTED" | "NOT_YET";

/** R-3: the teacher answers on the student page, with the work one click away. Accept signs off. */
export function RequestReview({ componentId, studentId, name, text, checkpointId, request, link }:
  { componentId: string; studentId: string; name: string; text: string; checkpointId: string; request: OpenRequest; link: DocumentLink | null }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const noteId = `answer-${checkpointId}`;

  // The alert only exists after React renders the error, so focus moves in an effect, not in the handler.
  useEffect(() => { if (error) alertRef.current?.focus(); }, [error]);

  async function answer(outcome: Outcome) {
    setBusy(outcome);
    setError(null);
    try {
      await api.send("POST", `/components/${componentId}/students/${studentId}/checkpoints/${checkpointId}/request/answer`,
        { outcome, note }, progressCellSchema);
      router.refresh();
    } catch (err) {
      const gone = err instanceof ApiError && err.code === "SIGNOFF_REQUEST_NOT_OPEN";
      setError(gone ? "This request was withdrawn or already answered. The page has been refreshed."
        : "Couldn't save your answer. Nothing changed. Check your connection and try again.");
      if (gone) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-app-inner border border-app-line bg-app-ready-tint p-4">
      <p className="text-app-small font-semibold text-app-ready">{`Ready for sign-off · asked ${formatCalendarDate(request.askedOn)}`}</p>
      {request.note && <p data-private className="text-app-base text-app-ink">{request.note}</p>}
      {link ? <WorkLink url={link.url} name={name} className="self-start" /> : <p className="text-app-small text-app-grey">No link yet</p>}
      <label htmlFor={noteId} className="text-app-small font-semibold text-app-ink">{`Note to ${name} (optional)`}</label>
      <textarea id={noteId} value={note} maxLength={TEACHER_NOTE_MAX} rows={2} onChange={(e) => setNote(e.target.value)}
        aria-describedby={`${noteId}-help`} className="rounded-app-control border border-app-field-border bg-app-surface px-3 py-2 text-app-base" />
      <p id={`${noteId}-help`} className="text-app-small text-app-grey">{NONDIRECTIVE_HELP}</p>
      {error && <p ref={alertRef} tabIndex={-1} role="alert" className="text-app-small text-app-error">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" aria-label={acceptName(text, name)} disabled={busy !== null} onClick={() => void answer("ACCEPTED")}>
          {busy === "ACCEPTED" ? "Accepting…" : "Accept"}
        </Button>
        <Button type="button" variant="outline" aria-label={notYetName(text, name)} disabled={busy !== null} onClick={() => void answer("NOT_YET")}>
          {busy === "NOT_YET" ? "Saving…" : "Not yet"}
        </Button>
      </div>
    </div>
  );
}
