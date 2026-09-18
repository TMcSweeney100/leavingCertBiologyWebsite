"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { teacherItemSchema } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";

type Stage = { id: string; label: string | null; name: string; items: { id: string; text: string; dueDate: string | null }[] };

/** A stage's teacher items: add, edit, retire (confirmed in the row, as D-2's Remove). */
export function TeacherItems({ componentId, stage }: { componentId: string; stage: Stage }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [retiring, setRetiring] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const stageLabel = stage.label ?? stage.name;
  const base = `/components/${componentId}/teacher-items`;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setEditing(null);
      setRetiring(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  function open(item?: { id: string; text: string; dueDate: string | null }) {
    setEditing(item?.id ?? "new");
    setText(item?.text ?? "");
    setDueDate(item?.dueDate ?? "");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = { text, dueDate: dueDate || null };
    void run(() =>
      editing === "new"
        ? api.send("POST", base, { stageId: stage.id, ...body }, teacherItemSchema)
        : api.send("PATCH", `${base}/${editing}`, body, teacherItemSchema),
    );
  }

  const form = (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <FieldGroup>
        <Field id={`item-text-${stage.id}`} label="Item">
          {(control) => <input {...control} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />}
        </Field>
        <Field id={`item-date-${stage.id}`} label="Date (optional)">
          {(control) => <input {...control} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="header" disabled={busy}>
          {editing === "new" ? "Add item" : "Save item"}
        </Button>
        <Button type="button" variant="outline" size="header" onClick={() => setEditing(null)}>
          Cancel
        </Button>
      </div>
    </form>
  );

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold text-app-ink">{stageLabel}</h3>
      {error && <ErrorPanel error={error} />}
      {stage.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {stage.items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 border-b border-app-line pb-2">
              {editing === item.id ? (
                form
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-app-ink">{item.text}</span>
                  {item.dueDate && <span className="text-app-small text-app-grey">{formatCalendarDate(item.dueDate)}</span>}
                  <Button type="button" variant="outline" size="header" onClick={() => open(item)} aria-label={`Edit ${item.text}`}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="header"
                    onClick={() => setRetiring(item.id)}
                    aria-label={`Retire ${item.text}`}
                  >
                    Retire
                  </Button>
                </div>
              )}
              {retiring === item.id && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-app-small text-app-copy">{"Retire this item? Students won't see it any more."}</span>
                  <Button
                    type="button"
                    variant="confirmDestructive"
                    size="header"
                    disabled={busy}
                    onClick={() => run(() => api.sendNoContent("DELETE", `${base}/${item.id}`))}
                  >
                    Retire item
                  </Button>
                  <Button type="button" variant="outline" size="header" onClick={() => setRetiring(null)}>
                    Keep
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing === "new" ? (
        form
      ) : (
        <div>
          <Button type="button" variant="outline" size="header" onClick={() => open()} aria-label={`Add item to ${stageLabel}`}>
            Add item
          </Button>
        </div>
      )}
    </div>
  );
}
