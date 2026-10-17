/** Ready-for-signoff copy and accessible names. The names are the specs' contract; D-10 may restyle, never rename. */

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
