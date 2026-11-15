# Progress redesign

Plan: `docs/superpowers/plans/2026-11-10-progress-redesign.md`. Intent: `docs/intent/progress-redesign.md`. Design: `docs/design/pilot/progress-redesign/`. Built 12 Nov 2026 on `pilot/student-page-redesign`, on top of the student page redesign (Tim's call: one branch, one self-review, one PR).

## What was added

The teacher's Progress tab no longer opens on a grid of 192 cells. It now opens on the requests students have sent ("3 students waiting for you"), then one stage's list of who is still to sign off, with one Sign off button per student. The whole class is one click away under **All**, as a quiet grid of ticks, amber Sign off buttons and dashes.

The student page gained a **Next request** bar, so a teacher can answer a run of requests without going back to Progress. App pages are now titled "Leaving Cert Practical" in the browser tab, not "BiPi Schedule Hub".

Nothing changed in the backend or the API.

## Files changed

| File | What changed and why |
|---|---|
| **Pure helpers** | |
| `frontend/lib/app/progress.ts` | Added `tabLine` (a stage tab's last line), `splitByStage` (a stage's two lists), `dotsLabel` (the phone's stage dots in words). `isQuiet(null)` is now `false`, so "No entries yet" is no longer bold. Removed `missingText` and `pickName`, which only the old page used. |
| `frontend/lib/app/progress.test.ts` | Cases for the three new helpers and the `isQuiet` change. |
| `frontend/lib/app/ready.ts` | Added `nextRequest`: the oldest request that isn't this student's, and how many others there are. |
| `frontend/lib/app/ready.test.ts` | Its case. |
| **Shared parts** | |
| `frontend/components/app/counts-bar.tsx` (+ spec) | New. The navy card's bar and counts line, pulled out of the stage sheet so Progress draws the same thing. |
| `frontend/components/app/stage-sheet.tsx` | Uses `CountsBar`. No visible change. |
| `frontend/components/app/work-link.tsx` (+ new spec) | Added `WorkIcon`: the student's work as a 44px icon link beside their name. |
| `frontend/components/app/signoff-parts.tsx` (+ spec) | `CheckpointCell`'s `grid` layout became quiet marks. Added the `row` layout (one button). Removed the `one` layout. A Ready cell is a Review link in `grid` and `row`. |
| `frontend/components/app/waiting-queue.tsx` (+ spec) | Restyled as the amber-strip card. Each request shows the checkpoint in full and has a Review button. |
| **The Progress tab** | |
| `frontend/components/app/stage-tabs.tsx` (+ spec) | New. All, then one link per stage, each with a small bar and "20 to sign off". Replaces `stage-picker.tsx`. |
| `frontend/components/app/stage-picker.tsx` (+ spec) | Deleted. |
| `frontend/components/app/progress-stage.tsx` | New. `StageCard` (navy), `StageView` ("Still to sign off" and the folded "Signed off"). |
| `frontend/components/app/progress-all.tsx` | New. `ClassCard` (navy, the page's answer) and `AllView` (the table at laptop width, stage dots below it). |
| `frontend/components/app/progress-grid.tsx` | Rewritten. Holds the state, draws the toolbar, and picks the view. Takes one `stage` prop instead of `laptopStage` and `phoneStage`. |
| `frontend/components/app/progress-grid.spec.tsx` | Rewritten for the new page: nine cases. |
| `frontend/components/app/progress-fixtures.ts` | New. One small class shared by the Progress specs. |
| `frontend/app/(app)/teach/classes/[id]/progress/page.tsx` | Passes `stage` (the URL's, else the latest due stage) and sets `metadata.title` to "Progress". |
| **The student page** | |
| `frontend/components/app/next-request.tsx` (+ spec) | New. The bar pinned to the bottom of the window. |
| `frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx` | Also loads `/components/{id}/progress` for the class's queue, and renders `NextRequest` last. |
| `frontend/app/globals.css` | One rule: scroll padding while the bar is on the page. |
| **Titles** | |
| `frontend/app/(app)/layout.tsx`, `frontend/app/(auth)/layout.tsx` | `metadata` with a default title and a template. |
| **Journey** | |
| `frontend/e2e/phase4.e2e.ts` | The sign-off journey follows the new page: the row stays, Re-sort folds it away, All's heading, the tab title. |
| **Docs** | |
| `docs/intent/progress-redesign.md`, the plan, `docs/design/pilot/progress-redesign/` | The intent, the plan and the mockups. |
| `docs/design/UI-STANDARDS.md`, `docs/design/UI-BRIEF.md` | Laptop first, then phone. UI-STANDARDS also records the All grid's wordless marks as an exception (§5), names Progress as a design B page, and drops the old picker's 6px-gap exception. |
| `docs/ARCHITECTURE.md`, `docs/BACKLOG.md`, `docs/HANDOFF.md` | Kept true. |

## How it fits together

1. The browser asks for `/teach/classes/<id>/progress?stage=3`.
2. `progress/page.tsx` (a server component) loads the class, then `GET /components/{id}/progress` through `serverApi` inside `attempt()`. It works out the stage with `parseStage(stage, grid) ?? latestDueKey(grid)` and reads the Hide names cookie.
3. It renders `ProgressGrid` (a client component) with the grid, the stage key and `hideNames`.
4. `ProgressGrid` calls `useSignoffs` for the sign-off state and takes a snapshot with `freeze(grid)`. It draws, in order: `WaitingQueue`, `StageTabs`, a navy card, the toolbar (Re-sort, Hide names), then `StageView` or `AllView`.
5. Both views get two functions from `ProgressGrid`: `cell(student, stageIndex, layout)`, which returns a `CheckpointCell` wired to `useSignoffs`, and `aside(student)`, which returns the revoke question and any failure alerts for that student.
6. Clicking Sign off calls `s.signOff(target)`: a `PUT /components/{id}/students/{sid}/checkpoints/{cid}/signoff`, then `router.refresh()`. The server page re-renders with new data, but `ProgressGrid` keeps its snapshot, so the row stays where it was.

Next request: `students/[studentId]/page.tsx` now loads the same progress endpoint as a third parallel request. `nextRequest(progress.data.waiting, studentId)` picks the oldest request from another student, and `NextRequest` links to that student's page at `#checkpoint-<id>`.

## Concepts & patterns used

### A frozen layout

- **What it is.** Take a snapshot of how the list looked when the page loaded, and keep laying rows out from that snapshot while the data underneath changes.
- **Why here.** A teacher clicks Sign off down a list. If each click removed the row, the next row would slide under her pointer and the next click would hit the wrong student. The alternative is removing the row with an "Undo" toast, which is tidier to look at but unsafe for fast clicking. Tim chose rows that stay.
- **What changed.** `freeze` used to snapshot the order and each student's band. It now also snapshots who was signed off on each stage, so a row can't jump from "Still to sign off" to "Signed off" either:

```tsx
function freeze(grid: Grid) {
  return {
    order: grid.students.map((s) => s.studentId),
    band: new Map(grid.students.map((s) => [s.studentId, s.behindBy])),
    signed: checkpointStages(grid).map((_, i) => new Set(grid.students.filter((s) => s.cells[i]?.state === "SIGNED_OFF").map((s) => s.studentId))),
  };
}
```

- **Where else.** `inOrder` in `frontend/lib/app/progress.ts` (plan P4-11).

### Links that act as tabs

- **What it is.** A `<nav>` of ordinary links, with `aria-current="page"` on the one you're on.
- **Why here.** `role="tablist"` is for panels that swap in place without a page load, and it brings arrow-key rules with it. Here each stage is a real URL (`?stage=3`) that the server renders, so links are the honest pattern. The trade-off is no arrow-key movement between tabs; Tab works as for any links.
- **Where else.** `frontend/components/app/class-header.tsx` (Students, Component, Progress).

### Label in name (WCAG 2.5.3)

- **What it is.** A control's accessible name should contain the words you can see on it, so someone using voice control can say what they see.
- **Why here.** The old picker gave each link an `aria-label` that replaced its visible text. The new tabs have no `aria-label`, so the name is the visible words: "Stage 3 Plan discussed 20 to sign off". The grid's cells go the other way: their visible text is short ("Sign off") and the `aria-label` is long ("Sign off Plan discussed… for Aoife Byrne"), which is fine because the long name still starts with the visible words.
- **Where else.** `names` in `frontend/components/app/signoff-parts.tsx`.

### Render callbacks

- **What it is.** A parent passes a function to a child, and the child calls it to draw a piece.
- **Why here.** `StageView` and `AllView` both need cells wired to the same `useSignoffs` state. Passing `cell` and `aside` down keeps that state in one place (`ProgressGrid`). The alternative was calling `useSignoffs` in each view, which would give each its own "recent sign-offs" and break Undo when switching views.
- **Where else.** The old `ProgressGrid` used the same two closures inside one file.

### Disclosure

- **What it is.** A button with `aria-expanded` that shows or hides a panel.
- **Why here.** "Signed off · 12" starts folded so the page shows who needs her first. It uses shadcn's `Collapsible` (Base UI), which sets `aria-expanded` and `aria-controls` and doesn't render the panel while it's closed.
- **Where else.** `frontend/components/app/teacher-log.tsx`.

### Reveal on hover and focus

- **What it is.** Tailwind's `group` on a parent, and `group-hover:` / `group-focus-visible:` on a child.
- **Why here.** A stage that isn't due yet shows a faint dash. It's still a real button, and it shows "Sign off" when hovered or reached by keyboard:

```tsx
<span aria-hidden className="… group-hover:hidden group-focus-visible:hidden" />
<span className="hidden … group-hover:inline group-focus-visible:inline">Sign off</span>
```

- **Trade-off.** On a touch screen there's no hover, so the words never show. That's acceptable because the grid is only shown at laptop width, and the button's name is always there for a screen reader.

### `position: sticky` at the bottom

- **What it is.** An element that stays in the page's flow but sticks to the window's edge while its container scrolls past.
- **Why here.** Next request has to be within reach wherever the answer form leaves her. `fixed` would also do that, but it would cover the page's last lines forever. `sticky` on the last child of `<main>` sits in the flow at the very end, so it covers nothing there.
- **The catch.** A pinned bar can hide a control that keyboard focus lands on (WCAG 2.4.11). One CSS rule fixes it:

```css
html:has([data-next-request]) { scroll-padding-bottom: 5.5rem; }
```

### Route-group metadata

- **What it is.** In Next.js a layout's `export const metadata` applies to every page under it. `title.template` wraps a page's own title.
- **Why here.** The root layout's title is the live BiPi site's. Setting a default in `(app)/layout.tsx` and `(auth)/layout.tsx` fixes every app page without touching BiPi. `progress/page.tsx` then only says `title: "Progress"` and gets "Progress · Leaving Cert Practical".
- **Where else.** `frontend/app/[class]/page.tsx` uses `generateMetadata` for the live site.

## Implementation techniques

- **Build beside, then swap.** The new tabs, stage view and All view were written as new files while the old page kept working. One task then switched the page over and deleted what only the old page used. That kept `make verify` green at every commit, which a rewrite in place can't do.
- **Write the page's spec before its parts.** `progress-grid.spec.tsx` was rewritten first and failed on all eight cases. The stage view and All view have no specs of their own: the page's spec drives them through real state.
- **Scope queries to a region.** The stage view's list is a `<section aria-labelledby>`, so the spec finds it by role and name and looks inside it:

```tsx
const left = () => within(screen.getByRole("region", { name: /Still to sign off/ }));
```

- **A throwaway preview route for a look by eye.** The e2e classes have one or two students. To see the real components with 32, a temporary `app/(app)/zz-preview/page.tsx` rendered `ProgressGrid` with fixture data, and a temporary e2e file took screenshots inside `make e2e` (which already has a signed-in teacher). Both were deleted before committing.
- **Ask the browser for accessible names.** `await locator.ariaSnapshot()` in Playwright prints the names Chrome computes. That settled whether the tabs' names had spaces (they do).

## Things to know

- **Headings count the truth; rows are frozen.** "Still to sign off · N" counts every student not signed off right now, whichever list their row is in. After one sign-off the heading says 19 while 20 rows are still showing, one of them with Undo. Re-sort makes them agree.
- **All renders two layouts.** The table and the phone list are both in the DOM, and CSS shows one. A spec must use `within(table)` or `within(region "Students")`. The stage view is one layout at every width, so it needs no such care.
- **`buttonVariants()` without `cn()` can lose its border.** The base class has `border-transparent` and the outline variant has `border-app-field-border`; without tailwind-merge both are in the string and CSS order decides. Wrap it: `cn(buttonVariants({ variant: "outline" }))`. The `Button` component already does this.
- **`CheckpointCell` has three layouts now:** `grid` (All's marks), `row` (Progress's lists, the button alone), `card` (the student page and the Signed off list, a pill and a button).
- **The student page makes three requests.** The progress grid is only for the queue. If it fails, the page still renders and the bar is left out.
- **"Up to date" folds only while someone is behind.** With nobody behind, All shows everyone.

## What I'd get wrong next time

- **Inventing a use case from a layout rule.** I assumed the teacher signs off in class on her phone, because the standards said "390px first" and the old design pack drew a phone frame with Sign off buttons. Tim: she would "100 percent not". A responsive rule says the page must work at that width; it says nothing about who uses it there. Ask how the work is done before reading it off the design.
- **Trusting jsdom's accessible names for spacing.** jsdom joined "Show" and a visually hidden " signed-off students" into "Showsigned-off students", and joined a tab's three lines with no spaces. Chrome puts spaces between block-level children. Where the name matters, either set `aria-label` (the Show button) or check it in a real browser (the tabs).
- **`scrollIntoView` on load.** The first draft scrolled the current tab into view with `scrollIntoView`. With 15 requests above the tabs, that would scroll the whole page down on every load. Setting the row's own `scrollLeft` moves only the row.
- **Folding everything.** The first build folded "Up to date" always, so a class with nobody behind opened All on an empty table. Only the screenshot showed it; the spec had a behind student in every case. A case with nobody behind is in the spec now.
- **A class that doesn't exist.** `shadow-app-raised` isn't a token here. Tailwind drops unknown classes silently, so nothing failed. Grep `globals.css` before using a token.

## Self-review findings

Not run yet. Tim is running `/self-review` in a fresh session over this and the student page redesign together.

## Deviations from the plan

- **Same branch as the student page**, not a new branch after its merge (Tim, 12 Nov 2026).
- **The plan was reordered so every commit is green.** Its first draft deleted the old helpers in Task 1, which broke the old page until Task 9.
- **List headings count the current truth**, where the plan counted within the frozen lists. The numbers now always match the navy card.
- **Next request says "3 more requests are waiting for you"**, not "3 others are waiting", because one student can have two requests.
- **The tabs set `scrollLeft`** instead of calling `scrollIntoView`.
- **The Show button has an `aria-label`**, not a visually hidden suffix.
- **"Up to date" folds only while someone is behind**, and its button reads "Show" (named "Show up-to-date students"), not "Show 8 more".
- **"Furthest behind first" is left out** when the list has one row or none.
- **The All table's log column is wider** (176px, no wrapping) and the name column narrower (228px).
- **Scroll padding for the pinned bar** was added; the plan didn't have it.
- **The tabs are 8px apart**, not the plan's 4px, to meet the standards' gap between touch targets.
- **Hide names in the journey checks Cian**, not Aoife, who is signed off and folded away by then.

## Follow-ups

- **Tim's hand test** on real data: answer three requests in a row with Next request, and sign off down a list of 20.
- **Not seen with real data:** the Next request bar on the real student page (seen on the preview route), and a Business class (seven stages and the report tab scroll sideways in the tab row).
- **Not checked:** a screen reader, 200% zoom, a real phone.
- **Direct sign-off stays "for now"** (intent). If it goes, `row` loses its Sign off branch.
- **No way to nudge students who haven't asked.** Out of scope; the chase list is where it would start.
- **Other pages have no title of their own.** They show "Leaving Cert Practical"; each needs one `metadata` line.
- **Links styled with bare `buttonVariants({ variant: "outline" })`** elsewhere (for example the "Go to the Component tab" links) may have the same missing border. Not looked at.
