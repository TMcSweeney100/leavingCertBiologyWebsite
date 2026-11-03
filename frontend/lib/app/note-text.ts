/** A teacher's note (plan stage-sheet S-8, S-26): plain text, at most this long. */
export const NOTE_MAX = 1000;

export type NotePart = { kind: 'text'; text: string } | { kind: 'link'; href: string };

// Only http(s), so `javascript:` and friends never become links. Rendered as React elements, never as HTML.
const LINK = /https?:\/\/[^\s<>"]+/gi;
// A closing bracket is not here: it ends the address only when nothing in the address opened it (see `linkEnd`).
const TRAILING = /[.,;:!?\]'"]+$/;

const count = (text: string, char: string) => text.split(char).length - 1;

/** The address without the punctuation of the sentence around it. `(see https://x.ie/a)` ends at `a`; `…/Osmosis_(biology)` keeps its `)`. */
function linkEnd(address: string): string {
  let end = address;
  for (;;) {
    const bare = end.replace(TRAILING, '');
    if (bare !== end) end = bare;
    else if (end.endsWith(')') && count(end, ')') > count(end, '(')) end = end.slice(0, -1);
    else return end;
  }
}

export function noteParts(text: string): NotePart[] {
  const parts: NotePart[] = [];
  let rest = 0;
  for (const match of text.matchAll(LINK)) {
    const href = linkEnd(match[0]);
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
