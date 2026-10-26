"use client";

import { type ComponentProps, useMemo } from "react";
import type { DayButton } from "react-day-picker";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { calendarMonths, type DateMark, dayName, isoToLocalDate, localDateToIso } from "@/lib/app/date-marks";

const TAG: Record<DateMark["kind"], string> = {
  stage: "bg-app-accent text-app-on-accent",
  item: "border border-app-accent bg-app-surface text-app-accent",
  completion: "bg-app-ink text-app-on-accent",
};
const UNSAVED = "border border-dashed border-app-accent bg-app-surface text-app-accent";

/** A mark's tag: a shape and a word, never colour alone (C-14). A stage not saved yet is dashed. */
export function MarkTag({ kind, saved, children }: { kind: DateMark["kind"]; saved: boolean; children: string }) {
  return (
    <span
      data-saved={saved}
      className={`inline-flex min-w-[18px] justify-center rounded-app-inner px-0.5 font-mono text-app-label leading-[1.2] font-bold ${saved ? TAG[kind] : UNSAVED}`}
    >
      {children}
    </span>
  );
}

/**
 * The component's dates on a calendar (plan date-picker-drawer). Reusable on purpose (C-3): the date
 * drawer holds it now, the stage sheet will later. Months run in one column with no arrows (C-11);
 * days after the completion date are disabled; picking a day calls `onPick` and saves nothing.
 */
export function DateCalendar({
  value,
  marks,
  completionDate,
  today,
  onPick,
}: {
  value: string;
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  onPick: (iso: string) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, DateMark[]>();
    for (const mark of marks) map.set(mark.iso, [...(map.get(mark.iso) ?? []), mark]);
    return map;
  }, [marks]);
  const months = calendarMonths([value, ...marks.map((m) => m.iso)].filter(Boolean), today, completionDate);

  // A stable component per set of marks, so react-day-picker doesn't remount every day on each render.
  const MarkedDay = useMemo(
    () =>
      function MarkedDay(props: ComponentProps<typeof DayButton>) {
        const on = byDay.get(localDateToIso(props.day.date)) ?? [];
        return (
          <CalendarDayButton {...props}>
            {props.children}
            {on.length > 0 && (
              <span aria-hidden="true" className="flex flex-wrap justify-center gap-0.5">
                {on.map((mark) => (
                  <MarkTag key={`${mark.kind}-${mark.short}`} kind={mark.kind} saved={mark.saved}>
                    {mark.short}
                  </MarkTag>
                ))}
              </span>
            )}
          </CalendarDayButton>
        );
      },
    [byDay],
  );

  return (
    <Calendar
      mode="single"
      required
      selected={value ? isoToLocalDate(value) : undefined}
      onSelect={(date) => onPick(localDateToIso(date))}
      defaultMonth={isoToLocalDate(months.start)}
      numberOfMonths={months.count}
      hideNavigation
      showOutsideDays={false}
      weekStartsOn={1}
      today={isoToLocalDate(today)}
      disabled={{ after: isoToLocalDate(completionDate) }}
      labels={{ labelDayButton: (date) => dayName(localDateToIso(date), marks, completionDate, today) }}
      components={{ DayButton: MarkedDay }}
      className="w-full p-0"
      classNames={{ months: "flex flex-col gap-6", month: "flex w-full flex-col gap-2" }}
    />
  );
}
