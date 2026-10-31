"use client";

import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { typedDate } from "@/lib/app/typed-date";

import type { DateBoxOpener } from "./date-picker-drawer";

/**
 * The page's date box (plan date-picker-drawer C-35): one button that shows the date, or "Choose a date", with our
 * one calendar icon, and opens the date drawer. Nothing is typed here; typing is the drawer's "Type a date" field.
 * A button, not an `<input type="date">`, so there is no native picker icon to duplicate and no way to change a date
 * without seeing the calendar. A button named by its label doesn't read its own text, so callers point
 * `describedBy` at something that says the date (C-36); its own text has the id `<id>-value` for that.
 */
export function DateBox({
  opener,
  id,
  value,
  describedBy,
  className = "",
}: {
  opener: DateBoxOpener;
  id: string;
  /** "YYYY-MM-DD", or "" for no date. */
  value: string;
  describedBy?: string;
  className?: string;
}) {
  return (
    <Button
      {...opener}
      id={id}
      type="button"
      variant="outline"
      aria-describedby={describedBy}
      className={`justify-between gap-2 font-normal text-[length:var(--text-app-base)] ${className}`}
    >
      <span id={`${id}-value`} className={value ? "tabular-nums text-app-ink" : "text-app-muted"}>
        {value ? typedDate(value) : "Choose a date"}
      </span>
      <CalendarDays aria-hidden="true" className="size-[18px] flex-none text-app-accent" />
    </Button>
  );
}
