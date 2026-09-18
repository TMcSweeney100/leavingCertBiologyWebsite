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
