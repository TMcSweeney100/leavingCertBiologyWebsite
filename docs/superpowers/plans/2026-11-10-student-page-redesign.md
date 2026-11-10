# Student page redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rebuild the teacher's student page (`/teach/classes/[id]/students/[studentId]`) to direction D, checkpoints first. The page has four parts:
- a header card
- a navy summary card with a jump link per stage
- one card per stage on a timeline, with its actions visible and the waiting stage open in place
- the log as a footer: the latest three entries, then Show all with filter chips, each entry opening in place

**Architecture:** frontend only. There is no API, schema or backend change. Eight tasks on one branch:
- Task 0: the branch and the planning docs.
- Task 1: two new `--app-*` tokens.
- Task 2: pure helpers in a new `lib/app/student-page.ts` and in `lib/app/log.ts`.
- Task 3: `CheckpointCell` gains a `card` layout. The `one` layout is left for Progress.
- Task 4: `StudentCheckpoints` becomes a `CheckpointSummary` plus a timeline of stage cards. `StageRow` keeps all of its behaviour and only changes how it looks.
- Task 5: a `StudentHeader` card, and the page wired to it.
- Task 6: `TeacherLog` is rebuilt on shadcn `Collapsible` and a new shadcn `ToggleGroup`.
- Task 7: the journey, the docs, the checklist and the hand test.

**Tech Stack:** Next.js 15.3.9, React 19, Base UI through shadcn `base-nova` (`Collapsible`, `ToggleGroup`, `Drawer`), Tailwind v4 with `--app-*` tokens, lucide-react icons. Tests: `node --test`, Vitest with Testing Library, and Playwright.

**Intent:** `docs/intent/student-page-redesign.md` (confirmed 10 Nov 2026).

**Design:** `docs/design/pilot/student-page-redesign/`. Read `NOTES.md` first, then open `design/d-checkpoints-first.html` and `design/d-phone.html` in a browser. Each has a PNG beside it. Where this plan and the mockup disagree, this plan wins; R-8 to R-21 below say where and why.

**Branch:** `pilot/student-page-redesign` from `pilotMain`, one PR at the end. Diff base `pilotMain`.

## Global Constraints

- Test first: watch each test fail, then make it pass (root `CLAUDE.md`). `make verify` must be green before every commit, and `make e2e` green at the end (Task 7).
- Every action keeps working exactly as today:
  - sign off, and Undo after it
  - revoke, with its confirm strip
  - Accept and Not yet, with the note
  - the Full history drawer
  - the failure alerts and their Try again
- The `#checkpoint-<id>` anchors stay on each stage's `<li>`. `waiting-queue.tsx` and `progress-grid.tsx` link to them.
- A private entry still shows only its kind and dates, never its content. The `HIDDEN` branch of `teacherEntrySchema` stays `.strict()`.
- Accessible names are the specs' contract. `lib/app/ready.ts` says "D-10 may restyle, never rename". Keep every existing name: `Sign off … for …`, `Revoke sign-off of … for …`, `Accept … for …`, `Full history (1 answer)`, and so on.
- No raw colour in a component: every colour is an `--app-*` token (UI-STANDARDS §2). Never put a custom `--text-app-*` size and a `text-app-*` colour through one `cn()` call; build those strings with template literals (UI-STANDARDS §2).
- Every control is at least 44 × 44px on touch, with 8px between neighbours (UI-STANDARDS).
- The Progress page must not change. Its redesign is mockups only, in another session. `CheckpointCell`'s `grid` and `one` layouts stay as they are.
- Specs query by role and accessible name. Lean tests: a few cases proving the changed behaviour (`feedback_lean_tests`).
- Keep `docs/ARCHITECTURE.md` true in the same commit as any change it describes.
- Never `git add` `draft-list.md` or `docs/design/pilot/progress-redesign/`. Neither is this work's; the second is the other session's.

---

## Decisions made

From the mockups and the interview (`docs/intent/student-page-redesign.md`), settled:

| # | Question | Answer |
|---|---|---|
| R-1 | Which design? | D, checkpoints first. A and C are reference only; B (two columns) is rejected. |
| R-2 | Only this page? | Yes. Progress is being redesigned in the same style, mockups only for now. |
| R-3 | Build order? | This page first, on its own branch. Progress is built after this merges and reuses its tokens and the `card` layout. |
| R-4 | Waiting stage: at the top, or in stage order? | In stage order, open in place. The Progress Review link and the waiting queue already jump to its anchor, and the summary's segments add jump links. |
| R-5 | What does Show all do? | It expands the list in place. A drawer's backdrop would cover the answer form while the teacher reads the evidence. |
| R-6 | Filter chips? | Yes: All, Sources, Notes, AI use, with counts. They appear once the log is expanded. |
| R-7 | Clicking an entry? | It opens in place, showing the whole entry. This applies to every row. |

Made while writing this plan. **Tim: confirm or change R-8 to R-21.**

| # | What happens | Why it matters to you |
|---|---|---|
| R-8 | **The page ground stays `--app-ground`** (`#F7F8F9`, every app page's background), not the drawer's darker `--app-tray`. Cards keep their grey border. | The ground is set once in `app/(app)/layout.tsx` for every page. Changing it for one page would need a full-width wrapper; changing it for all pages is the `app-polish` decision. The cards still separate clearly. |
| R-9 | **A "due" stage** (its date has passed, nothing is signed off and there's no request) isn't in the mockup. It gets an amber-outlined circle with its number, an amber pill reading "Due, not signed off", and Sign off. Its segment on the navy bar is amber, like a waiting stage. | Both need the teacher, so both are amber. The words tell them apart: in the counts ("1 due, not signed off"), in the jump link's name, and on the card. The circle does too: filled for waiting, outlined for due. |
| R-10 | **`CheckpointCell` gets a new `card` layout** (pill plus one button). The existing `one` layout is left alone. | `one` is also used by Progress's one-stage view and phone layout. Restyling it would change Progress now. When Progress is redesigned it can switch to `card`, and `one` can go. |
| R-11 | **The history button keeps its words, "Full history (1 answer)"**, not the mockup's "History (1)". It sits on the last-answer line, not beside Revoke. | The words are the button's accessible name, which the specs and `ready-for-signoff.e2e.ts` use. The line already holds it today. |
| R-12 | **Your last note shows as today's sentence** ("Accepted on 3 Nov 2026. Your note: “Perfect Tim!!!!”") on a cream chip. With no note from you, the line is plain grey text. | It's the same copy the specs check, in the drawer's cream "teacher's note" colour. |
| R-13 | **The waiting card's amber strip says only "Waiting for you".** "Tim asked 7 days ago, for the first time" stays in the blue request block below it. | The mockup printed "asked 7 days ago" twice. |
| R-14 | **Each log row keeps its own date**, at the left on a laptop and above the title on a phone, instead of the mockup's day headings. | Entries spread over months; a date per row needs no grouping logic. |
| R-15 | **Show all is a toggle**: once open it reads "Show the latest 3", and closing it resets the filter to All. | A teacher can get back to the short page without reloading. |
| R-16 | **Chips appear only for kinds the student has.** Counts include private entries, and filtering includes private rows. | A private source is still a source. An "AI use 0" chip would only show an empty list. |
| R-17 | **Signed-off cards keep the normal border**, not the mockup's faint green one. | That green was an untokened value. The green pill and the green tick already say "signed off". |
| R-18 | **The header's work link is the bordered "Open Tim's work" block** (`WorkLinkBlock`) used in the request panel, instead of today's bare host link. | One look for "the student's work" on the page. Its accessible name is unchanged. |
| R-19 | **The privacy sentence moves** from under the name to the log's footer: "Entries Tim keeps private show only their kind, the dates and how many times they were edited." | It's about the log, so it goes with the log. |
| R-20 | **Each jump link is the segment plus the stage number below it**, 44px tall, with 8px between links, named in words, e.g. "Stage 5, Data analysis shared with the teacher: waiting for you". | Six links fit across a 375px phone at 44px each. A screen reader hears the stage and its state, not a colour. |
| R-21 | **The timeline's rail is decorative** (`aria-hidden`): a tick in a green circle when signed off, the stage's number otherwise. The line down to the next stage is green (`--app-signed-line`) after a signed-off stage, grey otherwise. | Each card says its stage and state in words, so the rail would only repeat them for a screen reader. |

---

## Concepts in play

| Concept | What it is | Why it fits here | Where this repo already uses it |
|---|---|---|---|
| Disclosure (show/hide) | A button with `aria-expanded` that shows or hides a panel; shadcn `Collapsible` is Base UI's, and it sets `aria-expanded`, `aria-controls` and `data-panel-open` | Every log row opens in place (R-7) | `components/ui/collapsible.tsx` is installed but not used yet; the log's revision History is a native `<details>`, the same idea (`components/app/teacher-log.tsx`) |
| Toggle group | A row of buttons where one is pressed (`aria-pressed`), with arrow keys moving between them | The filter chips (R-6) | New: `npx shadcn@latest add toggle-group`, restyled |
| Fragment links and scroll margin | `href="#checkpoint-…"` scrolls to the element with that id; `scroll-margin-top` keeps it clear of the header | The jump links (R-20) and the existing Review links | `components/app/student-checkpoints.tsx` (`scroll-mt-20`, `checkpointAnchor`) |
| An ordered list with a decorative rail | The stages are an `<ol>` of `<li>`s, so a screen reader hears "list, 6 items" and the order; the circles and line are `aria-hidden` | The timeline (R-21) | `<ol reversed aria-label="Revisions">` in `components/app/log-history.tsx` |
| `display: contents` for a responsive grid | A wrapper with `contents` disappears from layout, so its children become the grid's cells; without it, they stay grouped | A log row's date and kind sit in their own columns on a laptop and share a line on a phone (R-14) | New here |
| A polite live region | An `aria-live="polite"` element whose text is read out when it changes | Says what a filter left showing ("Showing 3 sources.") | `components/app/student-checkpoints.tsx` (`s.announcement`) |
| Pure helpers under `node --test` | Counting and wording live in `lib/app/*.ts` with no React, tested without a browser | Counts, link names, initials, a row's title and detail | `lib/app/stage-sheet.ts` (`countsLabel`) and its test |

---

## File structure

| File | Change | Responsibility |
|---|---|---|
| `frontend/app/globals.css` | Modify | `--app-attention-line`, `--app-signed-line` and their Tailwind colours (Task 1); `--app-due-row` removed once nothing uses it (Task 4) |
| `docs/design/UI-STANDARDS.md` | Modify | §5: what the two tokens mean; the student page joins design B's look |
| `frontend/lib/app/student-page.ts` | Create | `stageCounts`, `signedOffWords`, `segmentName`, `initials` |
| `frontend/lib/app/student-page.test.ts` | Create | Their cases |
| `frontend/lib/app/log.ts` | Modify | `kindCounts`, `KIND_PLURAL`, `LOG_PREVIEW`, `showingWords`, `teacherEntryLines` |
| `frontend/lib/app/log.test.ts` | Modify | Their cases |
| `frontend/components/app/signoff-parts.tsx` | Modify | `CheckpointCell` `card` layout |
| `frontend/components/app/signoff-parts.spec.tsx` | Modify | The `card` layout |
| `frontend/components/app/checkpoint-summary.tsx` | Create | The navy card: band line, jump links, counts |
| `frontend/components/app/student-checkpoints.tsx` | Rewrite | The summary plus the timeline of stage cards; `StageRow` restyled |
| `frontend/components/app/student-checkpoints.spec.tsx` | Modify | The summary, the list of cards, the waiting card |
| `frontend/components/app/request-history.tsx` | Modify | `LastAnswerLine`: no top rule; the cream chip when there's a teacher's note |
| `frontend/components/app/student-header.tsx` | Create | The header card |
| `frontend/components/app/student-header.spec.tsx` | Create | Its heading, class line and work link |
| `frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx` | Modify | Uses `StudentHeader`; drops the intro sentence and the bare work link |
| `frontend/components/ui/toggle-group.tsx` | Create (shadcn) | The chips |
| `frontend/components/app/teacher-log.tsx` | Rewrite | The footer log: preview, Show all, chips, rows that open |
| `frontend/components/app/teacher-log.spec.tsx` | Modify | Opening a row, Show all, a filter |
| `frontend/e2e/phase3.e2e.ts` | Modify | Open the source row before reading its history |
| `docs/ARCHITECTURE.md`, `docs/BACKLOG.md`, `docs/HANDOFF.md`, `docs/design/pilot/student-page-redesign/NOTES.md` | Modify | Kept true |

---

### Task 0: Branch and the planning docs

**Files:** `docs/BACKLOG.md` (one row added).

- [ ] **Step 1: See what's in the working tree**

Run: `git status --short`

Expected: this feature's planning files, plus three that aren't this work's:
- This feature's: `docs/intent/student-page-redesign.md`, this plan, and `docs/design/pilot/student-page-redesign/`.
- Not this work's: the untracked `draft-list.md`; `docs/design/pilot/progress-redesign/`, which is the other session's Progress mockups; and possibly `frontend/AGENTS.md`, which `next dev` rewrites.

**Never add those three.** If anything else is there, stop and tell Tim.

- [ ] **Step 2: Add the backlog row**

In `docs/BACKLOG.md`, in **Up next**, add this row directly after the `_app-polish_ (proposed)` row:

```markdown
| — | _student-page-redesign_ | Rebuild the teacher's student page to direction D: a navy summary card with a jump link per stage, one card per stage on a timeline with its actions visible and the waiting stage open in place, and the log as a footer (the latest three, then Show all with filter chips; entries open in place). The first page after the stage drawer to take design B's look | planned (10 Nov 2026). Plan: `docs/superpowers/plans/2026-11-10-student-page-redesign.md`; intent: `docs/intent/student-page-redesign.md`; design: `docs/design/pilot/student-page-redesign/` |
```

- [ ] **Step 3: Branch and commit the planning docs**

```bash
git switch -c pilot/student-page-redesign pilotMain
git add docs/intent/student-page-redesign.md docs/superpowers/plans/2026-11-10-student-page-redesign.md docs/design/pilot/student-page-redesign docs/BACKLOG.md
git commit -m "Plan the student page redesign: the intent, the plan, the mockups and the backlog row"
```

---

### Task 1: The two new tokens

**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `docs/design/UI-STANDARDS.md`

No test: tokens are values, not behaviour. Tasks 4 and 5 use them, and `make e2e`'s axe checks look at the real page.

- [ ] **Step 1: Add the tokens**

In `frontend/app/globals.css`, in `:root`, directly after `--app-note-muted: #5C5340; …` (line 375), add:

```css
  /* Student page redesign — direction D (docs/design/pilot/student-page-redesign/NOTES.md). Both are decorative lines:
     the words beside them carry the meaning, so they need no text contrast. */
  --app-attention-line: #E4C9B3;        /* the border of a card waiting for the teacher, under its amber strip */
  --app-signed-line: #9CC9B2;           /* the timeline's rail between two signed-off stages */
```

In the `@theme inline` block, directly after `--color-app-note-muted: var(--app-note-muted);` (line 132), add:

```css
  /* Student page redesign (docs/design/pilot/student-page-redesign/NOTES.md). */
  --color-app-attention-line: var(--app-attention-line);
  --color-app-signed-line: var(--app-signed-line);
```

Neither name ends like a `--text-app-*` size, so `border-app-attention-line` and `bg-app-signed-line` are always colours.

- [ ] **Step 2: Say what they mean**

In `docs/design/UI-STANDARDS.md` §5, replace the last sentence of the design B bullet (line 66), "Only the stage sheet uses them so far; whether they go app-wide is the `app-polish` idea in `docs/BACKLOG.md`.", with:

```markdown
The stage sheet and the teacher's student page (direction D, plan student-page-redesign) use them; whether they go app-wide is the `app-polish` idea in `docs/BACKLOG.md`. The student page adds two decorative lines: `--app-attention-line` (the border of a card waiting for the teacher) and `--app-signed-line` (the timeline's rail between signed-off stages).
```

- [ ] **Step 3: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add frontend/app/globals.css docs/design/UI-STANDARDS.md
git commit -m "Add the student page's two line colours: the waiting card's border and the signed-off rail"
```

---

### Task 2: The helpers

**Files:**
- Create: `frontend/lib/app/student-page.ts`, `frontend/lib/app/student-page.test.ts`
- Modify: `frontend/lib/app/log.ts`, `frontend/lib/app/log.test.ts`

**Interfaces:**
- Produces, `student-page.ts`:
  - `type StageCounts = { signedOff: number; waiting: number; due: number; notDue: number; total: number }`
  - `stageCounts(stages: ReadonlyArray<{ state: "READY" | "SIGNED_OFF" | "DUE" | "NOT_DUE" }>): StageCounts`
  - `signedOffWords(c: StageCounts): string`, which returns "3 of 6 signed off"
  - `segmentName(st: { label: string | null; state: …; checkpoint: { text: string } }): string`
  - `initials(s: { firstName: string; lastName: string }): string`
- Produces, `log.ts`:
  - `kindCounts(entries): Record<EntryKind, number>`
  - `KIND_PLURAL: Record<EntryKind, string>`
  - `LOG_PREVIEW = 3`
  - `showingWords(n: number, kind: EntryKind | "ALL"): string`
  - `teacherEntryLines(e: { kind: EntryKind; body: string | null; fields: SourceFields | AiUseFields | null }): { title: string; detail: string | null }`

- [ ] **Step 1: Write the failing tests**

Create `frontend/lib/app/student-page.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { initials, segmentName, signedOffWords, stageCounts } from "./student-page.ts";

test("counts each state, and says the signed-off share in words", () => {
  const c = stageCounts([{ state: "SIGNED_OFF" }, { state: "SIGNED_OFF" }, { state: "READY" }, { state: "DUE" }, { state: "NOT_DUE" }, { state: "NOT_DUE" }]);
  assert.deepEqual(c, { signedOff: 2, waiting: 1, due: 1, notDue: 2, total: 6 });
  assert.equal(signedOffWords(c), "2 of 6 signed off");
});

test("a jump link is named by its stage, its checkpoint and its state (R-20)", () => {
  assert.equal(segmentName({ label: "Stage 5", state: "READY", checkpoint: { text: "Data analysis shared with the teacher" } }),
    "Stage 5, Data analysis shared with the teacher: waiting for you");
  assert.equal(segmentName({ label: null, state: "DUE", checkpoint: { text: "Final report submitted for review and authentication" } }),
    "Report, Final report submitted for review and authentication: due, not signed off");
});

test("initials are the first letters of the first and last names", () => {
  assert.equal(initials({ firstName: "Tim", lastName: "Mc Sweeney" }), "TM");
  assert.equal(initials({ firstName: "aoife", lastName: "byrne" }), "AB");
});
```

In `frontend/lib/app/log.test.ts`, change the import line to:

```ts
import {
  counterText, dayMonth, dublinDate, entryDetail, entryHeading, entryTitle, isOnline, kindCounts, linkHost, linkMessage, showingWords,
  teacherEntryLines, visibilityLine,
} from "./log.ts";
```

and add at the end:

```ts
test("a closed row on the teacher's log: a source's type, author and where; an AI use's tool; a note's first two lines", () => {
  const video = {
    type: "ONLINE_VIDEO", title: "Membranes Experiment Video", author: "KSI", publication: null, datePublished: null,
    url: "https://www.youtube.com/watch?v=1", dateAccessed: "2026-11-03", locator: null, keyInformation: null, relevance: null, reflections: null,
  } as const;
  assert.deepEqual(teacherEntryLines({ kind: "SOURCE", body: null, fields: video }),
    { title: "Membranes Experiment Video", detail: "Video online · KSI · youtube.com" });
  assert.deepEqual(teacherEntryLines({ kind: "SOURCE", body: null, fields: { ...video, type: "BOOK", url: null, author: null, publication: "Penguin" } }),
    { title: "Membranes Experiment Video", detail: "Book · Penguin" });
  assert.deepEqual(teacherEntryLines({ kind: "AI_USE", body: null, fields: {
    toolNameAndVersion: "Claude", developer: "Anthropic", dateGenerated: "2026-11-03", howUsed: "Listed experiments\nthen more", prompts: null, shareUrl: null,
  } }), { title: "Claude · Anthropic", detail: "Listed experiments" });
  assert.deepEqual(teacherEntryLines({ kind: "NOTE", body: "Looked at planning\n\nNeed equipment?", fields: null }),
    { title: "Looked at planning", detail: "Need equipment?" });
});

test("chip counts include private entries; the live region says what a filter left showing", () => {
  assert.deepEqual(kindCounts([{ kind: "NOTE" }, { kind: "SOURCE" }, { kind: "SOURCE" }]), { SOURCE: 2, NOTE: 1, AI_USE: 0 });
  assert.equal(showingWords(3, "SOURCE"), "Showing 3 sources.");
  assert.equal(showingWords(1, "AI_USE"), "Showing 1 AI use entry.");
  assert.equal(showingWords(6, "ALL"), "Showing all 6 entries.");
});
```

- [ ] **Step 2: Run them to see them fail**

Run (in `frontend/`): `node --test lib/app/student-page.test.ts lib/app/log.test.ts`
Expected: FAIL. `student-page.ts` can't be found, and `log.ts` has no exports called `kindCounts`, `showingWords` or `teacherEntryLines`.

- [ ] **Step 3: Write the helpers**

Create `frontend/lib/app/student-page.ts`:

```ts
import type { StudentCheckpoints } from "@/lib/api/schemas";

import { stageLabel } from "./progress.ts";

type State = StudentCheckpoints["stages"][number]["state"];

export type StageCounts = { signedOff: number; waiting: number; due: number; notDue: number; total: number };

/** Direction D's navy card: how many stages are in each state. */
export function stageCounts(stages: ReadonlyArray<{ state: State }>): StageCounts {
  const n = (state: State) => stages.filter((st) => st.state === state).length;
  return { signedOff: n("SIGNED_OFF"), waiting: n("READY"), due: n("DUE"), notDue: n("NOT_DUE"), total: stages.length };
}

export const signedOffWords = (c: StageCounts) => `${c.signedOff} of ${c.total} signed off`;

const STATE_WORDS: Record<State, string> = {
  SIGNED_OFF: "signed off", READY: "waiting for you", DUE: "due, not signed off", NOT_DUE: "not due yet",
};

/** R-20: a jump link's name says the stage, its checkpoint and its state, because the segment's colour can't. */
export function segmentName(st: { label: string | null; state: State; checkpoint: { text: string } }): string {
  return `${stageLabel(st)}, ${st.checkpoint.text}: ${STATE_WORDS[st.state]}`;
}

/** "TM" for Tim Mc Sweeney: the header card's square. */
export function initials(s: { firstName: string; lastName: string }): string {
  return `${s.firstName.trim().charAt(0)}${s.lastName.trim().charAt(0)}`.toUpperCase();
}
```

In `frontend/lib/app/log.ts`, change the first line to:

```ts
import type { AiUseFields, EntryKind, LogEntry, SourceFields, SourceType } from "@/lib/api/schemas";
```

and add at the end of the file:

```ts
/** The teacher's log shows this many entries until Show all (R-5). */
export const LOG_PREVIEW = 3;

/** The filter chips' words (R-6). */
export const KIND_PLURAL: Record<EntryKind, string> = { SOURCE: "Sources", NOTE: "Notes", AI_USE: "AI use" };

/** How many entries there are of each kind, private ones included (R-16). */
export function kindCounts(entries: ReadonlyArray<{ kind: EntryKind }>): Record<EntryKind, number> {
  const out: Record<EntryKind, number> = { SOURCE: 0, NOTE: 0, AI_USE: 0 };
  for (const e of entries) out[e.kind] += 1;
  return out;
}

const NOUNS: Record<EntryKind, [string, string]> = { SOURCE: ["source", "sources"], NOTE: ["note", "notes"], AI_USE: ["AI use entry", "AI use entries"] };

/** What the live region says once a filter has changed the list. */
export function showingWords(n: number, kind: EntryKind | "ALL"): string {
  if (kind === "ALL") return `Showing all ${n} ${n === 1 ? "entry" : "entries"}.`;
  return `Showing ${n} ${NOUNS[kind][n === 1 ? 0 : 1]}.`;
}

const firstLine = (s: string) => s.split("\n")[0].trim();

/** A closed row on the teacher's log: a title and one line of detail, both the student's own words. */
export function teacherEntryLines(e: { kind: EntryKind; body: string | null; fields: SourceFields | AiUseFields | null }):
  { title: string; detail: string | null } {
  if (e.kind === "SOURCE" && e.fields && "title" in e.fields) {
    const f = e.fields;
    const type = SOURCE_TYPES.find((t) => t.value === f.type)?.label ?? f.type;
    const where = isOnline(f.type) && f.url ? linkHost(f.url) : f.publication;
    return { title: f.title, detail: [type, f.author, where].filter(Boolean).join(" · ") };
  }
  if (e.kind === "AI_USE" && e.fields && "toolNameAndVersion" in e.fields) {
    return { title: `${e.fields.toolNameAndVersion} · ${e.fields.developer}`, detail: firstLine(e.fields.howUsed) };
  }
  const lines = (e.body ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  return { title: lines[0] ?? "", detail: lines[1] ?? null };
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `node --test lib/app/student-page.test.ts lib/app/log.test.ts`
Expected: PASS, every test.

- [ ] **Step 5: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add frontend/lib/app/student-page.ts frontend/lib/app/student-page.test.ts frontend/lib/app/log.ts frontend/lib/app/log.test.ts
git commit -m "Add the student page's helpers: stage counts, jump-link names, initials, and a log row's title and detail"
```

---

### Task 3: `CheckpointCell`'s `card` layout

**Files:**
- Modify: `frontend/components/app/signoff-parts.tsx`
- Modify: `frontend/components/app/signoff-parts.spec.tsx`

**Interfaces:**
- Produces: `CheckpointCell`'s `layout` prop becomes `"grid" | "one" | "card"`. In `card`:
  - A signed-off stage shows a green pill ("Signed off 3 Nov 2026") and a ghost **Revoke** button named `names.revoke`.
  - A due stage shows an amber pill ("Due, not signed off") and an outlined **Sign off** button named `names.sign`.
  - A stage not due yet shows a grey pill ("Not due yet") and the same Sign off.
  - The confirming, recent ("Signed off today", Undo) and READY branches are the existing ones.

- [ ] **Step 1: Write the failing test**

In `frontend/components/app/signoff-parts.spec.tsx`, inside `describe("CheckpointCell", …)`, after the "in a one-stage view a due cell says so in full" test, add:

```tsx
  it("on a stage card the state is a pill beside one button: Revoke when signed off, Sign off otherwise", async () => {
    const onAsk = vi.fn();
    const onSign = vi.fn();
    const { rerender } = render(<CheckpointCell {...base} layout="card" cell={cell("SIGNED_OFF")} onAsk={onAsk} onSign={onSign} />);
    expect(screen.getByText(/^Signed off/)).toHaveTextContent("Signed off 2 Oct 2026");
    await userEvent.click(screen.getByRole("button", { name: names.revoke }));
    expect(onAsk).toHaveBeenCalled();
    rerender(<CheckpointCell {...base} layout="card" cell={cell("DUE")} onAsk={onAsk} onSign={onSign} />);
    expect(screen.getByText("Due, not signed off")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: names.sign }));
    expect(onSign).toHaveBeenCalled();
    rerender(<CheckpointCell {...base} layout="card" cell={cell("NOT_DUE")} onAsk={onAsk} onSign={onSign} />);
    expect(screen.getByText("Not due yet")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run it to see it fail**

Run (in `frontend/`): `npx vitest run components/app/signoff-parts.spec.tsx`
Expected: the new test FAILS. Without a `card` branch the cell falls through to the `one` layout. There, `<strong>Signed off</strong>` and its parent span both match `/^Signed off/`, so Testing Library reports multiple elements.

- [ ] **Step 3: Add the layout**

In `frontend/components/app/signoff-parts.tsx`:

Add the icon import at the top:

```tsx
import { Check } from "lucide-react";
```

Change `layout: "grid" | "one";` in `CellProps` to:

```tsx
  layout: "grid" | "one" | "card";
```

Directly before `if (layout === "grid") {`, add:

```tsx
  // Direction D (plan student-page-redesign, R-10): a pill for the state and one button. `one` stays as it was for Progress.
  if (layout === "card") {
    const settled = cell.state === "SIGNED_OFF";
    const due = cell.state === "DUE";
    const pill = settled ? "bg-app-approved-tint text-app-signed" : due ? "bg-app-due-tint text-app-due" : "bg-app-inset text-app-grey";
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-app-small font-semibold ${pill}`}>
          {settled ? <><Check aria-hidden className="size-4" strokeWidth={3} />Signed off {date}</> : due ? "Due, not signed off" : "Not due yet"}
        </span>
        {settled ? (
          <Button type="button" variant="ghost" aria-label={names.revoke} disabled={busy !== null} onClick={onAsk} className="text-app-grey">
            {busy === "revoke" ? BUSY.revoke : "Revoke"}
          </Button>
        ) : (
          <Button type="button" variant="outline" aria-label={names.sign} disabled={busy !== null} onClick={onSign}
            className="border-app-accent text-app-accent hover:bg-app-accent-tint">
            {busy === "sign" ? BUSY.sign : "Sign off"}
          </Button>
        )}
      </div>
    );
  }
```

Update the doc comment above `CheckpointCell` to finish: "…in a one-stage view the state is words beside a separate button; on the student page's stage cards (`card`) it's a pill beside one button."

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run components/app/signoff-parts.spec.tsx`
Expected: PASS, all tests (the `grid` and `one` cases are untouched).

- [ ] **Step 5: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add frontend/components/app/signoff-parts.tsx frontend/components/app/signoff-parts.spec.tsx
git commit -m "Give CheckpointCell a card layout for the student page: a state pill beside one button"
```

---

### Task 4: The navy summary and the timeline of stage cards

**Files:**
- Create: `frontend/components/app/checkpoint-summary.tsx`
- Rewrite: `frontend/components/app/student-checkpoints.tsx`
- Modify: `frontend/components/app/request-history.tsx` (`LastAnswerLine` only)
- Modify: `frontend/components/app/student-checkpoints.spec.tsx`

**Interfaces:**
- Consumes:
  - `stageCounts`, `signedOffWords`, `segmentName` (Task 2)
  - `CheckpointCell layout="card"` (Task 3)
  - `bandHeading`, `stageKey`, `stageLabel` (`lib/app/progress.ts`)
  - `checkpointAnchor` (`lib/app/ready.ts`)
- Produces:
  - `CheckpointSummary({ data, headingId }: { data: StudentCheckpoints; headingId: string })`
  - `StudentCheckpoints({ componentId, data })`, with the same props as today
  - The section is still named by an h2 "Checkpoints", which `phase4.e2e.ts` uses.
  - The cards are an `<ol aria-label="Stages">`.
  - Each card's checkpoint text is an h3.

- [ ] **Step 1: Write the failing tests**

In `frontend/components/app/student-checkpoints.spec.tsx`, after the first test ("says how far behind…"), add:

```tsx
  it("sums the student up on the navy card, with a link to each stage's card", () => {
    render(<StudentCheckpoints componentId="k1" data={data} />);
    expect(screen.getByText("1 checkpoint behind · 1 of 3 signed off")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Jump to a stage" });
    expect(within(nav).getAllByRole("link")).toHaveLength(3);
    expect(within(nav).getByRole("link", { name: `Stage 3, ${READY_TEXT}: waiting for you` })).toHaveAttribute("href", "#checkpoint-cp1");
  });

  it("gives every stage its own card in an ordered list, and opens only the waiting one", () => {
    const { container } = render(<StudentCheckpoints componentId="k1" data={data} />);
    expect(within(screen.getByRole("list", { name: "Stages" })).getAllByRole("listitem")).toHaveLength(3);
    const waiting = container.querySelector("#checkpoint-cp1") as HTMLElement;
    expect(within(waiting).getByText("Waiting for you")).toBeInTheDocument();
    expect(within(waiting).getByRole("heading", { level: 3, name: READY_TEXT })).toBeInTheDocument();
    const due = container.querySelector("#checkpoint-c2") as HTMLElement;
    expect(within(due).getByText("Due, not signed off")).toBeInTheDocument();
    expect(within(due).queryByText("Waiting for you")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run components/app/student-checkpoints.spec.tsx`
Expected: the two new tests FAIL (no "Jump to a stage" navigation; no "Stages" list). The other tests pass.

- [ ] **Step 3: Write the summary card**

Create `frontend/components/app/checkpoint-summary.tsx`:

```tsx
import type { StudentCheckpoints } from "@/lib/api/schemas";
import { bandHeading, stageKey } from "@/lib/app/progress";
import { checkpointAnchor } from "@/lib/app/ready";
import { segmentName, signedOffWords, stageCounts } from "@/lib/app/student-page";

import { eyebrow } from "./styles";

type State = StudentCheckpoints["stages"][number]["state"];

/** R-9: waiting and due are both amber (both need the teacher); the counts and the link names tell them apart. */
const SEGMENT: Record<State, string> = {
  SIGNED_OFF: "bg-app-approved-on-accent",
  READY: "bg-app-attention-on-accent",
  DUE: "bg-app-attention-on-accent",
  NOT_DUE: "bg-app-accent-track",
};

/**
 * Direction D: the navy card, the stage drawer's checkpoint card brought to the student page. Where this student
 * stands in one line, then one segment per stage that jumps to its card (R-20), then the counts in words.
 */
export function CheckpointSummary({ data, headingId }: { data: StudentCheckpoints; headingId: string }) {
  const counts = stageCounts(data.stages);
  const { numeral, label } = bandHeading(data.behindBy);
  return (
    <div className="rounded-app-card bg-app-accent p-[18px] text-app-on-accent">
      <h2 id={headingId} className={`${eyebrow} text-app-on-accent-muted`}>Checkpoints</h2>
      <p className="mt-1.5 font-heading text-[22px] leading-[1.25] font-bold tracking-[-.01em] text-balance">
        {numeral && <span className="tabular-nums">{`${numeral} `}</span>}<span>{label}</span>{` · ${signedOffWords(counts)}`}
      </p>
      <nav aria-label="Jump to a stage" className="mt-4">
        <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${data.stages.length}, minmax(0, 1fr))` }}>
          {data.stages.map((st) => (
            <li key={st.stageId}>
              <a href={`#${checkpointAnchor(st.checkpoint.id)}`} aria-label={segmentName(st)}
                className="flex min-h-11 flex-col gap-1.5 rounded-app-inner pt-1 font-mono text-app-label font-bold text-app-on-accent-muted touch-manipulation hover:text-app-on-accent focus-visible:outline-app-on-accent">
                <span aria-hidden className={`h-2 rounded-full ${SEGMENT[st.state]}`} />
                <span aria-hidden>{stageKey(st)}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <p className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-app-help text-app-on-accent-muted">
        <span><b className="font-bold text-app-approved-on-accent">{counts.signedOff}</b> signed off</span>
        {counts.waiting > 0 && <span><b className="font-bold text-app-on-accent">{counts.waiting}</b> waiting for you</span>}
        {counts.due > 0 && <span><b className="font-bold text-app-on-accent">{counts.due}</b> due, not signed off</span>}
        {counts.notDue > 0 && <span><b className="font-bold text-app-on-accent">{counts.notDue}</b> not due yet</span>}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite the checkpoints section as a timeline of cards**

Replace the whole of `frontend/components/app/student-checkpoints.tsx` with the code below. `StageRow`'s state, hooks and handlers are today's, line for line. What changes is the markup: the rail, the card, the waiting strip, the h3, the `card` layout, and no row grounds.

```tsx
"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import type { StudentCheckpoints as Data } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { CHECKPOINT_STATE, checkpointAnchor, reviewName } from "@/lib/app/ready";
import { failSentence, fullName, revokeName, revokeQuestion, signName, stageKey, stageLabel, undoName } from "@/lib/app/progress";

import { CheckpointSummary } from "./checkpoint-summary";
import { LastAnswerLine } from "./request-history";
import { RequestReview } from "./request-review";
import { AnsweredStrip, RequestDrawer } from "./request-drawer";
import { CheckpointCell, RevokeStrip, SignoffAlert } from "./signoff-parts";
import { card } from "./styles";
import { useAnswer, withRecent } from "./use-answer";
import { targetKey, useSignoffs } from "./use-signoffs";

type Stage = Data["stages"][number];

/** R-21: the stage's circle on the rail. Decorative; the card says the same in words. */
const RAIL: Record<Stage["state"], string> = {
  SIGNED_OFF: "bg-app-signed text-app-on-accent",
  READY: "bg-app-attention text-app-on-accent ring-6 ring-app-attention-tint",
  DUE: "border-2 border-app-due bg-app-surface text-app-due",
  NOT_DUE: "border-[1.5px] border-app-field-border bg-app-surface text-app-grey",
};

/** Direction D: where this student stands, then one card per stage on a timeline, above the log that is the evidence. Same actions as the grid. */
export function StudentCheckpoints({ componentId, data }: { componentId: string; data: Data }) {
  const s = useSignoffs(componentId);
  return (
    <section aria-labelledby="checkpoints-heading" className="mt-3 flex flex-col gap-4">
      <CheckpointSummary data={data} headingId="checkpoints-heading" />
      <ol aria-label="Stages" className="flex flex-col">
        {data.stages.map((st, i) => (
          <StageRow key={st.stageId} componentId={componentId} data={data} st={st} s={s} last={i === data.stages.length - 1} />
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">{s.announcement}</p>
    </section>
  );
}

/** One stage's card. It owns the draft note and the drawer, because they belong to this checkpoint's request alone. */
function StageRow({ componentId, data, st, s, last }:
  { componentId: string; data: Data; st: Stage; s: ReturnType<typeof useSignoffs>; last: boolean }) {
  const name = fullName(data);
  const stage = stageLabel(st);
  const t = { student: data, checkpoint: st.checkpoint };
  const key = targetKey(t);
  const failed = s.failed.get(key);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const a = useAnswer(componentId, data.studentId, st.checkpoint.id, st.request, (outcome) => s.noteAnswered(t, outcome));

  const answers = withRecent(st.answers, a.recent, data.today);
  const open = st.request !== null && a.recent === null;
  const undo = async () => { if (await s.undo(t)) a.clearRecent(); };
  const undoLabel = undoName(st.checkpoint.text, name);
  const again = st.answers.length > 0;
  const { word: stateWord, className: stateClass } = CHECKPOINT_STATE[st.state];
  const common = { firstName: data.firstName, name, text: st.checkpoint.text, stage };
  const answerProps = {
    note: a.note, onNote: a.setNote, busy: a.busy, error: a.error,
    onAnswer: (o: "ACCEPTED" | "NOT_YET") => st.request && void a.answer(o, st.request),
    onRetry: () => a.error && st.request && void a.answer(a.error.outcome, st.request),
  };
  const due = st.dueDate ? `due ${formatCalendarDate(st.dueDate)}` : "no date set";

  return (
    <li id={checkpointAnchor(st.checkpoint.id)} className="grid scroll-mt-20 grid-cols-[32px_minmax(0,1fr)] gap-x-2.5 pb-3 last:pb-0 lg:grid-cols-[40px_minmax(0,1fr)] lg:gap-x-3.5">
      <div aria-hidden className="relative flex justify-center">
        <span className={`relative z-[1] mt-3.5 flex size-8 items-center justify-center rounded-full font-mono text-app-help font-bold lg:size-9 ${RAIL[st.state]}`}>
          {st.state === "SIGNED_OFF" ? <Check className="size-4" strokeWidth={3} /> : stageKey(st)}
        </span>
        {!last && <span className={`absolute top-[50px] -bottom-3 left-1/2 w-0.5 -translate-x-1/2 ${st.state === "SIGNED_OFF" ? "bg-app-signed-line" : "bg-app-field-border"}`} />}
      </div>
      <div className={`min-w-0 overflow-hidden ${open ? "rounded-app-card border border-app-attention-line bg-app-surface" : card}`}>
        {open && <p className="bg-app-attention-tint px-4 py-2.5 text-app-small font-bold text-app-attention lg:px-[18px]">Waiting for you</p>}
        <div className="flex flex-col gap-3 p-4 lg:px-[18px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0 flex-[1_1_320px]">
              <p className="text-app-help text-app-muted">{`${stage} · ${st.name} · ${due}`}</p>
              <h3 className={open
                ? "mt-0.5 font-heading text-[20px] leading-[1.3] font-bold tracking-[-.01em] text-balance text-app-ink"
                : "mt-0.5 text-app-base leading-[1.35] font-semibold text-app-ink"}>{st.checkpoint.text}</h3>
            </div>
            {!open && (
              <CheckpointCell layout="card" cell={{ checkpointId: st.checkpoint.id, state: st.state, signedOffOn: st.signedOffOn }}
                names={{ sign: signName(st.checkpoint.text, name), undo: undoLabel, revoke: revokeName(st.checkpoint.text, name), review: reviewName(st.checkpoint.text, name) }}
                busy={s.busy.get(key) ?? null} recent={s.recent.has(key)} confirming={s.confirming === key}
                onSign={() => s.signOff(t)} onUndo={() => void undo()} onAsk={() => s.askRevoke(t)} />
            )}
          </div>
          {st.history.map((h, i) => (
            <p key={i} className="text-app-small text-app-grey">
              {`Signed off on ${formatCalendarDate(h.signedOffOn)}, revoked on ${formatCalendarDate(h.revokedOn)} by ${h.revokedBy}.`}
            </p>
          ))}
          {open && st.request && !drawerOpen && (
            <RequestReview {...common} {...answerProps} checkpointId={st.checkpoint.id} request={st.request} again={again} today={data.today} link={data.documentLink} />
          )}
          {a.recent?.outcome === "NOT_YET" && (
            <p className="text-app-meta text-app-copy">You answered <strong>Not yet</strong> today. <span data-private>{data.firstName}</span> sees your note and can ask again.</p>
          )}
          {(answers.length > 0 || st.request) && (
            <LastAnswerLine firstName={data.firstName} answers={answers} action={
              answers.length > 0 && (
                <RequestDrawer open={drawerOpen} onOpenChange={setDrawerOpen} {...common} {...answerProps} checkpointId={st.checkpoint.id}
                  stateWord={stateWord} stateClass={stateClass} answers={answers}
                  request={open ? st.request : null} again={again} today={data.today} link={data.documentLink}
                  answered={a.recent && <AnsweredStrip outcome={a.recent.outcome} undoLabel={undoLabel} busy={s.busy.has(key)} onUndo={() => void undo()} />} />
              )
            } />
          )}
          {s.confirming === key && (
            <RevokeStrip question={revokeQuestion(st.checkpoint.text, name, "student")} text={st.checkpoint.text} name={name}
              busy={s.busy.has(key)} onRevoke={() => s.revoke(t)} onKeep={s.keep} />
          )}
          {failed && <SignoffAlert message={failSentence(failed.action, st.checkpoint.text, name)} name={name} onRetry={() => s.retry(key)} />}
        </div>
      </div>
    </li>
  );
}
```

- [ ] **Step 5: Restyle `LastAnswerLine` for the cards (R-12)**

In `frontend/components/app/request-history.tsx`, replace the body of `LastAnswerLine` with the code below. The words are unchanged.

```tsx
export function LastAnswerLine({ firstName, answers, action }: { firstName: string; answers: ReadonlyArray<Answer>; action?: ReactNode }) {
  const last = answers[0];
  // Direction D (R-12): the card's gap replaces the old top rule; a note from the teacher sits on the cream note colour.
  const chip = last?.teacherNote ? "rounded-app-inner border border-app-note-line bg-app-note-ground px-3 py-1.5 text-app-ink" : "flex-1 text-app-copy";
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className={`min-w-0 text-app-small leading-[1.45] ${chip}`}>
        {last
          ? <>{`${OUTCOME[last.outcome]} on ${formatCalendarDate(last.answeredOn)}. `}{last.teacherNote ? <span data-private>{`Your note: “${last.teacherNote}”`}</span> : "No note."}</>
          : <>No earlier answers. This is <span data-private>{firstName}</span>&rsquo;s first request for this checkpoint.</>}
      </p>
      {action}
    </div>
  );
}
```

Change its doc comment to: "Pack D-10, restyled for direction D: the newest answer, with the Full history button beside it."

- [ ] **Step 6: Drop the token the old row ground used**

`--app-due-row` was only the ground of a due row on this page (pack D-7), and Step 4 removed that ground. In `frontend/app/globals.css`, delete the line `--color-app-due-row: var(--app-due-row);` (line 113) and the line `--app-due-row: #FCF8F5; …` (line 344). Then run `grep -rn "due-row" frontend --include=*.ts --include=*.tsx --include=*.css`; expect no matches. The D-7 design notes keep mentioning it, as the record of that pack.

- [ ] **Step 7: Run the specs to see them pass**

Run: `npx vitest run components/app/student-checkpoints.spec.tsx components/app/request-history.spec.tsx components/app/signoff-parts.spec.tsx`
Expected: PASS, all tests. The older `student-checkpoints` tests still find their names and copy: "checkpoint behind" is its own span, every button name is unchanged, and the anchors are on the `<li>`.

- [ ] **Step 8: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add frontend/components/app/checkpoint-summary.tsx frontend/components/app/student-checkpoints.tsx frontend/components/app/student-checkpoints.spec.tsx frontend/components/app/request-history.tsx frontend/app/globals.css
git commit -m "Show the student's checkpoints as a navy summary with jump links and one card per stage on a timeline"
```

---

### Task 5: The header card, and the page

**Files:**
- Create: `frontend/components/app/student-header.tsx`, `frontend/components/app/student-header.spec.tsx`
- Modify: `frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx`

**Interfaces:**
- Consumes: `initials` (Task 2), `WorkLinkBlock` (`components/app/work-link.tsx`), `lastEntryWords` (`lib/app/progress.ts`)
- Produces: `StudentHeader({ student, className, activity, link }: { student: { firstName: string; lastName: string }; className: string; activity: string | null; link: DocumentLink | null })`, which renders the page's only h1.

- [ ] **Step 1: Write the failing test**

Create `frontend/components/app/student-header.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudentHeader } from "./student-header";

const student = { firstName: "Tim", lastName: "Mc Sweeney" };

describe("StudentHeader", () => {
  it("names the student as the page's heading, says the class and when they last wrote, and links their work", () => {
    render(<StudentHeader student={student} className="6th Year Biology" activity="Last entry 7 days ago"
      link={{ url: "https://drive.google.com/x", setOn: "2026-10-01" }} />);
    expect(screen.getByRole("heading", { level: 1, name: "Tim Mc Sweeney" })).toBeInTheDocument();
    expect(screen.getByText("6th Year Biology · Last entry 7 days ago")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Tim Mc Sweeney's work (opens in a new tab)" })).toHaveAttribute("href", "https://drive.google.com/x");
  });

  it("leaves the work link out when there isn't one", () => {
    render(<StudentHeader student={student} className="6th Year Biology" activity={null} link={null} />);
    expect(screen.getByText("6th Year Biology")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/app/student-header.spec.tsx`
Expected: FAIL: `./student-header` can't be resolved.

- [ ] **Step 3: Write the header card**

Create `frontend/components/app/student-header.tsx`:

```tsx
import type { DocumentLink } from "@/lib/api/schemas";
import { initials } from "@/lib/app/student-page";

import { card } from "./styles";
import { WorkLinkBlock } from "./work-link";

/** Direction D: who the page is about. Initials, name (the page's h1), class, when they last wrote, and their work (R-18). */
export function StudentHeader({ student, className, activity, link }:
  { student: { firstName: string; lastName: string }; className: string; activity: string | null; link: DocumentLink | null }) {
  const name = `${student.firstName} ${student.lastName}`;
  return (
    <div className={`${card} mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-3 p-4 lg:px-[18px]`}>
      <span aria-hidden className="flex size-12 flex-none items-center justify-center rounded-app-card bg-app-accent font-heading text-[20px] font-bold text-app-on-accent">
        {initials(student)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-app-help text-app-muted">{activity ? `${className} · ${activity}` : className}</p>
        <h1 className="font-heading text-[24px] leading-[1.2] font-bold tracking-[-.015em] text-balance text-app-ink lg:text-[26px]">{name}</h1>
      </div>
      {link && <WorkLinkBlock url={link.url} name={name} firstName={student.firstName} className="w-full sm:w-auto" />}
    </div>
  );
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run components/app/student-header.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Use it on the page**

In `frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx`:

Replace the import `import { WorkLink } from "@/components/app/work-link";` with:

```tsx
import { StudentHeader } from "@/components/app/student-header";
```

Replace the whole `{log.ok ? ( <> … </> ) : ( … )}` block at the end with:

```tsx
      {log.ok ? (
        <>
          <StudentHeader student={log.data} className={cls.name}
            activity={checkpoints.ok ? lastEntryWords(checkpoints.data.daysSinceLastLogActivity) : null}
            link={checkpoints.ok ? checkpoints.data.documentLink : null} />
          {checkpoints.ok
            ? <StudentCheckpoints componentId={componentId} data={checkpoints.data} />
            : <div className="mt-6"><ErrorPanel error={checkpoints.error} /></div>}
          <TeacherLog log={log.data} />
        </>
      ) : (
        <div className="mt-6"><ErrorPanel error={log.error} /></div>
      )}
```

The intro sentence ("You read the entries they share…") and the bare host link go; R-19 moves the sentence to the log in Task 6. `TeacherLog` still accepts `activity` until Task 6; the page simply stops passing it.

- [ ] **Step 6: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add frontend/components/app/student-header.tsx frontend/components/app/student-header.spec.tsx "frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx"
git commit -m "Open the student page with a header card: initials, name, class, last entry and the work link"
```

---

### Task 6: The log as a footer

**Files:**
- Create (shadcn): `frontend/components/ui/toggle-group.tsx`
- Rewrite: `frontend/components/app/teacher-log.tsx`
- Modify: `frontend/components/app/teacher-log.spec.tsx`

**Interfaces:**
- Consumes: `kindCounts`, `KIND_PLURAL`, `LOG_PREVIEW`, `showingWords`, `teacherEntryLines` (Task 2); `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` (`components/ui/collapsible.tsx`)
- Produces:
  - `TeacherLog({ log }: { log: TeacherStudentLog })`. The `activity` prop is gone.
  - `ToggleGroup` and `ToggleGroupItem` in `components/ui/toggle-group.tsx`, for Progress or anything else to reuse.

- [ ] **Step 1: Write the failing tests**

In `frontend/components/app/teacher-log.spec.tsx`:

Change the imports to:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
```

Replace the test "shows a visible entry, marks it edited, and keeps its history one tap away" with:

```tsx
  it("opens a visible entry in place: what they wrote, that it was edited, and its history one tap away", async () => {
    render(<TeacherLog log={log} />);
    const row = screen.getByRole("button", { name: /Pilot run went well/ });
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/^Edited/)).not.toBeInTheDocument();
    await userEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Edited · 2 revisions, last on 2 Mar 2027")).toBeInTheDocument();
    expect(screen.getByText("History (2 revisions)")).toBeInTheDocument();
  });
```

Delete the test "puts the activity line before the entry count". The last-entry line is in the header now and is tested there.

Add, before "says when the student hasn't written anything":

```tsx
  it("shows the latest three until Show all, then filters by kind and says what's showing", async () => {
    const book = { visibility: "VISIBLE" as const, id: "e0", kind: "SOURCE" as const, createdAt: "2027-02-28T10:00:00Z", editedAt: null, revisionCount: 1, body: null,
      fields: { type: "BOOK" as const, title: "Campbell Biology", author: "Urry", publication: "Pearson", datePublished: "2020", url: null,
        dateAccessed: "2027-02-28", locator: null, keyInformation: null, relevance: null, reflections: null },
      history: [] };
    render(<TeacherLog log={{ ...log, entries: [...log.entries, book] }} />);
    const list = screen.getByRole("list", { name: "Log entries" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("Campbell Biology")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show all 4 entries" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    await userEvent.click(screen.getByRole("button", { name: "Sources 1" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Sources 1" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Showing 1 source.")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run components/app/teacher-log.spec.tsx`
Expected: the two new tests FAIL. There's no button named "Pilot run went well" (the entry is printed in full) and no "Show all 4 entries".

- [ ] **Step 3: Add the toggle group**

Run (in `frontend/`): `npx shadcn@latest add toggle-group`

The CLI adds `components/ui/toggle.tsx` and `components/ui/toggle-group.tsx`, and may add an npm `cn` package.
- Delete `components/ui/toggle.tsx`. The group below doesn't use its variants.
- Undo any `cn` change to `package.json` and `package-lock.json` (`git checkout -- package.json package-lock.json` if they changed).

Then replace `components/ui/toggle-group.tsx` with this restyle to the app's tokens:

```tsx
"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";

import { cn } from "@/lib/utils";

/** shadcn's toggle group (base-nova, Base UI), restyled as the app's chips: a row of pills, the pressed one navy. Arrow keys move between them. */
function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return <ToggleGroupPrimitive data-slot="toggle-group" className={cn("flex flex-wrap items-center gap-2", className)} {...props} />;
}

function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-app-field-border bg-app-surface px-3.5 font-semibold text-app-copy touch-manipulation hover:bg-app-inset data-[pressed]:border-app-accent data-[pressed]:bg-app-accent data-[pressed]:text-app-on-accent",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
```

The font size goes on at the call site (`text-app-small`), never through this `cn()`, because a `--text-app-*` size and a `text-app-*` colour in one `cn()` call get merged wrongly (UI-STANDARDS §2).

If `tsc` says `ToggleGroupPrimitive.Props` needs a type argument (Base UI 1.7 makes it generic over the value), write `ToggleGroupPrimitive.Props<string>`.

- [ ] **Step 4: Rewrite the log**

Replace the whole of `frontend/components/app/teacher-log.tsx` with:

```tsx
"use client";

import { ChevronDown, EyeOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { EntryKind, TeacherStudentLog } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate, KIND_PLURAL, kindCounts, LOG_PREVIEW, showingWords, teacherEntryLines } from "@/lib/app/log";

import { LogHistory, RevisionContent } from "./log-history";
import { LogKindChip } from "./log-kind-chip";
import { card, sectionTitle } from "./styles";

type Entry = TeacherStudentLog["entries"][number];
type Filter = EntryKind | "ALL";

const KINDS: EntryKind[] = ["SOURCE", "NOTE", "AI_USE"];
const day = (iso: string) => formatCalendarDate(dublinDate(iso));
// R-14: date and kind are their own columns on a laptop; on a phone they share a line above the title (`lg:contents`).
const ROW = "grid grid-cols-[minmax(0,1fr)_20px] items-center gap-x-4 gap-y-1.5 px-4 py-3 lg:grid-cols-[104px_84px_minmax(0,1fr)_20px] lg:px-[18px]";
const DATE = "font-mono text-app-help text-app-grey";

/**
 * Direction D: the log as the evidence under the checkpoints. The latest three (R-5), then Show all with filter chips
 * (R-6); every entry opens in place (R-7). FR-24d: a private entry shows its kind and dates, never its content, which
 * the API doesn't send. Pack D-6 words it as the student's choice: "Made private by Aoife", "Private entry".
 */
export function TeacherLog({ log }: { log: TeacherStudentLog }) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");

  if (log.entries.length === 0) {
    return (
      <div className={`${card} mt-8 flex flex-col gap-2 p-5`}>
        <h2 className={sectionTitle}>{`${log.firstName} hasn't written any log entries yet.`}</h2>
        <p className="text-app-base text-app-copy">
          {`Entries appear here as they're saved. You'll read the ones ${log.firstName} shares, and see only the kind and date of any they keep private.`}
        </p>
      </div>
    );
  }

  const total = log.entries.length;
  const shared = log.entries.filter((e) => e.visibility === "VISIBLE").length;
  const counts = kindCounts(log.entries);
  const shown = expanded ? log.entries.filter((e) => filter === "ALL" || e.kind === filter) : log.entries.slice(0, LOG_PREVIEW);
  const toggle = () => { setExpanded((open) => !open); setFilter("ALL"); }; // R-15

  return (
    <section aria-labelledby="log-heading" className={`${card} mt-8 overflow-hidden`}>
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3 lg:px-[18px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="log-heading" className={sectionTitle}>{`${log.firstName}'s log`}</h2>
          <p className="text-app-small text-app-grey">{`${total} ${total === 1 ? "entry" : "entries"}. ${log.firstName} has shared ${shared} with you.`}</p>
        </div>
        {expanded && (
          <ToggleGroup aria-label="Show entries" value={[filter]} onValueChange={(v) => { if (v[0]) setFilter(v[0] as Filter); }}>
            <ToggleGroupItem value="ALL" className="text-app-small">All <b className="font-mono text-app-label">{total}</b></ToggleGroupItem>
            {KINDS.filter((k) => counts[k] > 0).map((k) => (
              <ToggleGroupItem key={k} value={k} className="text-app-small">{KIND_PLURAL[k]} <b className="font-mono text-app-label">{counts[k]}</b></ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>
      <ul id="log-entries" aria-label="Log entries" className="divide-y divide-app-line border-t border-app-line">
        {shown.map((e) => <EntryRow key={e.id} entry={e} firstName={log.firstName} />)}
      </ul>
      <p aria-live="polite" className="sr-only">{expanded ? showingWords(shown.length, filter) : ""}</p>
      {total > LOG_PREVIEW && (
        <div className="border-t border-app-line px-4 py-3 lg:px-[18px]">
          <Button type="button" variant="outline" aria-expanded={expanded} aria-controls="log-entries" onClick={toggle} className="w-full">
            {expanded ? `Show the latest ${LOG_PREVIEW}` : `Show all ${total} entries`}
          </Button>
        </div>
      )}
      <p className="flex items-center gap-2 border-t border-app-line px-4 py-3 text-app-help text-app-muted lg:px-[18px]">
        <EyeOff aria-hidden className="size-4 flex-none" />
        {`Entries ${log.firstName} keeps private show only their kind, the dates and how many times they were edited.`}
      </p>
    </section>
  );
}

function EntryRow({ entry: e, firstName }: { entry: Entry; firstName: string }) {
  const when = (
    <span className="flex items-center gap-3 lg:contents">
      <span className={DATE}>{day(e.createdAt)}</span>
      <span><LogKindChip kind={e.kind} /></span>
    </span>
  );

  if (e.visibility === "HIDDEN") {
    return (
      <li className={`${ROW} bg-app-private-ground`}>
        {when}
        <p className="col-start-1 flex items-center gap-2 text-app-small text-app-ink lg:col-start-3 lg:row-start-1">
          <EyeOff aria-hidden className="size-4 flex-none" />
          <strong>{e.hiddenAt ? `Made private by ${firstName} on ${day(e.hiddenAt)}` : "Private entry"}</strong>
        </p>
      </li>
    );
  }

  const { title, detail } = teacherEntryLines(e);
  return (
    <li>
      <Collapsible>
        <CollapsibleTrigger className={`${ROW} group w-full text-left touch-manipulation hover:bg-app-inset`}>
          {when}
          <span className="col-start-1 flex min-w-0 flex-col lg:col-start-3 lg:row-start-1">
            <span className="truncate text-app-base font-semibold text-app-ink">{title}</span>
            {detail && <span className="truncate text-app-help text-app-muted">{detail}</span>}
          </span>
          <ChevronDown aria-hidden className="col-start-2 row-span-2 row-start-1 size-5 text-app-muted transition-transform group-data-[panel-open]:rotate-180 lg:col-start-4 lg:row-span-1" />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-3 px-4 pb-4 lg:pr-[18px] lg:pl-[238px]">
          <RevisionContent body={e.body} fields={e.fields} />
          {e.editedAt && <p className="text-app-small text-app-grey">{`Edited · ${e.revisionCount} revisions, last on ${day(e.editedAt)}`}</p>}
          {e.revisionCount > 1 && (
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-app-small font-semibold text-app-accent">{`History (${e.revisionCount} revisions)`}</summary>
              <div className="mt-1"><LogHistory history={e.history} /></div>
            </details>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
```

`lg:pl-[238px]` lines the opened entry up under the title: 18px padding + 104px date + 16px gap + 84px kind + 16px gap.

- [ ] **Step 5: Run the specs to see them pass**

Run: `npx vitest run components/app/teacher-log.spec.tsx`
Expected: PASS, all tests. The private-entry tests are unchanged: a private row has no `Collapsible`, so it has no `<details>` and nothing to open.

- [ ] **Step 6: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add frontend/components/ui/toggle-group.tsx frontend/components/app/teacher-log.tsx frontend/components/app/teacher-log.spec.tsx
git commit -m "Make the student's log a footer: the latest three, Show all with filter chips, and entries that open in place"
```

---

### Task 7: The journey, the docs, the checklist and the hand test

**Files:**
- Modify: `frontend/e2e/phase3.e2e.ts`
- Modify: `docs/ARCHITECTURE.md`, `docs/BACKLOG.md`, `docs/HANDOFF.md`, `docs/design/pilot/student-page-redesign/NOTES.md`

- [ ] **Step 1: Open the source row in the journey**

In `frontend/e2e/phase3.e2e.ts`, in "the teacher sees the hidden note exists but not its text, and the edited source's history", replace:

```ts
  const source = rows.filter({ hasText: "Titration technique demo (RTÉ)" });
  await expect(source).toContainText("Edited");
```

with:

```ts
  const source = rows.filter({ hasText: "Titration technique demo (RTÉ)" });
  await source.getByRole("button", { name: /Titration technique demo/ }).click(); // rows open in place (direction D)
  await expect(source).toContainText("Edited");
```

Aoife has three entries, so all three show without Show all, and `rows` still counts 3.

- [ ] **Step 2: Run the journey**

Run: `make e2e`
Expected: green on both projects (laptop and phone).
- `phase4` still finds the h2 "Checkpoints" and the revoked line.
- `ready-for-signoff` still lands on `#checkpoint-…` and finds Accept, Not yet and "Full history (1 answer)" by their unchanged names.

If `expectAccessible` reports anything, fix the cause, not the test. Likely spots: the jump links' focus ring on navy, and heading order (h1 → h2 Checkpoints → h3 cards → h2 log).

- [ ] **Step 3: Keep ARCHITECTURE true**

In `docs/ARCHITECTURE.md`:

- In "**The log pages**" (line 143), replace "The teacher reads a student's log at `/teach/classes/[id]/students/[studentId]` (`TeacherLog`), which loads the class first and shows a "No component yet" notice if none is set up." with:

  "The teacher reads a student's log at `/teach/classes/[id]/students/[studentId]` (`TeacherLog`), which loads the class first and shows a "No component yet" notice if none is set up. Since direction D (plan student-page-redesign) the page opens with `StudentHeader` (the h1), then `StudentCheckpoints`, then `TeacherLog` as a footer. The log shows the latest three entries (`LOG_PREVIEW`), each a one-line shadcn `Collapsible` that opens in place (`teacherEntryLines` writes the closed row). Show all expands the list and adds filter chips (shadcn `ToggleGroup`, `aria-pressed`), and a polite live region says what a filter left showing."
- In "**The Progress page**" (line 145), replace "the student's page shows the same controls through `StudentCheckpoints` above the log" with:

  "the student's page shows the same controls through `StudentCheckpoints` above the log: a navy `CheckpointSummary` (band line, one jump link per stage, counts), then an `<ol>` of stage cards on a decorative rail, using `CheckpointCell`'s `card` layout (a pill and one button; `one` stays for Progress until its own redesign)"
- In "**Ready for sign-off (teacher side)**" (line 147), after "each checkpoint is a `StageRow` in `student-checkpoints.tsx`", add: "(a card on the timeline; while its request is open it has an amber "Waiting for you" strip and no cell)".

- [ ] **Step 4: Record where the build differs from the mockup**

At the end of `docs/design/pilot/student-page-redesign/NOTES.md`, add:

```markdown
## Where the build differs from the mockup

- The page ground stays `--app-ground`, not `--app-tray` (plan R-8).
- A due stage, which the mockup doesn't show, has an amber-outlined circle, a "Due, not signed off" pill and Sign off (R-9).
- The history button keeps its name, "Full history (1 answer)", and sits on the last-answer line (R-11).
- The waiting card's strip says only "Waiting for you" (R-13).
- Log rows keep a date each, with no day headings (R-14).
- Signed-off cards keep the normal border (R-17).
- The two new values are tokens: `--app-attention-line` and `--app-signed-line`.
```

- [ ] **Step 5: Walk the UI checklist**

Open `docs/design/UI-CHECKLIST.md` and go through it for this page at 375px and 1280px. The things most likely to need a look:
- focus is visible on the jump links (navy ground), the log rows and the chips
- 44px targets: jump links, Revoke, Sign off, rows, chips, Show all
- no sideways scroll at 375px
- the waiting card's answer form fits on a phone; the first mockup render clipped there
- reduced motion: the chevron's rotation

Fix what fails, and note what you checked in the report.

- [ ] **Step 6: Tim's hand test**

Write these into the report for Tim to run on a laptop and a phone:

1. On Progress, click Review for a waiting student. The page lands on that stage's card, with the answer form in view.
2. Without opening anything, read which stages are signed off, waiting, due or not due. Revoke one (then Keep sign-off), open Full history, and Sign off a stage that isn't due.
3. Click a segment on the navy bar. The page jumps to that stage's card.
4. On a student with more than three entries: the log shows three. Click Show all, then Sources: only sources show. Open one: the whole entry shows.
5. On a phone: nothing is clipped, and the Accept button fits.

What comes up goes into "From Tim's testing" in `docs/BACKLOG.md`.

- [ ] **Step 7: Backlog and handoff**

In `docs/BACKLOG.md`, change the `student-page-redesign` row's status to: "built on `pilot/student-page-redesign`, not merged (<date>). Still to do: Tim's hand test, `/self-review` in a fresh session, `docs/changes/student-page-redesign.md`, and the PR into `pilotMain`. Then the Progress redesign can build on its tokens and the `card` layout."

In `docs/HANDOFF.md`, say:
- where this stopped
- R-8 to R-21, for Tim to confirm
- anything built differently from this plan

- [ ] **Step 8: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add frontend/e2e/phase3.e2e.ts docs/ARCHITECTURE.md docs/BACKLOG.md docs/HANDOFF.md docs/design/pilot/student-page-redesign/NOTES.md
git commit -m "Record the student page redesign in the journey, the architecture notes, the backlog and the handoff"
```

---

## Not in this plan

- The Progress tab's redesign (mockups only, in another session; it builds after this merges).
- Switching the app's page ground to `--app-tray` (`app-polish`).
- Linking a log entry to a stage (the API has no stage on entries).
- Anything students see.
- The class's Students tab.
- `docs/changes/student-page-redesign.md`: written after `/self-review`, with `write-changes`.
