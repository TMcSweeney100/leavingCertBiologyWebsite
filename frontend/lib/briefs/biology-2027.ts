/**
 * BiPi 2026-27 brief — what the SEC decides. Shared by every Biology
 * teacher running this coursework this cohort; nothing in this file is
 * class- or teacher-specific (see `lib/classes/` for that half of the
 * split, spec §4.1). Editing this file changes the schedule for every
 * school running it at once.
 *
 * Moved from `schedule.data.ts` — SEC content only, with the four
 * per-class date fields (`dueDate`, `dueDateLabel`, `shortDate`,
 * `weekRange`) stripped off each stage; `lib/class-resolve.ts` derives
 * them back from a class's own dates.
 */
import type { Brief } from '../schedule.types.ts';

export const BIOLOGY_2027 = {
  subject: 'Biology',
  shortName: 'BiPi',
  cohort: '2026-27',
  title: 'Biology in Practice Investigation',
  topic: 'Membranes, Osmosis & Food Preservation',
  topicSummary: 'Six stages, seven report sections, one deadline.',
  gradeWeight: 40,
  nav: ['Right now', 'Timeline', 'Report sections', 'Report rules'],

  completedStrip:
    'Stages 1-2 completed in 5th Year — report sections §1 Title and Introduction and §2 Background Research already written.',

  secDeadline: {
    date: '2027-02-26',
    label: '26 February 2027',
    disclaimer: 'Class schedule — not an official SEC date. Dates set by your teacher for moderation.',
    noteLead: 'Coursework must be completed and submitted to your class teacher by this date.',
    bufferSentence: 'Finishing on {window} leaves roughly {weeks} weeks of buffer.',
  },

  /**
   * The draft hand-in. A milestone *inside* Stage 6, not a stage of its
   * own: it has a date and a done/upcoming state, but no report section, no
   * task list and no card. It appears on the laptop term ruler and in the
   * laptop "Term at a glance" aside, derived from one source (`rulerTicks`)
   * so the two can't drift. That is still laptop-only: on a phone in
   * November it remains visible only inside Stage 6's collapsed task list.
   */
  draft: {
    caption: 'Draft',
    glanceText: 'Full draft in for feedback',
  },

  /**
   * What the "You are here" panel says once the timeline is finished.
   *
   * `buffer` runs from the day after the last stage to the SEC deadline,
   * and `closed` runs after it. Both were previously rendered as
   * "Stage 6 · 0 days left", which was false in `buffer` and meaningless in
   * `closed`.
   *
   * The copy below is provisional and wants a sign-off from the class
   * teacher before it counts as final content — see `docs/HANDOFF.md`.
   */
  postTerm: {
    buffer: {
      eyebrow: 'Term complete',
      headline: 'All six stages complete',
      body: 'Your report is with your teacher. The remaining weeks are revision and buffer before the SEC submission deadline.',
      countdownCaption: 'to the SEC deadline',
    },
    closed: {
      eyebrow: 'Submitted',
      headline: 'Coursework submitted',
      body: 'The SEC submission deadline has passed. This schedule covered the 2026-27 cohort.',
      countdownCaption: '',
    },
  },

  /** Stage -> report-section crosswalk. All seven sections, always shown. */
  reportSections: [
    { section: '§1', name: 'Title and Introduction',     writtenDuring: 'Stages 1-2', dueBy: '5th Year',         alwaysDone: true },
    { section: '§2', name: 'Background Research',        writtenDuring: 'Stage 2',    dueBy: '5th Year',         alwaysDone: true },
    { section: '§3', name: 'Designing and Planning',     writtenDuring: 'Stage 3',    stageId: 'stage-3' },
    { section: '§4', name: 'Conducting the Experiment',  writtenDuring: 'Stage 4',    stageId: 'stage-4' },
    { section: '§5', name: 'Data and Data Analysis',     writtenDuring: 'Stage 5',    stageId: 'stage-5' },
    { section: '§6', name: 'Conclusions',                writtenDuring: 'Stage 5',    stageId: 'stage-5' },
    { section: '§7', name: 'References',                 writtenDuring: 'Stage 6',    stageId: 'stage-6' },
  ],

  /** Report rules, from the official SEC brief. Reference content — never changes mid-year. */
  reportRules: [
    { key: 'Length',       value: '1,500 words maximum. References, data tables, formulae and labels do not count.' },
    { key: 'Images',       value: '20 maximum, including photographs, graphs and diagrams.' },
    { key: 'Font',         value: 'Arial, black text only. No colour, no highlighting, no other fonts.' },
    { key: 'Headings',     value: '14pt bold. Each section starts on a new page.' },
    { key: 'Body text',    value: '12pt at 1.5 line spacing.' },
    { key: 'Margins',      value: '20mm on all four sides. Portrait orientation only.' },
    { key: 'Page numbers', value: 'Bottom centre of every page.' },
    { key: 'AI use',       value: 'Any use of AI tools must be declared. This is assessed as your own individual authentic work.' },
  ],

  markBands: [
    { band: 'A', marks: 50, covers: 'Title, Introduction, Background Research, References' },
    { band: 'B', marks: 50, covers: 'Designing and Planning, Conducting the Experiment' },
    { band: 'C', marks: 50, covers: 'Data and Data Analysis, Conclusions' },
    { band: 'D', marks: 50, covers: 'Scientific Literacy — assessed across the whole report, not as its own section' },
  ],
  marksTotal: 200,

  datedStageIds: ['stage-3', 'stage-4', 'catchup', 'stage-5', 'stage-6'] as const,

  stages: [
    {
      id: 'stage-1', order: 1, label: 'Stage 1',
      title: 'Initial Response to the Brief',
      dueDate: '2026-05-29', dueDateLabel: 'Completed in 5th Year', shortDate: '5th Yr',
      alwaysDoneWeekRange: '5th Year',
      reportSectionLabel: '§1', reportSectionName: 'Title and Introduction',
      description: 'Read the SEC brief on Membranes, Osmosis & Food Preservation and settle on the angle you want to investigate.',
      teacherCheckpoint: 'Signed off in 5th Year.',
      whatsDue: 'nothing further — signed off last year.',
      whatGoodLooksLike: '', glanceText: '', tasks: [], isAlwaysDone: true,
    },
    {
      id: 'stage-2', order: 2, label: 'Stage 2',
      title: 'Background Research',
      dueDate: '2026-06-05', dueDateLabel: 'Completed in 5th Year', shortDate: '5th Yr',
      alwaysDoneWeekRange: '5th Year',
      reportSectionLabel: '§2', reportSectionName: 'Background Research',
      description: 'Secondary research gathered, evaluated and logged with full references.',
      teacherCheckpoint: 'Signed off in 5th Year.',
      whatsDue: 'nothing further — signed off last year.',
      whatGoodLooksLike: '', glanceText: '', tasks: [], isAlwaysDone: true,
    },
    {
      id: 'stage-3', order: 3, label: 'Stage 3',
      title: 'Designing & Planning the Experiment',
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
        'Decide now how you will record the data.',
      ],
    },
    {
      id: 'stage-4', order: 4, label: 'Stage 4',
      title: 'Conducting the Experiment',
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
        'Photograph the setup — images count towards your 20.',
      ],
    },
    {
      id: 'catchup', order: 5, label: 'Catch-up',
      title: 'Catch-up window',
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
        'Catch up §3 or §4 writing if you are behind.',
      ],
      isCatchup: true,
    },
    {
      id: 'stage-5', order: 6, label: 'Stage 5',
      title: 'Data Analysis & Conclusions',
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
        'State the limitations honestly — it earns marks.',
      ],
    },
    {
      id: 'stage-6', order: 7, label: 'Stage 6',
      title: 'Finalising the Report',
      labelShape: 'draft-and-final-window',
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
        'Proofread it aloud. You will hear what you cannot see.',
      ],
    },
  ],
} satisfies Brief;
