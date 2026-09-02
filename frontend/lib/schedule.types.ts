/**
 * Shared types for the schedule domain: the SEC-decided `Brief`, the
 * per-teacher `ClassConfig`, and `ResolvedClass` — the merge of the two that
 * `deriveSchedule` and every component actually consume.
 *
 * The load-bearing idea (spec §4.1): the data divides along what the SEC
 * decides versus what a teacher decides. A teacher varies dates and
 * identity; everything else — stage names, task lists, report sections,
 * rules, mark bands — comes from the brief and is identical in every school
 * in the country.
 */

export type StageState = 'done' | 'current' | 'upcoming';

export type Stage = {
  id: string;
  order: number;
  label: string;            // "Stage 3" — shown in the eyebrow and stepper
  title: string;
  weekRange: string;        // "Weeks 1-4"
  dueDate: string;          // ISO — drives current-stage detection and the countdown
  dueDateLabel: string;     // human string shown on the card
  shortDate: string;        // stepper / ruler / aside
  reportSectionLabel: string;   // "§3" or "§5 · §6" or "—"
  reportSectionName: string;
  description: string;
  teacherCheckpoint: string;
  whatsDue: string;         // used by the "You are here" panel: "Due <date>: <whatsDue>"
  whatGoodLooksLike: string;
  /** One line for the aside's "Term at a glance". Empty for the two 5th-Year stages, which produce no tick. */
  glanceText: string;
  tasks: string[];
  isCatchup?: boolean;
  isAlwaysDone?: boolean;   // Stages 1-2: completed in 5th Year, never date-derived
};

/** D4: Stage 6's dueDateLabel is a shape flag, not a per-class string. */
export type LabelShape = 'draft-and-final-window';

/**
 * A stage as the brief states it — everything about a stage except the four
 * fields a class's own dates and `resolveClass` produce (D1-D6).
 *
 * `dueDate`/`dueDateLabel`/`shortDate` come back as optional rather than
 * fully dropped: `isAlwaysDone` stages (1-2) have no date this term, so
 * their values are historical literals carried straight through from the
 * brief, exactly like `alwaysDoneWeekRange` is for `weekRange`. Every other
 * stage leaves all four unset and gets them computed in `resolveClass`.
 */
export type BriefStage = Omit<Stage, 'dueDate' | 'dueDateLabel' | 'shortDate' | 'weekRange'> & {
  dueDate?: string;
  dueDateLabel?: string;
  shortDate?: string;
  labelShape?: LabelShape;
  alwaysDoneWeekRange?: string;
};

/**
 * One row of the report-section crosswalk, as the brief writes it.
 *
 * `REPORT_SECTIONS`-shaped rows carry `alwaysDone` or `stageId` — this
 * widens both shapes into one, with the two distinguishing fields optional.
 */
export type ReportSectionRow = {
  section: string;
  name: string;
  writtenDuring: string;
  /**
   * Optional: rows that map to a stage (`stageId`) leave this unset and take
   * the stage's own `dueDateLabel` instead. Only the two `alwaysDone`
   * 5th-Year rows, which have no stage to read a date from, carry a literal
   * here.
   */
  dueBy?: string;
  alwaysDone?: boolean;
  stageId?: string;
};

export type ReportRule = { key: string; value: string };
export type MarkBand = { band: string; marks: number; covers: string };

/**
 * What the "You are here" panel says once the timeline is finished — one
 * entry for the SEC-deadline buffer, one for after it closes. See
 * `postTermCopy` in `schedule.ts` for why the phase-to-entry mapping lives
 * in one place.
 */
export type PostTermCopy = {
  eyebrow: string;
  headline: string;
  body: string;
  countdownCaption: string;
};

/**
 * What the SEC decides for this subject and cohort. Shared by every class
 * running the same brief — editing this file changes the schedule for every
 * school at once (spec §4.1).
 */
export type Brief = {
  subject: string;
  shortName: string;
  cohort: string;
  title: string;
  topic: string;
  topicSummary: string;
  gradeWeight: number;
  nav: readonly string[];
  completedStrip: string;
  secDeadline: {
    date: string;
    label: string;
    disclaimer: string;
    /** D5: the note's fixed first sentence. */
    noteLead: string;
    /**
     * D5: template for the note's second sentence, filled in by
     * `resolveClass` with the class-derived final-window label and buffer
     * length. Placeholders: `{window}`, `{weeks}`.
     */
    bufferSentence: string;
  };
  /** The draft hand-in's generic copy — its date is per-class (D4). */
  draft: {
    caption: string;
    glanceText: string;
  };
  postTerm: {
    buffer: PostTermCopy;
    closed: PostTermCopy;
  };
  reportSections: readonly ReportSectionRow[];
  reportRules: readonly ReportRule[];
  markBands: readonly MarkBand[];
  marksTotal: number;
  /** The stage ids a `ClassConfig` must supply a due date for (D8). */
  datedStageIds: readonly string[];
  stages: readonly BriefStage[];
};

/**
 * What a teacher decides: identity, dates, and which brief this class runs.
 * `dueDates` is keyed off the brief's own `datedStageIds`, so a config built
 * against a specific brief that forgets a stage date fails to compile (D8).
 */
export type ClassConfig<B extends Brief = Brief> = {
  slug: string;
  brief: B;
  school: { name: string; crest?: string };
  teacher: { label: string; name: string };
  term: { start: string; end: string; weeks: number };
  dueDates: Record<B['datedStageIds'][number], string>;
  draftDate: string;
  /** Unused until Phase C's `.ics` `SEQUENCE` (spec §5.1). */
  revision: number;
  /** Excluded from the sitemap and served non-indexable when `false` (D2). */
  listed: boolean;
};

/** The merged result of a `ClassConfig` and its `Brief` — brief content plus resolved dates and header strings. */
export type ResolvedClass = {
  slug: string;
  school: { name: string; crest?: string };
  teacher: { label: string; name: string };
  term: { start: string; end: string; weeks: number };
  draft: { date: string; shortDate: string; caption: string; glanceText: string };
  secDeadline: { date: string; label: string; note: string; disclaimer: string };
  header: {
    eyebrow: string;
    eyebrowMobile: string;
    title: string;
    standfirst: string;
    gradeChip: string;
    gradeChipMobile: string;
    nav: readonly string[];
  };
  stages: Stage[];
  reportSections: readonly ReportSectionRow[];
  reportRules: readonly ReportRule[];
  markBands: readonly MarkBand[];
  marksTotal: number;
  completedStrip: string;
  postTerm: {
    buffer: PostTermCopy;
    closed: PostTermCopy;
  };
  /** Tick id ('draft', or a stage id) -> its "Term at a glance" one-liner. */
  glanceText: Map<string, string>;
};
