/**
 * `resolveClass` — merges a `ClassConfig` with its `Brief` into a
 * `ResolvedClass`: brief content plus every date-derived label a class's own
 * dates produce (D1, D3, D4, D5, D6).
 *
 * Date helpers here are local and UTC-only, the same technique
 * `schedule.ts` uses for its own date arithmetic (`Date.parse(iso +
 * 'T00:00:00Z')`) — deliberately not imported from there, to avoid a cycle
 * between the two files.
 */
import type { ClassConfig, ResolvedClass, Stage } from './schedule.types.ts';

const MS_PER_DAY = 86_400_000;

const day = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const clamp = (min: number, max: number, value: number): number => Math.min(max, Math.max(min, value));

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// D3: dueDateLabel uses "Sept" for September (the one non-standard
// abbreviation); shortDate uses the standard "Sep". No single `Intl` short
// format produces both, and the exact strings ICU emits vary by
// Node/ICU version — so both are fixed lookup tables, indexed off the UTC
// date, kept deterministic and TZ-independent.
const MONTHS_LONG = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Full month names, only needed for the SEC-deadline note's buffer sentence
// (D5), which reads "11-12 December" rather than either abbreviation above.
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];

function dateParts(iso: string) {
  const d = new Date(day(iso));
  return { weekday: d.getUTCDay(), date: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() };
}

/** "Fri 25 Sept 2026" — the general dueDateLabel format (D3). */
function longDateLabel(iso: string): string {
  const p = dateParts(iso);
  return `${WEEKDAYS[p.weekday]} ${p.date} ${MONTHS_LONG[p.month]} ${p.year}`;
}

/** "25 Sep" — shortDate format (D3). */
function shortDateOf(iso: string): string {
  const p = dateParts(iso);
  return `${p.date} ${MONTHS_SHORT[p.month]}`;
}

/** "Draft 4 Dec → final 11-12 Dec" — Stage 6's labelShape (D4). */
function draftAndFinalWindowLabel(draftIso: string, dueIso: string): string {
  const due = dateParts(dueIso);
  return `Draft ${shortDateOf(draftIso)} → final ${due.date}-${due.date + 1} ${MONTHS_SHORT[due.month]}`;
}

/** "11-12 December" — the SEC-deadline note's final-window label (D5). */
function bufferWindowLabel(dueIso: string): string {
  const due = dateParts(dueIso);
  return `${due.date}-${due.date + 1} ${MONTHS_FULL[due.month]}`;
}

function weeksWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

/** clamp(1, term.weeks, floor((date - term.start) / 7 days) + 1) — D6. */
function weekOf(iso: string, term: { start: string; weeks: number }): number {
  return clamp(1, term.weeks, Math.floor((day(iso) - day(term.start)) / (7 * MS_PER_DAY)) + 1);
}

export function resolveClass(config: ClassConfig): ResolvedClass {
  const brief = config.brief;

  let previousWeek = 0;
  const stages: Stage[] = brief.stages.map((stage) => {
    const { labelShape, alwaysDoneWeekRange, dueDate, dueDateLabel, shortDate, ...rest } = stage;

    if (stage.isAlwaysDone) {
      // D6: no date this term, so weekRange (and the other three) are
      // literals carried straight through from the brief.
      return {
        ...rest,
        dueDate: dueDate!,
        dueDateLabel: dueDateLabel!,
        shortDate: shortDate!,
        weekRange: alwaysDoneWeekRange!,
      };
    }

    const resolvedDueDate = config.dueDates[stage.id];
    const weekEnd = weekOf(resolvedDueDate, config.term);
    const weekRange = `Weeks ${previousWeek + 1}-${weekEnd}`;
    previousWeek = weekEnd;

    const resolvedDueDateLabel =
      labelShape === 'draft-and-final-window'
        ? draftAndFinalWindowLabel(config.draftDate, resolvedDueDate)
        : longDateLabel(resolvedDueDate);

    return {
      ...rest,
      dueDate: resolvedDueDate,
      dueDateLabel: resolvedDueDateLabel,
      shortDate: shortDateOf(resolvedDueDate),
      weekRange,
    };
  });

  // D5: the buffer runs from the last dated stage's due date to the SEC
  // deadline. `datedStageIds` is chronological, so its last entry is that
  // stage.
  const lastDatedId = brief.datedStageIds[brief.datedStageIds.length - 1];
  const lastDueDate = config.dueDates[lastDatedId];
  const bufferDays = Math.round((day(brief.secDeadline.date) - day(lastDueDate)) / MS_PER_DAY);
  const bufferWeeks = Math.round(bufferDays / 7);
  const bufferSentence = brief.secDeadline.bufferSentence
    .replace('{window}', bufferWindowLabel(lastDueDate))
    .replace('{weeks}', weeksWord(bufferWeeks));

  const secDeadline = {
    date: brief.secDeadline.date,
    label: brief.secDeadline.label,
    note: `${brief.secDeadline.noteLead} ${bufferSentence}`,
    disclaimer: brief.secDeadline.disclaimer,
  };

  // D1: header copy is assembled from brief primitives, not stored as strings.
  const header = {
    eyebrow: `${brief.shortName} ${brief.cohort} · class schedule`,
    eyebrowMobile: `${brief.shortName} ${brief.cohort}`,
    title: brief.title,
    standfirst: `${brief.topic}. ${brief.topicSummary}`,
    gradeChip: `${brief.gradeWeight}% of the ${brief.subject} grade`,
    gradeChipMobile: `${brief.gradeWeight}% of grade`,
    nav: brief.nav,
  };

  const draft = {
    date: config.draftDate,
    shortDate: shortDateOf(config.draftDate),
    caption: brief.draft.caption,
    glanceText: brief.draft.glanceText,
  };

  const glanceText = new Map<string, string>([
    ...stages.map((s) => [s.id, s.glanceText] as const),
    ['draft', draft.glanceText],
  ]);

  return {
    slug: config.slug,
    school: config.school,
    teacher: config.teacher,
    term: config.term,
    draft,
    secDeadline,
    header,
    stages,
    reportSections: brief.reportSections,
    reportRules: brief.reportRules,
    markBands: brief.markBands,
    marksTotal: brief.marksTotal,
    completedStrip: brief.completedStrip,
    postTerm: brief.postTerm,
    glanceText,
  };
}
