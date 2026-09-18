import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { datesChanged, formatCalendarDate, hoursLabel } from './component-setup.ts';

describe('formatCalendarDate', () => {
  test('formats an ISO calendar date without moving it a day', () => {
    assert.equal(formatCalendarDate('2026-10-16'), '16 Oct 2026');
    assert.equal(formatCalendarDate('2027-02-26'), '26 Feb 2027');
  });
});

describe('hoursLabel', () => {
  const stage = (hoursMin: number | null, hoursMax: number | null, hoursGroup: string | null = null, label = 'Stage 1') =>
    ({ label, hoursMin, hoursMax, hoursGroup });

  test('a range, an upper bound, or nothing', () => {
    assert.equal(hoursLabel(stage(2, 3), []), '2–3 hours');
    assert.equal(hoursLabel(stage(null, 4), []), 'Up to 4 hours');
    assert.equal(hoursLabel(stage(null, null), []), '');
  });

  test('a shared estimate names the stages that share it', () => {
    const four = stage(6, 8, 'stages-4-5', 'Stage 4');
    const five = stage(6, 8, 'stages-4-5', 'Stage 5');
    assert.equal(hoursLabel(four, [four, five]), '6–8 hours for Stage 4 and Stage 5 together');
  });
});

describe('datesChanged', () => {
  test('compares the draft with what was saved, treating empty as no date', () => {
    const saved = [{ id: 'a', dueDate: '2026-10-16' }, { id: 'b', dueDate: null }];
    assert.equal(datesChanged(saved, { a: '2026-10-16', b: '' }), false);
    assert.equal(datesChanged(saved, { a: '2026-10-17', b: '' }), true);
    assert.equal(datesChanged(saved, { a: '2026-10-16', b: '2026-11-01' }), true);
  });
});
