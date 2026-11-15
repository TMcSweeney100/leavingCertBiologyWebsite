/**
 * Timeline ranges, labels and grouping (plan 2F P2-47, P2-48; plan timeline-redesign). Calendar dates are
 * "YYYY-MM-DD" strings, and all arithmetic is on UTC midnights, so no timezone or DST change can move a
 * date (as in lib/schedule.ts).
 */
export type View = 'timeline' | 'week' | 'month';
export type Range = { view: View; from: string; to: string };

const MS_PER_DAY = 86_400_000;
const AHEAD_DAYS = 84;
const epoch = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export const toIsoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso: string, days: number) => toIsoDate(epoch(iso) + days * MS_PER_DAY);
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function isIsoDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(epoch(value)) && toIsoDate(epoch(value)) === value;
}

export function monday(iso: string) {
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

/** The school year a date falls in: 1 September to 31 August. */
export function schoolYear(iso: string): { start: string; end: string } {
  const year = Number(iso.slice(0, 4)) - (Number(iso.slice(5, 7)) >= 9 ? 0 : 1);
  return { start: `${year}-09-01`, end: `${year + 1}-08-31` };
}

export function rangeFor(params: { view?: string | string[]; from?: string | string[] }, today: string): Range {
  const requested = first(params.view);
  const view: View = requested === 'week' || requested === 'month' ? requested : 'timeline';
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
  // T-10: from this week's Monday (so the week's past days show), or exactly from a given date ("Show earlier"),
  // to the end of that school year, and never less than 12 weeks ahead.
  // In the first days of September this week's Monday is still in August: start at 1 September instead, or the
  // range would run past the API's 366 days.
  const { start, end: yearEnd } = schoolYear(anchor);
  const thisMonday = monday(anchor);
  const ahead = addDays(anchor, AHEAD_DAYS);
  const from = isIsoDate(fromParam) ? anchor : thisMonday < start ? start : thisMonday;
  return { view, from, to: ahead > yearEnd ? ahead : yearEnd };
}

/** T-14: the Month view's picked day: the asked one if it's a real date in the range, else today if on screen, else the first day. */
export function pickedDay(asked: string | string[] | undefined, range: Range, today: string): string {
  const inRange = (iso: string) => iso >= range.from && iso <= range.to;
  const day = first(asked);
  if (isIsoDate(day) && inRange(day)) return day;
  return inRange(today) ? today : range.from;
}

/** The `from` of the previous (-1) or next (1) week or month. The timeline doesn't page. */
export function stepFrom(range: Range, direction: 1 | -1): string {
  if (range.view === 'week') return addDays(range.from, 7 * direction);
  if (range.view === 'month') return direction === 1 ? nextMonthStart(range.from) : monthStart(addDays(range.from, -1));
  return range.from;
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

/** "October 2026", for a date's own month — the timeline aside's heading (pack D-4). */
export function monthYearLabel(iso: string): string {
  return MONTH_YEAR.format(epoch(iso));
}

/** "12–18 Oct", or "28 Dec – 3 Jan" across two months. */
export function spanLabel(from: string, to: string): string {
  const [fromDay, fromMonth] = DAY_MONTH.format(epoch(from)).split(' ');
  const end = DAY_MONTH.format(epoch(to));
  return fromMonth === end.split(' ')[1] ? `${fromDay}–${end}` : `${fromDay} ${fromMonth} – ${end}`;
}

export function rangeLabel(range: Range): string {
  if (range.view === 'month') return MONTH_YEAR.format(epoch(range.from));
  return `${spanLabel(range.from, range.to)} ${range.to.slice(0, 4)}`;
}

/** Whole Monday-to-Sunday weeks covering a month range. */
export function monthWeeks(range: Range): string[][] {
  const weeks: string[][] = [];
  for (let start = monday(range.from); epoch(start) <= epoch(range.to); start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

export type Group<T> = { label: string; sub: string | null; items: T[] };

/** The timeline's headings: "This week" and "Next week" by their dates, everything else by month and year. */
export function groupTimeline<T extends { date: string }>(items: ReadonlyArray<T>, today: string): Group<T>[] {
  const thisWeek = monday(today);
  const nextWeek = addDays(thisWeek, 7);
  const after = addDays(thisWeek, 14);
  const groups: Group<T>[] = [];
  for (const item of items) {
    const heading =
      item.date >= thisWeek && item.date < nextWeek ? { label: 'This week', sub: spanLabel(thisWeek, addDays(thisWeek, 6)) }
      : item.date >= nextWeek && item.date < after ? { label: 'Next week', sub: spanLabel(nextWeek, addDays(nextWeek, 6)) }
      : { label: monthYearLabel(item.date), sub: null };
    const last = groups.at(-1);
    if (last?.label === heading.label) last.items.push(item);
    else groups.push({ ...heading, items: [item] });
  }
  return groups;
}

/** T-8: the first thing from today on that isn't ticked done, and the three after it. */
export function nextUp<T extends { date: string; done: boolean }>(items: ReadonlyArray<T>, today: string): { next: T | undefined; then: T[] } {
  const upcoming = items.filter((i) => i.date >= today && !i.done);
  return { next: upcoming[0], then: upcoming.slice(1, 4) };
}

export function weekDays(from: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(from, i));
}

/** T-16: one sentence over the week. */
export function weekSummary(items: ReadonlyArray<{ kind: string; done: boolean }>): string {
  const own = items.filter((i) => i.kind === 'PERSONAL');
  const teacher = items.filter((i) => i.kind === 'TEACHER_ITEM').length;
  const coursework = items.length - own.length - teacher;
  const parts = [
    own.length > 0 && `${own.length} of your own, ${own.filter((i) => i.done).length} done`,
    teacher > 0 && `${teacher} from your teacher`,
    coursework > 0 && `${coursework} coursework ${coursework === 1 ? 'date' : 'dates'}`,
  ].filter(Boolean);
  return parts.length === 0 ? 'Nothing this week yet.' : `This week: ${parts.join(' · ')}`;
}

export function dateShortcuts(today: string): Array<{ label: string; date: string }> {
  return [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'Next Monday', date: addDays(monday(today), 7) },
  ];
}

/** "Stage 4" gives "4", for the rail's numbered square. */
export function stageNumber(label: string | null): string | null {
  return label?.match(/\d+/)?.[0] ?? null;
}
