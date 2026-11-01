"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api/client";
import { noteSchema, type StageNote } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { NOTE_MAX } from "@/lib/app/note-text";

import { ErrorPanel } from "./error-panel";
import { NoteText } from "./note-text";
import { eyebrow } from "./styles";

/**
 * The teacher's note on one stage (plan stage-sheet S-8, S-9, S-22). The draft lives in the page (S-21), so closing
 * the sheet doesn't lose it. The preview shows exactly what students will see, links included.
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

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (removing) await api.sendNoContent("DELETE", path);
      else await api.send("PUT", path, { text: draft }, noteSchema);
      setSavedAs(text);
      // The server drops whitespace either side; match it so the saved note and the draft agree after the refresh.
      onDraft(text);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <label htmlFor={id} className={`${eyebrow} text-app-muted`}>Your note for students</label>
      <p id={`${id}-help`} className="text-app-small text-app-grey">Shown to students above the guidelines. Web links become clickable.</p>
      <Textarea
        id={id}
        rows={4}
        value={draft}
        maxLength={NOTE_MAX}
        aria-describedby={`${id}-help ${id}-count`}
        onChange={(event) => onDraft(event.target.value)}
      />
      <p id={`${id}-count`} className="text-right text-app-meta text-app-muted tabular-nums">
        {`${draft.length.toLocaleString("en-IE")} / ${NOTE_MAX.toLocaleString("en-IE")}`}
      </p>
      {text && (
        <div className="flex flex-col gap-1 rounded-app-inner bg-app-inset px-3 py-2.5">
          <p className={`${eyebrow} text-app-muted`}>How students see it</p>
          <NoteText text={text} />
        </div>
      )}
      {error && <ErrorPanel error={error} focus />}
      <div className="flex items-center justify-between gap-3">
        <p role="status" className="text-app-small text-app-muted">
          {dirty ? "Not saved yet" : differs ? "Saved just now" : note ? `Saved ${formatCalendarDate(note.updatedOn)}` : ""}
        </p>
        <Button type="submit" variant="outline" size="header" disabled={busy || !dirty}>
          {busy ? "Saving…" : removing ? "Remove note" : "Save note"}
        </Button>
      </div>
    </form>
  );
}
