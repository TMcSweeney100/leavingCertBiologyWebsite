import type { ProgressGrid, ProgressStudent, WaitingRequest } from "@/lib/api/schemas";

/** One small class for the Progress specs: two stages, both due on 14 Dec 2026. */
export const INITIAL = "Initial ideas discussed with the teacher";
export const LOG = "Investigative log shared with the teacher";

type State = ProgressStudent["cells"][number]["state"];

export const row = (id: string, first: string, last: string, behindBy: number, states: [State, State], days: number | null,
  link?: string): ProgressStudent => ({
  studentId: id, firstName: first, lastName: last, behindBy, lastLogActivityOn: null, daysSinceLastLogActivity: days,
  documentLink: link ? { url: link, setOn: "2026-12-01" } : null,
  cells: states.map((state, i) => ({ checkpointId: `c${i + 1}`, state, signedOffOn: state === "SIGNED_OFF" ? "2026-10-02" : null })),
});

export const waitingFor = (s: ProgressStudent, checkpoint: 1 | 2): WaitingRequest => ({
  studentId: s.studentId, firstName: s.firstName, lastName: s.lastName, checkpointId: `c${checkpoint}`,
  checkpointText: checkpoint === 1 ? INITIAL : LOG, askedOn: "2026-12-12", note: null,
});

export const grid = (students: ProgressStudent[], waiting: WaitingRequest[] = []): ProgressGrid => ({
  componentId: "k1", classId: "cl1", className: "6A Biology", today: "2026-12-14",
  stages: [
    { stageId: "s1", ordinal: 1, label: "Stage 1", name: "Initial", dueDate: "2026-10-02", checkpoint: { id: "c1", text: INITIAL } },
    { stageId: "s2", ordinal: 2, label: "Stage 2", name: "Research", dueDate: "2026-11-06", checkpoint: { id: "c2", text: LOG } },
  ],
  students, waiting, itemTicks: [],
});
