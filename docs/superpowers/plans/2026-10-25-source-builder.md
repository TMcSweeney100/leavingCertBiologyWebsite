# Source Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each source a student has logged becomes an in-text citation and a reference-list entry in one consistent format modelled on the NCCA's examples. A new Sources tab lists them alphabetically with Copy citation and Copy reference list, and the log's source form shows the same output as a live preview, flagging any detail the NCCA asks for that's still missing.

**Architecture:** No backend change and no new endpoint. The Sources page reads the existing `GET /components/{id}/log`, which already returns every one of the student's entries (hidden ones included) with their `SOURCE` fields. One pure TypeScript module, `lib/app/citation.ts`, turns `SourceFields` into `{ inText, reference, missing }`. The Sources page (`SourceList`) and the form's preview (`SourcePreview`) both use it, so the preview and the list can never disagree. A backend content test proves that every NCCA example string the frontend tests quote is on its cited page.

**Tech Stack:** TypeScript, `node:test` for `lib/`, Next.js 15.3.9 server components, Vitest + Testing Library, the Clipboard API, Playwright + axe; JUnit + PDFBox for the source-text check.

**Spec:** `docs/intent/source-builder.md` (the confirmed statement of intent, 25 Oct 2026). **Backlog:** `docs/BACKLOG.md` §1. **Requirements:** `docs/newDevelopement/FUNCTIONAL-SPEC.md` FR-29–31 (§6.6). **Roadmap:** milestone 6B, the page `/components/[id]/sources` (§6). **Builds on:** Phase 3's log (`docs/superpowers/plans/2026-09-27-pilot-3-the-log.md`, `docs/ARCHITECTURE.md` §6 "The log pages").

**The source documents:** NCCA Biology guidelines Appendix 1 (`NCCA-BIO`, printed pp. 14–16) and Business guidelines Appendix Four (`NCCA-BUS`, printed pp. 20–23). They carry the same examples word for word. In-text examples: NCCA-BIO p. 15, NCCA-BUS p. 22. Reference examples: NCCA-BIO p. 16, NCCA-BUS p. 23. Page numbers are printed ones, as `SourceRef` uses.

---

## Global Constraints

- **Test first, every task** (CLAUDE.md). Write the test, run it, and watch it fail for the reason you expect before writing the code.
- **Never invent SEC or NCCA content.** Every NCCA string in this plan was copied from the PDFs. `CitationExamplesSourcesTest` (Task 2) proves each one is on its page. Never reword one to make a test pass.
- **Save and flag, never block** (intent). No new validation anywhere. The server's only source rule stays as it is: an online source needs a link and a date accessed (`LogContent.java`).
- **No backend production code.** If a task seems to need one, stop and ask.
- **Student only.** Nothing new on any teacher page.
- **Specs query by role and accessible name.** The names in Task 5–7 are the contract a later D-9 restyle must keep.
- **Tokens only.** No raw hex. Use existing `--app-*` tokens (`text-app-attention` for flags).
- **`make verify` green before every task commit.** One task, one commit. The message says the behaviour.
- **Branch:** `pilot/source-builder` from `pilotMain`. Don't push; Tim pushes and merges.
- **Never commit** `docs/newDevelopement/subjectDocs/Tim_Mc_Sweeney_CV_September_2026.pdf` or `.idea/`.
- **Next.js 15.3.9:** `params` and `searchParams` on a page are Promises (`await` them), as the existing pages already do. Read `frontend/node_modules/next/dist/docs/` for anything you're unsure of (`frontend/AGENTS.md`).

## Decisions made

From the interview (`docs/intent/source-builder.md`, 25 Oct 2026):

| # | Question | Decision |
|---|---|---|
| S-1 | Copy-out at write-up, or nudging during research? | Both. The form shows the formatted output live, so the copy-out is also the nudge. |
| S-2 | Block an incomplete source, or save and flag? | Save and flag. The NCCA's wording is soft ("if necessary, the page number"). |
| S-3 | AI uses in the reference list? | Not now. `ai-use-record` is backlog #2. The page says plainly that AI uses aren't in the list yet. |
| S-4 | Reproduce the NCCA examples exactly, or one consistent pattern? | One consistent pattern per type. The test gate: every detail in each NCCA example appears in our output, in the NCCA's order. The differences are listed below. |
| S-5 | Does the teacher see the formatted list? | No. Student only. |

Decided while writing this plan (Tim: check these):

| # | Question | Decision |
|---|---|---|
| S-6 | Java or TypeScript for the formatter? | **TypeScript, `lib/app/citation.ts`.** The live preview (S-1) has to reformat on every keystroke. In Java, that means either an API call per keystroke or a second copy of the rules in TypeScript that could drift. The cost: `docs/PILOT-DESIGN.md` §10's test table puts citation formatting in the Java domain with JUnit. Task 9 updates that row. If a teacher view or a server export ever needs the formatter, it moves then. |
| S-7 | List order | Alphabetical by the reference entry (so by author, or by title when there's no author), ignoring case and a leading quote mark. `Intl.Collator("en-IE")`. |
| S-8 | What Copy reference list copies | Plain text, one reference per line. It pastes cleanly into Google Docs and Word. No HTML, no numbering. |
| S-9 | Date accessed format | `dd/mm/yyyy` (`17/06/2024`). The date comes from the date picker as `yyyy-mm-dd`. The NCCA examples mix `17/6/24` and `30/08/2024`, so we keep the one that can't be misread. *Date published* is free text and is printed exactly as typed. |
| S-10 | Which missing details are flagged, per type | From "How students should reference different sources" (NCCA-BIO p. 15): **Book**: author, date published, page or chapter. **Newspaper or magazine**: author, date published, the newspaper or magazine. **Text or image online**: link, date accessed. **Audio or video online**: link, date accessed, timestamp or episode. **Other**: author, date published. (The server already refuses an online source with no link or date. The preview flags them too, because it runs before saving.) |
| S-11 | Where the page lives | The **Sources** tab of the component (`/components/[id]/sources`). `ComponentTabs` already has a disabled Sources slot, and it becomes a link. The empty state's **Add a source** opens the New entry form with Source already chosen (`/log/new?kind=SOURCE`). |
| S-12 | Design pack | **None for this feature.** It's built in the existing app style: the log list's card and hairline rows. Pack D-9 (Writing tools, `docs/design/prompts/README.md`) is requested once `ai-use-record` is planned, so one pack covers both pages. |
| S-13 | Is the preview a live region? | **No.** It would announce on every keystroke. It's a labelled region (`<section aria-labelledby>`, "In your report") placed after the fields, so a screen reader reaches it in reading order. The copy status *is* a live region (`aria-live="polite"`). |
| S-14 | Hidden sources on the list | Included and not marked. The line under the heading says the list includes the sources only the student can read. Visibility only decides what the teacher sees. |
| S-15 | Quote the NCCA on the page? | Yes, one sentence, quoted exactly: "No particular, formal style of referencing is required." (NCCA-BIO p. 15, NCCA-BUS p. 20). `AppCopySourcesTest` proves it (Task 2). |

### How our format differs from the NCCA's examples (S-4)

| Example | NCCA | Ours | Why |
|---|---|---|---|
| Newspaper, in-text | `(Hearne, J., 30/08/2024)` | `(Hearne, 30/08/2024)` | In-text uses the surname only, as the book example does (`McLeskey`). One rule for every print type. |
| Text online, reference | `…, (date written not available), …, Date accessed: 17/6/24` | `…, date not available, …, Date accessed: 17/06/2024` | One wording for a missing date in every type (S-9 for the date). |
| Audio online, reference | `…, Hot Mess – Megawatts and Megabytes, Podcast, date created: 30/5/24, …, Date accessed: 10/11/23` | `…, Hot Mess – Megawatts and Megabytes, date created: 30/5/24, …, Date accessed: 10/11/2023, Ep. 10` | "Podcast" and "Film" are dropped: the type comes from a list, and "Podcast" would be wrong for other audio. Every online reference ends with the locator when there is one. |
| Audio online, in-text | `(Ep. 10, rte.ie/radio/podcasts/22093250)` | `(Ep. 10, rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes)` | The NCCA cut the link's last part by hand. There's no rule for where to cut, so we keep the whole path. |
| Video online, reference | `…, date created 20/12/2008, http://youtu.be/yCv4iyPqZKQ, 12/12/14, from 3 minutes 20 seconds to 5 minutes 45 seconds.` | `…, date created: 20/12/2008, http://youtu.be/yCv4iyPqZKQ, Date accessed: 12/12/2014, 3:20 to 5:45` | The same labels as the audio example. The locator is printed as the student typed it. |

The book (both forms), the newspaper reference, and the in-text citations for text online and video online come out **exactly** as the NCCA wrote them.

## Concepts in play

| Concept | What it is | Why here | Already used in |
|---|---|---|---|
| Pure formatting function | Input in, string out, no state or I/O | The Sources page and the preview share one set of rules; `node:test` covers every type cheaply | `lib/app/log.ts` (`entryDetail`, `visibilityLine`) |
| Pinned ("golden") output | A test asserts the exact string | The format is a decision Tim reviews. Any change to it shows up as a failing test, not a silent drift | `lib/app/log.test.ts` (`visibilityLine`) |
| "Details in order" assertion | Each expected substring is found after the previous one | It's the S-4 gate: our output may differ from the NCCA's in wording but must keep every detail and its order | New here (`inOrder` in `citation.test.ts`) |
| Source-text test | A JUnit test finds a quoted string on its printed page of a PDF | Quotes in frontend code can't be seen by `SourceTextTest` | `backend/.../content/AppCopySourcesTest.java`, `LogFieldSourcesTest.java` |
| Derived value, not state | Compute from existing state on each render instead of storing a copy | The preview is `citation(sourceFromForm(values))`, so it can't go stale | `LogEntryForm`'s `dirty` |
| Clipboard API + live region | `navigator.clipboard.writeText`, then a polite status line | Copy gives spoken feedback, and a refusal says what to do instead | `components/app/class-students.tsx` (`copyCode`) |
| Label in name (WCAG 2.5.3) | An `aria-label` starts with the button's visible words | "Copy citation for Inclusion…" is unique per row for screen readers, and voice-control users can still say "Copy citation" | `LogVisibilityToggle` ("Hide …") |
| `searchParams` as a Promise | Next 15 page props are async | `?kind=SOURCE` preselects the kind | `app/(app)/home/page.tsx` (`?view=`) |

## File structure

| File | Responsibility |
|---|---|
| `backend/src/test/java/ie/coursework/content/CitationExamplesSourcesTest.java` | Create: each NCCA example string the frontend quotes is on its page, in both documents |
| `backend/src/test/java/ie/coursework/content/AppCopySourcesTest.java` | Modify: the "No particular, formal style" sentence |
| `frontend/lib/app/citation.ts` (+ `.test.ts`) | Create: `citation`, `referenceList`, `copyText`, `missingLine`, `sourceFromForm`, helpers, copy |
| `frontend/components/app/component-tabs.tsx` (+ spec) | Modify: Sources becomes a link |
| `frontend/components/app/source-list.tsx` (+ spec) | Create: the Sources page body |
| `frontend/app/(app)/components/[id]/sources/page.tsx` | Create: the page |
| `frontend/components/app/source-preview.tsx` | Create: "In your report", shown in the form |
| `frontend/components/app/log-entry-form.tsx` (+ spec) | Modify: the preview; an optional starting kind |
| `frontend/app/(app)/components/[id]/log/new/page.tsx` | Modify: read `?kind=` |
| `frontend/e2e/phase3.e2e.ts` | Modify: the Sources tab after the source is edited |
| `docs/ARCHITECTURE.md`, `docs/PILOT-DESIGN.md`, `docs/BACKLOG.md`, `docs/HANDOFF.md` | Modify (Task 9) |

---

## Task 1: Branch, the intent and the backlog

**Files:** `docs/intent/source-builder.md`, `docs/BACKLOG.md`, this plan (all already written on `pilotMain`'s working tree, 25 Oct 2026).

- [ ] **Step 1:** `git switch -c pilot/source-builder pilotMain` (the uncommitted docs come with you).
- [ ] **Step 2:** In `docs/BACKLOG.md`, change row 1's status to `planned: docs/superpowers/plans/2026-10-25-source-builder.md; building on pilot/source-builder`.
- [ ] **Step 3: Commit.**

```bash
git add docs/intent/source-builder.md docs/BACKLOG.md docs/superpowers/plans/2026-10-25-source-builder.md
git commit -m "Plan the source builder: the intent, the plan, and ai-use-record on the backlog"
```

---

## Task 2: Prove the NCCA strings are on their pages

**Files:**
- Create: `backend/src/test/java/ie/coursework/content/CitationExamplesSourcesTest.java`
- Modify: `backend/src/test/java/ie/coursework/content/AppCopySourcesTest.java`

- [ ] **Step 1: Write the test.**

```java
package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The NCCA's referencing examples, quoted in frontend/lib/app/citation.test.ts as the formatter's fixtures. The two
 * guidelines carry the same examples, so each is checked in both. Same literals as the test file: change both or neither.
 */
class CitationExamplesSourcesTest {

    static final List<String> IN_TEXT = List.of(
            "(p. 57, McLeskey, 2013)",
            "(Hearne, J., 30/08/2024)",
            "(thelatinlibrary.com/101/RhetoricalDevices)",
            "(Ep. 10, rte.ie/radio/podcasts/22093250)",
            "(3:20 to 5:45, youtu.be/yCv4iyPqZKQ)");

    static final List<String> REFERENCES = List.of(
            "McLeskey, J. (2013) Inclusion: effective practice for all students? 2nd edn.",
            "Hearne, J. (30/08/2024) ‘How bad driving habits cost Irish motorists hundreds every year’, Irish Examiner",
            "Latin Library, Principal Rhetorical and Literary Devices, (date written not available), "
                    + "http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf, Date accessed: 17/6/24",
            "Philip Boucher Hayes, RTE, Hot Mess – Megawatts and Megabytes, Podcast, date created: 30/5/24, "
                    + "https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/, Date accessed: 10/11/23",
            "ApintTurtle, Zig & Zag – Christmas crises, Film, date created 20/12/2008, http://youtu.be/yCv4iyPqZKQ, "
                    + "12/12/14, from 3 minutes 20 seconds to 5 minutes 45 seconds.");

    static Stream<Arguments> examples() {
        return Stream.of(
                        IN_TEXT.stream().flatMap(q -> Stream.of(Arguments.of("NCCA-BIO p. 15", q), Arguments.of("NCCA-BUS p. 22", q))),
                        REFERENCES.stream().flatMap(q -> Stream.of(Arguments.of("NCCA-BIO p. 16", q), Arguments.of("NCCA-BUS p. 23", q))))
                .flatMap(s -> s);
    }

    @ParameterizedTest(name = "{0}: {1}")
    @MethodSource("examples")
    void eachExampleIsOnItsPage(String ref, String quote) {
        SourceRef source = SourceRef.parse(ref);
        assertThat(SourceDocuments.startsOnPage(source, quote))
                .as("not on %s; found on %s", ref, SourceDocuments.printedPagesContaining(source.key(), quote)).isTrue();
    }
}
```

- [ ] **Step 2: Bite it.** Change `McLeskey, 2013` to `McLeskey, 2014` in `IN_TEXT`, then run:

```bash
cd backend && ./mvnw -q test -Dtest=CitationExamplesSourcesTest
```

Expected: two failures, `not on NCCA-BIO p. 15; found on []` and the same for NCCA-BUS p. 22. Put `2013` back and run again. Expected: 20 tests pass. If any real quote fails, look at the printed pages the message lists. **Never reword the quote:** fix the page, or ask Tim if the documents disagree.

- [ ] **Step 3: Add the style sentence** to `AppCopySourcesTest`. Above the class's closing brace:

```java
    static final String NO_FORMAL_STYLE = "No particular, formal style of referencing is required.";

    @ParameterizedTest
    @ValueSource(strings = {"NCCA-BIO p. 15", "NCCA-BUS p. 20"})
    void theNoFormalStyleSentenceIsOnItsPage(String ref) { // decision S-15; NO_FORMAL_STYLE in frontend/lib/app/citation.ts
        SourceRef source = SourceRef.parse(ref);
        assertThat(SourceDocuments.startsOnPage(source, NO_FORMAL_STYLE))
                .as("not on %s; found on %s", ref, SourceDocuments.printedPagesContaining(source.key(), NO_FORMAL_STYLE)).isTrue();
    }
```

Update the class comment's last sentence to: `The same literals are BACKUP_ADVICE in frontend/lib/app/ready.ts and NO_FORMAL_STYLE in frontend/lib/app/citation.ts: change both or neither.`

- [ ] **Step 4:** Bite it the same way (`p. 21` instead of `p. 20`; expect `found on [20]`), revert, then run `cd backend && ./mvnw -q test -Dtest='CitationExamplesSourcesTest,AppCopySourcesTest'`. Expected: all pass.
- [ ] **Step 5: Commit.** `git commit -am "Prove the NCCA's referencing examples and the no-formal-style line are on their pages"` (add the new file first).

---

## Task 3: `citation.ts`, the helpers

**Files:**
- Create: `frontend/lib/app/citation.ts`, `frontend/lib/app/citation.test.ts`

- [ ] **Step 1: Write the failing tests.**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { ddmmyyyy, shortLink, shortName } from "./citation.ts";

test("a date accessed reads day/month/year, never ambiguously (decision S-9)", () => {
  assert.equal(ddmmyyyy("2024-06-17"), "17/06/2024");
  assert.equal(ddmmyyyy("2023-11-10"), "10/11/2023");
});

test("an in-text citation names the author by surname, or whole when there's no comma", () => {
  assert.equal(shortName("McLeskey, J."), "McLeskey");
  assert.equal(shortName("Latin Library"), "Latin Library");
  assert.equal(shortName("  Hearne , J. "), "Hearne");
});

test("an online in-text citation is the link without its scheme, www., extension or trailing slash", () => {
  assert.equal(shortLink("http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf"), "thelatinlibrary.com/101/RhetoricalDevices");
  assert.equal(shortLink("http://youtu.be/yCv4iyPqZKQ"), "youtu.be/yCv4iyPqZKQ");
  assert.equal(shortLink("https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/"),
    "rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes");
  assert.equal(shortLink("https://example.ie/"), "example.ie");
  assert.equal(shortLink("not a link"), "not a link");
});
```

- [ ] **Step 2:** Run `cd frontend && node --test lib/app/citation.test.ts`. Expected: FAIL, `Cannot find module …/citation.ts`.
- [ ] **Step 3: Write the helpers.**

```ts
import type { SourceFields, SourceType } from "@/lib/api/schemas";

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
    return `${u.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}
```

(The `SourceFields`, `SourceType` and `isOnline` imports are used in Task 4. If lint flags them as unused now, add them in Task 4 instead.)

- [ ] **Step 4:** Run the test again. Expected: 3 pass.
- [ ] **Step 5: Commit.** `git add lib/app/citation.ts lib/app/citation.test.ts && git commit -m "Shorten names, links and dates the way the NCCA's citations do"`

---

## Task 4: `citation()`, the NCCA examples, the flags and the list

**Files:**
- Modify: `frontend/lib/app/citation.ts`, `frontend/lib/app/citation.test.ts`

- [ ] **Step 1: Write the failing tests.** Append to `citation.test.ts` (and extend its import line to `import { citation, copyText, ddmmyyyy, missingLine, referenceList, shortLink, shortName, sourceFromForm } from "./citation.ts";`, plus `import type { SourceFields } from "@/lib/api/schemas";`):

```ts
const blank: SourceFields = { type: "BOOK", title: "", author: null, publication: null, datePublished: null, url: null,
  dateAccessed: null, locator: null, keyInformation: null, relevance: null, reflections: null };
const source = (f: Partial<SourceFields>): SourceFields => ({ ...blank, ...f });

/** S-4's gate: each detail is found, each after the one before. */
function inOrder(text: string, details: string[]) {
  let from = 0;
  for (const d of details) {
    const at = text.indexOf(d, from);
    assert.ok(at >= 0, `"${d}" missing (or out of order) in: ${text}`);
    from = at + d.length;
  }
}

// NCCA-BIO pp. 15-16 and NCCA-BUS pp. 22-23, quoted. Same literals as CitationExamplesSourcesTest: change both or neither.
const NCCA = {
  book: {
    fields: source({ type: "BOOK", author: "McLeskey, J.", datePublished: "2013", title: "Inclusion: effective practice for all students? 2nd edn.", locator: "p. 57" }),
    inText: "(p. 57, McLeskey, 2013)",
    reference: "McLeskey, J. (2013) Inclusion: effective practice for all students? 2nd edn.",
  },
  newspaper: {
    fields: source({ type: "NEWSPAPER_OR_MAGAZINE", author: "Hearne, J.", datePublished: "30/08/2024", title: "How bad driving habits cost Irish motorists hundreds every year", publication: "Irish Examiner" }),
    inText: "(Hearne, J., 30/08/2024)",
    reference: "Hearne, J. (30/08/2024) ‘How bad driving habits cost Irish motorists hundreds every year’, Irish Examiner",
  },
  text: {
    fields: source({ type: "ONLINE_TEXT_OR_IMAGE", author: "Latin Library", title: "Principal Rhetorical and Literary Devices", url: "http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf", dateAccessed: "2024-06-17" }),
    inText: "(thelatinlibrary.com/101/RhetoricalDevices)",
    reference: "Latin Library, Principal Rhetorical and Literary Devices, (date written not available), http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf, Date accessed: 17/6/24",
  },
  audio: {
    fields: source({ type: "ONLINE_AUDIO", author: "Philip Boucher Hayes", publication: "RTE", title: "Hot Mess – Megawatts and Megabytes", datePublished: "30/5/24", url: "https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/", dateAccessed: "2023-11-10", locator: "Ep. 10" }),
    inText: "(Ep. 10, rte.ie/radio/podcasts/22093250)",
    reference: "Philip Boucher Hayes, RTE, Hot Mess – Megawatts and Megabytes, Podcast, date created: 30/5/24, https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/, Date accessed: 10/11/23",
  },
  video: {
    fields: source({ type: "ONLINE_VIDEO", author: "ApintTurtle", title: "Zig & Zag – Christmas crises", datePublished: "20/12/2008", url: "http://youtu.be/yCv4iyPqZKQ", dateAccessed: "2014-12-12", locator: "3:20 to 5:45" }),
    inText: "(3:20 to 5:45, youtu.be/yCv4iyPqZKQ)",
    reference: "ApintTurtle, Zig & Zag – Christmas crises, Film, date created 20/12/2008, http://youtu.be/yCv4iyPqZKQ, 12/12/14, from 3 minutes 20 seconds to 5 minutes 45 seconds.",
  },
};

test("a book comes out exactly as the NCCA's example", () => {
  const c = citation(NCCA.book.fields);
  assert.equal(c.inText, NCCA.book.inText);
  assert.equal(c.reference, NCCA.book.reference);
  assert.deepEqual(c.missing, []);
});

test("a newspaper article: the NCCA's reference exactly; the in-text uses the surname, as the book does", () => {
  const c = citation(NCCA.newspaper.fields);
  assert.equal(c.reference, NCCA.newspaper.reference);
  assert.equal(c.inText, "(Hearne, 30/08/2024)");
  inOrder(c.inText, ["Hearne", "30/08/2024"]);
});

test("text online: the NCCA's in-text exactly; the reference keeps every detail in order", () => {
  const c = citation(NCCA.text.fields);
  assert.equal(c.inText, NCCA.text.inText);
  assert.equal(c.reference, "Latin Library, Principal Rhetorical and Literary Devices, date not available, http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf, Date accessed: 17/06/2024");
  inOrder(c.reference, ["Latin Library", "Principal Rhetorical and Literary Devices", "http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf", "17/06/2024"]);
});

test("audio online keeps every detail of the NCCA's example in order", () => {
  const c = citation(NCCA.audio.fields);
  assert.equal(c.inText, "(Ep. 10, rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes)");
  inOrder(c.inText, ["Ep. 10", "rte.ie/radio/podcasts/22093250"]);
  assert.equal(c.reference, "Philip Boucher Hayes, RTE, Hot Mess – Megawatts and Megabytes, date created: 30/5/24, https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/, Date accessed: 10/11/2023, Ep. 10");
  inOrder(c.reference, ["Philip Boucher Hayes", "RTE", "Hot Mess – Megawatts and Megabytes", "30/5/24", "https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/", "10/11/2023"]);
});

test("video online: the NCCA's in-text exactly; the reference keeps every detail in order", () => {
  const c = citation(NCCA.video.fields);
  assert.equal(c.inText, NCCA.video.inText);
  assert.equal(c.reference, "ApintTurtle, Zig & Zag – Christmas crises, date created: 20/12/2008, http://youtu.be/yCv4iyPqZKQ, Date accessed: 12/12/2014, 3:20 to 5:45");
  inOrder(c.reference, ["ApintTurtle", "Zig & Zag – Christmas crises", "20/12/2008", "http://youtu.be/yCv4iyPqZKQ", "12/12/2014", "3:20 to 5:45"]);
});

test("the NCCA strings above are the ones the backend proves are on their pages", () => {
  // A reminder that NCCA.*.inText and NCCA.*.reference are quotes, not ours. CitationExamplesSourcesTest holds the same.
  assert.equal(Object.keys(NCCA).length, 5);
});

test("without an author, a source leads with its title; without a date, it says so", () => {
  assert.equal(citation(source({ title: "Junior Cycle Science", locator: "ch. 3" })).reference, "Junior Cycle Science (date not available)");
  assert.equal(citation(source({ title: "Junior Cycle Science", locator: "ch. 3" })).inText, "(ch. 3, Junior Cycle Science)");
  assert.equal(citation(source({ type: "ONLINE_VIDEO", title: "Titration demo", url: "https://youtu.be/x1", dateAccessed: "2026-10-01" })).reference,
    "Titration demo, date not available, https://youtu.be/x1, Date accessed: 01/10/2026");
});

test("a print source only shows a date accessed when it has a link", () => {
  // The form sends today's date accessed for every source, so a book would otherwise always carry one.
  assert.equal(citation(source({ title: "Inclusion", author: "McLeskey, J.", datePublished: "2013", dateAccessed: "2026-10-01" })).reference,
    "McLeskey, J. (2013) Inclusion");
  assert.equal(citation(source({ type: "OTHER", title: "Annual report", author: "EPA", datePublished: "2025", url: "https://epa.ie/r.pdf", dateAccessed: "2026-10-01" })).reference,
    "EPA (2025) Annual report, https://epa.ie/r.pdf, Date accessed: 01/10/2026");
});

test("blank text counts as missing, and each type flags what the NCCA asks it for (decision S-10)", () => {
  assert.deepEqual(citation(source({ title: "Inclusion", author: "  " })).missing, ["author", "datePublished", "locator"]);
  assert.deepEqual(citation(source({ type: "NEWSPAPER_OR_MAGAZINE", title: "x" })).missing, ["author", "datePublished", "publication"]);
  assert.deepEqual(citation(source({ type: "ONLINE_TEXT_OR_IMAGE", title: "x" })).missing, ["url", "dateAccessed"]);
  assert.deepEqual(citation(source({ type: "ONLINE_AUDIO", title: "x", url: "https://a.ie", dateAccessed: "2026-10-01" })).missing, ["locator"]);
  assert.deepEqual(citation(source({ type: "ONLINE_VIDEO", title: "x" })).missing, ["url", "dateAccessed", "locator"]);
  assert.deepEqual(citation(source({ type: "OTHER", title: "x" })).missing, ["author", "datePublished"]);
});

test("the missing line names each detail in plain words", () => {
  assert.equal(missingLine([]), null);
  assert.equal(missingLine(["locator"]), "Add the page, chapter or timestamp you used so a reader can check this source.");
  assert.equal(missingLine(["author", "datePublished"]), "Add the author and the date published so a reader can check this source.");
  assert.equal(missingLine(["url", "dateAccessed", "locator"]), "Add the link, the date accessed and the page, chapter or timestamp you used so a reader can check this source.");
});

test("the list is alphabetical by reference, ignoring case and a leading quote mark (decision S-7)", () => {
  const list = referenceList([
    { id: "z", fields: source({ title: "Zebra", author: "zed, A." }) },
    { id: "q", fields: source({ type: "NEWSPAPER_OR_MAGAZINE", title: "Apples" }) },
    { id: "b", fields: source({ title: "Bees", author: "Byrne, A." }) },
  ]);
  assert.deepEqual(list.map((s) => s.id), ["q", "b", "z"]);
  assert.equal(copyText(list), "‘Apples’ (date not available)\nByrne, A. (date not available) Bees\nzed, A. (date not available) Zebra");
});

test("the form's values become fields for the preview; no title, no preview", () => {
  assert.equal(sourceFromForm({ type: "BOOK", title: "  " }), null);
  assert.deepEqual(sourceFromForm({ type: "ONLINE_VIDEO", title: " Demo ", url: "https://youtu.be/x", dateAccessed: "2026-10-01", author: "" }),
    source({ type: "ONLINE_VIDEO", title: "Demo", url: "https://youtu.be/x", dateAccessed: "2026-10-01" }));
});
```

- [ ] **Step 2:** Run `cd frontend && node --test lib/app/citation.test.ts`. Expected: FAIL, `citation` (and the others) not exported.
- [ ] **Step 3: Write the code.** Append to `citation.ts`:

```ts
export type MissingDetail = "author" | "datePublished" | "publication" | "locator" | "url" | "dateAccessed";

/** What a source becomes in the report, and what it still lacks (decision S-2: save and flag, never block). */
export type Citation = { inText: string; reference: string; missing: MissingDetail[] };

/** NCCA-BIO p. 15, NCCA-BUS p. 20 (decision S-15). AppCopySourcesTest proves it's on both pages. */
export const NO_FORMAL_STYLE = "No particular, formal style of referencing is required.";
export const LIST_RULE = "Built from the sources in your log, in alphabetical order, including the ones only you can read.";
export const AI_NOT_YET = "AI uses aren't in this list yet. Add them to your reference list yourself.";

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
  const present: Record<MissingDetail, string | null> = { author, datePublished: date, publication, locator, url, dateAccessed: f.dateAccessed };
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

/** "Add the author and the date published so a reader can check this source." */
export function missingLine(missing: readonly MissingDetail[]): string | null {
  if (missing.length === 0) return null;
  const words = missing.map((m) => WORDS[m]);
  const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
  return `Add ${list} so a reader can check this source.`;
}

const ORDER = new Intl.Collator("en-IE", { sensitivity: "base" });
const sortKey = (reference: string) => reference.replace(/^[‘'"]/, "");

/** Decision S-7: alphabetical by reference. */
export function referenceList<T extends { fields: SourceFields }>(sources: readonly T[]): Array<T & { citation: Citation }> {
  return sources
    .map((s) => ({ ...s, citation: citation(s.fields) }))
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
```

- [ ] **Step 4:** Run the test again. Expected: all pass. If an NCCA-derived assertion fails, fix the code, never the expected string. The `inOrder` details come straight from the NCCA quote.
- [ ] **Step 5:** `make verify`, then commit: `git commit -am "Turn a source into an in-text citation and a reference, modelled on the NCCA's examples, and flag what's missing"`

---

## Task 5: The Sources tab becomes a link

**Files:** Modify `frontend/components/app/component-tabs.tsx`, `frontend/components/app/component-tabs.spec.tsx`

- [ ] **Step 1: Write the failing test.** In the spec, change the existing test's last line to `expect(screen.queryByRole("link", { name: "AI use" })).not.toBeInTheDocument();` and add:

```tsx
  it("makes Sources a live link to the component's sources", () => {
    render(<ComponentTabs componentId="k1" current="sources" />);
    expect(screen.getByRole("link", { name: "Sources" })).toHaveAttribute("href", "/components/k1/sources");
    expect(screen.getByRole("link", { name: "Sources" })).toHaveAttribute("aria-current", "page");
  });
```

- [ ] **Step 2:** `cd frontend && npx vitest run components/app/component-tabs.spec.tsx`. Expected: FAIL (type error on `"sources"`, and no Sources link).
- [ ] **Step 3: Change the component.**

```tsx
/** Roadmap §6.1: inside a component, Overview · Log (P3) · Sources · AI use · Word checker (P6). */
export function ComponentTabs({ componentId, current }: { componentId: string; current: "overview" | "log" | "sources" }) {
  const tabs = [
    { key: "overview", label: "Overview", href: `/components/${componentId}` },
    { key: "log", label: "Log", href: `/components/${componentId}/log` },
    { key: "sources", label: "Sources", href: `/components/${componentId}/sources` },
  ] as const;
```

and `{["AI use", "Word checker"].map((tab) => (` for the disabled ones.

- [ ] **Step 4:** Run the spec. Expected: pass.
- [ ] **Step 5:** `make verify`, then commit: `git commit -am "Open the component's Sources tab"`

---

## Task 6: `SourceList`, the Sources page body

**Files:** Create `frontend/components/app/source-list.tsx`, `frontend/components/app/source-list.spec.tsx`

- [ ] **Step 1: Write the failing spec.** Use `fireEvent.click` for copy buttons: user-event installs its own clipboard stub, which would hide the mock.

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SourceFields } from "@/lib/api/schemas";

import { SourceList } from "./source-list";

const blank: SourceFields = { type: "BOOK", title: "", author: null, publication: null, datePublished: null, url: null,
  dateAccessed: null, locator: null, keyInformation: null, relevance: null, reflections: null };
const book = { id: "s1", fields: { ...blank, title: "Inclusion: effective practice for all students? 2nd edn.", author: "McLeskey, J.", datePublished: "2013", locator: "p. 57" } };
const video = { id: "s2", fields: { ...blank, type: "ONLINE_VIDEO" as const, title: "Zig & Zag – Christmas crises", url: "http://youtu.be/yCv4iyPqZKQ", dateAccessed: "2014-12-12" } };
const BOOK_REF = "McLeskey, J. (2013) Inclusion: effective practice for all students? 2nd edn.";
const VIDEO_REF = "Zig & Zag – Christmas crises, date not available, http://youtu.be/yCv4iyPqZKQ, Date accessed: 12/12/2014";

const writeText = vi.fn();
beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

describe("SourceList", () => {
  it("lists each source's reference and in-text citation, alphabetically", () => {
    render(<SourceList componentId="k1" sources={[video, book]} />);
    const items = within(screen.getByRole("list", { name: "References" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(BOOK_REF);
    expect(items[0]).toHaveTextContent("(p. 57, McLeskey, 2013)");
    expect(items[1]).toHaveTextContent(VIDEO_REF);
    expect(screen.getByText(/No particular, formal style of referencing is required\./)).toBeInTheDocument();
    expect(screen.getByText("AI uses aren't in this list yet. Add them to your reference list yourself.")).toBeInTheDocument();
  });

  it("copies the whole list, one reference per line, and says so", async () => {
    render(<SourceList componentId="k1" sources={[video, book]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy reference list" }));
    expect(writeText).toHaveBeenCalledWith(`${BOOK_REF}\n${VIDEO_REF}`);
    expect(await screen.findByText("Copied 2 references.")).toBeInTheDocument();
  });

  it("copies one in-text citation", async () => {
    render(<SourceList componentId="k1" sources={[video, book]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy citation for Zig & Zag – Christmas crises" }));
    expect(writeText).toHaveBeenCalledWith("(youtu.be/yCv4iyPqZKQ)");
    expect(await screen.findByText("Citation copied.")).toBeInTheDocument();
  });

  it("flags a source missing a detail, and still lets the list be copied", () => {
    render(<SourceList componentId="k1" sources={[video, book]} />);
    expect(screen.getByText("Add the page, chapter or timestamp you used so a reader can check this source.")).toBeInTheDocument();
    expect(screen.getByText("1 of your sources is missing a detail. You can still copy the list.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy reference list" })).toBeEnabled();
  });

  it("says what to do when the browser refuses to copy", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    render(<SourceList componentId="k1" sources={[book]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy reference list" }));
    expect(await screen.findByText("Couldn't copy. Select the text and copy it yourself.")).toBeInTheDocument();
  });

  it("opens each source in the log", () => {
    render(<SourceList componentId="k1" sources={[book]} />);
    expect(screen.getByRole("link", { name: `Open in log, ${book.fields.title}` })).toHaveAttribute("href", "/components/k1/log/s1");
  });

  it("offers to add a source when there are none", () => {
    render(<SourceList componentId="k1" sources={[]} />);
    expect(screen.getByRole("heading", { name: "No sources yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a source" })).toHaveAttribute("href", "/components/k1/log/new?kind=SOURCE");
    expect(screen.queryByRole("button", { name: "Copy reference list" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2:** `npx vitest run components/app/source-list.spec.tsx`. Expected: FAIL, module not found.
- [ ] **Step 3: Write the component.**

```tsx
"use client";

import { CircleAlert, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { SourceFields } from "@/lib/api/schemas";
import { AI_NOT_YET, copyText, LIST_RULE, missingLine, NO_FORMAL_STYLE, referenceList } from "@/lib/app/citation";

import { card, sectionTitle, textLink } from "./styles";

type Source = { id: string; fields: SourceFields };

/** Backlog #1, the reference builder (FR-29–31): the student's sources as a list to copy into the report. */
export function SourceList({ componentId, sources }: { componentId: string; sources: Source[] }) {
  const [status, setStatus] = useState("");
  const list = referenceList(sources);
  const flagged = list.filter((s) => s.citation.missing.length > 0).length;

  async function copy(value: string, done: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(done);
    } catch {
      setStatus("Couldn't copy. Select the text and copy it yourself.");
    }
  }

  if (list.length === 0) {
    return (
      <div className={`${card} mt-6 flex flex-col items-start gap-3 p-5 lg:p-6`}>
        <h2 className={sectionTitle}>No sources yet</h2>
        <p className="text-app-base text-app-copy">Each source you add to your log appears here as a reference, ready to copy into your report.</p>
        <Link href={`/components/${componentId}/log/new?kind=SOURCE`} className={buttonVariants({ size: "default", className: "w-full lg:w-auto" })}>
          Add a source
        </Link>
      </div>
    );
  }
  const n = list.length;
  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className={sectionTitle}>Your reference list</h2>
          <p className="mt-1 text-app-small text-app-grey">{`${LIST_RULE} The NCCA: “${NO_FORMAL_STYLE}”`}</p>
        </div>
        <Button type="button" className="w-full lg:w-auto" onClick={() => copy(copyText(list), `Copied ${n} reference${n === 1 ? "" : "s"}.`)}>
          <Copy aria-hidden />Copy reference list
        </Button>
      </div>
      {flagged > 0 && (
        <p className="text-app-small text-app-copy">{`${flagged} of your sources ${flagged === 1 ? "is" : "are"} missing a detail. You can still copy the list.`}</p>
      )}
      <p aria-live="polite" className="text-app-small font-semibold text-app-ink">{status}</p>
      <ul aria-label="References" className={`${card} divide-y divide-app-line overflow-hidden`}>
        {list.map((s) => {
          const flag = missingLine(s.citation.missing);
          return (
            <li key={s.id} className="flex flex-col gap-2 p-4">
              <p className="text-app-base text-app-ink">{s.citation.reference}</p>
              <p className="text-app-small text-app-copy"><span className="font-semibold">In the text: </span>{s.citation.inText}</p>
              {flag && (
                <p className="flex items-start gap-1.5 text-app-small font-semibold text-app-attention">
                  <CircleAlert aria-hidden className="mt-0.5 size-4 flex-none" />{flag}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <Button type="button" variant="outline" aria-label={`Copy citation for ${s.fields.title}`}
                  onClick={() => copy(s.citation.inText, "Citation copied.")}>
                  Copy citation
                </Button>
                <Link href={`/components/${componentId}/log/${s.id}`} aria-label={`Open in log, ${s.fields.title}`} className={`${textLink} text-app-small`}>
                  Open in log
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-app-small text-app-copy">{AI_NOT_YET}</p>
    </div>
  );
}
```

Check `text-app-small`, `text-app-copy` and `text-app-attention` exist as utilities (they're used in `log-list.tsx` and declared in `globals.css` `@theme`). The "Open in log" link sits in a row with a 44px-tall button, but check its own target size in Task 9's checklist pass. If it's under 44px, give it `inline-flex min-h-11 items-center`.

- [ ] **Step 4:** Run the spec. Expected: 7 pass.
- [ ] **Step 5:** `make verify`, then commit: `git add components/app/source-list.tsx components/app/source-list.spec.tsx && git commit -m "List a student's sources as references to copy, one at a time or all together"`

---

## Task 7: The Sources page

**Files:** Create `frontend/app/(app)/components/[id]/sources/page.tsx`

Pages are covered by the journey (Task 8), as the log pages are. There's no page spec.

- [ ] **Step 1: Write the page.** It follows `…/log/page.tsx` line for line, except for the title, the tab and the body:

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ComponentTabs } from "@/components/app/component-tabs";
import { ErrorPanel } from "@/components/app/error-panel";
import { SourceList } from "@/components/app/source-list";
import { backLink, pageTitle } from "@/components/app/styles";
import { componentViewSchema, logEntrySchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

/** Roadmap §6 `/components/[id]/sources`. Reads the student's own log, hidden entries included (decision S-14). */
export default async function SourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = encodeURIComponent(id);
  const [component, entries] = await Promise.all([
    attempt(() => serverApi.get(`/components/${path}`, componentViewSchema)),
    attempt(() => serverApi.get(`/components/${path}/log`, z.array(logEntrySchema))),
  ]);
  if (!component.ok && component.error.code === "NOT_FOUND") notFound();
  if (component.ok && component.data.view === "TEACHER") redirect(`/teach/classes/${component.data.classId}/component`);

  return (
    <AppMain>
      <Link href="/home" className={backLink}>Timeline</Link>
      {component.ok && component.data.view === "STUDENT" ? (
        <>
          <h1 className={`mt-2.5 ${pageTitle}`}>{`${component.data.subjectName} sources`}</h1>
          <ComponentTabs componentId={component.data.id} current="sources" />
          {entries.ok
            ? <SourceList componentId={component.data.id} sources={entries.data.flatMap((e) => (e.kind === "SOURCE" ? [{ id: e.id, fields: e.fields }] : []))} />
            : <div className="mt-6"><ErrorPanel error={entries.error} /></div>}
        </>
      ) : (
        !component.ok && <div className="mt-6"><ErrorPanel error={component.error} /></div>
      )}
    </AppMain>
  );
}
```

- [ ] **Step 2:** `middleware.ts` already guards `/components` (`ARCHITECTURE.md` §6). Confirm with `grep -n components frontend/middleware.ts`. Nothing to add.
- [ ] **Step 3:** `make verify` (types and build catch a wrong import or schema), then commit: `git add "app/(app)/components/[id]/sources/page.tsx" && git commit -m "Add the Sources page at /components/[id]/sources"`

---

## Task 8: The preview in the source form, and Add a source preselecting Source

**Files:**
- Create: `frontend/components/app/source-preview.tsx`
- Modify: `frontend/components/app/log-entry-form.tsx`, `frontend/components/app/log-entry-form.spec.tsx`, `frontend/app/(app)/components/[id]/log/new/page.tsx`, `frontend/e2e/phase3.e2e.ts`

- [ ] **Step 1: Write the failing specs.** Add to `log-entry-form.spec.tsx`'s `describe`:

```tsx
  it("starts on Source when the page asks for it", () => {
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" kind="SOURCE" />);
    expect(screen.getByRole("radio", { name: "Source" })).toBeChecked();
  });

  it("previews the source in the report's shape as it's typed, and flags what's missing", async () => {
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" kind="SOURCE" />);
    const preview = screen.getByRole("region", { name: "In your report" });
    expect(preview).toHaveTextContent("Add a title to see how this source will look in your report.");
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Inclusion");
    await userEvent.type(screen.getByRole("textbox", { name: "Author (optional)" }), "McLeskey, J.");
    await userEvent.type(screen.getByRole("textbox", { name: "Date or year published (optional)" }), "2013");
    expect(preview).toHaveTextContent("(McLeskey, 2013)");
    expect(preview).toHaveTextContent("McLeskey, J. (2013) Inclusion");
    expect(preview).toHaveTextContent("Add the page, chapter or timestamp you used so a reader can check this source.");
    await userEvent.type(screen.getByRole("textbox", { name: "Page, chapter, section or timestamp (optional)" }), "p. 57");
    expect(preview).toHaveTextContent("(p. 57, McLeskey, 2013)");
    expect(preview).not.toHaveTextContent("Add the page");
  });

  it("shows no preview for a note", () => {
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    expect(screen.queryByRole("region", { name: "In your report" })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2:** `npx vitest run components/app/log-entry-form.spec.tsx`. Expected: the three new specs FAIL (`kind` isn't a prop yet; no region). The existing ones pass.
- [ ] **Step 3: Write `SourcePreview`.**

```tsx
import type { SourceFields } from "@/lib/api/schemas";
import { citation, missingLine } from "@/lib/app/citation";

/** Decision S-1 and S-13: the Sources page's output, live, in reading order after the fields. Not a live region. */
export function SourcePreview({ fields }: { fields: SourceFields | null }) {
  const c = fields && citation(fields);
  const flag = c && missingLine(c.missing);
  return (
    <section aria-labelledby="source-preview-heading" className="flex flex-col gap-2 rounded-app-card bg-app-inset p-4">
      <h2 id="source-preview-heading" className="font-mono text-app-label font-bold uppercase tracking-[.09em] text-app-muted">In your report</h2>
      {c ? (
        <>
          <p className="text-app-small text-app-copy"><span className="font-semibold text-app-ink">In the text: </span>{c.inText}</p>
          <p className="text-app-small text-app-copy"><span className="font-semibold text-app-ink">Reference list: </span>{c.reference}</p>
          {flag && <p className="text-app-small font-semibold text-app-attention">{flag}</p>}
        </>
      ) : (
        <p className="text-app-small text-app-copy">Add a title to see how this source will look in your report.</p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Change `LogEntryForm`.**
  - The `Props` create branch becomes `| { mode: "create"; kind?: EntryKind }`.
  - `const [kind, setKind] = useState<EntryKind>(props.kind ?? "NOTE");` (revise always has a kind; create may).
  - Import `{ SourcePreview } from "./source-preview"` and `{ sourceFromForm } from "@/lib/app/citation"`.
  - In the `kind === "SOURCE"` branch, after the second `</FieldGroup>` (the "Your notes on it" group, which holds the locator), add `<SourcePreview fields={sourceFromForm(values)} />`.

- [ ] **Step 5: Read `?kind=` on the New entry page.** In `app/(app)/components/[id]/log/new/page.tsx`:

```tsx
export default async function NewLogEntryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string }> }) {
  const { id } = await params;
  const asked = entryKindSchema.safeParse((await searchParams).kind);
```

Import `entryKindSchema` next to `componentViewSchema`, and pass `kind={asked.success ? asked.data : undefined}` to `<LogEntryForm mode="create" …/>`.

- [ ] **Step 6:** Run the spec. Expected: all pass.
- [ ] **Step 7: Extend the journey.** In `e2e/phase3.e2e.ts`, after the student test (the one that edits the source) and before the teacher test, add:

```ts
test("the student's Sources tab turns the edited source into a reference", async ({ browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  const student = await phone(browser);
  await signInStudent(student);
  await student.getByRole("link", { name: /Biology/ }).click();
  await student.getByRole("navigation", { name: "Component sections" }).getByRole("link", { name: "Sources" }).click();
  const list = student.getByRole("list", { name: "References" });
  await expect(list).toContainText("Titration technique demo (RTÉ), date not available, https://youtu.be/yCv4iyPqZKQ, Date accessed: 01/10/2026");
  await expect(list).toContainText("(youtu.be/yCv4iyPqZKQ)");
  await expect(list).toContainText("Add the page, chapter or timestamp you used so a reader can check this source.");
  await expectAccessible(student);
});
```

Add one line to the file's top comment: `Then the Sources tab shows the source as a reference (source-builder).`

- [ ] **Step 8:** `make verify && make e2e`. Expected: both green. The journey count rises by 2 (laptop and phone).
- [ ] **Step 9: Commit.** `git add -A components/app app e2e && git commit -m "Preview a source's citation and reference while it's typed, and open New entry on Source from the Sources page"`

---

## Task 9: Docs, the UI checklist, the gate and hand-over

**Files:**
- Modify: `docs/ARCHITECTURE.md` §6 (a bullet after "The log pages": **The Sources page** `/components/[id]/sources`. It reads the student's own `GET /components/{id}/log` and keeps the `SOURCE` entries, hidden ones included. `lib/app/citation.ts` turns `SourceFields` into an in-text citation, a reference and the missing details. `SourceList` on the page and `SourcePreview` in `LogEntryForm` both use it. No endpoint of its own.) and §10 (under "Things that look wrong but aren't": **The citation formatter is TypeScript, not Java.** Decision S-6: the live preview reformats on every keystroke. The NCCA strings in its tests are proven on their pages by `CitationExamplesSourcesTest`.)
- Modify: `docs/PILOT-DESIGN.md` §10's testing table: in the Domain (JUnit) row, mark "citation … formatting against the NCCA's example strings" as moved to `node:test` (`lib/app/citation.test.ts`), source-builder S-6, 25 Oct 2026. Leave the AI-appendix part where it is.
- Modify: `docs/HANDOFF.md` (where this stopped, the verification output, S-6 to S-15 for Tim to confirm), `docs/BACKLOG.md` (row 1's status: built, not merged)
- Create later, not here: `docs/changes/source-builder.md` (the `write-changes` skill, after self-review)

- [ ] **Step 1:** Work through `docs/design/UI-CHECKLIST.md` for the Sources page and the form's preview: focus order (heading, Copy reference list, then each row's Copy citation and Open in log), 44px targets, the copy status announced, the 390px layout without sideways scroll (long links in a reference must wrap: add `break-words` to the reference `<p>` if they don't), and text contrast of `text-app-attention` on `--app-inset` in the preview (the token's comment gives 5.31:1 on its tint; check it on the inset). Fix what fails, each with its own test where one fits.
- [ ] **Step 2:** Run `make verify && make e2e` and paste both outputs into the hand-over.
- [ ] **Step 3:** Update `docs/ARCHITECTURE.md` and `docs/PILOT-DESIGN.md` as above, in each file's voice.
- [ ] **Step 4:** Update `docs/HANDOFF.md` and `docs/BACKLOG.md`.
- [ ] **Step 5: Commit.** `git commit -am "Record the source builder in the architecture, the design's test table and the hand-over"`

### Gate

- `make verify` and `make e2e` green, with output shown.
- `CitationExamplesSourcesTest` and `AppCopySourcesTest` green, each bitten once by hand (Task 2).
- Every NCCA example's details appear in our output in the NCCA's order (`citation.test.ts`), and the five exact matches hold.
- Then, in a **fresh session**: `/self-review` against `pilotMain`, then `write-changes` → `docs/changes/source-builder.md`, then Tim opens the PR into `pilotMain`.

---

## Self-review notes (for the executor)

- **Names that must match across tasks:** `citation`, `referenceList`, `copyText`, `missingLine`, `sourceFromForm`, `ddmmyyyy`, `shortName`, `shortLink`, `NO_FORMAL_STYLE`, `LIST_RULE`, `AI_NOT_YET`, types `Citation` and `MissingDetail` (all in `lib/app/citation.ts`); `SourceList({ componentId, sources })`; `SourcePreview({ fields })`; `ComponentTabs` `current: "overview" | "log" | "sources"`; `LogEntryForm` create prop `kind?`.
- **Accessible names that are the contract:** list "References"; buttons "Copy reference list", "Copy citation for {title}"; links "Sources", "Add a source", "Open in log, {title}"; region "In your report".
- **The book's date accessed:** the form sends today's date accessed for every kind of source (`LogEntryForm`'s initial `values`). That's why a print reference only prints it when there's a link (Task 4's test says so).
- **Checks this plan leaves to you, because they depend on code it didn't read in full:** that `Field` gives each input the label text as its accessible name, exactly as `FIELD_LABELS` spells it (the existing specs suggest it does); whether `lucide-react` exports `CircleAlert` in the installed version (else `AlertCircle`); whether ESLint objects to Task 3's not-yet-used imports.
