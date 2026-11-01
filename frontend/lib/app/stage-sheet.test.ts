import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { checkpointCounts, dropSaved, oneStageDates, stageFromParam, stageItems, tickLists } from './stage-sheet.ts';

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

const student = (studentId: string, firstName: string, lastName: string, state: 'NOT_DUE' | 'DUE' | 'READY' | 'SIGNED_OFF') => ({
  studentId, firstName, lastName, behindBy: 0, lastLogActivityOn: null, daysSinceLastLogActivity: null, documentLink: null,
  cells: [{ checkpointId: 'c2', state, signedOffOn: null }],
});
const grid = {
  stages: [
    { stageId: 's2', ordinal: 2, label: 'Stage 2', name: 'Two', dueDate: null, checkpoint: { id: 'c2', text: 'Discussed' } },
    { stageId: 's6', ordinal: 6, label: 'Stage 6', name: 'Six', dueDate: null, checkpoint: null },
  ],
  students: [student('a', 'Aoife', 'Byrne', 'SIGNED_OFF'), student('b', 'Cian', 'Murphy', 'READY'), student('c', 'Ella', 'Doyle', 'DUE'), student('d', 'Finn', 'Allen', 'NOT_DUE')],
  itemTicks: [{ itemId: 'i1', studentIds: ['b', 'a'] }],
};

describe('stage sheet progress helpers', () => {
  test('checkpointCounts: signed off, waiting (Ready), and the rest as not yet', () => {
    assert.deepEqual(checkpointCounts(grid, 's2'), { signedOff: 1, waiting: 1, notYet: 2 });
    assert.equal(checkpointCounts(grid, 's6'), null);
  });

  test('tickLists: full names, by surname, ticked and not', () => {
    assert.deepEqual(tickLists(grid, 'i1'), { ticked: ['Aoife Byrne', 'Cian Murphy'], notYet: ['Finn Allen', 'Ella Doyle'] });
    assert.deepEqual(tickLists(grid, 'i9').ticked, []);
  });
});
