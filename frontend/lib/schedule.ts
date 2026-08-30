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
import { STAGES, TERM, type Stage, type StageState } from './schedule.data.ts';

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

export type DerivedSchedule = {
  /** Today's civil date in Dublin, as a UTC-midnight epoch (ms). */
  today: number;
  /** Every stage, in order, each annotated with its derived state. */
  stages: StageWithState[];
  /** The stage currently in focus (falls back to the last stage once the term ends). */
  currentStage: StageWithState;
  /** Days remaining until `currentStage`'s due date. Never negative. */
  daysLeft: number;
  /** Percentage through the term, clamped to [2, 100]. */
  termPct: number;
  /** Week number of the term, clamped to [1, 15]. */
  weekNumber: number;
};

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
  const termStart = day(TERM.start);
  const termEnd = day(TERM.end);

  return {
    today,
    stages,
    currentStage,
    daysLeft: Math.max(0, Math.round((day(currentStage.dueDate) - today) / MS_PER_DAY)),
    termPct: clamp(2, 100, Math.round(((today - termStart) / (termEnd - termStart)) * 100)),
    weekNumber: clamp(1, 15, Math.floor((today - termStart) / (7 * MS_PER_DAY)) + 1),
  };
}
