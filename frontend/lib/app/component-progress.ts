import { countdownText } from '../schedule.ts';

export type StageState = 'done' | 'current' | 'upcoming' | 'undated';
export type Phase = 'no-dates' | 'before-start' | 'in-progress' | 'finished' | 'closed';

type Dated = { id: string; ordinal: number; dueDate: string | null };

const MS_PER_DAY = 86_400_000;
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/**
 * Where a student is (plan 2E P2-36). `today` is the server's Dublin date (P2-35), so nothing here reads a
 * clock. "Current" is the first stage, by ordinal, dated today or later: a pointer, never a gate (design §4.6).
 */
export function progress<S extends Dated>(stages: ReadonlyArray<S>, today: string, completionDate: string) {
  const ordered = [...stages].sort((a, b) => a.ordinal - b.ordinal);
  const t = day(today);
  const dated = ordered.filter((s) => s.dueDate !== null);
  const current = ordered.find((s) => s.dueDate !== null && day(s.dueDate) >= t) ?? null;

  const states: Record<string, StageState> = {};
  for (const s of ordered) {
    states[s.id] = s.dueDate === null ? 'undated'
      : s === current ? 'current'
      : day(s.dueDate) < t ? 'done'
      : 'upcoming';
  }

  const phase: Phase = t > day(completionDate) ? 'closed'
    : dated.length === 0 ? 'no-dates'
    : current === null ? 'finished'
    : dated.every((s) => day(s.dueDate!) >= t) ? 'before-start'
    : 'in-progress';

  const target = phase === 'closed' || phase === 'no-dates' ? null : current?.dueDate ?? completionDate;
  const daysLeft = target === null ? null : Math.round((day(target) - t) / MS_PER_DAY);
  return {
    phase,
    current: phase === 'closed' ? null : current,
    states,
    countdown: daysLeft === null ? null : countdownText(daysLeft, daysLeft === 0),
  };
}

/** Pack D-3: the word and colour a stage state gets everywhere it's shown (the strip, a
 * stage card's pill). One source so the strip and the card list can't disagree. */
export const STAGE_STATE_WORD: Record<StageState, string> = { done: 'Done', current: 'Now', upcoming: 'Upcoming', undated: 'No date yet' };
export const STAGE_STATE_STYLE: Record<StageState, string> = {
  done: 'bg-app-done-ground text-app-done',
  current: 'bg-app-now text-white',
  upcoming: 'border border-app-field-border bg-app-surface text-app-grey',
  undated: 'border border-app-field-border bg-app-surface text-app-grey',
};

// Deliberately not STAGE_STATE_WORD lowercased at the call site: the pill's capital "Done"
// is always shown through an `uppercase` CSS class, but the legend is a plain sentence
// ("Stage 4 now"), so its words need their own natural case.
const LEGEND_WORD: Record<StageState, string> = { done: 'done', current: 'now', upcoming: 'upcoming', undated: 'no date yet' };

/**
 * Pack D-3: at 390 the stage strip's cells drop to numerals only, so this sentence is the
 * only place the state word survives at that width ("colour is never the only carrier",
 * design §5). Groups consecutive same-state ordinals: "Stages 1 to 3 done", "Stages 5 and 6
 * upcoming", "Stage 4 now".
 */
export function stageLegend<S extends { id: string; ordinal: number }>(stages: ReadonlyArray<S>, states: Record<string, StageState>): string {
  const ordered = [...stages].sort((a, b) => a.ordinal - b.ordinal);
  const groups: { ordinals: number[]; state: StageState }[] = [];
  for (const s of ordered) {
    const state = states[s.id];
    const last = groups[groups.length - 1];
    if (last && last.state === state) last.ordinals.push(s.ordinal);
    else groups.push({ ordinals: [s.ordinal], state });
  }
  return groups
    .map(({ ordinals, state }) => {
      const first = ordinals[0];
      const last = ordinals[ordinals.length - 1];
      const range = ordinals.length === 1 ? `Stage ${first}`
        : ordinals.length === 2 ? `Stages ${first} and ${last}`
        : `Stages ${first} to ${last}`;
      return `${range} ${LEGEND_WORD[state]}`;
    })
    .join(' · ');
}
