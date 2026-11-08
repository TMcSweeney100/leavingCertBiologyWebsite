import type { ProgressGrid } from '@/lib/api/schemas';

import { letteredItems, type LetteredItem, type StageLike } from './component-setup.ts';
import type { Picking } from './date-marks.ts';
import { fullName, studentCount } from './progress.ts';

/**
 * The stage sheet's pure parts (plan stage-sheet). The page keeps only the teacher's edits over what's saved, dates and
 * note drafts alike (Concepts in play, "Store the edits, not a copy"): after any save, an edit that now matches what's
 * saved is done.
 */
export function dropSaved(edits: Record<string, string>, saved: Record<string, string>): Record<string, string> {
  const kept = Object.entries(edits).filter(([id, value]) => value !== (saved[id] ?? ''));
  return kept.length === Object.keys(edits).length ? edits : Object.fromEntries(kept);
}

/** Save this date (S-7). The endpoint replaces every date, so every other stage sends its saved date, not its draft. */
export function oneStageDates(
  stages: ReadonlyArray<{ id: string; dueDate: string | null }>,
  stageId: string,
  value: string,
): { stageId: string; dueDate: string | null }[] {
  return stages.map((s) => ({ stageId: s.id, dueDate: s.id === stageId ? value || null : s.dueDate }));
}

/** `?stage=2` names the open sheet (S-18). */
export function stageFromParam(
  param: string | null | undefined,
  stages: ReadonlyArray<{ id: string; ordinal: number }>,
): string | null {
  if (!param || !/^\d+$/.test(param)) return null;
  return stages.find((s) => s.ordinal === Number(param))?.id ?? null;
}

/** One stage's items. Letters run across the whole component (pack D-5), so they're worked out from every stage. */
export function stageItems(stages: ReadonlyArray<StageLike>, stageId: string): LetteredItem[] {
  return letteredItems(stages).filter((item) => item.stageId === stageId);
}

/** What the sheet's calendar view needs: who asked, for what, and where focus goes back to. */
export type DateRequest = {
  title: string;
  eyebrow: string;
  help: string;
  picking: Picking;
  value: string;
  onPick: (iso: string) => void;
  from: HTMLElement | null;
};

export type CheckpointCounts = { signedOff: number; waiting: number; notYet: number };

/** The counts line (S-27). Null for a stage with nothing to sign off (Business Stage 6). */
export function checkpointCounts(grid: Pick<ProgressGrid, 'stages' | 'students'>, stageId: string): CheckpointCounts | null {
  const checkpointId = grid.stages.find((s) => s.stageId === stageId)?.checkpoint?.id;
  if (!checkpointId) return null;
  const counts = { signedOff: 0, waiting: 0, notYet: 0 };
  for (const student of grid.students) {
    const state = student.cells.find((c) => c.checkpointId === checkpointId)?.state;
    if (state === 'SIGNED_OFF') counts.signedOff += 1;
    else if (state === 'READY') counts.waiting += 1;
    else counts.notYet += 1;
  }
  return counts;
}

/** The checkpoint bar's accessible name (plan stage-drawer-redesign R-17): the counts it draws, in words. */
export function countsLabel(counts: CheckpointCounts): string {
  const total = counts.signedOff + counts.waiting + counts.notYet;
  return `${counts.signedOff} signed off, ${counts.waiting} waiting, ${counts.notYet} not yet, of ${studentCount(total)}`;
}

export type TickLists = { ticked: string[]; notYet: string[] };

/** Who has ticked one item, and who hasn't (S-16, S-28): approved students, full names, by surname. */
export function tickLists(grid: Pick<ProgressGrid, 'students' | 'itemTicks'>, itemId: string): TickLists {
  const ticked = new Set(grid.itemTicks.find((t) => t.itemId === itemId)?.studentIds ?? []);
  const byName = [...grid.students].sort(
    (a, b) => a.lastName.localeCompare(b.lastName, 'en-IE') || a.firstName.localeCompare(b.firstName, 'en-IE'),
  );
  return {
    ticked: byName.filter((s) => ticked.has(s.studentId)).map(fullName),
    notYet: byName.filter((s) => !ticked.has(s.studentId)).map(fullName),
  };
}
