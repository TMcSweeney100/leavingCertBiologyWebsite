"use client";

import { type MouseEvent, type ReactNode, type RefObject, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import type { DateMark, Picking } from "@/lib/app/date-marks";

import { DatePickerPanel, pickedDay } from "./date-picker-panel";

/** What the caller spreads onto its date button so that it opens the calendar. */
export type DateBoxOpener = {
  ref: RefObject<HTMLButtonElement | null>;
  /** Set when the button opens a dialog; the stage sheet's boxes swap the sheet's view instead (S-4). */
  "aria-haspopup"?: "dialog";
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * The right-hand calendar drawer (plan date-picker-drawer, Parts 2 and 3; pack D-11), opened by the caller's own date
 * button: nothing is typed on the page (C-35). A tap on a day, or a date typed into the footer's "Type a date" field
 * (C-37), selects it and the footer says how it sits against the stages either side (C-22, C-31). Only `Use this
 * date` (or Enter in the field) and `Clear date` hand anything back, through `onPick` ("" clears). Nothing saves
 * (C-5). Focus goes back to the button on close. The calendar itself is `DatePickerPanel`; this is the drawer, its
 * header, and focus in and out.
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
  // A fresh panel on every opening, so its state starts from the box's value (C-22).
  const [opens, setOpens] = useState(0);
  const box = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);

  const show = (next: boolean) => {
    if (next) setOpens((n) => n + 1);
    setOpen(next);
  };
  const opener: DateBoxOpener = {
    ref: box,
    "aria-haspopup": "dialog",
    onClick: () => show(true),
  };

  return (
    <Drawer swipeDirection="right" open={open} onOpenChange={show}>
      {children(opener)}
      <DrawerContent initialFocus={() => pickedDay(content.current) ?? true} finalFocus={box}>
        <div className="flex items-start justify-between gap-3 border-b border-app-line px-4 pt-3 pb-3.5 sm:px-6 sm:pt-[18px] sm:pb-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="flex items-center gap-1.5 text-app-small text-app-muted">{eyebrow}</p>
            <DrawerTitle className="text-[20px] leading-[1.25] text-balance sm:text-app-section">{title}</DrawerTitle>
            <DrawerDescription className="mt-1 text-app-small text-app-grey">{help}</DrawerDescription>
          </div>
          <DrawerClose render={<Button type="button" variant="outline" />}>Close</DrawerClose>
        </div>

        <div ref={content} className="flex min-h-0 flex-1 flex-col">
          <DatePickerPanel
            key={opens}
            picking={picking}
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
