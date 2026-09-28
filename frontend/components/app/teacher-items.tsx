"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { teacherItemSchema } from "@/lib/api/schemas";
import { formatCalendarDate, letteredItems, type StageLike } from "@/lib/app/component-setup";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { lead, sectionTitle } from "./styles";

/**
 * The teacher's own items for the whole component (pack D-5). One flat list, lettered by date — not a
 * list per stage, as the working-first build had it — because the letters are what the student sees on
 * the line and on their timeline, and they only make sense across the component.
 *
 * Items save one at a time, matching their endpoints: they are outside the stage-dates batch.
 */
export function TeacherItems({ componentId, stages }: { componentId: string; stages: ReadonlyArray<StageLike> }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [retiring, setRetiring] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const items = useMemo(() => letteredItems(stages), [stages]);
  const base = `/components/${componentId}/teacher-items`;

  async function run(action: () => Promise<unknown>, after: () => void) {
    setBusy(true);
    setError(null);
    try {
      await action();
      after();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  function open(item?: { id: string; text: string; dueDate: string | null; stageId: string }) {
    setEditing(item?.id ?? "new");
    setText(item?.text ?? "");
    setDueDate(item?.dueDate ?? "");
    setStageId(item?.stageId ?? stages[0]?.id ?? "");
    setRetiring(null);
    setError(null);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = { text, dueDate: dueDate || null };
    void run(
      () =>
        editing === "new"
          ? api.send("POST", base, { stageId, ...body }, teacherItemSchema)
          : api.send("PATCH", `${base}/${editing}`, body, teacherItemSchema),
      () => setEditing(null),
    );
  }

  const form = (
    <form onSubmit={submit} className="flex max-w-[620px] flex-col gap-3">
      <FieldGroup>
        <Field id="item-text" label="Item">
          {(control) => <input {...control} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />}
        </Field>
        {/* The stage is only chosen when the item is created: PATCH doesn't move an item between stages. */}
        {editing === "new" && (
          <Field id="item-stage" label="Stage" help="Students see the item under this stage.">
            {(control) => (
              <select {...control} value={stageId} onChange={(e) => setStageId(e.target.value)}>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label ? `${s.label} — ${s.name}` : s.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <Field id="item-date" label="Date (optional)" help="An item with no date keeps a letter, but stays off the line and the calendar.">
          {(control) => <input {...control} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="header" disabled={busy || !text.trim()}>
          {busy ? "Saving…" : "Save item"}
        </Button>
        <Button type="button" variant="outline" size="header" onClick={() => setEditing(null)}>
          Cancel
        </Button>
      </div>
    </form>
  );

  return (
    <section aria-labelledby="items-heading" className="mt-8 flex flex-col gap-3.5">
      <h2 id="items-heading" className={sectionTitle}>
        Your items
      </h2>
      <p className={`max-w-[620px] ${lead}`}>
        {"Your own to-dos, attached to a stage. Students see them on their component page and their timeline. Letters follow the date, so they change when a date does."}
      </p>
      {error && <ErrorPanel error={error} focus />}

      {items.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2.5 rounded-app-card border border-app-field-border bg-app-surface px-4 py-3.5">
              {editing === item.id ? (
                form
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex size-[26px] flex-none items-center justify-center rounded-full font-mono text-app-help font-bold ${
                      item.dueDate ? "border-2 border-app-accent text-app-accent" : "border-2 border-dashed border-app-disabled text-app-muted"
                    }`}
                  >
                    {item.letter}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-app-base text-app-ink">{item.text}</p>
                    <p className="text-app-small text-app-muted">
                      {item.dueDate
                        ? `${item.stageLabel} · ${formatCalendarDate(item.dueDate)}`
                        : `${item.stageLabel} · no date, so not on the line or the calendar`}
                    </p>
                  </div>
                  <div className="flex flex-none gap-2">
                    <Button type="button" variant="outline" size="header" onClick={() => open(item)} aria-label={`Edit ${item.text}`}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="header"
                      onClick={() => setRetiring(item.id)}
                      aria-label={`Retire ${item.text}`}
                      className="border-app-error/40 text-app-error-hover hover:bg-app-error-tint"
                    >
                      Retire
                    </Button>
                  </div>
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
                    onClick={() =>
                      run(
                        () => api.sendNoContent("DELETE", `${base}/${item.id}`),
                        () => {
                          setRetiring(null);
                          if (editing === item.id) setEditing(null);
                        },
                      )
                    }
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
          <Button type="button" variant="outline" size="header" onClick={() => open()} disabled={stages.length === 0}>
            Add item
          </Button>
        </div>
      )}
    </section>
  );
}
