# Stage drawer redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rebuild the teacher's stage sheet to design B: checkpoint first as a navy card, then the guidelines, the teacher's note (one cream card, read first, Edit in place) and the items (each opens as a view inside the sheet), white cards on a grey tray. Separately, `www.` links in notes become clickable.

**Architecture:** frontend only; no API, schema or backend change. Six tasks on one branch. `lib/app/note-text.ts` learns `www.` addresses (Task 1, its own commit). New `--app-*` tokens (Task 2). `StageSheet` is re-laid-out (Task 3). `StageNoteForm` becomes a card with a read mode and an edit mode (Task 4). `StageItems` shrinks to the list, and a new `StageItemView` takes the sheet's place when an item is opened, the way the calendar view already does (Task 5). Docs, journey and hand test (Task 6).

**Tech Stack:** Next.js 15.3.9, React 19, Base UI drawer (shadcn `base-nova`), Tailwind v4 with `--app-*` tokens, lucide-react icons, `node --test`, Vitest + Testing Library, Playwright.

**Intent:** `docs/intent/stage-drawer-redesign.md` (confirmed 8 Nov 2026). **Design:** the Claude Design canvas https://claude.ai/artifact/4pQ2htktpxPRsSyL2PWX3u, direction B; its source and the new tokens' contrast are in `docs/design/pilot/stage-drawer-redesign/` (read `NOTES.md` first). Where this plan's code and the canvas disagree, this plan wins; `NOTES.md` lists the two deliberate differences.

**Branch:** `pilot/stage-drawer-redesign` from `pilotMain`, one PR at the end. Diff base `pilotMain`.

## Global Constraints

- Test first: watch each test fail, then make it pass (root `CLAUDE.md`). `make verify` green before every commit; `make e2e` green at the end (Task 6).
- What students see is unchanged, except that `www.` addresses in a note become links (Task 1).
- Nothing the sheet does today is lost: unsaved dates and notes survive closing it (S-21), Save this date saves one stage (S-7), the calendar opens inside the sheet and never as a second drawer (S-4), Escape closes the whole sheet (S-19), Hide names blurs names and counts (S-20, S-36).
- The official description, checkpoint and prompts are shown exactly as stored. Never edited, hidden or reworded.
- No raw colour in a component: every colour is an `--app-*` token (UI-STANDARDS §2). Never put a custom `--text-app-*` size and a `text-app-*` colour through one `cn()` call; build those strings with template literals (UI-STANDARDS §2).
- Specs query by role and accessible name. Lean tests: a few cases proving the changed behaviour (`feedback_lean_tests`).
- Keep `docs/ARCHITECTURE.md` true in the same commit as any change it describes.
- Never `git add` `draft-list.md` (untracked, not this work's).

---

## Decisions made

From the canvas and the interview (`docs/intent/stage-drawer-redesign.md`), settled:

| # | Question | Answer |
|---|---|---|
| R-1 | Which design? | B, "Navy checkpoint, cards". A and C are reference only. |
| R-2 | Is B's look app-wide? | Not decided; this drawer only. The `app-polish` idea in `docs/BACKLOG.md` records it. |
| R-3 | New colours? | Shared `--app-*` tokens in `globals.css`, named for reuse. |
| R-4 | The note? | One cream card: what students see, with Edit in place. No separate preview. |
| R-5 | Opening an item? | A view inside the sheet, like the calendar view. Not a dialog. |
| R-6 | `www.` links? | Fixed in this work, as its own commit. |
| R-7 | "Questions students get from the guidelines"? | Stays collapsed at the bottom. |

Made while writing this plan. **Tim: confirm or change R-8 to R-19.**

| # | What happens | Why it matters to you |
|---|---|---|
| R-8 | **Close stays a text button**, not B's ✕ icon. | `components/ui/drawer.tsx` says every drawer has a text Close: no icon-only controls. The e2e journey clicks "Close". |
| R-9 | **The item view keeps the stage's header** (number, "Stage 3 · 2–3 hours", the stage's name, Close), with "‹ Back to Stage 3" under it, the way the calendar view does. | The dialog stays named by the stage, Close stays in one place, and it matches the calendar. The canvas drew the item view with a header of its own. |
| R-10 | A `www.` address gets `https://` put in front for the link; the text still shows what the teacher typed, and that's what a screen reader hears ("www.example.ie/slots (opens in a new tab)"). | A link to `www.example.ie` without a scheme would open `/teach/…/www.example.ie`. `http://` would be the other choice, but most sites now redirect to https anyway. |
| R-11 | **The note card opens on the box** when there's an unsaved draft from earlier (S-21); otherwise it opens showing the note, or "Add a note" when there's none. | You never lose sight of something you typed and didn't save. |
| R-12 | **No live preview while editing.** The help under the box still says "Web links become clickable"; you see them clickable once you press Save note. | The cost of merging the two boxes (R-4). |
| R-13 | Focus: Edit and Add a note move focus into the box. Save note, Cancel and Remove note move it to Edit, or to Add a note when the note is gone. **This changes S-38**: focus no longer stays in the box after a save, because the box closes. | A keyboard user stays on the card instead of landing at the top of the sheet. |
| R-14 | After saving an **existing** item, the item view stays open showing it, with focus on Edit. After saving a **new** item, or retiring one, the sheet goes back to the stage with focus on "Add an item to Stage N" (S-31). | You usually want to see the item you just changed; a new or retired item belongs back in the list. |
| R-15 | The calendar's back link names where it goes back to: "Back to Stage 3", "Back to item B" or "Back to the new item". | Picking an item's date now comes back to the item, not the stage. |
| R-16 | On the navy card, **"N waiting for you" becomes an amber link under the counts** when N is more than 0 (it still goes to the Progress tab and still asks before leaving unsaved work). With nobody waiting, "0 waiting" stays in the counts line. | Waiting students are the one thing on the card you can act on. |
| R-17 | The checkpoint's bar is a picture with a name in words ("4 signed off, 3 waiting, 24 not yet, of 31 students"), blurred by Hide names like the counts. | A screen reader hears the numbers once, not three coloured blocks. |
| R-18 | The stage number in the navy square is decorative (hidden from screen readers); the line beside it still says "Stage 3". | The number would otherwise be read twice. |
| R-19 | A stage with no checkpoint (Business Stage 6) has **no navy card**; the guidelines card comes first. | The same rule as today: no checkpoint, no checkpoint section. |

---

## Concepts in play

| Concept | What it is | Why it fits here | Where this repo already uses it |
|---|---|---|---|
| Swapping views in one drawer | One drawer, one dialog; the views that aren't showing are `hidden`, not unmounted, so anything half-typed in them survives | The item view joins the calendar view; a half-typed item survives a trip to the calendar | `components/app/stage-sheet.tsx` (the rest of the sheet is `hidden` while `request` is set) |
| Pending focus after a view change | A handler records where focus should go in a ref; an effect keyed on the view state moves it once the new view has rendered | Edit, Save and Back each remove the button that had focus | `components/app/stage-items.tsx` (`focusNext`, `closeForm`) |
| Design tokens as CSS custom properties | Colours are `--app-*` variables on `:root`; `@theme inline` maps each one to a Tailwind colour (`bg-app-tray`) | The new colours are shared names other screens can reuse (R-3) | `frontend/app/globals.css` (every `--app-*`, e.g. pack D-11's `--app-pick`) |
| Read mode and edit mode over a lifted draft | The draft lives in the page; the card only decides whether to show it as text or as a box | The note's draft already lives in `StageDatesForm` (S-21), so switching modes never loses text | New as a pair; the draft is `noteDrafts` in `components/app/stage-dates-form.tsx` |
| A named picture for a data graphic | `role="img"` plus an `aria-label` that says in words what the graphic shows | The checkpoint bar (R-17) and the item's tick bar | `YearView` (`components/app/year-view.tsx`, `role="img"`) |
| Contrast measured, not eyeballed | WCAG relative luminance: (L1 + 0.05) / (L2 + 0.05); 4.5:1 for text, 3:1 for graphics | Every new token's ratio is in `docs/design/pilot/stage-drawer-redesign/NOTES.md` | Token comments in `globals.css` (e.g. `--app-pick`) |
| Normalising a URL for a link | Show what was typed; build the `href` from it, adding a scheme when it has none | `www.example.ie` must not become a relative link (R-10) | `lib/app/note-text.ts` (`linkEnd` already separates the address from the sentence) |

---

## File structure

| File | Change | Responsibility |
|---|---|---|
| `frontend/lib/app/note-text.ts` | Modify | `www.` addresses become links with `https://` added; a link part carries the text shown |
| `frontend/lib/app/note-text.test.ts` | Modify | The new cases |
| `frontend/components/app/note-text.tsx` | Modify | Shows `part.text`, names the link by it |
| `frontend/components/app/note-text.spec.tsx` | Modify | A `www.` link's text and `href` |
| `frontend/app/globals.css` | Modify | Seven new tokens and their Tailwind colours |
| `docs/design/UI-STANDARDS.md` | Modify | §5: what the new tokens mean |
| `frontend/lib/app/stage-sheet.ts` | Modify | `countsLabel`, `ADD_ITEM` |
| `frontend/lib/app/stage-sheet.test.ts` | Modify | `countsLabel` |
| `frontend/components/app/stage-sheet.tsx` | Modify | The new layout (Task 3); the item view beside the calendar view (Task 5) |
| `frontend/components/app/stage-sheet.spec.tsx` | Modify | Order, the bar, the item view, an item's date |
| `frontend/components/app/stage-note-form.tsx` | Rewrite | The cream card, read mode and edit mode |
| `frontend/components/app/stage-note-form.spec.tsx` | Rewrite | The card's modes, focus, save and remove |
| `frontend/components/app/stage-items.tsx` | Rewrite | The list only; rows and Add call `onOpen` |
| `frontend/components/app/stage-items.spec.tsx` | Rewrite | The list |
| `frontend/components/app/stage-item-view.tsx` | Create | One item: who has ticked it, Edit, the form, Retire |
| `frontend/components/app/stage-item-view.spec.tsx` | Create | Add, edit, retire, back |
| `frontend/e2e/phase2.e2e.ts` | Modify | Add a note; a `www.` link; the student's link |
| `docs/ARCHITECTURE.md` | Modify | The stage sheet paragraph; `NoteText`'s link rule |

---

### Task 0: Branch and the planning docs

**Files:** none changed.

- [ ] **Step 1: See what's in the working tree**

Run: `git status --short`

Expected: this feature's planning files (`docs/intent/stage-drawer-redesign.md`, this plan, `docs/design/pilot/stage-drawer-redesign/`, and `docs/BACKLOG.md` with two new rows, `stage-drawer-redesign` and `app-polish`), plus two that aren't this feature's: the untracked `draft-list.md`, and `docs/HANDOFF.md` with Tim's own uncommitted lines (Gate P4 timing passed on 3 Nov 2026, and the `seed-grid.mjs` test data to delete). **Never add `draft-list.md`.** Leave `HANDOFF.md` out of this commit; Task 6 edits it and commits it whole, so say in the final report that Tim's two lines went in with it. Anything else: stop and tell Tim.

- [ ] **Step 2: Branch and commit the planning docs**

```bash
git switch -c pilot/stage-drawer-redesign pilotMain
git add docs/intent/stage-drawer-redesign.md docs/superpowers/plans/2026-11-08-stage-drawer-redesign.md docs/design/pilot/stage-drawer-redesign docs/BACKLOG.md
git commit -m "Plan the stage drawer redesign: the intent, the plan, the design and the app-polish idea"
```

---

### Task 1: `www.` addresses in notes become links

Its own commit (R-6). Students see the change too: a `www.` address in a teacher's note becomes a link.

**Files:**
- Modify: `frontend/lib/app/note-text.ts`
- Modify: `frontend/lib/app/note-text.test.ts`
- Modify: `frontend/components/app/note-text.tsx`
- Modify: `frontend/components/app/note-text.spec.tsx`
- Modify: `docs/ARCHITECTURE.md` (the stage sheet paragraph's last sentence)

- [ ] **Step 1: Write the failing tests**

In `frontend/lib/app/note-text.test.ts`, a link part now carries `text` too. Replace the four `noteParts` tests with:

```ts
  test('http(s) addresses become links; trailing punctuation stays text', () => {
    assert.deepEqual(noteParts('Sign up (https://example.ie/slots). Thanks'), [
      { kind: 'text', text: 'Sign up (' },
      { kind: 'link', href: 'https://example.ie/slots', text: 'https://example.ie/slots' },
      { kind: 'text', text: '). Thanks' },
    ]);
  });

  test('a www. address becomes a link to https, shown as typed', () => {
    assert.deepEqual(noteParts('Examples at www.example.ie/2025. Page 88'), [
      { kind: 'text', text: 'Examples at ' },
      { kind: 'link', href: 'https://www.example.ie/2025', text: 'www.example.ie/2025' },
      { kind: 'text', text: '. Page 88' },
    ]);
  });

  test('a closing bracket that closes one inside the address stays in the link', () => {
    const wiki = 'https://en.wikipedia.org/wiki/Osmosis_(biology)';
    assert.deepEqual(noteParts(`Read ${wiki} first`), [
      { kind: 'text', text: 'Read ' },
      { kind: 'link', href: wiki, text: wiki },
      { kind: 'text', text: ' first' },
    ]);
    assert.deepEqual(noteParts(`(see ${wiki}).`), [
      { kind: 'text', text: '(see ' },
      { kind: 'link', href: wiki, text: wiki },
      { kind: 'text', text: ').' },
    ]);
  });

  test('a closing bracket with no opening one in the address belongs to the sentence', () => {
    assert.deepEqual(noteParts('(see https://example.ie/a)'), [
      { kind: 'text', text: '(see ' },
      { kind: 'link', href: 'https://example.ie/a', text: 'https://example.ie/a' },
      { kind: 'text', text: ')' },
    ]);
  });

  test('nothing else becomes a link', () => {
    assert.deepEqual(noteParts('javascript:alert(1) or example.ie or awww.example.ie'), [
      { kind: 'text', text: 'javascript:alert(1) or example.ie or awww.example.ie' },
    ]);
  });
```

Keep the `recentlyUpdated` test as it is.

In `frontend/components/app/note-text.spec.tsx`, add inside the `describe`:

```tsx
  it("shows a www. address as typed, linking to it over https", () => {
    render(<NoteText text="Examples at www.example.ie/2025" />);
    const link = screen.getByRole("link", { name: "www.example.ie/2025 (opens in a new tab)" });
    expect(link).toHaveAttribute("href", "https://www.example.ie/2025");
    expect(link).toHaveTextContent(/^www\.example\.ie\/2025$/);
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && node --test lib/app/note-text.test.ts && npx vitest run components/app/note-text.spec.tsx`
Expected: FAIL. The `node --test` cases fail on the missing `text` field and on the `www.` case; the spec fails to find the link.

- [ ] **Step 3: Make them pass**

In `frontend/lib/app/note-text.ts`:

```ts
export type NotePart = { kind: 'text'; text: string } | { kind: 'link'; href: string; text: string };

// Only http(s) and www. addresses, so `javascript:` and friends never become links. Rendered as React elements, never
// as HTML. `\b` keeps a www. inside a longer word ("awww.") from starting one.
const LINK = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;
```

and in `noteParts`, replace the loop body:

```ts
  for (const match of text.matchAll(LINK)) {
    const shown = linkEnd(match[0]);
    const start = match.index ?? 0;
    if (start > rest) parts.push({ kind: 'text', text: text.slice(rest, start) });
    // A www. address has no scheme, so as an href it would be relative to the page (plan stage-drawer-redesign R-10).
    parts.push({ kind: 'link', href: /^www\./i.test(shown) ? `https://${shown}` : shown, text: shown });
    rest = start + shown.length;
  }
```

In `frontend/components/app/note-text.tsx`, update the doc comment and the link:

```tsx
/** A teacher's note as written: line breaks kept, http(s) and www. links opening in a new tab (S-26, R-10). */
export function NoteText({ text }: { text: string }) {
  return (
    <p className="text-app-base break-words whitespace-pre-wrap text-app-ink">
      {noteParts(text).map((part, i) =>
        part.kind === "text" ? (
          part.text
        ) : (
          <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" aria-label={`${part.text} (opens in a new tab)`} className={textLink}>
            {part.text}
          </a>
        ),
      )}
    </p>
  );
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `cd frontend && node --test lib/app/note-text.test.ts && npx vitest run components/app/note-text.spec.tsx components/app/stage-card.spec.tsx components/app/stage-note-form.spec.tsx`
Expected: PASS (the last two use `https://` links, which are unchanged).

- [ ] **Step 5: Keep ARCHITECTURE true**

In `docs/ARCHITECTURE.md`, the stage sheet paragraph ends "…and only `http(s)` addresses become links (trailing …), built as React elements and never as HTML, each opening in a new tab with the accessible name "<address> (opens in a new tab)"." Change it to:

> …and only `http(s)` and `www.` addresses become links (a `www.` address links to `https://` plus what was typed; trailing `.,;:!?]'"` left out, and a trailing `)` too unless it closes a `(` inside the address), built as React elements and never as HTML, each opening in a new tab with the accessible name "<address as typed> (opens in a new tab)".

- [ ] **Step 6: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add frontend/lib/app/note-text.ts frontend/lib/app/note-text.test.ts frontend/components/app/note-text.tsx frontend/components/app/note-text.spec.tsx docs/ARCHITECTURE.md
git commit -m "Make www. addresses in teachers' notes clickable, linking to https"
```

---

### Task 2: The new tokens

**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `docs/design/UI-STANDARDS.md`

No test: tokens are values, not behaviour. Tasks 3–5 use them, and `make e2e`'s axe checks measure their contrast on the real page.

- [ ] **Step 1: Add the tokens**

In `frontend/app/globals.css`, in `:root`, after `--app-hide-blur` (end of the D-11 / D-7 block), add:

```css
  /* Stage drawer redesign — design B (docs/design/pilot/stage-drawer-redesign/NOTES.md): white cards on a grey tray,
     the checkpoint as a navy card, the teacher's note as a cream card. Named to be shared: B may become the whole
     app's look (BACKLOG app-polish). Ratios by WCAG relative luminance. */
  --app-tray: #F1F3F6;                  /* behind the sheet's cards; ink 16.6:1, muted 4.86:1 */
  --app-approved-on-accent: #7FD1A8;    /* "signed off" on the navy card; 6.13:1 on --app-accent */
  --app-attention-on-accent: #F2B15C;   /* "waiting" bar segment on the navy card, never text; 5.9:1 on --app-accent */
  --app-accent-track: #4A6396;          /* the rest of a bar on the navy card; 3.29:1 / 3.19:1 against the two above */
  --app-note-ground: #FBF4E6;           /* the cream note card; ink 16.9:1, navy link 10.2:1 */
  --app-note-line: #EBDDC2;             /* its border, decorative */
  --app-note-muted: #5C5340;            /* secondary text on the note card; 6.93:1 */
```

In the `@theme inline` block, after `--color-app-today-ring: var(--app-today-ring);`, add:

```css
  /* Stage drawer redesign (docs/design/pilot/stage-drawer-redesign/NOTES.md). */
  --color-app-tray: var(--app-tray);
  --color-app-approved-on-accent: var(--app-approved-on-accent);
  --color-app-attention-on-accent: var(--app-attention-on-accent);
  --color-app-accent-track: var(--app-accent-track);
  --color-app-note-ground: var(--app-note-ground);
  --color-app-note-line: var(--app-note-line);
  --color-app-note-muted: var(--app-note-muted);
```

None of these names ends like a `--text-app-*` size (`label`, `help`, `small`, `meta`, `base`, `lead`, `title`, `section`…), so `text-app-note-muted` is always a colour (UI-STANDARDS §2).

- [ ] **Step 2: Say what they mean**

In `docs/design/UI-STANDARDS.md` §5, after the `--app-pick` bullet, add:

```markdown
- The stage sheet's look (design B, plan stage-drawer-redesign): white cards on `--app-tray`, the stage's checkpoint as the one navy card (`bg-app-accent`, with `--app-approved-on-accent`, `--app-attention-on-accent` and `--app-accent-track` for its bar), and the teacher's note as a cream card (`--app-note-*`). Only the stage sheet uses them so far; whether they go app-wide is the `app-polish` idea in `docs/BACKLOG.md`.
```

- [ ] **Step 3: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add frontend/app/globals.css docs/design/UI-STANDARDS.md
git commit -m "Add the stage drawer's tokens: the grey tray, the navy card's bar colours and the cream note"
```

---

### Task 3: The sheet's new layout

The header gains the navy stage number; the date becomes one row; then the tray holds the navy checkpoint card, the guidelines card, the note and the items in white cards, and the prompts at the bottom. The note and items keep their current insides here; Tasks 4 and 5 change those.

**Files:**
- Modify: `frontend/lib/app/stage-sheet.ts`
- Modify: `frontend/lib/app/stage-sheet.test.ts`
- Modify: `frontend/components/app/stage-sheet.tsx`
- Modify: `frontend/components/app/stage-sheet.spec.tsx`

- [ ] **Step 1: Write the failing tests**

In `frontend/lib/app/stage-sheet.test.ts`, import `countsLabel` with the other helpers and add to `describe('stage sheet progress helpers', …)`:

```ts
  test('countsLabel says what the checkpoint bar draws, in words', () => {
    assert.equal(countsLabel({ signedOff: 4, waiting: 3, notYet: 24 }), '4 signed off, 3 waiting, 24 not yet, of 31 students');
    assert.equal(countsLabel({ signedOff: 1, waiting: 0, notYet: 0 }), '1 signed off, 0 waiting, 0 not yet, of 1 student');
  });
```

In `frontend/components/app/stage-sheet.spec.tsx`, add inside the `describe`:

```tsx
  it("puts the checkpoint first, then the guidelines, the note and the items", async () => {
    renderSheet();
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    const order = ["Checkpoint", "From the guidelines", "Your note for students", "Your items in this stage"].map((text) =>
      within(sheet).getByText(text),
    );
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("draws the checkpoint's counts as a bar named in words", async () => {
    renderSheet();
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    expect(within(sheet).getByRole("img", { name: "0 signed off, 1 waiting, 1 not yet, of 2 students" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && node --test lib/app/stage-sheet.test.ts; npx vitest run components/app/stage-sheet.spec.tsx`
Expected: FAIL. `countsLabel` is not exported; the order test fails (the note comes before the guidelines today); no `img` named that way.

- [ ] **Step 3: Add the helper**

In `frontend/lib/app/stage-sheet.ts`, change the progress import to `import { fullName, studentCount } from './progress.ts';` and add after `checkpointCounts`:

```ts
/** The checkpoint bar's accessible name (plan stage-drawer-redesign R-17): the counts it draws, in words. */
export function countsLabel(counts: CheckpointCounts): string {
  const total = counts.signedOff + counts.waiting + counts.notYet;
  return `${counts.signedOff} signed off, ${counts.waiting} waiting, ${counts.notYet} not yet, of ${studentCount(total)}`;
}
```

(`studentCount` in `lib/app/progress.ts` already says "1 student" / "2 students".)

- [ ] **Step 4: Re-lay-out the sheet**

In `frontend/components/app/stage-sheet.tsx`:

Imports: add `import { BookOpen } from "lucide-react";` and change the last two imports to

```tsx
import { checkpointCounts, countsLabel, type DateRequest } from "@/lib/app/stage-sheet";
…
import { card, eyebrow } from "./styles";
```

(`lead` is no longer used; remove it.) Delete `const sectionLabel = …`. Update the doc comment's first sentence to: `The stage sheet (plan stage-sheet; redesigned to design B, plan stage-drawer-redesign).`

Replace everything from `return (` in `SheetBody` down to (not including) `{request && (` with:

```tsx
  return (
    <>
      <div className="flex items-start gap-3 border-b border-app-line bg-app-surface px-4 pt-3 pb-3.5 sm:pt-4">
        {/* R-18: the line beside it already says "Stage 3". */}
        <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center rounded-app-card bg-app-accent font-heading text-[22px] font-bold text-app-on-accent">
          {stage.ordinal}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {meta && <p className="text-app-small text-app-muted">{meta}</p>}
          <DrawerTitle ref={title} tabIndex={-1} className="text-[20px] leading-[1.25] text-balance">
            {stage.name}
          </DrawerTitle>
        </div>
        <DrawerClose render={<Button type="button" variant="outline" />}>Close</DrawerClose>
      </div>

      <div hidden={request !== null} className="min-h-0 flex-1 overflow-y-auto bg-app-tray">
        <div className="border-b border-app-line bg-app-surface px-4 pt-1 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <label htmlFor={boxId} className="text-app-small font-bold text-app-ink">Stage date</label>
              <p id={whenId} className="text-app-help text-app-muted">
                {value ? weekdayDate(value) : "No date yet"}
                {pending && (
                  <>
                    {" · "}
                    <strong className="font-semibold text-app-ink">not saved</strong>
                  </>
                )}
              </p>
            </div>
            <DateBox
              opener={{
                ref: dateBox,
                onClick: (event) =>
                  ask({
                    title: `Choose the ${label} date`,
                    eyebrow: "", // The header just above already names the stage (S-33).
                    help: "Nothing is saved until you press Save this date.",
                    picking: { kind: "stage", ordinal: stage.ordinal },
                    value,
                    onPick: changeDate,
                    from: event.currentTarget,
                  }),
              }}
              id={boxId}
              value={value}
              describedBy={whenId}
              className={`w-[172px] flex-none cursor-pointer py-2.5 pr-2.5 pl-3 hover:border-app-accent hover:bg-app-accent-tint ${pending ? "border-dashed border-app-accent" : "border-app-field-border"}`}
            />
          </div>
          {pending && (
            <>
              <div className="mt-3 flex items-center gap-2">
                <Button type="button" size="header" disabled={busy} aria-describedby={helpId} onClick={() => void save()}>
                  {busy ? "Saving…" : "Save this date"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="header"
                  disabled={busy}
                  onClick={() => {
                    changeDate(saved);
                    dateBox.current?.focus(); // Undo is about to go; the box stays (S-32).
                  }}
                >
                  Undo
                </Button>
              </div>
              <p id={helpId} className="mt-2 text-app-small text-app-grey">
                {`Saves ${label}'s date only. Other dates you've changed on the page stay unsaved until you press Save dates there.`}
              </p>
            </>
          )}
          {/* Always rendered, so the change of text is announced (Concepts in play, "A persistent live region"). */}
          <p role="status" className="text-app-small font-semibold text-app-approved empty:hidden">
            {justSaved ? `${label}'s date saved.` : ""}
          </p>
          {error && (
            <div className="mt-3">
              <ErrorPanel error={error} fieldLabel={fieldLabel} focus />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 p-3">
          {stage.checkpoint && (
            <section aria-labelledby={`${id}-checkpoint`} className="rounded-app-card bg-app-accent p-[18px] text-app-on-accent">
              <h3 id={`${id}-checkpoint`} className={`${eyebrow} text-app-on-accent-muted`}>Checkpoint</h3>
              <p className="mt-1.5 font-heading text-[20px] leading-[1.28] font-bold tracking-[-.01em] text-balance">{stage.checkpoint}</p>
              {!progress.ok ? (
                <p className="mt-3 text-app-small text-app-on-accent-muted">{"Couldn't load the class's progress, so the counts aren't shown. Reload to try again."}</p>
              ) : progress.data.students.length === 0 ? (
                <p className="mt-3 text-app-small text-app-on-accent-muted">No students in the class yet.</p>
              ) : counts && (
                <>
                  <div role="img" aria-label={countsLabel(counts)} data-private className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
                    {counts.signedOff > 0 && <span className="bg-app-approved-on-accent" style={{ flexGrow: counts.signedOff }} />}
                    {counts.waiting > 0 && <span className="bg-app-attention-on-accent" style={{ flexGrow: counts.waiting }} />}
                    {counts.notYet > 0 && <span className="bg-app-accent-track" style={{ flexGrow: counts.notYet }} />}
                  </div>
                  <p className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-app-help text-app-on-accent-muted">
                    <span data-private><b className="font-bold text-app-approved-on-accent">{counts.signedOff}</b> signed off</span>
                    {counts.waiting === 0 && <span data-private><b className="font-bold text-app-on-accent">0</b> waiting</span>}
                    <span data-private><b className="font-bold text-app-on-accent">{counts.notYet}</b> not yet</span>
                  </p>
                  {counts.waiting > 0 && (
                    <Link
                      href={`/teach/classes/${classId}/progress`}
                      data-private
                      onClick={(event) => {
                        if (hasUnsaved && !window.confirm("Leave without saving your changes?")) event.preventDefault();
                      }}
                      className="mt-3 flex min-h-11 items-center justify-between rounded-app-control bg-app-attention-tint px-3 text-app-small font-bold text-app-attention focus-visible:outline-app-on-accent"
                    >
                      {`${counts.waiting} waiting for you`}
                      <span aria-hidden="true">›</span>
                    </Link>
                  )}
                </>
              )}
            </section>
          )}

          <section aria-labelledby={`${id}-official`} className={`${card} px-[18px] py-4`}>
            <h3 id={`${id}-official`} className="flex items-center gap-2 font-heading text-app-base font-bold text-app-accent">
              <BookOpen aria-hidden="true" className="size-[17px]" />
              From the guidelines
            </h3>
            <p className="mt-2 text-app-base leading-normal text-pretty text-app-ink">{stage.description}</p>
          </section>

          <div className={`${card} px-[18px] py-4`}>
            <StageNoteForm
              componentId={componentId}
              stageId={stage.id}
              note={stage.note}
              draft={noteDrafts[stage.id] ?? stage.note?.text ?? ""}
              onDraft={(text) => onNoteDraft(stage.id, text)}
            />
          </div>

          <div className={`${card} px-[18px] py-4`}>
            <StageItems componentId={componentId} stage={stage} stages={stages} chooseDate={ask} progress={progress} />
          </div>

          {stage.prompts.length > 0 && (
            <details className={`${card} px-[18px] py-1.5`}>
              <summary className="cursor-pointer py-2.5 text-app-base font-semibold text-app-accent">
                {`Questions students get from the guidelines (${stage.prompts.length})`}
              </summary>
              <ul className="mb-2.5 flex list-disc flex-col gap-1 pl-5">
                {stage.prompts.map((prompt, i) => (
                  <li key={i} className="text-app-base text-app-copy">
                    {prompt.heading && (i === 0 || stage.prompts[i - 1].heading !== prompt.heading) && (
                      <span className="block text-app-small text-app-grey">{prompt.heading}</span>
                    )}
                    {prompt.text}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>

```

Notes for the implementer:

- The `focus-visible:outline-app-on-accent` on the waiting link: the app's focus outline is navy (`globals.css`, `.app-theme … :focus-visible`), which vanishes on the navy card. White keeps it visible.
- The `role="status"` line keeps its element but hides when empty (`empty:hidden`), so it doesn't add a gap under the date row.
- The `style={{ flexGrow }}` on the bar's segments is a number, not a colour, so it doesn't break "no raw colour".
- Drop the old `sm:px-6` / `sm:text-app-section` classes: the sheet is 520px at most (`--app-sheet-width`), and B uses 16px sides and a 20px title at every width.

- [ ] **Step 5: Run the tests to see them pass**

Run: `cd frontend && node --test lib/app/stage-sheet.test.ts && npx vitest run components/app/stage-sheet.spec.tsx`
Expected: PASS, including the existing cases ("1 waiting for you" is still a link with that name; the `›` is hidden from it).

- [ ] **Step 6: Look at it**

Run `make db-up`, `make backend-run`, `make frontend-run`; sign in as a teacher with a component (`docs/guides/`'s seed script, or `scripts/operator.sh`), open the Component tab, click a stage. Check against `NavyCheckpoint.dc.html` on the canvas: the navy square and title; the date row; the navy card with the bar; the guidelines card; the grey tray between cards. At 390px wide: nothing overflows, the date box sits beside its label. Say in the report what you checked.

- [ ] **Step 7: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add frontend/lib/app/stage-sheet.ts frontend/lib/app/stage-sheet.test.ts frontend/components/app/stage-sheet.tsx frontend/components/app/stage-sheet.spec.tsx
git commit -m "Lay out the stage sheet as design B: checkpoint first as a navy card, then the guidelines, note and items as cards"
```

---

### Task 4: The note as one card, read first, Edit in place

**Files:**
- Rewrite: `frontend/components/app/stage-note-form.tsx`
- Rewrite: `frontend/components/app/stage-note-form.spec.tsx`
- Modify: `frontend/components/app/stage-sheet.tsx` (drop the white wrapper round the note)

- [ ] **Step 1: Write the failing tests**

Replace `frontend/components/app/stage-note-form.spec.tsx` with:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";
import type { StageNote } from "@/lib/api/schemas";

import { StageNoteForm } from "./stage-note-form";

/** The page keeps the draft (S-21); `initial` stands in for one left unsaved earlier. */
function Harness({ note, initial }: { note: StageNote | null; initial?: string }) {
  const [draft, setDraft] = useState(initial ?? note?.text ?? "");
  return <StageNoteForm componentId="k1" stageId="s2" note={note} draft={draft} onDraft={setDraft} />;
}

// A request the test settles by hand, to look at the form while it is in flight.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const box = () => screen.getByRole("textbox", { name: "Your note for students" });

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("StageNoteForm", () => {
  it("shows a saved note as students see it, links included, and Edit turns it into the box", async () => {
    render(<Harness note={{ text: "Slots: www.example.ie/slots", updatedOn: "2026-10-28" }} />);
    expect(screen.getByRole("link", { name: "www.example.ie/slots (opens in a new tab)" })).toHaveAttribute("href", "https://www.example.ie/slots");
    expect(screen.getByText("Saved 28 Oct 2026")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit your note" }));
    expect(box()).toHaveValue("Slots: www.example.ie/slots");
    expect(box()).toHaveFocus();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("Cancel puts the saved note back and focus on Edit", async () => {
    render(<Harness note={{ text: "Old", updatedOn: "2026-10-28" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit your note" }));
    await userEvent.type(box(), " and new");
    expect(screen.getByText("Not saved yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Old")).toBeInTheDocument();
    expect(screen.queryByText("Not saved yet")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit your note" })).toHaveFocus();
  });

  it("with no note, Add a note opens the box; Save note sends it trimmed and shows it as students will", async () => {
    vi.mocked(api.send).mockResolvedValue({ text: "Bring a lab coat", updatedOn: "2026-10-31" });
    render(<Harness note={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Add a note" }));
    await userEvent.type(box(), "Bring a lab coat ");
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/stages/s2/note", { text: "Bring a lab coat" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
    expect(await screen.findByText("Saved just now")).toBeInTheDocument();
    expect(screen.getByText("Bring a lab coat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit your note" })).toHaveFocus();
  });

  it("an unsaved note from earlier opens on the box (S-21)", () => {
    render(<Harness note={null} initial="Half a thought" />);
    expect(box()).toHaveValue("Half a thought");
    expect(screen.getByText("Not saved yet")).toBeInTheDocument();
  });

  it("an emptied box removes the note, locked while it goes, and the card goes back to Add a note", async () => {
    const request = deferred<void>();
    vi.mocked(api.sendNoContent).mockReturnValue(request.promise);
    const { rerender } = render(<Harness note={{ text: "Old", updatedOn: "2026-10-28" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit your note" }));
    await userEvent.clear(box());
    await userEvent.click(screen.getByRole("button", { name: "Remove note" }));

    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/stages/s2/note");
    expect(box()).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Removing…" })).toBeDisabled();

    request.resolve();
    expect(await screen.findByText("Note removed")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add a note" })).toHaveFocus());

    // The page's refresh lands: the stage has no note now, and the line still says what happened.
    rerender(<Harness note={null} />);
    expect(screen.getByText("Note removed")).toBeInTheDocument();
  });

  it("spaces alone are nothing to save", async () => {
    render(<Harness note={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Add a note" }));
    await userEvent.type(box(), "   ");
    expect(screen.getByRole("button", { name: "Save note" })).toBeDisabled();
    expect(screen.queryByText("Not saved yet")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && npx vitest run components/app/stage-note-form.spec.tsx`
Expected: FAIL: there is no "Edit your note" or "Add a note" button, and the box is always showing.

- [ ] **Step 3: Rewrite the card**

Replace `frontend/components/app/stage-note-form.tsx` with:

```tsx
"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api/client";
import { noteSchema, type StageNote } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { NOTE_MAX } from "@/lib/app/note-text";

import { ErrorPanel } from "./error-panel";
import { NoteText } from "./note-text";

const heading = "font-heading text-app-base font-bold text-app-ink";

/**
 * The teacher's note on one stage (plan stage-sheet S-8, S-22; plan stage-drawer-redesign R-4, R-11 to R-13). One cream
 * card: at rest it shows the note as students see it, and Edit turns the same card into the box. The draft lives in the
 * page (S-21), so an unsaved note survives closing the sheet, and the card then opens on the box.
 */
export function StageNoteForm({ componentId, stageId, note, draft, onDraft }: {
  componentId: string;
  stageId: string;
  note: StageNote | null;
  draft: string;
  onDraft: (text: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  /** Edit, or Add a note: whichever the card shows at rest. */
  const opener = useRef<HTMLButtonElement>(null);
  /** Set by a handler that changes mode; the effect below moves focus once the new mode has rendered (R-13). */
  const focusNext = useRef(false);
  const id = `note-${stageId}`;
  const path = `/components/${componentId}/stages/${stageId}/note`;
  const text = draft.trim();
  // Compared trimmed, as Spring strips the text and refuses a blank one: spaces alone are nothing to save.
  const differs = text !== (note?.text ?? "");
  // The page refreshes after a save without waiting, so for one round trip the note just saved still differs from the
  // page's: that moment is "saved", not "not saved". It remembers what was sent, so typing anything else is unsaved again.
  const justSaved = savedAs === text;
  const dirty = differs && !justSaved;
  const removing = text === "" && note !== null;
  // What students see now: the note just saved, until the page has caught up with it.
  const shown = savedAs ?? note?.text ?? "";
  const [editing, setEditing] = useState(dirty);
  // Once the page has caught up a removed note is gone, `differs` is false and `note` is null: `justSaved` is what still
  // knows it was removed, so the line keeps saying so instead of going blank.
  const status = dirty
    ? "Not saved yet"
    : differs
      ? (text ? "Saved just now" : "Note removed")
      : note
        ? `Saved ${formatCalendarDate(note.updatedOn)}`
        : justSaved ? "Note removed" : "";

  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    (editing ? box.current : opener.current)?.focus();
  }, [editing]);

  function toMode(next: boolean) {
    focusNext.current = true;
    setEditing(next);
  }

  function cancel() {
    setError(null);
    onDraft(shown);
    toMode(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // The trimmed text is what's sent: Java's strip and JavaScript's trim drop different characters (a pasted
      // non-breaking space), so the raw box could store text the form then never matches.
      if (removing) await api.sendNoContent("DELETE", path);
      else await api.send("PUT", path, { text }, noteSchema);
      setSavedAs(text);
      // The server drops whitespace either side; match it so the saved note and the draft agree after the refresh.
      onDraft(text);
      toMode(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="rounded-app-card border border-app-note-line bg-app-note-ground px-[18px] pt-2 pb-4">
      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-2">
          <label id={`${id}-heading`} htmlFor={id} className={`flex min-h-11 items-center ${heading}`}>Your note for students</label>
          <p id={`${id}-help`} className="text-app-help text-app-note-muted">Shown to students above the guidelines. Web links become clickable.</p>
          <Textarea
            id={id}
            ref={box}
            rows={5}
            value={draft}
            readOnly={busy}
            maxLength={NOTE_MAX}
            aria-describedby={`${id}-help ${id}-count`}
            onChange={(event) => onDraft(event.target.value)}
            className="border-2 border-app-accent bg-app-surface"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p id={`${id}-count`} className="text-app-help text-app-note-muted tabular-nums">
              {`${draft.length.toLocaleString("en-IE")} / ${NOTE_MAX.toLocaleString("en-IE")}`}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="header" disabled={busy} onClick={cancel}>
                Cancel
              </Button>
              <Button type="submit" size="header" disabled={busy || !dirty}>
                {busy ? (removing ? "Removing…" : "Saving…") : removing ? "Remove note" : "Save note"}
              </Button>
            </div>
          </div>
          {error && <ErrorPanel error={error} focus />}
        </form>
      ) : shown ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <h3 id={`${id}-heading`} className={heading}>Your note for students</h3>
            <Button ref={opener} type="button" variant="ghost" size="header" aria-label="Edit your note" onClick={() => toMode(true)} className="-mr-2 text-app-accent">
              <Pencil aria-hidden="true" />
              Edit
            </Button>
          </div>
          <NoteText text={shown} />
        </>
      ) : (
        <>
          <h3 id={`${id}-heading`} className={`flex min-h-11 items-center ${heading}`}>Your note for students</h3>
          <p className="mb-3 text-app-small text-app-note-muted">Students only see the guidelines for this stage.</p>
          <Button ref={opener} type="button" variant="outline" size="header" onClick={() => toMode(true)} className="border-app-accent text-app-accent">
            <Plus aria-hidden="true" />
            Add a note
          </Button>
        </>
      )}
      <p className="mt-2.5 text-app-help text-app-note-muted">
        {!editing && shown && "How students see it · "}
        {/* Always rendered, so the change of text is announced. */}
        <span role="status">{status}</span>
      </p>
    </section>
  );
}
```

Notes for the implementer:

- `Textarea`'s own classes come through `cn()`; `border-2 border-app-accent bg-app-surface` are colours and a border width, no `--text-app-*` size, so the UI-STANDARDS §2 rule isn't hit.
- The status span must stay rendered in every mode: it's the live region that announces "Saved just now" and "Note removed".
- If the save fails, the card stays in edit mode with the error under the buttons.

- [ ] **Step 4: Drop the sheet's white wrapper round the note**

In `frontend/components/app/stage-sheet.tsx`, the card is now the note's own. Replace

```tsx
          <div className={`${card} px-[18px] py-4`}>
            <StageNoteForm
              …
            />
          </div>
```

with the bare `<StageNoteForm … />` (same props).

- [ ] **Step 5: Run the tests to see them pass**

Run: `cd frontend && npx vitest run components/app/stage-note-form.spec.tsx components/app/stage-sheet.spec.tsx`
Expected: PASS. (The sheet's order test still finds "Your note for students": with no note it's the empty card's heading.)

- [ ] **Step 6: Update the journey's note step**

In `frontend/e2e/phase2.e2e.ts`, replace the teacher's note step (the comment "Stage sheet Part 3: a note for students, with a link the preview already shows clickable." and the four lines under it, up to and including `await expect(sheet.getByText(/^Saved/)).toBeVisible();`) with:

```ts
  // The teacher's note (plan stage-drawer-redesign): Add a note opens the card's box; once saved, the card shows the
  // note as students will see it, its www. address a link.
  await sheet.getByRole("button", { name: "Add a note" }).click();
  await sheet.getByRole("textbox", { name: "Your note for students" }).fill("Feedback slots on Thursday. Sign up: www.example.ie/slots");
  await sheet.getByRole("button", { name: "Save note" }).click();
  await expect(sheet.getByRole("link", { name: "www.example.ie/slots (opens in a new tab)" })).toHaveAttribute("href", "https://www.example.ie/slots");
  await expect(sheet.getByText(/Saved/)).toBeVisible();
```

and in the student's part, replace

```ts
  await expect(student.getByRole("link", { name: /https:\/\/example\.ie\/slots/ })).toHaveAttribute("target", "_blank");
```

with

```ts
  await expect(student.getByRole("link", { name: "www.example.ie/slots (opens in a new tab)" })).toHaveAttribute("target", "_blank");
```

`make e2e` runs in Task 6.

- [ ] **Step 7: Look at it**

With the app running (Task 3, Step 6): a stage with a note shows the cream card and Edit; Edit opens the box in the same card; Cancel and Save note bring it back. A stage with no note shows "Add a note". Type in the box, close the sheet, reopen it: the card opens on the box with "Not saved yet". Tab through it with the keyboard: focus follows Edit → box → Save note → Edit.

- [ ] **Step 8: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add frontend/components/app/stage-note-form.tsx frontend/components/app/stage-note-form.spec.tsx frontend/components/app/stage-sheet.tsx frontend/e2e/phase2.e2e.ts
git commit -m "Make the teacher's note one cream card: read it as students will, Edit it in place"
```

---

### Task 5: Items open as a view inside the sheet

`StageItems` becomes the list only. A new `StageItemView` takes the sheet's place when a row or "Add an item" is pressed, the way the calendar view does, and the calendar can open from it and come back to it.

**Files:**
- Modify: `frontend/lib/app/stage-sheet.ts` (`ADD_ITEM`)
- Rewrite: `frontend/components/app/stage-items.tsx`
- Rewrite: `frontend/components/app/stage-items.spec.tsx`
- Create: `frontend/components/app/stage-item-view.tsx`
- Create: `frontend/components/app/stage-item-view.spec.tsx`
- Modify: `frontend/components/app/stage-sheet.tsx`
- Modify: `frontend/components/app/stage-sheet.spec.tsx`

- [ ] **Step 1: Write the failing tests**

Replace `frontend/components/app/stage-items.spec.tsx` with:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StageItems } from "./stage-items";

const stages = [
  { id: "s1", ordinal: 1, label: "Stage 1", name: "One", dueDate: null, items: [{ id: "i1", text: "Read the brief", dueDate: "2026-09-18" }] },
  { id: "s2", ordinal: 2, label: "Stage 2", name: "Two", dueDate: null, items: [{ id: "i2", text: "Bring three questions", dueDate: "2026-10-06" }] },
];

// No students, so every item has 0 ticked.
const emptyGrid = { componentId: "k1", classId: "c1", className: "6A", today: "2026-10-01", stages: [], students: [], waiting: [], itemTicks: [] };
const onOpen = vi.fn();

const renderItems = () => render(<StageItems stage={stages[1]} stages={stages} progress={{ ok: true, data: emptyGrid }} onOpen={onOpen} />);

beforeEach(() => onOpen.mockReset());

describe("StageItems", () => {
  it("lists only this stage's items, keeping their letters from the whole component", () => {
    renderItems();
    expect(screen.getByRole("button", { name: "B Bring three questions 0 ticked 6 Oct 2026" })).toBeInTheDocument();
    expect(screen.queryByText("Read the brief")).not.toBeInTheDocument();
  });

  it("a row opens its item, and Add an item opens a new one", async () => {
    renderItems();
    await userEvent.click(screen.getByRole("button", { name: /^B Bring three questions/ }));
    expect(onOpen).toHaveBeenCalledWith("i2");
    await userEvent.click(screen.getByRole("button", { name: "Add an item to Stage 2" }));
    expect(onOpen).toHaveBeenCalledWith("new");
  });
});
```

Create `frontend/components/app/stage-item-view.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";
import { type DateRequest, stageItems } from "@/lib/app/stage-sheet";

import { StageItemView } from "./stage-item-view";

const stages = [
  { id: "s1", ordinal: 1, label: "Stage 1", name: "One", dueDate: null, items: [{ id: "i1", text: "Read the brief", dueDate: "2026-09-18" }] },
  { id: "s2", ordinal: 2, label: "Stage 2", name: "Two", dueDate: null, items: [{ id: "i2", text: "Bring three questions", dueDate: "2026-10-06" }] },
];
const item = stageItems(stages, "s2")[0]; // letter B

const emptyGrid = { componentId: "k1", classId: "c1", className: "6A", today: "2026-10-01", stages: [], students: [], waiting: [], itemTicks: [] };
// The sheet answers a date request by showing its calendar; here the "calendar" picks 8 Oct at once.
const chooseDate = vi.fn((request: DateRequest) => request.onPick("2026-10-08"));
const onBack = vi.fn();

const renderView = (shown: typeof item | null) =>
  render(<StageItemView componentId="k1" stage={stages[1]} item={shown} progress={{ ok: true, data: emptyGrid }} chooseDate={chooseDate} heading={createRef()} onBack={onBack} />);

beforeEach(() => {
  refresh.mockReset();
  chooseDate.mockClear();
  onBack.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("StageItemView", () => {
  it("a new item opens on the form; Save item adds it to this stage and goes back to Add an item", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i3", text: "Draft question", dueDate: "2026-10-08" });
    renderView(null);
    await userEvent.type(screen.getByRole("textbox", { name: "Item" }), "Draft question");
    await userEvent.click(screen.getByLabelText("Date (optional)"));
    expect(chooseDate).toHaveBeenCalledWith(expect.objectContaining({ title: "Choose the date for “Draft question”", picking: { kind: "item" } }));
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/components/k1/teacher-items",
      { stageId: "s2", text: "Draft question", dueDate: "2026-10-08" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalledWith("add");
  });

  it("an item opens on who has ticked it; Edit and Save item saves through its own endpoint and stays on the item", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i2", text: "Bring four questions", dueDate: "2026-10-06" });
    renderView(item);
    expect(screen.getByRole("heading", { name: "Who has ticked it" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit this item" }));
    const text = screen.getByRole("textbox", { name: "Item" });
    expect(text).toHaveFocus();
    await userEvent.clear(text);
    await userEvent.type(text, "Bring four questions");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("PATCH", "/components/k1/teacher-items/i2",
      { text: "Bring four questions", dueDate: "2026-10-06" }, expect.anything());
    expect(await screen.findByRole("button", { name: "Edit this item" })).toHaveFocus();
    expect(onBack).not.toHaveBeenCalled();
  });

  it("retires an item only after confirming, then goes back to Add an item", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    renderView(item);
    await userEvent.click(screen.getByRole("button", { name: "Edit this item" }));
    await userEvent.click(screen.getByRole("button", { name: "Retire Bring three questions" }));
    const confirm = screen.getByText("Retire this item? Students won't see it any more.").parentElement!;
    await userEvent.click(within(confirm).getByRole("button", { name: "Retire item" }));

    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/teacher-items/i2");
    expect(onBack).toHaveBeenCalledWith("add");
  });

  it("Back returns to the stage, naming the item's row for focus", async () => {
    renderView(item);
    await userEvent.click(screen.getByRole("button", { name: "Back to Stage 2" }));
    expect(onBack).toHaveBeenCalledWith("i2");
  });
});
```

In `frontend/components/app/stage-sheet.spec.tsx`:

1. Replace the test "counts the checkpoint across the class, and lists who has and hasn't ticked an item" with:

```tsx
  it("counts the checkpoint across the class, linking the waiting count to Progress", async () => {
    renderSheet();
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    expect(within(sheet).getByRole("link", { name: "1 waiting for you" })).toHaveAttribute("href", "/teach/classes/c1/progress");
  });

  it("opens an item as a view in the sheet, naming who has ticked it, and Back puts focus on its row", async () => {
    renderSheet();
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    await userEvent.click(within(sheet).getByRole("button", { name: /Bring three questions.*1 ticked/ }));
    const view = within(sheet).getByRole("group", { name: "Bring three questions" });
    expect(within(view).getByRole("heading", { name: "Bring three questions" })).toHaveFocus();
    expect(within(sheet).getByText("From the guidelines")).not.toBeVisible();
    expect(within(view).getByRole("list", { name: /^Ticked/ })).toHaveTextContent("Cian Murphy");
    expect(within(view).getByRole("list", { name: /^Not ticked yet/ })).toHaveTextContent("Aoife Byrne");
    // Hide names blurs counts too (S-20): only the number is private, so the words around it stay readable.
    for (const heading of [/^Ticked \(1\)/, /^Not ticked yet \(1\)/]) {
      expect(within(view).getByRole("heading", { name: heading }).querySelector("[data-private]")).toHaveTextContent(/^1$/);
    }

    await userEvent.click(within(view).getByRole("button", { name: "Back to Stage 2" }));
    await waitFor(() => expect(within(sheet).getByRole("button", { name: /Bring three questions.*1 ticked/ })).toHaveFocus());
  });

  it("picks an item's date in the sheet's calendar and comes back to the item", async () => {
    renderSheet();
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    await userEvent.click(within(sheet).getByRole("button", { name: /Bring three questions.*1 ticked/ }));
    const view = within(sheet).getByRole("group", { name: "Bring three questions" });
    await userEvent.click(within(view).getByRole("button", { name: "Edit this item" }));
    await userEvent.click(within(view).getByLabelText("Date (optional)"));

    const calendar = within(sheet).getByRole("group", { name: "Choose the date for “Bring three questions”" });
    expect(within(calendar).getByRole("button", { name: "Back to item A" })).toBeInTheDocument();
    await userEvent.click(within(calendar).getByRole("button", { name: /^Thursday 8 October 2026/ }));
    await userEvent.click(within(calendar).getByRole("button", { name: "Use this date" }));

    const date = within(view).getByLabelText("Date (optional)");
    await waitFor(() => expect(date).toHaveFocus());
    expect(date).toHaveTextContent("08/10/2026");
  });
```

(In this spec's fixture the stage's only item is letter A.)

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && npx vitest run components/app/stage-items.spec.tsx components/app/stage-item-view.spec.tsx components/app/stage-sheet.spec.tsx`
Expected: FAIL: `StageItems` has no `onOpen`, `stage-item-view` doesn't exist, and rows still open in place.

- [ ] **Step 3: Add `ADD_ITEM`**

In `frontend/lib/app/stage-sheet.ts`, after `stageItems`:

```ts
/** Where focus goes when the item view closes after a new item is saved or an item is retired: "Add an item" (S-31). */
export const ADD_ITEM = 'add';
```

- [ ] **Step 4: The list**

Replace `frontend/components/app/stage-items.tsx` with:

```tsx
"use client";

import { Plus } from "lucide-react";
import { useId, useMemo } from "react";

import { Button } from "@/components/ui/button";
import type { ProgressGrid } from "@/lib/api/schemas";
import type { Attempt } from "@/lib/app/attempt";
import { formatCalendarDate, type StageLike } from "@/lib/app/component-setup";
import { studentCount } from "@/lib/app/progress";
import { stageItems, tickLists } from "@/lib/app/stage-sheet";

/**
 * One stage's items in the stage sheet (plan stage-sheet S-5, S-16; plan stage-drawer-redesign R-5). Each row, and "Add
 * an item", opens the sheet's item view through `onOpen`; nothing opens in place. Rows carry `data-item` and the add
 * button `data-add-item`, so the sheet can put focus back on them when the item view closes.
 */
export function StageItems({ stage, stages, progress, onOpen }: {
  stage: StageLike;
  stages: ReadonlyArray<StageLike>;
  progress: Attempt<ProgressGrid>;
  onOpen: (itemId: string) => void;
}) {
  const headingId = useId();
  const items = useMemo(() => stageItems(stages, stage.id), [stages, stage.id]);
  const label = stage.label ?? stage.name;

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={headingId} className="font-heading text-app-base font-bold text-app-ink">Your items in this stage</h3>
        {progress.ok && <span data-private className="text-app-help text-app-muted">{studentCount(progress.data.students.length)}</span>}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-app-small text-app-muted">No items in this stage yet. Students see your items under the stage and on their timeline.</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {items.map((item) => {
            const ticked = progress.ok ? tickLists(progress.data, item.id).ticked.length : null;
            return (
              <li key={item.id} className="border-t border-app-line">
                <button
                  type="button"
                  data-item={item.id}
                  onClick={() => onOpen(item.id)}
                  className="grid w-full grid-cols-[28px_1fr_auto] items-baseline gap-x-2.5 gap-y-0.5 rounded-app-inner py-2.5 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span
                    className={`flex size-7 items-center justify-center self-center rounded-full font-mono text-app-help font-bold ${
                      item.dueDate ? "bg-app-accent text-app-on-accent" : "border-2 border-dashed border-app-disabled text-app-muted"
                    }`}
                  >
                    {item.letter}
                  </span>{" "}
                  <span className="min-w-0 text-app-meta font-semibold break-words text-app-ink">{item.text}</span>{" "}
                  {ticked === null ? (
                    <span />
                  ) : (
                    <span
                      data-private
                      className={`rounded-full px-2 py-px text-app-label font-semibold whitespace-nowrap ${ticked > 0 ? "bg-app-approved-tint text-app-approved" : "bg-app-inset text-app-grey"}`}
                    >
                      {`${ticked} ticked`}
                    </span>
                  )}{" "}
                  <span className="col-start-2 text-app-help text-app-muted">
                    {item.dueDate ? formatCalendarDate(item.dueDate) : "No date, so not on the line or the calendar"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Button type="button" variant="outline" data-add-item onClick={() => onOpen("new")} className="mt-1.5 w-full border-app-accent text-app-accent">
        <Plus aria-hidden="true" />
        {`Add an item to ${label}`}
      </Button>
    </section>
  );
}
```

The `{" "}` between the spans keep the button's accessible name readable ("B Bring three questions 0 ticked 6 Oct 2026", S-35).

- [ ] **Step 5: The item view**

Create `frontend/components/app/stage-item-view.tsx`:

```tsx
"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, type RefObject, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type ProgressGrid, teacherItemSchema } from "@/lib/api/schemas";
import type { Attempt } from "@/lib/app/attempt";
import { type LetteredItem, type StageLike, weekdayDate } from "@/lib/app/component-setup";
import { studentCount } from "@/lib/app/progress";
import { ADD_ITEM, type DateRequest, type TickLists, tickLists } from "@/lib/app/stage-sheet";

import { DateBox } from "./date-box";
import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { card } from "./styles";

/**
 * One item in the stage sheet (plan stage-drawer-redesign R-5, R-14): a view that takes the sheet's place, like the
 * calendar view, with "‹ Back to Stage N". At rest it shows who has ticked the item; Edit adds the form above that. A
 * new item opens straight on the form. `onBack` tells the sheet where focus goes next: the item's row (its id), or "Add
 * an item" (`ADD_ITEM`) after a new item is saved or an item is retired (S-31).
 */
export function StageItemView({ componentId, stage, item, progress, chooseDate, heading, onBack }: {
  componentId: string;
  stage: StageLike;
  /** The item, or null for a new one. */
  item: LetteredItem | null;
  progress: Attempt<ProgressGrid>;
  chooseDate: (request: DateRequest) => void;
  /** The view's title; the sheet focuses it when the view opens. */
  heading: RefObject<HTMLHeadingElement | null>;
  onBack: (focus: string) => void;
}) {
  const router = useRouter();
  const id = useId();
  const textField = useRef<HTMLInputElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  /** Set by a handler that changes mode; the effect below moves focus once the new mode has rendered. */
  const focusNext = useRef(false);
  const [editing, setEditing] = useState(item === null);
  const [text, setText] = useState(item?.text ?? "");
  const [dueDate, setDueDate] = useState(item?.dueDate ?? "");
  const [retiring, setRetiring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const label = stage.label ?? stage.name;
  const base = `/components/${componentId}/teacher-items`;
  const where = item ? `Item ${item.letter} · ${label}` : `New item · ${label}`;
  // While editing, the title is the saved one; once saved, what was sent, until the page has caught up.
  const title = item ? (editing ? item.text : text) : "New item";
  const lists = item && progress.ok ? tickLists(progress.data, item.id) : null;

  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    (editing ? textField.current : editButton.current)?.focus();
  }, [editing]);

  function toMode(next: boolean) {
    focusNext.current = true;
    setEditing(next);
  }

  async function run(action: () => Promise<unknown>, after: "back" | "stay") {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
      if (after === "back") onBack(ADD_ITEM);
      else {
        setRetiring(false);
        toMode(false);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = { text, dueDate: dueDate || null };
    void run(
      () => (item ? api.send("PATCH", `${base}/${item.id}`, body, teacherItemSchema) : api.send("POST", base, { stageId: stage.id, ...body }, teacherItemSchema)),
      item ? "stay" : "back",
    );
  }

  function cancel() {
    if (!item) return onBack(ADD_ITEM);
    setText(item.text);
    setDueDate(item.dueDate ?? "");
    setRetiring(false);
    setError(null);
    toMode(false);
  }

  return (
    <div role="group" aria-labelledby={`${id}-title`} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-app-line bg-app-surface px-4 pt-2 pb-3.5">
        <Button type="button" variant="link" size="header" onClick={() => onBack(item?.id ?? ADD_ITEM)} className="-ml-1.5">
          <span aria-hidden="true">‹ </span>
          Back to {label}
        </Button>
        <div className="mt-1 flex items-start gap-3">
          {item && (
            <span
              aria-hidden="true"
              className={`flex size-11 flex-none items-center justify-center rounded-full font-mono text-app-lead font-bold ${
                item.dueDate ? "bg-app-accent text-app-on-accent" : "border-2 border-dashed border-app-disabled text-app-muted"
              }`}
            >
              {item.letter}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-app-help text-app-muted">{where}</p>
            <h3 id={`${id}-title`} ref={heading} tabIndex={-1} className="font-heading text-app-title font-bold break-words text-app-ink">
              {title}
            </h3>
          </div>
        </div>
        {item && !editing && (
          <div className="mt-1 -mb-2 flex items-center justify-between gap-3 pl-14">
            <p className="text-app-small text-app-copy">
              {dueDate ? (
                <>
                  Due <b className="font-semibold text-app-ink">{weekdayDate(dueDate)}</b>
                </>
              ) : (
                "No date, so not on the line or the calendar"
              )}
            </p>
            <Button ref={editButton} type="button" variant="ghost" size="header" aria-label="Edit this item" onClick={() => toMode(true)} className="-mr-2 text-app-accent">
              <Pencil aria-hidden="true" />
              Edit
            </Button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-app-tray p-3">
        {error && <ErrorPanel error={error} focus />}

        {editing && (
          <form onSubmit={submit} className="flex flex-col gap-3 rounded-app-card border-2 border-app-accent bg-app-surface px-[18px] py-4">
            {item && <h4 className="font-heading text-app-base font-bold text-app-ink">Edit item</h4>}
            <FieldGroup>
              <Field id={`${id}-text`} label="Item">
                {(control) => <input {...control} ref={textField} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />}
              </Field>
              <Field id={`${id}-date`} label="Date (optional)" help="Letters follow the date, so they change when a date does. An item with no date keeps a letter, but stays off the line and the calendar.">
                {(control) => (
                  <DateBox
                    opener={{
                      onClick: (event) =>
                        chooseDate({
                          title: text.trim() ? `Choose the date for “${text.trim()}”` : "Choose the date for the new item",
                          eyebrow: where,
                          help: "Nothing is saved until you press Save item.",
                          picking: { kind: "item" },
                          value: dueDate,
                          onPick: setDueDate,
                          from: event.currentTarget,
                        }),
                    }}
                    id={control.id}
                    value={dueDate}
                    describedBy={`${control["aria-describedby"] ?? ""} ${control.id}-value`.trim()}
                    className={`${control.className} cursor-pointer`}
                  />
                )}
              </Field>
            </FieldGroup>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="header" disabled={busy || !text.trim()}>
                {busy ? "Saving…" : "Save item"}
              </Button>
              <Button type="button" variant="outline" size="header" onClick={cancel}>
                Cancel
              </Button>
              {item && (
                <Button
                  type="button"
                  variant="link"
                  size="header"
                  onClick={() => setRetiring(true)}
                  aria-label={`Retire ${item.text}`}
                  className="ml-auto text-app-error-hover hover:text-app-error-hover"
                >
                  Retire
                </Button>
              )}
            </div>
            {item && retiring && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-app-small text-app-copy">{"Retire this item? Students won't see it any more."}</span>
                <Button
                  type="button"
                  variant="confirmDestructive"
                  size="header"
                  disabled={busy}
                  onClick={() => void run(() => api.sendNoContent("DELETE", `${base}/${item.id}`), "back")}
                >
                  Retire item
                </Button>
                <Button type="button" variant="outline" size="header" onClick={() => setRetiring(false)}>
                  Keep
                </Button>
              </div>
            )}
          </form>
        )}

        {item && (lists ? (
          <TickNames lists={lists} id={id} />
        ) : (
          <p className="px-1 text-app-small text-app-muted">{"Couldn't load the class's progress, so who has ticked this isn't shown."}</p>
        ))}
      </div>
    </div>
  );
}

/** Who has and hasn't ticked one item (S-28). Students tick these themselves; the words say so. */
function TickNames({ lists, id }: { lists: TickLists; id: string }) {
  const total = lists.ticked.length + lists.notYet.length;
  const group = (key: string, heading: ReactNode, names: string[], done: boolean) => (
    <div className="flex flex-col gap-1.5">
      <h5 id={`${id}-${key}`} className={`text-app-help font-bold ${done ? "text-app-approved" : "text-app-ink"}`}>{heading}</h5>
      {names.length === 0 ? (
        <p className="text-app-small text-app-muted">Nobody.</p>
      ) : (
        <ul aria-labelledby={`${id}-${key}`} className="flex flex-wrap gap-1.5">
          {/* Two students can share a full name, so the index keeps the keys apart. */}
          {names.map((name, i) => (
            <li
              key={`${i}-${name}`}
              data-private
              className={`rounded-full px-2.5 py-0.5 text-app-help ${done ? "bg-app-approved-tint font-semibold text-app-approved" : "bg-app-inset text-app-copy"}`}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <section aria-labelledby={`${id}-ticks`} className={`${card} flex flex-col gap-3 px-[18px] py-4`}>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h4 id={`${id}-ticks`} className="font-heading text-app-base font-bold text-app-ink">Who has ticked it</h4>
          <span data-private className="text-app-help text-app-muted">{studentCount(total)}</span>
        </div>
        <p className="text-app-help text-app-grey">Students tick these themselves.</p>
        {total > 0 && (
          <div role="img" aria-label={`${lists.ticked.length} of ${studentCount(total)} ticked`} data-private className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
            {lists.ticked.length > 0 && <span className="bg-app-approved" style={{ flexGrow: lists.ticked.length }} />}
            {lists.notYet.length > 0 && <span className="bg-app-field-border" style={{ flexGrow: lists.notYet.length }} />}
          </div>
        )}
      </div>
      {group("done", <>Ticked (<span data-private>{lists.ticked.length}</span>)</>, lists.ticked, true)}
      {group("not", <>Not ticked yet (<span data-private>{lists.notYet.length}</span>)</>, lists.notYet, false)}
    </section>
  );
}
```

The old "Ticked (N) · students tick these themselves" heading becomes "Ticked (N)", with "Students tick these themselves." under the card's title (the spec's heading regexes match both).

- [ ] **Step 6: The sheet holds the item view**

In `frontend/components/app/stage-sheet.tsx`:

Imports: add `import { StageItemView } from "./stage-item-view";` and change the helpers import to

```tsx
import { ADD_ITEM, checkpointCounts, countsLabel, type DateRequest, stageItems } from "@/lib/app/stage-sheet";
```

In `SheetBody`, after `const [savedAs, setSavedAs] = useState<string | null>(null);`, add:

```tsx
  // The item view (plan stage-drawer-redesign R-5): an item's id, "new", or none. Like the calendar, it takes the rest's
  // place, and the rest is only `hidden`, so nothing in it is lost.
  const [item, setItem] = useState<string | null>(null);
  const itemHeading = useRef<HTMLHeadingElement>(null);
  const rest = useRef<HTMLDivElement>(null);
  /** Where focus goes when the item view closes: an item's id, or `ADD_ITEM`. */
  const itemReturn = useRef<string | null>(null);
```

After `const counts = …`, add:

```tsx
  const openItem = item && item !== "new" ? (stageItems(stages, stage.id).find((i) => i.id === item) ?? null) : null;
  // An item retired elsewhere is gone after a refresh; the view then simply isn't shown.
  const viewing = item === "new" || openItem !== null;
  // The calendar's way back names where it goes (R-15).
  const backTo = item === "new" ? "the new item" : openItem ? `item ${openItem.letter}` : label;
```

After the existing `useEffect` for `request`, add:

```tsx
  // Into the item view: focus its title. Out of it: back to the row, or to "Add an item" (S-31).
  useEffect(() => {
    if (item) {
      itemHeading.current?.focus();
      return;
    }
    const target = itemReturn.current;
    itemReturn.current = null;
    if (!target) return;
    rest.current?.querySelector<HTMLElement>(target === ADD_ITEM ? "[data-add-item]" : `[data-item="${target}"]`)?.focus();
  }, [item]);
```

Change the rest's wrapper to `<div ref={rest} hidden={request !== null || viewing} className="min-h-0 flex-1 overflow-y-auto bg-app-tray">`.

Replace the items card

```tsx
          <div className={`${card} px-[18px] py-4`}>
            <StageItems componentId={componentId} stage={stage} stages={stages} chooseDate={ask} progress={progress} />
          </div>
```

with

```tsx
          <div className={`${card} px-[18px] py-4`}>
            <StageItems stage={stage} stages={stages} progress={progress} onOpen={setItem} />
          </div>
```

After the rest's closing `</div>` and before `{request && (`, add:

```tsx
      {viewing && (
        <div hidden={request !== null} className="flex min-h-0 flex-1 flex-col">
          <StageItemView
            key={item}
            componentId={componentId}
            stage={stage}
            item={openItem}
            progress={progress}
            chooseDate={ask}
            heading={itemHeading}
            onBack={(focus) => {
              itemReturn.current = focus;
              setItem(null);
            }}
          />
        </div>
      )}
```

In the calendar view, change the back button's text from `Back to {label}` to `Back to {backTo}`.

Notes for the implementer:

- `hidden` on an element with `flex`: Tailwind v4's preflight hides `[hidden]` with `display: none !important`, so the attribute wins over the class. Check it in the browser (Step 8): with the calendar open from an item, the item view must not show under it.
- `key={item}` gives each item (and "new") a fresh `StageItemView`, so opening another item never shows the last one's half-typed form.
- The calendar's own effect already sends focus back to the box that opened it (`returnTo`), which is now inside the item view: that's how the item's date returns to the item.

- [ ] **Step 7: Run the tests to see them pass**

Run: `cd frontend && npx vitest run components/app/stage-items.spec.tsx components/app/stage-item-view.spec.tsx components/app/stage-sheet.spec.tsx`
Expected: PASS.

- [ ] **Step 8: Look at it**

With the app running: open a stage, click an item. The item view replaces the stage's content under the same header: "‹ Back to Stage 3", the letter, the title, "Due …" with Edit, and the "Who has ticked it" card with green and grey pills. Edit adds the navy-bordered form above it; press the date box: the calendar shows "Back to item B"; Use this date comes back to the item with the date filled. Save item stays on the item; Back puts focus on its row. "Add an item to Stage 3" opens the form straight away; Save item comes back to the list with focus on Add. At 390px wide the pills wrap and nothing scrolls sideways. Compare with `ItemInDrawer.dc.html` and `ItemEditing.dc.html`.

- [ ] **Step 9: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add frontend/lib/app/stage-sheet.ts frontend/components/app/stage-items.tsx frontend/components/app/stage-items.spec.tsx frontend/components/app/stage-item-view.tsx frontend/components/app/stage-item-view.spec.tsx frontend/components/app/stage-sheet.tsx frontend/components/app/stage-sheet.spec.tsx
git commit -m "Open a stage's items as a view inside the sheet: who has ticked it, then Edit"
```

---

### Task 6: The journey, the docs, the checklist and the hand test

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/BACKLOG.md`
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1: Run the journey**

Run: `make e2e`
Expected: green on both projects (laptop and phone). The add-an-item steps work unchanged: "Add an item to Stage 6" now opens the item view, `setSheetDate` finds "Date (optional)" inside the sheet, and Save item comes back to the list. The who-ticked step clicks the row and finds the lists in the item view. If `expectAccessible` reports contrast on the navy card or the cream note, measure the pair and fix the token, recording the new ratio in `docs/design/pilot/stage-drawer-redesign/NOTES.md`.

- [ ] **Step 2: Keep ARCHITECTURE true**

In `docs/ARCHITECTURE.md`, in "**The stage sheet**":

- After "…`?stage=N`…" sentences, where it lists what the sheet holds, change to: "The sheet (design B, plan stage-drawer-redesign) holds, in order: the stage's date; the checkpoint as a navy card, its counts drawn as a bar named in words (`countsLabel`); the official description; the teacher's note; and `StageItems`; then the prompts, folded. White cards sit on `--app-tray`."
- Replace "`StageItems` (`stage-items.tsx`: one stage's items, which replaced the page's whole-component list; each opens in place to edit or retire)" with "`StageItems` (`stage-items.tsx`: one stage's items, which replaced the page's whole-component list). A row, or Add an item, opens `StageItemView` (`stage-item-view.tsx`) in the sheet's place, like the calendar view: who has ticked the item, and Edit for the form and Retire. The sheet keeps which item is open; the rest is only `hidden`, and focus goes to the view's title on the way in and back to the row (or Add an item, after a new item or a retirement) on the way out."
- Replace "Picking a date, the stage's or an item's, swaps the sheet's content for the calendar … with "‹ Back to Stage N"" with "Picking a date, the stage's or an item's, swaps the sheet's content for the calendar … with "‹ Back to Stage N", or "‹ Back to item B" when it was opened from an item, and comes back there".
- Replace the note's description ("**The note** is `StageNoteForm` (`stage-note-form.tsx`): a textarea limited to 1,000 characters (`NOTE_MAX`), a live preview headed "How students see it", and one button …") with: "**The note** is `StageNoteForm` (`stage-note-form.tsx`): one cream card that shows the note as students see it (`NoteText`), with Edit, or "Add a note" when there's none; Edit turns the same card into a textarea limited to 1,000 characters (`NOTE_MAX`), with Cancel and one button that reads Save note, or Remove note once a saved note's box is emptied (`PUT`, or `DELETE` for an empty box). The card opens on the box when the page holds an unsaved draft for it. Focus moves into the box on Edit and back to Edit (or Add a note) on Save, Cancel and Remove."
- Remove "While a save runs the box is read-only, not disabled, so focus stays in it;" and write "While a save runs the box is read-only;".

- [ ] **Step 3: Walk the UI checklist**

Open `docs/design/UI-CHECKLIST.md` and go through it for the sheet, at 390px and 1280px. Things most likely to need a look: focus visible on every control on the navy card and the cream card; 44px targets (Edit, the rows, Add an item, Back); Hide names blurs the bar, the counts, the pills and the tick bar; reduced motion. Fix what fails; note what you checked in the report.

- [ ] **Step 4: Tim's hand test**

Write these into the report for Tim to run on a laptop and a phone:

1. Open the current stage. The navy checkpoint card is the first thing you notice under the date.
2. A stage with a note: read it, press Edit, change it, Save note. The card shows the new note. Add `www.` address: it's a link, and opens the site.
3. Close the sheet with an unsaved note, reopen it: the card is on the box, "Not saved yet".
4. Click an item: who has ticked it shows without the drawer growing. Edit it, change its date (the calendar comes back to the item), Save item. Back.
5. As a student, open the stage: the note shows as before, with the `www.` link working.

What comes up goes into "From Tim's testing" in `docs/BACKLOG.md`.

- [ ] **Step 5: Backlog and handoff**

In `docs/BACKLOG.md`, change the `stage-drawer-redesign` row's status to "built on `pilot/stage-drawer-redesign`, not merged (<date>). Still to do: Tim's hand test, `/self-review` in a fresh session, `docs/changes/stage-drawer-redesign.md`, and the PR into `pilotMain`." In `docs/HANDOFF.md`, say where this stopped, list R-8 to R-19 for Tim to confirm, and anything built differently from this plan.

- [ ] **Step 6: Verify and commit**

Run: `make verify`
Expected: green.

```bash
git add docs/ARCHITECTURE.md docs/BACKLOG.md docs/HANDOFF.md
git commit -m "Record the stage drawer redesign in the architecture notes, the backlog and the handoff"
```

---

## Not in this plan

- Restyling any other screen (`app-polish`, undecided).
- Moving "Questions students get from the guidelines".
- Any API, schema or backend change.
- A one-stage date endpoint (S-34 still stands).
- `docs/changes/stage-drawer-redesign.md`: written after `/self-review`, with `write-changes`.
