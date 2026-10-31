"use client";

import { type MouseEvent, type ReactNode, type RefObject, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { weekdayDate } from "@/lib/app/component-setup";
import { calendarMonths, type DateMark, type Picking, pickReadout, runStart } from "@/lib/app/date-marks";
import { parseTypedDate, typedDate, typedFromInput } from "@/lib/app/typed-date";

import { DateCalendar } from "./date-calendar";
import { MarkTag } from "./mark-tag";
import { YearLine } from "./year-line";

/** What the caller spreads onto its date button so that it opens the drawer. */
export type DateBoxOpener = {
  ref: RefObject<HTMLButtonElement | null>;
  "aria-haspopup": "dialog";
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

const monthOf = (iso: string) => `${iso.slice(0, 7)}-01`;
const DAY_MONTH = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * The right-hand calendar drawer (plan date-picker-drawer, Parts 2 and 3; pack D-11), opened by the caller's own date
 * button: nothing is typed on the page (C-35). A tap on a day, or a date typed into the footer's "Type a date" field
 * (C-37), selects it and the footer says how it sits against the stages either side (C-22, C-31). Only `Use this
 * date` (or Enter in the field) and `Clear date` hand anything back, through `onPick` ("" clears). Nothing saves
 * (C-5). Focus goes back to the button on close.
 */
export function DatePickerDrawer({
  children,
  title,
  eyebrow,
  help,
  picking,
  value,
  marks,
  completionDate,
  today,
  onPick,
}: {
  /** Renders the date box, spreading `opener` onto it. */
  children: (opener: DateBoxOpener) => ReactNode;
  /** Names the dialog, e.g. "Choose the Stage 4 date" (C-15). */
  title: string;
  /** Above the title: the stage's tag and name, or "New item · Stage 6" (C-32). */
  eyebrow: ReactNode;
  /** "Nothing is saved until you press Save dates." */
  help: string;
  picking: Picking;
  value: string;
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  /** The day from `Use this date`, or "" from `Clear date`. */
  onPick: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // The drawer's own state (C-22): the day tapped, the month in view, a day refused. Reset on every open.
  const [selected, setSelected] = useState(value);
  const [month, setMonth] = useState(monthOf(value || today));
  const [refused, setRefused] = useState<string | null>(null);
  // What's in the "Type a date" field; "I left the field" is what lets it say a half-typed date isn't one (C-39).
  const [typed, setTyped] = useState(typedDate(value));
  const [typedLeft, setTypedLeft] = useState(false);
  const days = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLButtonElement>(null);
  const typedId = useId();
  const typedNoteId = `${typedId}-note`;

  const show = (next: boolean) => {
    if (next) {
      setSelected(value);
      setMonth(monthOf(value || today));
      setRefused(null);
      setTyped(typedDate(value));
      setTypedLeft(false);
    }
    setOpen(next);
  };
  const choose = (iso: string) => {
    setSelected(iso);
    setTyped(typedDate(iso));
    setTypedLeft(false);
    setRefused(null);
  };
  // C-37, C-38: a complete real date on or before the completion date is the pick; anything else leaves no pick.
  const typeInto = (raw: string) => {
    const next = typedFromInput(raw);
    const iso = parseTypedDate(next);
    setTyped(next);
    setTypedLeft(false);
    if (iso && iso <= completionDate) {
      setSelected(iso);
      setMonth(monthOf(iso));
      setRefused(null);
    } else {
      setSelected("");
      setRefused(iso);
    }
  };
  const finish = (iso: string) => {
    onPick(iso);
    setOpen(false);
  };
  const opener: DateBoxOpener = {
    ref: box,
    "aria-haspopup": "dialog",
    onClick: () => show(true),
  };
  // C-12: the chosen day, else today.
  const focusDay = () =>
    days.current?.querySelector<HTMLElement>('button[data-selected-single="true"]') ??
    days.current?.querySelector<HTMLElement>('[data-today="true"] button') ??
    true;

  // The month in view is in the range too, so a typed date far from the others can still be arrowed away from.
  const range = calendarMonths([value, selected, month, ...marks.map((m) => m.iso)].filter(Boolean), today, completionDate);
  const runFrom = runStart(marks, picking, selected);
  const readout = selected ? pickReadout(marks, picking, selected, completionDate) : null;
  const run = readout?.gaps.find((g) => g.run);
  const notADate = typedLeft && typed !== "" && parseTypedDate(typed) === null;
  const pinLabel = selected ? `${picking.kind === "stage" ? `S${picking.ordinal} ` : ""}${DAY_MONTH.format(Date.parse(selected))}` : "";

  return (
    <Drawer swipeDirection="right" open={open} onOpenChange={show}>
      {children(opener)}
      <DrawerContent initialFocus={focusDay} finalFocus={box}>
        <div className="flex items-start justify-between gap-3 border-b border-app-line px-4 pt-3 pb-3.5 sm:px-6 sm:pt-[18px] sm:pb-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="flex items-center gap-1.5 text-app-small text-app-muted">{eyebrow}</p>
            <DrawerTitle className="text-[20px] leading-[1.25] text-balance sm:text-app-section">{title}</DrawerTitle>
            <DrawerDescription className="mt-1 text-app-small text-app-grey">{help}</DrawerDescription>
          </div>
          <DrawerClose render={<Button type="button" variant="outline" />}>Close</DrawerClose>
        </div>

        <div className="border-b border-app-line px-4 pt-3 pb-2 sm:px-6">
          <YearLine
            marks={marks}
            today={today}
            completionDate={completionDate}
            month={month}
            onMonth={setMonth}
            pick={selected && selected <= completionDate ? { iso: selected, label: pinLabel, runFrom, ordinal: picking.kind === "stage" ? picking.ordinal : null } : null}
          />
        </div>

        <div ref={days} className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4 sm:px-6">
          <DateCalendar
            marks={marks}
            completionDate={completionDate}
            today={today}
            selected={selected}
            month={month}
            range={range}
            runFrom={runFrom}
            onMonth={setMonth}
            onSelect={choose}
            onAfterCompletion={setRefused}
          />
          {month === monthOf(completionDate) && (
            <p className="mt-2.5 text-app-small text-app-grey">{`Days after ${weekdayDate(completionDate)} can't be picked. It's the SEC's completion date.`}</p>
          )}
          <ul aria-label="What the marks mean" className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2 border-t border-app-line pt-3 text-app-small text-app-grey">
            <li className="flex items-center gap-1.5"><MarkTag kind="stage">S2</MarkTag>Stage date</li>
            <li className="flex items-center gap-1.5"><MarkTag kind="stage" saved={false}>S2</MarkTag>Not saved yet</li>
            <li className="flex items-center gap-1.5"><MarkTag kind="item">A</MarkTag>Your item</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-4 w-[3px] rounded-sm bg-app-accent" />Completion date</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="size-[22px] rounded-full bg-app-today shadow-[inset_0_0_0_1.5px_var(--app-today-ring)]" />Today</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-4 w-[18px] rounded-app-tag bg-app-pick" />Your pick</li>
            {run && (
              <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-4 w-[18px] rounded-app-tag bg-app-pick-tint" />{`Days since ${run.mark.name}`}</li>
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-3 border-t border-app-line px-4 pt-3 pb-4 sm:px-6 sm:pb-[18px]">
          {refused && (
            <p role="status" className="rounded-app-inner bg-app-inset px-2.5 py-2 text-app-small text-app-copy">
              {`${weekdayDate(refused)} is after the completion date, ${weekdayDate(completionDate)}. Nothing can be set after it.`}
            </p>
          )}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <label htmlFor={typedId} className="text-app-small font-semibold whitespace-nowrap text-app-ink">
                Type a date
              </label>
              <Input
                id={typedId}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="dd/mm/yyyy"
                value={typed}
                onChange={(event) => typeInto(event.target.value)}
                onBlur={() => setTypedLeft(true)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  if (selected) finish(selected);
                }}
                aria-invalid={notADate ? true : undefined}
                aria-describedby={notADate ? typedNoteId : undefined}
                className="w-[9.5rem] tabular-nums"
              />
            </div>
            {notADate && (
              <p id={typedNoteId} className="text-app-small text-app-error-hover">
                {"That isn't a date. Type day, month, year, like 16/10/2026."}
              </p>
            )}
          </div>
          <div aria-live="polite" className="flex min-h-[52px] flex-col gap-0.5 text-app-small text-app-copy">
            {selected && readout ? (
              <>
                <p className="flex flex-wrap items-baseline gap-x-2.5">
                  <strong className="font-heading text-app-title font-bold tracking-[-.015em] text-app-pick tabular-nums">{weekdayDate(selected)}</strong>
                  {value === selected ? (
                    <span className="text-app-muted">the date now</span>
                  ) : value ? (
                    <span className="text-app-muted">was <s>{weekdayDate(value)}</s></span>
                  ) : null}
                </p>
                {readout.gaps.length > 0 && (
                  <p className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {readout.gaps.map((g) => (
                      <span key={g.rest} className="inline-flex items-center gap-1.5">
                        <MarkTag kind={g.mark.kind} saved={g.mark.saved}>{g.mark.short}</MarkTag>
                        <span>
                          <b className={`font-semibold ${g.run ? "text-app-pick" : "text-app-ink"}`}>{g.amount}</b> {g.rest}
                        </span>
                      </span>
                    ))}
                  </p>
                )}
                {readout.asks.map((ask) => (
                  <p key={ask} className="text-app-attention">{ask}</p>
                ))}
                {readout.also.length > 0 && <p className="text-app-muted">{`Also on this day: ${readout.also.join(", ")}`}</p>}
              </>
            ) : (
              <>
                <p className="font-heading text-app-title font-bold text-app-ink">No day picked yet</p>
                <p className="text-app-grey">Tap a day to see how it sits against your other dates.</p>
              </>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            {value ? (
              <Button type="button" variant="link" size="header" onClick={() => finish("")}>
                Clear date
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" size="form" disabled={!selected} onClick={() => finish(selected)} className="max-sm:flex-1">
              Use this date
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
