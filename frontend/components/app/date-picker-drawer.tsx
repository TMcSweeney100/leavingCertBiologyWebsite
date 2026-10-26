"use client";

import { type KeyboardEvent, type MouseEvent, type ReactNode, type RefObject, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { formatCalendarDate } from "@/lib/app/component-setup";
import type { DateMark } from "@/lib/app/date-marks";

import { DateCalendar, MarkTag } from "./date-calendar";

/** What the caller spreads onto its date box so that box opens the drawer. */
export type DateBoxOpener = {
  ref: RefObject<HTMLInputElement | null>;
  "aria-haspopup": "dialog";
  onMouseDown: (event: MouseEvent<HTMLInputElement>) => void;
  onClick: (event: MouseEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

/**
 * The right-hand calendar drawer (plan date-picker-drawer), opened by the caller's own date box: a click
 * opens it, and so does Alt+Down, the usual key for a field's popup. Typing into the box from the keyboard
 * still works and opens nothing. Picking a day fills the box through `onPick` and closes; nothing saves
 * (C-5). Focus goes back to the box on close.
 */
export function DatePickerDrawer({
  children,
  title,
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
  value: string;
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  onPick: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const days = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLInputElement>(null);
  const opener: DateBoxOpener = {
    ref: box,
    "aria-haspopup": "dialog",
    // Stop the click focusing the box: on a phone, focus is what opens the browser's own date wheel.
    onMouseDown: (event) => event.preventDefault(),
    onClick: (event) => {
      event.preventDefault();
      setOpen(true);
    },
    onKeyDown: (event) => {
      if (event.altKey && event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
      }
    },
  };
  // C-12: the chosen day, else today, so the column opens scrolled to the month that matters.
  const focusDay = () =>
    days.current?.querySelector<HTMLElement>('button[data-selected-single="true"]') ??
    days.current?.querySelector<HTMLElement>('[data-today="true"] button') ??
    true;

  return (
    <Drawer swipeDirection="right" open={open} onOpenChange={setOpen}>
      {children(opener)}
      <DrawerContent initialFocus={focusDay} finalFocus={box}>
        <div className="flex items-start justify-between gap-3 border-b border-app-line px-4 pt-3 pb-4 sm:px-6 sm:pt-[18px]">
          <div className="flex min-w-0 flex-col gap-1">
            <DrawerTitle className="text-[20px] leading-[1.25] text-balance sm:text-app-section">{title}</DrawerTitle>
            <DrawerDescription className="text-app-small text-app-muted">
              {`Picking a day fills in the date. Nothing is saved until you press Save. Nothing can be set after the completion date, ${formatCalendarDate(completionDate)}.`}
            </DrawerDescription>
          </div>
          <DrawerClose render={<Button type="button" variant="outline" />}>Close</DrawerClose>
        </div>
        <ul aria-label="What the marks mean" className="flex flex-wrap gap-x-4 gap-y-1.5 border-b border-app-line px-4 py-2.5 text-app-small text-app-muted sm:px-6">
          <li className="flex items-center gap-1.5"><MarkTag kind="stage" saved>S2</MarkTag> a stage date</li>
          <li className="flex items-center gap-1.5"><MarkTag kind="stage" saved={false}>S2</MarkTag> not saved yet</li>
          <li className="flex items-center gap-1.5"><MarkTag kind="item" saved>A</MarkTag> your item</li>
          <li className="flex items-center gap-1.5"><MarkTag kind="completion" saved>End</MarkTag> completion date</li>
        </ul>
        <div ref={days} className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-7 sm:px-6">
          <DateCalendar
            value={value}
            marks={marks}
            completionDate={completionDate}
            today={today}
            onPick={(iso) => {
              onPick(iso);
              setOpen(false);
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
