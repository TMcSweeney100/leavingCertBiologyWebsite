import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarMonths, dateMarks, dayName, isoToLocalDate, localDateToIso } from './date-marks.ts';

const stage = (n: number, dueDate: string | null, items: { id: string; text: string; dueDate: string | null }[] = []) => ({
  id: `s${n}`, ordinal: n, label: `Stage ${n}`, name: `Name ${n}`, dueDate, items,
});

describe('isoToLocalDate and localDateToIso', () => {
  test('round-trip every calendar date, including both 2026-27 clock changes', () => {
    for (const iso of ['2026-01-01', '2026-03-29', '2026-10-25', '2027-03-28', '2027-12-31', '2028-02-29']) {
      assert.equal(localDateToIso(isoToLocalDate(iso)), iso);
    }
  });

  test('a local Date is midnight of that calendar day', () => {
    const d = isoToLocalDate('2026-10-16');
    assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 9, 16, 0]);
  });
});

describe('dateMarks', () => {
  test('a saved stage date is a saved stage mark', () => {
    const marks = dateMarks([stage(3, '2026-09-25')], { s3: '2026-09-25' }, '2027-02-26');
    assert.deepEqual(marks[0], { iso: '2026-09-25', kind: 'stage', short: 'S3', name: 'Stage 3', saved: true });
  });

  test('a typed but unsaved stage date is marked not saved, at the typed date', () => {
    const marks = dateMarks([stage(4, '2026-10-16')], { s4: '2026-10-23' }, '2027-02-26');
    assert.deepEqual(marks[0], { iso: '2026-10-23', kind: 'stage', short: 'S4', name: 'Stage 4 (not saved)', saved: false });
  });

  test('a stage cleared in the draft has no mark, and a stage missing from the draft uses its saved date', () => {
    const marks = dateMarks([stage(4, '2026-10-16'), stage(5, '2026-12-09')], { s4: '' }, '2027-02-26');
    assert.deepEqual(marks.filter((m) => m.kind === 'stage').map((m) => m.short), ['S5']);
  });

  test('dated items are marked by their letter; undated items are not marked', () => {
    const marks = dateMarks(
      [stage(6, '2027-01-22', [
        { id: 'i2', text: 'Full draft in', dueDate: '2026-12-04' },
        { id: 'i1', text: 'Catch-up closes', dueDate: '2026-11-13' },
        { id: 'i3', text: 'Re-run slot', dueDate: null },
      ])],
      {},
      '2027-02-26',
    );
    assert.deepEqual(
      marks.filter((m) => m.kind === 'item').map((m) => [m.iso, m.short, m.name]),
      [['2026-11-13', 'A', 'item A'], ['2026-12-04', 'B', 'item B']],
    );
  });

  test('the completion date is always a mark, last', () => {
    const marks = dateMarks([], {}, '2027-02-26');
    assert.deepEqual(marks, [{ iso: '2027-02-26', kind: 'completion', short: 'End', name: 'the completion date', saved: true }]);
  });

  test('a stage with no label uses its name', () => {
    const marks = dateMarks([{ ...stage(1, '2026-09-04'), label: null }], {}, '2027-02-26');
    assert.equal(marks[0].name, 'Name 1');
  });
});

describe('dayName', () => {
  const marks = dateMarks(
    [stage(4, '2026-10-16'), stage(5, null, [{ id: 'i1', text: 'Notebooks in', dueDate: '2026-10-16' }])],
    { s4: '2026-10-16', s5: '' },
    '2026-11-27',
  );

  test('a plain day is its full date', () => {
    assert.equal(dayName('2026-10-30', marks, '2026-11-27', '2026-10-14'), 'Friday 30 October 2026');
  });

  test('a day with marks lists them after a colon', () => {
    assert.equal(dayName('2026-10-16', marks, '2026-11-27', '2026-10-14'), 'Friday 16 October 2026: Stage 4, item A');
  });

  test('today says so, first', () => {
    assert.equal(dayName('2026-10-14', marks, '2026-11-27', '2026-10-14'), 'Wednesday 14 October 2026: today');
  });

  test('the completion date names itself', () => {
    assert.equal(dayName('2026-11-27', marks, '2026-11-27', '2026-10-14'), 'Friday 27 November 2026: the completion date');
  });

  test('a day after the completion date says so', () => {
    assert.equal(dayName('2026-11-28', marks, '2026-11-27', '2026-10-14'), 'Saturday 28 November 2026, after the completion date');
  });
});

describe('calendarMonths', () => {
  test('from the month of today to the month of the completion date', () => {
    assert.deepEqual(calendarMonths([], '2026-10-14', '2027-02-26'), { start: '2026-10-01', count: 5 });
  });

  test('starts earlier when a date is before today', () => {
    assert.deepEqual(calendarMonths(['2026-05-29'], '2026-10-14', '2027-02-26'), { start: '2026-05-01', count: 10 });
  });

  test('ends later when a date is after the completion date (a refused or moved date still shows)', () => {
    assert.deepEqual(calendarMonths(['2027-03-05'], '2026-10-14', '2027-02-26'), { start: '2026-10-01', count: 6 });
  });

  test('one month when everything is in the same month', () => {
    assert.deepEqual(calendarMonths(['2026-10-20'], '2026-10-14', '2026-10-30'), { start: '2026-10-01', count: 1 });
  });
});
