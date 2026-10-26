"use client";

import { type ComponentProps, useMemo } from "react";
import type { DayButton } from "react-day-picker";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { type DateMark, dayName, isoToLocalDate, localDateToIso } from "@/lib/app/date-marks";

import { MarkTag } from "./mark-tag";

const MONTH = new Intl.DateTimeFormat("en-IE", { month: "long", year: "numeric" });
const TODAY_DISC =
  "-mt-[3px] grid size-[26px] place-items-center rounded-full bg-app-today font-bold text-app-ink shadow-[inset_0_0_0_1.5px_var(--app-today-ring)]";

/**
 * A day's tags (C-27). The completion date shares a day as its edge bar alone. A 60px day (sm: and up) shows three
 * tags and a 44px day two; a fuller day ends in "+n".
 */
function DayTags({ on }: { on: ReadonlyArray<DateMark> }) {
  const tags = on.length > 1 ? on.filter((m) => m.kind !== "completion") : on;
  if (tags.length === 0) return null;
  return (
    <span aria-hidden="true" className="flex justify-center gap-0.5">
      {tags.slice(0, tags.length > 3 ? 2 : 3).map((m, i) => (
        <MarkTag key={`${m.kind}-${m.short}`} kind={m.kind} saved={m.saved} className={i === 0 || tags.length <= 2 ? "" : "max-sm:hidden"}>
          {m.short}
        </MarkTag>
      ))}
      {tags.length > 2 && <MarkTag kind="more" className="sm:hidden">{`+${tags.length - 1}`}</MarkTag>}
      {tags.length > 3 && <MarkTag kind="more" className="max-sm:hidden">{`+${tags.length - 2}`}</MarkTag>}
    </span>
  );
}

/**
 * The component's dates on one month of a calendar (plan date-picker-drawer, Part 2). The month and the selected day
 * are the drawer's; a tap hands a day back through `onSelect` and saves nothing. Days after the completion date stay
 * focusable (`aria-disabled`) so a tap or focus can say why they can't be picked (C-24).
 */
export function DateCalendar({
  marks,
  completionDate,
  today,
  selected,
  month,
  range,
  runFrom,
  onMonth,
  onSelect,
  onAfterCompletion,
}: {
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  /** The day tapped in the drawer, drawn azure. */
  selected: string;
  /** The month in view, "YYYY-MM-01". */
  month: string;
  /** The months the arrows reach (calendarMonths). */
  range: { start: string; count: number };
  /** Where the azure run starts (runStart), or null. */
  runFrom: string | null;
  onMonth: (month: string) => void;
  onSelect: (iso: string) => void;
  onAfterCompletion: (iso: string) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, DateMark[]>();
    for (const mark of marks) map.set(mark.iso, [...(map.get(mark.iso) ?? []), mark]);
    return map;
  }, [marks]);

  // A stable component per set of marks, so react-day-picker doesn't remount every day on each render.
  const MarkedDay = useMemo(
    () =>
      function MarkedDay(props: ComponentProps<typeof DayButton>) {
        const { afterCompletion, run, end, today: isToday } = props.modifiers;
        return (
          <CalendarDayButton {...props} aria-disabled={afterCompletion || undefined} data-run={run || undefined} data-end={end || undefined}>
            <span className={isToday ? TODAY_DISC : undefined}>{props.children}</span>
            <DayTags on={byDay.get(localDateToIso(props.day.date)) ?? []} />
          </CalendarDayButton>
        );
      },
    [byDay],
  );

  const first = isoToLocalDate(range.start);
  const last = new Date(first.getFullYear(), first.getMonth() + range.count - 1, 1);
  const end = isoToLocalDate(completionDate);

  return (
    <Calendar
      mode="single"
      selected={selected ? isoToLocalDate(selected) : undefined}
      month={isoToLocalDate(month)}
      onMonthChange={(m) => onMonth(localDateToIso(m))}
      startMonth={first}
      endMonth={last}
      navLayout="after"
      showOutsideDays={false}
      weekStartsOn={1}
      today={isoToLocalDate(today)}
      modifiers={{
        afterCompletion: { after: end },
        end,
        run: runFrom && selected ? { after: isoToLocalDate(runFrom), before: isoToLocalDate(selected) } : [],
      }}
      onDayClick={(date, modifiers) => (modifiers.afterCompletion ? onAfterCompletion : onSelect)(localDateToIso(date))}
      onDayFocus={(date, modifiers) => {
        if (modifiers.afterCompletion) onAfterCompletion(localDateToIso(date));
      }}
      labels={{
        labelDayButton: (date) => dayName(localDateToIso(date), marks, completionDate, today),
        labelPrevious: (m) => (m ? MONTH.format(m) : "No earlier month"),
        labelNext: (m) => (m ? MONTH.format(m) : "No later month"),
      }}
      components={{ DayButton: MarkedDay }}
      className="w-full"
    />
  );
}
