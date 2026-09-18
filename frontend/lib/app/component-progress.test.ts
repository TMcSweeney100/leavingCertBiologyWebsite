import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { progress } from './component-progress.ts';

const stage = (ordinal: number, dueDate: string | null) => ({ id: `s${ordinal}`, ordinal, dueDate });
const COMPLETION = '2027-02-26';

describe('progress', () => {
  const stages = [stage(1, '2026-05-29'), stage(2, '2026-06-05'), stage(3, '2026-09-25'), stage(4, '2026-10-16'), stage(5, null), stage(6, '2027-01-22')];

  test('the current stage is the first dated today or later', () => {
    const p = progress(stages, '2026-10-12', COMPLETION);
    assert.equal(p.phase, 'in-progress');
    assert.equal(p.current?.id, 's4');
    assert.deepEqual(p.states, { s1: 'done', s2: 'done', s3: 'done', s4: 'current', s5: 'undated', s6: 'upcoming' });
    assert.equal(p.countdown, '4 days left');
  });

  test('on the stage date itself it is still current and due today', () => {
    const p = progress(stages, '2026-10-16', COMPLETION);
    assert.equal(p.current?.id, 's4');
    assert.equal(p.countdown, 'Due today');
  });

  test('before the first date nothing is done', () => {
    const p = progress(stages, '2026-05-01', COMPLETION);
    assert.equal(p.phase, 'before-start');
    assert.equal(p.current?.id, 's1');
  });

  test('no dates at all', () => {
    const p = progress([stage(1, null), stage(2, null)], '2026-10-12', COMPLETION);
    assert.equal(p.phase, 'no-dates');
    assert.equal(p.current, null);
    assert.deepEqual(p.states, { s1: 'undated', s2: 'undated' });
  });

  test('every dated stage passed, then the completion date passed', () => {
    assert.equal(progress(stages, '2027-02-01', COMPLETION).phase, 'finished');
    assert.equal(progress(stages, '2027-02-01', COMPLETION).countdown, '25 days left');
    const closed = progress(stages, '2027-02-27', COMPLETION);
    assert.equal(closed.phase, 'closed');
    assert.equal(closed.countdown, null);
  });
});
