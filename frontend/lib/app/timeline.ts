/**
 * Timeline ranges and labels (plan 2F P2-47, P2-48). Calendar dates are "YYYY-MM-DD" strings, and all
 * arithmetic is on UTC midnights, so no timezone or DST change can move a date (as in lib/schedule.ts).
 */
export type View = 'list' | 'week' | 'month';
export type Range = { view: View; from: string; to: string };

const MS_PER_DAY = 86_400_000;
const LIST_DAYS = 28;
const epoch = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export const toIsoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => toIsoDate(epoch(iso) + days * MS_PER_DAY);
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function isIsoDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(epoch(value)) && toIsoDate(epoch(value)) === value;
}

function monday(iso: string) {
  const dayOfWeek = (new Date(epoch(iso)).getUTCDay() + 6) % 7;
  return addDays(iso, -dayOfWeek);
}

function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

function nextMonthStart(iso: string) {
  const d = new Date(epoch(monthStart(iso)));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return toIsoDate(d.getTime());
}

export function rangeFor(params: { view?: string | string[]; from?: string | string[] }, today: string): Range {
  const requested = first(params.view);
  const view: View = requested === 'week' || requested === 'month' ? requested : 'list';
  const fromParam = first(params.from);
  const anchor = isIsoDate(fromParam) ? fromParam : today;
  if (view === 'week') {
    const from = monday(anchor);
    return { view, from, to: addDays(from, 6) };
  }
  if (view === 'month') {
    const from = monthStart(anchor);
    return { view, from, to: addDays(nextMonthStart(from), -1) };
  }
  return { view: 'list', from: anchor, to: addDays(anchor, LIST_DAYS - 1) };
}

/** The `from` of the previous (-1) or next (1) range of the same view. */
export function stepFrom(range: Range, direction: 1 | -1): string {
  if (range.view === 'week') return addDays(range.from, 7 * direction);
  if (range.view === 'month') {
    if (direction === 1) return nextMonthStart(range.from);
    return monthStart(addDays(range.from, -1));
  }
  return addDays(range.from, LIST_DAYS * direction);
}

export function relativeDay(today: string, date: string): string {
  const days = Math.round((epoch(date) - epoch(today)) / MS_PER_DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

const DAY_MONTH = new Intl.DateTimeFormat('en-IE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const MONTH_YEAR = new Intl.DateTimeFormat('en-IE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const WEEKDAY = new Intl.DateTimeFormat('en-IE', { weekday: 'short', timeZone: 'UTC' });

/** "Fri 16 Oct". */
export function weekday(iso: string): string {
  return `${WEEKDAY.format(epoch(iso))} ${DAY_MONTH.format(epoch(iso))}`;
}

export function rangeLabel(range: Range): string {
  if (range.view === 'month') return MONTH_YEAR.format(epoch(range.from));
  const year = range.to.slice(0, 4);
  const [fromDay, fromMonth] = DAY_MONTH.format(epoch(range.from)).split(' ');
  const to = DAY_MONTH.format(epoch(range.to));
  return fromMonth === to.split(' ')[1] ? `${fromDay}–${to} ${year}` : `${fromDay} ${fromMonth} – ${to} ${year}`;
}

/** Whole Monday-to-Sunday weeks covering a month range. */
export function monthWeeks(range: Range): string[][] {
  const weeks: string[][] = [];
  for (let start = monday(range.from); epoch(start) <= epoch(range.to); start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}
