"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api/client";
import { noteSchema, type StageNote } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { NOTE_MAX } from "@/lib/app/note-text";

import { ErrorPanel } from "./error-panel";
import { NoteText } from "./note-text";

const heading = "font-heading text-app-base font-bold text-app-ink";

/**
 * The teacher's note on one stage (plan stage-sheet S-8, S-22; plan stage-drawer-redesign R-4, R-11 to R-13). One cream
 * card: at rest it shows the note as students see it, and Edit turns the same card into the box. The draft lives in the
 * page (S-21), so an unsaved note survives closing the sheet, and the card then opens on the box.
 */
export function StageNoteForm({ componentId, stageId, note, draft, onDraft }: {
  componentId: string;
  stageId: string;
  note: StageNote | null;
  draft: string;
  onDraft: (text: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  /** Edit, or Add a note: whichever the card shows at rest. */
  const opener = useRef<HTMLButtonElement>(null);
  /** Set by a handler that changes mode; the effect below moves focus once the new mode has rendered (R-13). */
  const focusNext = useRef(false);
  const id = `note-${stageId}`;
  const path = `/components/${componentId}/stages/${stageId}/note`;
  const text = draft.trim();
  // Compared trimmed, as Spring strips the text and refuses a blank one: spaces alone are nothing to save.
  const differs = text !== (note?.text ?? "");
  // The page refreshes after a save without waiting, so for one round trip the note just saved still differs from the
  // page's: that moment is "saved", not "not saved". It remembers what was sent, so typing anything else is unsaved again.
  const justSaved = savedAs === text;
  const dirty = differs && !justSaved;
  const removing = text === "" && note !== null;
  // What students see now: the note just saved, until the page has caught up with it.
  const shown = savedAs ?? note?.text ?? "";
  const [editing, setEditing] = useState(dirty);
  // Once the page has caught up a removed note is gone, `differs` is false and `note` is null: `justSaved` is what still
  // knows it was removed, so the line keeps saying so instead of going blank.
  const status = dirty
    ? "Not saved yet"
    : differs
      ? (text ? "Saved just now" : "Note removed")
      : note
        ? `Saved ${formatCalendarDate(note.updatedOn)}`
        : justSaved ? "Note removed" : "";

  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    (editing ? box.current : opener.current)?.focus();
  }, [editing]);

  function toMode(next: boolean) {
    focusNext.current = true;
    setEditing(next);
  }

  function cancel() {
    setError(null);
    onDraft(shown);
    toMode(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // The trimmed text is what's sent: Java's strip and JavaScript's trim drop different characters (a pasted
      // non-breaking space), so the raw box could store text the form then never matches.
      if (removing) await api.sendNoContent("DELETE", path);
      else await api.send("PUT", path, { text }, noteSchema);
      setSavedAs(text);
      // The server drops whitespace either side; match it so the saved note and the draft agree after the refresh.
      onDraft(text);
      toMode(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="rounded-app-card border border-app-note-line bg-app-note-ground px-[18px] pt-2 pb-4">
      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-2">
          <label id={`${id}-heading`} htmlFor={id} className={`flex min-h-11 items-center ${heading}`}>Your note for students</label>
          <p id={`${id}-help`} className="text-app-help text-app-note-muted">Shown to students above the guidelines. Web links become clickable.</p>
          <Textarea
            id={id}
            ref={box}
            rows={5}
            value={draft}
            readOnly={busy}
            maxLength={NOTE_MAX}
            aria-describedby={`${id}-help ${id}-count`}
            onChange={(event) => onDraft(event.target.value)}
            className="border-2 border-app-accent bg-app-surface"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p id={`${id}-count`} className="text-app-help text-app-note-muted tabular-nums">
              {`${draft.length.toLocaleString("en-IE")} / ${NOTE_MAX.toLocaleString("en-IE")}`}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="header" disabled={busy} onClick={cancel}>
                Cancel
              </Button>
              <Button type="submit" size="header" disabled={busy || !dirty}>
                {busy ? (removing ? "Removing…" : "Saving…") : removing ? "Remove note" : "Save note"}
              </Button>
            </div>
          </div>
          {error && <ErrorPanel error={error} focus />}
        </form>
      ) : shown ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <h3 id={`${id}-heading`} className={heading}>Your note for students</h3>
            <Button ref={opener} type="button" variant="ghost" size="header" aria-label="Edit your note" onClick={() => toMode(true)} className="-mr-2 text-app-accent">
              <Pencil aria-hidden="true" />
              Edit
            </Button>
          </div>
          <NoteText text={shown} />
        </>
      ) : (
        <>
          <h3 id={`${id}-heading`} className={`flex min-h-11 items-center ${heading}`}>Your note for students</h3>
          <p className="mb-3 text-app-small text-app-note-muted">Students only see the guidelines for this stage.</p>
          <Button ref={opener} type="button" variant="outline" size="header" onClick={() => toMode(true)} className="border-app-accent text-app-accent">
            <Plus aria-hidden="true" />
            Add a note
          </Button>
        </>
      )}
      <p className="mt-2.5 text-app-help text-app-note-muted">
        {!editing && shown && "How students see it · "}
        {/* Always rendered, so the change of text is announced. */}
        <span role="status">{status}</span>
      </p>
    </section>
  );
}
