"use client";

import { Lock, Plus } from "lucide-react";
import { type ReactElement, type ReactNode, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import type { PersonalKind } from "@/lib/api/schemas";
import { weekday } from "@/lib/app/timeline";

import { type ClassOption, PersonalItemForm } from "./personal-item-form";

/**
 * A right-hand drawer for one of the student's own items (plan timeline-redesign T-5, T-12), built like
 * `RequestDrawer`: focus lands on the heading and goes back to the trigger on close. The form mounts only while
 * open, so a reopened drawer starts clean.
 */
function ItemDrawer({ title, trigger, label, children }: { title: string; trigger: ReactElement; label: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  return (
    <Drawer swipeDirection="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger}>{label}</DrawerTrigger>
      <DrawerContent initialFocus={heading}>
        <div className="flex items-start justify-between gap-3 border-b border-app-line px-4 pt-3 pb-4 sm:px-6 sm:pt-[18px]">
          <div className="flex min-w-0 flex-col gap-1">
            <DrawerTitle ref={heading} tabIndex={-1} className="text-app-section">{title}</DrawerTitle>
            <DrawerDescription className="flex items-center gap-1.5 text-app-small text-app-pick">
              <Lock aria-hidden="true" className="size-4 flex-none" />
              {"Only you can see this. Your teachers can't."}
            </DrawerDescription>
          </div>
          <DrawerClose render={<Button type="button" variant="outline" />}>Close</DrawerClose>
        </div>
        {open && children(() => setOpen(false))}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * The page's primary button, or with `compact` and a `date` the dashed "Add" under one day (the Week view, and the
 * Month view's picked day), which opens the form on that date.
 */
export function AddPersonalItem({ classes, today, date, compact }: { classes: ClassOption[]; today: string; date?: string; compact?: boolean }) {
  const trigger = compact ? (
    <Button type="button" variant="outline" aria-label={date ? `Add my own item on ${weekday(date)}` : undefined}
      className="w-full border-dashed bg-transparent text-app-grey lg:mt-auto" />
  ) : (
    <Button type="button" />
  );
  return (
    <ItemDrawer title="Add my own item" trigger={trigger}
      label={<><Plus aria-hidden="true" className="size-4" />{compact ? "Add" : "Add my own item"}</>}>
      {(close) => (
        <PersonalItemForm classes={classes} today={today} onDone={close}
          initial={date ? { title: "", dueDate: date, kind: "OTHER", classId: null } : undefined} />
      )}
    </ItemDrawer>
  );
}

export type OwnItem = { id: string; title: string; dueDate: string; kind: PersonalKind; classId: string | null };

/**
 * Edit, with Delete inside (T-9). `look` picks the trigger: a button reading "Edit", the same on the navy card, or
 * (T-17) the item's own title where a 44px button doesn't fit. The accessible name is always "Edit <title>".
 */
export function EditPersonalItem({ item, classes, today, look = "button" }: { item: OwnItem; classes: ClassOption[]; today: string; look?: "button" | "onAccent" | "title" }) {
  const trigger =
    look === "title" ? (
      <button type="button" aria-label={`Edit ${item.title}`}
        className="min-h-6 cursor-pointer text-left font-semibold underline decoration-app-pick/40 underline-offset-[3px] break-words touch-manipulation hover:decoration-current" />
    ) : (
      <Button type="button" variant={look === "onAccent" ? "onAccent" : "outline"} aria-label={`Edit ${item.title}`} />
    );
  return (
    <ItemDrawer title="Edit my own item" trigger={trigger} label={look === "title" ? item.title : "Edit"}>
      {(close) => (
        <PersonalItemForm itemId={item.id} classes={classes} today={today} onDone={close}
          initial={{ title: item.title, dueDate: item.dueDate, kind: item.kind, classId: item.classId }} />
      )}
    </ItemDrawer>
  );
}
