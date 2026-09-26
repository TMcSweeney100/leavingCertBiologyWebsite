const CALENDAR_DATE = new Intl.DateTimeFormat('en-IE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const DAY_MONTH = new Intl.DateTimeFormat('en-IE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const WEEKDAY = new Intl.DateTimeFormat('en-IE', { weekday: 'short', timeZone: 'UTC' });
const MONTH_SHORT = new Intl.DateTimeFormat('en-IE', { month: 'short', timeZone: 'UTC' });

const MS_PER_DAY = 86_400_000;
const epoch = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * "2026-10-16" → "16 Oct 2026". A calendar date has no time or zone, so it's read and formatted in UTC; any
 * other zone could move it a day (the same hazard lib/schedule.ts documents).
 */
export function formatCalendarDate(iso: string): string {
  return CALENDAR_DATE.format(epoch(iso));
}

/** "Fri 25 Sep 2026" — the resolved weekday under a date input (pack D-5, open question 2: on). */
export function weekdayDate(iso: string): string {
  return `${WEEKDAY.format(epoch(iso))} ${CALENDAR_DATE.format(epoch(iso))}`;
}

/** "Fri 9 Oct" — the shorter form the out-of-order message uses inside a sentence. */
export function shortWeekdayDate(iso: string): string {
  return `${WEEKDAY.format(epoch(iso))} ${DAY_MONTH.format(epoch(iso))}`;
}

type Hours = { label: string | null; hoursMin: number | null; hoursMax: number | null; hoursGroup: string | null };

/** Display only (design §6.2). A shared estimate (Business Stages 4 and 5) names the stages sharing it. */
export function hoursLabel(stage: Hours, all: ReadonlyArray<Hours>): string {
  if (stage.hoursMax === null) return '';
  const range = stage.hoursMin === null ? `Up to ${stage.hoursMax} hours` : `${stage.hoursMin}–${stage.hoursMax} hours`;
  if (!stage.hoursGroup) return range;
  const sharing = all.filter((s) => s.hoursGroup === stage.hoursGroup).map((s) => s.label ?? '');
  return `${range} for ${sharing.join(' and ')} together`;
}

/** Whether the draft (stage id → "YYYY-MM-DD" or "") differs from the saved dates. */
export function datesChanged(saved: ReadonlyArray<{ id: string; dueDate: string | null }>, draft: Record<string, string>): boolean {
  return saved.some((s) => (s.dueDate ?? '') !== (draft[s.id] ?? ''));
}

/* ---- The year view (pack D-5). Positions are percentages of one span; nothing here is stored. ---- */

export type YearSpan = { from: string; to: string; days: number };

/**
 * The line's extent. It always reaches the completion date and always contains today, so the end-stop
 * and the "Today" line are both drawable; a date past the completion date extends it, which is what puts
 * a refused stage visibly beyond the end-stop (state 4).
 */
export function yearSpan(dates: ReadonlyArray<string>, completionDate: string, today: string): YearSpan {
  const all = [...dates, completionDate, today];
  const from = all.reduce((a, b) => (epoch(b) < epoch(a) ? b : a));
  const to = all.reduce((a, b) => (epoch(b) > epoch(a) ? b : a));
  return { from, to, days: Math.round((epoch(to) - epoch(from)) / MS_PER_DAY) };
}

/** Where a date sits on the line, 0–100. A zero-length span would divide by zero, so it collapses to 0. */
export function positionPct(iso: string, span: YearSpan): number {
  if (span.days <= 0) return 0;
  const offset = (epoch(iso) - epoch(span.from)) / MS_PER_DAY;
  return Math.min(100, Math.max(0, (offset / span.days) * 100));
}

/** Month starts inside the span, as "Jun", "Jul"… `everyOther` thins them when the line carries no dates. */
export function monthTicks(span: YearSpan, everyOther: boolean): { iso: string; label: string; pct: number }[] {
  const ticks: { iso: string; label: string; pct: number }[] = [];
  const cursor = new Date(epoch(`${span.from.slice(0, 7)}-01`));
  // Start at the first month boundary strictly after the span's start; the start itself carries a mark.
  cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  for (let i = 0; cursor.getTime() <= epoch(span.to); i += 1) {
    const iso = toIso(cursor.getTime());
    if (!everyOther || i % 2 === 0) ticks.push({ iso, label: MONTH_SHORT.format(cursor.getTime()), pct: positionPct(iso, span) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return ticks;
}

/** A gap label is only drawn where it fits: below this share of the line the words would collide. */
const GAP_ROOM_PCT = 10;

/**
 * "16 weeks" between consecutive marks, centred on the midpoint. `marks` is every dated mark on the line
 * in ascending order, ending with the completion date — the last gap is stage 6 to the end-stop.
 */
export function gapLabels(marks: ReadonlyArray<string>, span: YearSpan): { label: string; pct: number }[] {
  const sorted = [...marks].sort((a, b) => epoch(a) - epoch(b));
  const gaps: { label: string; pct: number }[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const from = positionPct(sorted[i - 1], span);
    const to = positionPct(sorted[i], span);
    if (to - from < GAP_ROOM_PCT) continue;
    const weeks = Math.round((epoch(sorted[i]) - epoch(sorted[i - 1])) / MS_PER_DAY / 7);
    if (weeks < 1) continue;
    gaps.push({ label: `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`, pct: (from + to) / 2 });
  }
  return gaps;
}

/* ---- Teacher items: letters are derived from the date, never stored (pack D-5, rule 1). ---- */

export type ItemLike = { id: string; text: string; dueDate: string | null };
export type StageLike = {
  id: string;
  ordinal: number;
  label: string | null;
  name: string;
  dueDate: string | null;
  items: ReadonlyArray<ItemLike>;
};
export type LetteredItem = ItemLike & { letter: string; stageId: string; stageLabel: string; stageOrdinal: number };

/** 0 → "A", 25 → "Z", 26 → "AA". Spreadsheet-style, so a 27th item can't reuse a letter. */
function letterFor(index: number): string {
  let n = index;
  let letter = '';
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

/**
 * Every item on the component as one flat list, lettered A, B, C… in date order with undated items last.
 * A letter therefore changes when a date changes, which is what the page's copy warns about. Ties are
 * broken by stage, then text, then id, so the same data always letters the same way.
 */
export function letteredItems(stages: ReadonlyArray<StageLike>): LetteredItem[] {
  const flat = stages.flatMap((s) =>
    s.items.map((item) => ({ ...item, stageId: s.id, stageLabel: s.label ?? s.name, stageOrdinal: s.ordinal })),
  );
  flat.sort((a, b) => {
    if (a.dueDate !== b.dueDate) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return epoch(a.dueDate) - epoch(b.dueDate);
    }
    return a.stageOrdinal - b.stageOrdinal || a.text.localeCompare(b.text) || a.id.localeCompare(b.id);
  });
  return flat.map((item, i) => ({ ...item, letter: letterFor(i) }));
}

/** The phone's stand-in for the collapsed line. Null until there is a date to describe. */
export function datesRunSummary(stages: ReadonlyArray<StageLike>, completionDate: string): string | null {
  const dates = stages.map((s) => s.dueDate).filter((d): d is string => Boolean(d)).sort((a, b) => epoch(a) - epoch(b));
  if (dates.length === 0) return null;
  const run = dates.length === 1 ? `on ${formatCalendarDate(dates[0])}` : `run ${formatCalendarDate(dates[0])} to ${formatCalendarDate(dates[dates.length - 1])}`;
  return `Your dates ${run}, inside the completion date of ${formatCalendarDate(completionDate)}.`;
}

/* ---- The status beside Save dates. It always says where things stand (pack D-5, rule 3). ---- */

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n: number) => WORDS[n] ?? String(n);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function saveStatus({
  total,
  saved,
  changed,
  refusedCount,
  warnings,
}: {
  total: number;
  saved: number;
  changed: number;
  refusedCount: number;
  warnings: ReadonlyArray<{ code: string; stageIds: ReadonlyArray<string> }>;
}): string {
  if (refusedCount > 0) {
    const untouched = total - refusedCount;
    return untouched > 0 ? `Nothing was saved — your other ${word(untouched)} dates are unchanged.` : 'Nothing was saved.';
  }
  if (changed > 0) return `${changed} date${changed === 1 ? '' : 's'} changed, not saved yet`;

  const outOfOrder = new Set(warnings.filter((w) => w.code === 'OUT_OF_ORDER').flatMap((w) => w.stageIds));
  if (outOfOrder.size > 0) return `Saved. ${capital(word(outOfOrder.size))} dates are out of order.`;
  const late = new Set(warnings.filter((w) => w.code === 'AFTER_COMPLETION_DATE').flatMap((w) => w.stageIds));
  if (late.size > 0) return `Saved. ${capital(word(late.size))} date${late.size === 1 ? '' : 's'} need${late.size === 1 ? 's' : ''} fixing.`;

  if (saved === 0) return 'No dates saved yet';
  if (saved === total) return `All ${total} dates saved`;
  return `${saved} of ${total} dates saved`;
}
