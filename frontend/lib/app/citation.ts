import type { AiUseFields, SourceFields, SourceType } from "@/lib/api/schemas";

import { isOnline } from "./log.ts";

/** "17/06/2024" from the date picker's "2024-06-17" (decision S-9). */
export function ddmmyyyy(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** "McLeskey" from "McLeskey, J."; a name with no comma ("Latin Library") is kept whole. */
export function shortName(author: string): string {
  return author.split(",")[0].trim();
}

/** "thelatinlibrary.com/101/RhetoricalDevices", the NCCA's in-text form of a link (NCCA-BIO p. 15). */
export function shortLink(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "").replace(/\.[a-z0-9]{1,5}$/i, "");
    return `${u.hostname.replace(/^www\./, "")}${path}${u.search}`;
  } catch {
    return url;
  }
}

export type MissingDetail = "author" | "datePublished" | "publication" | "locator" | "url" | "dateAccessed" | "shareUrlOrPrompt";

/** What a source becomes in the report, and what it still lacks (decision S-2: save and flag, never block). */
export type Citation = { inText: string; reference: string; missing: MissingDetail[] };

/** NCCA-BIO p. 15, NCCA-BUS p. 20 (decision S-15). AppCopySourcesTest proves it's on both pages. */
export const NO_FORMAL_STYLE = "No particular, formal style of referencing is required.";
export const LIST_RULE = "Built from the sources and AI uses in your log, in alphabetical order, including the ones only you can read.";

const NO_DATE = "date not available";

/** Decision S-10, from "How students should reference different sources" (NCCA-BIO p. 15). */
const WANTED: Record<SourceType, MissingDetail[]> = {
  BOOK: ["author", "datePublished", "locator"],
  NEWSPAPER_OR_MAGAZINE: ["author", "datePublished", "publication"],
  ONLINE_TEXT_OR_IMAGE: ["url", "dateAccessed"],
  ONLINE_AUDIO: ["url", "dateAccessed", "locator"],
  ONLINE_VIDEO: ["url", "dateAccessed", "locator"],
  OTHER: ["author", "datePublished"],
};

const WORDS: Record<MissingDetail, string> = {
  author: "the author",
  datePublished: "the date published",
  publication: "the newspaper or magazine",
  locator: "the page, chapter or timestamp you used",
  url: "the link",
  dateAccessed: "the date accessed",
  shareUrlOrPrompt: "the share link or the prompt you used",
};

const text = (s: string | null): string | null => s?.trim() || null;
const joined = (parts: Array<string | null>): string => parts.filter(Boolean).join(", ");

/** Decision S-4: one pattern per type, modelled on NCCA-BIO pp. 15-16. The differences are tabled in the plan. */
export function citation(f: SourceFields): Citation {
  const title = f.title.trim();
  const author = text(f.author);
  const date = text(f.datePublished);
  const publication = text(f.publication);
  const locator = text(f.locator);
  const url = text(f.url);
  const accessed = url && f.dateAccessed ? `Date accessed: ${ddmmyyyy(f.dateAccessed)}` : null;
  const present: Partial<Record<MissingDetail, string | null>> = { author, datePublished: date, publication, locator, url, dateAccessed: f.dateAccessed };
  const missing = WANTED[f.type].filter((k) => !present[k]);

  if (isOnline(f.type)) {
    return {
      inText: `(${joined([locator, url ? shortLink(url) : title])})`,
      reference: joined([author, publication, title, date ? `date created: ${date}` : NO_DATE, url, accessed, locator]),
      missing,
    };
  }
  const shown = f.type === "NEWSPAPER_OR_MAGAZINE" ? `‘${title}’` : title;
  const when = `(${date ?? NO_DATE})`;
  return {
    inText: `(${joined([locator, author ? shortName(author) : title, date])})`,
    reference: joined([author ? `${author} ${when} ${shown}` : `${shown} ${when}`, publication, url, accessed]),
    missing,
  };
}

/** Decision A-7: modelled on NCCA-BIO pp. 15-16's AI examples. The differences are tabled in the plan. */
export function aiCitation(f: AiUseFields): Citation {
  const tool = f.toolNameAndVersion.trim();
  const developer = f.developer.trim();
  const date = ddmmyyyy(f.dateGenerated);
  const year = f.dateGenerated.slice(0, 4);
  const link = text(f.shareUrl);
  const prompt = text(f.prompts)?.replace(/\s+/g, " ") ?? null;
  const head = `${developer} (${year}) ${tool}, accessed ${date}.`;
  return {
    inText: link ? `(${shortLink(link)})` : `(${developer} (${year}) ${tool}, ${date})`,
    reference: link ? `${head} ${link}` : prompt ? `${head} Prompt used: ${prompt}` : head,
    missing: link || prompt ? [] : ["shareUrlOrPrompt"],
  };
}

/** "Add the author and the date published so a reader can check this source." */
export function missingLine(missing: readonly MissingDetail[]): string | null {
  if (missing.length === 0) return null;
  const words = missing.map((m) => WORDS[m]);
  const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
  return `Add ${list} so a reader can check this source.`;
}

const ORDER = new Intl.Collator("en-IE", { sensitivity: "base" });
const sortKey = (reference: string) => reference.replace(/^[‘'"]/, "");

/** One row of the Sources page: a source or an AI use (decision A-3). */
export type ListEntry = { id: string; kind: "SOURCE"; fields: SourceFields } | { id: string; kind: "AI_USE"; fields: AiUseFields };

const cite = (e: ListEntry): Citation => (e.kind === "AI_USE" ? aiCitation(e.fields) : citation(e.fields));

/** Decisions S-7 and A-11: one alphabetical list by reference. */
export function referenceList<T extends ListEntry>(entries: readonly T[]): Array<T & { citation: Citation }> {
  return entries
    .map((e) => ({ ...e, citation: cite(e) }))
    .sort((a, b) => ORDER.compare(sortKey(a.citation.reference), sortKey(b.citation.reference)));
}

/** Decision S-8: plain text, one reference per line. */
export function copyText(list: ReadonlyArray<{ citation: Citation }>): string {
  return list.map((s) => s.citation.reference).join("\n");
}

/** The source form's values as fields, for the live preview. No title yet, nothing to preview. */
export function sourceFromForm(values: Record<string, string | undefined>): SourceFields | null {
  const v = (k: string) => values[k]?.trim() || null;
  const title = v("title");
  if (!title) return null;
  return {
    type: (values.type ?? "BOOK") as SourceType, title, author: v("author"), publication: v("publication"),
    datePublished: v("datePublished"), url: v("url"), dateAccessed: v("dateAccessed"), locator: v("locator"),
    keyInformation: null, relevance: null, reflections: null,
  };
}
