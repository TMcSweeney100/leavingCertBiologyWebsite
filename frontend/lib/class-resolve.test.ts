/**
 * Proves `resolveClass(NWETSS_HANLON)` produces exactly this content.
 *
 * Through Step 2 of the phase-B plan, this asserted equality against the
 * pre-split data file the site used to render from. That file is gone now
 * (Step 3), so the expected values below are inlined literals instead —
 * this test now pins the resolver's output directly rather than comparing
 * it to a predecessor.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { MarkBand, PostTermCopy, ReportRule, ReportSectionRow, Stage } from './schedule.types.ts';
import { resolveClass } from './class-resolve.ts';
import { deriveSchedule } from './schedule.ts';
import { NWETSS_HANLON } from './classes/nwetss-hanlon.ts';
import { DEMO_2027 } from './classes/demo-2027.ts';

const resolved = resolveClass(NWETSS_HANLON);
const resolvedDemo = resolveClass(DEMO_2027);

const EXPECTED_STAGES: Stage[] = [
  {
    id: 'stage-1', order: 1, label: 'Stage 1',
    title: 'Initial Response to the Brief',
    weekRange: '5th Year', dueDate: '2026-05-29',
    dueDateLabel: 'Completed in 5th Year', shortDate: '5th Yr',
    reportSectionLabel: '§1', reportSectionName: 'Title and Introduction',
    description: 'Read the SEC brief on Membranes, Osmosis & Food Preservation and settle on the angle you want to investigate.',
    teacherCheckpoint: 'Signed off in 5th Year.',
    whatsDue: 'nothing further — signed off last year.',
    whatGoodLooksLike: '', glanceText: '', tasks: [], isAlwaysDone: true,
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
    whatGoodLooksLike: '', glanceText: '', tasks: [], isAlwaysDone: true,
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
      'Decide now how you will record the data.',
    ],
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
      'Photograph the setup — images count towards your 20.',
    ],
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
      'Catch up §3 or §4 writing if you are behind.',
    ],
    isCatchup: true,
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
      'State the limitations honestly — it earns marks.',
    ],
  },
  {
    // D6: the term ruler already shows "Week 15 of 15" on 11 December —
    // "Weeks 12-15", not the pre-split literal "Weeks 12-14", is the value
    // that agrees with it.
    id: 'stage-6', order: 7, label: 'Stage 6',
    title: 'Finalising the Report',
    weekRange: 'Weeks 12-15', dueDate: '2026-12-11',
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
      'Proofread it aloud. You will hear what you cannot see.',
    ],
  },
];

const EXPECTED_HEADER = {
  eyebrow: 'BiPi 2026-27 · class schedule',
  eyebrowMobile: 'BiPi 2026-27',
  title: 'Biology in Practice Investigation',
  standfirst: 'Membranes, Osmosis & Food Preservation. Six stages, seven report sections, one deadline.',
  gradeChip: '40% of the Biology grade',
  gradeChipMobile: '40% of grade',
  nav: ['Right now', 'Timeline', 'Report sections', 'Report rules'],
};

// D5: 77 days from Stage 6's due date to the SEC deadline is exactly eleven
// weeks — the pre-split literal said "ten", which was simply wrong by a week.
const EXPECTED_SEC_NOTE =
  'Coursework must be completed and submitted to your class teacher by this date. ' +
  'Finishing on 11-12 December leaves roughly eleven weeks of buffer.';

const EXPECTED_REPORT_SECTIONS: ReportSectionRow[] = [
  { section: '§1', name: 'Title and Introduction',     writtenDuring: 'Stages 1-2', dueBy: '5th Year',         alwaysDone: true },
  { section: '§2', name: 'Background Research',        writtenDuring: 'Stage 2',    dueBy: '5th Year',         alwaysDone: true },
  { section: '§3', name: 'Designing and Planning',     writtenDuring: 'Stage 3',    stageId: 'stage-3' },
  { section: '§4', name: 'Conducting the Experiment',  writtenDuring: 'Stage 4',    stageId: 'stage-4' },
  { section: '§5', name: 'Data and Data Analysis',     writtenDuring: 'Stage 5',    stageId: 'stage-5' },
  { section: '§6', name: 'Conclusions',                writtenDuring: 'Stage 5',    stageId: 'stage-5' },
  { section: '§7', name: 'References',                 writtenDuring: 'Stage 6',    stageId: 'stage-6' },
];

const EXPECTED_REPORT_RULES: ReportRule[] = [
  { key: 'Length',       value: '1,500 words maximum. References, data tables, formulae and labels do not count.' },
  { key: 'Images',       value: '20 maximum, including photographs, graphs and diagrams.' },
  { key: 'Font',         value: 'Arial, black text only. No colour, no highlighting, no other fonts.' },
  { key: 'Headings',     value: '14pt bold. Each section starts on a new page.' },
  { key: 'Body text',    value: '12pt at 1.5 line spacing.' },
  { key: 'Margins',      value: '20mm on all four sides. Portrait orientation only.' },
  { key: 'Page numbers', value: 'Bottom centre of every page.' },
  { key: 'AI use',       value: 'Any use of AI tools must be declared. This is assessed as your own individual authentic work.' },
];

const EXPECTED_MARK_BANDS: MarkBand[] = [
  { band: 'A', marks: 50, covers: 'Title, Introduction, Background Research, References' },
  { band: 'B', marks: 50, covers: 'Designing and Planning, Conducting the Experiment' },
  { band: 'C', marks: 50, covers: 'Data and Data Analysis, Conclusions' },
  { band: 'D', marks: 50, covers: 'Scientific Literacy — assessed across the whole report, not as its own section' },
];

const EXPECTED_COMPLETED_STRIP =
  'Stages 1-2 completed in 5th Year — report sections §1 Title and Introduction and §2 Background Research already written.';

const EXPECTED_POST_TERM: { buffer: PostTermCopy; closed: PostTermCopy } = {
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
};

describe('resolveClass(NWETSS_HANLON)', () => {
  test('stages match exactly, including Stage 6\'s derived week range (D6)', () => {
    assert.deepStrictEqual(resolved.stages, EXPECTED_STAGES);
  });

  test('header matches exactly (D1)', () => {
    assert.deepStrictEqual(resolved.header, EXPECTED_HEADER);
  });

  test('secDeadline date/label/disclaimer match exactly', () => {
    assert.equal(resolved.secDeadline.date, '2027-02-26');
    assert.equal(resolved.secDeadline.label, '26 February 2027');
    assert.equal(
      resolved.secDeadline.disclaimer,
      'Class schedule — not an official SEC date. Dates set by your teacher for moderation.',
    );
  });

  test('secDeadline.note is the corrected string (D5)', () => {
    assert.equal(resolved.secDeadline.note, EXPECTED_SEC_NOTE);
  });

  test('reportSections match exactly', () => {
    assert.deepStrictEqual(resolved.reportSections, EXPECTED_REPORT_SECTIONS);
  });

  test('reportRules match exactly', () => {
    assert.deepStrictEqual(resolved.reportRules, EXPECTED_REPORT_RULES);
  });

  test('markBands and marksTotal match exactly', () => {
    assert.deepStrictEqual(resolved.markBands, EXPECTED_MARK_BANDS);
    assert.equal(resolved.marksTotal, 200);
  });

  test('completedStrip matches exactly', () => {
    assert.equal(resolved.completedStrip, EXPECTED_COMPLETED_STRIP);
  });

  test('postTerm matches exactly', () => {
    assert.deepStrictEqual(resolved.postTerm, EXPECTED_POST_TERM);
  });

  test('school and teacher match exactly', () => {
    assert.equal(resolved.school.name, 'North Wicklow Educate Together Secondary School');
    assert.equal(resolved.school.crest, '/crests/nwetss.png');
    assert.equal(resolved.teacher.label, 'Class teacher');
    assert.equal(resolved.teacher.name, 'Katelyn Hanlon');
  });
});

// Phase B's own test list (spec §6): one brief, two classes, provably
// different (D2).
describe('resolveClass(DEMO_2027) vs resolveClass(NWETSS_HANLON) — shared brief, distinct class', () => {
  test('share the brief: stage content, report sections, rules and mark bands are identical', () => {
    assert.deepStrictEqual(
      resolvedDemo.stages.map((s) => ({ id: s.id, title: s.title, description: s.description, tasks: s.tasks })),
      resolved.stages.map((s) => ({ id: s.id, title: s.title, description: s.description, tasks: s.tasks })),
    );
    assert.deepStrictEqual(resolvedDemo.reportSections, resolved.reportSections);
    assert.deepStrictEqual(resolvedDemo.reportRules, resolved.reportRules);
    assert.deepStrictEqual(resolvedDemo.markBands, resolved.markBands);
    assert.equal(resolvedDemo.marksTotal, resolved.marksTotal);
  });

  test('differ on everything class-specific: dates, labels, week ranges, identity', () => {
    const [demoStage3, klStage3] = [resolvedDemo.stages[2], resolved.stages[2]];
    assert.notEqual(demoStage3.dueDate, klStage3.dueDate);
    assert.notEqual(demoStage3.dueDateLabel, klStage3.dueDateLabel);
    assert.notEqual(demoStage3.shortDate, klStage3.shortDate);
    // Stage 6's weekRange is derived from the class's own term (D6), so it
    // differs too, not just the literal dates.
    assert.notEqual(resolvedDemo.stages[6].weekRange, resolved.stages[6].weekRange);
    assert.notEqual(resolvedDemo.school.name, resolved.school.name);
    assert.notEqual(resolvedDemo.teacher.name, resolved.teacher.name);
  });

  test('deriveSchedule on the same `now` gives different currentStage, daysLeft and weekNumber', () => {
    const now = new Date('2026-10-20T09:00:00Z');
    const kl = deriveSchedule(resolved, now);
    const demo = deriveSchedule(resolvedDemo, now);
    assert.notEqual(kl.currentStage?.id, demo.currentStage?.id);
    assert.notEqual(kl.daysLeft, demo.daysLeft);
    assert.notEqual(kl.weekNumber, demo.weekNumber);
  });

  test('demo-2027 resolves with no crest — the branch site-header.tsx has to handle', () => {
    assert.equal(resolvedDemo.school.crest, undefined);
  });
});
