import type { AiUseFields } from "@/lib/api/schemas";

import { ddmmyyyy } from "./citation.ts";

/** SEC-RULES p. 34 (decision A-16). AppCopySourcesTest proves it's on its page. */
export const APPENDIX_RULE = "The use of all AI tools must be documented in a dedicated section of the coursework, such as an appendix section.";

/** Decision A-5: the SEC's example columns (SEC-RULES p. 35) without its first one. */
const COLUMNS = ["AI tool", "Developer", "Date of use", "Purpose"] as const;

export type AppendixRow = { id: string; tool: string; developer: string; date: string; purpose: string; prompts: string | null; shareUrl: string | null };

/** Decision A-13: oldest first, as the SEC's example runs. `sort` is stable, so ties keep the log's order. */
export function appendixRows(uses: ReadonlyArray<{ id: string; fields: AiUseFields }>): AppendixRow[] {
  return [...uses]
    .sort((a, b) => a.fields.dateGenerated.localeCompare(b.fields.dateGenerated))
    .map(({ id, fields: f }) => ({
      id, tool: f.toolNameAndVersion.trim(), developer: f.developer.trim(), date: ddmmyyyy(f.dateGenerated), purpose: f.howUsed.trim(),
      prompts: f.prompts?.trim() || null, shareUrl: f.shareUrl?.trim() || null,
    }));
}

/** The four columns, then the prompt and link the SEC asks for "in the appendix" (decision A-6). */
export function appendixPairs(r: AppendixRow): Array<[string, string]> {
  const pairs: Array<[string, string]> = [[COLUMNS[0], r.tool], [COLUMNS[1], r.developer], [COLUMNS[2], r.date], [COLUMNS[3], r.purpose]];
  if (r.prompts) pairs.push(["Prompt(s)", r.prompts]);
  if (r.shareUrl) pairs.push(["Share link", r.shareUrl]);
  return pairs;
}

export function appendixText(rows: readonly AppendixRow[]): string {
  return rows.map((r) => appendixPairs(r).map(([k, v]) => `${k}: ${v}`).join("\n")).join("\n\n");
}

const cell = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\n/g, "<br>");

/** Decision A-14: pastes into Google Docs and Word as a real table. */
export function appendixHtml(rows: readonly AppendixRow[]): string {
  const head = `<tr>${COLUMNS.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  const body = rows.map((r) => {
    const row = `<tr>${[r.tool, r.developer, r.date, r.purpose].map((v) => `<td>${cell(v)}</td>`).join("")}</tr>`;
    const extra = appendixPairs(r).slice(COLUMNS.length).map(([k, v]) => `${k}: ${cell(v)}`).join("<br>");
    return extra ? `${row}<tr><td colspan="${COLUMNS.length}">${extra}</td></tr>` : row;
  }).join("");
  return `<table border="1"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}
