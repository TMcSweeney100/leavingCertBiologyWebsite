import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { dropSaved, oneStageDates, stageFromParam, stageItems } from './stage-sheet.ts';

const stages = [
  { id: 's1', ordinal: 1, label: 'Stage 1', name: 'One', dueDate: '2026-09-20', items: [{ id: 'i2', text: 'Later', dueDate: '2026-10-08' }] },
  { id: 's2', ordinal: 2, label: 'Stage 2', name: 'Two', dueDate: null, items: [{ id: 'i1', text: 'Sooner', dueDate: '2026-10-06' }, { id: 'i3', text: 'Undated', dueDate: null }] },
];

describe('stage sheet helpers', () => {
  test('dropSaved keeps only the edits that still differ from what is saved', () => {
    const edits = { s1: '2026-09-21', s2: '2026-10-10' };
    assert.deepEqual(dropSaved(edits, { s1: '2026-09-21', s2: '' }), { s2: '2026-10-10' });
    assert.equal(dropSaved(edits, { s1: '', s2: '' }), edits, 'nothing dropped: the same object, so React skips a render');
  });

  test("oneStageDates sends the one stage's new date and every other stage's saved date", () => {
    assert.deepEqual(oneStageDates(stages, 's2', '2026-10-10'), [
      { stageId: 's1', dueDate: '2026-09-20' },
      { stageId: 's2', dueDate: '2026-10-10' },
    ]);
    assert.deepEqual(oneStageDates(stages, 's1', ''), [
      { stageId: 's1', dueDate: null },
      { stageId: 's2', dueDate: null },
    ]);
  });

  test('stageFromParam reads ?stage=N, and ignores anything else', () => {
    assert.equal(stageFromParam('2', stages), 's2');
    assert.equal(stageFromParam('7', stages), null);
    assert.equal(stageFromParam('2x', stages), null);
    assert.equal(stageFromParam(null, stages), null);
  });

  test("stageItems keeps each item's letter from the whole component", () => {
    assert.deepEqual(stageItems(stages, 's2').map((i) => [i.letter, i.text]), [['A', 'Sooner'], ['C', 'Undated']]);
  });
});
