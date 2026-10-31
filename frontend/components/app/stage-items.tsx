"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { teacherItemSchema } from "@/lib/api/schemas";
import { formatCalendarDate, type LetteredItem, type StageLike } from "@/lib/app/component-setup";
import { type DateRequest, stageItems } from "@/lib/app/stage-sheet";

import { DateBox } from "./date-box";
import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { eyebrow } from "./styles";

/** Where focus goes when a form closes on a new or retired item: the "Add an item" button (S-31). */
const ADD = "add";

/**
 * One stage's items, in the stage sheet (plan stage-sheet S-5, S-17): the page's separate item list is gone. Each item
 * opens in place; one at a time. Items save one at a time through their own endpoints, outside the dates' batch.
 * An item's date is chosen in the sheet's own calendar view, through `chooseDate`, never a second drawer (S-4).
 */
export function StageItems({
  componentId,
  stage,
  stages,
  chooseDate,
}: {
  componentId: string;
  stage: StageLike;
  stages: ReadonlyArray<StageLike>;
  chooseDate: (request: DateRequest) => void;
}) {
  const router = useRouter();
  const formId = useId();
  const dateBox = useRef<HTMLButtonElement>(null);
  const section = useRef<HTMLElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<string | null>(null);
  const [open, setOpen] = useState<string | "new" | null>(null);
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [retiring, setRetiring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const items = useMemo(() => stageItems(stages, stage.id), [stages, stage.id]);
  const label = stage.label ?? stage.name;
  const base = `/components/${componentId}/teacher-items`;
  const openItem = items.find((item) => item.id === open);
  // Closing a form removes the button that had focus. An existing item's form hands focus to its own row; a new
  // item's, or a retired one's (its row is gone), to "Add an item" (S-31).
  const ownRow = openItem?.id ?? ADD;

  useEffect(() => {
    if (open !== null || focusNext.current === null) return;
    const target =
      focusNext.current === ADD ? addButton.current : section.current?.querySelector<HTMLElement>(`[data-item="${focusNext.current}"]`);
    focusNext.current = null;
    target?.focus();
  }, [open]);

  function closeForm(focusAfter: string) {
    focusNext.current = focusAfter;
    setOpen(null);
  }

  function start(item?: LetteredItem) {
    setOpen(item?.id ?? "new");
    setText(item?.text ?? "");
    setDueDate(item?.dueDate ?? "");
    setRetiring(false);
    setError(null);
  }

  async function run(action: () => Promise<unknown>, focusAfter: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      closeForm(focusAfter);
      setRetiring(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = { text, dueDate: dueDate || null };
    void run(() =>
      open === "new"
        ? api.send("POST", base, { stageId: stage.id, ...body }, teacherItemSchema)
        : api.send("PATCH", `${base}/${open}`, body, teacherItemSchema),
      ownRow,
    );
  }

  const form = (
    <form onSubmit={submit} className="flex flex-col gap-3 pt-1 pb-3">
      <FieldGroup>
        <Field id={`${formId}-text`} label="Item">
          {(control) => <input {...control} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />}
        </Field>
        <Field id={`${formId}-date`} label="Date (optional)" help="Letters follow the date, so they change when a date does. An item with no date keeps a letter, but stays off the line and the calendar.">
          {(control) => (
            <DateBox
              opener={{
                ref: dateBox,
                onClick: (event) =>
                  chooseDate({
                    title: text.trim() ? `Choose the date for “${text.trim()}”` : "Choose the date for the new item",
                    eyebrow: openItem ? `Item ${openItem.letter} · ${label}` : `New item · ${label}`,
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
        <Button type="button" variant="outline" size="header" onClick={() => closeForm(ownRow)}>
          Cancel
        </Button>
        {openItem && (
          <Button
            type="button"
            variant="link"
            size="header"
            onClick={() => setRetiring(true)}
            aria-label={`Retire ${openItem.text}`}
            className="ml-auto text-app-error-hover hover:text-app-error-hover"
          >
            Retire
          </Button>
        )}
      </div>
      {openItem && retiring && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-app-small text-app-copy">{"Retire this item? Students won't see it any more."}</span>
          <Button
            type="button"
            variant="confirmDestructive"
            size="header"
            disabled={busy}
            onClick={() => void run(() => api.sendNoContent("DELETE", `${base}/${openItem.id}`), ADD)}
          >
            Retire item
          </Button>
          <Button type="button" variant="outline" size="header" onClick={() => setRetiring(false)}>
            Keep
          </Button>
        </div>
      )}
    </form>
  );

  return (
    <section ref={section} aria-labelledby={`${formId}-heading`} className="flex flex-col gap-2">
      <h3 id={`${formId}-heading`} className={`${eyebrow} text-app-muted`}>
        Your items in this stage
      </h3>
      {error && <ErrorPanel error={error} focus />}
      {items.length === 0 && open !== "new" && (
        <p className="text-app-small text-app-muted">No items in this stage yet. Students see your items under the stage and on their timeline.</p>
      )}
      {items.length > 0 && (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id} className="border-t border-app-line first:border-t-0">
              <button
                type="button"
                data-item={item.id}
                aria-expanded={open === item.id}
                onClick={() => (open === item.id ? setOpen(null) : start(item))}
                className="grid w-full grid-cols-[26px_1fr_auto] items-baseline gap-x-2.5 gap-y-0.5 rounded-app-inner py-2.5 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span
                  className={`flex size-[26px] items-center justify-center self-center rounded-full font-mono text-app-help font-bold ${
                    item.dueDate ? "border-2 border-app-accent text-app-accent" : "border-2 border-dashed border-app-disabled text-app-muted"
                  }`}
                >
                  {item.letter}
                </span>{" "}
                <span className="text-app-base font-semibold text-app-ink">{item.text}</span>{" "}
                <span aria-hidden="true" className="font-bold text-app-accent">{open === item.id ? "⌄" : "›"}</span>
                <span className="col-start-2 text-app-small text-app-muted">
                  {item.dueDate ? formatCalendarDate(item.dueDate) : "No date, so not on the line or the calendar"}
                </span>
              </button>
              {open === item.id && form}
            </li>
          ))}
        </ul>
      )}
      {open === "new" ? (
        form
      ) : (
        <div>
          <Button ref={addButton} type="button" variant="link" size="header" onClick={() => start()} className="-ml-1.5">
            {`Add an item to ${label}`}
          </Button>
        </div>
      )}
    </section>
  );
}
