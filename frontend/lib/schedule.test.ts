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
  TERM_SPAN_LABEL,
  termPositionPct,
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
    assert.equal(result.currentStage?.id, 'stage-3');
    assert.equal(result.currentStage?.state, 'current');
    assert.equal(result.daysLeft, 24);
    assert.equal(result.termPct, 2);
    assert.equal(result.weekNumber, 1);
  });

  test('row 2: 24 Sept 2026, 21:00 Dublin — singular "1 day left" boundary', () => {
    const result = deriveSchedule(dublinDateTime('2026-09-24T21:00:00'));
    assert.equal(result.currentStage?.id, 'stage-3');
    assert.equal(result.currentStage?.state, 'current');
    assert.equal(result.daysLeft, 1);
    assert.equal(result.termPct, 23);
    assert.equal(result.weekNumber, 4);
  });

  test('row 3: 25 Sept 2026, 21:00 Dublin — Stage 3 still current on its own due date', () => {
    const result = deriveSchedule(dublinDateTime('2026-09-25T21:00:00'));
    assert.equal(result.currentStage?.id, 'stage-3');
    assert.equal(result.currentStage?.state, 'current');
    assert.equal(result.daysLeft, 0);
    assert.equal(result.termPct, 24);
    assert.equal(result.weekNumber, 4);
  });

  test('row 4: 6 Oct 2026 — Stage 4 current, 10 days left', () => {
    const result = deriveSchedule(dublinDateTime('2026-10-06T09:00:00'));
    assert.equal(result.currentStage?.id, 'stage-4');
    assert.equal(result.currentStage?.state, 'current');
    assert.equal(result.daysLeft, 10);
    assert.equal(result.termPct, 34);
    assert.equal(result.weekNumber, 6);
  });

  test('row 5: night of 24-25 Oct 2026, Ireland\'s clocks fall back — Catch-up unaffected by the DST transition', () => {
    // Late evening of the 24th, Dublin time — still IST (UTC+1); the clocks
    // change in the early hours that follow (01:00 UTC on the 25th). The
    // Dublin civil date at this instant is 2026-10-24.
    const result = deriveSchedule(dublinDateTime('2026-10-24T23:30:00'));
    assert.equal(result.currentStage?.id, 'catchup');
    assert.equal(result.currentStage?.state, 'current');
    assert.equal(result.daysLeft, 6);
    assert.equal(result.termPct, 52);
    assert.equal(result.weekNumber, 8);
  });

  test('row 6: 20 Nov 2026 — Stage 6 current, 21 days left', () => {
    const result = deriveSchedule(dublinDateTime('2026-11-20T09:00:00'));
    assert.equal(result.currentStage?.id, 'stage-6');
    assert.equal(result.currentStage?.state, 'current');
    assert.equal(result.daysLeft, 21);
    assert.equal(result.termPct, 78);
    assert.equal(result.weekNumber, 12);
  });

  test('row 7: 20 Dec 2026 (past term end) — buffer, no stage current, no negative countdown', () => {
    const result = deriveSchedule(dublinDateTime('2026-12-20T09:00:00'));
    assert.equal(result.phase, 'buffer');
    assert.equal(result.currentStage, null);
    assert.equal(result.daysLeft, 68);
    assert.equal(result.termPct, 100);
    assert.equal(result.weekNumber, 15);
  });

  test('row 8: 1 Mar 2027 (past the SEC deadline) — closed, no crash', () => {
    const result = deriveSchedule(dublinDateTime('2027-03-01T09:00:00'));
    assert.equal(result.phase, 'closed');
    assert.equal(result.currentStage, null);
    assert.equal(result.daysLeft, 0);
    assert.equal(result.termPct, 100);
    assert.equal(result.weekNumber, 15);
  });
});

describe('deriveSchedule — phase boundaries', () => {
  test('11 Dec 2026 — the last stage is still in progress on its own due date', () => {
    const result = deriveSchedule(dublinDateTime('2026-12-11T09:00:00'));
    assert.equal(result.phase, 'in-term');
    assert.equal(result.currentStage?.id, 'stage-6');
    assert.equal(result.daysLeft, 0);
    assert.equal(result.isDueToday, true);
  });

  test('12 Dec 2026 — the morning after: buffer, counting to the SEC deadline', () => {
    const result = deriveSchedule(dublinDateTime('2026-12-12T09:00:00'));
    assert.equal(result.phase, 'buffer');
    assert.equal(result.currentStage, null);
    assert.equal(result.daysLeft, 76);
    assert.equal(result.isDueToday, false);
    assert.ok(result.stages.every((s) => s.state === 'done'));
  });

  test('25 Feb 2027 — one day before the SEC deadline', () => {
    const result = deriveSchedule(dublinDateTime('2027-02-25T09:00:00'));
    assert.equal(result.phase, 'buffer');
    assert.equal(result.daysLeft, 1);
    assert.equal(result.isDueToday, false);
  });

  test('26 Feb 2027 — the SEC deadline itself is still buffer, and is due today', () => {
    const result = deriveSchedule(dublinDateTime('2027-02-26T09:00:00'));
    assert.equal(result.phase, 'buffer');
    assert.equal(result.daysLeft, 0);
    assert.equal(result.isDueToday, true);
  });

  test('27 Feb 2027 — past the SEC deadline: closed, and nothing is due today', () => {
    const result = deriveSchedule(dublinDateTime('2027-02-27T09:00:00'));
    assert.equal(result.phase, 'closed');
    assert.equal(result.currentStage, null);
    assert.equal(result.daysLeft, 0);
    assert.equal(result.isDueToday, false);
  });

  test('15 Mar 2027 — long past the deadline, still closed and still not crashing', () => {
    const result = deriveSchedule(dublinDateTime('2027-03-15T09:00:00'));
    assert.equal(result.phase, 'closed');
    assert.equal(result.currentStage, null);
    assert.ok(result.stages.every((s) => s.state === 'done'));
  });

  test('comingUp and nextStage are empty once there is no current stage', () => {
    const result = deriveSchedule(dublinDateTime('2027-01-15T09:00:00'));
    assert.equal(result.nextStage, null);
    assert.deepEqual(result.comingUp, []);
  });

  test('every report section reads Done once the term is over', () => {
    const result = deriveSchedule(dublinDateTime('2027-01-15T09:00:00'));
    assert.ok(result.reportSections.every((s) => s.status === 'done'));
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

  test('is false in buffer (counting to the SEC deadline) and in closed (clamped to 0)', () => {
    // The distinction that matters: `closed`'s countdown clamps to 0
    // forever, so copy keyed off `daysLeft === 0` alone would claim "Due
    // today" every day once the SEC deadline has passed. `buffer` is not
    // even at zero — it is still counting down to 26 Feb — which is the
    // whole reason `phase` exists.
    const buffer = deriveSchedule(dublinDateTime('2026-12-20T09:00:00'));
    assert.equal(buffer.phase, 'buffer');
    assert.equal(buffer.daysLeft, 68);
    assert.equal(buffer.isDueToday, false);

    const closed = deriveSchedule(dublinDateTime('2027-03-01T09:00:00'));
    assert.equal(closed.phase, 'closed');
    assert.equal(closed.daysLeft, 0);
    assert.equal(closed.isDueToday, false);
  });
});

describe('deriveSchedule — nextStage', () => {
  test('is the stage immediately after the current one', () => {
    const result = deriveSchedule(dublinDateTime('2026-10-06T09:00:00'));
    assert.equal(result.currentStage?.id, 'stage-4');
    assert.equal(result.nextStage?.id, 'catchup');
    assert.equal(result.nextStage?.state, 'upcoming');
  });

  test('is null on the last stage, rather than pointing back at the current one', () => {
    const result = deriveSchedule(dublinDateTime('2026-11-20T09:00:00'));
    assert.equal(result.currentStage?.id, 'stage-6');
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
    const expected: [string, string | null][] = [
      ['2026-09-01', 'stage-3'],
      ['2026-10-06', 'stage-4'],
      ['2026-10-30', 'catchup'],
      ['2026-11-20', 'stage-6'],
      ['2026-12-20', null],
    ];
    for (const [iso, stageId] of expected) {
      assert.equal(
        deriveSchedule(parsePreviewDate(iso, fallback)).currentStage?.id ?? null,
        stageId,
        iso,
      );
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

describe('termPositionPct — laptop ruler tick placement', () => {
  test('spaces the five deadlines by real elapsed time, not evenly', () => {
    // 1 Sept -> 12 Dec is 102 days. Evenly spaced, five ticks would land on
    // 20/40/60/80/100; the real dates cluster differently, which is the
    // whole point of the ruler.
    const at = (iso: string) => Number(termPositionPct(iso).toFixed(2));
    assert.equal(at('2026-09-25'), 23.53); // Stage 3
    assert.equal(at('2026-10-16'), 44.12); // Stage 4
    assert.equal(at('2026-10-30'), 57.84); // Catch-up
    assert.equal(at('2026-11-13'), 71.57); // Stage 5
    assert.equal(at('2026-12-11'), 99.02); // Stage 6
  });

  test('the December tick is past the 88% edge-clamp threshold', () => {
    // The ruler right-anchors any tick above 88% instead of centring it.
    // If this stops being true, the December label overhangs the panel —
    // the one layout failure the plan calls out by name.
    assert.ok(termPositionPct('2026-12-11') > 88);
  });

  test('no tick falls below the 6% left-edge threshold this year', () => {
    for (const iso of ['2026-09-25', '2026-10-16', '2026-10-30', '2026-11-13', '2026-12-11']) {
      assert.ok(termPositionPct(iso) >= 6, iso);
    }
  });

  test('clamps to [0, 100] outside the term, and does not floor at 2 the way termPct does', () => {
    assert.equal(termPositionPct('2026-09-01'), 0);
    assert.equal(termPositionPct('2026-06-05'), 0);
    assert.equal(termPositionPct('2026-12-12'), 100);
    assert.equal(termPositionPct('2027-02-26'), 100);
  });
});

describe('deriveSchedule — rulerTicks', () => {
  test('is the five stage deadlines plus the draft, in date order', () => {
    const { rulerTicks } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    assert.deepEqual(
      rulerTicks.map((t) => t.id),
      ['stage-3', 'stage-4', 'catchup', 'stage-5', 'draft', 'stage-6'],
    );
  });

  test('omits the two 5th-Year stages, which have no tick', () => {
    const { rulerTicks } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    assert.ok(!rulerTicks.some((t) => t.id === 'stage-1' || t.id === 'stage-2'));
  });

  test('the draft is upcoming through its own date and done the morning after', () => {
    const before = deriveSchedule(dublinDateTime('2026-12-03T09:00:00'));
    const on = deriveSchedule(dublinDateTime('2026-12-04T09:00:00'));
    const after = deriveSchedule(dublinDateTime('2026-12-05T09:00:00'));
    const draft = (r: ReturnType<typeof deriveSchedule>) =>
      r.rulerTicks.find((t) => t.id === 'draft')!;
    assert.equal(draft(before).state, 'upcoming');
    assert.equal(draft(on).state, 'upcoming');
    assert.equal(draft(after).state, 'done');
  });

  test('the draft is never "current" — indigo is reserved for the current stage', () => {
    for (const d of ['2026-12-01', '2026-12-04', '2026-12-05'] as const) {
      const { rulerTicks } = deriveSchedule(dublinDateTime(`${d}T09:00:00`));
      assert.notEqual(rulerTicks.find((t) => t.id === 'draft')!.state, 'current');
    }
  });

  test('stage ticks carry short captions, and the catch-up window says so', () => {
    const { rulerTicks } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    const caption = (id: string) => rulerTicks.find((t) => t.id === id)!.caption;
    assert.equal(caption('stage-3'), 'St 3');
    assert.equal(caption('catchup'), 'Catch-up');
    assert.equal(caption('draft'), 'Draft');
  });

  test('tick state tracks stage state, so the ruler cannot disagree with the cards', () => {
    const result = deriveSchedule(dublinDateTime('2026-10-06T09:00:00'));
    for (const tick of result.rulerTicks) {
      if (tick.id === 'draft') continue;
      assert.equal(tick.state, result.stages.find((s) => s.id === tick.id)!.state);
    }
  });
});

describe('deriveSchedule — termAtAGlance', () => {
  test('groups every ruler tick by month, in date order', () => {
    const { termAtAGlance } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    assert.deepEqual(
      termAtAGlance.map((m) => m.month),
      ['September', 'October', 'November', 'December'],
    );
    assert.deepEqual(
      termAtAGlance.flatMap((m) => m.items.map((i) => i.day)),
      ['25', '16', '30', '13', '4', '11'],
    );
  });

  test('every item names the stage or milestone it came from', () => {
    const { termAtAGlance } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    const items = termAtAGlance.flatMap((m) => m.items);
    assert.match(items[0].text, /Stage 3/);
    assert.match(items.find((i) => i.day === '4')!.text, /draft/i);
  });

  test('cannot drift from STAGES — every stage deadline appears exactly once', () => {
    const { termAtAGlance, rulerTicks } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    assert.equal(termAtAGlance.flatMap((m) => m.items).length, rulerTicks.length);
  });
});

describe('termPositionPct — the draft tick and the right-edge clamp', () => {
  test('the draft and the final deadline are both past the 88% legacy threshold', () => {
    assert.ok(termPositionPct('2026-12-04') > 88);
    assert.ok(termPositionPct('2026-12-11') > 88);
  });

  test('the draft sits below the raised 95% threshold, so only the last tick clamps', () => {
    assert.ok(termPositionPct('2026-12-04') < 95);
    assert.ok(termPositionPct('2026-12-11') > 95);
  });
});

describe('TERM_SPAN_LABEL', () => {
  test('is derived from TERM, so editing only schedule.data.ts still moves it', () => {
    assert.equal(TERM_SPAN_LABEL, 'Sept → 12 Dec');
  });
});

describe('deriveSchedule — comingUp', () => {
  test('is every stage after the current one, in order', () => {
    const result = deriveSchedule(dublinDateTime('2026-10-06T09:00:00'));
    assert.equal(result.currentStage?.id, 'stage-4');
    assert.deepEqual(
      result.comingUp.map((s) => s.id),
      ['catchup', 'stage-5', 'stage-6'],
    );
    assert.ok(result.comingUp.every((s) => s.state === 'upcoming'));
  });

  test('is empty on the last stage, and agrees with nextStage', () => {
    const result = deriveSchedule(dublinDateTime('2026-11-20T09:00:00'));
    assert.deepEqual(result.comingUp, []);
    assert.equal(result.nextStage, null);
  });

  test('nextStage is always the head of comingUp', () => {
    for (const when of ['2026-09-01T09:00:00', '2026-10-06T09:00:00', '2026-10-30T09:00:00']) {
      const result = deriveSchedule(dublinDateTime(when));
      assert.equal(result.nextStage, result.comingUp[0], when);
    }
  });
});

describe('deriveSchedule — reportSections (the crosswalk)', () => {
  const statuses = (when: string) =>
    Object.fromEntries(
      deriveSchedule(dublinDateTime(when)).reportSections.map((r) => [r.section, r.statusLabel]),
    );

  test('always lists all seven sections, in the order the data file gives them', () => {
    const result = deriveSchedule(dublinDateTime('2026-10-06T09:00:00'));
    assert.deepEqual(
      result.reportSections.map((r) => r.section),
      ['§1', '§2', '§3', '§4', '§5', '§6', '§7'],
    );
  });

  test('§1 and §2 are done at every point in the term (written in 5th Year)', () => {
    for (const when of [
      '2026-09-01T09:00:00',
      '2026-10-06T09:00:00',
      '2026-12-20T09:00:00',
      '2027-03-01T09:00:00',
    ]) {
      const s = statuses(when);
      assert.equal(s['§1'], 'Done', when);
      assert.equal(s['§2'], 'Done', when);
    }
  });

  test('1 Sept — Stage 3 is current, so §3 is due now and §4-§7 are still to come', () => {
    assert.deepEqual(statuses('2026-09-01T09:00:00'), {
      '§1': 'Done',
      '§2': 'Done',
      '§3': 'Due now',
      '§4': 'To come',
      '§5': 'To come',
      '§6': 'To come',
      '§7': 'To come',
    });
  });

  test('6 Oct — Stage 4 is current, so §3 has flipped to done and §4 is due now', () => {
    assert.deepEqual(statuses('2026-10-06T09:00:00'), {
      '§1': 'Done',
      '§2': 'Done',
      '§3': 'Done',
      '§4': 'Due now',
      '§5': 'To come',
      '§6': 'To come',
      '§7': 'To come',
    });
  });

  test('30 Oct — the catch-up window is current, so nothing new is due', () => {
    const s = statuses('2026-10-30T09:00:00');
    assert.equal(Object.values(s).filter((v) => v === 'Due now').length, 0);
    assert.equal(s['§4'], 'Done');
    assert.equal(s['§5'], 'To come');
  });

  test('13 Nov — §5 and §6 share Stage 5, so both read due now together', () => {
    const s = statuses('2026-11-13T09:00:00');
    assert.equal(s['§5'], 'Due now');
    assert.equal(s['§6'], 'Due now');
    assert.equal(s['§7'], 'To come');
  });

  test('20 Dec — past the end of term (buffer), every section reads Done', () => {
    const s = statuses('2026-12-20T09:00:00');
    assert.equal(s['§7'], 'Done');
    assert.equal(s['§5'], 'Done');
  });

  test('status and statusLabel never disagree', () => {
    const labels = { 'due-now': 'Due now', done: 'Done', 'to-come': 'To come' };
    for (const when of ['2026-09-01T09:00:00', '2026-11-13T09:00:00', '2027-03-01T09:00:00']) {
      for (const row of deriveSchedule(dublinDateTime(when)).reportSections) {
        assert.equal(row.statusLabel, labels[row.status], `${when} ${row.section}`);
      }
    }
  });
});

describe('deriveSchedule — reportSections dueBy', () => {
  test('every dated section takes its due date from the stage it maps to', () => {
    const { reportSections, stages } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    for (const section of reportSections) {
      if (!section.stageId) continue;
      assert.equal(section.dueBy, stages.find((s) => s.id === section.stageId)!.dueDateLabel);
    }
  });

  test('the two 5th-Year sections keep their literal, having no stage to read', () => {
    const { reportSections } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    assert.equal(reportSections[0].dueBy, '5th Year');
    assert.equal(reportSections[1].dueBy, '5th Year');
  });
});
