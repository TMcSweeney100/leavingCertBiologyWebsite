# AI-Use Record — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each AI use a student has logged becomes an NCCA-style in-text citation and reference entry, merged into the Sources page's one reference list with an "AI use" chip, plus a row of the SEC's AI appendix in a new section below it that copies as a table.

**Architecture:** No backend production change and no new endpoint. The Sources page already reads `GET /components/{id}/log`, which returns every one of the student's entries with their fields. `lib/app/citation.ts` gains `aiCitation(AiUseFields)`, and `referenceList` accepts both kinds. A new pure module, `lib/app/ai-appendix.ts`, turns AI uses into appendix rows, plain text and an HTML table. `SourceList` shows AI entries with the existing `LogKindChip`. A new client component, `AiAppendix`, shows the rows and copies them. Backend content tests prove that every NCCA and SEC string the frontend quotes is on its cited page.

**Tech Stack:** TypeScript, `node:test` for `lib/`, Next.js 15.3.9 server components, Vitest + Testing Library, the async Clipboard API (`navigator.clipboard.write` with `ClipboardItem`), Playwright + axe; JUnit + PDFBox for the source-text checks.

**Spec:** `docs/intent/ai-use-record.md` (the confirmed statement of intent, 25 Oct 2026). **Backlog:** `docs/BACKLOG.md` §2. **Roadmap:** milestone 6A. **Builds on:** `source-builder` (`docs/superpowers/plans/2026-10-25-source-builder.md`, decisions S-1 to S-15), on the same branch.

**The source documents (printed page numbers, as `SourceRef` uses; each one checked against the PDFs while writing this plan):**
- NCCA Biology guidelines Appendix 1 (`NCCA-BIO`): AI in-text examples on **p. 15**, AI reference examples on **p. 16**. Business Appendix Four (`NCCA-BUS`) carries the same examples on **pp. 22 and 23**.
- SEC Coursework Rules and Procedures 2025–26, Appendix 2 (`SEC-RULES`): minimum acknowledgment requirements and "Referencing AI tools" on **p. 34**; the example table on **p. 35**.

---

## Global Constraints

- **Test first, every task** (CLAUDE.md). Write the test, run it, and watch it fail for the reason you expect before writing the code.
- **Never invent SEC or NCCA content.** Every quoted string in this plan was copied from the PDFs. Task 2's tests prove each one is on its page. Never reword one to make a test pass.
- **Save and flag, never block** (intent). No new validation. `LogContent.aiUse` stays as it is (tool, developer, date and how used required).
- **No backend production code**, and no change to `AiUseFields` or its Zod schema. If a task seems to need one, stop and ask.
- **Student only.** Nothing new on any teacher page.
- **Specs query by role and accessible name.** The names in Tasks 5–7 are the contract a later D-9 restyle must keep.
- **Tokens only.** No raw hex.
- **`make verify` green before every task commit.** One task, one commit. The message says the behaviour.
- **Branch:** `pilot/source-builder`, the same branch as source-builder (Tim, 25 Oct 2026). Don't push; Tim pushes and merges.
- **Never commit** `docs/newDevelopement/subjectDocs/Tim_Mc_Sweeney_CV_September_2026.pdf` or `.idea/`.

## Decisions made

From the interview (`docs/intent/ai-use-record.md`, 25 Oct 2026):

| # | Question | Decision |
|---|---|---|
| A-1 | Is "AI builder" backlog #2, `ai-use-record`? | Yes. |
| A-2 | Which outputs? | All three: in-text citation and reference entry (NCCA Appendix 1), and the appendix table (SEC Appendix 2). |
| A-3 | Same page as sources, or separate? | The Sources page, with AI entries clearly labelled. |
| A-4 | Everything on Sources, or an "AI use" tab for the appendix? | Everything on Sources: a chip on each AI entry, the appendix section below, the greyed "AI use" tab removed. |
| A-5 | The SEC example's "Example of AI use" column? | Not included. Four columns: AI tool · Developer · Date of use · Purpose. No new field. |
| A-6 | Prompts and share link in the appendix? | Listed under each row (SEC-RULES p. 34: "If the tool generates a shareable URL or session link, this should also be included in the appendix"). |

Decided while writing this plan (Tim: check these):

| # | Question | Decision |
|---|---|---|
| A-7 | Formatter shape | `aiCitation(f): Citation`, the same `{ inText, reference, missing }` type as sources, so `SourceList` treats both kinds alike. It lives in `citation.ts` next to `citation()`, because it reuses `shortLink` and `ddmmyyyy`, and `referenceList` needs both. The appendix is a different output with a different shape, so it gets its own module. |
| A-8 | Dates | `dd/mm/yyyy`, as S-9. The NCCA's AI reference says "accessed 20 October 2023" while its AI in-text says "20/10/2023". We keep one date format across the whole list. The year in brackets is the year of the date generated, which is what the NCCA example shows ("OpenAI (2023)", generated 20 October 2023). |
| A-9 | What is flagged | One detail: **no share link and no prompt**. From NCCA-BIO p. 15: "Where an AI tool does not generate a sharable URL, student should include the name of the tool and the prompt used." The flag reuses `missingLine`: "Add the share link or the prompt you used so a reader can check this source." |
| A-10 | A prompt in the reference entry | When there's no share link, the reference ends with `Prompt used: <prompt>`, with line breaks collapsed to spaces (Copy reference list is one entry per line, S-8). With a share link, the link alone, as the NCCA's first example. |
| A-11 | Where AI entries sort | In the same alphabetical list (S-7), by their reference, so by developer ("OpenAI (2026) ChatGPT-4…"). |
| A-12 | The chip | The existing `LogKindChip kind="AI_USE"` (pack D-6), so an AI entry looks the same on Sources as in the log. Its text is the word "AI use", which a screen reader reads before the reference. No new shadcn Badge: the chip is the precedent (UI-STANDARDS §144). |
| A-13 | Appendix order | Oldest first by date generated, as the SEC's example runs (14, 20, 25 February). Ties keep the log's order. |
| A-14 | What Copy appendix copies | **An HTML table plus plain text in one clipboard write** (`ClipboardItem` with `text/html` and `text/plain`). Pasting into Google Docs or Word gives a real four-column table, with a full-width row under each use for its prompt(s) and share link. Anywhere that only takes plain text gets one labelled block per use. Where `ClipboardItem` isn't available, it falls back to `writeText` with the plain text. The trade-off: S-8 chose plain text for the reference list because it's one entry per line. The appendix is a table in the SEC's own example, and plain text would leave the student rebuilding it by hand. |
| A-15 | How the page shows the appendix | One card per use with a description list (AI tool, Developer, Date of use, Purpose, then Prompt(s) and Share link when present), not an on-page `<table>`. Four columns don't fit a phone. The copied HTML is the table. |
| A-16 | Quote the SEC on the page? | Yes, under the section heading, exactly: "The use of all AI tools must be documented in a dedicated section of the coursework, such as an appendix section." (SEC-RULES p. 34). `AppCopySourcesTest` proves it (Task 2). |
| A-17 | No AI uses yet | The appendix section still shows, with one line and a **Log an AI use** link to `/log/new?kind=AI_USE` (the new-entry page already reads `?kind=`). |
| A-18 | Not in this feature | A live preview in the AI-use form (the source form has one, S-1; not asked for here); the "discuss with your teacher first" note (FR-28, roadmap §6's planned AI-use page); any teacher view. |

### How our format differs from the NCCA's AI examples (A-7)

Same gate as S-4: every detail in each NCCA example appears in our output, in the NCCA's order.

| Example | NCCA | Ours | Why |
|---|---|---|---|
| In-text, with share link | `(chat.openai.com/share/f45a1e23-2217-4443-a244-d56ab26ae940)` | **Identical** | `shortLink`, as the online sources. |
| In-text, without share link | `(OpenAI (2023) ChatGPT, 20/10/2023)` | **Identical** when the tool is typed as "ChatGPT". With a version typed, the version stays: `(OpenAI (2023) ChatGPT (Oct. 20 version), 20/10/2023)` | Tool and version are one field (SEC-RULES p. 34 asks for both), and there's no safe rule for splitting them. |
| Reference, with share link | `OpenAI (2023) ChatGPT (Oct. 20 version) [Large language model], accessed 20 October 2023. https://chat.openai.com/share/f45a…` | `OpenAI (2023) ChatGPT (Oct. 20 version), accessed 20/10/2023. https://chat.openai.com/share/f45a…` | "[Large language model]" is dropped: we don't record what kind of tool it is, and an image tool isn't one (as "Podcast" and "Film" were dropped in S-4). Date as A-8. |
| Reference, without share link | `OpenAI (2023) ChatGPT (Oct. 20 version) [Large language model], accessed 20 October 2023. Prompt used and text generated.` | `OpenAI (2023) ChatGPT (Oct. 20 version), accessed 20/10/2023. Prompt used: <the student's prompt>` | The NCCA's last sentence is a placeholder for the prompt. We print the prompt itself. We don't store the generated text, so it isn't printed. |

## Concepts in play

| Concept | What it is | Why here | Already used in |
|---|---|---|---|
| Discriminated union | A `kind` field tells TypeScript which `fields` shape an entry has | `referenceList` takes sources and AI uses in one array and picks the right formatter with no casts | `logEntrySchema` in `lib/api/schemas.ts` |
| Pure formatting function + pinned output | Input in, string out; tests assert the exact string | The format is a decision Tim reviews; a change shows up as a failing test | `lib/app/citation.ts` (`citation`) |
| "Details in order" assertion | Each expected substring is found after the previous one | The A-7 gate | `inOrder` in `lib/app/citation.test.ts` |
| Source-text test | JUnit finds a quoted string on its printed PDF page | Quotes in frontend code can't be seen by `SourceTextTest` | `CitationExamplesSourcesTest`, `AppCopySourcesTest` |
| Multi-format clipboard write | `navigator.clipboard.write([new ClipboardItem({ "text/html": …, "text/plain": … })])`; the pasting app picks the richest format it understands | The appendix pastes as a real table into Docs and Word, and as labelled text anywhere else (A-14) | New here. Plain `writeText` is in `source-list.tsx` |
| HTML escaping | Replace `& < > "` before putting user text into an HTML string | Student text goes into the copied table. Unescaped, a prompt containing `<b>` would change the table | New here (`cell` in `ai-appendix.ts`) |
| Description list (`<dl>`) | Term/description pairs, read by screen readers as "term, description" | Each appendix row is labelled pairs. It works on a phone, where a four-column table doesn't (A-15) | New in the app. The card style is `card` in `components/app/styles.ts` |
| Live region for copy status | A polite `aria-live` line says what happened | Copy has no visible change otherwise | `source-list.tsx` |
| Labelled section | `<section aria-labelledby>` makes the appendix a landmark named by its heading | Screen-reader users can jump straight to it | `source-preview.tsx` ("In your report") |

## File structure

| File | Responsibility |
|---|---|
| `backend/src/test/java/ie/coursework/content/CitationExamplesSourcesTest.java` | Modify: the NCCA's AI in-text and reference examples |
| `backend/src/test/java/ie/coursework/content/AppCopySourcesTest.java` | Modify: the SEC's appendix sentence |
| `frontend/lib/app/citation.ts` (+ `.test.ts`) | Modify: `aiCitation`, `ListEntry`, `referenceList` over both kinds, the new flag word, `LIST_RULE`; remove `AI_NOT_YET` |
| `frontend/lib/app/ai-appendix.ts` (+ `.test.ts`) | Create: `APPENDIX_RULE`, `appendixRows`, `appendixPairs`, `appendixText`, `appendixHtml` |
| `frontend/components/app/component-tabs.tsx` (+ spec) | Modify: drop the greyed "AI use" tab |
| `frontend/components/app/source-list.tsx` (+ spec) | Modify: entries of both kinds; the chip; names for AI rows |
| `frontend/components/app/ai-appendix.tsx` (+ `.spec.tsx`) | Create: the appendix section and Copy appendix |
| `frontend/app/(app)/components/[id]/sources/page.tsx` | Modify: pass AI uses to both components |
| `frontend/e2e/phase3.e2e.ts` | Modify: the logged AI use on the Sources tab |
| `docs/ARCHITECTURE.md`, `docs/PILOT-DESIGN.md`, `docs/BACKLOG.md`, `docs/HANDOFF.md` | Modify (Task 8) |

---

## Task 1: The backlog

This work goes on `pilot/source-builder`, on top of source-builder's own changes. No new branch.

- [ ] **Step 1:** `git branch --show-current` says `pilot/source-builder`, and `ls frontend/lib/app/citation.ts frontend/components/app/source-list.tsx` finds both files.
- [ ] **Step 2:** In `docs/BACKLOG.md`, change row 2's status to `planned: docs/superpowers/plans/2026-10-25-ai-use-record.md; building on pilot/source-builder`. Under §2, replace the **Before planning** paragraph with:

```markdown
**Answered (25 Oct 2026, `docs/intent/ai-use-record.md`):** all three outputs (NCCA in-text citation and reference entry, SEC appendix table); everything on the Sources page with an "AI use" chip per AI entry and an appendix section below; the greyed "AI use" tab removed; four appendix columns, no new field; prompts and share link under each row.
```

- [ ] **Step 3: Commit.**

```bash
git add docs/BACKLOG.md
git commit -m "Put ai-use-record on the backlog as planned"
```

---

## Task 2: Prove the NCCA and SEC strings are on their pages

**Files:**
- Modify: `backend/src/test/java/ie/coursework/content/CitationExamplesSourcesTest.java`
- Modify: `backend/src/test/java/ie/coursework/content/AppCopySourcesTest.java`

- [ ] **Step 1: Add the AI examples.** In `CitationExamplesSourcesTest`, add two entries to the end of `IN_TEXT` and three to the end of `REFERENCES`. The existing `examples()` already checks each list on both documents (in-text: NCCA-BIO p. 15, NCCA-BUS p. 22; references: NCCA-BIO p. 16, NCCA-BUS p. 23).

```java
    static final List<String> IN_TEXT = List.of(
            "(p. 57, McLeskey, 2013)",
            "(Hearne, J., 30/08/2024)",
            "(thelatinlibrary.com/101/RhetoricalDevices)",
            "(Ep. 10, rte.ie/radio/podcasts/22093250)",
            "(3:20 to 5:45, youtu.be/yCv4iyPqZKQ)",
            "(chat.openai.com/share/f45a1e23-2217-4443-a244-d56ab26ae940)",
            "(OpenAI (2023) ChatGPT, 20/10/2023)");
```

and append to `REFERENCES`:

```java
            "OpenAI (2023) ChatGPT (Oct. 20 version) [Large language model], accessed 20 October 2023.",
            "https://chat.openai.com/share/f45a1e23-2217-4443-a244-d56ab26ae940",
            "Prompt used and text generated.");
```

Also add this test for the flag's source sentence. It's only in the Biology wording, so it's checked there alone:

```java
    static final String NO_LINK_RULE =
            "Where an AI tool does not generate a sharable URL, student should include the name of the tool and the prompt used.";

    @Test
    void theNoShareLinkRuleIsOnItsPage() { // decision A-9
        SourceRef source = SourceRef.parse("NCCA-BIO p. 15");
        assertThat(SourceDocuments.startsOnPage(source, NO_LINK_RULE))
                .as("not on %s; found on %s", source, SourceDocuments.printedPagesContaining(source.key(), NO_LINK_RULE)).isTrue();
    }
```

(add `import org.junit.jupiter.api.Test;`). Update the class comment: "The NCCA's referencing examples, sources and AI tools, quoted in frontend/lib/app/citation.test.ts…".

- [ ] **Step 2: Add the SEC sentence.** In `AppCopySourcesTest`, below `NO_FORMAL_STYLE`:

```java
    static final String APPENDIX_RULE =
            "The use of all AI tools must be documented in a dedicated section of the coursework, such as an appendix section.";

    @Test
    void theAppendixSentenceIsOnItsPage() { // decision A-16; APPENDIX_RULE in frontend/lib/app/ai-appendix.ts
        SourceRef source = SourceRef.parse("SEC-RULES p. 34");
        assertThat(SourceDocuments.startsOnPage(source, APPENDIX_RULE))
                .as("not on %s; found on %s", source, SourceDocuments.printedPagesContaining(source.key(), APPENDIX_RULE)).isTrue();
    }
```

Add `import org.junit.jupiter.api.Test;`, and add `APPENDIX_RULE in frontend/lib/app/ai-appendix.ts` to the class comment's list of shared literals.

- [ ] **Step 3: Run them.** `cd backend && ./mvnw -q test -Dtest='CitationExamplesSourcesTest,AppCopySourcesTest'`. Expected: PASS. These are content checks on strings that already exist in the PDFs, so they pass straight away. To see one bite, change one character of `APPENDIX_RULE`, run again, watch it fail with "found on []", then restore it.
- [ ] **Step 4:** `make verify`, then commit.

```bash
git add backend/src/test/java/ie/coursework/content/CitationExamplesSourcesTest.java backend/src/test/java/ie/coursework/content/AppCopySourcesTest.java
git commit -m "Prove the NCCA's AI referencing examples and the SEC's appendix sentence are on their pages"
```

---

## Task 3: `aiCitation` and a reference list of both kinds

**Files:**
- Modify: `frontend/lib/app/citation.ts`
- Test: `frontend/lib/app/citation.test.ts`

- [ ] **Step 1: Write the failing tests.** In `citation.test.ts`, change the import to:

```ts
import type { AiUseFields, SourceFields } from "@/lib/api/schemas";

import { aiCitation, citation, copyText, ddmmyyyy, LIST_RULE, missingLine, referenceList, shortLink, shortName, sourceFromForm } from "./citation.ts";
```

In the existing `referenceList` test, give each entry `kind: "SOURCE" as const` (for example `{ id: "z", kind: "SOURCE" as const, fields: source({ … }) }`). Then append:

```ts
const ai = (f: Partial<AiUseFields>): AiUseFields => ({ toolNameAndVersion: "ChatGPT", developer: "OpenAI", dateGenerated: "2023-10-20",
  howUsed: "Brainstormed themes.", prompts: null, shareUrl: null, ...f });

// NCCA-BIO pp. 15-16 and NCCA-BUS pp. 22-23, quoted. Same literals as CitationExamplesSourcesTest: change both or neither.
const NCCA_AI = {
  shareUrl: "https://chat.openai.com/share/f45a1e23-2217-4443-a244-d56ab26ae940",
  inTextWithLink: "(chat.openai.com/share/f45a1e23-2217-4443-a244-d56ab26ae940)",
  inTextWithoutLink: "(OpenAI (2023) ChatGPT, 20/10/2023)",
};

test("an AI use with a share link: the NCCA's in-text exactly; the reference keeps every detail in order (A-7)", () => {
  const c = aiCitation(ai({ toolNameAndVersion: "ChatGPT (Oct. 20 version)", shareUrl: NCCA_AI.shareUrl }));
  assert.equal(c.inText, NCCA_AI.inTextWithLink);
  assert.equal(c.reference, `OpenAI (2023) ChatGPT (Oct. 20 version), accessed 20/10/2023. ${NCCA_AI.shareUrl}`);
  inOrder(c.reference, ["OpenAI", "(2023)", "ChatGPT (Oct. 20 version)", "20/10/2023", NCCA_AI.shareUrl]);
  assert.deepEqual(c.missing, []);
});

test("an AI use without a share link: the NCCA's in-text exactly, and the prompt ends the reference (A-10)", () => {
  const c = aiCitation(ai({ prompts: "Suggest five project themes\non enzymes." }));
  assert.equal(c.inText, NCCA_AI.inTextWithoutLink);
  assert.equal(c.reference, "OpenAI (2023) ChatGPT, accessed 20/10/2023. Prompt used: Suggest five project themes on enzymes.");
  assert.deepEqual(c.missing, []);
});

test("a version typed with the tool stays in the in-text citation", () => {
  assert.equal(aiCitation(ai({ toolNameAndVersion: "ChatGPT (Oct. 20 version)" })).inText, "(OpenAI (2023) ChatGPT (Oct. 20 version), 20/10/2023)");
});

test("an AI use with no share link and no prompt is flagged; blank counts as none (A-9)", () => {
  const c = aiCitation(ai({ prompts: "  ", shareUrl: "" }));
  assert.equal(c.reference, "OpenAI (2023) ChatGPT, accessed 20/10/2023.");
  assert.deepEqual(c.missing, ["shareUrlOrPrompt"]);
  assert.equal(missingLine(c.missing), "Add the share link or the prompt you used so a reader can check this source.");
});

test("sources and AI uses share one alphabetical list (A-11)", () => {
  const list = referenceList([
    { id: "b", kind: "SOURCE" as const, fields: source({ title: "Bees", author: "Byrne, A." }) },
    { id: "o", kind: "AI_USE" as const, fields: ai({ shareUrl: NCCA_AI.shareUrl }) },
    { id: "a", kind: "SOURCE" as const, fields: source({ title: "Ants", author: "Ahern, B." }) },
  ]);
  assert.deepEqual(list.map((e) => e.id), ["a", "b", "o"]);
  assert.equal(list[2].citation.inText, NCCA_AI.inTextWithLink);
});

test("the list rule mentions AI uses", () => {
  assert.equal(LIST_RULE, "Built from the sources and AI uses in your log, in alphabetical order, including the ones only you can read.");
});
```

- [ ] **Step 2: Run.** `cd frontend && node --test lib/app/citation.test.ts`. Expected: FAIL, `aiCitation` is not exported (and the type check fails on `kind`).
- [ ] **Step 3: Implement.** In `citation.ts`:

```ts
import type { AiUseFields, SourceFields, SourceType } from "@/lib/api/schemas";
```

```ts
export type MissingDetail = "author" | "datePublished" | "publication" | "locator" | "url" | "dateAccessed" | "shareUrlOrPrompt";
```

```ts
export const LIST_RULE = "Built from the sources and AI uses in your log, in alphabetical order, including the ones only you can read.";
```

Delete `AI_NOT_YET`. Add to `WORDS`:

```ts
  shareUrlOrPrompt: "the share link or the prompt you used",
```

Below `citation()`:

```ts
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
```

Replace `referenceList` with:

```ts
/** One row of the Sources page: a source or an AI use (decision A-3). */
export type ListEntry = { id: string; kind: "SOURCE"; fields: SourceFields } | { id: string; kind: "AI_USE"; fields: AiUseFields };

const cite = (e: ListEntry): Citation => (e.kind === "AI_USE" ? aiCitation(e.fields) : citation(e.fields));

/** Decisions S-7 and A-11: one alphabetical list by reference. */
export function referenceList<T extends ListEntry>(entries: readonly T[]): Array<T & { citation: Citation }> {
  return entries
    .map((e) => ({ ...e, citation: cite(e) }))
    .sort((a, b) => ORDER.compare(sortKey(a.citation.reference), sortKey(b.citation.reference)));
}
```

- [ ] **Step 4: Run.** `node --test lib/app/citation.test.ts`. Expected: PASS. `npx tsc --noEmit` will now fail in `source-list.tsx` (`AI_NOT_YET` gone, `kind` missing). Task 5 fixes that, so commit Tasks 3–5 together if `make verify` must be green. **Better:** in this task, also make the two-line change in `source-list.tsx`: remove the `AI_NOT_YET` import and its `<p>`, and type `Source` as `Extract<ListEntry, { kind: "SOURCE" }>`. Update `source-list.spec.tsx`: add `kind: "SOURCE" as const` to `book` and `video`, and delete the `AI uses aren't in this list yet…` assertion.
- [ ] **Step 5:** `make verify`, then commit.

```bash
git add frontend/lib/app/citation.ts frontend/lib/app/citation.test.ts frontend/components/app/source-list.tsx frontend/components/app/source-list.spec.tsx
git commit -m "Format an AI use as the NCCA's citation and reference, and list it with the sources"
```

---

## Task 4: The appendix rows, text and table

**Files:**
- Create: `frontend/lib/app/ai-appendix.ts`
- Test: `frontend/lib/app/ai-appendix.test.ts`

- [ ] **Step 1: Write the failing tests.**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import type { AiUseFields } from "@/lib/api/schemas";

import { APPENDIX_RULE, appendixHtml, appendixPairs, appendixRows, appendixText } from "./ai-appendix.ts";

const ai = (f: Partial<AiUseFields>): AiUseFields => ({ toolNameAndVersion: "ChatGPT-4", developer: "OpenAI", dateGenerated: "2025-02-14",
  howUsed: "Used to suggest possible project themes.", prompts: null, shareUrl: null, ...f });

test("the SEC's sentence, quoted exactly (A-16; AppCopySourcesTest)", () => {
  assert.equal(APPENDIX_RULE, "The use of all AI tools must be documented in a dedicated section of the coursework, such as an appendix section.");
});

test("rows run oldest first, trimmed, with the date as dd/mm/yyyy (A-13)", () => {
  const rows = appendixRows([
    { id: "late", fields: ai({ dateGenerated: "2025-02-25", toolNameAndVersion: " ChatGPT-3.5 " }) },
    { id: "early", fields: ai({}) },
  ]);
  assert.deepEqual(rows.map((r) => r.id), ["early", "late"]);
  assert.equal(rows[1].tool, "ChatGPT-3.5");
  assert.equal(rows[0].date, "14/02/2025");
});

test("each row's pairs are the four SEC columns, then the prompt and link when there are any (A-5, A-6)", () => {
  const [plain] = appendixRows([{ id: "a", fields: ai({ prompts: " ", shareUrl: null }) }]);
  assert.deepEqual(appendixPairs(plain), [
    ["AI tool", "ChatGPT-4"], ["Developer", "OpenAI"], ["Date of use", "14/02/2025"], ["Purpose", "Used to suggest possible project themes."],
  ]);
  const [full] = appendixRows([{ id: "b", fields: ai({ prompts: "Suggest themes", shareUrl: "https://chatgpt.com/share/x" }) }]);
  assert.deepEqual(appendixPairs(full).slice(4), [["Prompt(s)", "Suggest themes"], ["Share link", "https://chatgpt.com/share/x"]]);
});

test("the plain text is one labelled block per use, a blank line between", () => {
  const rows = appendixRows([{ id: "a", fields: ai({}) }, { id: "b", fields: ai({ dateGenerated: "2025-02-20", developer: "Microsoft", toolNameAndVersion: "Microsoft Copilot (GPT-4)", howUsed: "Clarified fiscal policy.", prompts: "What is fiscal policy?" }) }]);
  assert.equal(appendixText(rows), [
    "AI tool: ChatGPT-4\nDeveloper: OpenAI\nDate of use: 14/02/2025\nPurpose: Used to suggest possible project themes.",
    "AI tool: Microsoft Copilot (GPT-4)\nDeveloper: Microsoft\nDate of use: 20/02/2025\nPurpose: Clarified fiscal policy.\nPrompt(s): What is fiscal policy?",
  ].join("\n\n"));
});

test("the HTML is a four-column table, a full-width row for the prompt and link, and the student's text escaped (A-14)", () => {
  const rows = appendixRows([{ id: "a", fields: ai({ howUsed: "Compared <b>enzymes</b> & \"rates\"", prompts: "Line one\nLine two", shareUrl: "https://chatgpt.com/share/x" }) }]);
  assert.equal(appendixHtml(rows),
    "<table border=\"1\"><thead><tr><th>AI tool</th><th>Developer</th><th>Date of use</th><th>Purpose</th></tr></thead><tbody>"
    + "<tr><td>ChatGPT-4</td><td>OpenAI</td><td>14/02/2025</td><td>Compared &lt;b&gt;enzymes&lt;/b&gt; &amp; &quot;rates&quot;</td></tr>"
    + "<tr><td colspan=\"4\">Prompt(s): Line one<br>Line two<br>Share link: https://chatgpt.com/share/x</td></tr>"
    + "</tbody></table>");
});

test("a use with no prompt or link has no extra row", () => {
  assert.ok(!appendixHtml(appendixRows([{ id: "a", fields: ai({}) }])).includes("colspan"));
});
```

- [ ] **Step 2: Run.** `node --test lib/app/ai-appendix.test.ts`. Expected: FAIL, cannot find module `./ai-appendix.ts`.
- [ ] **Step 3: Implement** `frontend/lib/app/ai-appendix.ts`:

```ts
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
```

- [ ] **Step 4: Run.** `node --test lib/app/ai-appendix.test.ts`. Expected: PASS.
- [ ] **Step 5:** `make verify`, then commit.

```bash
git add frontend/lib/app/ai-appendix.ts frontend/lib/app/ai-appendix.test.ts
git commit -m "Turn AI uses into the SEC appendix: rows oldest first, as labelled text and as a table"
```

---

## Task 5: AI entries on the reference list, and no greyed tab

**Files:**
- Modify: `frontend/components/app/source-list.tsx`, `frontend/components/app/source-list.spec.tsx`
- Modify: `frontend/components/app/component-tabs.tsx`, `frontend/components/app/component-tabs.spec.tsx`

- [ ] **Step 1: Write the failing specs.** In `source-list.spec.tsx`, rename the prop in every `render` from `sources=` to `entries=`, and add:

```tsx
import type { AiUseFields, SourceFields } from "@/lib/api/schemas";

const aiUse = { id: "a1", kind: "AI_USE" as const, fields: { toolNameAndVersion: "ChatGPT-4", developer: "OpenAI", dateGenerated: "2026-10-01",
  howUsed: "Suggested possible project themes.", prompts: null, shareUrl: null } satisfies AiUseFields };
const AI_REF = "OpenAI (2026) ChatGPT-4, accessed 01/10/2026.";
```

```tsx
  it("lists an AI use in the same alphabetical list, marked as an AI use", () => {
    render(<SourceList componentId="k1" entries={[video, aiUse, book]} />);
    const items = within(screen.getByRole("list", { name: "References" })).getAllByRole("listitem");
    expect(items[1]).toHaveTextContent(AI_REF);
    expect(within(items[1]).getByText("AI use")).toBeInTheDocument();
    expect(within(items[0]).queryByText("AI use")).not.toBeInTheDocument();
    expect(items[1]).toHaveTextContent("(OpenAI (2026) ChatGPT-4, 01/10/2026)");
  });

  it("names an AI use by its tool, flags it without a link or prompt, and opens it in the log", () => {
    render(<SourceList componentId="k1" entries={[aiUse]} />);
    expect(screen.getByRole("button", { name: "Copy citation for ChatGPT-4" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in log, ChatGPT-4" })).toHaveAttribute("href", "/components/k1/log/a1");
    expect(screen.getByText("Add the share link or the prompt you used so a reader can check this source.")).toBeInTheDocument();
  });

  it("says the list holds sources and AI uses", () => {
    render(<SourceList componentId="k1" entries={[book]} />);
    expect(screen.getByText(/Built from the sources and AI uses in your log/)).toBeInTheDocument();
  });
```

In `component-tabs.spec.tsx`, in the first test, replace the `AI use` link assertion with:

```tsx
    expect(screen.queryByText("AI use")).not.toBeInTheDocument();
    expect(screen.getByText("Word checker")).toHaveAttribute("aria-disabled", "true");
```

- [ ] **Step 2: Run.** `npx vitest run components/app/source-list.spec.tsx components/app/component-tabs.spec.tsx`. Expected: FAIL (prop `entries` unknown; "AI use" still in the tabs).
- [ ] **Step 3: Implement.** In `component-tabs.tsx`, change `["AI use", "Word checker"]` to `["Word checker"]`, and the doc comment to `/** Roadmap §6.1: Overview · Log · Sources · Word checker (P6). AI uses live on Sources (ai-use-record A-4). */`.

In `source-list.tsx`:

```tsx
import type { ListEntry } from "@/lib/app/citation";
import { copyText, LIST_RULE, missingLine, NO_FORMAL_STYLE, referenceList } from "@/lib/app/citation";

import { LogKindChip } from "./log-kind-chip";
```

Delete the local `Source` type. Add:

```tsx
/** What a row is called in button and link names: a source's title, an AI use's tool. */
const entryName = (e: ListEntry) => (e.kind === "AI_USE" ? e.fields.toolNameAndVersion : e.fields.title);
```

Change the signature to `export function SourceList({ componentId, entries }: { componentId: string; entries: ListEntry[] })` and `const list = referenceList(entries);`. In each `<li>`, put the chip first, and use `entryName(s)` in both `aria-label`s:

```tsx
            <li key={s.id} className="flex flex-col gap-2 p-4">
              {s.kind === "AI_USE" && <span><LogKindChip kind="AI_USE" /></span>}
              <p className="text-app-base break-words text-app-ink">{s.citation.reference}</p>
```

```tsx
                <Button type="button" variant="outline" aria-label={`Copy citation for ${entryName(s)}`}
```

```tsx
                <Link href={`/components/${componentId}/log/${s.id}`} aria-label={`Open in log, ${entryName(s)}`}
```

- [ ] **Step 4: Run** the two specs. Expected: PASS. (`tsc` fails in `sources/page.tsx` until Task 7 renames the prop: make that one-word change, `sources=` to `entries=`, here so `make verify` stays green.)
- [ ] **Step 5:** `make verify`, then commit.

```bash
git add frontend/components/app/source-list.tsx frontend/components/app/source-list.spec.tsx frontend/components/app/component-tabs.tsx frontend/components/app/component-tabs.spec.tsx "frontend/app/(app)/components/[id]/sources/page.tsx"
git commit -m "Show AI uses on the reference list with the AI use chip, and drop the greyed AI use tab"
```

---

## Task 6: `AiAppendix`, the appendix section

**Files:**
- Create: `frontend/components/app/ai-appendix.tsx`
- Test: `frontend/components/app/ai-appendix.spec.tsx`

- [ ] **Step 1: Write the failing spec.**

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AiUseFields } from "@/lib/api/schemas";

import { AiAppendix } from "./ai-appendix";

const ai = (id: string, f: Partial<AiUseFields>) => ({ id, fields: { toolNameAndVersion: "ChatGPT-4", developer: "OpenAI", dateGenerated: "2025-02-14",
  howUsed: "Used to suggest possible project themes.", prompts: null, shareUrl: null, ...f } });
const early = ai("e", {});
const late = ai("l", { dateGenerated: "2025-02-25", toolNameAndVersion: "ChatGPT-3.5", prompts: "Find climate data sources" });

const writeText = vi.fn();
const write = vi.fn();
class FakeClipboardItem { constructor(public parts: Record<string, Blob>) {} }

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  write.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText, write }, configurable: true });
  vi.stubGlobal("ClipboardItem", FakeClipboardItem);
});
afterEach(() => vi.unstubAllGlobals());

describe("AiAppendix", () => {
  it("is a section named by its heading, quoting the SEC", () => {
    render(<AiAppendix componentId="k1" uses={[early]} />);
    expect(screen.getByRole("region", { name: "AI use appendix" })).toBeInTheDocument();
    expect(screen.getByText(/The use of all AI tools must be documented in a dedicated section of the coursework, such as an appendix section\./)).toBeInTheDocument();
  });

  it("shows one row per use, oldest first, with the four columns and any prompt", () => {
    render(<AiAppendix componentId="k1" uses={[late, early]} />);
    const rows = within(screen.getByRole("list", { name: "AI uses" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("AI toolChatGPT-4DeveloperOpenAIDate of use14/02/2025PurposeUsed to suggest possible project themes.");
    expect(rows[1]).toHaveTextContent("Prompt(s)Find climate data sources");
    expect(within(rows[0]).queryByText("Prompt(s)")).not.toBeInTheDocument();
  });

  it("copies the appendix as a table and as text in one write, and says so (A-14)", async () => {
    render(<AiAppendix componentId="k1" uses={[early, late]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy appendix" }));
    expect(await screen.findByText("Copied 2 AI uses.")).toBeInTheDocument();
    const [items] = write.mock.calls[0];
    expect(Object.keys(items[0].parts)).toEqual(["text/html", "text/plain"]);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to plain text where the browser has no ClipboardItem", async () => {
    vi.stubGlobal("ClipboardItem", undefined);
    render(<AiAppendix componentId="k1" uses={[early]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy appendix" }));
    expect(await screen.findByText("Copied 1 AI use.")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith("AI tool: ChatGPT-4\nDeveloper: OpenAI\nDate of use: 14/02/2025\nPurpose: Used to suggest possible project themes.");
  });

  it("says what to do when the browser refuses to copy", async () => {
    write.mockRejectedValue(new Error("denied"));
    render(<AiAppendix componentId="k1" uses={[early]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy appendix" }));
    expect(await screen.findByText("Couldn't copy. Select the text and copy it yourself.")).toBeInTheDocument();
  });

  it("offers to log an AI use when there are none (A-17)", () => {
    render(<AiAppendix componentId="k1" uses={[]} />);
    expect(screen.getByRole("link", { name: "Log an AI use" })).toHaveAttribute("href", "/components/k1/log/new?kind=AI_USE");
    expect(screen.queryByRole("button", { name: "Copy appendix" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run.** `npx vitest run components/app/ai-appendix.spec.tsx`. Expected: FAIL, cannot resolve `./ai-appendix`.
- [ ] **Step 3: Implement** `frontend/components/app/ai-appendix.tsx`:

```tsx
"use client";

import { Copy } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { AiUseFields } from "@/lib/api/schemas";
import { APPENDIX_RULE, appendixHtml, appendixPairs, appendixRows, appendixText } from "@/lib/app/ai-appendix";

import { card, sectionTitle } from "./styles";

/** Decision A-14: a table and text in one write; plain text where ClipboardItem is missing. */
async function copyTable(html: string, text: string) {
  if (typeof ClipboardItem === "undefined") return navigator.clipboard.writeText(text);
  await navigator.clipboard.write([new ClipboardItem({
    "text/html": new Blob([html], { type: "text/html" }),
    "text/plain": new Blob([text], { type: "text/plain" }),
  })]);
}

/** SEC-RULES pp. 34-35, on the Sources page (decisions A-4 to A-6, A-15 to A-17). */
export function AiAppendix({ componentId, uses }: { componentId: string; uses: Array<{ id: string; fields: AiUseFields }> }) {
  const [status, setStatus] = useState("");
  const rows = appendixRows(uses);
  const n = rows.length;

  async function copy() {
    try {
      await copyTable(appendixHtml(rows), appendixText(rows));
      setStatus(`Copied ${n} AI use${n === 1 ? "" : "s"}.`);
    } catch {
      setStatus("Couldn't copy. Select the text and copy it yourself.");
    }
  }

  return (
    <section aria-labelledby="ai-appendix-title" className="mt-10 flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="ai-appendix-title" className={sectionTitle}>AI use appendix</h2>
          <p className="mt-1 text-app-small text-app-grey">{`The SEC: “${APPENDIX_RULE}”`}</p>
        </div>
        {n > 0 && (
          <Button type="button" className="w-full lg:w-auto" onClick={copy}>
            <Copy aria-hidden />Copy appendix
          </Button>
        )}
      </div>
      <p aria-live="polite" className="text-app-small font-semibold text-app-ink">{status}</p>
      {n === 0 ? (
        <div className={`${card} flex flex-col items-start gap-3 p-5 lg:p-6`}>
          <p className="text-app-base text-app-copy">No AI uses in your log. If you use an AI tool, log it and it appears here as a row of your appendix.</p>
          <Link href={`/components/${componentId}/log/new?kind=AI_USE`} className={buttonVariants({ variant: "outline", className: "w-full lg:w-auto" })}>
            Log an AI use
          </Link>
        </div>
      ) : (
        <ul aria-label="AI uses" className={`${card} divide-y divide-app-line overflow-hidden`}>
          {rows.map((r) => (
            <li key={r.id} className="p-4">
              <dl className="grid gap-x-4 gap-y-1 text-app-small lg:grid-cols-[9rem_1fr]">
                {appendixPairs(r).map(([term, value]) => (
                  <Fragment key={term}>
                    <dt className="font-semibold text-app-ink">{term}</dt>
                    <dd className="break-words whitespace-pre-line text-app-copy">{value}</dd>
                  </Fragment>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run** the spec. Expected: PASS. If the row's `toHaveTextContent` fails on spacing, keep the assertion, because `dt`/`dd` render with no text between them. Check the exact rendered text with `screen.debug()` before changing anything.
- [ ] **Step 5:** `make verify`, then commit.

```bash
git add frontend/components/app/ai-appendix.tsx frontend/components/app/ai-appendix.spec.tsx
git commit -m "Add the AI use appendix section: one card per use, Copy appendix as a table"
```

---

## Task 7: The Sources page passes AI uses, and the journey

**Files:**
- Modify: `frontend/app/(app)/components/[id]/sources/page.tsx`
- Modify: `frontend/e2e/phase3.e2e.ts`

- [ ] **Step 1: Write the failing journey step.** In `phase3.e2e.ts`, in the test "the student's Sources tab turns the edited source into a reference", after the existing `list` assertions:

```ts
  await expect(list).toContainText("OpenAI (2026) ChatGPT-4, accessed 01/10/2026.");
  await expect(list).toContainText("Add the share link or the prompt you used so a reader can check this source.");
  const appendix = student.getByRole("region", { name: "AI use appendix" });
  await expect(appendix.getByRole("list", { name: "AI uses" })).toContainText("Suggested possible project themes.");
  await expect(appendix.getByRole("button", { name: "Copy appendix" })).toBeVisible();
```

Rename the test to "the student's Sources tab turns the source and the AI use into references and the appendix", and add "and the AI use (ai-use-record)" to the file's doc comment.

- [ ] **Step 2: Implement the page.** In `sources/page.tsx`:

```tsx
import { AiAppendix } from "@/components/app/ai-appendix";
import type { ListEntry } from "@/lib/app/citation";
```

Replace the `entries.ok ? <SourceList …/> : …` expression with:

```tsx
          {entries.ok ? (() => {
            const listed = entries.data.flatMap((e): ListEntry[] =>
              e.kind === "SOURCE" ? [{ id: e.id, kind: e.kind, fields: e.fields }]
                : e.kind === "AI_USE" ? [{ id: e.id, kind: e.kind, fields: e.fields }] : []);
            return (
              <>
                <SourceList componentId={component.data.id} entries={listed} />
                <AiAppendix componentId={component.data.id} uses={listed.flatMap((e) => (e.kind === "AI_USE" ? [e] : []))} />
              </>
            );
          })() : <div className="mt-6"><ErrorPanel error={entries.error} /></div>}
```

If the inline function reads badly in review, pull `listed` up into a `const` above the `return` (computed only when `entries.ok`). That's the same behaviour, so pick whichever reads better. Update the page's doc comment: "…hidden entries included (decisions S-14, A-3)."

- [ ] **Step 3: Run.** `make verify`, then `make e2e`. Expected: PASS on `laptop` and `phone`, axe clean (`expectAccessible` already runs at the end of the test).
- [ ] **Step 4: Check in the browser.** `make db-up`, `make backend-run`, `make frontend-run`. As a student with one source and one AI use: check the chip, the flag, the appendix card at phone width (375px) and laptop width. Then use Copy appendix and paste into a Google Doc. Expected: a four-column table, with the prompt row spanning it. Say in the hand-over what you checked.
- [ ] **Step 5: Commit.**

```bash
git add "frontend/app/(app)/components/[id]/sources/page.tsx" frontend/e2e/phase3.e2e.ts
git commit -m "Show the student's AI uses on the Sources page: in the reference list and the appendix"
```

---

## Task 8: Docs, the UI checklist, the gate and hand-over

- [ ] `docs/ARCHITECTURE.md`: in the Sources page section (added by source-builder), add `aiCitation`, `lib/app/ai-appendix.ts`, `AiAppendix`, and the multi-format clipboard write.
- [ ] `docs/PILOT-DESIGN.md` §6.7 "What they produce": AI use → "an in-text citation and a reference-list entry (NCCA Appendix 1), and the appendix block (SEC Appendix 2), on the Sources page (ai-use-record, 25 Oct 2026)". §10's test row: AI appendix formatting is `node:test` in `lib/app/ai-appendix.test.ts`, not JUnit.
- [ ] `docs/BACKLOG.md`: row 2's status: `built on pilot/source-builder with source-builder, not merged`.
- [ ] `docs/HANDOFF.md`: where this stopped, that ai-use-record shares source-builder's branch and PR, and the rules-edition risk (diff SEC Appendix 2 when the 2026–27 edition is out).
- [ ] Run through `docs/design/UI-CHECKLIST.md` for the Sources page and note the result in the hand-over.

### Gate

- `make verify` green; `make e2e` green on `laptop` and `phone`.
- Every NCCA and SEC string in `citation.ts`, `citation.test.ts`, `ai-appendix.ts` and `ai-appendix.test.ts` is proved by `CitationExamplesSourcesTest` or `AppCopySourcesTest`.
- Copy appendix pasted into Google Docs gives a table (checked by hand, Task 7 Step 4).
- Then: `/self-review` in a fresh session, and `write-changes` → `docs/changes/ai-use-record.md`.

## Self-review notes (for the executor)

- The only behaviour shared with source-builder's existing tests is `referenceList`'s signature (entries now carry `kind`). Every existing caller is updated in Tasks 3 and 5.
- `LogKindChip` renders the word "AI use", so `getByText("AI use")` in a row finds the chip, and Task 5's tab spec relies on the tab no longer rendering that text.
- `ClipboardItem` is a browser global. TypeScript's DOM lib knows it, so there's no type shim. jsdom doesn't have it, which is why the spec stubs it.
