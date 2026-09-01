/**
 * BiPi Schedule Hub — all schedule content in one place.
 * Editing this file (and nothing else) should be enough to reuse the site next year.
 *
 * Dates are Irish school-term dates for the 2026/27 Leaving Cert cohort.
 * The SEC submission deadline (26 Feb 2027) is NOT in this list — it is the
 * footer constant below, because it is not a class stage.
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

export const TERM = { start: '2026-09-01', end: '2026-12-12', weeks: 15 };

/**
 * The draft hand-in. A milestone *inside* Stage 6, not a stage of its own:
 * it has a date and a done/upcoming state, but no report section, no task
 * list and no card. It now appears on the laptop term ruler and in the
 * laptop "Term at a glance" aside (`TermRuler` inside `you-are-here.tsx`
 * and `Aside`, both `hidden lg:block` / `hidden lg:grid`), derived from
 * one source (`rulerTicks`) so the two can't drift. That is still
 * laptop-only: on a phone in November it remains visible only inside
 * Stage 6's collapsed task list, exactly as before.
 */
export const DRAFT = {
  date: '2026-12-04',
  shortDate: '4 Dec',
  caption: 'Draft',
  glanceText: 'Full draft in for feedback',
};

export const SEC_DEADLINE = {
  date: '2027-02-26',
  label: '26 February 2027',
  note: 'Coursework must be completed and submitted to your class teacher by this date. Finishing on 11-12 December leaves roughly ten weeks of buffer.',
  disclaimer: 'Class schedule — not an official SEC date. Dates set by your teacher for moderation.'
};

/**
 * What the "You are here" panel says once the timeline is finished.
 *
 * `buffer` runs from the day after the last stage to the SEC deadline —
 * 76 days this year, longer than any single stage — and `closed` runs
 * after it. Both were previously rendered as "Stage 6 · 0 days left",
 * which was false in `buffer` and meaningless in `closed`.
 *
 * The copy below is provisional and wants a sign-off from the class
 * teacher (Katelyn) before it counts as final content — it lives here
 * precisely so that approving different wording is a one-line change.
 */
export const POST_TERM = {
  buffer: {
    eyebrow: 'Term complete',
    headline: 'All six stages complete',
    body: 'Your report is with your teacher. The remaining weeks are revision and buffer before the SEC submission deadline.',
    countdownCaption: 'to the SEC deadline'
  },
  closed: {
    eyebrow: 'Submitted',
    headline: 'Coursework submitted',
    body: 'The SEC submission deadline has passed. This schedule covered the 2026-27 cohort.',
    countdownCaption: ''
  }
};

/**
 * Who this schedule belongs to — the brand row at the very top of the header.
 * Here rather than hardcoded in site-header.tsx so that reusing the site for
 * another class or another year stays a one-file edit, like everything else
 * in this file.
 *
 * The crest is `public/nwetss-crest.png` — the school's own three-tile mark,
 * taken from nwetss.ie and trimmed to the artwork. The school *name* is set
 * as live text beside it rather than using the school's full logo lockup
 * (crest + wordmark as one image): text scales with the rest of the page,
 * stays sharp in print, and is selectable, and the lockup's own typeface
 * would clash with the page's.
 */
export const SCHOOL = {
  name: 'North Wicklow Educate Together Secondary School',
  teacherLabel: 'Class teacher',
  teacherName: 'Katelyn Hanlon'
};

export const HEADER = {
  eyebrow: 'BiPi 2026-27 · class schedule',
  /** Mobile short form of `eyebrow` — the header band is too narrow for the long one below 1024px. */
  eyebrowMobile: 'BiPi 2026-27',
  title: 'Biology in Practice Investigation',
  standfirst: 'Membranes, Osmosis & Food Preservation. Six stages, seven report sections, one deadline.',
  gradeChip: '40% of the Biology grade',
  /** Mobile short form of `gradeChip`. */
  gradeChipMobile: '40% of grade',
  nav: ['Right now', 'Timeline', 'Report sections', 'Report rules']
};

export const COMPLETED_STRIP =
  'Stages 1-2 completed in 5th Year — report sections §1 Title and Introduction and §2 Background Research already written.';

export const STAGES: Stage[] = [
  {
    id: 'stage-1', order: 1, label: 'Stage 1',
    title: 'Initial Response to the Brief',
    weekRange: '5th Year', dueDate: '2026-05-29',
    dueDateLabel: 'Completed in 5th Year', shortDate: '5th Yr',
    reportSectionLabel: '§1', reportSectionName: 'Title and Introduction',
    description: 'Read the SEC brief on Membranes, Osmosis & Food Preservation and settle on the angle you want to investigate.',
    teacherCheckpoint: 'Signed off in 5th Year.',
    whatsDue: 'nothing further — signed off last year.',
    whatGoodLooksLike: '', glanceText: '', tasks: [], isAlwaysDone: true
  },
  {
    id: 'stage-2', order: 2, label: 'Stage 2',
    title: 'Background Research',
    weekRange: '5th Year', dueDate: '2026-06-05',
    dueDateLabel: 'Completed in 5th Year', shortDate: '5th Yr',
    reportSectionLabel: '§2', reportSectionName: 'Background Research',
    description: 'Secondary research gathered, evaluated and logged with full references.',
    teacherCheckpoint: 'Signed off in 5th Year.',
    whatsDue: 'nothing further — signed off last year.',
    whatGoodLooksLike: '', glanceText: '', tasks: [], isAlwaysDone: true
  },
  {
    id: 'stage-3', order: 3, label: 'Stage 3',
    title: 'Designing & Planning the Experiment',
    weekRange: 'Weeks 1-4', dueDate: '2026-09-25',
    dueDateLabel: 'Fri 25 Sept 2026', shortDate: '25 Sep',
    reportSectionLabel: '§3', reportSectionName: 'Designing and Planning',
    description: 'Research question, hypothesis, a fair test with one variable, equipment list and a written safety assessment — detailed enough that someone else could repeat it.',
    teacherCheckpoint: 'Your plan and safety assessment are signed off before any practical work begins.',
    whatsDue: 'your full experimental plan, equipment list and safety assessment.',
    whatGoodLooksLike: 'Another student could run your experiment from your method alone, without asking you a single question.',
    glanceText: 'Stage 3 due — §3 Designing and Planning',
    tasks: [
      'State the research question you are actually answering.',
      'Write a hypothesis that can be proved wrong.',
      'Name your independent, dependent and controlled variables.',
      'List equipment and quantities — the real ones, not the ideal ones.',
      'Write the method as numbered steps.',
      'Complete the safety assessment.',
      'Decide now how you will record the data.'
    ]
  },
  {
    id: 'stage-4', order: 4, label: 'Stage 4',
    title: 'Conducting the Experiment',
    weekRange: 'Weeks 5-7', dueDate: '2026-10-16',
    dueDateLabel: 'Fri 16 Oct 2026', shortDate: '16 Oct',
    reportSectionLabel: '§4', reportSectionName: 'Conducting the Experiment',
    description: 'Run the experiment and gather your primary data. All practical work is supervised by your teacher — data collected outside class cannot be used.',
    teacherCheckpoint: 'Lab slots are booked in class; your log is checked at the end of each session.',
    whatsDue: 'all primary data collected, with your method written up as you went.',
    whatGoodLooksLike: 'Raw data written down in the moment, with any change to the method noted as it happened — not reconstructed afterwards.',
    glanceText: 'Stage 4 due — §4 Conducting the Experiment',
    tasks: [
      'Run the experiment in supervised class time only.',
      'Record raw data as you go, in pen, in your log.',
      'Note every deviation from the plan and why.',
      'Repeat runs so the result is not a one-off.',
      'Photograph the setup — images count towards your 20.'
    ]
  },
  {
    id: 'catchup', order: 5, label: 'Catch-up',
    title: 'Catch-up window',
    weekRange: 'Weeks 8-9', dueDate: '2026-10-30',
    dueDateLabel: 'Fri 30 Oct 2026', shortDate: '30 Oct',
    reportSectionLabel: '—', reportSectionName: 'No new section due',
    description: 'A deliberate buffer for repeats, missed labs and anomalous results. Nothing new starts here.',
    teacherCheckpoint: 'Book a re-run slot with your teacher if your data needs it.',
    whatsDue: 'any repeat runs finished — this window exists so a bad result is not a crisis.',
    whatGoodLooksLike: 'Nothing outstanding. You walk into Stage 5 with a complete data set.',
    glanceText: 'Catch-up window closes',
    tasks: [
      'Repeat any run that failed or looks anomalous.',
      'Fill the gaps in your data table.',
      'Tidy the lab log while you still remember the session.',
      'Catch up §3 or §4 writing if you are behind.'
    ],
    isCatchup: true
  },
  {
    id: 'stage-5', order: 6, label: 'Stage 5',
    title: 'Data Analysis & Conclusions',
    weekRange: 'Weeks 10-11', dueDate: '2026-11-13',
    dueDateLabel: 'Fri 13 Nov 2026', shortDate: '13 Nov',
    reportSectionLabel: '§5 · §6', reportSectionName: 'Data and Data Analysis; Conclusions',
    description: 'Present your data in tables and graphs, analyse the pattern and the sources of error, then draw conclusions that answer your research question.',
    teacherCheckpoint: 'Bring your graphs to class for review before you write your conclusions.',
    whatsDue: 'data presented, analysed and concluded — two report sections in one go.',
    whatGoodLooksLike: 'Every claim in your conclusion traces back to a number in your table.',
    glanceText: 'Stage 5 due — §5 Data and Analysis, §6 Conclusions',
    tasks: [
      'Build clean data tables with units.',
      'Draw graphs — axes labelled, units stated, scale sensible.',
      'Describe the trend in words before you explain it.',
      'Identify sources of error and what each one did to your result.',
      'Write conclusions that answer the research question directly.',
      'State the limitations honestly — it earns marks.'
    ]
  },
  {
    id: 'stage-6', order: 7, label: 'Stage 6',
    title: 'Finalising the Report',
    weekRange: 'Weeks 12-14', dueDate: '2026-12-11',
    dueDateLabel: 'Draft 4 Dec → final 11-12 Dec', shortDate: '11 Dec',
    reportSectionLabel: '§7', reportSectionName: 'References + full clean-up',
    description: 'Full draft in for feedback on 4 Dec, then revise. Final pass: 1,500 words max, 20 images max, Arial 12pt at 1.5 spacing, references complete — including any AI use declared.',
    teacherCheckpoint: 'Your draft is read and returned with written comments the week of 4 Dec.',
    whatsDue: 'the finished report, proofed, formatted and referenced.',
    whatGoodLooksLike: 'It reads as one voice, formatted to the letter, with every source accounted for.',
    glanceText: 'Final report due — §7 References',
    tasks: [
      'Full draft handed in for feedback on 4 December.',
      'Act on every comment you get back.',
      'Check the word count — 1,500 words maximum.',
      'Check the image count — 20 maximum.',
      'Apply the formatting rules exactly (see below).',
      'Complete references, and declare any AI tool use.',
      'Proofread it aloud. You will hear what you cannot see.'
    ]
  }
];

/** Stage -> report-section crosswalk. All seven sections, always shown. */
export const REPORT_SECTIONS = [
  { section: '§1', name: 'Title and Introduction',     writtenDuring: 'Stages 1-2', dueBy: '5th Year',         alwaysDone: true },
  { section: '§2', name: 'Background Research',        writtenDuring: 'Stage 2',    dueBy: '5th Year',         alwaysDone: true },
  { section: '§3', name: 'Designing and Planning',     writtenDuring: 'Stage 3',    stageId: 'stage-3' },
  { section: '§4', name: 'Conducting the Experiment',  writtenDuring: 'Stage 4',    stageId: 'stage-4' },
  { section: '§5', name: 'Data and Data Analysis',     writtenDuring: 'Stage 5',    stageId: 'stage-5' },
  { section: '§6', name: 'Conclusions',                writtenDuring: 'Stage 5',    stageId: 'stage-5' },
  { section: '§7', name: 'References',                 writtenDuring: 'Stage 6',    stageId: 'stage-6' }
];

/** Report rules, from the official SEC brief. Reference content — never changes mid-year. */
export const REPORT_RULES = [
  { key: 'Length',       value: '1,500 words maximum. References, data tables, formulae and labels do not count.' },
  { key: 'Images',       value: '20 maximum, including photographs, graphs and diagrams.' },
  { key: 'Font',         value: 'Arial, black text only. No colour, no highlighting, no other fonts.' },
  { key: 'Headings',     value: '14pt bold. Each section starts on a new page.' },
  { key: 'Body text',    value: '12pt at 1.5 line spacing.' },
  { key: 'Margins',      value: '20mm on all four sides. Portrait orientation only.' },
  { key: 'Page numbers', value: 'Bottom centre of every page.' },
  { key: 'AI use',       value: 'Any use of AI tools must be declared. This is assessed as your own individual authentic work.' }
];

export const MARK_BANDS = [
  { band: 'A', marks: 50, covers: 'Title, Introduction, Background Research, References' },
  { band: 'B', marks: 50, covers: 'Designing and Planning, Conducting the Experiment' },
  { band: 'C', marks: 50, covers: 'Data and Data Analysis, Conclusions' },
  { band: 'D', marks: 50, covers: 'Scientific Literacy — assessed across the whole report, not as its own section' }
];
export const MARKS_TOTAL = 200;

/* ---------------------------------------------------------------------------
   Current-stage / phase detection is live logic, not content, so it is not
   documented here. See `deriveSchedule` in `lib/schedule.ts` for how these
   dates become `phase` ('in-term' | 'buffer' | 'closed'), `currentStage`
   (null outside `in-term`) and `daysLeft` (counts to the current stage's
   due date in `in-term`, to the SEC deadline in `buffer`, zero in `closed`).
--------------------------------------------------------------------------- */
