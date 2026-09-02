/**
 * Proves `resolveClass(NWETSS_HANLON)` reproduces `schedule.data.ts`'s
 * exports exactly, apart from the two intentional copy changes below (D5,
 * D6). This is the safety net for the whole data split: nothing on the site
 * depends on the new shape yet, so any mismatch here is a bug in
 * `resolveClass`, not a downstream regression.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES,
  HEADER,
  SCHOOL,
  SEC_DEADLINE,
  REPORT_SECTIONS,
  REPORT_RULES,
  MARK_BANDS,
  MARKS_TOTAL,
  COMPLETED_STRIP,
  POST_TERM,
  type Stage,
} from './schedule.data.ts';
import { resolveClass } from './class-resolve.ts';
import { NWETSS_HANLON } from './classes/nwetss-hanlon.ts';

const resolved = resolveClass(NWETSS_HANLON);

// D6: deriving weekRange from the term and each stage's own date reproduces
// every existing range exactly except Stage 6, where the literal
// "Weeks 12-14" turns out to be wrong — the term ruler already shows
// "Week 15 of 15" on 11 December, so the literal and the ruler silently
// disagreed. "Weeks 12-15" is the correct one.
const EXPECTED_STAGES: Stage[] = STAGES.map((stage) =>
  stage.id === 'stage-6' ? { ...stage, weekRange: 'Weeks 12-15' } : stage,
);

// D5: the old note undercounts the buffer by a week ("ten" instead of
// "eleven" — 77 days from Stage 6's due date to the SEC deadline is exactly
// eleven weeks). resolveClass computes this from the class's own dates
// rather than storing it as a literal.
const EXPECTED_SEC_NOTE =
  'Coursework must be completed and submitted to your class teacher by this date. ' +
  'Finishing on 11-12 December leaves roughly eleven weeks of buffer.';

describe('resolveClass(NWETSS_HANLON) matches schedule.data.ts', () => {
  test("stages deep-equal, apart from Stage 6's corrected week range (D6)", () => {
    assert.deepStrictEqual(resolved.stages, EXPECTED_STAGES);
  });

  test('header matches HEADER byte-for-byte (D1)', () => {
    assert.deepStrictEqual(resolved.header, HEADER);
  });

  test('secDeadline.note is the corrected string (D5)', () => {
    assert.equal(resolved.secDeadline.note, EXPECTED_SEC_NOTE);
  });

  test('secDeadline date/label/disclaimer unchanged', () => {
    assert.equal(resolved.secDeadline.date, SEC_DEADLINE.date);
    assert.equal(resolved.secDeadline.label, SEC_DEADLINE.label);
    assert.equal(resolved.secDeadline.disclaimer, SEC_DEADLINE.disclaimer);
  });

  test('reportSections deep-equal', () => {
    assert.deepStrictEqual(resolved.reportSections, REPORT_SECTIONS);
  });

  test('reportRules deep-equal', () => {
    assert.deepStrictEqual(resolved.reportRules, REPORT_RULES);
  });

  test('markBands and marksTotal deep-equal', () => {
    assert.deepStrictEqual(resolved.markBands, MARK_BANDS);
    assert.equal(resolved.marksTotal, MARKS_TOTAL);
  });

  test('completedStrip matches', () => {
    assert.equal(resolved.completedStrip, COMPLETED_STRIP);
  });

  test('postTerm deep-equal', () => {
    assert.deepStrictEqual(resolved.postTerm, POST_TERM);
  });

  test('school/teacher match SCHOOL', () => {
    assert.equal(resolved.school.name, SCHOOL.name);
    assert.equal(resolved.teacher.label, SCHOOL.teacherLabel);
    assert.equal(resolved.teacher.name, SCHOOL.teacherName);
  });
});
