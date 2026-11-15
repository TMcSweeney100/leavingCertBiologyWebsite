import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { dateShortcuts, groupTimeline, monthWeeks, nextUp, rangeFor, rangeLabel, relativeDay, schoolYear, stageNumber, stepFrom, toIsoDate, weekday, weekDays, weekSummary } from './timeline.ts';

const TODAY = '2026-10-14'; // a Wednesday

describe('rangeFor', () => {
  test('defaults to the timeline: this week\'s Monday to the end of the school year', () => {
    assert.deepEqual(rangeFor({}, TODAY), { view: 'timeline', from: '2026-10-12', to: '2027-08-31' });
  });

  test('a timeline with a from starts exactly there (Show earlier)', () => {
    assert.deepEqual(rangeFor({ view: 'timeline', from: '2026-09-01' }, TODAY), { view: 'timeline', from: '2026-09-01', to: '2027-08-31' });
  });

  test('late in the summer the timeline still reaches 12 weeks ahead', () => {
    assert.equal(rangeFor({}, '2027-08-10').to, '2027-11-02');
  });

  test('a week runs Monday to Sunday around from, and a month is the calendar month', () => {
    assert.deepEqual(rangeFor({ view: 'week', from: '2026-10-14' }, TODAY), { view: 'week', from: '2026-10-12', to: '2026-10-18' });
    assert.deepEqual(rangeFor({ view: 'month', from: '2026-02-17' }, TODAY), { view: 'month', from: '2026-02-01', to: '2026-02-28' });
  });

  test('an old list link, or anything malformed, is the timeline', () => {
    assert.equal(rangeFor({ view: 'list' }, TODAY).view, 'timeline');
    assert.deepEqual(rangeFor({ view: 'year', from: '2026-02-30' }, TODAY), { view: 'timeline', from: '2026-10-12', to: '2027-08-31' });
  });
});

describe('stepFrom', () => {
  test('moves a week or a month', () => {
    assert.equal(stepFrom({ view: 'week', from: '2026-10-12', to: '2026-10-18' }, -1), '2026-10-05');
    assert.equal(stepFrom({ view: 'month', from: '2026-12-01', to: '2026-12-31' }, 1), '2027-01-01');
    assert.equal(stepFrom({ view: 'month', from: '2027-01-01', to: '2027-01-31' }, -1), '2026-12-01');
  });
});

describe('the planner helpers', () => {
  const item = (date: string, over = {}) => ({ date, kind: 'PERSONAL', done: false, ...over });

  test('the school year runs September to August', () => {
    assert.deepEqual(schoolYear('2026-10-14'), { start: '2026-09-01', end: '2027-08-31' });
    assert.deepEqual(schoolYear('2027-03-02'), { start: '2026-09-01', end: '2027-08-31' });
  });

  test('groups into this week, next week, then months with their year', () => {
    const groups = groupTimeline([item('2026-10-12'), item('2026-10-16'), item('2026-10-20'), item('2026-10-29'), item('2027-01-04')], TODAY);
    assert.deepEqual(groups.map((g) => [g.label, g.sub, g.items.length]), [
      ['This week', '12–18 Oct', 2],
      ['Next week', '19–25 Oct', 1],
      ['October 2026', null, 1],
      ['January 2027', null, 1],
    ]);
  });

  test('next up is the first thing from today that is not done, then the three after it', () => {
    const items = [item('2026-10-13'), item('2026-10-14', { done: true }), item('2026-10-15'), item('2026-10-16'), item('2026-10-17'), item('2026-10-18'), item('2026-10-19')];
    const { next, then } = nextUp(items, TODAY);
    assert.equal(next?.date, '2026-10-15');
    assert.deepEqual(then.map((i) => i.date), ['2026-10-16', '2026-10-17', '2026-10-18']);
    assert.equal(nextUp([], TODAY).next, undefined);
  });

  test('a week\'s seven days, and its summary sentence', () => {
    assert.deepEqual(weekDays('2026-10-12'), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
    const week = [item('2026-10-12', { done: true }), item('2026-10-13'), item('2026-10-14', { kind: 'TEACHER_ITEM' }), item('2026-10-15', { kind: 'STAGE' })];
    assert.equal(weekSummary(week), 'This week: 2 of your own, 1 done · 1 from your teacher · 1 coursework date');
    assert.equal(weekSummary([]), 'Nothing this week yet.');
  });

  test('date shortcuts: today, tomorrow, next Monday', () => {
    assert.deepEqual(dateShortcuts(TODAY), [
      { label: 'Today', date: '2026-10-14' },
      { label: 'Tomorrow', date: '2026-10-15' },
      { label: 'Next Monday', date: '2026-10-19' },
    ]);
  });

  test('a stage label gives its number', () => {
    assert.equal(stageNumber('Stage 4'), '4');
    assert.equal(stageNumber(null), null);
  });
});

describe('relativeDay', () => {
  test('in words', () => {
    assert.equal(relativeDay(TODAY, '2026-10-14'), 'today');
    assert.equal(relativeDay(TODAY, '2026-10-15'), 'tomorrow');
    assert.equal(relativeDay(TODAY, '2026-10-13'), 'yesterday');
    assert.equal(relativeDay(TODAY, '2026-10-17'), 'in 3 days');
    assert.equal(relativeDay(TODAY, '2026-10-12'), '2 days ago');
  });
});

describe('labels and grids', () => {
  test('range labels', () => {
    assert.equal(rangeLabel({ view: 'week', from: '2026-10-12', to: '2026-10-18' }), '12–18 Oct 2026');
    assert.equal(rangeLabel({ view: 'month', from: '2026-12-01', to: '2026-12-31' }), 'December 2026');
  });

  test('weekday and today as an ISO date', () => {
    assert.equal(weekday('2026-10-16'), 'Fri 16 Oct');
    assert.equal(toIsoDate(Date.parse('2026-10-16T00:00:00Z')), '2026-10-16');
  });

  test('a month grid is whole Monday-to-Sunday weeks', () => {
    const weeks = monthWeeks({ view: 'month', from: '2026-12-01', to: '2026-12-31' });
    assert.equal(weeks[0][0], '2026-11-30');
    assert.equal(weeks.at(-1)!.at(-1), '2027-01-03');
    assert.ok(weeks.every((w) => w.length === 7));
  });
});
