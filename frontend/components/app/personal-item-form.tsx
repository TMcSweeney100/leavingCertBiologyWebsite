"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { KINDS } from "@/lib/app/personal-kind";
import { type PersonalKind, personalItemSchema } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";

export type ClassOption = { classId: string; className: string; subjectName: string };
type Draft = { title: string; dueDate: string; kind: PersonalKind; classId: string | null };

/** Add or edit one of the student's own items (plan 2F P2-50). Private by design, and it says so. */
export function PersonalItemForm({
  itemId,
  initial,
  classes,
  onDone,
}: {
  itemId?: string;
  initial?: Draft;
  classes: ClassOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial ?? { title: "", dueDate: "", kind: "OTHER", classId: null });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const id = itemId ?? "new";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (itemId) await api.send("PATCH", `/me/personal-items/${itemId}`, draft, personalItemSchema);
      else await api.send("POST", "/me/personal-items", draft, personalItemSchema);
      onDone();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-app-small text-app-grey">{"Only you can see this. Your teachers can't."}</p>
      {error && <ErrorPanel error={error} />}
      <FieldGroup>
        <Field id={`pi-title-${id}`} label="Title">
          {(c) => <input {...c} required maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />}
        </Field>
        <Field id={`pi-date-${id}`} label="Date">
          {(c) => <input {...c} type="date" required value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />}
        </Field>
        <Field id={`pi-kind-${id}`} label="Kind">
          {(c) => (
            <select {...c} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as PersonalKind })}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          )}
        </Field>
        <Field id={`pi-class-${id}`} label="Class (optional)">
          {(c) => (
            <select {...c} value={draft.classId ?? ""} onChange={(e) => setDraft({ ...draft, classId: e.target.value || null })}>
              <option value="">No class</option>
              {classes.map((k) => <option key={k.classId} value={k.classId}>{`${k.subjectName} · ${k.className}`}</option>)}
            </select>
          )}
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>Save item</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function AddPersonalItem({ classes }: { classes: ClassOption[] }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <PersonalItemForm classes={classes} onDone={() => setOpen(false)} />
  ) : (
    <div>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>Add my own item</Button>
    </div>
  );
}
