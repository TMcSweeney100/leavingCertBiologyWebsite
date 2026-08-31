/**
 * Tests for the schedule-derivation logic in `schedule.ts`.
 *
 * These assert the 8-row verification table from
 * `docs/IMPLEMENTATION_PLAN.md` §3.2 — the previously-verified oracle for
 * current-stage detection, countdown, term percentage and week number across
 * the whole 2026/27 term. Row 5 in particular exercises the night Ireland's
 * clocks fall back (DST), and rows 2/3 exercise the "stage stays current
 * through its own due date" boundary. This table is the hard gate for
 * Phase 2 — see the implementation plan's build-order table.
 *
 * Every `now` below is constructed via `dublinDateTime`, which converts an
 * explicit Dublin *wall-clock* reading into the correct UTC instant using
 * the real Europe/Dublin IANA timezone data (the same source of truth
 * `schedule.ts` itself relies on) — never by assuming the machine running
 * these tests is itself in Dublin, and never by hand-computing a UTC
 * offset. See `dublinDateTime` below for the technique.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  countdownText,
  daysLeftWord,
  deriveSchedule,
  formatTodayLabel,
  parsePreviewDate,
} from './schedule.ts';

/**
 * The UTC offset (in ms) that `timeZone` actually observes at `instant`,
 * per the ICU timezone database Node ships with — independent of the host
 * machine's own local timezone setting.
 */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

/**
 * Resolves a naive `YYYY-MM-DDTHH:mm:ss` string — read as a wall-clock
 * reading *in Europe/Dublin* — to the Date instant it actually refers to,
 * regardless of the timezone the test process itself runs in.
 *
 * Standard guess-and-correct technique: parse the string as if it were UTC,
 * ask the timezone database what Dublin's offset actually is near that
 * instant, then correct for it. A second pass re-derives the offset from
 * the corrected instant, in case the first guess landed on the wrong side
 * of a DST boundary.
 */
function dublinDateTime(localIso: string): Date {
  const naive = Date.parse(`${localIso}Z`);
  let offset = tzOffsetMs(new Date(naive), 'Europe/Dublin');
  let real = naive - offset;
  offset = tzOffsetMs(new Date(real), 'Europe/Dublin');
  real = naive - offset;
  return new Date(real);
}

describe('deriveSchedule — §3.3 verification table', () => {
  test('row 1: 1 Sept 2026 (term start) — Stage 3 current, 24 days left', () => {
    const result = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    assert.equal(result.currentStage.id, 'stage-3');
    assert.equal(result.currentStage.state, 'current');
    assert.equal(result.daysLeft, 24);
    assert.equal(result.termPct, 2);
    assert.equal(result.weekNumber, 1);
  });

  test('row 2: 24 Sept 2026, 21:00 Dublin — singular "1 day left" boundary', () => {
    const result = deriveSchedule(dublinDateTime('2026-09-24T21:00:00'));
    assert.equal(result.currentStage.id, 'stage-3');
    assert.equal(result.currentStage.state, 'current');
    assert.equal(result.daysLeft, 1);
    assert.equal(result.termPct, 23);
    assert.equal(result.weekNumber, 4);
  });

  test('row 3: 25 Sept 2026, 21:00 Dublin — Stage 3 still current on its own due date', () => {
    const result = deriveSchedule(dublinDateTime('2026-09-25T21:00:00'));
    assert.equal(result.currentStage.id, 'stage-3');
    assert.equal(result.currentStage.state, 'current');
    assert.equal(result.daysLeft, 0);
    assert.equal(result.termPct, 24);
    assert.equal(result.weekNumber, 4);
  });

  test('row 4: 6 Oct 2026 — Stage 4 current, 10 days left', () => {
    const result = deriveSchedule(dublinDateTime('2026-10-06T09:00:00'));
    assert.equal(result.currentStage.id, 'stage-4');
    assert.equal(result.currentStage.state, 'current');
    assert.equal(result.daysLeft, 10);
    assert.equal(result.termPct, 34);
    assert.equal(result.weekNumber, 6);
  });

  test('row 5: night of 24-25 Oct 2026, Ireland\'s clocks fall back — Catch-up unaffected by the DST transition', () => {
    // Late evening of the 24th, Dublin time — still IST (UTC+1); the clocks
    // change in the early hours that follow (01:00 UTC on the 25th). The
    // Dublin civil date at this instant is 2026-10-24.
    const result = deriveSchedule(dublinDateTime('2026-10-24T23:30:00'));
    assert.equal(result.currentStage.id, 'catchup');
    assert.equal(result.currentStage.state, 'current');
    assert.equal(result.daysLeft, 6);
    assert.equal(result.termPct, 52);
    assert.equal(result.weekNumber, 8);
  });

  test('row 6: 20 Nov 2026 — Stage 6 current, 21 days left', () => {
    const result = deriveSchedule(dublinDateTime('2026-11-20T09:00:00'));
    assert.equal(result.currentStage.id, 'stage-6');
    assert.equal(result.currentStage.state, 'current');
    assert.equal(result.daysLeft, 21);
    assert.equal(result.termPct, 78);
    assert.equal(result.weekNumber, 12);
  });

  test('row 7: 20 Dec 2026 (past term end) — falls back to Stage 6, no negative countdown', () => {
    const result = deriveSchedule(dublinDateTime('2026-12-20T09:00:00'));
    assert.equal(result.currentStage.id, 'stage-6');
    assert.equal(result.currentStage.state, 'current');
    assert.equal(result.daysLeft, 0);
    assert.equal(result.termPct, 100);
    assert.equal(result.weekNumber, 15);
  });

  test('row 8: 1 Mar 2027 (past the SEC deadline) — still falls back to Stage 6, no crash', () => {
    const result = deriveSchedule(dublinDateTime('2027-03-01T09:00:00'));
    assert.equal(result.currentStage.id, 'stage-6');
    assert.equal(result.currentStage.state, 'current');
    assert.equal(result.daysLeft, 0);
    assert.equal(result.termPct, 100);
    assert.equal(result.weekNumber, 15);
  });
});

describe('deriveSchedule — isDueToday', () => {
  test('is false while the current stage is still ahead of its due date', () => {
    assert.equal(deriveSchedule(dublinDateTime('2026-09-24T21:00:00')).isDueToday, false);
  });

  test('is true on the due date itself — the day the countdown first reads 0', () => {
    const result = deriveSchedule(dublinDateTime('2026-09-25T21:00:00'));
    assert.equal(result.daysLeft, 0);
    assert.equal(result.isDueToday, true);
  });

  test('is false once the due date has passed, even though the countdown clamps back to 0', () => {
    // The distinction that matters: past the end of the term the last stage
    // stays "current" and `daysLeft` clamps to 0 forever, so countdown copy
    // keyed off `daysLeft === 0` alone would claim "Due today" every day
    // from 12 Dec onwards.
    for (const when of ['2026-12-20T09:00:00', '2027-03-01T09:00:00']) {
      const result = deriveSchedule(dublinDateTime(when));
      assert.equal(result.daysLeft, 0, when);
      assert.equal(result.isDueToday, false, when);
    }
  });
});

describe('deriveSchedule — nextStage', () => {
  test('is the stage immediately after the current one', () => {
    const result = deriveSchedule(dublinDateTime('2026-10-06T09:00:00'));
    assert.equal(result.currentStage.id, 'stage-4');
    assert.equal(result.nextStage?.id, 'catchup');
    assert.equal(result.nextStage?.state, 'upcoming');
  });

  test('is null on the last stage, rather than pointing back at the current one', () => {
    const result = deriveSchedule(dublinDateTime('2026-11-20T09:00:00'));
    assert.equal(result.currentStage.id, 'stage-6');
    assert.equal(result.nextStage, null);
  });
});

describe('daysLeftWord', () => {
  test('is singular only at exactly one day', () => {
    assert.equal(daysLeftWord(0), 'days left');
    assert.equal(daysLeftWord(1), 'day left');
    assert.equal(daysLeftWord(2), 'days left');
    assert.equal(daysLeftWord(24), 'days left');
  });
});

describe('formatTodayLabel', () => {
  test('formats the Dublin civil date, reading the epoch as UTC', () => {
    const result = deriveSchedule(dublinDateTime('2026-10-06T09:00:00'));
    assert.equal(formatTodayLabel(result.today), '6 Oct 2026');
  });

  test('does not slip a day when the host machine is west of Greenwich', () => {
    // `today` is a Dublin civil date pinned to UTC midnight. Formatting it
    // in local time on, say, a US-hosted CI box would render the previous
    // day; the formatter pins `timeZone: 'UTC'` to prevent that. Asserting
    // the epoch directly keeps this test meaningful wherever it runs.
    assert.equal(formatTodayLabel(Date.parse('2026-09-01T00:00:00Z')), '1 Sept 2026');
  });
});

describe('parsePreviewDate', () => {
  const fallback = new Date('2026-01-01T00:00:00Z');

  test('resolves a valid ?date= to that Dublin calendar day, at either UTC offset', () => {
    // 6 Oct is inside Irish Summer Time (UTC+1), 1 Dec is not (UTC+0):
    // both must round-trip to the requested date, not the day either side.
    for (const iso of ['2026-10-06', '2026-12-01']) {
      const result = deriveSchedule(parsePreviewDate(iso, fallback));
      assert.equal(formatTodayLabel(result.today), formatTodayLabel(Date.parse(`${iso}T00:00:00Z`)), iso);
    }
  });

  test('drives the current stage — the ?date= gate for all five plan test dates', () => {
    const expected: [string, string][] = [
      ['2026-09-01', 'stage-3'],
      ['2026-10-06', 'stage-4'],
      ['2026-10-30', 'catchup'],
      ['2026-11-20', 'stage-6'],
      ['2026-12-20', 'stage-6'],
    ];
    for (const [iso, stageId] of expected) {
      assert.equal(deriveSchedule(parsePreviewDate(iso, fallback)).currentStage.id, stageId, iso);
    }
  });

  test('takes the first value when the param is repeated in the query string', () => {
    assert.equal(parsePreviewDate(['2026-10-06', '2026-11-20'], fallback).toISOString(),
      '2026-10-06T12:00:00.000Z');
  });

  test('falls back to `now` for anything it cannot make sense of', () => {
    const rejected = [
      undefined,          // no ?date= at all — the normal case
      '',
      'today',
      '2026-10-6',        // not zero-padded
      '06/10/2026',
      '2026-10-06T09:00', // date-only, deliberately: no time component accepted
      '2026-13-01',       // impossible month
      '2026-02-30',       // impossible day — JS would silently roll this to 2 March
      '2027-02-29',       // not a leap year
      [],
    ];
    for (const input of rejected) {
      assert.equal(parsePreviewDate(input, fallback), fallback, JSON.stringify(input));
    }
  });

  test('defaults to the real clock when no override and no explicit `now` is given', () => {
    const before = Date.now();
    const result = parsePreviewDate(undefined).getTime();
    assert.ok(result >= before && result <= Date.now());
  });
});

describe('countdownText', () => {
  test('counts down, pluralises, and swaps in "Due today" on the due date', () => {
    assert.equal(countdownText(10, false), '10 days left');
    assert.equal(countdownText(1, false), '1 day left');
    assert.equal(countdownText(0, true), 'Due today');
  });

  test('keeps the literal zero once the due date has passed', () => {
    // Reachable only past the end of the term, where the last stage stays
    // current with a clamped countdown — "Due today" would be false there.
    assert.equal(countdownText(0, false), '0 days left');
  });
});
