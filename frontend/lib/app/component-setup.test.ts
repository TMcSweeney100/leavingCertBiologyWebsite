import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  datesChanged,
  datesRunSummary,
  formatCalendarDate,
  gapLabels,
  hoursLabel,
  letteredItems,
  monthTicks,
  positionPct,
  saveStatus,
  shortWeekdayDate,
  weekdayDate,
  yearSpan,
} from './component-setup.ts';

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

/* ---- Pack D-5: the year view's maths, the lettering, and the status beside Save dates ---- */

const COMPLETION = '2027-02-26';
const DESIGN_DATES = ['2026-05-29', '2026-06-05', '2026-09-25', '2026-10-16', '2026-11-20', '2027-01-22'];

const designStages = () =>
  DESIGN_DATES.map((dueDate, i) => ({
    id: `s${i + 1}`,
    ordinal: i + 1,
    label: `Stage ${i + 1}`,
    name: `Name ${i + 1}`,
    dueDate: dueDate as string | null,
    items: [] as { id: string; text: string; dueDate: string | null }[],
  }));

describe('yearSpan', () => {
  test('runs from the first dated thing to the completion date', () => {
    const span = yearSpan(DESIGN_DATES, COMPLETION, '2026-09-14');
    assert.equal(span.from, '2026-05-29');
    assert.equal(span.to, COMPLETION);
    assert.equal(span.days, 273);
  });

  test('always contains today, so the Today line can be drawn', () => {
    const span = yearSpan(['2026-10-16'], COMPLETION, '2026-06-01');
    assert.equal(span.from, '2026-06-01');
  });

  test('with no dates at all it runs from today to the completion date', () => {
    const span = yearSpan([], COMPLETION, '2026-06-01');
    assert.deepEqual([span.from, span.to], ['2026-06-01', COMPLETION]);
  });

  test('a date past the completion date extends the line past the end-stop', () => {
    // State 4: stage 6 is refused at 5 Mar 2027, and the axis has to reach it.
    const span = yearSpan([...DESIGN_DATES, '2027-03-05'], COMPLETION, '2026-09-14');
    assert.equal(span.to, '2027-03-05');
    assert.ok(positionPct(COMPLETION, span) < 100);
  });
});

describe('positionPct', () => {
  test('is 0 at the start, 100 at the end, and clamped outside', () => {
    const span = yearSpan(DESIGN_DATES, COMPLETION, '2026-09-14');
    assert.equal(positionPct('2026-05-29', span), 0);
    assert.equal(positionPct(COMPLETION, span), 100);
    assert.equal(positionPct('2026-01-01', span), 0);
    assert.equal(positionPct('2027-12-01', span), 100);
  });

  test('a zero-length span puts everything at the start rather than dividing by zero', () => {
    const span = yearSpan(['2027-02-26'], COMPLETION, '2027-02-26');
    assert.equal(span.days, 0);
    assert.equal(positionPct(COMPLETION, span), 0);
  });
});

describe('monthTicks', () => {
  test('one per month start inside the span — Jun to Feb for the design dates', () => {
    const span = yearSpan(DESIGN_DATES, COMPLETION, '2026-09-14');
    const ticks = monthTicks(span, false);
    // "Sept", not the design file's "Sep": en-IE's own abbreviation, and what formatCalendarDate
    // already prints everywhere else in the app. One spelling of a month beats matching the mock.
    assert.deepEqual(ticks.map((t) => t.label), ['Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']);
    assert.ok(ticks.every((t) => t.pct > 0 && t.pct < 100));
  });

  test('every other month when the line carries no dates (state 2)', () => {
    const span = yearSpan(DESIGN_DATES, COMPLETION, '2026-09-14');
    assert.deepEqual(monthTicks(span, true).map((t) => t.label), ['Jun', 'Aug', 'Oct', 'Dec', 'Feb']);
  });
});

describe('gapLabels', () => {
  test('names the weeks between marks, skipping gaps with no room', () => {
    const span = yearSpan(DESIGN_DATES, COMPLETION, '2026-09-14');
    const gaps = gapLabels([...DESIGN_DATES, COMPLETION], span);
    assert.deepEqual(gaps.map((g) => g.label), ['16 weeks', '5 weeks', '9 weeks', '5 weeks']);
    assert.ok(gaps.every((g) => g.pct > 0 && g.pct < 100));
  });

  test('a single week is singular', () => {
    const span = yearSpan(['2026-06-01', '2026-06-08'], '2026-06-08', '2026-06-01');
    assert.deepEqual(gapLabels(['2026-06-01', '2026-06-08'], span).map((g) => g.label), ['1 week']);
  });

  test('fewer than two marks means no gaps', () => {
    const span = yearSpan(['2026-06-01'], COMPLETION, '2026-06-01');
    assert.deepEqual(gapLabels(['2026-06-01'], span), []);
  });
});

describe('letteredItems', () => {
  const items = [
    { id: 'i3', text: 'Book a re-run slot if your data needs it', dueDate: null },
    { id: 'i2', text: 'Full draft in for feedback', dueDate: '2026-12-04' },
    { id: 'i1', text: 'Catch-up window closes', dueDate: '2026-11-13' },
  ];

  test('letters by date, undated last, and carries each item back to its stage', () => {
    const stages = designStages();
    stages[5].items = [items[0], items[1]];
    stages[3].items = [items[2]];
    const lettered = letteredItems(stages);
    assert.deepEqual(lettered.map((i) => [i.letter, i.text]), [
      ['A', 'Catch-up window closes'],
      ['B', 'Full draft in for feedback'],
      ['C', 'Book a re-run slot if your data needs it'],
    ]);
    assert.equal(lettered[0].stageLabel, 'Stage 4');
    assert.equal(lettered[2].stageLabel, 'Stage 6');
  });

  test('a letter follows the date, so changing a date re-letters', () => {
    const stages = designStages();
    stages[5].items = [{ ...items[1], dueDate: '2026-10-01' }, items[2]];
    assert.deepEqual(letteredItems(stages).map((i) => `${i.letter} ${i.text}`), [
      'A Full draft in for feedback',
      'B Catch-up window closes',
    ]);
  });

  test('items sharing a date are ordered by stage, then text, so the letters never flicker', () => {
    const stages = designStages();
    stages[5].items = [{ id: 'z', text: 'Zebra', dueDate: '2026-11-13' }];
    stages[0].items = [{ id: 'a', text: 'Apple', dueDate: '2026-11-13' }];
    assert.deepEqual(letteredItems(stages).map((i) => `${i.letter} ${i.text}`), ['A Apple', 'B Zebra']);
  });

  test('runs past Z without repeating a letter', () => {
    const stages = designStages();
    stages[0].items = Array.from({ length: 28 }, (_, i) => ({ id: `x${i}`, text: `t${i}`, dueDate: null }));
    const letters = letteredItems(stages).map((i) => i.letter);
    assert.equal(letters[25], 'Z');
    assert.equal(letters[26], 'AA');
    assert.equal(new Set(letters).size, 28);
  });
});

describe('weekdayDate', () => {
  test('resolves the weekday under a date input, in UTC', () => {
    assert.equal(weekdayDate('2026-09-25'), 'Fri 25 Sept 2026');
    assert.equal(weekdayDate('2027-02-26'), 'Fri 26 Feb 2027');
    assert.equal(shortWeekdayDate('2026-10-09'), 'Fri 9 Oct');
  });
});

describe('datesRunSummary', () => {
  test('sums the year up for the phone, where the line is collapsed', () => {
    assert.equal(
      datesRunSummary(designStages(), COMPLETION),
      'Your dates run 29 May 2026 to 22 Jan 2027, inside the completion date of 26 Feb 2027.',
    );
  });

  test('is absent until there is a date to describe', () => {
    assert.equal(datesRunSummary(designStages().map((s) => ({ ...s, dueDate: null })), COMPLETION), null);
  });
});

describe('saveStatus', () => {
  const base = { total: 6, saved: 6, changed: 0, refusedCount: 0, warnings: [] as { code: string; stageIds: string[] }[] };

  test('counts what is saved and what is not', () => {
    assert.equal(saveStatus({ ...base, saved: 0 }), 'No dates saved yet');
    assert.equal(saveStatus(base), 'All 6 dates saved');
    assert.equal(saveStatus({ ...base, saved: 4 }), '4 of 6 dates saved');
  });

  test('unsaved edits win over the saved count', () => {
    assert.equal(saveStatus({ ...base, changed: 2 }), '2 dates changed, not saved yet');
    assert.equal(saveStatus({ ...base, changed: 1 }), '1 date changed, not saved yet');
  });

  test('a refusal says nothing was saved, and how many dates that leaves alone', () => {
    assert.equal(saveStatus({ ...base, refusedCount: 1 }), 'Nothing was saved — your other five dates are unchanged.');
    assert.equal(saveStatus({ ...base, refusedCount: 6 }), 'Nothing was saved.');
  });

  test('a saved warning is amber, not a failure', () => {
    assert.equal(
      saveStatus({ ...base, warnings: [{ code: 'OUT_OF_ORDER', stageIds: ['s4', 's5'] }] }),
      'Saved. Two dates are out of order.',
    );
    assert.equal(
      saveStatus({ ...base, warnings: [{ code: 'AFTER_COMPLETION_DATE', stageIds: ['s6'] }] }),
      'Saved. One date needs fixing.',
    );
  });
});
