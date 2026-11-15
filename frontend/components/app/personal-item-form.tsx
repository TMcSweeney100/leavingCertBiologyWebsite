"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, ApiError } from "@/lib/api/client";
import { KINDS } from "@/lib/app/personal-kind";
import { type PersonalKind, personalItemSchema } from "@/lib/api/schemas";
import { dateShortcuts } from "@/lib/app/timeline";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { eyebrow } from "./styles";

export type ClassOption = { classId: string; className: string; subjectName: string };
export type Draft = { title: string; dueDate: string; kind: PersonalKind; classId: string | null };

// The size goes through `cn()` inside ToggleGroupItem beside a text colour, so it is written as `length:` (UI-STANDARDS §2).
const KIND_BUTTON = "flex-1 justify-center rounded-app-control text-[length:var(--text-app-meta)]";

/**
 * The body of the add and edit drawer (plan 2F P2-50; plan timeline-redesign T-5, T-9). Kind is four buttons and
 * the date has three shortcuts, so a test tomorrow is a title and two taps. Delete lives here when editing.
 */
export function PersonalItemForm({
  itemId,
  initial,
  classes,
  today,
  onDone,
}: {
  itemId?: string;
  initial?: Draft;
  classes: ClassOption[];
  today: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial ?? { title: "", dueDate: "", kind: "OTHER", classId: null });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const id = itemId ?? "new";

  async function run(request: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await request();
      onDone();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(() => (itemId ? api.send("PATCH", `/me/personal-items/${itemId}`, draft, personalItemSchema) : api.send("POST", "/me/personal-items", draft, personalItemSchema)));
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-app-tray px-4 py-5 sm:px-6">
        {error && <ErrorPanel error={error} focus />}
        <FieldGroup>
          <Field id={`pi-title-${id}`} label="Title">
            {(c) => <input {...c} required maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />}
          </Field>
        </FieldGroup>

        <div className="flex flex-col gap-2">
          <p id={`pi-kind-${id}`} className={`${eyebrow} text-app-muted`}>Kind</p>
          <ToggleGroup aria-labelledby={`pi-kind-${id}`} value={[draft.kind]} onValueChange={(v) => { if (v[0]) setDraft({ ...draft, kind: v[0] as PersonalKind }); }} className="gap-2">
            {KINDS.map((k) => <ToggleGroupItem key={k.value} value={k.value} className={KIND_BUTTON}>{k.label}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-2">
          <FieldGroup>
            <Field id={`pi-date-${id}`} label="Date">
              {(c) => <input {...c} type="date" required value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />}
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            {dateShortcuts(today).map((s) => (
              <Button key={s.label} type="button" variant="outline" aria-pressed={draft.dueDate === s.date}
                className="rounded-full aria-pressed:border-app-pick aria-pressed:bg-app-pick-tint aria-pressed:text-app-ink"
                onClick={() => setDraft({ ...draft, dueDate: s.date })}>
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        <FieldGroup>
          <Field id={`pi-class-${id}`} label="Class (optional)">
            {(c) => (
              <select {...c} value={draft.classId ?? ""} onChange={(e) => setDraft({ ...draft, classId: e.target.value || null })}>
                <option value="">No class</option>
                {classes.map((k) => <option key={k.classId} value={k.classId}>{`${k.subjectName} · ${k.className}`}</option>)}
              </select>
            )}
          </Field>
        </FieldGroup>

        {itemId && (
          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-app-line pt-4">
            {confirming ? (
              <>
                <span className="text-app-small text-app-copy">Delete this item?</span>
                <Button type="button" variant="destructive" disabled={busy} onClick={() => void run(() => api.sendNoContent("DELETE", `/me/personal-items/${itemId}`))}>Delete item</Button>
                <Button type="button" variant="outline" onClick={() => setConfirming(false)}>Keep</Button>
              </>
            ) : (
              <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>Delete this item</Button>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-app-line bg-app-surface px-4 py-4 sm:px-6">
        <Button type="submit" className="flex-1" disabled={busy}>{busy ? "Saving…" : "Save item"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
