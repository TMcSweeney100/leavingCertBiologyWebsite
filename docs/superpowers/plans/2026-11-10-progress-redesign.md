# Progress redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rebuild the teacher's Progress tab (`/teach/classes/[id]/progress`) to direction A, one stage at a time. From the top:
- the waiting requests, the main job
- stage tabs, opening on the latest stage that's due
- that stage's navy card
- **Still to sign off · N**, one Sign off per student, then a folded **Signed off · N**
- **All** as a quiet grid, and as a read-only list of stage dots on a phone

The student page gets a **Next request** link so a run of requests can be answered without coming back.

**Architecture:** frontend only: no API, schema or backend change. The student page gets the class's queue from the `GET /components/{id}/progress` it doesn't load yet. Eleven tasks on one branch. The old page keeps working, and `make verify` stays green, until Task 9 swaps it over:
- Task 0: the branch and the planning docs.
- Task 1: pure helpers in `lib/app/progress.ts` and `lib/app/ready.ts`.
- Task 2: `CountsBar`, the navy card's bar, pulled out of the stage sheet so Progress can share it.
- Task 3: `WorkIcon`, the work link as an icon.
- Task 4: `CheckpointCell`: quiet `grid` cells and a new `row` layout.
- Task 5: `WaitingQueue` restyled.
- Task 6: `StageTabs`, the new stage tabs.
- Task 7: the stage view (`progress-stage.tsx`).
- Task 8: the All view (`progress-all.tsx`).
- Task 9: `ProgressGrid` reassembled, the page and the tab titles; the old picker, the `one` layout, `missingText` and `pickName` removed.
- Task 10: Next request on the student page.
- Task 11: the journeys, the docs, the checklist and the hand test.

**Tech Stack:** Next.js 15.3.9, React 19, Base UI through shadcn `base-nova` (`Collapsible`), Tailwind v4 with `--app-*` tokens, lucide-react icons. Tests: `node --test`, Vitest with Testing Library, and Playwright.

**Intent:** `docs/intent/progress-redesign.md` (confirmed 10 Nov 2026).

**Design:** `docs/design/pilot/progress-redesign/`. Read `NOTES.md` first, then open the four `a-*.html` frames in a browser; each has a PNG beside it. `b-quiet-grid.html` is reference only. Where this plan and the mockups disagree, this plan wins; P-8 to P-21 say where and why.

**Branch:** `pilot/student-page-redesign`, on top of the student page redesign (Tim, 12 Nov 2026: build both on one branch, self-review them together, merge both into `pilotMain` in one PR). Diff base `pilotMain`.

## Global Constraints

- Test first: watch each test fail, then make it pass (root `CLAUDE.md`). `make verify` must be green before every commit, and `make e2e` green at the end (Task 11).
- Every action keeps working as today:
  - sign off, and Undo after it
  - revoke, with its confirm strip
  - Re-sort
  - Hide names (the cookie, `data-private`, blur)
  - the failure alerts and their Try again
  - the Review links and their `#checkpoint-<id>` anchors
- Accessible names are the specs' contract (`lib/app/ready.ts`: "may restyle, never rename"). Keep `Sign off … for …`, `Undo sign-off of … for …`, `Revoke sign-off of … for …`, `Keep sign-off of … for …`, `Review … for …`, `Open …'s work (opens in a new tab)`, `Re-sort (n change[s])`, `Hide names`, and the "N students waiting for you" heading.
- Laptop first, then 390px (`docs/design/UI-STANDARDS.md` §3). Nothing clipped at 390px, no sideways page scroll.
- No raw colour in a component: every colour is an `--app-*` token. Never put a `--text-app-*` size and a `text-app-*` colour through one `cn()` call; build those strings with template literals (UI-STANDARDS §2).
- Every control is at least 44 × 44px on touch (UI-STANDARDS). The grid's cells are 48px tall buttons.
- Specs query by role and accessible name. Lean tests: a few cases proving the changed behaviour.
- Keep `docs/ARCHITECTURE.md` true in the same commit as any change it describes.
- Never `git add` `draft-list.md`.

---

## Decisions made

From the mockups and the interview (`docs/intent/progress-redesign.md`), settled:

| # | Question | Answer |
|---|---|---|
| P-1 | Which design? | A, one stage at a time, with an All tab. B is reference only; All reuses its cells. |
| P-2 | Where does the teacher sign off? | At a desk, at school or at home, on a laptop. Never on her phone. UI-STANDARDS §3 and UI-BRIEF now say laptop first. |
| P-3 | What does she work from? | Students' requests. The waiting list comes first; the design doesn't count on her memory. |
| P-4 | Keep direct Sign off for students who haven't asked? | Yes, for now. |
| P-5 | Answering many requests in a row? | A Next request link on the student page. It touches the student page; rework it if it doesn't feel right. |
| P-6 | Which stage does the page open on? | The latest stage that's due, on laptop as on phone (`latestDueKey`). |
| P-7 | A row after Sign off? | It stays in place with "Signed off today · Undo"; the list's count goes down; it moves to Signed off on reload or Re-sort. Re-sort keeps its name. |

Made while writing this plan. **Confirmed by Tim, 12 Nov 2026, as written.**

| # | What happens | Why it matters to you |
|---|---|---|
| P-8 | **The page ground stays `--app-ground`**, not the drawer's darker tray. | Same call as the student page (its R-8): the ground is set once for every app page. |
| P-9 | **`CheckpointCell` gets a `row` layout: one button and no state words.** Sign off, or Revoke once signed off; Review when the student has asked. The `one` layout is deleted: only Progress used it. | In "Still to sign off" the heading already says the state, so 20 copies of "Due, not signed off" would be noise. The Signed off list uses the student page's `card` layout (a "Signed off 3 Nov" pill and Revoke). |
| P-10 | **All's cells are quiet marks.** Signed off is a green ✓, with the date on hover (`title`). Due is an amber **Sign off**. Not due is a grey dash that shows "Sign off" on hover or keyboard focus. Waiting is a navy **Review**. Every cell keeps its full accessible name. | A screen reader still hears "Sign off Plan discussed… for Aoife Byrne", so only the visible words get shorter. |
| P-11 | **Which list a student is in is frozen at load, like the order.** Re-sort re-freezes both. | It's what makes "the row stays in place" (P-7) true: signing off doesn't move a row from one list to the other under the pointer. |
| P-12 | **Next request is a bar pinned to the bottom of the window** (`position: sticky`) on the student page, shown whenever another student is waiting. It reads "3 others are waiting" and **Next: Aoife Byrne ›**, linking to the oldest other request at its checkpoint. | It's always within reach, wherever the answer form left her on the page, with no state to track "just answered". The page loads the progress grid for it; if that fails, the bar just doesn't show. |
| P-13 | **The navy card's bar and counts become one shared `CountsBar`**, used by the stage drawer and the stage view. | The drawer and Progress draw the same card. One component means they can't drift. |
| P-14 | **App pages are titled "Leaving Cert Practical"**, and Progress is "Progress · Leaving Cert Practical". It's set in the `(app)` and `(auth)` layouts, so the root layout (BiPi's) isn't touched. | The tab stops saying "BiPi Schedule Hub". Other pages can add their own title later with one line. |
| P-15 | **The stage tabs are links with `aria-current="page"`, not ARIA tabs**, named by their visible words ("Stage 3 Plan discussed 20 to sign off"). | Each tab loads its own view by URL, like today's picker. Dropping the `aria-label` keeps the visible "20 to sign off" in what a screen reader hears (WCAG label in name). |
| P-16 | **A stage with no checkpoint still shows as a tab that isn't a link**, saying "Nothing to sign off". | As today (plan P4-22). It matters for Business Stage 6. |
| P-17 | **"No entries yet" is no longer bold.** Bold only means a student has been quiet for 14 days or more. | It was the boldest text in most rows. |
| P-18 | **"Behind" is an amber number square** beside each name in the stage list, plus "Behind by 3" in words under the name. The square is `aria-hidden`. | It's quick to scan by eye, and the words are what a screen reader hears. |
| P-19 | **The "23 of 32 students are behind" answer moves into All's navy card.** The stage view's level-2 heading is the stage's checkpoint. | Each view's card answers its own question. The e2e journey changes to match (Task 11). |
| P-20 | **On a phone, All is read-only**: name, work icon, and six stage dots said in words ("Signed off: Stages 1 and 2. Due: Stage 3."). The phone's stage view keeps its Sign off buttons. | Nobody signs off on a phone (P-2), but 390px must still work, and the stage view already does. |
| P-21 | **"Up to date" is folded in All, except students who are waiting**, behind "Show 8 more". "Signed off" is folded in the stage view, behind "Show signed-off students". | The page shows who needs her first. |

---

## Concepts in play

| Concept | What it is | Why it fits here | Where this repo already uses it |
|---|---|---|---|
| A frozen layout | Keep a snapshot of the first render's order in state; show live values, but lay rows out from the snapshot until the user asks | A row never moves under the pointer (P-7, P-11) | `freeze` and `inOrder` in `components/app/progress-grid.tsx`, `lib/app/progress.ts` (plan P4-11) |
| Links that act as tabs | A `<nav>` of links, the current one marked `aria-current="page"`; not `role="tablist"`, which is for panels switched in place | Each stage is its own URL (`?stage=3`) (P-15) | `components/app/stage-picker.tsx`, which `StageTabs` replaces |
| Label in name | WCAG 2.5.3: a control's accessible name contains its visible words, so voice users can say what they see | Why the tabs lose their `aria-label` (P-15) | `CheckpointCell`'s names in `components/app/signoff-parts.tsx` |
| Disclosure | A button with `aria-expanded` that shows or hides a panel; shadcn `Collapsible` is Base UI's | The folded Signed off list (P-21) | `components/ui/collapsible.tsx`, used by the student page's log (`teacher-log.tsx`) after its redesign |
| Reveal on hover and focus | Tailwind's `group` and `group-hover:` / `group-focus-visible:` show a child when its parent button is hovered or focused | The dash that becomes "Sign off" (P-10) | New here |
| `position: sticky` at the bottom | An element that stays in the flow but sticks to the viewport's edge while its container scrolls past | Next request stays in reach (P-12) | New here |
| Route-group metadata | A layout's `export const metadata` applies to every page under it; `title.template` turns a page's `title: "Progress"` into "Progress · Leaving Cert Practical" | The tab title (P-14) | `app/layout.tsx` (static `metadata`), `app/[class]/page.tsx` (`generateMetadata`) |
| Render callbacks | A parent passes a function (`cell(st, i, layout)`) that children call to draw a piece with the parent's state | The stage and All views draw cells with `ProgressGrid`'s `useSignoffs` state | `cell` and `aside` closures in `components/app/progress-grid.tsx` |
| Pure helpers under `node --test` | Wording and counting in `lib/app/*.ts` with no React, tested without a browser | `tabLine`, `splitByStage`, `dotsLabel`, `nextRequest` | `lib/app/progress.ts` and its test |

---

## File structure

| File | Change | Responsibility |
|---|---|---|
| `frontend/lib/app/progress.ts` (+ `.test.ts`) | Modify | `tabLine`, `splitByStage`, `dotsLabel`; `isQuiet(null)` is false; `missingText` and `pickName` removed in Task 9 |
| `frontend/lib/app/ready.ts` (+ `.test.ts`) | Modify | `nextRequest` |
| `frontend/components/app/counts-bar.tsx` (+ `.spec.tsx`) | Create | The navy card's bar and counts line |
| `frontend/components/app/stage-sheet.tsx` | Modify | Uses `CountsBar` |
| `frontend/components/app/work-link.tsx` (+ `work-link.spec.tsx`) | Modify / Create | `WorkIcon` |
| `frontend/components/app/signoff-parts.tsx` (+ `.spec.tsx`) | Modify | Quiet `grid`, new `row` with Review (Task 4); `one` removed (Task 9) |
| `frontend/components/app/waiting-queue.tsx` (+ `.spec.tsx`) | Modify | The amber-strip card with a Review button per request |
| `frontend/components/app/stage-tabs.tsx` (+ `.spec.tsx`) | Create | The stage tabs |
| `frontend/components/app/stage-picker.tsx` (+ `.spec.tsx`) | Delete (Task 9) | Replaced by `StageTabs` |
| `frontend/components/app/progress-fixtures.ts` | Create | One test grid for the Progress specs |
| `frontend/components/app/progress-stage.tsx` | Create | `StageCard`, `StageView` and its rows |
| `frontend/components/app/progress-all.tsx` | Create | `ClassCard`, `AllView` (table and phone list) |
| `frontend/components/app/progress-grid.tsx` (+ `.spec.tsx`) | Rewrite | State, cells, toolbar; picks the view |
| `frontend/app/(app)/teach/classes/[id]/progress/page.tsx` | Modify | One `stage` prop; `metadata` |
| `frontend/app/(app)/layout.tsx`, `frontend/app/(auth)/layout.tsx` | Modify | Title and template |
| `frontend/components/app/next-request.tsx` (+ `.spec.tsx`) | Create | The student page's Next request bar |
| `frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx` | Modify | Loads the queue; renders `NextRequest` |
| `frontend/e2e/phase4.e2e.ts` | Modify | The stage view's lists, All's heading, the title |
| `docs/ARCHITECTURE.md`, `docs/BACKLOG.md`, `docs/HANDOFF.md`, `docs/design/pilot/progress-redesign/NOTES.md` | Modify | Kept true |

---

### Task 0: Branch and the planning docs

**Files:** `docs/BACKLOG.md` (one row added).

- [ ] **Step 1: Check you're on the student page branch, with its parts**

Run: `git branch --show-current`, `grep -n '"card"' frontend/components/app/signoff-parts.tsx` and `grep -n "attention-line" frontend/app/globals.css`
Expected: `pilot/student-page-redesign`, and a match for each. This plan builds on its `card` layout and its `--app-attention-line` token.

- [ ] **Step 2: See what's in the working tree**

Run: `git status --short`
Expected: this feature's files: `docs/intent/progress-redesign.md`, this plan, `docs/design/pilot/progress-redesign/`, and possibly the laptop-first lines in `docs/design/UI-STANDARDS.md` §3 and `docs/design/UI-BRIEF.md` (if another commit hasn't already carried them). Not this work's: `draft-list.md`, and possibly `frontend/AGENTS.md` (rewritten by `next dev`). **Never add those.** Anything else: stop and tell Tim.

- [ ] **Step 3: Add the backlog row**

In `docs/BACKLOG.md`, in **Up next**, directly after the `_student-page-redesign_` row, add:

```markdown
| — | _progress-redesign_ | Rebuild the Progress tab to direction A: the waiting requests first, then stage tabs opening on the latest due stage, that stage's navy card, "Still to sign off" with one Sign off per student and a folded "Signed off"; All as a quiet grid (read-only stage dots on a phone). The student page gets a Next request bar | planned (10 Nov 2026), built on `pilot/student-page-redesign` with the student page. Plan: `docs/superpowers/plans/2026-11-10-progress-redesign.md`; intent: `docs/intent/progress-redesign.md`; design: `docs/design/pilot/progress-redesign/` |
```

- [ ] **Step 4: Commit the planning docs**

```bash
git add docs/intent/progress-redesign.md docs/superpowers/plans/2026-11-10-progress-redesign.md docs/design/pilot/progress-redesign docs/BACKLOG.md
git add docs/design/UI-STANDARDS.md docs/design/UI-BRIEF.md   # only if Step 2 showed them modified
git commit -m "Plan the Progress redesign: the intent, the plan, the mockups, the backlog row, and laptop first"
```

---

### Task 1: The helpers

**Files:**
- Modify: `frontend/lib/app/progress.ts`, `frontend/lib/app/progress.test.ts`
- Modify: `frontend/lib/app/ready.ts`, `frontend/lib/app/ready.test.ts`

**Interfaces:**
- `tabLine(stage: GridStage, left: number, today: string): string`: "20 to sign off", "All signed off", "Due 3 Dec 2026" or "No date set".
- `splitByStage<T extends { studentId: string }>(students: T[], signedAtLoad: ReadonlySet<string>): { left: T[]; signed: T[] }`.
- `dotsLabel(student: ProgressStudent, grid: Pick<ProgressGrid, "stages">): string`: "Signed off: Stage 1. Due: Stage 2."
- `nextRequest<T extends { studentId: string }>(waiting: readonly T[], studentId: string): { next: T; others: number } | null`.
- `isQuiet(null)` becomes `false`. `missingText` and `pickName` stay until Task 9, when nothing uses them.

- [ ] **Step 1: Write the failing tests**

In `frontend/lib/app/progress.test.ts`:
- In the import list, add `dotsLabel, splitByStage, tabLine,`.
- In the test "log activity reads in words and is quiet at 14 days or with none", change its name to `"log activity reads in words, and is quiet at 14 days or more (plan progress-redesign P-17)"` and its last line to `assert.equal(isQuiet(null), false);`.
- After the test "a student's missing checkpoints, for the phone's All view", add:

```ts
test("the phone's All view says a student's stage dots in words (plan progress-redesign P-20)", () => {
  const g = grid(BIO, []);
  assert.equal(dotsLabel(student("a", 1, ["SIGNED_OFF", "SIGNED_OFF", "DUE", "NOT_DUE"]), g), "Signed off: Stages 1 and 2. Due: Stage 3.");
  assert.equal(dotsLabel(student("a", 0, ["SIGNED_OFF", "READY", "NOT_DUE", "NOT_DUE"]), g), "Signed off: Stage 1. Waiting for you: Stage 2.");
  assert.equal(dotsLabel(student("a", 0, ["NOT_DUE", "NOT_DUE", "NOT_DUE", "NOT_DUE"]), g), "Nothing signed off or due yet.");
});

test("a stage tab says what's left, or when it's due (plan progress-redesign)", () => {
  assert.equal(tabLine(BIO[2], 20, "2026-12-14"), "20 to sign off");
  assert.equal(tabLine(BIO[2], 0, "2026-12-14"), "All signed off");
  assert.equal(tabLine(BIO[3], 31, "2026-12-14"), "Due 12 Feb 2027");
  assert.equal(tabLine({ ...BIO[3], dueDate: null }, 31, "2026-12-14"), "No date set");
});

test("a stage view splits students by who was signed off when the page loaded, keeping their order (P-11)", () => {
  const rows = [{ studentId: "a" }, { studentId: "b" }, { studentId: "c" }];
  assert.deepEqual(splitByStage(rows, new Set(["b"])), { left: [{ studentId: "a" }, { studentId: "c" }], signed: [{ studentId: "b" }] });
});
```

(`grid`, `student` and `BIO` are the file's existing fixtures: `BIO[2]` is Stage 3, due 11 Dec 2026; `BIO[3]` is Stage 4, due 12 Feb 2027; `student(id, behindBy, states)` takes one state per checkpoint stage.)

In `frontend/lib/app/ready.test.ts`, add `nextRequest` to the import from `./ready.ts` and add:

```ts
test("Next request is the oldest request that isn't this student's (plan progress-redesign P-12)", () => {
  const waiting = [{ studentId: "a" }, { studentId: "b" }, { studentId: "a" }, { studentId: "c" }];
  assert.deepEqual(nextRequest(waiting, "a"), { next: { studentId: "b" }, others: 2 });
  assert.equal(nextRequest([{ studentId: "a" }], "a"), null);
});
```

- [ ] **Step 2: Run them to see them fail**

Run (in `frontend/`): `node --test lib/app/progress.test.ts lib/app/ready.test.ts`
Expected: FAIL. `dotsLabel`, `tabLine`, `splitByStage` and `nextRequest` aren't exported, and `isQuiet(null)` is still `true`.

- [ ] **Step 3: Write the helpers**

In `frontend/lib/app/progress.ts`:

Change `isQuiet` to:

```ts
/** Plan progress-redesign P-17: bold only for a student quiet for 14 days or more. "No entries yet" stays plain. */
export const isQuiet = (days: number | null) => days !== null && days >= 14;
```

Directly after `latestDueKey`, add:

```ts
/** A stage tab's last line (plan progress-redesign): what's left once it's due, its date before then. */
export function tabLine(stage: GridStage, left: number, today: string): string {
  if (stage.dueDate === null) return "No date set";
  if (!isDue(stage, today)) return `Due ${formatCalendarDate(stage.dueDate)}`;
  return left === 0 ? "All signed off" : `${left} to sign off`;
}

/** A stage view's two lists (P-11): membership is frozen at load with the order, so a sign-off never moves a row between lists. */
export function splitByStage<T extends { studentId: string }>(students: T[], signedAtLoad: ReadonlySet<string>): { left: T[]; signed: T[] } {
  return { left: students.filter((s) => !signedAtLoad.has(s.studentId)), signed: students.filter((s) => signedAtLoad.has(s.studentId)) };
}

const DOT_WORDS = [["SIGNED_OFF", "Signed off"], ["READY", "Waiting for you"], ["DUE", "Due"]] as const;

/** The phone's All view (P-20): a student's stage dots in words. Stages not due yet are left out. */
export function dotsLabel(student: ProgressStudent, grid: Pick<ProgressGrid, "stages">): string {
  const stages = checkpointStages(grid);
  const parts = DOT_WORDS.map(([state, word]) => [word, stages.filter((_, i) => student.cells[i]?.state === state)] as const)
    .filter(([, list]) => list.length > 0)
    .map(([word, list]) => `${word}: ${listStages(list)}.`);
  return parts.length > 0 ? parts.join(" ") : "Nothing signed off or due yet.";
}
```

In `frontend/lib/app/ready.ts`, after `reviewName`, add:

```ts
/** The student page's Next request (plan progress-redesign P-12). `waiting` is oldest first, as the server sends it. */
export function nextRequest<T extends { studentId: string }>(waiting: readonly T[], studentId: string): { next: T; others: number } | null {
  const others = waiting.filter((w) => w.studentId !== studentId);
  return others.length === 0 ? null : { next: others[0], others: others.length };
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `node --test lib/app/progress.test.ts lib/app/ready.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run (repo root): `make verify`
Expected: green.

```bash
git add frontend/lib/app/progress.ts frontend/lib/app/progress.test.ts frontend/lib/app/ready.ts frontend/lib/app/ready.test.ts
git commit -m "Add the Progress redesign's helpers: tab lines, frozen lists, stage dots in words, Next request"
```

---

### Task 2: `CountsBar`

**Files:**
- Create: `frontend/components/app/counts-bar.tsx`, `frontend/components/app/counts-bar.spec.tsx`
- Modify: `frontend/components/app/stage-sheet.tsx`

**Interfaces:**
- Produces: `CountsBar({ counts: CheckpointCounts; showWaiting: boolean })`. The bar (`role="img"`, named by `countsLabel`), then the counts line. `showWaiting` false leaves "N waiting" out, as the sheet does while its "N waiting for you" link is showing.

- [ ] **Step 1: Write the failing test**

`frontend/components/app/counts-bar.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CountsBar } from "./counts-bar";

describe("CountsBar", () => {
  it("draws the counts as a bar named in words, and says them under it", () => {
    const { container } = render(<CountsBar counts={{ signedOff: 12, waiting: 1, notYet: 19 }} showWaiting />);
    expect(screen.getByRole("img", { name: "12 signed off, 1 waiting, 19 not yet, of 32 students" })).toBeInTheDocument();
    expect(container.querySelector("p")).toHaveTextContent(/12 signed off.*1 waiting.*19 not yet/);
  });

  it("leaves the waiting count out when the card says it another way", () => {
    const { container } = render(<CountsBar counts={{ signedOff: 2, waiting: 3, notYet: 1 }} showWaiting={false} />);
    expect(container.querySelector("p")).not.toHaveTextContent("waiting");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run (in `frontend/`): `npx vitest run components/app/counts-bar.spec.tsx`
Expected: FAIL: `./counts-bar` doesn't exist.

- [ ] **Step 3: Write it, and use it in the sheet**

`frontend/components/app/counts-bar.tsx`:

```tsx
import { countsLabel, type CheckpointCounts } from "@/lib/app/stage-sheet";

/**
 * The navy checkpoint card's bar and counts line (design B, plan progress-redesign P-13): the stage sheet and the
 * Progress tab's stage view. The sheet turns `showWaiting` off while anyone waits, because its "N waiting for you"
 * link says it instead.
 */
export function CountsBar({ counts, showWaiting }: { counts: CheckpointCounts; showWaiting: boolean }) {
  return (
    <>
      <div role="img" aria-label={countsLabel(counts)} data-private className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
        {counts.signedOff > 0 && <span className="bg-app-approved-on-accent" style={{ flexGrow: counts.signedOff }} />}
        {counts.waiting > 0 && <span className="bg-app-attention-on-accent" style={{ flexGrow: counts.waiting }} />}
        {counts.notYet > 0 && <span className="bg-app-accent-track" style={{ flexGrow: counts.notYet }} />}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-app-help text-app-on-accent-muted">
        <span data-private><b className="font-bold text-app-approved-on-accent">{counts.signedOff}</b> signed off</span>
        {showWaiting && (
          <span data-private>
            <b className={`font-bold ${counts.waiting > 0 ? "text-app-attention-on-accent" : "text-app-on-accent"}`}>{counts.waiting}</b> waiting
          </span>
        )}
        <span data-private><b className="font-bold text-app-on-accent">{counts.notYet}</b> not yet</span>
      </p>
    </>
  );
}
```

In `frontend/components/app/stage-sheet.tsx`, import `CountsBar` from `./counts-bar`, and replace the `<div role="img" …>…</div>` and the `<p className="mt-2 flex flex-wrap …">…</p>` that follows it (inside `counts && (<>…</>)`) with:

```tsx
                  <CountsBar counts={counts} showWaiting={counts.waiting === 0} />
```

Remove `countsLabel` from the sheet's import of `@/lib/app/stage-sheet` if nothing else there uses it.

- [ ] **Step 4: Run both specs to see them pass**

Run: `npx vitest run components/app/counts-bar.spec.tsx components/app/stage-sheet.spec.tsx`
Expected: PASS. The sheet's "draws the checkpoint's counts as a bar named in words" and "counts the checkpoint across the class, linking the waiting count to Progress" still pass unchanged.

- [ ] **Step 5: Verify and commit**

Run (repo root): `make verify`
Expected: green.

```bash
git add frontend/components/app/counts-bar.tsx frontend/components/app/counts-bar.spec.tsx frontend/components/app/stage-sheet.tsx
git commit -m "Share the navy checkpoint card's bar and counts as CountsBar, for the stage sheet and Progress"
```

---

### Task 3: `WorkIcon`

**Files:**
- Modify: `frontend/components/app/work-link.tsx`
- Create: `frontend/components/app/work-link.spec.tsx`

**Interfaces:**
- Produces: `WorkIcon({ url, name })`: a 44px icon link, named `openWorkName(name)`, opening in a new tab with no opener or referrer. The host shows on hover (`title`).

- [ ] **Step 1: Write the failing test**

`frontend/components/app/work-link.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkIcon } from "./work-link";

describe("WorkIcon", () => {
  it("opens the work in a new tab, is named for the student, and shows the host on hover", () => {
    render(<WorkIcon url="https://docs.google.com/document/d/1" name="Aoife Byrne" />);
    const link = screen.getByRole("link", { name: "Open Aoife Byrne's work (opens in a new tab)" });
    expect(link).toHaveAttribute("href", "https://docs.google.com/document/d/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("title", "docs.google.com");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/app/work-link.spec.tsx`
Expected: FAIL: `WorkIcon` isn't exported.

- [ ] **Step 3: Write it**

At the end of `frontend/components/app/work-link.tsx`, add:

```tsx
/** Plan progress-redesign: the Progress tab's work link, an icon beside the name, so a shared link doesn't add a line to every row. */
export function WorkIcon({ url, name }: { url: string; name: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={openWorkName(name)} title={linkHost(url)}
      className="inline-flex size-11 flex-none items-center justify-center rounded-app-control text-app-accent hover:bg-app-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent touch-manipulation">
      <ExternalLink aria-hidden className="size-4" />
    </a>
  );
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run components/app/work-link.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run (repo root): `make verify`
Expected: green.

```bash
git add frontend/components/app/work-link.tsx frontend/components/app/work-link.spec.tsx
git commit -m "Add WorkIcon: the student's work as an icon link beside their name"
```

---

### Task 4: `CheckpointCell`: quiet grid cells and the `row` layout

**Files:**
- Modify: `frontend/components/app/signoff-parts.tsx`
- Modify: `frontend/components/app/signoff-parts.spec.tsx`

**Interfaces:**
- `layout` becomes `"grid" | "one" | "card" | "row"`. `one` stays for the old page until Task 9 removes it.
- `grid`:
  - SIGNED_OFF: a ✓ button named `names.revoke`, with `title` "Signed off 2 Oct 2026".
  - DUE: an amber "Sign off" button named `names.sign`.
  - NOT_DUE: a dash button named `names.sign` that shows "Sign off" on hover or focus.
  - READY: a "Review" link named `names.review`.
- `row`:
  - SIGNED_OFF: Revoke (ghost).
  - DUE or NOT_DUE: Sign off (outline).
  - READY with `reviewHref`: a Review link styled as a primary button.
- `card` and `one` are unchanged. The confirming and recent branches are unchanged.

- [ ] **Step 1: Write the failing tests**

In `frontend/components/app/signoff-parts.spec.tsx`, inside `describe("CheckpointCell", …)`:

Replace the first two tests ("in the grid, a due cell says Due and signs off in one click" and "a signed-off cell shows its date and opens the revoke question") with:

```tsx
  it("in the grid, a due cell is an amber Sign off that signs off in one click", async () => {
    const onSign = vi.fn();
    render(<CheckpointCell {...base} layout="grid" cell={cell("DUE")} onSign={onSign} />);
    const button = screen.getByRole("button", { name: names.sign });
    expect(button).toHaveTextContent("Sign off");
    await userEvent.click(button);
    expect(onSign).toHaveBeenCalled();
  });

  it("in the grid, a signed-off cell is a tick with its date on hover, and opens the revoke question", async () => {
    const onAsk = vi.fn();
    render(<CheckpointCell {...base} layout="grid" cell={cell("SIGNED_OFF")} onAsk={onAsk} />);
    const button = screen.getByRole("button", { name: names.revoke });
    expect(button).toHaveAttribute("title", "Signed off 2 Oct 2026");
    await userEvent.click(button);
    expect(onAsk).toHaveBeenCalled();
  });

  it("in the grid, a cell not due yet is a quiet dash that still signs off early", () => {
    render(<CheckpointCell {...base} layout="grid" cell={cell("NOT_DUE")} />);
    expect(screen.getByRole("button", { name: names.sign })).toHaveTextContent("Sign off"); // shown on hover and focus
  });
```

After "in a one-stage view a due cell says so in full", add:

```tsx
  it("in a Progress list the cell is one button: Sign off, or Revoke once signed off", async () => {
    const onAsk = vi.fn();
    const { rerender } = render(<CheckpointCell {...base} layout="row" cell={cell("DUE")} />);
    expect(screen.getByRole("button", { name: names.sign })).toHaveTextContent("Sign off");
    expect(screen.queryByText(/Due/)).not.toBeInTheDocument();
    rerender(<CheckpointCell {...base} layout="row" cell={cell("SIGNED_OFF")} onAsk={onAsk} />);
    await userEvent.click(screen.getByRole("button", { name: names.revoke }));
    expect(onAsk).toHaveBeenCalled();
  });

  it("in a Progress list a Ready cell is a Review link", () => {
    render(<CheckpointCell {...base} names={readyNames} layout="row" cell={readyCell} reviewHref={href} />);
    expect(screen.getByRole("link", { name: readyNames.review })).toHaveTextContent("Review");
  });
```

Replace "a Ready cell in the grid is a link to review, not a sign-off button" with:

```tsx
  it("a Ready cell in the grid is a link to review, not a sign-off button", () => {
    render(<CheckpointCell {...base} names={readyNames} layout="grid" cell={readyCell} reviewHref={href} />);
    const link = screen.getByRole("link", { name: readyNames.review });
    expect(link).toHaveAttribute("href", href);
    expect(link).toHaveTextContent("Review");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run components/app/signoff-parts.spec.tsx`
Expected: FAIL. TypeScript accepts `"row"` only after Step 3, and Vitest reports the grid tests (no `title`, no "Sign off" in a due cell) and the `row` tests failing.

- [ ] **Step 3: Change the cell**

In `frontend/components/app/signoff-parts.tsx`:
- Change the `layout` type in `CellProps` to `layout: "grid" | "one" | "card" | "row";`.
- Import `buttonVariants` alongside `Button`: `import { Button, buttonVariants } from "@/components/ui/button";`. `Check` (lucide-react) is already imported by the `card` layout.

Replace the whole `if (cell.state === "READY") { … }` block with:

```tsx
  if (cell.state === "READY") {
    if (reviewHref && layout === "grid") {
      return (
        <Link href={reviewHref} aria-label={names.review} className={`${GRID_BUTTON} hover:bg-app-inset`}>
          <span className="inline-flex h-9 items-center rounded-app-control bg-app-accent px-3 text-app-small font-bold text-app-on-accent">Review</span>
        </Link>
      );
    }
    if (reviewHref && layout === "row") {
      return <Link href={reviewHref} aria-label={names.review} className={buttonVariants()}>Review</Link>;
    }
    return <span className="text-app-small font-semibold text-app-ready">Ready for sign-off</span>;
  }
```

Replace the whole `if (layout === "grid") { … }` block with the block below. It ends with a new `row` branch; leave the old `one` tail after it as it is.

```tsx
  // Plan progress-redesign P-10: quiet marks. Every button keeps its full name, so only the visible words got shorter.
  if (layout === "grid") {
    if (cell.state === "SIGNED_OFF") {
      return (
        <button type="button" aria-label={names.revoke} title={cell.signedOffOn ? `Signed off ${formatCalendarDate(cell.signedOffOn)}` : undefined}
          disabled={busy !== null} onClick={onAsk} className={`${GRID_BUTTON} hover:bg-app-inset`}>
          {busy === "revoke" ? <span className="text-app-small text-app-grey">{BUSY.revoke}</span> : (
            <span aria-hidden className="ml-1.5 inline-flex size-[26px] items-center justify-center rounded-full bg-app-signed text-app-on-accent">
              <Check className="size-4" strokeWidth={3} />
            </span>
          )}
        </button>
      );
    }
    if (cell.state === "DUE") {
      return (
        <button type="button" aria-label={names.sign} disabled={busy !== null} onClick={onSign} className={GRID_BUTTON}>
          <span className="inline-flex h-9 items-center rounded-app-control border border-app-attention-line bg-app-due-tint px-3 text-app-small font-bold text-app-due">
            {busy === "sign" ? BUSY.sign : "Sign off"}
          </span>
        </button>
      );
    }
    return (
      <button type="button" aria-label={names.sign} disabled={busy !== null} onClick={onSign} className={`group ${GRID_BUTTON} hover:bg-app-inset`}>
        {busy === "sign" ? <span className="text-app-small text-app-grey">{BUSY.sign}</span> : (
          <>
            <span aria-hidden className="ml-1.5 block h-0.5 w-3.5 rounded-full bg-app-field-border group-hover:hidden group-focus-visible:hidden" />
            <span className="hidden text-app-small font-semibold text-app-accent group-hover:inline group-focus-visible:inline">Sign off</span>
          </>
        )}
      </button>
    );
  }

  // Plan progress-redesign P-9: the Progress tab's lists. One button; the list's heading says the state.
  if (layout === "row") {
    return cell.state === "SIGNED_OFF" ? (
      <Button type="button" variant="ghost" aria-label={names.revoke} disabled={busy !== null} onClick={onAsk} className="text-app-grey">
        {busy === "revoke" ? BUSY.revoke : "Revoke"}
      </Button>
    ) : (
      <Button type="button" variant="outline" aria-label={names.sign} disabled={busy !== null} onClick={onSign}
        className="border-app-accent text-app-accent hover:bg-app-accent-tint">
        {busy === "sign" ? BUSY.sign : "Sign off"}
      </Button>
    );
  }
```

Update the doc comment above `CheckpointCell`: "In the grid a cell is one quiet mark (a tick, an amber Sign off, a dash, Review); on the student page's stage cards (`card`) the state is a pill beside one button; in the Progress tab's lists (`row`) it's the button alone."

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run components/app/signoff-parts.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run (repo root): `make verify`
Expected: green. The old page's grid now draws the quiet marks; `progress-grid.spec.tsx` queries by name, so it still passes.

```bash
git add frontend/components/app/signoff-parts.tsx frontend/components/app/signoff-parts.spec.tsx
git commit -m "Quiet the grid's cells to marks, and add the row layout for Progress's lists"
```

---

### Task 5: The waiting card

**Files:**
- Modify: `frontend/components/app/waiting-queue.tsx`, `frontend/components/app/waiting-queue.spec.tsx`

- [ ] **Step 1: Write the failing test**

In `frontend/components/app/waiting-queue.spec.tsx`, at the end of the first test, add:

```tsx
    expect(links[0]).toHaveTextContent("Review"); // a button per request (plan progress-redesign)
    expect(screen.getAllByText("Initial ideas discussed with the teacher")).toHaveLength(2);
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/app/waiting-queue.spec.tsx`
Expected: FAIL: the link's text is "Aoife Byrne · Initial ideas", and the checkpoint isn't written out in full.

- [ ] **Step 3: Restyle it**

Replace the `return (…)` of `WaitingQueue` in `frontend/components/app/waiting-queue.tsx` with:

```tsx
  return (
    <section aria-labelledby="queue-heading" className={`${card} mt-6 overflow-hidden border-app-attention-line`}>
      <h2 id="queue-heading" className="flex items-center gap-2 bg-app-attention-tint px-[18px] py-2.5 font-heading text-app-base font-bold text-app-attention">
        <span aria-hidden className="size-2 flex-none rounded-full bg-app-attention" />
        {waitingHeading(students)}
      </h2>
      <ol className="flex flex-col divide-y divide-app-line">
        {waiting.map((w) => {
          const name = fullName(w);
          return (
            <li key={`${w.studentId}/${w.checkpointId}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-[18px] py-3">
              <div className="flex min-w-0 flex-1 basis-72 flex-col gap-0.5">
                <p className="font-semibold text-app-ink"><span data-private>{name}</span></p>
                <p className="text-app-small text-app-copy">{w.checkpointText}</p>
                <p className="text-app-small text-app-grey"><span data-private>{askedWhen(w.askedOn, today)}</span></p>
                {w.note && <p data-private className="text-app-small text-app-copy">{w.note}</p>}
              </div>
              <Link href={`/teach/classes/${classId}/students/${w.studentId}#${checkpointAnchor(w.checkpointId)}`}
                aria-label={reviewName(w.checkpointText, name)} className={buttonVariants()}>
                Review
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
```

Update the imports: add `import { buttonVariants } from "@/components/ui/button";`, drop `shortCheckpoint` and `sectionTitle` if unused, and keep `fullName` from `@/lib/app/progress`.

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run components/app/waiting-queue.spec.tsx`
Expected: PASS: all three tests (the heading, the link names and the "renders nothing" case are unchanged).

- [ ] **Step 5: Verify and commit**

Run (repo root): `make verify`
Expected: green.

```bash
git add frontend/components/app/waiting-queue.tsx frontend/components/app/waiting-queue.spec.tsx
git commit -m "Restyle the waiting queue as design B's amber-strip card, with a Review button per request"
```

---

### Task 6: The stage tabs

**Files:**
- Create: `frontend/components/app/progress-fixtures.ts`
- Create: `frontend/components/app/stage-tabs.tsx`, `frontend/components/app/stage-tabs.spec.tsx`

The old `stage-picker.tsx` stays, still used by the old page, until Task 9 deletes it.

**Interfaces:**
- Produces: `StageTabs({ grid: Pick<ProgressGrid, "stages" | "students" | "today">; current: string; basePath: string })`. A `<nav aria-label="Stages">` of links: "All", then one per stage with a checkpoint. The current link has `aria-current="page"`. A stage without a checkpoint is shown, not linked (P-16).
- `progress-fixtures.ts` exports `INITIAL`, `LOG`, `row`, `grid`, `waitingFor`. Tasks 7 to 9 use them.

- [ ] **Step 1: Write the fixtures and the failing test**

`frontend/components/app/progress-fixtures.ts`:

```ts
import type { ProgressGrid, ProgressStudent, WaitingRequest } from "@/lib/api/schemas";

/** One small class for the Progress specs: two stages, both due on 14 Dec 2026. */
export const INITIAL = "Initial ideas discussed with the teacher";
export const LOG = "Investigative log shared with the teacher";

type State = ProgressStudent["cells"][number]["state"];

export const row = (id: string, first: string, last: string, behindBy: number, states: [State, State], days: number | null,
  link?: string): ProgressStudent => ({
  studentId: id, firstName: first, lastName: last, behindBy, lastLogActivityOn: null, daysSinceLastLogActivity: days,
  documentLink: link ? { url: link, setOn: "2026-12-01" } : null,
  cells: states.map((state, i) => ({ checkpointId: `c${i + 1}`, state, signedOffOn: state === "SIGNED_OFF" ? "2026-10-02" : null })),
});

export const waitingFor = (s: ProgressStudent, checkpoint: 1 | 2): WaitingRequest => ({
  studentId: s.studentId, firstName: s.firstName, lastName: s.lastName, checkpointId: `c${checkpoint}`,
  checkpointText: checkpoint === 1 ? INITIAL : LOG, askedOn: "2026-12-12", note: null,
});

export const grid = (students: ProgressStudent[], waiting: WaitingRequest[] = []): ProgressGrid => ({
  componentId: "k1", classId: "cl1", className: "6A Biology", today: "2026-12-14",
  stages: [
    { stageId: "s1", ordinal: 1, label: "Stage 1", name: "Initial", dueDate: "2026-10-02", checkpoint: { id: "c1", text: INITIAL } },
    { stageId: "s2", ordinal: 2, label: "Stage 2", name: "Research", dueDate: "2026-11-06", checkpoint: { id: "c2", text: LOG } },
  ],
  students, waiting, itemTicks: [],
});
```

`frontend/components/app/stage-tabs.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { grid, row } from "./progress-fixtures";
import { StageTabs } from "./stage-tabs";

const CLASS = grid([row("a", "Aoife", "Byrne", 2, ["DUE", "DUE"], null), row("c", "Cian", "Murphy", 1, ["SIGNED_OFF", "READY"], 3)]);

describe("StageTabs", () => {
  it("links All and each stage, says what's left, and marks the current one", () => {
    render(<StageTabs grid={CLASS} current="2" basePath="/p" />);
    const nav = within(screen.getByRole("navigation", { name: "Stages" }));
    expect(nav.getByRole("link", { name: /All/ })).toHaveAttribute("href", "/p?stage=all");
    expect(nav.getByRole("link", { name: /Stage 1.*Initial ideas.*1 to sign off/ })).toHaveAttribute("href", "/p?stage=1");
    expect(nav.getByRole("link", { name: /Stage 2.*Investigative log.*2 to sign off/ })).toHaveAttribute("aria-current", "page");
  });

  it("shows a stage with nothing to sign off but doesn't link it (plan P4-22)", () => {
    const business = { ...CLASS, stages: [...CLASS.stages, { stageId: "s6", ordinal: 6, label: "Stage 6", name: "Applying", dueDate: null, checkpoint: null }] };
    render(<StageTabs grid={business} current="all" basePath="/p" />);
    expect(screen.getByText("Nothing to sign off")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Stage 6/ })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/app/stage-tabs.spec.tsx`
Expected: FAIL: `./stage-tabs` doesn't exist.

- [ ] **Step 3: Write the tabs**

`frontend/components/app/stage-tabs.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { ProgressGrid } from "@/lib/api/schemas";
import { shortCheckpoint, stageKey, stageLabel, tabLine } from "@/lib/app/progress";
import { checkpointCounts } from "@/lib/app/stage-sheet";

import { card, eyebrow } from "./styles";

const TAB = "flex min-w-[112px] flex-1 flex-col gap-1.5 rounded-app-control px-2.5 pt-2 pb-2.5";

/**
 * Direction A's stage tabs (plan progress-redesign P-15): All, then every stage, each a link to its `?stage=` view
 * with a small bar of who's signed off. They're links, not ARIA tabs, because each loads its own view, and they're
 * named by their visible words. On a narrow screen the row scrolls sideways with the current stage scrolled into view.
 */
export function StageTabs({ grid, current, basePath }:
  { grid: Pick<ProgressGrid, "stages" | "students" | "today">; current: string; basePath: string }) {
  const currentRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [current]);

  const link = (key: string) => {
    const on = key === current;
    return {
      href: `${basePath}?stage=${key}`,
      ref: on ? currentRef : undefined,
      "aria-current": on ? ("page" as const) : undefined,
      className: `${TAB} ${on ? "bg-app-accent text-app-on-accent" : "text-app-ink hover:bg-app-inset"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent touch-manipulation`,
    };
  };
  const quiet = (on: boolean) => (on ? "text-app-on-accent-muted" : "text-app-grey");

  return (
    <nav aria-label="Stages" className={`${card} mt-3 flex gap-1 overflow-x-auto p-1.5 [scrollbar-width:none]`}>
      <Link {...link("all")}>
        <span className={`${eyebrow} ${quiet(current === "all")}`}>All</span>
        <span className="min-h-[2.5em] text-app-small leading-tight font-semibold">Every stage</span>
        <span className={`text-app-label ${quiet(current === "all")}`}>Overview</span>
      </Link>
      {grid.stages.map((stage) => {
        if (!stage.checkpoint) {
          return (
            <div key={stage.stageId} className={`${TAB} text-app-muted`}>
              <span className={`${eyebrow} text-app-muted`}>{stageLabel(stage)}</span>
              <span className="min-h-[2.5em] text-app-small leading-tight font-semibold">{stage.name}</span>
              <span className="text-app-label">Nothing to sign off</span>
            </div>
          );
        }
        const key = stageKey(stage);
        const on = key === current;
        const counts = checkpointCounts(grid, stage.stageId);
        const line = tabLine(stage, counts ? counts.waiting + counts.notYet : 0, grid.today);
        return (
          <Link key={stage.stageId} {...link(key)}>
            <span className={`${eyebrow} ${quiet(on)}`}>{stageLabel(stage)}</span>
            <span className="min-h-[2.5em] text-app-small leading-tight font-semibold">{shortCheckpoint(stage.checkpoint.text)}</span>
            <span aria-hidden className={`flex h-[5px] overflow-hidden rounded-full ${on ? "bg-app-accent-track" : "bg-app-inset"}`}>
              {counts && counts.signedOff > 0 && <span className={on ? "bg-app-approved-on-accent" : "bg-app-signed"} style={{ flexGrow: counts.signedOff }} />}
              {counts && counts.waiting > 0 && <span className="bg-app-attention-on-accent" style={{ flexGrow: counts.waiting }} />}
              {counts && counts.notYet > 0 && <span style={{ flexGrow: counts.notYet }} />}
            </span>
            <span data-private className={`text-app-label font-semibold ${on ? "text-app-on-accent-muted" : line.endsWith("to sign off") ? "text-app-due" : "text-app-grey"}`}>
              {line}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run components/app/stage-tabs.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run (repo root): `make verify`
Expected: green.

```bash
git add frontend/components/app/progress-fixtures.ts frontend/components/app/stage-tabs.tsx frontend/components/app/stage-tabs.spec.tsx
git commit -m "Add direction A's stage tabs: a bar and what's left per stage, named by their words"
```

---

### Task 7: The stage view

**Files:**
- Create: `frontend/components/app/progress-stage.tsx`

No spec of its own: `ProgressGrid`'s spec (Task 9) drives it through the page's real state. Its tests are written there first, and they fail until Task 9 wires this in.

**Interfaces:**
- Consumes: `CellRenderer = (st: ProgressStudent, index: number, layout: "grid" | "card" | "row") => ReactNode` and `aside(st): ReactNode`, both from `ProgressGrid` (Task 9).
- Produces: `StageCard({ grid, index })` and `StageView({ grid, index, students, signedAtLoad, cell, aside })`. `index` is the stage's position in `checkpointStages(grid)`.

- [ ] **Step 1: Write the file**

`frontend/components/app/progress-stage.tsx`:

```tsx
"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import type { ProgressGrid as Grid, ProgressStudent } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { behindWords, checkpointStages, fullName, isQuiet, lastEntryWords, splitByStage, stageLabel } from "@/lib/app/progress";
import { checkpointCounts } from "@/lib/app/stage-sheet";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { CountsBar } from "./counts-bar";
import { card, eyebrow } from "./styles";
import { WorkIcon } from "./work-link";

export type CellRenderer = (st: ProgressStudent, index: number, layout: "grid" | "card" | "row") => ReactNode;

/** The chosen stage's navy card (design B): the checkpoint, its bar and its counts. */
export function StageCard({ grid, index }: { grid: Grid; index: number }) {
  const stage = checkpointStages(grid)[index];
  const counts = checkpointCounts(grid, stage.stageId);
  const due = stage.dueDate ? `due ${formatCalendarDate(stage.dueDate)}` : "no date set";
  return (
    <section aria-labelledby="stage-heading" className="mt-3 rounded-app-card bg-app-accent p-[18px] text-app-on-accent">
      <p className={`${eyebrow} text-app-on-accent-muted`}>{`${stageLabel(stage)} · ${stage.name} · ${due}`}</p>
      <h2 id="stage-heading" className="mt-1.5 font-heading text-[20px] leading-[1.28] font-bold tracking-[-.01em] text-balance lg:text-[22px]">
        {stage.checkpoint.text}
      </h2>
      {counts && grid.students.length > 0 && <CountsBar counts={counts} showWaiting />}
    </section>
  );
}

/**
 * Direction A's stage view (plan progress-redesign): who's still to sign off, furthest behind first, one button
 * each; then who was signed off, folded. Lists are frozen at load (P-11), so a row signed off here stays put with
 * Undo, and the heading's count goes down.
 */
export function StageView({ grid, index, students, signedAtLoad, cell, aside }: {
  grid: Grid; index: number; students: ProgressStudent[]; signedAtLoad: ReadonlySet<string>;
  cell: CellRenderer; aside: (st: ProgressStudent) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { left, signed } = splitByStage(students, signedAtLoad);
  const stillLeft = left.filter((st) => st.cells[index]?.state !== "SIGNED_OFF").length;
  const rowOf = (st: ProgressStudent, layout: "row" | "card") => (
    <StudentRow key={st.studentId} st={st} classId={grid.classId} action={cell(st, index, layout)} extra={aside(st)} />
  );

  return (
    <>
      <section aria-labelledby="left-heading" className={`${card} mt-3`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-app-line px-[18px] py-3.5">
          <h3 id="left-heading" className="font-heading text-app-base font-bold text-app-ink">
            Still to sign off · <span data-private className="tabular-nums">{stillLeft}</span>
          </h3>
          <p className="text-app-small text-app-grey">Furthest behind first</p>
        </div>
        {left.length === 0
          ? <p className="px-[18px] py-4 text-app-base text-app-grey">Everyone is signed off for this stage.</p>
          : <ul className="divide-y divide-app-line">{left.map((st) => rowOf(st, "row"))}</ul>}
      </section>

      {signed.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen} className={`${card} mt-3`}>
          <div className="flex items-center justify-between gap-3 px-[18px] py-3">
            <div className="flex min-w-0 flex-col">
              <h3 className="font-heading text-app-base font-bold text-app-ink">
                Signed off · <span data-private className="tabular-nums">{signed.length}</span>
              </h3>
              {!open && (
                <p data-private className="truncate text-app-small text-app-grey">
                  {signed.slice(0, 3).map(fullName).join(", ")}{signed.length > 3 ? ` and ${signed.length - 3} more` : ""}
                </p>
              )}
            </div>
            <CollapsibleTrigger render={<Button type="button" variant="outline" />}>
              {open ? "Hide" : "Show"}<span className="sr-only"> signed-off students</span>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <ul className="divide-y divide-app-line border-t border-app-line">{signed.map((st) => rowOf(st, "card"))}</ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}

/** One student in a stage list: how far behind (a square for the eye, words for everyone), the name and work link, the log, the action. */
function StudentRow({ st, classId, action, extra }: { st: ProgressStudent; classId: string; action: ReactNode; extra: ReactNode }) {
  const name = fullName(st);
  return (
    <li className="flex flex-col gap-2 px-[18px] py-2.5">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <span aria-hidden className={`flex size-9 flex-none items-center justify-center rounded-app-control font-heading text-app-base font-bold ${st.behindBy > 0 ? "bg-app-due-tint text-app-due" : "bg-app-inset text-app-grey"}`}>
          {st.behindBy}
        </span>
        <div className="flex min-w-0 flex-1 basis-48 flex-col">
          <span className="inline-flex min-w-0 items-center">
            <Link href={`/teach/classes/${classId}/students/${st.studentId}`} data-private
              className="font-semibold break-words text-app-accent underline underline-offset-3">{name}</Link>
            {st.documentLink && <WorkIcon url={st.documentLink.url} name={name} />}
          </span>
          <span className="text-app-small text-app-grey">
            <span className={st.behindBy > 0 ? "font-semibold text-app-due" : undefined}>{behindWords(st.behindBy)}</span>
            {" · "}
            <span data-private className={isQuiet(st.daysSinceLastLogActivity) ? "font-semibold text-app-ink" : undefined}>
              {lastEntryWords(st.daysSinceLastLogActivity)}
            </span>
          </span>
        </div>
        {action}
      </div>
      {extra}
    </li>
  );
}
```

- [ ] **Step 2: Type-check it**

Run: `npx tsc --noEmit 2>&1 | grep progress-stage`
Expected: no output.

- [ ] **Step 3: Verify and commit**

Run (repo root): `make verify`
Expected: green (nothing imports the file yet).


```bash
git add frontend/components/app/progress-stage.tsx
git commit -m "Add direction A's stage view: the navy card, Still to sign off, and the folded Signed off list"
```

---

### Task 8: The All view

**Files:**
- Create: `frontend/components/app/progress-all.tsx`

Like Task 7, it's driven by `ProgressGrid`'s spec in Task 9.

**Interfaces:**
- Produces: `ClassCard({ grid })` (All's navy card, with the answer as its `h2`) and `AllView({ grid, students, bandOf, basePath, cell, aside })`: the quiet table at `lg:`, the read-only dots list below it.

- [ ] **Step 1: Write the file**

`frontend/components/app/progress-all.tsx`:

```tsx
"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode, useState } from "react";

import type { ProgressCell, ProgressGrid as Grid, ProgressStudent } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import {
  type Band, bandHeading, bands, checkpointStages, dotsLabel, fullName, isQuiet, lastEntryWords, shortCheckpoint, stageKey, stageLabel,
  stageStateWord, studentCount, summary,
} from "@/lib/app/progress";

import { card, eyebrow } from "./styles";
import type { CellRenderer } from "./progress-stage";
import { WorkIcon } from "./work-link";

/** All's navy card (plan progress-redesign P-19): the page's answer, and the class as up to date against behind. */
export function ClassCard({ grid }: { grid: Grid }) {
  const sum = summary(grid);
  const n = (value: number) => <span data-private className="tabular-nums">{value}</span>;
  const total = grid.students.length;
  const upToDate = grid.students.filter((st) => st.behindBy === 0).length;
  let head: ReactNode;
  let sub = "";
  switch (sum.kind) {
    case "noDates": head = "No stage dates yet"; sub = "Nothing can be due until the stages have dates."; break;
    case "nothingDue": head = "Nothing is due yet"; sub = sum.next ? `${sum.next.label}’s checkpoint is due on ${sum.next.date}.` : ""; break;
    case "upToDate":
      head = <>All {n(sum.total)} {sum.total === 1 ? "student is" : "students are"} up to date</>;
      sub = `Every checkpoint due so far (${sum.due}) is signed off.${sum.next ? ` ${sum.next.label}’s is next, on ${sum.next.date}.` : ""}`;
      break;
    case "behind":
      head = <>{n(sum.behind)} of {n(sum.total)} students {sum.behind === 1 ? "is" : "are"} behind</>;
      sub = `${sum.due} ${sum.dueCount > 1 ? "are" : "is"} due. Furthest behind first.${sum.noCheckpoint.map((l) => ` ${l} has no checkpoint.`).join("")}`;
      break;
  }
  return (
    <section aria-labelledby="class-heading" className="mt-3 rounded-app-card bg-app-accent p-[18px] text-app-on-accent">
      <p className={`${eyebrow} text-app-on-accent-muted`}>Every stage</p>
      <h2 id="class-heading" className="mt-1.5 font-heading text-[22px] leading-[1.25] font-bold tracking-[-.01em] text-balance">{head}</h2>
      {sub && <p className="mt-1 text-app-small text-app-on-accent-muted">{sub}</p>}
      {sum.kind === "behind" && (
        <>
          <div role="img" aria-label={`${upToDate} up to date, ${total - upToDate} behind, of ${studentCount(total)}`} data-private
            className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
            {upToDate > 0 && <span className="bg-app-approved-on-accent" style={{ flexGrow: upToDate }} />}
            <span className="bg-app-attention-on-accent" style={{ flexGrow: total - upToDate }} />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-app-help text-app-on-accent-muted">
            {bands(grid.students).filter((g) => g.behindBy > 0).map((g) => (
              <span key={g.behindBy} data-private>
                <b className="font-bold text-app-attention-on-accent">{g.students.length}</b> {g.students.length === 1 ? "is" : "are"} {g.behindBy} behind
              </span>
            ))}
            <span data-private><b className="font-bold text-app-approved-on-accent">{upToDate}</b> up to date</span>
          </p>
        </>
      )}
    </section>
  );
}

const DOT: Record<ProgressCell["state"], string> = {
  SIGNED_OFF: "bg-app-signed text-app-on-accent",
  DUE: "bg-app-due-tint text-app-due ring-[1.5px] ring-app-due ring-inset",
  READY: "bg-app-attention-on-accent text-app-ink",
  NOT_DUE: "bg-app-surface text-app-muted ring-[1.5px] ring-app-field-border ring-inset",
};

/**
 * Direction A's All tab (plan progress-redesign): the quiet grid at `lg:`, banded furthest behind first, with "Up to
 * date" folded except anyone waiting (P-21); below `lg:` a read-only list of stage dots (P-20).
 */
export function AllView({ grid, students, bandOf, basePath, cell, aside }: {
  grid: Grid; students: ProgressStudent[]; bandOf: (st: ProgressStudent) => number; basePath: string;
  cell: CellRenderer; aside: (st: ProgressStudent) => ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  const stages = checkpointStages(grid);
  const groups = bands(students, bandOf);
  const shown = (g: Band) => (g.behindBy > 0 || showAll ? g.students : g.students.filter((st) => st.cells.some((c) => c.state === "READY")));
  const fold = (g: Band) => {
    const hidden = g.students.length - shown(g).length;
    if (g.behindBy > 0 || (hidden === 0 && !showAll)) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 bg-app-ground px-4 py-2.5">
        <span className="text-app-small text-app-grey">{showAll ? "Everyone up to date is showing." : `${hidden} more, all signed off so far`}</span>
        <button type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}
          className="min-h-11 rounded-app-control border border-app-field-border bg-app-surface px-3 text-app-small font-semibold text-app-ink hover:bg-app-inset">
          {showAll ? "Hide" : `Show ${hidden} more`}
        </button>
      </div>
    );
  };
  const nameCell = (st: ProgressStudent) => (
    <span className="inline-flex min-w-0 items-center">
      <Link href={`/teach/classes/${grid.classId}/students/${st.studentId}`} data-private
        className="font-semibold break-words text-app-accent underline underline-offset-3">{fullName(st)}</Link>
      {st.documentLink && <WorkIcon url={st.documentLink.url} name={fullName(st)} />}
    </span>
  );
  const columns = stages.length + 2;

  return (
    <>
      <div className="hidden lg:block">
        <div className="relative left-1/2 w-[min(1084px,calc(100vw-72px))] -translate-x-1/2">
          <div className={`${card} mt-3 overflow-x-auto`}>
            <table className="w-full table-fixed border-collapse text-left">
              <caption className="sr-only">{`Checkpoint sign-offs for ${grid.className}, grouped by how many due checkpoints each student is behind`}</caption>
              <thead>
                <tr className="border-b border-app-line">
                  <th scope="col" className="w-[236px] px-4 py-3 align-bottom text-app-small font-semibold text-app-grey">Student</th>
                  {stages.map((stage) => (
                    <th scope="col" key={stage.stageId} className="px-2 py-3 align-bottom">
                      <span className={`block ${eyebrow} text-app-muted`}>{stageLabel(stage)}</span>
                      <Link href={`${basePath}?stage=${stageKey(stage)}`} className="block text-app-small leading-tight font-semibold text-app-accent underline underline-offset-3">
                        {shortCheckpoint(stage.checkpoint.text)}
                      </Link>
                      <span className={`block text-app-label font-semibold ${stageStateWord(stage, grid.today) === "Due" ? "text-app-due" : "text-app-muted"}`}>
                        {stageStateWord(stage, grid.today) === "Due" ? "Due" : stage.dueDate ? formatCalendarDate(stage.dueDate) : "No date"}
                      </span>
                    </th>
                  ))}
                  <th scope="col" className="w-[132px] px-4 py-3 align-bottom text-app-small font-semibold text-app-grey">Log</th>
                </tr>
              </thead>
              {groups.map((g) => {
                const folded = fold(g);
                return (
                  <tbody key={`${g.behindBy}-${g.students[0].studentId}`}>
                    <tr className="bg-app-ground">
                      <th scope="rowgroup" colSpan={columns} className="px-4 py-2.5 text-left"><BandHeading behindBy={g.behindBy} count={g.students.length} /></th>
                    </tr>
                    {shown(g).map((st) => {
                      const extra = aside(st);
                      return (
                        <Fragment key={st.studentId}>
                          <tr className="border-t border-app-line">
                            <th scope="row" className="px-4 py-1.5 text-left align-middle font-normal">{nameCell(st)}</th>
                            {stages.map((stage, i) => <td key={stage.stageId} className="p-1 align-middle">{cell(st, i, "grid")}</td>)}
                            <td className="px-4 py-1.5 align-middle">
                              <span data-private className={`text-app-small ${isQuiet(st.daysSinceLastLogActivity) ? "font-semibold text-app-ink" : "text-app-grey"}`}>
                                {lastEntryWords(st.daysSinceLastLogActivity)}
                              </span>
                            </td>
                          </tr>
                          {extra && <tr><td colSpan={columns} className="px-4 pb-3">{extra}</td></tr>}
                        </Fragment>
                      );
                    })}
                    {folded && <tr><td colSpan={columns} className="p-0">{folded}</td></tr>}
                  </tbody>
                );
              })}
            </table>
          </div>
        </div>
      </div>

      <section aria-label="Students" className="mt-3 flex flex-col gap-3 lg:hidden">
        {groups.map((g) => (
          <div key={`${g.behindBy}-${g.students[0].studentId}`} className={`${card} overflow-hidden`}>
            <h3 className="bg-app-ground px-4 py-2.5"><BandHeading behindBy={g.behindBy} count={g.students.length} /></h3>
            <ul className="divide-y divide-app-line">
              {shown(g).map((st) => (
                <li key={st.studentId} className="flex flex-col gap-1.5 px-4 py-3">
                  {nameCell(st)}
                  <span aria-hidden className="flex gap-1.5">
                    {st.cells.map((c, i) => (
                      <span key={c.checkpointId} className={`inline-flex size-[26px] items-center justify-center rounded-full font-mono text-app-label font-bold ${DOT[c.state]}`}>
                        {c.state === "SIGNED_OFF" ? <Check className="size-3.5" strokeWidth={3} /> : stageKey(stages[i])}
                      </span>
                    ))}
                  </span>
                  <span className="sr-only">{dotsLabel(st, grid)}</span>
                </li>
              ))}
            </ul>
            {fold(g)}
          </div>
        ))}
      </section>
    </>
  );
}

function BandHeading({ behindBy, count }: { behindBy: number; count: number }) {
  const { numeral, label } = bandHeading(behindBy);
  return (
    <span className="flex flex-wrap items-baseline gap-x-2.5">
      {numeral && <span className="font-heading text-app-behind-sm leading-none font-bold text-app-due tabular-nums">{numeral}</span>}
      <span className="font-heading text-app-base font-bold text-app-ink">{label}</span>
      <span className="text-app-small text-app-grey">· <span data-private>{studentCount(count)}</span></span>
    </span>
  );
}
```

- [ ] **Step 2: Type-check it**

Run: `npx tsc --noEmit 2>&1 | grep progress-all`
Expected: no output.

- [ ] **Step 3: Verify and commit**

Run (repo root): `make verify`
Expected: green (nothing imports the file yet).


```bash
git add frontend/components/app/progress-all.tsx
git commit -m "Add direction A's All view: the class card, the quiet grid, and read-only stage dots on a phone"
```

---

### Task 9: `ProgressGrid`, the page, and the tab titles

**Files:**
- Rewrite: `frontend/components/app/progress-grid.tsx`, `frontend/components/app/progress-grid.spec.tsx`
- Modify: `frontend/app/(app)/teach/classes/[id]/progress/page.tsx`, `frontend/app/(app)/layout.tsx`, `frontend/app/(auth)/layout.tsx`
- Delete: `frontend/components/app/stage-picker.tsx`, `frontend/components/app/stage-picker.spec.tsx`
- Modify: `frontend/components/app/signoff-parts.tsx` (+ `.spec.tsx`), `frontend/lib/app/progress.ts` (+ `.test.ts`): what only the old page used goes

**Interfaces:**
- `ProgressGrid({ grid, basePath, stage, hideNames })`: `stage` is `"all"` or a `stageKey`.

- [ ] **Step 1: Write the failing spec**

Replace `frontend/components/app/progress-grid.spec.tsx` with:

```tsx
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { grid, INITIAL, LOG, row, waitingFor } from "./progress-fixtures";
import { ProgressGrid } from "./progress-grid";

const AOIFE = row("a", "Aoife", "Byrne", 2, ["DUE", "DUE"], 20, "https://docs.example.com/aoife");
const CIAN = row("c", "Cian", "Murphy", 1, ["SIGNED_OFF", "DUE"], null);
const START = grid([AOIFE, CIAN]);
const props = { basePath: "/teach/classes/cl1/progress", hideNames: false };
const left = () => within(screen.getByRole("region", { name: /Still to sign off/ }));

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  document.cookie = "app_hide_names=; max-age=0; path=/";
});

describe("ProgressGrid", () => {
  it("puts the requests first, then the stage's card and who's still to sign off, one button each", () => {
    render(<ProgressGrid grid={grid([AOIFE, CIAN], [waitingFor(CIAN, 2)])} {...props} stage="2" />);
    expect(screen.getByRole("heading", { name: "1 student waiting for you" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Stages" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: LOG })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Still to sign off · 2" })).toBeInTheDocument();
    expect(left().getAllByRole("link", { name: /^(Aoife Byrne|Cian Murphy)$/ }).map((l) => l.textContent)).toEqual(["Aoife Byrne", "Cian Murphy"]);
    expect(left().getByRole("link", { name: "Open Aoife Byrne's work (opens in a new tab)" })).toHaveAttribute("href", "https://docs.example.com/aoife");
    expect(left().getByRole("button", { name: `Sign off ${LOG} for Aoife Byrne` })).toHaveTextContent("Sign off");
    expect(left().getByText("No entries yet")).not.toHaveClass("font-semibold");
  });

  it("signs off in place: the row stays with Undo, the count goes down, and Re-sort moves it to Signed off", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "c1", state: "SIGNED_OFF", signedOffOn: "2026-12-14" });
    const { rerender } = render(<ProgressGrid grid={START} {...props} stage="1" />);
    expect(screen.getByRole("heading", { name: "Still to sign off · 1" })).toBeInTheDocument();
    await userEvent.click(left().getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/students/a/checkpoints/c1/signoff", { signedOff: true }, expect.anything());
    expect(screen.getByText(`Signed off: ${INITIAL}, for Aoife Byrne.`)).toBeInTheDocument();

    const after = grid([{ ...AOIFE, behindBy: 1, cells: [{ ...AOIFE.cells[0], state: "SIGNED_OFF", signedOffOn: "2026-12-14" }, AOIFE.cells[1]] }, CIAN]);
    rerender(<ProgressGrid grid={after} {...props} stage="1" />);
    expect(left().getByRole("button", { name: `Undo sign-off of ${INITIAL} for Aoife Byrne` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Still to sign off · 0" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Re-sort (1 change)" }));
    expect(screen.getByText("Everyone is signed off for this stage.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Signed off · 2" })).toBeInTheDocument();
  });

  it("revokes from the folded Signed off list, only after the in-place question", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "c1", state: "DUE", signedOffOn: null });
    render(<ProgressGrid grid={START} {...props} stage="1" />);
    await userEvent.click(screen.getByRole("button", { name: "Show signed-off students" }));
    await userEvent.click(screen.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Cian Murphy` }));
    expect(api.send).not.toHaveBeenCalled();
    expect(screen.getByText(/^Revoke the sign-off of/)).toHaveTextContent(`Revoke the sign-off of “${INITIAL}” for Cian Murphy? It stays in the record as revoked by you.`);
    await userEvent.click(screen.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Cian Murphy` }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/students/c/checkpoints/c1/signoff", { signedOff: false }, expect.anything());
  });

  it("a failed sign-off leaves the row and offers Try again", async () => {
    vi.mocked(api.send).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ checkpointId: "c2", state: "SIGNED_OFF", signedOffOn: "2026-12-14" });
    render(<ProgressGrid grid={START} {...props} stage="2" />);
    await userEvent.click(left().getByRole("button", { name: `Sign off ${LOG} for Cian Murphy` }));
    expect(left().getByRole("alert")).toHaveTextContent(`Couldn’t sign off “${LOG}” for Cian Murphy. Nothing changed.`);
    await userEvent.click(left().getByRole("button", { name: "Try again" }));
    expect(api.send).toHaveBeenCalledTimes(2);
  });

  it("two quick sign-offs each stay busy until their own answer, and a failure survives the next click", async () => {
    const answers: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];
    vi.mocked(api.send).mockImplementation(() => new Promise((resolve, reject) => { answers.push({ resolve, reject }); }));
    render(<ProgressGrid grid={START} {...props} stage="2" />);
    const aoife = () => left().getByRole("button", { name: `Sign off ${LOG} for Aoife Byrne` });
    const cian = () => left().getByRole("button", { name: `Sign off ${LOG} for Cian Murphy` });
    await userEvent.click(aoife());
    await userEvent.click(cian());
    expect(aoife()).toBeDisabled();
    expect(aoife()).toHaveTextContent("Signing off…");
    await act(async () => answers[0].reject(new Error("offline")));
    expect(cian()).toBeDisabled();
    expect(left().getByRole("alert")).toHaveTextContent("for Aoife Byrne");
    await act(async () => answers[1].resolve({ checkpointId: "c2", state: "SIGNED_OFF", signedOffOn: "2026-12-14" }));
    expect(left().getByRole("alert")).toHaveTextContent("for Aoife Byrne");
    expect(screen.getByRole("button", { name: "Re-sort (1 change)" })).toBeInTheDocument();
  });

  it("Hide names blurs names and counts and is remembered in a cookie", async () => {
    const { container } = render(<ProgressGrid grid={START} {...props} stage="2" />);
    const hide = screen.getByRole("switch", { name: "Hide names" });
    await userEvent.click(hide);
    expect(hide).toHaveAttribute("aria-checked", "true");
    expect(container.firstElementChild).toHaveClass("app-hide-names");
    expect(document.cookie).toContain("app_hide_names=1");
    expect(left().getByRole("link", { name: "Aoife Byrne" })).toHaveAttribute("data-private");
  });

  it("All answers in its card, then bands the quiet grid furthest behind first, with Up to date folded", async () => {
    const DARA = row("d", "Dara", "Walsh", 0, ["SIGNED_OFF", "SIGNED_OFF"], 2);
    render(<ProgressGrid grid={grid([AOIFE, CIAN, DARA])} {...props} stage="all" />);
    expect(screen.getByRole("heading", { level: 2, name: "2 of 3 students are behind" })).toBeInTheDocument();
    const table = within(screen.getByRole("table", { name: /Checkpoint sign-offs for 6A Biology/ }));
    expect(table.getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` })).toHaveTextContent("Sign off");
    expect(table.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Cian Murphy` })).toHaveAttribute("title", "Signed off 2 Oct 2026");
    expect(table.queryByRole("link", { name: "Dara Walsh" })).not.toBeInTheDocument();
    await userEvent.click(table.getByRole("button", { name: "Show 1 more" }));
    expect(table.getByRole("link", { name: "Dara Walsh" })).toBeInTheDocument();
  });

  it("All on a phone is read-only: each student's stage dots in words, and no sign-off buttons", () => {
    render(<ProgressGrid grid={START} {...props} stage="all" />);
    const list = within(screen.getByRole("region", { name: "Students" }));
    expect(list.getByText("Signed off: Stage 1. Due: Stage 2.")).toBeInTheDocument();
    expect(list.queryByRole("button", { name: /^Sign off/ })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/app/progress-grid.spec.tsx`
Expected: FAIL: `ProgressGrid` still takes `laptopStage` and `phoneStage`, and has no "Still to sign off" region or "Stages" nav.

- [ ] **Step 3: Rewrite `ProgressGrid`**

Replace `frontend/components/app/progress-grid.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

import type { ProgressGrid as Grid, ProgressStudent } from "@/lib/api/schemas";
import {
  checkpointStages, failSentence, fullName, HIDE_NAMES_COOKIE, inOrder, revokeName, revokeQuestion, signName, stageKey, summary, undoName,
} from "@/lib/app/progress";
import { checkpointAnchor, reviewName } from "@/lib/app/ready";

import { Button, buttonVariants } from "@/components/ui/button";

import { AllView, ClassCard } from "./progress-all";
import { type CellRenderer, StageCard, StageView } from "./progress-stage";
import { CheckpointCell, RevokeStrip, SignoffAlert } from "./signoff-parts";
import { StageTabs } from "./stage-tabs";
import { card } from "./styles";
import { targetKey, useSignoffs, type SignoffTarget } from "./use-signoffs";
import { WaitingQueue } from "./waiting-queue";

/** Plan P4-11 and progress-redesign P-11: the order, each student's band, and who was signed off on each stage, as first rendered. */
function freeze(grid: Grid) {
  return {
    order: grid.students.map((s) => s.studentId),
    band: new Map(grid.students.map((s) => [s.studentId, s.behindBy])),
    signed: checkpointStages(grid).map((_, i) => new Set(grid.students.filter((s) => s.cells[i]?.state === "SIGNED_OFF").map((s) => s.studentId))),
  };
}

/**
 * The Progress tab (direction A, plan progress-redesign): the waiting requests, the stage tabs, then one stage's
 * view, or All. Rows, bands and a stage's two lists are frozen at load so nothing moves under the pointer; Re-sort
 * adopts the server's current state.
 */
export function ProgressGrid({ grid, basePath, stage, hideNames }: { grid: Grid; basePath: string; stage: string; hideNames: boolean }) {
  const s = useSignoffs(grid.componentId);
  const [hidden, setHidden] = useState(hideNames);
  const [layout, setLayout] = useState(() => freeze(grid));
  const stages = checkpointStages(grid);
  const students = inOrder(grid.students, layout.order);
  const index = stages.findIndex((st) => stageKey(st) === stage);

  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    document.cookie = `${HIDE_NAMES_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  function resort() {
    setLayout(freeze(grid));
    s.resetVisit();
  }

  const target = (st: ProgressStudent, i: number): SignoffTarget => ({ student: st, checkpoint: stages[i].checkpoint });

  const cell: CellRenderer = (st, i, kind) => {
    const t = target(st, i);
    const key = targetKey(t);
    const name = fullName(st);
    const text = stages[i].checkpoint.text;
    return (
      <CheckpointCell layout={kind} cell={st.cells[i]}
        names={{ sign: signName(text, name), undo: undoName(text, name), revoke: revokeName(text, name), review: reviewName(text, name) }}
        reviewHref={`/teach/classes/${grid.classId}/students/${st.studentId}#${checkpointAnchor(stages[i].checkpoint.id)}`}
        busy={s.busy.get(key) ?? null} recent={s.recent.has(key)} confirming={s.confirming === key}
        onSign={() => s.signOff(t)} onUndo={() => s.undo(t)} onAsk={() => s.askRevoke(t)} />
    );
  };

  /** The revoke question and any failures in this student's row. */
  function aside(st: ProgressStudent) {
    const asking = stages.findIndex((_, i) => s.confirming === targetKey(target(st, i)));
    const failures = [...s.failed].filter(([, f]) => f.target.student.studentId === st.studentId);
    if (asking < 0 && failures.length === 0) return null;
    const t = asking >= 0 ? target(st, asking) : null;
    return (
      <div className="flex flex-col gap-2">
        {t && (
          <RevokeStrip question={revokeQuestion(t.checkpoint.text, fullName(st), "grid")} text={t.checkpoint.text} name={fullName(st)}
            busy={s.busy.has(targetKey(t))} onRevoke={() => s.revoke(t)} onKeep={s.keep} />
        )}
        {failures.map(([key, f]) => (
          <SignoffAlert key={key} message={failSentence(f.action, f.target.checkpoint.text, fullName(st))} name={fullName(st)} onRetry={() => s.retry(key)} />
        ))}
      </div>
    );
  }

  return (
    <div className={hidden ? "app-hide-names" : undefined}>
      <WaitingQueue classId={grid.classId} today={grid.today} waiting={grid.waiting} />
      <StageTabs grid={grid} current={index < 0 ? "all" : stage} basePath={basePath} />
      {index < 0 ? <ClassCard grid={grid} /> : <StageCard grid={grid} index={index} />}
      <Notice grid={grid} classId={grid.classId} />
      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        {s.changes > 0 && (
          <Button type="button" variant="outline" onClick={resort}>{`Re-sort (${s.changes} ${s.changes === 1 ? "change" : "changes"})`}</Button>
        )}
        <button type="button" role="switch" aria-checked={hidden} onClick={toggleHidden}
          className="inline-flex min-h-11 items-center gap-2.5 text-app-meta font-semibold text-app-ink touch-manipulation">
          <span aria-hidden className={`relative inline-flex h-7 w-12 flex-none rounded-full ${hidden ? "bg-app-accent" : "bg-app-switch-off"}`}>
            <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-app-surface transition-transform duration-[var(--app-duration)] motion-reduce:transition-none ${hidden ? "translate-x-5" : ""}`} />
          </span>
          Hide names
        </button>
      </div>
      {index < 0
        ? <AllView grid={grid} students={students} bandOf={(st) => layout.band.get(st.studentId) ?? st.behindBy} basePath={basePath} cell={cell} aside={aside} />
        : <StageView grid={grid} index={index} students={students} signedAtLoad={layout.signed[index] ?? new Set()} cell={cell} aside={aside} />}
      <p aria-live="polite" className="sr-only">{s.announcement}</p>
    </div>
  );
}

function Notice({ grid, classId }: { grid: Grid; classId: string }) {
  const kind = summary(grid).kind;
  if (kind !== "noDates" && kind !== "nothingDue") return null;
  return (
    <div className={`${card} mt-3 flex flex-wrap items-center justify-between gap-4 p-5`}>
      <p className="max-w-[600px] text-app-base text-app-copy">
        {kind === "noDates"
          ? "Set the stage dates on the Component tab and each checkpoint becomes due once its date passes. You can still sign off early when a student shows you their work."
          : "You can sign off a checkpoint early when a student shows you their work. It counts once its date passes."}
      </p>
      {kind === "noDates" && (
        <Link href={`/teach/classes/${classId}/component`} className={buttonVariants({ variant: "outline" })}>Go to the Component tab</Link>
      )}
    </div>
  );
}
```

The "Still to sign off" `<section>` is found by the spec as a region named by its heading, because it has `aria-labelledby` (Task 7).

- [ ] **Step 4: Wire the page, and the titles**

In `frontend/app/(app)/teach/classes/[id]/progress/page.tsx`:
- Add `import type { Metadata } from "next";` and, under `export const dynamic = "force-dynamic";`:

```tsx
export const metadata: Metadata = { title: "Progress" };
```

- Replace the `<ProgressGrid … />` element with:

```tsx
        <ProgressGrid grid={grid.data} basePath={`/teach/classes/${cls.id}/progress`} hideNames={hideNames}
          stage={parseStage(stage, grid.data) ?? latestDueKey(grid.data)} />
```

In `frontend/app/(app)/layout.tsx` and `frontend/app/(auth)/layout.tsx`, add `import type { Metadata } from "next";` and, above the default export:

```tsx
// Plan progress-redesign P-14: app pages aren't the BiPi site, whose title the root layout sets.
export const metadata: Metadata = { title: { default: "Leaving Cert Practical", template: "%s · Leaving Cert Practical" } };
```

- [ ] **Step 5: Remove what only the old page used**

- `git rm frontend/components/app/stage-picker.tsx frontend/components/app/stage-picker.spec.tsx`
- In `frontend/components/app/signoff-parts.tsx`:
  - Change the `layout` type to `"grid" | "card" | "row"`.
  - Delete the old `one` tail at the end of `CheckpointCell` (from `const settled = cell.state === "SIGNED_OFF";` to its `return (…);`).
  - Turn the `row` branch into that tail: drop its `if (layout === "row") {` and closing `}`.
  - If the `data-private` `date` constant is now unused, delete it.
- In `frontend/components/app/signoff-parts.spec.tsx`:
  - In "a sign-off from this visit offers Undo instead" and "while busy the control is disabled and says what it's doing", change `layout="one"` to `layout="row"`.
  - Delete "in a one-stage view a due cell says so in full".
  - In "outside the grid a Ready cell says so in words, with no button", change `layout="one"` to `layout="card"`.
- In `frontend/lib/app/progress.ts`, delete `missingText` and `pickName`.
- In `frontend/lib/app/progress.test.ts`:
  - Remove both from the import.
  - Delete the test "a student's missing checkpoints, for the phone's All view".
  - Delete the two `pickName` lines in "the stage in the URL: valid keys only; the phone defaults to the latest due stage".

- [ ] **Step 6: Run the specs to see them pass**

Run: `npx vitest run components/app/progress-grid.spec.tsx components/app/stage-tabs.spec.tsx components/app/signoff-parts.spec.tsx && node --test lib/app/progress.test.ts`
Expected: PASS.

- [ ] **Step 7: Verify and commit**

Run (repo root): `make verify`
Expected: green.

```bash
git add -A frontend/components/app/progress-grid.tsx frontend/components/app/progress-grid.spec.tsx frontend/components/app/stage-picker.tsx frontend/components/app/stage-picker.spec.tsx frontend/components/app/signoff-parts.tsx frontend/components/app/signoff-parts.spec.tsx frontend/lib/app/progress.ts frontend/lib/app/progress.test.ts "frontend/app/(app)/teach/classes/[id]/progress/page.tsx" "frontend/app/(app)/layout.tsx" "frontend/app/(auth)/layout.tsx"
git commit -m "Rebuild the Progress tab to direction A: requests, stage tabs, one stage's lists or All; and title the app's pages"
```

---

### Task 10: Next request on the student page

**Files:**
- Create: `frontend/components/app/next-request.tsx`, `frontend/components/app/next-request.spec.tsx`
- Modify: `frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx`

**Interfaces:**
- Produces: `NextRequest({ classId, next: WaitingRequest, others: number })`: a `<nav aria-label="Next request">` pinned to the bottom of the window, with a link named `Next request: Review <checkpoint> for <name>`.

- [ ] **Step 1: Write the failing test**

`frontend/components/app/next-request.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { INITIAL, row, waitingFor } from "./progress-fixtures";
import { NextRequest } from "./next-request";

describe("NextRequest", () => {
  it("links to the next request at its checkpoint, and says how many others are waiting", () => {
    render(<NextRequest classId="cl1" next={waitingFor(row("a", "Aoife", "Byrne", 1, ["READY", "DUE"], null), 1)} others={3} />);
    const link = screen.getByRole("link", { name: `Next request: Review ${INITIAL} for Aoife Byrne` });
    expect(link).toHaveAttribute("href", "/teach/classes/cl1/students/a#checkpoint-c1");
    expect(link).toHaveTextContent("Next: Aoife Byrne");
    expect(screen.getByText(/waiting/)).toHaveTextContent("3 others are waiting");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/app/next-request.spec.tsx`
Expected: FAIL: `./next-request` doesn't exist.

- [ ] **Step 3: Write it and render it**

`frontend/components/app/next-request.tsx`:

```tsx
import Link from "next/link";

import type { WaitingRequest } from "@/lib/api/schemas";
import { fullName } from "@/lib/app/progress";
import { checkpointAnchor, reviewName } from "@/lib/app/ready";

import { buttonVariants } from "@/components/ui/button";

import { card } from "./styles";

/**
 * Plan progress-redesign P-12: pinned to the bottom of the window while another student is waiting, so a teacher can
 * answer a run of requests without going back to Progress. Rendered last in the page, so at the very end it sits in
 * the flow and covers nothing.
 */
export function NextRequest({ classId, next, others }: { classId: string; next: WaitingRequest; others: number }) {
  const name = fullName(next);
  return (
    <nav aria-label="Next request" className={`${card} sticky bottom-3 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border-app-accent px-[18px] py-3`}>
      <p className="text-app-small text-app-grey">
        <span data-private>{others}</span> {others === 1 ? "other is" : "others are"} waiting
      </p>
      <Link href={`/teach/classes/${classId}/students/${next.studentId}#${checkpointAnchor(next.checkpointId)}`}
        aria-label={`Next request: ${reviewName(next.checkpointText, name)}`} className={buttonVariants()}>
        Next: <span data-private>{name}</span> <span aria-hidden>›</span>
      </Link>
    </nav>
  );
}
```

In `frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx`:
- Import `progressGridSchema` with the other schemas, `nextRequest` from `@/lib/app/ready`, and `NextRequest` from `@/components/app/next-request`.
- Add a third entry to the `Promise.all` that loads the log and the checkpoints:

```tsx
    attempt(() => serverApi.get(`/components/${componentId}/progress`, progressGridSchema)),
```

and name it in the destructuring (`const [log, checkpoints, progress] = …`).

- After the `Promise.all`, add:

```tsx
  // Plan progress-redesign P-12: if the class's queue didn't load, the page works without the bar.
  const next = progress.ok ? nextRequest(progress.data.waiting, studentId) : null;
```

- As the **last child of `<AppMain>`** in the branch that renders the checkpoints (after the log), add:

```tsx
      {next && <NextRequest classId={cls.id} next={next.next} others={next.others} />}
```

- [ ] **Step 4: Run it to see it pass, then verify**

Run: `npx vitest run components/app/next-request.spec.tsx`
Expected: PASS.

Run (repo root): `make verify`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/app/next-request.tsx frontend/components/app/next-request.spec.tsx "frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx"
git commit -m "Add Next request to the student page: the oldest other request, pinned to the bottom while anyone waits"
```

---

### Task 11: The journey, the docs, the checklist and the hand test

**Files:**
- Modify: `frontend/e2e/phase4.e2e.ts`
- Modify: `docs/ARCHITECTURE.md`, `docs/BACKLOG.md`, `docs/HANDOFF.md`, `docs/design/pilot/progress-redesign/NOTES.md`

- [ ] **Step 1: Update the journey**

In `frontend/e2e/phase4.e2e.ts`, replace the test "signing off moves a student down the grid after Re-sort, and revoking puts them back" with:

```ts
test("signing off keeps the row in place, Re-sort moves it to Signed off, and revoking puts it back", async ({ page: teacher }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await signInTeacher(teacher);
  await teacher.goto(`${P4.progress}?stage=1`);
  await expect(teacher).toHaveTitle("Progress · Leaving Cert Practical");
  await expect(teacher.getByRole("heading", { level: 2, name: INITIAL })).toBeVisible();
  await expect(teacher.getByRole("heading", { name: "Still to sign off · 2" })).toBeVisible();
  await expectAccessible(teacher);
  await noSidewaysScroll(teacher);
  expect(await students(teacher)).toEqual(["Aoife Byrne", "Cian Murphy"]); // both behind by 1, no entries: surname

  await teacher.getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByRole("button", { name: `Undo sign-off of ${INITIAL} for Aoife Byrne` })).toBeVisible();
  await expect(teacher.getByRole("heading", { name: "Still to sign off · 1" })).toBeVisible();
  expect(await students(teacher)).toEqual(["Aoife Byrne", "Cian Murphy"]); // nothing moves under the pointer
  await teacher.getByRole("button", { name: "Re-sort (1 change)" }).click();
  expect(await students(teacher)).toEqual(["Cian Murphy"]); // Aoife is in the folded Signed off list
  await teacher.getByRole("button", { name: "Show signed-off students" }).click();
  expect(await students(teacher)).toEqual(["Cian Murphy", "Aoife Byrne"]);

  await teacher.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByText(/It stays in the record as revoked by you/)).toBeVisible();
  await expectAccessible(teacher);
  await teacher.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` })).toBeVisible();
  await teacher.reload();
  expect(await students(teacher)).toEqual(["Aoife Byrne", "Cian Murphy"]);

  await teacher.goto(`${P4.progress}?stage=all`);
  await expect(teacher.getByRole("heading", { level: 2, name: "2 of 2 students are behind" })).toBeVisible();
  await expectAccessible(teacher);
  await noSidewaysScroll(teacher);
});
```

`noSidewaysScroll` is used by `ready-for-signoff.e2e.ts`; if `phase4.e2e.ts` doesn't import it yet, add it to the import from `./helpers`.

In "Hide names blurs the page and survives a reload", change `await teacher.goto(P4.progress);` to `await teacher.goto(`${P4.progress}?stage=all`);`: the stage view may have Aoife folded away, but All always lists her.

`ready-for-signoff.e2e.ts` needs no change: its heading ("1 student waiting for you") and its `Review … for Aoife Byrne` link (`.first()`, the queue's) are kept.

- [ ] **Step 2: Run the journeys**

Run (repo root): `make e2e`
Expected: green on both projects (laptop and phone).

- [ ] **Step 3: Keep the docs true**

`docs/ARCHITECTURE.md`: replace the bullet that starts `- **The Progress page** (Phase 4,` with:

```markdown
- **The Progress page** (Phase 4, `app/(app)/teach/classes/[id]/progress/page.tsx`; direction A, plan progress-redesign): a server component that loads the class, then `GET /components/{id}/progress` inside `attempt()`, reads `?stage=` (`parseStage`, else `latestDueKey`: the latest due stage, on laptop as on phone) and the `app_hide_names` cookie, and renders `ProgressGrid`. In order: `WaitingQueue` (every request, oldest first, each with Review to the student page's `#checkpoint-<id>`); `StageTabs`, links with `aria-current="page"` named by their words, each with a `checkpointCounts` bar and `tabLine`; then either the stage view (`progress-stage.tsx`: `StageCard`, the navy card with the shared `CountsBar`, then "Still to sign off" with `CheckpointCell`'s `row` layout and a folded "Signed off" with `card`) or All (`progress-all.tsx`: `ClassCard`, the quiet `grid` cells in a banded table at `lg:` with "Up to date" folded except anyone waiting, and below `lg:` a read-only list of stage dots said by `dotsLabel`). `freeze` snapshots the order, the bands and each stage's signed-off set; Re-sort re-freezes, so a sign-off never moves a row or changes its list until then. The work link is `WorkIcon`. App pages are titled by the `(app)` and `(auth)` layouts' `metadata` ("%s · Leaving Cert Practical"). The student page renders `NextRequest` (sticky, bottom) from the progress grid's `waiting` (`nextRequest`).
```

`docs/BACKLOG.md`: change the `_progress-redesign_` row's status to `built (date), PR pending` with the branch name.

`docs/HANDOFF.md`: at the top, say the Progress redesign is built on `pilot/progress-redesign`, what's verified (`make verify`, `make e2e`, the hand test) and what's left (the PR, Tim's look at P-8 to P-21).

`docs/design/pilot/progress-redesign/NOTES.md`: add a section **Where the build differs from the mockups**:
- The ground is `--app-ground`, not the tray (P-8).
- All's log column says "No entries yet" / "Last entry 7 days ago" in grey, not a dash.
- The Signed off list's rows use the student page's `card` layout (a "Signed off 3 Nov" pill and Revoke).
- Next request is a bar pinned to the bottom of the student page (P-12); the mockups don't draw it.

- [ ] **Step 4: The checklist and the hand test**

Work through `docs/design/UI-CHECKLIST.md` for the Progress page and the student page. Then by hand, at 1440 and at 390, in the local app with a class like 6th Year Biology:
- The page opens on the latest due stage, requests first.
- Signing off three students down the list: nothing moves; the count goes down; Undo works; Re-sort moves them to Signed off.
- Revoke from Signed off asks first.
- All: the tick shows its date on hover; a dash shows Sign off on hover and on Tab focus.
- With several students waiting: Review, answer, then Next request, three times without visiting Progress.
- Hide names blurs names and counts in both views and the queue.
- The browser tab reads "Progress · Leaving Cert Practical".

Say plainly in the PR which of these you checked.

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/phase4.e2e.ts docs/ARCHITECTURE.md docs/BACKLOG.md docs/HANDOFF.md docs/design/pilot/progress-redesign/NOTES.md
git commit -m "Prove the Progress redesign in the journey, and record it in the architecture notes, the backlog, the handoff and the design notes"
```

Then `write-changes` → `docs/changes/progress-redesign.md`, committed on the branch before the PR (root `CLAUDE.md`, step 5).

---

## Not in this plan

- Removing direct sign-off (P-4: "for now").
- Messaging or nudging students who haven't asked.
- What students see.
- The Students and Component tabs.
- Per-page titles for pages other than Progress (the layouts' default covers them).
