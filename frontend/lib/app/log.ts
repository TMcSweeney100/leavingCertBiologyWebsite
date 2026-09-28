import type { EntryKind, LogEntry, SourceType } from "@/lib/api/schemas";

/** The kind is always a word, never colour alone. */
export const KIND_WORD: Record<EntryKind, string> = { NOTE: "Note", SOURCE: "Source", AI_USE: "AI use" };

/** NCCA-BIO p. 15-16's example headings, in the NCCA's order, plus the app's catch-all. */
export const SOURCE_TYPES: ReadonlyArray<{ value: SourceType; label: string }> = [
  { value: "BOOK", label: "Book" },
  { value: "NEWSPAPER_OR_MAGAZINE", label: "Newspaper or magazine article" },
  { value: "ONLINE_TEXT_OR_IMAGE", label: "Text or image online" },
  { value: "ONLINE_AUDIO", label: "Audio online" },
  { value: "ONLINE_VIDEO", label: "Video online" },
  { value: "OTHER", label: "Other (journal, report, organisation, person)" },
];

export const isOnline = (type: SourceType): boolean => type.startsWith("ONLINE_");

/** Labels for each field. The backend's LogFieldSourcesTest ties each field to its SEC or NCCA page. */
export const FIELD_LABELS = {
  body: { NOTE: "Note", SOURCE: "Notes (optional)", AI_USE: "Notes (optional)" },
  type: "Type of source",
  title: "Title",
  author: "Author (optional)",
  publication: "Newspaper, magazine or publisher (optional)",
  datePublished: "Date or year published (optional)",
  url: "Link",
  dateAccessed: "Date accessed",
  locator: "Page, chapter, section or timestamp (optional)",
  keyInformation: "Key information (optional)",
  relevance: "How and why this is relevant to my question (optional)",
  reflections: "My reflections (optional)",
  toolNameAndVersion: "AI tool and version",
  developer: "Developer or publisher",
  dateGenerated: "Date the output was generated",
  howUsed: "How you used it",
  prompts: "Prompts you used (optional)",
  shareUrl: "Share link (optional)",
} as const;

const DUBLIN_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit" });
const DAY_MONTH = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "long", timeZone: "UTC" });

/** The Irish calendar day an instant falls on, as YYYY-MM-DD. */
export function dublinDate(iso: string): string {
  return DUBLIN_DAY.format(new Date(iso));
}

/** "3 March", from a YYYY-MM-DD date. */
export function dayMonth(isoDate: string): string {
  return DAY_MONTH.format(new Date(`${isoDate}T00:00:00Z`));
}

/** FR-24e: said in words at the moment of writing. */
export function visibilityLine(visible: boolean, today: string): string {
  return visible
    ? "Your teacher can read this."
    : `Only you can read this. Your teacher sees that you made an entry on ${dayMonth(today)}.`;
}

/** The whole first line of a note, or the title of anything else. The list wraps it; `entryTitle` cuts it for names. */
export function entryHeading(entry: LogEntry): string {
  if (entry.kind === "SOURCE") return entry.fields.title;
  if (entry.kind === "AI_USE") return entry.fields.toolNameAndVersion;
  return (entry.body ?? "").split("\n")[0].trim();
}

/** The accessible name's version of the heading (pack D-6 question 8): cut at 80 characters. */
export function entryTitle(entry: LogEntry): string {
  const line = entryHeading(entry);
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
}

/** "example.ie" from a link, for showing where it goes without printing the whole address. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The second line of a list row: a source's type and locator (or host, when online), or "How you used it". */
export function entryDetail(entry: Pick<LogEntry, "kind" | "fields">): string | null {
  if (entry.kind === "AI_USE") return "How you used it";
  if (entry.kind !== "SOURCE") return null;
  const f = entry.fields as { type: SourceType; url: string | null; locator: string | null };
  const type = SOURCE_TYPES.find((t) => t.value === f.type)?.label.replace(/ article$/, "") ?? f.type;
  const where = isOnline(f.type) && f.url ? linkHost(f.url) : f.locator;
  return where ? `${type} · ${where}` : type;
}

/** What was wrong with a link the server refused, in words the student can act on. The app never rewrites what was typed. */
export function linkMessage(value: string): string {
  const v = value.trim();
  if (/^http:\/\//i.test(v)) return "This link starts with http://, which isn't secure. Use the https:// address: copy it again from your browser's address bar.";
  if (/^www\./i.test(v)) return `Add https:// to the start, like https://${v}`;
  return "That isn't a link. Copy the address from your browser's address bar; it starts with https://";
}

/** "3,850 of 4,000" once a field is within 10% of its limit; nothing before that. */
export function counterText(value: string, limit: number): string | null {
  return value.length >= limit * 0.9 ? `${value.length.toLocaleString("en-IE")} of ${limit.toLocaleString("en-IE")}` : null;
}
