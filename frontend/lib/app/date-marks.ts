import { letteredItems, shortWeekdayDate, type StageLike } from './component-setup.ts';

/** One thing on one day of the date picker's calendar (plan date-picker-drawer, C-13 and C-14). */
export type DateMark = {
  iso: string;
  kind: 'stage' | 'item' | 'completion';
  /** The tag drawn under the day number: "S4", an item's letter, or "End". */
  short: string;
  /** What the day's accessible name says about it: "Stage 4 (not saved)", "item B", "the completion date". */
  name: string;
  saved: boolean;
  /** A stage's number, so the footer can find the stages either side of the one being picked (C-31). */
  ordinal?: number;
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
    marks.push({ iso, kind: 'stage', short: `S${stage.ordinal}`, name: saved ? label : `${label} (not saved)`, saved, ordinal: stage.ordinal });
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

/** What the drawer is choosing a date for. */
export type Picking = { kind: 'stage'; ordinal: number } | { kind: 'item' };

/** One line of the footer, drawn as "<b>13 days</b> after Stage 3". `run` is the gap drawn in azure. */
export type Gap = { mark: DateMark; amount: string; rest: string; run: boolean };

const CHECK = "That's allowed, but check it's what you meant.";
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** "1 day", "13 days", "3 weeks": exact under three weeks, whole weeks (rounded) from there (C-31). */
export function gapWords(days: number): string {
  return days < 21 ? `${days} ${days === 1 ? 'day' : 'days'}` : `${Math.round(days / 7)} weeks`;
}

/** The nearest dated stages before and after stage `ordinal`, in stage order, saved or not. */
function neighbours(marks: ReadonlyArray<DateMark>, ordinal: number) {
  const stages = marks.filter((m) => m.kind === 'stage').sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
  const before = stages.filter((m) => (m.ordinal ?? 0) < ordinal);
  return { before: before[before.length - 1] ?? null, after: stages.find((m) => (m.ordinal ?? 0) > ordinal) ?? null };
}

/** Where the azure run starts: the stage before's date, when it's before the picked day (C-27). Items have none. */
export function runStart(marks: ReadonlyArray<DateMark>, picking: Picking, selected: string): string | null {
  if (picking.kind !== 'stage' || !selected) return null;
  const { before } = neighbours(marks, picking.ordinal);
  return before && before.iso < selected ? before.iso : null;
}

/** The footer's words for a picked day (C-31): the gaps either side, anything to check, and what else is on the day. */
export function pickReadout(
  marks: ReadonlyArray<DateMark>,
  picking: Picking,
  selected: string,
  completionDate: string,
): { gaps: Gap[]; asks: string[]; also: string[] } {
  const gaps: Gap[] = [];
  const asks: string[] = [];
  if (picking.kind === 'stage') {
    const { before, after } = neighbours(marks, picking.ordinal);
    if (before) {
      const days = daysBetween(before.iso, selected);
      if (days > 0) gaps.push({ mark: before, amount: gapWords(days), rest: `after ${before.name}`, run: true });
      else asks.push(`${days === 0 ? `The same day as ${before.name}.` : `Before ${before.name} (${shortWeekdayDate(before.iso)}).`} ${CHECK}`);
    }
    if (after) {
      const days = daysBetween(selected, after.iso);
      if (days > 0) gaps.push({ mark: after, amount: gapWords(days), rest: `before ${after.name}`, run: false });
      else asks.push(`${days === 0 ? `The same day as ${after.name}.` : `After ${after.name} (${shortWeekdayDate(after.iso)}).`} ${CHECK}`);
    } else {
      const end: DateMark = marks.find((m) => m.kind === 'completion') ?? { iso: completionDate, kind: 'completion', short: 'End', name: 'the completion date', saved: true };
      const days = daysBetween(selected, completionDate);
      gaps.push(days === 0
        ? { mark: end, amount: 'On', rest: 'the completion date', run: false }
        : { mark: end, amount: gapWords(days), rest: 'before the completion date', run: false });
    }
  } else {
    const byDate = marks.filter((m) => m.kind === 'stage').sort((a, b) => a.iso.localeCompare(b.iso));
    const earlier = byDate.filter((m) => m.iso <= selected);
    const prev = earlier[earlier.length - 1];
    const next = byDate.find((m) => m.iso > selected);
    if (prev) {
      const days = daysBetween(prev.iso, selected);
      gaps.push({ mark: prev, amount: days === 0 ? 'On' : gapWords(days), rest: days === 0 ? `the same day as ${prev.name}` : `after ${prev.name}`, run: false });
    }
    if (next) gaps.push({ mark: next, amount: gapWords(daysBetween(selected, next.iso)), rest: `before ${next.name}`, run: false });
  }
  const own = picking.kind === 'stage' ? picking.ordinal : null;
  const also = marks.filter((m) => m.iso === selected && !(m.kind === 'stage' && m.ordinal === own)).map((m) => m.name);
  return { gaps, asks, also };
}
