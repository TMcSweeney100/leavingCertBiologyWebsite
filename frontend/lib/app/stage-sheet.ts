import { letteredItems, type LetteredItem, type StageLike } from './component-setup.ts';
import type { Picking } from './date-marks.ts';

/**
 * The stage sheet's pure parts (plan stage-sheet). The page keeps only the teacher's edits over the saved dates
 * (Concepts in play, "Store the edits, not a copy"): after any save, an edit that now matches what's saved is done.
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
