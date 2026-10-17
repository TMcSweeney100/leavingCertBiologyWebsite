"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { type DocumentLink, type StudentComponent, openRequestSchema } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { STUDENT_NOTE_MAX, askAgainName, linkHost, readyName, withdrawName } from "@/lib/app/ready";

import { RequestHistory } from "./request-history";

type Checkpoint = NonNullable<StudentComponent["stages"][number]["checkpoint"]>;

/** Ready for sign-off (backlog §1) inside the stage card's checkpoint box. One request at a time; withdraw until answered. */
export function ReadyControl({ componentId, checkpoint: c, link, requireLink }:
  { componentId: string; checkpoint: Checkpoint; link: DocumentLink | null; requireLink: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const alertRef = useRef<HTMLParagraphElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const latest = c.answers[0];
  const blocked = requireLink && link === null;

  // Refs are null until React has rendered the new state, so focus moves in effects, not in the handlers.
  useEffect(() => { if (open) noteRef.current?.focus(); }, [open]);
  useEffect(() => { if (error) alertRef.current?.focus(); }, [error]);

  async function act(run: () => Promise<unknown>, done: string, failed: string) {
    setBusy(true);
    setError(null);
    try {
      await run();
      setOpen(false);
      setNote("");
      setAnnouncement(done);
      router.refresh();
    } catch {
      setError(failed);
    } finally {
      setBusy(false);
    }
  }

  const send = () => act(() => api.send("POST", `/components/${componentId}/checkpoints/${c.id}/request`, { note }, openRequestSchema),
    "Sent to your teacher.", "Couldn't send it. Check your connection and try again.");
  const withdraw = () => act(() => api.sendNoContent("DELETE", `/components/${componentId}/checkpoints/${c.id}/request`),
    "Request withdrawn.", "Couldn't withdraw it. Check your connection and try again.");

  return (
    <div className="flex flex-col gap-2">
      {c.state === "READY" && c.request ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-app-small font-semibold text-app-ready">{`Waiting for your teacher · asked ${formatCalendarDate(c.request.askedOn)}`}</span>
            {c.request.note && <span className="text-app-small text-app-copy">{`Your note: ${c.request.note}`}</span>}
          </div>
          <Button type="button" variant="outline" aria-label={withdrawName(c.text)} disabled={busy} onClick={withdraw}>
            {busy ? "Withdrawing…" : "Withdraw"}
          </Button>
        </div>
      ) : c.state !== "SIGNED_OFF" && !open ? (
        <>
          {latest?.outcome === "NOT_YET" && (
            <div className="flex flex-col gap-0.5">
              <span className="text-app-small font-semibold text-app-due">{`Not yet · ${formatCalendarDate(latest.answeredOn)}`}</span>
              {latest.teacherNote && <span className="text-app-small text-app-copy">{latest.teacherNote}</span>}
            </div>
          )}
          <Button type="button" className="self-start" onClick={() => setOpen(true)}
            aria-label={latest?.outcome === "NOT_YET" ? askAgainName(c.text) : readyName(c.text)}>
            {latest?.outcome === "NOT_YET" ? "Ask again" : "Ready for sign-off"}
          </Button>
        </>
      ) : null}

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex flex-col gap-2">
          <label htmlFor={`note-${c.id}`} className="text-app-small font-semibold text-app-ink">Note for your teacher (optional)</label>
          <textarea ref={noteRef} id={`note-${c.id}`} value={note} maxLength={STUDENT_NOTE_MAX} rows={2} onChange={(e) => setNote(e.target.value)}
            className="rounded-app-control border border-app-field-border bg-app-surface px-3 py-2 text-app-base" />
          {note.length >= STUDENT_NOTE_MAX * 0.9 && <span className="text-app-label text-app-grey">{`${note.length} of ${STUDENT_NOTE_MAX}`}</span>}
          <p className="text-app-small text-app-grey">
            {link ? `Your teacher will see: ${linkHost(link.url)}`
              : blocked ? "Add the link to your work above first."
              : "Add the link to your work above so your teacher can open it. You can still send this without it."}
          </p>
          {error && <p ref={alertRef} tabIndex={-1} role="alert" className="text-app-small text-app-error">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || blocked}>{busy ? "Sending…" : "Send"}</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => { setOpen(false); setError(null); }}>Cancel</Button>
          </div>
        </form>
      )}
      {error && !open && <p ref={alertRef} tabIndex={-1} role="alert" className="text-app-small text-app-error">{error}</p>}
      {latest?.outcome === "ACCEPTED" && c.state === "SIGNED_OFF" && latest.teacherNote && (
        <span className="text-app-small text-app-copy">{`Your teacher: ${latest.teacherNote}`}</span>
      )}
      <RequestHistory answers={c.answers} />
      <p aria-live="polite" className="sr-only">{announcement}</p>
    </div>
  );
}
