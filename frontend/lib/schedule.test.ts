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
import { deriveSchedule } from './schedule.ts';

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
