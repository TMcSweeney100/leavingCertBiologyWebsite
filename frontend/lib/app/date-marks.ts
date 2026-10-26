import { letteredItems, type StageLike } from './component-setup.ts';

/** One thing on one day of the date picker's calendar (plan date-picker-drawer, C-13 and C-14). */
export type DateMark = {
  iso: string;
  kind: 'stage' | 'item' | 'completion';
  /** The tag drawn under the day number: "S4", an item's letter, or "End". */
  short: string;
  /** What the day's accessible name says about it: "Stage 4 (not saved)", "item B", "the completion date". */
  name: string;
  saved: boolean;
};

const FULL_DATE = new Intl.DateTimeFormat('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * "2026-10-16" → local midnight on 16 Oct. react-day-picker works in local time, so a UTC-midnight Date
 * would show as the 15th anywhere west of UTC (C-17). Only for handing dates to the calendar; formatting
 * stays UTC, as in component-setup.ts.
 */
export function isoToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** The calendar day a local Date falls on, as "YYYY-MM-DD". */
export function localDateToIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Every mark on the component: each stage's draft date (its saved date when the draft hasn't touched
 * it; none when the draft cleared it), each dated item by its letter, and the completion date last.
 * Items save one at a time, so their dates are always saved ones.
 */
export function dateMarks(stages: ReadonlyArray<StageLike>, draft: Record<string, string>, completionDate: string): DateMark[] {
  const marks: DateMark[] = [];
  for (const stage of stages) {
    const iso = draft[stage.id] ?? stage.dueDate ?? '';
    if (!iso) continue;
    const saved = iso === stage.dueDate;
    const label = stage.label ?? stage.name;
    marks.push({ iso, kind: 'stage', short: `S${stage.ordinal}`, name: saved ? label : `${label} (not saved)`, saved });
  }
  for (const item of letteredItems(stages)) {
    if (!item.dueDate) continue;
    marks.push({ iso: item.dueDate, kind: 'item', short: item.letter, name: `item ${item.letter}`, saved: true });
  }
  marks.push({ iso: completionDate, kind: 'completion', short: 'End', name: 'the completion date', saved: true });
  return marks;
}

/** A day button's accessible name (C-13): "Friday 16 October 2026: Stage 4 (not saved), item B". */
export function dayName(iso: string, marks: ReadonlyArray<DateMark>, completionDate: string, today: string): string {
  const on = [...(iso === today ? ['today'] : []), ...marks.filter((m) => m.iso === iso).map((m) => m.name)];
  const date = FULL_DATE.format(Date.parse(`${iso}T00:00:00Z`));
  const named = on.length > 0 ? `${date}: ${on.join(', ')}` : date;
  return iso > completionDate ? `${named}, after the completion date` : named;
}

/** The months the calendar draws (C-11): from the earliest of today and every date to the latest of the completion date and every date. */
export function calendarMonths(dates: ReadonlyArray<string>, today: string, completionDate: string): { start: string; count: number } {
  const all = [today, completionDate, ...dates].sort();
  const first = all[0];
  const last = all[all.length - 1];
  const months = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
  return { start: `${first.slice(0, 7)}-01`, count: months(last) - months(first) + 1 };
}
