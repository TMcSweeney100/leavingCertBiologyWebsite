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
  DRAFT,
  REPORT_SECTIONS,
  SEC_DEADLINE,
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

/**
 * Which of the schedule's three lives the page is in.
 *
 * The site spends longer in `buffer` than most of the term — 12 December to
 * 26 February is 76 days — so this is not an edge case to degrade
 * gracefully into. It is a first-class state with its own copy, and it
 * exists because clamping the countdown at zero left the largest element on
 * the page reading "0 days left" for eleven weeks while the footer
 * advertised a deadline the page refused to count toward.
 */
export type SchedulePhase = 'in-term' | 'buffer' | 'closed';

/**
 * One mark on the laptop term ruler. Built here rather than derived inside
 * `term-ruler.tsx` so that the ruler, the aside's "Term at a glance" and
 * (in Phase C) the calendar feed all read one array and cannot drift.
 */
export type RulerTick = {
  id: string;
  /** ISO date, for `termPositionPct` and the calendar feed. */
  date: string;
  shortDate: string;
  /** The second label line: "St 3", "Catch-up", "Draft". */
  caption: string;
  state: StageState;
};

export type DerivedSchedule = {
  /** Today's civil date in Dublin, as a UTC-midnight epoch (ms). */
  today: number;
  /** Which of the schedule's three lives the page is in. */
  phase: SchedulePhase;
  /** Every stage, in order, each annotated with its derived state. */
  stages: StageWithState[];
  /**
   * The stage in progress, or `null` once the last one's due date passes.
   *
   * Nullable on purpose. Every consumer that renders "the current stage"
   * must decide what to show in `buffer` and `closed`, and a non-null type
   * pointing at a finished Stage 6 would let them all silently render it as
   * live — which is exactly the bug this phase exists to fix.
   */
  currentStage: StageWithState | null;
  /**
   * Days to whichever deadline is live: the current stage's in `in-term`,
   * the SEC deadline in `buffer`, and zero in `closed`. Never negative.
   */
  daysLeft: number;
  /**
   * True only on the live deadline's due date itself. `daysLeft === 0` is
   * NOT the same test: in `closed` the countdown has nothing left to point
   * at and reads zero every day, which would read as "Due today" forever if
   * copy branched on the countdown alone. It now tracks whichever deadline
   * is live for the current phase — the current stage's due date in
   * `in-term`, the SEC deadline in `buffer` — and is unconditionally false
   * in `closed`.
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
  /** The laptop term ruler's marks: stage deadlines plus the draft. */
  rulerTicks: RulerTick[];
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
 * The ruler's marks: every stage that has a real deadline this term, plus
 * the draft milestone, in date order.
 *
 * The draft is never `current`. `--bipi-now` is reserved for the stage in
 * progress and for today's marker — a second indigo mark inside Stage 6
 * would break the one discipline that keeps a page this dense legible. It
 * stays `upcoming` through its own date and flips to `done` the morning
 * after, which is the same rule stages follow.
 */
function buildRulerTicks(stages: StageWithState[], today: number): RulerTick[] {
  const ticks: RulerTick[] = stages
    .filter((stage) => !stage.isAlwaysDone)
    .map((stage) => ({
      id: stage.id,
      date: stage.dueDate,
      shortDate: stage.shortDate,
      caption: stage.isCatchup ? 'Catch-up' : stage.label.replace('Stage ', 'St '),
      state: stage.state,
    }));

  ticks.push({
    id: 'draft',
    date: DRAFT.date,
    shortDate: DRAFT.shortDate,
    caption: DRAFT.caption,
    state: today > day(DRAFT.date) ? 'done' : 'upcoming',
  });

  return ticks.sort((a, b) => day(a.date) - day(b.date));
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
  const lastStage = STAGES[STAGES.length - 1];
  const secDay = day(SEC_DEADLINE.date);

  const phase: SchedulePhase =
    today <= day(lastStage.dueDate) ? 'in-term' : today <= secDay ? 'buffer' : 'closed';

  // Guaranteed to find a stage while `in-term` — the phase test above is
  // precisely the condition that the last stage has not passed — so the -1
  // fallback the old code needed is gone. Outside `in-term` there is no
  // current stage at all, which is what `-1` means here.
  const currentIndex =
    phase === 'in-term' ? STAGES.findIndex((s) => !s.isAlwaysDone && day(s.dueDate) >= today) : -1;

  const stages: StageWithState[] = STAGES.map((stage, index) => ({
    ...stage,
    state:
      stage.isAlwaysDone || currentIndex === -1 || index < currentIndex
        ? 'done'
        : index === currentIndex
          ? 'current'
          : 'upcoming',
  }));

  const currentStage = currentIndex === -1 ? null : stages[currentIndex];
  const comingUp = currentIndex === -1 ? [] : stages.slice(currentIndex + 1);
  const termStart = day(TERM.start);
  const termEnd = day(TERM.end);

  // The day the live countdown points at. In `closed` there is no live
  // deadline, so it resolves to today — which yields zero days left, and is
  // why `isDueToday` has to exclude `closed` explicitly rather than just
  // comparing the two.
  const deadlineDay =
    phase === 'in-term' ? day(currentStage!.dueDate) : phase === 'buffer' ? secDay : today;

  return {
    today,
    phase,
    stages,
    currentStage,
    daysLeft: Math.max(0, Math.round((deadlineDay - today) / MS_PER_DAY)),
    isDueToday: phase !== 'closed' && deadlineDay === today,
    nextStage: comingUp[0] ?? null,
    comingUp,
    reportSections: reportSectionStatuses(stages),
    termPct: clamp(2, 100, Math.round(((today - termStart) / (termEnd - termStart)) * 100)),
    weekNumber: clamp(1, 15, Math.floor((today - termStart) / (7 * MS_PER_DAY)) + 1),
    rulerTicks: buildRulerTicks(stages, today),
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
