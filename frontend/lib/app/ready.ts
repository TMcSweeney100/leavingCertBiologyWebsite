/** Ready-for-signoff copy and accessible names. The names are the specs' contract; D-10 may restyle, never rename. */

import type { z } from "zod";

import type { checkpointStateSchema } from "@/lib/api/schemas";

export const STUDENT_NOTE_MAX = 280;
export const TEACHER_NOTE_MAX = 500;

/** FR-40, quoted from the 2027 briefs, p. 3 (all four). AppCopySourcesTest checks the same literal. */
export const BACKUP_ADVICE =
  "It is strongly recommended that you make and regularly update a backup copy of your digital report, which can be used in the event of loss or corruption.";
export const BACKUP_SOURCE = "Your SEC brief";

export const NONDIRECTIVE_HELP = "Keep it general: what's missing, not how to fix it. Teachers don't correct the report for redrafting.";

export const waitingHeading = (n: number) =>
  n === 0 ? "No one is waiting for you" : `${n} ${n === 1 ? "student" : "students"} waiting for you`;
export const waitingBadge = (n: number) => `${n} waiting for sign-off`;

/** Whole days between two ISO dates (UTC midnight arithmetic, no timezone risk), said as the queue says it. */
export function askedWhen(askedOn: string, today: string): string {
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${askedOn}T00:00:00Z`)) / 86_400_000);
  return days <= 0 ? "asked today" : days === 1 ? "asked yesterday" : `asked ${days} days ago`;
}

export function linkHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const checkpointAnchor = (checkpointId: string) => `checkpoint-${checkpointId}`;

export const readyName = (text: string) => `Ready for sign-off: ${text}`;
export const withdrawName = (text: string) => `Withdraw request: ${text}`;
export const askAgainName = (text: string) => `Ask again: ${text}`;
export const acceptName = (text: string, name: string) => `Accept ${text} for ${name}`;
export const notYetName = (text: string, name: string) => `Not yet: ${text} for ${name}`;
export const reviewName = (text: string, name: string) => `Review ${text} for ${name}`;
export const openWorkName = (name?: string) => `Open ${name ? `${name}'s` : "your"} work (opens in a new tab)`;

/** Pack D-10: the teacher's review panel. The accessible names above stay the specs' contract; these are the visible words. */
export const acceptLabel = (stage: string) => `Accept and sign off ${stage}`;
export const openWorkLabel = (firstName: string) => `Open ${firstName}'s work`;
export const answerCount = (n: number) => `Full history (${n} ${n === 1 ? "answer" : "answers"})`;
export const noteLabel = (firstName: string) => `Note to ${firstName} (optional)`;

type CheckpointState = z.infer<typeof checkpointStateSchema>;
/** How a checkpoint's state reads in the drawer header. Keyed by the state union so a new state fails to compile. */
export const CHECKPOINT_STATE: Record<CheckpointState, { word: string; className: string }> = {
  READY: { word: "Ready for sign-off", className: "text-app-ready" },
  SIGNED_OFF: { word: "Signed off", className: "text-app-signed" },
  DUE: { word: "Due", className: "text-app-due" },
  NOT_DUE: { word: "Not due yet", className: "text-app-muted" },
};

/** "Cian asked again 4 days ago" / "Cian asked 4 days ago, for the first time". */
export function askedLine(firstName: string, askedOn: string, today: string, again: boolean): string {
  const ago = askedWhen(askedOn, today).replace(/^asked /, "");
  return again ? `${firstName} asked again ${ago}` : `${firstName} asked ${ago}, for the first time`;
}

export const answerFailure = (outcome: "ACCEPTED" | "NOT_YET", text: string, name: string) =>
  `Couldn’t ${outcome === "ACCEPTED" ? "accept" : "send Not yet for"} “${text}” for ${name}. Nothing changed. Check your connection and try again.`;
export const ANSWER_NO_ACCESS = "You can no longer answer this request. The page has been refreshed.";
export const REQUEST_GONE = "This request was withdrawn or already answered. The page has been refreshed.";

export const answeredBanner = (outcome: "ACCEPTED" | "NOT_YET") =>
  outcome === "ACCEPTED" ? "Accepted and signed off today" : "You answered Not yet today";
export const answerAnnouncement = (outcome: "ACCEPTED" | "NOT_YET", text: string, name: string) =>
  outcome === "ACCEPTED" ? `Accepted and signed off: ${text}, for ${name}.` : `Not yet sent: ${text}, for ${name}.`;
