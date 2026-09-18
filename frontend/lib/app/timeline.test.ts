import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { monthWeeks, rangeFor, rangeLabel, relativeDay, stepFrom, toIsoDate, weekday } from './timeline.ts';

const TODAY = '2026-10-14'; // a Wednesday

describe('rangeFor', () => {
  test('defaults to a 28-day list from today', () => {
    assert.deepEqual(rangeFor({}, TODAY), { view: 'list', from: '2026-10-14', to: '2026-11-10' });
  });

  test('a week runs Monday to Sunday around from', () => {
    assert.deepEqual(rangeFor({ view: 'week', from: '2026-10-14' }, TODAY), { view: 'week', from: '2026-10-12', to: '2026-10-18' });
  });

  test('a month is the calendar month', () => {
    assert.deepEqual(rangeFor({ view: 'month', from: '2026-02-17' }, TODAY), { view: 'month', from: '2026-02-01', to: '2026-02-28' });
  });

  test('anything malformed falls back to the list from today', () => {
    assert.deepEqual(rangeFor({ view: 'year', from: '2026-02-30' }, TODAY), { view: 'list', from: TODAY, to: '2026-11-10' });
    assert.deepEqual(rangeFor({ view: ['week', 'month'], from: 'soon' }, TODAY), { view: 'week', from: '2026-10-12', to: '2026-10-18' });
  });
});

describe('stepFrom', () => {
  test('moves by the view', () => {
    assert.equal(stepFrom({ view: 'list', from: '2026-10-14', to: '2026-11-10' }, 1), '2026-11-11');
    assert.equal(stepFrom({ view: 'week', from: '2026-10-12', to: '2026-10-18' }, -1), '2026-10-05');
    assert.equal(stepFrom({ view: 'month', from: '2026-12-01', to: '2026-12-31' }, 1), '2027-01-01');
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
