import type { StudentCheckpoints } from "@/lib/api/schemas";

import { stageLabel } from "./progress.ts";

type State = StudentCheckpoints["stages"][number]["state"];

export type StageCounts = { signedOff: number; waiting: number; due: number; notDue: number; total: number };

/** Direction D's navy card: how many stages are in each state. */
export function stageCounts(stages: ReadonlyArray<{ state: State }>): StageCounts {
  const n = (state: State) => stages.filter((st) => st.state === state).length;
  return { signedOff: n("SIGNED_OFF"), waiting: n("READY"), due: n("DUE"), notDue: n("NOT_DUE"), total: stages.length };
}

export const signedOffWords = (c: StageCounts) => `${c.signedOff} of ${c.total} signed off`;

const STATE_WORDS: Record<State, string> = {
  SIGNED_OFF: "signed off", READY: "waiting for you", DUE: "due, not signed off", NOT_DUE: "not due yet",
};

/** R-20: a jump link's name says the stage, its checkpoint and its state, because the segment's colour can't. */
export function segmentName(st: { label: string | null; state: State; checkpoint: { text: string } }): string {
  return `${stageLabel(st)}, ${st.checkpoint.text}: ${STATE_WORDS[st.state]}`;
}

/** "TM" for Tim Mc Sweeney: the header card's square. */
export function initials(s: { firstName: string; lastName: string }): string {
  return `${s.firstName.trim().charAt(0)}${s.lastName.trim().charAt(0)}`.toUpperCase();
}
