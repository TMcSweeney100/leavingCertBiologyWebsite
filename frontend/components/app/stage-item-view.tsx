"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, type RefObject, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type ProgressGrid, teacherItemSchema } from "@/lib/api/schemas";
import type { Attempt } from "@/lib/app/attempt";
import { type LetteredItem, type StageLike, weekdayDate } from "@/lib/app/component-setup";
import { studentCount } from "@/lib/app/progress";
import { ADD_ITEM, type DateRequest, type TickLists, tickLists } from "@/lib/app/stage-sheet";

import { DateBox } from "./date-box";
import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { card } from "./styles";

/**
 * One item in the stage sheet (plan stage-drawer-redesign R-5, R-14): a view that takes the sheet's place, like the
 * calendar view, with "‹ Back to Stage N". At rest it shows who has ticked the item; Edit adds the form above that. A
 * new item opens straight on the form. `onBack` tells the sheet where focus goes next: the item's row (its id), or "Add
 * an item" (`ADD_ITEM`) after a new item is saved or an item is retired (S-31).
 */
export function StageItemView({ componentId, stage, item, progress, chooseDate, heading, onBack }: {
  componentId: string;
  stage: StageLike;
  /** The item, or null for a new one. */
  item: LetteredItem | null;
  progress: Attempt<ProgressGrid>;
  chooseDate: (request: DateRequest) => void;
  /** The view's title; the sheet focuses it when the view opens. */
  heading: RefObject<HTMLHeadingElement | null>;
  onBack: (focus: string) => void;
}) {
  const router = useRouter();
  const id = useId();
  const textField = useRef<HTMLInputElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  /** Set by a handler that changes mode; the effect below moves focus once the new mode has rendered. */
  const focusNext = useRef(false);
  const [editing, setEditing] = useState(item === null);
  const [text, setText] = useState(item?.text ?? "");
  const [dueDate, setDueDate] = useState(item?.dueDate ?? "");
  const [retiring, setRetiring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const label = stage.label ?? stage.name;
  const base = `/components/${componentId}/teacher-items`;
  const where = item ? `Item ${item.letter} · ${label}` : `New item · ${label}`;
  // While editing, the title is the saved one; once saved, what was sent, until the page has caught up.
  const title = item ? (editing ? item.text : text) : "New item";
  const lists = item && progress.ok ? tickLists(progress.data, item.id) : null;

  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    (editing ? textField.current : editButton.current)?.focus();
  }, [editing]);

  function toMode(next: boolean) {
    focusNext.current = true;
    setEditing(next);
  }

  async function run(action: () => Promise<unknown>, after: "back" | "stay") {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
      if (after === "back") onBack(ADD_ITEM);
      else {
        setRetiring(false);
        toMode(false);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = { text, dueDate: dueDate || null };
    void run(
      () => (item ? api.send("PATCH", `${base}/${item.id}`, body, teacherItemSchema) : api.send("POST", base, { stageId: stage.id, ...body }, teacherItemSchema)),
      item ? "stay" : "back",
    );
  }

  function cancel() {
    if (!item) return onBack(ADD_ITEM);
    setText(item.text);
    setDueDate(item.dueDate ?? "");
    setRetiring(false);
    setError(null);
    toMode(false);
  }

  return (
    <div role="group" aria-labelledby={`${id}-title`} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-app-line bg-app-surface px-4 pt-2 pb-3.5">
        <Button type="button" variant="link" size="header" onClick={() => onBack(item?.id ?? ADD_ITEM)} className="-ml-1.5">
          <span aria-hidden="true">‹ </span>
          Back to {label}
        </Button>
        <div className="mt-1 flex items-start gap-3">
          {item && (
            <span
              aria-hidden="true"
              className={`flex size-11 flex-none items-center justify-center rounded-full font-mono text-app-lead font-bold ${
                item.dueDate ? "bg-app-accent text-app-on-accent" : "border-2 border-dashed border-app-disabled text-app-muted"
              }`}
            >
              {item.letter}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-app-help text-app-muted">{where}</p>
            <h3 id={`${id}-title`} ref={heading} tabIndex={-1} className="font-heading text-app-title font-bold break-words text-app-ink">
              {title}
            </h3>
          </div>
        </div>
        {item && !editing && (
          <div className="mt-1 -mb-2 flex items-center justify-between gap-3 pl-14">
            <p className="text-app-small text-app-copy">
              {dueDate ? (
                <>
                  Due <b className="font-semibold text-app-ink">{weekdayDate(dueDate)}</b>
                </>
              ) : (
                "No date, so not on the line or the calendar"
              )}
            </p>
            <Button ref={editButton} type="button" variant="ghost" size="header" aria-label="Edit this item" onClick={() => toMode(true)} className="-mr-2 text-app-accent">
              <Pencil aria-hidden="true" />
              Edit
            </Button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-app-tray p-3">
        {error && <ErrorPanel error={error} focus />}

        {editing && (
          <form onSubmit={submit} className="flex flex-col gap-3 rounded-app-card border-2 border-app-accent bg-app-surface px-[18px] py-4">
            {item && <h4 className="font-heading text-app-base font-bold text-app-ink">Edit item</h4>}
            <FieldGroup>
              <Field id={`${id}-text`} label="Item">
                {(control) => <input {...control} ref={textField} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />}
              </Field>
              <Field id={`${id}-date`} label="Date (optional)" help="Letters follow the date, so they change when a date does. An item with no date keeps a letter, but stays off the line and the calendar.">
                {(control) => (
                  <DateBox
                    opener={{
                      onClick: (event) =>
                        chooseDate({
                          title: text.trim() ? `Choose the date for “${text.trim()}”` : "Choose the date for the new item",
                          eyebrow: where,
                          help: "Nothing is saved until you press Save item.",
                          picking: { kind: "item" },
                          value: dueDate,
                          onPick: setDueDate,
                          from: event.currentTarget,
                        }),
                    }}
                    id={control.id}
                    value={dueDate}
                    describedBy={`${control["aria-describedby"] ?? ""} ${control.id}-value`.trim()}
                    className={`${control.className} cursor-pointer`}
                  />
                )}
              </Field>
            </FieldGroup>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="header" disabled={busy || !text.trim()}>
                {busy ? "Saving…" : "Save item"}
              </Button>
              <Button type="button" variant="outline" size="header" onClick={cancel}>
                Cancel
              </Button>
              {item && (
                <Button
                  type="button"
                  variant="link"
                  size="header"
                  onClick={() => setRetiring(true)}
                  aria-label={`Retire ${item.text}`}
                  className="ml-auto text-app-error-hover hover:text-app-error-hover"
                >
                  Retire
                </Button>
              )}
            </div>
            {item && retiring && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-app-small text-app-copy">{"Retire this item? Students won't see it any more."}</span>
                <Button
                  type="button"
                  variant="confirmDestructive"
                  size="header"
                  disabled={busy}
                  onClick={() => void run(() => api.sendNoContent("DELETE", `${base}/${item.id}`), "back")}
                >
                  Retire item
                </Button>
                <Button type="button" variant="outline" size="header" onClick={() => setRetiring(false)}>
                  Keep
                </Button>
              </div>
            )}
          </form>
        )}

        {item && (lists ? (
          <TickNames lists={lists} id={id} />
        ) : (
          <p className="px-1 text-app-small text-app-muted">{"Couldn't load the class's progress, so who has ticked this isn't shown."}</p>
        ))}
      </div>
    </div>
  );
}

/** Who has and hasn't ticked one item (S-28). Students tick these themselves; the words say so. */
function TickNames({ lists, id }: { lists: TickLists; id: string }) {
  const total = lists.ticked.length + lists.notYet.length;
  const group = (key: string, heading: ReactNode, names: string[], done: boolean) => (
    <div className="flex flex-col gap-1.5">
      <h5 id={`${id}-${key}`} className={`text-app-help font-bold ${done ? "text-app-approved" : "text-app-ink"}`}>{heading}</h5>
      {names.length === 0 ? (
        <p className="text-app-small text-app-muted">Nobody.</p>
      ) : (
        <ul aria-labelledby={`${id}-${key}`} className="flex flex-wrap gap-1.5">
          {/* Two students can share a full name, so the index keeps the keys apart. */}
          {names.map((name, i) => (
            <li
              key={`${i}-${name}`}
              data-private
              className={`rounded-full px-2.5 py-0.5 text-app-help ${done ? "bg-app-approved-tint font-semibold text-app-approved" : "bg-app-inset text-app-copy"}`}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <section aria-labelledby={`${id}-ticks`} className={`${card} flex flex-col gap-3 px-[18px] py-4`}>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h4 id={`${id}-ticks`} className="font-heading text-app-base font-bold text-app-ink">Who has ticked it</h4>
          <span data-private className="text-app-help text-app-muted">{studentCount(total)}</span>
        </div>
        <p className="text-app-help text-app-grey">Students tick these themselves.</p>
        {total > 0 && (
          <div role="img" aria-label={`${lists.ticked.length} of ${studentCount(total)} ticked`} data-private className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
            {lists.ticked.length > 0 && <span className="bg-app-approved" style={{ flexGrow: lists.ticked.length }} />}
            {lists.notYet.length > 0 && <span className="bg-app-field-border" style={{ flexGrow: lists.notYet.length }} />}
          </div>
        )}
      </div>
      {group("done", <>Ticked (<span data-private>{lists.ticked.length}</span>)</>, lists.ticked, true)}
      {group("not", <>Not ticked yet (<span data-private>{lists.notYet.length}</span>)</>, lists.notYet, false)}
    </section>
  );
}
