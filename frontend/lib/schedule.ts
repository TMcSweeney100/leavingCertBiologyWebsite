/**
 * Schedule derivation — the one piece of live logic on the site (see
 * `docs/IMPLEMENTATION_PLAN.md` §3). Everything here is a pure function of
 * an injectable `now`; nothing reads the clock unless the caller lets it.
 *
 * The core hazard this file exists to avoid: "today" must be a civil
 * calendar date in Europe/Dublin, not the server's local date. Vercel runs
 * UTC, and Ireland is UTC+1 for a large part of the school term, so a naive
 * `new Date().setHours(0,0,0,0)` silently reads the wrong day for evening
 * users. The fix is to resolve the Dublin civil date first (via `Intl`,
 * which carries its own timezone data regardless of the server's TZ), and
 * only then do arithmetic — entirely in UTC-midnight epoch terms, so no
 * calculation ever crosses a DST offset change.
 */
import {
  REPORT_SECTIONS,
  STAGES,
  TERM,
  type Stage,
  type StageState,
} from './schedule.data.ts';

const MS_PER_DAY = 86_400_000;

const DUBLIN = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Dublin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today in Dublin, as a UTC-midnight epoch. */
export function dublinToday(now: Date = new Date()): number {
  return Date.parse(`${DUBLIN.format(now)}T00:00:00Z`);
}

/** Parses an ISO calendar date (`YYYY-MM-DD`) as a UTC-midnight epoch. */
const day = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);

const clamp = (min: number, max: number, value: number): number =>
  Math.min(max, Math.max(min, value));

/** A stage annotated with its derived state as of a given `now`. */
export type StageWithState = Stage & { state: StageState };

/**
 * One row of the report-section crosswalk, as `schedule.data.ts` writes it.
 *
 * Declared here rather than there because that file is copied byte-for-byte
 * from the design handoff and must stay that way (see its header). Its
 * `REPORT_SECTIONS` literal infers as a union — rows carrying `alwaysDone`
 * and rows carrying `stageId` — which is awkward to read from; this widens
 * both shapes into one, with the two distinguishing fields optional.
 */
export type ReportSectionRow = {
  section: string;
  name: string;
  writtenDuring: string;
  dueBy: string;
  alwaysDone?: boolean;
  stageId?: string;
};

/**
 * The live status of a report section, derived from the state of the stage
 * it is written during: "Due now" on the current stage, "Done" once that
 * stage has passed, "To come" otherwise. Two sections (§5 and §6) share
 * Stage 5, so they flip together — which is correct, they are due together.
 */
export type ReportSectionStatus = 'due-now' | 'done' | 'to-come';

export type ReportSectionWithStatus = ReportSectionRow & {
  status: ReportSectionStatus;
  /** The word the status column prints. Never conveyed by colour alone. */
  statusLabel: string;
};

const STATUS_LABEL: Record<ReportSectionStatus, string> = {
  'due-now': 'Due now',
  done: 'Done',
  'to-come': 'To come',
};

export type DerivedSchedule = {
  /** Today's civil date in Dublin, as a UTC-midnight epoch (ms). */
  today: number;
  /** Every stage, in order, each annotated with its derived state. */
  stages: StageWithState[];
  /** The stage currently in focus (falls back to the last stage once the term ends). */
  currentStage: StageWithState;
  /** Days remaining until `currentStage`'s due date. Never negative. */
  daysLeft: number;
  /**
   * True only on `currentStage`'s due date itself. `daysLeft === 0` is NOT
   * the same test: it is also what the clamp returns once a due date has
   * passed, which happens for real once the term ends and the last stage
   * stays "current" forever after (plan §3.3's 20 Dec / 1 Mar rows). Copy
   * that says "Due today" must branch on this, not on the countdown.
   */
  isDueToday: boolean;
  /** The stage after `currentStage`, or `null` when it is the last one. */
  nextStage: StageWithState | null;
  /** Every stage after `currentStage`, in order. Empty on the last stage. */
  comingUp: StageWithState[];
  /** All seven report sections, each with its live crosswalk status. */
  reportSections: ReportSectionWithStatus[];
  /** Percentage through the term, clamped to [2, 100]. */
  termPct: number;
  /** Week number of the term, clamped to [1, 15]. */
  weekNumber: number;
};

/**
 * Annotates every report section with the status the crosswalk prints.
 *
 * A section takes the state of the stage it is written during, looked up by
 * `stageId` — never by position, so reordering `REPORT_SECTIONS` or adding a
 * section cannot silently mis-map it. Sections marked `alwaysDone` (§1 and
 * §2, written in 5th Year) have no stage on this page's timeline and are
 * always "Done"; so is any row whose `stageId` no longer matches a stage,
 * which can only happen if the data file is edited inconsistently and is
 * better rendered as done-and-quiet than crashed on.
 */
function reportSectionStatuses(stages: StageWithState[]): ReportSectionWithStatus[] {
  const rows: ReportSectionRow[] = REPORT_SECTIONS;

  return rows.map((row) => {
    const stage = row.alwaysDone ? undefined : stages.find((s) => s.id === row.stageId);
    const status: ReportSectionStatus =
      stage === undefined || stage.state === 'done'
        ? 'done'
        : stage.state === 'current'
          ? 'due-now'
          : 'to-come';

    return { ...row, status, statusLabel: STATUS_LABEL[status] };
  });
}

/**
 * Derives the full schedule view — per-stage states, the current stage, the
 * countdown to it, and term progress — as of `now`.
 *
 * `now` defaults to the real current time. Pass an explicit `Date` for
 * tests or for a preview override (e.g. a future `?date=` query param) —
 * this function never reads the clock on its own behalf.
 */
export function deriveSchedule(now: Date = new Date()): DerivedSchedule {
  const today = dublinToday(now);

  let currentIndex = STAGES.findIndex((s) => !s.isAlwaysDone && day(s.dueDate) >= today);
  if (currentIndex === -1) currentIndex = STAGES.length - 1; // past the end -> last stage

  const stages: StageWithState[] = STAGES.map((stage, index) => ({
    ...stage,
    state: stage.isAlwaysDone
      ? 'done'
      : index < currentIndex
        ? 'done'
        : index === currentIndex
          ? 'current'
          : 'upcoming',
  }));

  const currentStage = stages[currentIndex];
  const comingUp = stages.slice(currentIndex + 1);
  const termStart = day(TERM.start);
  const termEnd = day(TERM.end);

  return {
    today,
    stages,
    currentStage,
    daysLeft: Math.max(0, Math.round((day(currentStage.dueDate) - today) / MS_PER_DAY)),
    isDueToday: day(currentStage.dueDate) === today,
    nextStage: comingUp[0] ?? null,
    comingUp,
    reportSections: reportSectionStatuses(stages),
    termPct: clamp(2, 100, Math.round(((today - termStart) / (termEnd - termStart)) * 100)),
    weekNumber: clamp(1, 15, Math.floor((today - termStart) / (7 * MS_PER_DAY)) + 1),
  };
}

/**
 * Where an ISO date sits along the term, as a percentage of the way from
 * `TERM.start` to `TERM.end`, clamped to [0, 100].
 *
 * This is what gives the laptop term ruler *real date spacing* — ticks
 * positioned by elapsed time rather than spread evenly, so the October
 * crunch looks like a crunch. Note it is deliberately not the same clamp as
 * `termPct`, which floors at 2 so the progress fill is never invisible in
 * week 1: a deadline genuinely on the term's first day belongs at 0%.
 */
export function termPositionPct(isoDate: string): number {
  const termStart = day(TERM.start);
  return clamp(0, 100, ((day(isoDate) - termStart) / (day(TERM.end) - termStart)) * 100);
}

const TERM_START_LABEL = new Intl.DateTimeFormat('en-IE', { month: 'short', timeZone: 'UTC' });
const TERM_END_LABEL = new Intl.DateTimeFormat('en-IE', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/**
 * The term's span as the ruler caption states it — "Sept → 12 Dec".
 * Derived from `TERM` rather than typed out, so that editing
 * `schedule.data.ts` alone still changes every date on the page.
 */
export const TERM_SPAN_LABEL = `${TERM_START_LABEL.format(day(TERM.start))} \u2192 ${TERM_END_LABEL.format(day(TERM.end))}`;

/** Pluralises the countdown caption: "1 day left", "10 days left". */
export function daysLeftWord(daysLeft: number): string {
  return daysLeft === 1 ? 'day left' : 'days left';
}

/**
 * What the countdown says on the due date itself, in place of a literal
 * "0" (plan §1.2: a student opening the page on 16 October should not be
 * met with a large indigo zero). Exported so the panel — which renders the
 * number and its caption as two separately-styled pieces — and the sticky
 * mini-banner, which renders one string, cannot drift apart.
 */
export const DUE_TODAY = 'Due today';

/** The countdown as a single phrase: "10 days left", "1 day left", "Due today". */
export function countdownText(daysLeft: number, isDueToday: boolean): string {
  return isDueToday ? DUE_TODAY : `${daysLeft} ${daysLeftWord(daysLeft)}`;
}

const TODAY_LABEL = new Intl.DateTimeFormat('en-IE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Formats a `DerivedSchedule['today']` epoch for display ("6 Oct 2026").
 *
 * `timeZone: 'UTC'` is not optional here: `today` is a *Dublin civil date*
 * already normalised to UTC midnight, so formatting it in any other zone
 * would shift it back a day for anyone west of Greenwich — reintroducing
 * exactly the off-by-one this module exists to prevent.
 */
export function formatTodayLabel(today: number): string {
  return TODAY_LABEL.format(today);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolves the `?date=YYYY-MM-DD` preview override (plan §4.1 / decision 6)
 * to the `now` that should be fed to `deriveSchedule`, falling back to
 * `now` (the real clock) for a missing, malformed or impossible value. The
 * override is a testing affordance, not a feature: anything it cannot make
 * sense of degrades silently to today rather than erroring, so a mistyped
 * link still shows a correct page.
 *
 * Two details that are load-bearing:
 *
 * - **Noon UTC**, not midnight. The returned instant is only ever read back
 *   through `dublinToday`, and noon UTC lands inside the same Dublin
 *   calendar day at either offset the country uses (UTC+0 / UTC+1), so the
 *   requested date is the date you get all year round.
 * - **The round-trip check.** `new Date('2026-02-30T12:00:00Z')` does not
 *   throw and is not `Invalid Date`; JS rolls it over to 2 March. Verified,
 *   not assumed. Re-formatting the parsed instant and comparing it against
 *   the input string is what rejects impossible calendar dates.
 */
export function parsePreviewDate(
  param: string | string[] | undefined,
  now: Date = new Date(),
): Date {
  const iso = Array.isArray(param) ? param[0] : param;
  if (!iso || !ISO_DATE.test(iso)) return now;

  const parsed = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return now;
  if (parsed.toISOString().slice(0, 10) !== iso) return now;

  return parsed;
}
