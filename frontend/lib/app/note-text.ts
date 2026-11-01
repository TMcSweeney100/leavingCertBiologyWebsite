/** A teacher's note (plan stage-sheet S-8, S-26): plain text, at most this long. */
export const NOTE_MAX = 1000;

export type NotePart = { kind: 'text'; text: string } | { kind: 'link'; href: string };

// Only http(s), so `javascript:` and friends never become links. Rendered as React elements, never as HTML.
const LINK = /https?:\/\/[^\s<>"]+/gi;
const TRAILING = /[.,;:!?)\]'"]+$/;

export function noteParts(text: string): NotePart[] {
  const parts: NotePart[] = [];
  let rest = 0;
  for (const match of text.matchAll(LINK)) {
    const href = match[0].replace(TRAILING, '');
    const start = match.index ?? 0;
    if (start > rest) parts.push({ kind: 'text', text: text.slice(rest, start) });
    parts.push({ kind: 'link', href });
    rest = start + href.length;
  }
  if (rest < text.length) parts.push({ kind: 'text', text: text.slice(rest) });
  return parts;
}

const DAY = 86_400_000;

/** "Note updated" (S-9, S-23): from the day of the change, for 7 days. Calendar dates, read in UTC like the rest of lib/app. */
export function recentlyUpdated(updatedOn: string, today: string): boolean {
  const days = (Date.parse(today) - Date.parse(updatedOn)) / DAY;
  return days >= 0 && days < 7;
}
