import type { GridStage, ProgressGrid, ProgressStudent } from "@/lib/api/schemas";

import { formatCalendarDate } from "./component-setup.ts";

/** The Hide names cookie (plan P4-15): read by the server so the first paint is already blurred. */
export const HIDE_NAMES_COOKIE = "app_hide_names";

type Staged = Pick<GridStage, "ordinal" | "label">;

/** `?stage=` key (plan P4-24). */
export function stageKey(stage: Staged): string {
  return stage.label === null ? "R" : String(stage.ordinal);
}

export function stageLabel(stage: Pick<GridStage, "label">): string {
  return stage.label ?? "Report";
}

/** Pack D-7's column headers: each a cut of its checkpoint's own words, never reworded (plan P4-23). */
export const CHECKPOINT_SHORT: Readonly<Record<string, string>> = {
  "Initial ideas discussed with the teacher": "Initial ideas",
  "Investigative log shared with the teacher": "Investigative log",
  "Plan discussed with the teacher (feasibility and safety)": "Plan discussed",
  "Experiment carried out under supervision, in line with the research and planning already shared": "Experiment carried out",
  "Data analysis shared with the teacher": "Data analysis",
  "Final report submitted to the teacher": "Final report",
  "Research question discussed with the teacher": "Research question",
  "Project plan shared with the teacher": "Project plan",
  "Research shared when the teacher asks": "Research shared",
  "Analysis and evaluation shared with the teacher": "Analysis and evaluation",
  "Final report submitted for review and authentication": "Final report",
};

export function shortCheckpoint(text: string): string {
  return CHECKPOINT_SHORT[text] ?? text.split(" ").slice(0, 3).join(" ");
}

type WithCheckpoint = GridStage & { checkpoint: NonNullable<GridStage["checkpoint"]> };

export function checkpointStages(grid: Pick<ProgressGrid, "stages">): WithCheckpoint[] {
  return grid.stages.filter((s): s is WithCheckpoint => s.checkpoint !== null);
}

const isDue = (stage: GridStage, today: string) => stage.dueDate !== null && stage.dueDate < today;

export function dueStages(grid: Pick<ProgressGrid, "stages" | "today">): WithCheckpoint[] {
  return checkpointStages(grid).filter((s) => isDue(s, grid.today));
}

function joinAnd(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "Stages 1, 2 and 3", "Stage 2", or labels joined when not all are numbered stages. */
export function listStages(stages: Pick<GridStage, "label">[]): string {
  const labels = stages.map(stageLabel);
  if (labels.length === 1) return labels[0];
  const numbers = labels.map((l) => /^Stage (\d+)$/.exec(l)?.[1]);
  return numbers.every(Boolean) ? `Stages ${joinAnd(numbers as string[])}` : joinAnd(labels);
}

type Next = { label: string; date: string } | null;
export type Summary =
  | { kind: "noDates" }
  | { kind: "nothingDue"; next: Next }
  | { kind: "upToDate"; total: number; due: string; next: Next }
  | { kind: "behind"; behind: number; total: number; due: string; dueCount: number; noCheckpoint: string[] };

/** The answer line (pack D-7): what the page is for, in one sentence. */
export function summary(grid: ProgressGrid): Summary {
  const stages = checkpointStages(grid);
  if (stages.every((s) => s.dueDate === null)) return { kind: "noDates" };
  const due = dueStages(grid);
  const upcoming = stages.filter((s) => s.dueDate !== null && !isDue(s, grid.today))
    .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))[0];
  const next = upcoming ? { label: stageLabel(upcoming), date: formatCalendarDate(upcoming.dueDate as string) } : null;
  if (due.length === 0) return { kind: "nothingDue", next };
  const behind = grid.students.filter((s) => s.behindBy > 0).length;
  if (behind === 0) return { kind: "upToDate", total: grid.students.length, due: listStages(due), next };
  return {
    kind: "behind", behind, total: grid.students.length, due: listStages(due), dueCount: due.length,
    noCheckpoint: grid.stages.filter((s) => s.checkpoint === null).map(stageLabel),
  };
}

export type Band = { behindBy: number; students: ProgressStudent[] };

/** Consecutive rows with the same band, in the order given. `bandOf` lets the grid keep the bands it loaded with. */
export function bands(students: ProgressStudent[], bandOf: (s: ProgressStudent) => number = (s) => s.behindBy): Band[] {
  const out: Band[] = [];
  for (const s of students) {
    const b = bandOf(s);
    if (out.length > 0 && out[out.length - 1].behindBy === b) out[out.length - 1].students.push(s);
    else out.push({ behindBy: b, students: [s] });
  }
  return out;
}

export function bandHeading(behindBy: number): { numeral: string | null; label: string } {
  if (behindBy === 0) return { numeral: null, label: "Up to date" };
  return { numeral: String(behindBy), label: behindBy === 1 ? "checkpoint behind" : "checkpoints behind" };
}

export const studentCount = (n: number) => `${n} ${n === 1 ? "student" : "students"}`;
export const behindWords = (n: number) => (n === 0 ? "Up to date" : `Behind by ${n}`);
export const fullName = (s: { firstName: string; lastName: string }) => `${s.firstName} ${s.lastName}`;

export function lastEntryWords(days: number | null): string {
  if (days === null) return "No entries yet";
  if (days === 0) return "Last entry today";
  if (days === 1) return "Last entry yesterday";
  return `Last entry ${days} days ago`;
}

/** Pack D-7: at 14 days or more, or with no entries, the log line goes ink and 600 weight. Never amber. */
export const isQuiet = (days: number | null) => days === null || days >= 14;

export function missingText(student: ProgressStudent, grid: Pick<ProgressGrid, "stages">): string | null {
  const missing = checkpointStages(grid).filter((_, i) => student.cells[i]?.state === "DUE");
  return missing.length === 0 ? null : `Not signed off: ${listStages(missing)}`;
}

/** Plan P4-11: lay rows out in the order first rendered; anyone new goes last, in server order. */
export function inOrder<T extends { studentId: string }>(students: T[], order: string[]): T[] {
  const at = new Map(order.map((id, i) => [id, i]));
  return [...students].sort((a, b) => (at.get(a.studentId) ?? order.length) - (at.get(b.studentId) ?? order.length));
}

export function parseStage(param: string | undefined, grid: Pick<ProgressGrid, "stages">): string | null {
  if (param === "all") return "all";
  return checkpointStages(grid).some((s) => stageKey(s) === param) ? (param as string) : null;
}

/** Pack D-7: the phone opens on the latest due stage, else the first stage with a checkpoint. */
export function latestDueKey(grid: Pick<ProgressGrid, "stages" | "today">): string {
  const due = dueStages(grid);
  const stage = due[due.length - 1] ?? checkpointStages(grid)[0];
  return stage ? stageKey(stage) : "all";
}

export function stageStateWord(stage: GridStage, today: string): "Due" | "Not due" | "No date" {
  if (stage.dueDate === null) return "No date";
  return isDue(stage, today) ? "Due" : "Not due";
}

export function pickName(stage: GridStage, today: string): string {
  const date = stage.dueDate ? formatCalendarDate(stage.dueDate) : "no date set";
  return `${stageLabel(stage)}, ${shortCheckpoint(stage.checkpoint?.text ?? stage.name)}, ${date}, ${stageStateWord(stage, today).toLowerCase()}`;
}

export type SignoffAction = "sign" | "undo" | "revoke";

export const signName = (text: string, name: string) => `Sign off ${text} for ${name}`;
export const undoName = (text: string, name: string) => `Undo sign-off of ${text} for ${name}`;
export const revokeName = (text: string, name: string) => `Revoke sign-off of ${text} for ${name}`;
export const keepName = (text: string, name: string) => `Keep sign-off of ${text} for ${name}`;

export function doneSentence(action: SignoffAction, text: string, name: string): string {
  if (action === "sign") return `Signed off: ${text}, for ${name}.`;
  return `Sign-off ${action === "undo" ? "undone" : "revoked"}: ${text}, for ${name}. It stays in the record.`;
}

export function failSentence(action: SignoffAction, text: string, name: string): string {
  const verb = action === "sign" ? "sign off" : action === "undo" ? "undo the sign-off of" : "revoke the sign-off of";
  return `Couldn’t ${verb} “${text}” for ${name}. Nothing changed. Check your connection and try again.`;
}

export function revokeQuestion(text: string, name: string, where: "grid" | "student"): string {
  return where === "grid"
    ? `Revoke the sign-off of “${text}” for ${name}? It stays in the record as revoked by you.`
    : `Revoke this sign-off for ${name}? It stays in the record as revoked by you.`;
}
