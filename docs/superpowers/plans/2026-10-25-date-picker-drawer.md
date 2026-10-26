# Date picker drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** every date on the teacher's Component tab (the stage dates and an item's date) gets a **Choose on calendar** button that opens a right-hand drawer with a calendar showing every other date on the component, saved or not.

**Architecture:** a pure `lib/app/date-marks.ts` turns the stages, the form's unsaved `draft` and the completion date into a list of marks, day names and a month range. A new `DateCalendar` (shadcn Calendar, which is react-day-picker) draws those marks; a new `DatePickerDrawer` puts it in the existing right-hand Base UI drawer. `StageDatesForm` computes the marks once from `draft` and hands them to each stage row and to `TeacherItems`; it also feeds the year view the draft dates. Frontend only. No backend, schema or API change.

**Tech Stack:** Next.js 15.3.9, React 19, shadcn/ui `base-nova` (Base UI), react-day-picker 10.0.2 (new), Tailwind with the `--app-*` tokens, `node --test` for `lib/`, Vitest + Testing Library for components, Playwright for the journey.

**Intent:** `docs/intent/date-picker-drawer.md` (confirmed 25 Oct 2026). **Design:** Part 1 (Tasks 0–8) was built plain, to the existing tokens. Design pack D-11, `docs/design/pilot/D-11-date-picker-drawer/` (direction B, agreed with Tim 25–26 Oct 2026), came after; **Part 2 (Tasks 9–17, at the end of this plan) builds it.** Its `NOTES.md` is Part 2's spec.

**Branch:** `pilot/date-picker-drawer` from `pilotMain`. Diff base `pilotMain`.

---

## Decisions made

From the interview (`docs/intent/date-picker-drawer.md`), settled:

| # | Question | Answer |
|---|---|---|
| C-1 | Calendar-first page, a richer picker, a stage timeline with a sheet, or a wizard? | The picker first: a right-hand drawer with a calendar. The stage sheet comes later and reuses it. |
| C-2 | Which side do panels open from? | Both the date drawer and the later stage sheet open from the right. |
| C-3 | A drawer, or a calendar component? | Its own component (`DateCalendar`), so the stage sheet can hold it without a second drawer. |
| C-4 | Stage dates only, or items too? | Both. |
| C-5 | Does picking a day save? | No. It fills the date box and closes the drawer; the page's Save stays. *(D-11: still nothing saves, but a tap now selects and `Use this date` fills and closes: C-22.)* |
| C-6 | Do unsaved dates show? | Yes, slightly different from saved ones. |
| C-7 | What else is on the calendar? | Stage dates, dated items, today, the completion date with every later day greyed. No holidays. |
| C-8 | The year view's empty-until-saved problem? | Fixed here: it reads `draft`. |

Made while writing this plan. **Tim: confirm or change C-9 to C-20.**

| # | What happens | Why it matters to you |
|---|---|---|
| C-9 | The typed date box **stays on the page**, exactly as now, and the **Choose on calendar** button sits under it. The drawer has no typed box of its own. | Typing still works, and every existing spec and e2e step (`getByLabel("Stage 6 date").fill(...)`) keeps passing unchanged. |
| C-10 | The browser's own calendar icon is **hidden** in Chrome, Edge and Safari (`::-webkit-calendar-picker-indicator`), so there's one calendar, not two. Firefox still shows its icon; there's no standard way to hide it. Phones keep their own wheel when the box is tapped. | The blank drop-down you complained about goes away on desktop. |
| C-11 | The months run from the **earliest** of today and every date on the component to the **latest** of the completion date and every date, in one column you scroll. No arrows. | A Stage 1 date in May still shows when you set Stage 6 in January. *(D-11: the column is replaced by C-25, one month under the line; this range still bounds the arrows.)* |
| C-12 | The drawer opens with focus on the **chosen day**, else **today**, which scrolls the column to that month. | "Opens on the month that matters" without a separate scroll rule. *(D-11: still true; the chosen day also picks the month shown, C-25.)* |
| C-13 | Each day's accessible name is its full date, then what's on it: `Friday 16 October 2026: Stage 4 (not saved), item B`. Today adds `today`. A day after the completion date ends `, after the completion date` and is disabled. | A screen reader hears what a sighted teacher sees. The specs query these names. |
| C-14 | Marks are short tags under the day number: `S4` for a stage, the item's letter (`B`), `End` for the completion date. A stage date not saved yet has a **dashed** tag. A key above the calendar says what each means. | Never colour alone (UI-STANDARDS). *(D-11: refined by C-27; the key moves under the month.)* |
| C-15 | The drawer's title is `Choose the Stage 4 date`, or `Choose the date for “<item text>”`, or `Choose the date for the new item` when the text is still empty. | The title names the dialog. It isn't `Stage 4 date`, because that's the date box's label and a test asking for "the thing labelled Stage 4 date" would find both while the drawer is open. |
| C-16 | react-day-picker pinned to **10.0.2** (published 30 Sep 2026). No direct `date-fns` and no npm `cn` package. | Exact versions, per root rules. `date-fns` comes in as react-day-picker's own dependency. |
| C-17 | Dates cross into react-day-picker as **local** `Date`s (`new Date(y, m - 1, d)`), converted back with `getFullYear/getMonth/getDate`. Formatting stays UTC, as everywhere else in `lib/app`. | react-day-picker works in local time; a UTC-midnight `Date` can show as the day before west of UTC. The round trip is tested across both 2026–27 clock changes. |
| C-18 | A `ghost` variant is added to `components/ui/button.tsx` (transparent, inset on hover). | shadcn's Calendar asks for it; nothing else changes in Button. |
| C-19 | The year view gets the **draft** dates (its line and its read-only month grid). Its hand-built month grid is otherwise left as it is. | Replacing that grid with `DateCalendar` is a later tidy-up, not this change. *(D-11: replaced by C-26: the year view shares the drawer's line and loses its month grid.)* |
| C-20 | Day cells are 44px at every width (7 × 44 = 308px fits a 390px phone with the drawer's 16px padding; the 520px desktop drawer has room). | One size, no breakpoint logic, meets the 44px touch rule. *(D-11: replaced by C-28, 60px from `sm:` up.)* |
| C-21 | *(Changed after the build, 25 Oct 2026, Tim's call; replaces C-9's button and C-10's "phones keep their own wheel".)* There is **no "Choose on calendar" button**. Clicking or tapping the date box opens the drawer; Alt+Down opens it from the keyboard; typing into the box from the keyboard still works. `DatePickerDrawer` takes a render prop and gives the box an `opener` (`ref`, `aria-haspopup="dialog"`, `onMouseDown` that prevents focus, `onClick`, `onKeyDown`); focus returns to the box through `finalFocus`. The code blocks below still show the original trigger button. | One control per date, not two. `onMouseDown` stops the tap focusing the box, which is what opens a phone's own date wheel. Specs type with focus + keyboard (a `userEvent.type` clicks first, which now opens the drawer); e2e `getByLabel("Stage N date")` needs `{ exact: true }` because the dialog title "Choose the Stage N date" contains the label. |

Made with Tim in design pack D-11 (25–26 Oct 2026; `docs/design/pilot/D-11-date-picker-drawer/NOTES.md`). These are Part 2's decisions; Tim took the pack's recommendations on its open questions.

| # | What happens | Why it matters to you |
|---|---|---|
| C-22 | **Select, then confirm.** Tapping a day, or Enter on it, selects it (azure) and the footer shows its gaps. `Use this date` fills the box and closes; `Close` and Escape leave the box as it was. The tapped day lives in the drawer's own state, not in the form's `draft`, until `Use this date`. | You see the gap before you commit, and a stray tap while browsing never changes the form. One more tap. Specs gain the names `Use this date` and `Clear date`. |
| C-23 | **`Clear date`**, a link-style button left of `Use this date`, shown only when the box has a date, empties the box and closes. | The only way to clear a date on a phone, where a tap on the box opens the drawer. |
| C-24 | **Days after the completion date stay focusable**: `aria-disabled="true"`, not `disabled`. A tap on, or focus on, one picks nothing and puts `Sat 27 Feb 2027 is after the completion date, Fri 26 Feb 2027. Nothing can be set after it.` in the footer (`role="status"`). | The teacher learns why without a paragraph, and a screen reader user hears the same reason. Part 1's spec that expects these days `disabled` changes. |
| C-25 | **One month at a time, under a live year line.** The drawer opens on the chosen day's month, else today's. The arrows are named for the month they go to (`October 2026`; at the ends `No earlier month` / `No later month`, `aria-disabled`). The line's months are pointer shortcuts (`Show December 2026`, `tabindex="-1"`). `calendarMonths` still gives the range, which now bounds the arrows. | Replaces C-11's scrolling column, which Tim wasn't convinced by. About 35 day buttons are drawn instead of about 300, which removes the stutter on opening. |
| C-26 | **One line, two places.** A new `YearLine` draws the line for the page's year view and for the drawer. The year view keeps its gap labels and its D-5 amber and red stage marks, adds `Not saved yet` and `Today` to its key, and loses `Show calendar` and its read-only month grid. It stays read-only. | The two drawings had already drifted apart (circles in one, squares in the other). Brings C-19's tidy-up forward. |
| C-27 | **Marks.** A stage is a navy square tag (`S4`, 3px radius), dashed when not saved. An item is a navy ring with its letter. The completion date is a navy bar on the day's right edge, with an `End` tag only when it has the day to itself. Today is a gold disc behind the number. Your pick is an azure day; the run is the pale azure days from the nearest dated earlier stage to your pick (stages only). A 60px day shows three tags and a 44px day two; a fuller day ends in `+n`. | Every mark has a shape and a word, never colour alone. |
| C-28 | **Day cells**: 44 × 48px below `sm:`, 60 × 48px from `sm:` up, 8px gaps both ways. | 7 × 44 + 6 × 8 = 356px fits 390 less 2 × 16px; 7 × 60 + 6 × 8 = 468px fits the 520px drawer less 2 × 24px. Replaces C-20. |
| C-29 | **Colour tokens** `--app-pick` (`#0A6AA8`), `--app-pick-hover`, `--app-pick-tint`, `--app-today` (`#FFC94D`), `--app-today-ring` and `--app-radius-tag`, with the measured ratios in the pack's `tokens.css`. Azure means "your pick" and gold means "today", and nothing else. | Tim asked for a little colour beyond navy; neither hue can be read as a state. |
| C-30 | **The new slide on every right-hand drawer**: 300ms in on `cubic-bezier(.32,.72,0,1)`, 200ms out on `cubic-bezier(.4,0,1,1)`, moving `transform` only (and the scrim's opacity), 0ms under reduced motion. It goes in the shared `components/ui/drawer.tsx`, so **D-10's review drawer (`components/app/request-drawer.tsx`, the "Full history" sheet) slides the same way**. | Tim's call, 26 Oct 2026: one slide for every drawer. Today's 160ms snap felt abrupt. |
| C-31 | **The footer's words** come from `pickReadout` in `lib/app/date-marks.ts`: the gap to the nearest dated stage before and after in stage order (saved or not; "(not saved)" in its name), else to the completion date (`On the completion date` on the day itself). Exact days under 21 days, whole weeks (rounded) from 21. A pick before the stage before, or on its day, asks in amber: `… That's allowed, but check it's what you meant.` Anything else on the day: `Also on this day: …`. An item gets the nearest dated stages either side by date, and no run. | Calm and exact: the gap in words, on the same weeks rule as the year view's labels. Pure, so `node --test` covers it. |
| C-32 | **The header**: the stage's `S4` tag and name (or `New item · Stage 6` / `Item C · Stage 6`) above the title, then `Nothing is saved until you press Save dates.` (`… Save item.`), and `Close`. Titles are unchanged (C-15). | Says what you're picking for, and that nothing saves yet. |
| C-33 | **The page's date box**: a lucide `CalendarDays` icon (decorative) at its right; pointer over gives it a navy edge on `--app-accent-tint`. A date typed or picked but not saved yet gets a **dashed** border and `Fri 16 Oct 2026 · not saved` under it, which becomes the input's description (`aria-describedby`). A refused date stays red and is never dashed. | Agreed 26 Oct 2026. You land back on the row you changed, and it should say so there, in the calendar's own dashed language. |
| C-34 | **Not built**: the run doesn't stretch forward to the next stage, and phones get the same line as the laptop (about 110px tall). | The pack's recommendations, taken by Tim. |

## Concepts in play

| Concept | What it is | Why it fits here | Where this repo already uses it |
|---|---|---|---|
| An editable copy of server data, reset when the source changes | `useState(initial)` plus `useEffect(() => setDraft(initial), [initial])`: the draft is the saved data plus the teacher's unsaved edits, and it only resets when the saved data itself changes | The calendar reads `draft` as it is. Resetting on drawer open would wipe an unsaved date | `components/app/stage-dates-form.tsx:45-66` |
| Base UI Drawer focus management | A modal dialog traps focus, moves it to `initialFocus` on open, and returns it to the `DrawerTrigger` on close; Escape closes | The drawer needs exactly that, and `initialFocus` takes a function, so we can aim it at the chosen day | `components/app/request-drawer.tsx` (`initialFocus={title}`) |
| react-day-picker modifiers and labels | `disabled`, `today`, `selected` change a day's state; `labels.labelDayButton` sets each day button's accessible name; `components.DayButton` replaces how a day draws | Greyed days after the completion date, and a name that carries the marks, without forking the library | New here. The closest is the year view's hand-built month grid, `components/app/year-view.tsx` `Calendar` |
| Calendar dates as strings | A date with no time is a `"YYYY-MM-DD"` string; it's turned into a `Date` only at the edge, to format (UTC) or to hand to a library (local) | No timezone can move a stage date by a day | `lib/app/component-setup.ts` (`epoch`, `formatCalendarDate`) |
| shadcn add, then restyle | The CLI copies the component's source into `components/ui/`; we then swap shadcn's neutral tokens for `--app-*` | Root CLAUDE.md: shadcn first, restyled, `cn` from `@/lib/utils` | `components/ui/drawer.tsx` (header comment) |
| Pure `lib/` with `node --test` | Logic with no React lives in `lib/app/*.ts`, tested by Node's own runner | The marks and month maths are easy to get subtly wrong and cheap to test there | `lib/app/component-setup.test.ts` |
| Specs by role and accessible name | Testing Library queries what a user perceives (`getByRole("button", { name })`), so a restyle can't break them | The D-11 restyle later must keep these specs passing | `components/app/student-checkpoints.spec.tsx` ("opens the full history in a drawer…") |

Added for Part 2 (D-11):

| Concept | What it is | Why it fits here | Where this repo already uses it |
|---|---|---|---|
| Short-lived state inside a dialog | The drawer keeps the tapped day, the month in view and a refused day in its own `useState`, reset every time it opens; only `Use this date` and `Clear date` reach the form, through `onPick` | Select-then-confirm (C-22) without the form ever holding a half-chosen date | `components/app/stage-dates-form.tsx` (`draft` against the saved stages: the same split, one level up) |
| `aria-disabled` versus `disabled` | `disabled` takes a control out of the tab order and swallows clicks; `aria-disabled="true"` announces it as unavailable but keeps it focusable and clickable, so it can explain itself | Greyed days must say why they can't be picked (C-24) | `components/app/component-tabs.tsx` (the Progress tab), `timeline-view.tsx` (out-of-range days) |
| Accessible name versus description | The name identifies a control (`Stage 4 date`) and is what specs query; the description (`aria-describedby`) is read after it | "not saved" reaches a screen reader without changing any name (C-33) | `components/app/stage-dates-form.tsx` (the refusal note) |
| Roving focus in a grid | The month is one tab stop; arrow keys move between days, Page Up and Page Down between months. react-day-picker manages it | The tab order stays short: `Close` → arrows → the month → `Clear date` → `Use this date` (C-25) | `components/app/date-calendar.tsx` (Part 1) |
| One presentational component for two callers | A component that only draws what it's given, with variants by prop (`gaps`, `pick`, `onMonth`), used by both the page and the drawer | The year view and the drawer's line can't drift apart again (C-26) | `components/ui/drawer.tsx` (one drawer for the review history and the date picker) |
| Motion on `transform`, timed by tokens | Animate only `transform` and `opacity`, with durations in CSS variables that drop to 0ms under `prefers-reduced-motion` | A smoother slide that does no layout work, changed in one place for every drawer (C-30) | `app/globals.css` (`--app-duration`, the `app-appear` animation) |

## File structure

| File | Change | Responsibility |
|---|---|---|
| `frontend/lib/app/date-marks.ts` | Create | Marks from stages + draft + completion date; day names; month range; ISO ↔ local `Date` |
| `frontend/lib/app/date-marks.test.ts` | Create | `node --test` for the above |
| `frontend/components/ui/calendar.tsx` | Create (shadcn CLI, then restyled) | shadcn's Calendar on `--app-*` tokens |
| `frontend/components/ui/button.tsx` | Modify | Add the `ghost` variant |
| `frontend/components/app/date-calendar.tsx` | Create | The reusable calendar with marks, key tags, greyed days |
| `frontend/components/app/date-calendar.spec.tsx` | Create | Its spec |
| `frontend/components/app/date-picker-drawer.tsx` | Create | Trigger button + right-hand drawer + key + `DateCalendar` |
| `frontend/components/app/date-picker-drawer.spec.tsx` | Create | Its spec |
| `frontend/components/app/stage-dates-form.tsx` | Modify | Marks from `draft`; drawer on each stage row; year view gets draft dates; hide the native icon |
| `frontend/components/app/stage-dates-form.spec.tsx` | Modify | Two new cases |
| `frontend/components/app/teacher-items.tsx` | Modify | `calendar` prop; drawer under the item's date; hide the native icon |
| `frontend/components/app/teacher-items.spec.tsx` | Modify | Pass `calendar` to every render; one new case |
| `frontend/e2e/phase2.e2e.ts` | Modify | One drawer round trip in the teacher's journey, with axe |
| `docs/ARCHITECTURE.md`, `docs/PILOT-ROADMAP.md` §6.2, `docs/BACKLOG.md`, `docs/HANDOFF.md` | Modify | Keep the docs true |

Part 2 (D-11):

| File | Change | Responsibility |
|---|---|---|
| `frontend/app/globals.css` | Modify | The D-11 tokens (C-29) and the slide's timings (C-30), with Tailwind names |
| `frontend/components/ui/drawer.tsx` | Modify | The new slide for every right-hand drawer, the review drawer included (C-30) |
| `frontend/lib/app/date-marks.ts` (+ `.test.ts`) | Modify | `ordinal` on stage marks; `gapWords`, `runStart`, `pickReadout` for the footer (C-31) |
| `frontend/components/app/year-line.tsx` (+ `.spec.tsx`) | Create | The line, for the page and the drawer (C-26) |
| `frontend/components/app/year-view.tsx` (+ `.spec.tsx`) | Modify | Drawn with `YearLine`; its own month calendar removed |
| `frontend/components/ui/calendar.tsx` | Modify | Day sizes (C-28), the arrows after the caption, the azure selection |
| `frontend/components/app/date-calendar.tsx` (+ `.spec.tsx`) | Modify | One controlled month, the run, today's disc, greyed days that report themselves, the tag rules (C-24, C-25, C-27) |
| `frontend/components/app/date-picker-drawer.tsx` (+ `.spec.tsx`) | Modify | Header, line, month, key and footer; select then confirm; `Clear date` (C-22, C-23, C-32) |
| `frontend/components/app/stage-dates-form.tsx`, `teacher-items.tsx` (+ specs) | Modify | The date box (icon, hover, dashed not saved, C-33); the drawer's new props; the year view's marks |
| `frontend/e2e/phase2.e2e.ts` | Modify | The journey taps, reads the gap and uses the date |
| `docs/ARCHITECTURE.md`, `docs/PILOT-ROADMAP.md` §6.2, `docs/design/UI-STANDARDS.md`, `docs/BACKLOG.md`, `docs/HANDOFF.md` | Modify | Keep the docs true |

---

### Task 0: Branch

**Files:** none.

- [ ] **Step 1: Make sure nothing else rides along**

The intent, this plan, the D-11 prompt and their index rows were written on `pilot/source-builder`'s working tree, next to the uncommitted AI-use record. Commit or finish that work on its own branch first. Then:

Run: `git status --short`
Expected: only `docs/intent/date-picker-drawer.md`, `docs/superpowers/plans/2026-10-25-date-picker-drawer.md`, `docs/design/prompts/D-11-date-picker-drawer.md`, `docs/design/prompts/README.md`, `docs/PILOT-ROADMAP.md` (the D-11 row) and `docs/BACKLOG.md` (row 3).

- [ ] **Step 2: Branch from `pilotMain` and commit the planning docs**

```bash
git switch -c pilot/date-picker-drawer pilotMain
git add docs/intent/date-picker-drawer.md docs/superpowers/plans/2026-10-25-date-picker-drawer.md docs/design/prompts/D-11-date-picker-drawer.md docs/design/prompts/README.md docs/PILOT-ROADMAP.md docs/BACKLOG.md
git commit -m "Plan the date picker drawer: the intent, the plan and the D-11 prompt"
```

If `git switch` refuses because a file differs on `pilotMain`, stash just those files (`git stash push -- <paths>`), switch, then `git stash pop`.

---

### Task 1: Marks, day names and the month range (`lib/app/date-marks.ts`)

**Files:**
- Create: `frontend/lib/app/date-marks.ts`
- Test: `frontend/lib/app/date-marks.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/lib/app/date-marks.test.ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarMonths, dateMarks, dayName, isoToLocalDate, localDateToIso } from './date-marks.ts';

const stage = (n: number, dueDate: string | null, items: { id: string; text: string; dueDate: string | null }[] = []) => ({
  id: `s${n}`, ordinal: n, label: `Stage ${n}`, name: `Name ${n}`, dueDate, items,
});

describe('isoToLocalDate and localDateToIso', () => {
  test('round-trip every calendar date, including both 2026-27 clock changes', () => {
    for (const iso of ['2026-01-01', '2026-03-29', '2026-10-25', '2027-03-28', '2027-12-31', '2028-02-29']) {
      assert.equal(localDateToIso(isoToLocalDate(iso)), iso);
    }
  });

  test('a local Date is midnight of that calendar day', () => {
    const d = isoToLocalDate('2026-10-16');
    assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 9, 16, 0]);
  });
});

describe('dateMarks', () => {
  test('a saved stage date is a saved stage mark', () => {
    const marks = dateMarks([stage(3, '2026-09-25')], { s3: '2026-09-25' }, '2027-02-26');
    assert.deepEqual(marks[0], { iso: '2026-09-25', kind: 'stage', short: 'S3', name: 'Stage 3', saved: true });
  });

  test('a typed but unsaved stage date is marked not saved, at the typed date', () => {
    const marks = dateMarks([stage(4, '2026-10-16')], { s4: '2026-10-23' }, '2027-02-26');
    assert.deepEqual(marks[0], { iso: '2026-10-23', kind: 'stage', short: 'S4', name: 'Stage 4 (not saved)', saved: false });
  });

  test('a stage cleared in the draft has no mark, and a stage missing from the draft uses its saved date', () => {
    const marks = dateMarks([stage(4, '2026-10-16'), stage(5, '2026-12-09')], { s4: '' }, '2027-02-26');
    assert.deepEqual(marks.filter((m) => m.kind === 'stage').map((m) => m.short), ['S5']);
  });

  test('dated items are marked by their letter; undated items are not marked', () => {
    const marks = dateMarks(
      [stage(6, '2027-01-22', [
        { id: 'i2', text: 'Full draft in', dueDate: '2026-12-04' },
        { id: 'i1', text: 'Catch-up closes', dueDate: '2026-11-13' },
        { id: 'i3', text: 'Re-run slot', dueDate: null },
      ])],
      {},
      '2027-02-26',
    );
    assert.deepEqual(
      marks.filter((m) => m.kind === 'item').map((m) => [m.iso, m.short, m.name]),
      [['2026-11-13', 'A', 'item A'], ['2026-12-04', 'B', 'item B']],
    );
  });

  test('the completion date is always a mark, last', () => {
    const marks = dateMarks([], {}, '2027-02-26');
    assert.deepEqual(marks, [{ iso: '2027-02-26', kind: 'completion', short: 'End', name: 'the completion date', saved: true }]);
  });

  test('a stage with no label uses its name', () => {
    const marks = dateMarks([{ ...stage(1, '2026-09-04'), label: null }], {}, '2027-02-26');
    assert.equal(marks[0].name, 'Name 1');
  });
});

describe('dayName', () => {
  const marks = dateMarks(
    [stage(4, '2026-10-16'), stage(5, null, [{ id: 'i1', text: 'Notebooks in', dueDate: '2026-10-16' }])],
    { s4: '2026-10-16', s5: '' },
    '2026-11-27',
  );

  test('a plain day is its full date', () => {
    assert.equal(dayName('2026-10-30', marks, '2026-11-27', '2026-10-14'), 'Friday 30 October 2026');
  });

  test('a day with marks lists them after a colon', () => {
    assert.equal(dayName('2026-10-16', marks, '2026-11-27', '2026-10-14'), 'Friday 16 October 2026: Stage 4, item A');
  });

  test('today says so, first', () => {
    assert.equal(dayName('2026-10-14', marks, '2026-11-27', '2026-10-14'), 'Wednesday 14 October 2026: today');
  });

  test('the completion date names itself', () => {
    assert.equal(dayName('2026-11-27', marks, '2026-11-27', '2026-10-14'), 'Friday 27 November 2026: the completion date');
  });

  test('a day after the completion date says so', () => {
    assert.equal(dayName('2026-11-28', marks, '2026-11-27', '2026-10-14'), 'Saturday 28 November 2026, after the completion date');
  });
});

describe('calendarMonths', () => {
  test('from the month of today to the month of the completion date', () => {
    assert.deepEqual(calendarMonths([], '2026-10-14', '2027-02-26'), { start: '2026-10-01', count: 5 });
  });

  test('starts earlier when a date is before today', () => {
    assert.deepEqual(calendarMonths(['2026-05-29'], '2026-10-14', '2027-02-26'), { start: '2026-05-01', count: 10 });
  });

  test('ends later when a date is after the completion date (a refused or moved date still shows)', () => {
    assert.deepEqual(calendarMonths(['2027-03-05'], '2026-10-14', '2027-02-26'), { start: '2026-10-01', count: 6 });
  });

  test('one month when everything is in the same month', () => {
    assert.deepEqual(calendarMonths(['2026-10-20'], '2026-10-14', '2026-10-30'), { start: '2026-10-01', count: 1 });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd frontend && node --test lib/app/date-marks.test.ts`
Expected: FAIL, `Cannot find module '.../lib/app/date-marks.ts'`.

- [ ] **Step 3: Write the module**

```ts
// frontend/lib/app/date-marks.ts
import { letteredItems, type StageLike } from './component-setup.ts';

/** One thing on one day of the date picker's calendar (plan date-picker-drawer, C-13 and C-14). */
export type DateMark = {
  iso: string;
  kind: 'stage' | 'item' | 'completion';
  /** The tag drawn under the day number: "S4", an item's letter, or "End". */
  short: string;
  /** What the day's accessible name says about it: "Stage 4 (not saved)", "item B", "the completion date". */
  name: string;
  saved: boolean;
};

const FULL_DATE = new Intl.DateTimeFormat('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * "2026-10-16" → local midnight on 16 Oct. react-day-picker works in local time, so a UTC-midnight Date
 * would show as the 15th anywhere west of UTC (C-17). Only for handing dates to the calendar; formatting
 * stays UTC, as in component-setup.ts.
 */
export function isoToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** The calendar day a local Date falls on, as "YYYY-MM-DD". */
export function localDateToIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Every mark on the component: each stage's draft date (its saved date when the draft hasn't touched
 * it; none when the draft cleared it), each dated item by its letter, and the completion date last.
 * Items save one at a time, so their dates are always saved ones.
 */
export function dateMarks(stages: ReadonlyArray<StageLike>, draft: Record<string, string>, completionDate: string): DateMark[] {
  const marks: DateMark[] = [];
  for (const stage of stages) {
    const iso = draft[stage.id] ?? stage.dueDate ?? '';
    if (!iso) continue;
    const saved = iso === stage.dueDate;
    const label = stage.label ?? stage.name;
    marks.push({ iso, kind: 'stage', short: `S${stage.ordinal}`, name: saved ? label : `${label} (not saved)`, saved });
  }
  for (const item of letteredItems(stages)) {
    if (!item.dueDate) continue;
    marks.push({ iso: item.dueDate, kind: 'item', short: item.letter, name: `item ${item.letter}`, saved: true });
  }
  marks.push({ iso: completionDate, kind: 'completion', short: 'End', name: 'the completion date', saved: true });
  return marks;
}

/** A day button's accessible name (C-13): "Friday 16 October 2026: Stage 4 (not saved), item B". */
export function dayName(iso: string, marks: ReadonlyArray<DateMark>, completionDate: string, today: string): string {
  const on = [...(iso === today ? ['today'] : []), ...marks.filter((m) => m.iso === iso).map((m) => m.name)];
  const date = FULL_DATE.format(Date.parse(`${iso}T00:00:00Z`));
  const named = on.length > 0 ? `${date}: ${on.join(', ')}` : date;
  return iso > completionDate ? `${named}, after the completion date` : named;
}

/** The months the calendar draws (C-11): from the earliest of today and every date to the latest of the completion date and every date. */
export function calendarMonths(dates: ReadonlyArray<string>, today: string, completionDate: string): { start: string; count: number } {
  const all = [today, completionDate, ...dates].sort();
  const first = all[0];
  const last = all[all.length - 1];
  const months = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
  return { start: `${first.slice(0, 7)}-01`, count: months(last) - months(first) + 1 };
}
```

Sibling imports keep the `.ts` extension, as in `lib/schedule.ts` and `component-setup.test.ts` (`tsconfig.json` has `allowImportingTsExtensions`), so `node --test` can load them.

- [ ] **Step 4: Run it to see it pass**

Run: `cd frontend && node --test lib/app/date-marks.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/app/date-marks.ts frontend/lib/app/date-marks.test.ts
git commit -m "Work out the date picker's marks, day names and months from the stages and the unsaved draft"
```

---

### Task 2: shadcn Calendar on the app tokens

**Files:**
- Create: `frontend/components/ui/calendar.tsx`
- Modify: `frontend/components/ui/button.tsx` (variants)
- Modify: `frontend/package.json`, `frontend/package-lock.json`

No spec of its own: it's a styled wrapper, tested through `DateCalendar` in Task 3.

- [ ] **Step 1: Add it with the CLI**

Run: `cd frontend && npx shadcn@latest add calendar`
If it asks to overwrite `components/ui/button.tsx`, answer **No**.

- [ ] **Step 2: Undo what the CLI adds that the repo doesn't want, and pin the version**

```bash
cd frontend
git diff --quiet components/ui/button.tsx || git checkout components/ui/button.tsx
npm uninstall cn date-fns
npm install --save-exact react-day-picker@10.0.2
```

Check: `grep -n -E '"(react-day-picker|date-fns|cn)"' package.json` prints only `"react-day-picker": "10.0.2"`.

- [ ] **Step 3: Add the `ghost` variant to Button (C-18)**

In `frontend/components/ui/button.tsx`, inside `variant: { ... }`, after the `outline:` line:

```ts
        ghost: "bg-transparent text-app-ink hover:bg-app-inset disabled:opacity-60",
```

- [ ] **Step 4: Replace the generated file with the restyled version**

Write `frontend/components/ui/calendar.tsx` as below. It is shadcn's `base-nova` Calendar with: `cn` from `@/lib/utils`; lucide icons in place of `IconPlaceholder`; shadcn's neutral tokens swapped for `--app-*` (`bg-background`→`bg-app-surface`, `text-muted-foreground`→`text-app-muted`, `bg-muted`→`bg-app-inset`, `bg-primary text-primary-foreground`→`bg-app-accent text-app-on-accent`, the focus ring→the Button's `outline-ring`); 44px cells (C-20); dark-mode classes removed (the app is light only).

```tsx
"use client"

// shadcn's base-nova Calendar (react-day-picker), restyled for the pilot app: --app-* tokens, 44px day cells at every
// width (plan date-picker-drawer C-20), the Button's focus outline, light only.

import * as React from "react"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayPicker, getDefaultClassNames, type DayButton, type Locale } from "react-day-picker"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-app-surface p-2 [--cell-radius:var(--app-radius-inner)] [--cell-size:--spacing(11)]",
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-app-small font-semibold",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn("relative rounded-(--cell-radius)", defaultClassNames.dropdown_root),
        dropdown: cn("absolute inset-0 bg-app-surface opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "font-semibold text-app-ink select-none",
          captionLayout === "label"
            ? "text-app-base"
            : "flex items-center gap-1 rounded-(--cell-radius) text-app-small [&>svg]:size-3.5 [&>svg]:text-app-muted",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-(--cell-radius) font-mono text-app-label font-bold text-app-muted select-none",
          defaultClassNames.weekday
        ),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
        week_number: cn("text-app-label text-app-muted select-none", defaultClassNames.week_number),
        day: cn(
          "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none",
          defaultClassNames.day
        ),
        range_start: cn("rounded-l-(--cell-radius) bg-app-inset", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-(--cell-radius) bg-app-inset", defaultClassNames.range_end),
        today: cn("rounded-(--cell-radius) font-bold text-app-ink [&_button]:bg-app-inset", defaultClassNames.today),
        outside: cn("text-app-muted aria-selected:text-app-muted", defaultClassNames.outside),
        disabled: cn("text-app-disabled", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
        ),
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") return <ChevronLeftIcon className={cn("size-4", className)} {...props} />
          if (orientation === "right") return <ChevronRightIcon className={cn("size-4", className)} {...props} />
          return <ChevronDownIcon className={cn("size-4", className)} {...props} />
        },
        DayButton: ({ ...props }) => <CalendarDayButton locale={locale} {...props} />,
        WeekNumber: ({ children, ...props }) => (
          <td {...props}>
            <div className="flex size-(--cell-size) items-center justify-center text-center">{children}</div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-0.5 border-0 text-app-base leading-none font-normal tabular-nums",
        "group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:outline-2 group-data-[focused=true]/day:outline-offset-2 group-data-[focused=true]/day:outline-ring",
        "data-[range-end=true]:bg-app-accent data-[range-end=true]:text-app-on-accent data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-app-inset data-[range-start=true]:bg-app-accent data-[range-start=true]:text-app-on-accent",
        "data-[selected-single=true]:bg-app-accent data-[selected-single=true]:text-app-on-accent",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
```

The generated file passes `ref` the same way (React 19 accepts `ref` as a prop). If `Button` doesn't forward `ref` and `npm run typecheck` complains, drop `ref={ref}` and the effect: react-day-picker 10 also moves focus itself.

- [ ] **Step 5: Check it compiles**

Run: `cd frontend && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/ui/calendar.tsx frontend/components/ui/button.tsx frontend/package.json frontend/package-lock.json
git commit -m "Add shadcn's Calendar, restyled to the app's tokens, with react-day-picker pinned"
```

---

### Task 3: `DateCalendar`, the calendar with the component's dates on it

**Files:**
- Create: `frontend/components/app/date-calendar.tsx`
- Test: `frontend/components/app/date-calendar.spec.tsx`

- [ ] **Step 1: Write the failing spec**

```tsx
// frontend/components/app/date-calendar.spec.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DateMark } from "@/lib/app/date-marks";

import { DateCalendar } from "./date-calendar";

const marks: DateMark[] = [
  { iso: "2026-10-16", kind: "stage", short: "S4", name: "Stage 4", saved: true },
  { iso: "2026-10-23", kind: "stage", short: "S5", name: "Stage 5 (not saved)", saved: false },
  { iso: "2026-10-23", kind: "item", short: "B", name: "item B", saved: true },
  { iso: "2026-11-27", kind: "completion", short: "End", name: "the completion date", saved: true },
];

const draw = (value = "2026-10-16", onPick = vi.fn()) =>
  render(<DateCalendar value={value} marks={marks} completionDate="2026-11-27" today="2026-10-14" onPick={onPick} />);

describe("DateCalendar", () => {
  it("names every day by its date and what's on it", () => {
    draw();
    expect(screen.getByRole("button", { name: "Friday 23 October 2026: Stage 5 (not saved), item B" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wednesday 14 October 2026: today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Friday 27 November 2026: the completion date" })).toBeInTheDocument();
  });

  it("draws a short tag per mark, dashed when not saved", () => {
    draw();
    const day = screen.getByRole("button", { name: /^Friday 23 October 2026/ });
    expect(day).toHaveTextContent("23S5B");
    expect(day.querySelector('[data-saved="false"]')).toHaveTextContent("S5");
  });

  it("shows the months from today's to the completion date's, and no others", () => {
    draw();
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "December 2026" })).not.toBeInTheDocument();
  });

  it("greys out every day after the completion date", () => {
    draw();
    expect(screen.getByRole("button", { name: "Saturday 28 November 2026, after the completion date" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Friday 27 November 2026: the completion date" })).toBeEnabled();
  });

  it("marks the chosen day as selected", () => {
    draw();
    expect(screen.getByRole("button", { name: "Friday 16 October 2026: Stage 4" })).toHaveAttribute("data-selected-single", "true");
  });

  it("hands back the picked day as a calendar date", async () => {
    const onPick = vi.fn();
    draw("", onPick);
    await userEvent.click(screen.getByRole("button", { name: "Friday 30 October 2026" }));
    expect(onPick).toHaveBeenCalledWith("2026-10-30");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd frontend && npx vitest run components/app/date-calendar.spec.tsx`
Expected: FAIL, `Failed to resolve import "./date-calendar"`.

- [ ] **Step 3: Write the component**

```tsx
// frontend/components/app/date-calendar.tsx
"use client";

import { type ComponentProps, useMemo } from "react";
import type { DayButton } from "react-day-picker";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { calendarMonths, type DateMark, dayName, isoToLocalDate, localDateToIso } from "@/lib/app/date-marks";

const TAG: Record<DateMark["kind"], string> = {
  stage: "bg-app-accent text-app-on-accent",
  item: "border border-app-accent bg-app-surface text-app-accent",
  completion: "bg-app-ink text-app-on-accent",
};
const UNSAVED = "border border-dashed border-app-accent bg-app-surface text-app-accent";

/** A mark's tag: a shape and a word, never colour alone (C-14). A stage not saved yet is dashed. */
export function MarkTag({ kind, saved, children }: { kind: DateMark["kind"]; saved: boolean; children: string }) {
  return (
    <span
      data-saved={saved}
      className={`inline-flex min-w-[18px] justify-center rounded-app-inner px-0.5 font-mono text-app-label leading-[1.2] font-bold ${saved ? TAG[kind] : UNSAVED}`}
    >
      {children}
    </span>
  );
}

/**
 * The component's dates on a calendar (plan date-picker-drawer). Reusable on purpose (C-3): the date
 * drawer holds it now, the stage sheet will later. Months run in one column with no arrows (C-11);
 * days after the completion date are disabled; picking a day calls `onPick` and saves nothing.
 */
export function DateCalendar({
  value,
  marks,
  completionDate,
  today,
  onPick,
}: {
  value: string;
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  onPick: (iso: string) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, DateMark[]>();
    for (const mark of marks) map.set(mark.iso, [...(map.get(mark.iso) ?? []), mark]);
    return map;
  }, [marks]);
  const months = calendarMonths([value, ...marks.map((m) => m.iso)].filter(Boolean), today, completionDate);

  // A stable component per set of marks, so react-day-picker doesn't remount every day on each render.
  const MarkedDay = useMemo(
    () =>
      function MarkedDay(props: ComponentProps<typeof DayButton>) {
        const on = byDay.get(localDateToIso(props.day.date)) ?? [];
        return (
          <CalendarDayButton {...props}>
            {props.children}
            {on.length > 0 && (
              <span aria-hidden="true" className="flex flex-wrap justify-center gap-0.5">
                {on.map((mark) => (
                  <MarkTag key={`${mark.kind}-${mark.short}`} kind={mark.kind} saved={mark.saved}>
                    {mark.short}
                  </MarkTag>
                ))}
              </span>
            )}
          </CalendarDayButton>
        );
      },
    [byDay],
  );

  return (
    <Calendar
      mode="single"
      required
      selected={value ? isoToLocalDate(value) : undefined}
      onSelect={(date) => onPick(localDateToIso(date))}
      defaultMonth={isoToLocalDate(months.start)}
      numberOfMonths={months.count}
      hideNavigation
      showOutsideDays={false}
      weekStartsOn={1}
      today={isoToLocalDate(today)}
      disabled={{ after: isoToLocalDate(completionDate) }}
      labels={{ labelDayButton: (date) => dayName(localDateToIso(date), marks, completionDate, today) }}
      components={{ DayButton: MarkedDay }}
      className="w-full p-0"
      classNames={{ months: "flex flex-col gap-6", month: "flex w-full flex-col gap-2" }}
    />
  );
}
```

If the grid's accessible name isn't "October 2026" in react-day-picker 10 (the spec's `grid` query fails while the others pass), set `labels.labelGrid: (date) => new Intl.DateTimeFormat("en-IE", { month: "long", year: "numeric" }).format(date)` beside `labelDayButton`.

- [ ] **Step 4: Run it to see it pass**

Run: `cd frontend && npx vitest run components/app/date-calendar.spec.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/app/date-calendar.tsx frontend/components/app/date-calendar.spec.tsx
git commit -m "Draw the component's stage, item and completion dates on a calendar, with later days greyed"
```

---

### Task 4: `DatePickerDrawer`, the trigger and the right-hand drawer

**Files:**
- Create: `frontend/components/app/date-picker-drawer.tsx`
- Test: `frontend/components/app/date-picker-drawer.spec.tsx`

- [ ] **Step 1: Write the failing spec**

```tsx
// frontend/components/app/date-picker-drawer.spec.tsx
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DateMark } from "@/lib/app/date-marks";

import { DatePickerDrawer } from "./date-picker-drawer";

const marks: DateMark[] = [
  { iso: "2026-10-16", kind: "stage", short: "S4", name: "Stage 4", saved: true },
  { iso: "2026-11-27", kind: "completion", short: "End", name: "the completion date", saved: true },
];

const draw = (value: string, onPick = vi.fn()) =>
  render(
    <DatePickerDrawer
      triggerName="Choose Stage 4 date on a calendar"
      title="Choose the Stage 4 date"
      value={value}
      marks={marks}
      completionDate="2026-11-27"
      today="2026-10-14"
      onPick={onPick}
    />,
  );

describe("DatePickerDrawer", () => {
  it("opens a dialog named by its title, with the key, focused on the chosen day", async () => {
    draw("2026-10-16");
    await userEvent.click(screen.getByRole("button", { name: "Choose Stage 4 date on a calendar" }));
    const dialog = await screen.findByRole("dialog", { name: "Choose the Stage 4 date" });
    expect(within(dialog).getByRole("list", { name: "What the marks mean" })).toHaveTextContent("not saved yet");
    expect(within(dialog).getByRole("button", { name: "Friday 16 October 2026: Stage 4" })).toHaveFocus();
  });

  it("focuses today when there's no date yet", async () => {
    draw("");
    await userEvent.click(screen.getByRole("button", { name: "Choose Stage 4 date on a calendar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Wednesday 14 October 2026: today" })).toHaveFocus();
  });

  it("hands back the picked day, closes, and puts focus back on the button", async () => {
    const onPick = vi.fn();
    draw("2026-10-16", onPick);
    const trigger = screen.getByRole("button", { name: "Choose Stage 4 date on a calendar" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Friday 30 October 2026" }));
    expect(onPick).toHaveBeenCalledWith("2026-10-30");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("closes on Escape and on Close without picking", async () => {
    const onPick = vi.fn();
    draw("2026-10-16", onPick);
    await userEvent.click(screen.getByRole("button", { name: "Choose Stage 4 date on a calendar" }));
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Choose Stage 4 date on a calendar" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onPick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd frontend && npx vitest run components/app/date-picker-drawer.spec.tsx`
Expected: FAIL, `Failed to resolve import "./date-picker-drawer"`.

- [ ] **Step 3: Write the component**

```tsx
// frontend/components/app/date-picker-drawer.tsx
"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { formatCalendarDate } from "@/lib/app/component-setup";
import type { DateMark } from "@/lib/app/date-marks";

import { DateCalendar, MarkTag } from "./date-calendar";

/**
 * "Choose on calendar" and the right-hand drawer it opens (plan date-picker-drawer). Picking a day fills
 * the caller's date box through `onPick` and closes; nothing saves (C-5). Base UI returns focus to the
 * trigger on close.
 */
export function DatePickerDrawer({
  triggerName,
  title,
  value,
  marks,
  completionDate,
  today,
  onPick,
}: {
  /** The trigger's accessible name, e.g. "Choose Stage 4 date on a calendar" (D-11's contract). */
  triggerName: string;
  /** Names the dialog, e.g. "Choose the Stage 4 date" (C-15). */
  title: string;
  value: string;
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  onPick: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const days = useRef<HTMLDivElement>(null);
  // C-12: the chosen day, else today, so the column opens scrolled to the month that matters.
  const focusDay = () =>
    days.current?.querySelector<HTMLElement>('button[data-selected-single="true"]') ??
    days.current?.querySelector<HTMLElement>('[data-today="true"] button') ??
    true;

  return (
    <Drawer swipeDirection="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={<Button type="button" variant="outline" size="header" aria-label={triggerName} />}>
        Choose on calendar
      </DrawerTrigger>
      <DrawerContent initialFocus={focusDay}>
        <div className="flex items-start justify-between gap-3 border-b border-app-line px-4 pt-3 pb-4 sm:px-6 sm:pt-[18px]">
          <div className="flex min-w-0 flex-col gap-1">
            <DrawerTitle className="text-[20px] leading-[1.25] text-balance sm:text-app-section">{title}</DrawerTitle>
            <DrawerDescription className="text-app-small text-app-muted">
              {`Picking a day fills in the date. Nothing is saved until you press Save. Nothing can be set after the completion date, ${formatCalendarDate(completionDate)}.`}
            </DrawerDescription>
          </div>
          <DrawerClose render={<Button type="button" variant="outline" />}>Close</DrawerClose>
        </div>
        <ul aria-label="What the marks mean" className="flex flex-wrap gap-x-4 gap-y-1.5 border-b border-app-line px-4 py-2.5 text-app-small text-app-muted sm:px-6">
          <li className="flex items-center gap-1.5"><MarkTag kind="stage" saved>S2</MarkTag> a stage date</li>
          <li className="flex items-center gap-1.5"><MarkTag kind="stage" saved={false}>S2</MarkTag> not saved yet</li>
          <li className="flex items-center gap-1.5"><MarkTag kind="item" saved>A</MarkTag> your item</li>
          <li className="flex items-center gap-1.5"><MarkTag kind="completion" saved>End</MarkTag> completion date</li>
        </ul>
        <div ref={days} className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-7 sm:px-6">
          <DateCalendar
            value={value}
            marks={marks}
            completionDate={completionDate}
            today={today}
            onPick={(iso) => {
              onPick(iso);
              setOpen(false);
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

If the first spec fails with focus on **Close** rather than the day, `initialFocus` ran before the calendar mounted. Then replace `initialFocus={focusDay}` with `initialFocus={false}` and add, inside the component:

```tsx
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const target = focusDay();
      if (target instanceof HTMLElement) target.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);
```

(importing `useEffect`), and check `react-day-picker`'s day cell attribute for today (`data-today`) in `node_modules/react-day-picker/dist/esm/components/Day.js` if the second spec still fails.

- [ ] **Step 4: Run it to see it pass**

Run: `cd frontend && npx vitest run components/app/date-picker-drawer.spec.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/app/date-picker-drawer.tsx frontend/components/app/date-picker-drawer.spec.tsx
git commit -m "Open the date calendar in a right-hand drawer that fills the date and hands focus back"
```

---

### Task 5: Stage dates: a calendar on every row, and the year view reads the draft

**Files:**
- Modify: `frontend/components/app/stage-dates-form.tsx`
- Test: `frontend/components/app/stage-dates-form.spec.tsx`

- [ ] **Step 1: Write the failing spec cases**

Add `waitFor` to the Testing Library import at the top of `stage-dates-form.spec.tsx`:

```tsx
import { render, screen, waitFor, within } from "@testing-library/react";
```

and these two cases inside `describe("StageDatesForm", ...)`:

```tsx
  it("shows a typed but unsaved date on another stage's calendar, and a pick fills the box without saving", async () => {
    render5();
    await userEvent.type(screen.getByLabelText("Stage 4 date"), "2026-10-16");
    await userEvent.click(screen.getByRole("button", { name: "Choose Stage 5 date on a calendar" }));
    const dialog = await screen.findByRole("dialog", { name: "Choose the Stage 5 date" });
    expect(within(dialog).getByRole("button", { name: "Friday 16 October 2026: Stage 4 (not saved)" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Friday 25 September 2026: Stage 3" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Friday 26 February 2027: the completion date" })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Friday 23 October 2026" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Stage 5 date")).toHaveValue("2026-10-23");
    expect(api.send).not.toHaveBeenCalled();
  });

  it("puts a date that isn't saved yet on the year view's calendar", async () => {
    render5();
    await userEvent.type(screen.getByLabelText("Stage 4 date"), "2026-10-16");
    await userEvent.click(screen.getByRole("button", { name: "Show calendar" }));
    await userEvent.click(screen.getByRole("button", { name: "October 2026" }));
    expect(screen.getByTitle("Stage 4, Name 4")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && npx vitest run components/app/stage-dates-form.spec.tsx`
Expected: the two new cases FAIL (no "Choose Stage 5 date on a calendar" button; no "Stage 4, Name 4" title, because the year view still reads the saved stages). Every existing case still passes.

- [ ] **Step 3: Compute the marks and the draft-dated stages in `StageDatesForm`**

Add the import beside the other `lib/app` imports:

```tsx
import { dateMarks } from "@/lib/app/date-marks";
```

After `useEffect(() => setDraft(initial), [initial]);` add:

```tsx
  // The calendar and the year view both read the draft, so a date typed but not saved shows (C-6, C-8).
  const marks = useMemo(
    () => dateMarks(component.stages, draft, component.brief.completionDate),
    [component.stages, draft, component.brief.completionDate],
  );
  const drafted = useMemo(
    () => component.stages.map((s) => ({ ...s, dueDate: draft[s.id] || null })),
    [component.stages, draft],
  );
```

In `const yearView = (<YearView stages={component.stages} ...`, change `stages={component.stages}` to:

```tsx
      stages={drafted}
```

- [ ] **Step 4: Pass the calendar to each row, and to `TeacherItems`**

In the `<StageDateRow ... />` call add three props after `max={component.brief.completionDate}`:

```tsx
                marks={marks}
                today={today}
```

(The row already gets `max`, which is the completion date.)

Change `<TeacherItems componentId={component.id} stages={component.stages} />` to:

```tsx
      <TeacherItems
        componentId={component.id}
        stages={component.stages}
        calendar={{ marks, completionDate: component.brief.completionDate, today }}
      />
```

(`TeacherItems` gets its `calendar` prop in Task 6; until then `tsc` will flag this line, which is fine mid-task. Do Task 6 before running `make verify`.)

- [ ] **Step 5: Add the drawer to `StageDateRow`**

Import it with the other local components:

```tsx
import { DatePickerDrawer } from "./date-picker-drawer";
```

and the type:

```tsx
import type { DateMark } from "@/lib/app/date-marks";
```

Add `marks` and `today` to the row's destructured props and to its prop type:

```tsx
  marks,
  today,
```

```tsx
  marks: ReadonlyArray<DateMark>;
  today: string;
```

Add `[&::-webkit-calendar-picker-indicator]:hidden` to the date input's `className` (C-10), so it begins:

```tsx
          className={`min-h-11 w-full rounded-app-control border bg-app-surface px-3 py-2.5 text-app-base text-app-ink md:min-h-0 md:w-[176px] md:px-2.5 md:py-2 [&::-webkit-calendar-picker-indicator]:hidden ${inputBorder}`}
```

After the `<span ...>{value ? weekdayDate(value) : "No date yet"}</span>` add:

```tsx
        <DatePickerDrawer
          triggerName={`Choose ${label} date on a calendar`}
          title={`Choose the ${label} date`}
          value={value}
          marks={marks}
          completionDate={max}
          today={today}
          onPick={onChange}
        />
```

- [ ] **Step 6: Run the spec**

Run: `cd frontend && npx vitest run components/app/stage-dates-form.spec.tsx`
Expected: PASS, every case including the two new ones.

- [ ] **Step 7: Commit (after Task 6, so the tree type-checks)**

Hold this commit and make one commit for Tasks 5 and 6 at the end of Task 6.

---

### Task 6: Item dates: the same calendar in the item form

**Files:**
- Modify: `frontend/components/app/teacher-items.tsx`
- Test: `frontend/components/app/teacher-items.spec.tsx`

- [ ] **Step 1: Give every existing render the new prop, and write the failing case**

At the top of `teacher-items.spec.tsx`, change the Testing Library import to include `waitFor`, add the type import, and add the fixture after `stages`:

```tsx
import { render, screen, waitFor, within } from "@testing-library/react";
```

```tsx
import type { DateMark } from "@/lib/app/date-marks";
```

```tsx
const CAL = {
  marks: [{ iso: "2026-10-16", kind: "stage", short: "S4", name: "Stage 4", saved: true }] as DateMark[],
  completionDate: "2027-02-26",
  today: "2026-09-14",
};
```

Then replace every `stages={stages()} />` in the file with `stages={stages()} calendar={CAL} />` (8 places):

Run: `cd frontend && sed -i '' 's/stages={stages()} \/>/stages={stages()} calendar={CAL} \/>/' components/app/teacher-items.spec.tsx && grep -c 'calendar={CAL}' components/app/teacher-items.spec.tsx`
Expected: `8`.

Add this case inside `describe("TeacherItems", ...)`:

```tsx
  it("picks an item's date on the calendar, with the stage dates on it", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i4", text: "Lab notebooks in", dueDate: "2026-10-23" });
    render(<TeacherItems componentId="k1" stages={stages()} calendar={CAL} />);
    await userEvent.click(screen.getByRole("button", { name: "Add item" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Item" }), "Lab notebooks in");
    await userEvent.click(screen.getByRole("button", { name: "Choose the item's date on a calendar" }));
    const dialog = await screen.findByRole("dialog", { name: "Choose the date for “Lab notebooks in”" });
    expect(within(dialog).getByRole("button", { name: "Friday 16 October 2026: Stage 4" })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Friday 23 October 2026" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Date (optional)")).toHaveValue("2026-10-23");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/components/k1/teacher-items",
      { stageId: "s4", text: "Lab notebooks in", dueDate: "2026-10-23" }, expect.anything());
  });

  it("names the drawer for a new item before it has any text", async () => {
    render(<TeacherItems componentId="k1" stages={stages()} calendar={CAL} />);
    await userEvent.click(screen.getByRole("button", { name: "Add item" }));
    await userEvent.click(screen.getByRole("button", { name: "Choose the item's date on a calendar" }));
    expect(await screen.findByRole("dialog", { name: "Choose the date for the new item" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run it to see the new cases fail**

Run: `cd frontend && npx vitest run components/app/teacher-items.spec.tsx`
Expected: the two new cases FAIL (no "Choose the item's date on a calendar" button); the rest pass (an unknown prop doesn't break them at run time).

- [ ] **Step 3: Add the prop and the drawer to `TeacherItems`**

Imports:

```tsx
import type { DateMark } from "@/lib/app/date-marks";

import { DatePickerDrawer } from "./date-picker-drawer";
```

Signature:

```tsx
export function TeacherItems({
  componentId,
  stages,
  calendar,
}: {
  componentId: string;
  stages: ReadonlyArray<StageLike>;
  /** The stage form's marks (from its draft), so an item's calendar shows unsaved stage dates too. */
  calendar: { marks: ReadonlyArray<DateMark>; completionDate: string; today: string };
}) {
```

In `form`, change the date `Field`'s input to hide the native icon (C-10):

```tsx
          {(control) => (
            <input
              {...control}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${control.className} [&::-webkit-calendar-picker-indicator]:hidden`}
            />
          )}
```

and between `</FieldGroup>` and the buttons' `<div className="flex flex-wrap gap-2">` add:

```tsx
      <div>
        <DatePickerDrawer
          triggerName="Choose the item's date on a calendar"
          title={text.trim() ? `Choose the date for “${text.trim()}”` : "Choose the date for the new item"}
          value={dueDate}
          marks={calendar.marks}
          completionDate={calendar.completionDate}
          today={calendar.today}
          onPick={setDueDate}
        />
      </div>
```

- [ ] **Step 4: Run both specs, then types**

Run: `cd frontend && npx vitest run components/app/teacher-items.spec.tsx components/app/stage-dates-form.spec.tsx && npx tsc --noEmit -p .`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit Tasks 5 and 6**

```bash
git add frontend/components/app/stage-dates-form.tsx frontend/components/app/stage-dates-form.spec.tsx frontend/components/app/teacher-items.tsx frontend/components/app/teacher-items.spec.tsx
git commit -m "Choose stage and item dates on a calendar that shows every other date, saved or not, and let the year view show unsaved dates"
```

---

### Task 7: The teacher's journey opens the drawer

**Files:**
- Modify: `frontend/e2e/phase2.e2e.ts` (after `await expect(teacher.getByLabel("Stage 4 date")).toHaveValue("2026-10-16");`, line 52)

- [ ] **Step 1: Add the round trip**

Insert after line 52:

```ts
  // The date drawer (date-picker-drawer): an unsaved date shows on another stage's calendar, a pick
  // fills the box, and focus comes back. Put the dates back after, so the rest of the journey is unchanged.
  await teacher.getByLabel("Stage 5 date").fill("2026-12-11");
  await teacher.getByRole("button", { name: "Choose Stage 6 date on a calendar" }).click();
  const drawer = teacher.getByRole("dialog", { name: "Choose the Stage 6 date" });
  await expect(drawer.getByRole("button", { name: "Friday 11 December 2026: Stage 5 (not saved)" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Friday 22 January 2027: Stage 6" })).toBeFocused();
  await expectAccessible(teacher);
  await drawer.getByRole("button", { name: "Friday 29 January 2027" }).click();
  await expect(drawer).toHaveCount(0);
  await expect(teacher.getByLabel("Stage 6 date")).toHaveValue("2027-01-29");
  await expect(teacher.getByRole("button", { name: "Choose Stage 6 date on a calendar" })).toBeFocused();
  await teacher.getByLabel("Stage 6 date").fill("2027-01-22");
  await teacher.getByLabel("Stage 5 date").fill("2026-12-09");
```

- [ ] **Step 2: Run the journey**

Run (repo root): `make e2e`
Expected: every test passes on both `laptop` and `phone`, axe clean with the drawer open. If axe flags the day buttons (for example `nested-interactive` from the tags inside a button), the tags are `aria-hidden` and the fix is in `MarkTag`'s markup, not in the test.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/phase2.e2e.ts
git commit -m "Prove the date drawer in the teacher's journey on laptop and phone, with axe"
```

---

### Task 8: Docs, the UI checklist, and verify

**Files:**
- Modify: `docs/ARCHITECTURE.md`, `docs/PILOT-ROADMAP.md` (§6.2 `/teach/classes/[id]/component` row), `docs/BACKLOG.md`, `docs/HANDOFF.md`

- [ ] **Step 1: `docs/ARCHITECTURE.md`**

Find the frontend bullet that describes the Component tab (`StageDatesForm` / `TeacherItems` / `YearView`) and add, in the same style:

```markdown
- **Date picker drawer** (`components/app/date-picker-drawer.tsx`, `date-calendar.tsx`, `lib/app/date-marks.ts`). Every date on the Component tab has a "Choose on calendar" button under its typed box; it opens a right-hand Base UI drawer holding `DateCalendar` (shadcn Calendar, react-day-picker 10). `StageDatesForm` computes the marks once from its `draft` (`dateMarks`: each stage's draft date, marked not saved when it differs from the saved one; each dated item by letter; the completion date) and passes them to every row and to `TeacherItems`, so unsaved stage dates show on any date's calendar. The year view also gets the draft dates. Dates cross into react-day-picker as local `Date`s (`isoToLocalDate` / `localDateToIso`), never UTC, so no zone moves a day. Picking a day only fills the box; saving is unchanged. Day buttons are named `<full date>: <marks>` (`dayName`), and specs and `phase2.e2e.ts` query those names.
```

- [ ] **Step 2: `docs/PILOT-ROADMAP.md` §6.2**

In the `/teach/classes/[id]/component` row's "Shows" cell, add: `Each date also has **Choose on calendar**: a right-hand drawer with every stage, item and completion date on a calendar (unsaved ones dashed), days after the completion date greyed.` In its "Actions" cell add `Choose a date on the calendar`.

- [ ] **Step 3: `docs/BACKLOG.md`**

Row 3 (`date-picker-drawer`): status `built on pilot/date-picker-drawer, not merged: self-review, changes doc and PR still to do`.

- [ ] **Step 4: UI checklist by eye**

Run `make db-up`, `make backend-run`, `make frontend-run`; open a teacher's Component tab in the browser and check against `docs/design/UI-CHECKLIST.md`:
- 390px and 1140px: the drawer is full width on the phone, 520px on desktop; a week of 44px days fits with no sideways scroll.
- Keyboard only: Tab to "Choose on calendar", Enter opens, focus is on the chosen day, arrows move by day and across months, Enter picks, focus returns; Escape closes.
- 200% zoom: the drawer still scrolls and nothing is cut off.
- A day with two tags (a stage and an item) and the completion day stay readable.
- Chrome: the browser's own calendar icon is gone; typing a date still works.

Write what was and wasn't checked into `docs/HANDOFF.md`.

- [ ] **Step 5: `docs/HANDOFF.md`**

A new top section, "Date picker drawer (date): built on `pilot/date-picker-drawer`, not merged": what's built, the `make verify` and `make e2e` results with counts, the checklist pass from Step 4, "Tim: confirm C-9 to C-20", and still to do: `/self-review` in a fresh session, `write-changes` (`docs/changes/date-picker-drawer.md`), the PR into `pilotMain`. Mention that `docs/design/prompts/D-11-date-picker-drawer.md` is ready if a design pack is wanted.

- [ ] **Step 6: Verify**

Run (repo root): `make verify && make e2e`
Expected: both exit 0. Record the counts in `HANDOFF.md`.

- [ ] **Step 7: Commit**

```bash
git add docs/ARCHITECTURE.md docs/PILOT-ROADMAP.md docs/BACKLOG.md docs/HANDOFF.md
git commit -m "Record the date picker drawer in the architecture, roadmap, backlog and hand-over"
```

---

## Part 2 — the D-11 restyle (added 26 Oct 2026)

> **For agentic workers:** the same sub-skill as Part 1. Part 1 (Tasks 1–8) is built and uncommitted on `pilot/source-builder`'s working tree (Task 0 was skipped at Tim's request; `docs/HANDOFF.md`). Start Part 2 only once Tim has committed Part 1 where he wants it. Part 2 changes Part 1's files; there is no backend change.

**Goal:** rework the date picker drawer to design pack D-11, direction B: a live year line above one month; tap a day, read its gaps, then `Use this date`; `Clear date`; today in gold and your pick in azure; one new slide for every right-hand drawer, the review drawer included; the page's year view drawn by the same line; and a dashed "not saved" date box on the page.

**Architecture:** `lib/app/date-marks.ts` gains the footer's words (`gapWords`, `pickReadout`) and the run's start (`runStart`), all pure. A new `MarkTag` file and a new `YearLine` are shared by the page's `YearView` and the drawer. `DateCalendar` shows one controlled month and keeps days after the completion date focusable. `DatePickerDrawer` owns the drawer's short-lived state (the tapped day, the month, a refused day) and only calls `onPick` from `Use this date` or `Clear date`. The slide changes once, in the shared `components/ui/drawer.tsx`, so D-10's review drawer (`request-drawer.tsx`) gets it too.

**Tech stack:** unchanged.

**Spec:** `docs/design/pilot/D-11-date-picker-drawer/NOTES.md` (exact copy, layout, the four answers), its `tokens.css`, and the frames `design/01-date-box.html` to `design/07-keyboard-focus.html`. Where this plan's prose is shorter than NOTES, NOTES wins; where this plan leaves a visual detail out (weekend numbers, the hatch on the line), it is not required.

### Global constraints (Part 2)

- Next.js stays on 15.3.9; react-day-picker stays pinned at 10.0.2; no new dependency.
- No raw hex in components: every colour is an `--app-*` token in `app/globals.css`, used through its Tailwind name.
- Light only. Body 16px, nothing under 12px, `tabular-nums` on dates. Dates through the existing `Intl` helpers (`weekdayDate` → `Fri 27 Nov 2026`).
- A day is 44 × 48px below `sm:` and 60 × 48px from `sm:` up, with 8px gaps; buttons at least 44px.
- Accessible names don't change: `<stage label> date`, `Date (optional)`, the day names (`Friday 16 October 2026: Stage 4 (not saved), item B`; greyed days end `, after the completion date`), `What the marks mean`, `Close`, the drawer titles (C-15). New names: `Use this date`, `Clear date`, the arrows' month names (`October 2026`, `No earlier month`, `No later month`), the line's `Show December 2026`.
- Test first, but lean (Tim, 26 Oct 2026): a few cases per task that prove the behaviour that changed, and existing specs updated only where a name or a behaviour changes.
- `transition-[…]` names its properties (never `transition-all`); animated elements carry `motion-reduce:`. No custom `--text-*` size and `text-*` colour through one `cn()` call (UI-STANDARDS §2): use a template literal.

---

### Task 9: The D-11 tokens, and the new slide on every right-hand drawer

**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `frontend/components/ui/drawer.tsx`

No spec of its own (motion and colour; UI-STANDARDS §2 says specs must not check `transitionDuration`). The existing drawer specs stay green, and Task 15 checks both drawers by eye.

- [ ] **Step 1: The tokens**

In `frontend/app/globals.css`, in the `:root` app tokens, after `--app-sheet-width: 520px;`:

```css
  /* Pack D-11 — the date picker drawer. Azure is "your pick", gold is "today"; neither is a state.
     Ratios measured; full notes in docs/design/pilot/D-11-date-picker-drawer/tokens.css. */
  --app-pick: #0A6AA8;              /* 5.77:1; white on it 5.77:1; 5.03:1 on --app-pick-tint */
  --app-pick-hover: #08578A;        /* white on it 7.66:1 */
  --app-pick-tint: #E6F1F9;         /* the run back to the stage before; ink 16.12:1, muted 4.71:1 on it */
  --app-today: #FFC94D;             /* the today disc, a ground for ink (12.07:1) */
  --app-today-ring: #A87400;        /* its ring and the dashed today line; 4.07:1 on white, 3.55:1 on pick-tint */
  --app-radius-tag: 3px;            /* mark tags (S4, +2) */
  --app-sheet-duration: 300ms;      /* every right-hand drawer slides in on this (C-30)… */
  --app-sheet-ease: cubic-bezier(.32, .72, 0, 1);
  --app-sheet-duration-exit: 200ms; /* …and out on this */
  --app-sheet-ease-exit: cubic-bezier(.4, 0, 1, 1);
```

In the `@media (prefers-reduced-motion: reduce) { :root { … } }` block, beside `--app-duration: 0ms;`:

```css
    --app-sheet-duration: 0ms;
    --app-sheet-duration-exit: 0ms;
```

In the `@theme` block, after `--color-app-signed-recent: var(--app-signed-recent);`:

```css
  --color-app-pick: var(--app-pick);
  --color-app-pick-hover: var(--app-pick-hover);
  --color-app-pick-tint: var(--app-pick-tint);
  --color-app-today: var(--app-today);
  --color-app-today-ring: var(--app-today-ring);
```

after `--radius-app-inner: var(--app-radius-inner);`:

```css
  --radius-app-tag: var(--app-radius-tag);
```

and after `--ease-app: var(--app-ease);`:

```css
  --ease-app-sheet: var(--app-sheet-ease);
  --ease-app-sheet-exit: var(--app-sheet-ease-exit);
```

- [ ] **Step 2: The slide, in the shared drawer**

In `frontend/components/ui/drawer.tsx` (the app only uses right-hand drawers, so the bottom-sheet height transition can go):

In `DrawerOverlay`'s classes, replace `transition-opacity duration-[var(--app-duration)] ease-app` with `transition-opacity duration-(--app-sheet-duration) ease-linear motion-reduce:transition-none`, and `data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]` with `data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*var(--app-sheet-duration-exit))]`.

In `DrawerContent`'s "Base." line, replace `transition-[transform,height,opacity,filter] duration-[var(--app-duration)] ease-app` with `transition-transform duration-(--app-sheet-duration) ease-app-sheet motion-reduce:transition-none`.

In its "Transitions." line, replace every `calc(var(--drawer-swipe-strength)*400ms)` (three places) with `calc(var(--drawer-swipe-strength,1)*var(--app-sheet-duration-exit))`, and add `data-ending-style:ease-app-sheet-exit` at the start of the line.

Change the file's header comment to:

```tsx
// Restyled for the pilot app from design pack D-10 (the review history, a right-hand drawer): scrim and width from
// --app-* tokens, no icon-only controls (callers put a text <DrawerClose> in the header). Pack D-11 gave every drawer
// its slide: 300ms in, 200ms out, transform only, 0ms under reduced motion (plan date-picker-drawer C-30).
```

- [ ] **Step 3: Both drawers' specs still pass**

Run: `cd frontend && npx vitest run components/app`
Expected: PASS. (`request-history`, `request-review` and `student-checkpoints` cover the review drawer; `date-picker-drawer` the date drawer.)

- [ ] **Step 4: Commit**

```bash
git add frontend/app/globals.css frontend/components/ui/drawer.tsx
git commit -m "Add the D-11 tokens and give every right-hand drawer the new slide, the review drawer included"
```

---

### Task 10: The footer's words (`lib/app/date-marks.ts`)

**Files:**
- Modify: `frontend/lib/app/date-marks.ts`
- Test: `frontend/lib/app/date-marks.test.ts`

**Interfaces:**
- Produces: `DateMark.ordinal?: number` (stage marks only); `type Picking = { kind: 'stage'; ordinal: number } | { kind: 'item' }`; `gapWords(days: number): string`; `runStart(marks, picking, selected): string | null`; `type Gap = { mark: DateMark; amount: string; rest: string; run: boolean }`; `pickReadout(marks, picking, selected, completionDate): { gaps: Gap[]; asks: string[]; also: string[] }`.

- [ ] **Step 1: Write the failing tests**

In `date-marks.test.ts`, add `gapWords, pickReadout, runStart` to the import from `./date-marks.ts`. In the two `dateMarks` tests that `deepEqual` a stage mark, add the stage's number: `ordinal: 3` in "a saved stage date is a saved stage mark" and `ordinal: 4` in "a typed but unsaved stage date…". Then add:

```ts
describe('the footer: gapWords, pickReadout, runStart', () => {
  const marks = dateMarks([stage(3, '2026-11-06'), stage(4, '2026-11-27'), stage(5, '2027-01-15'), stage(6, null)], {}, '2027-02-26');
  const words = (r: { gaps: { amount: string; rest: string }[] }) => r.gaps.map((g) => `${g.amount} ${g.rest}`);

  test('exact days under three weeks, whole weeks from there', () => {
    assert.deepEqual([1, 13, 21, 57].map(gapWords), ['1 day', '13 days', '3 weeks', '8 weeks']);
  });

  test('a stage: the gap back to the stage before (the run) and on to the stage after', () => {
    assert.deepEqual(words(pickReadout(marks, { kind: 'stage', ordinal: 4 }, '2026-11-19', '2027-02-26')), ['13 days after Stage 3', '8 weeks before Stage 5']);
    assert.equal(runStart(marks, { kind: 'stage', ordinal: 4 }, '2026-11-19'), '2026-11-06');
  });

  test('with no later dated stage the gap is to the completion date; before the stage before, it asks', () => {
    assert.deepEqual(words(pickReadout(marks, { kind: 'stage', ordinal: 6 }, '2027-02-26', '2027-02-26')), ['6 weeks after Stage 5', 'On the completion date']);
    assert.deepEqual(pickReadout(marks, { kind: 'stage', ordinal: 4 }, '2026-11-02', '2027-02-26').asks, [
      "Before Stage 3 (Fri 6 Nov). That's allowed, but check it's what you meant.",
    ]);
  });

  test('an item: the nearest dated stages either side, and no run', () => {
    assert.deepEqual(words(pickReadout(marks, { kind: 'item' }, '2026-12-04', '2027-02-26')), ['7 days after Stage 4', '6 weeks before Stage 5']);
    assert.equal(runStart(marks, { kind: 'item' }, '2026-12-04'), null);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && node --test lib/app/date-marks.test.ts`
Expected: FAIL, `does not provide an export named 'gapWords'`.

- [ ] **Step 3: Write the code**

In `frontend/lib/app/date-marks.ts`, change the import to:

```ts
import { letteredItems, shortWeekdayDate, type StageLike } from './component-setup.ts';
```

add to `DateMark`, after `saved: boolean;`:

```ts
  /** A stage's number, so the footer can find the stages either side of the one being picked (C-31). */
  ordinal?: number;
```

in `dateMarks`, give stage marks their number:

```ts
    marks.push({ iso, kind: 'stage', short: `S${stage.ordinal}`, name: saved ? label : `${label} (not saved)`, saved, ordinal: stage.ordinal });
```

and append:

```ts
/** What the drawer is choosing a date for. */
export type Picking = { kind: 'stage'; ordinal: number } | { kind: 'item' };

/** One line of the footer, drawn as "<b>13 days</b> after Stage 3". `run` is the gap drawn in azure. */
export type Gap = { mark: DateMark; amount: string; rest: string; run: boolean };

const CHECK = "That's allowed, but check it's what you meant.";
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** "1 day", "13 days", "3 weeks": exact under three weeks, whole weeks (rounded) from there (C-31). */
export function gapWords(days: number): string {
  return days < 21 ? `${days} ${days === 1 ? 'day' : 'days'}` : `${Math.round(days / 7)} weeks`;
}

/** The nearest dated stages before and after stage `ordinal`, in stage order, saved or not. */
function neighbours(marks: ReadonlyArray<DateMark>, ordinal: number) {
  const stages = marks.filter((m) => m.kind === 'stage').sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
  const before = stages.filter((m) => (m.ordinal ?? 0) < ordinal);
  return { before: before[before.length - 1] ?? null, after: stages.find((m) => (m.ordinal ?? 0) > ordinal) ?? null };
}

/** Where the azure run starts: the stage before's date, when it's before the picked day (C-27). Items have none. */
export function runStart(marks: ReadonlyArray<DateMark>, picking: Picking, selected: string): string | null {
  if (picking.kind !== 'stage' || !selected) return null;
  const { before } = neighbours(marks, picking.ordinal);
  return before && before.iso < selected ? before.iso : null;
}

/** The footer's words for a picked day (C-31): the gaps either side, anything to check, and what else is on the day. */
export function pickReadout(
  marks: ReadonlyArray<DateMark>,
  picking: Picking,
  selected: string,
  completionDate: string,
): { gaps: Gap[]; asks: string[]; also: string[] } {
  const gaps: Gap[] = [];
  const asks: string[] = [];
  if (picking.kind === 'stage') {
    const { before, after } = neighbours(marks, picking.ordinal);
    if (before) {
      const days = daysBetween(before.iso, selected);
      if (days > 0) gaps.push({ mark: before, amount: gapWords(days), rest: `after ${before.name}`, run: true });
      else asks.push(`${days === 0 ? `The same day as ${before.name}.` : `Before ${before.name} (${shortWeekdayDate(before.iso)}).`} ${CHECK}`);
    }
    if (after) {
      const days = daysBetween(selected, after.iso);
      if (days > 0) gaps.push({ mark: after, amount: gapWords(days), rest: `before ${after.name}`, run: false });
      else asks.push(`${days === 0 ? `The same day as ${after.name}.` : `After ${after.name} (${shortWeekdayDate(after.iso)}).`} ${CHECK}`);
    } else {
      const end: DateMark = marks.find((m) => m.kind === 'completion') ?? { iso: completionDate, kind: 'completion', short: 'End', name: 'the completion date', saved: true };
      const days = daysBetween(selected, completionDate);
      gaps.push(days === 0
        ? { mark: end, amount: 'On', rest: 'the completion date', run: false }
        : { mark: end, amount: gapWords(days), rest: 'before the completion date', run: false });
    }
  } else {
    const byDate = marks.filter((m) => m.kind === 'stage').sort((a, b) => a.iso.localeCompare(b.iso));
    const earlier = byDate.filter((m) => m.iso <= selected);
    const prev = earlier[earlier.length - 1];
    const next = byDate.find((m) => m.iso > selected);
    if (prev) {
      const days = daysBetween(prev.iso, selected);
      gaps.push({ mark: prev, amount: days === 0 ? 'On' : gapWords(days), rest: days === 0 ? `the same day as ${prev.name}` : `after ${prev.name}`, run: false });
    }
    if (next) gaps.push({ mark: next, amount: gapWords(daysBetween(selected, next.iso)), rest: `before ${next.name}`, run: false });
  }
  const own = picking.kind === 'stage' ? picking.ordinal : null;
  const also = marks.filter((m) => m.iso === selected && !(m.kind === 'stage' && m.ordinal === own)).map((m) => m.name);
  return { gaps, asks, also };
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `cd frontend && node --test lib/app/date-marks.test.ts`
Expected: PASS, every test.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/app/date-marks.ts frontend/lib/app/date-marks.test.ts
git commit -m "Work out the date drawer's footer: the gaps to the stages either side, what to check, and the run"
```

---

### Task 11: One line for the page and the drawer (`MarkTag`, `YearLine`, `YearView`)

**Files:**
- Create: `frontend/components/app/mark-tag.tsx`
- Create: `frontend/components/app/year-line.tsx`
- Test: `frontend/components/app/year-line.spec.tsx`
- Modify: `frontend/components/app/year-view.tsx`, `frontend/components/app/year-view.spec.tsx`
- Modify: `frontend/components/app/stage-dates-form.tsx` (one prop), `frontend/components/app/stage-dates-form.spec.tsx` (one case)

**Interfaces:**
- Consumes: `DateMark` with `ordinal` (Task 10); `yearSpan`, `positionPct`, `monthTicks`, `gapLabels`, `formatCalendarDate` (`lib/app/component-setup.ts`); `calendarMonths` (`lib/app/date-marks.ts`).
- Produces: `MarkTag({ kind: DateMark["kind"] | "more", saved?, tone?: "attention" | "error", className?, children })`; `YearLine({ marks, today, completionDate, month, pick?, gaps?, toneOf?, onMonth?, className? })` with `pick: { iso: string; label: string; runFrom: string | null; ordinal: number | null } | null`; `YearView` gains `marks: ReadonlyArray<DateMark>`.

- [ ] **Step 1: Write the failing spec**

```tsx
// frontend/components/app/year-line.spec.tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { dateMarks } from "@/lib/app/date-marks";

import { YearLine } from "./year-line";

const stage = (n: number, dueDate: string | null, items: { id: string; text: string; dueDate: string | null }[] = []) =>
  ({ id: `s${n}`, ordinal: n, label: `Stage ${n}`, name: `Name ${n}`, dueDate, items });
// Stage 5 typed as 20 Nov but not saved.
const marks = dateMarks(
  [stage(3, "2026-09-25"), stage(4, "2026-10-16", [{ id: "i1", text: "Notebooks in", dueDate: "2026-10-23" }]), stage(5, null)],
  { s5: "2026-11-20" },
  "2027-02-26",
);
const line = (props: Partial<Parameters<typeof YearLine>[0]> = {}) =>
  render(<YearLine marks={marks} today="2026-10-14" completionDate="2027-02-26" month="2026-10-01" {...props} />);

describe("YearLine", () => {
  it("draws stages as numbered tags, dashed when not saved, items by letter, and the weeks between on the page", () => {
    line({ gaps: true });
    const img = screen.getByRole("img", { name: /Your dates across the year/ });
    expect(within(img).getByText("S4")).toHaveAttribute("data-saved", "true");
    expect(within(img).getByText("S5")).toHaveAttribute("data-saved", "false");
    expect(within(img).getByText("A")).toBeInTheDocument();
    expect(within(img).getByText("14 weeks")).toBeInTheDocument();
  });

  it("in the drawer: pins the pick in place of the stage it moves, and offers months as pointer shortcuts", async () => {
    const onMonth = vi.fn();
    line({ pick: { iso: "2026-10-30", label: "S4 30 Oct", runFrom: "2026-09-25", ordinal: 4 }, onMonth });
    const group = screen.getByRole("group", { name: /Your dates across the year/ });
    expect(within(group).getByText("S4 30 Oct")).toBeInTheDocument();
    expect(within(group).queryByText("S4")).not.toBeInTheDocument();
    const december = within(group).getByRole("button", { name: "Show December 2026" });
    expect(december).toHaveAttribute("tabindex", "-1");
    await userEvent.click(december);
    expect(onMonth).toHaveBeenCalledWith("2026-12-01");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd frontend && npx vitest run components/app/year-line.spec.tsx`
Expected: FAIL, `Failed to resolve import "./year-line"`.

- [ ] **Step 3: Write `MarkTag` in its own file**

```tsx
// frontend/components/app/mark-tag.tsx
import type { DateMark } from "@/lib/app/date-marks";

type Kind = DateMark["kind"] | "more";

const SHAPE: Record<Kind, string> = {
  stage: "h-4 min-w-[18px] rounded-app-tag px-0.5",
  item: "size-[18px] rounded-full border-[1.5px]",
  completion: "h-4 rounded-app-tag px-0.5",
  more: "h-4 rounded-app-tag border px-0.5",
};
const INK: Record<Kind, string> = {
  stage: "bg-app-accent text-app-on-accent",
  item: "border-app-accent bg-app-surface text-app-accent",
  completion: "bg-app-ink text-app-on-accent",
  more: "border-app-grey bg-app-surface text-app-ink",
};
const UNSAVED = "border-[1.5px] border-dashed border-app-accent bg-app-surface text-app-accent";
const TONE = { attention: "bg-app-attention text-app-on-accent", error: "bg-app-error text-app-on-accent" };
// Inside the picked (azure) day, tags turn white on azure. CalendarDayButton is `group/day-button`.
const ON_PICK =
  "group-data-[selected-single=true]/day-button:border-app-on-accent group-data-[selected-single=true]/day-button:bg-transparent group-data-[selected-single=true]/day-button:text-app-on-accent";

/** A mark's tag: a shape and a word, never colour alone (plan date-picker-drawer C-27). Not saved is the same tag, dashed. */
export function MarkTag({
  kind,
  saved = true,
  tone,
  className = "",
  children,
}: {
  kind: Kind;
  saved?: boolean;
  /** D-5's amber and red stage marks on the page's year view. */
  tone?: "attention" | "error";
  className?: string;
  children: string;
}) {
  const ink = !saved ? UNSAVED : tone ? TONE[tone] : INK[kind];
  return (
    <span
      data-saved={saved}
      className={`inline-flex flex-none items-center justify-center font-mono text-app-label leading-none font-bold ${SHAPE[kind]} ${ink} ${ON_PICK} ${className}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Write `YearLine`**

```tsx
// frontend/components/app/year-line.tsx
"use client";

import type { CSSProperties } from "react";

import { formatCalendarDate, gapLabels, monthTicks, positionPct, yearSpan } from "@/lib/app/component-setup";
import { calendarMonths, type DateMark } from "@/lib/app/date-marks";

import { MarkTag } from "./mark-tag";

type Tone = "accent" | "attention" | "error";
const STEM: Record<Tone, string> = { accent: "bg-app-stem", attention: "bg-app-stem-attention", error: "bg-app-stem-error" };
const DOT: Record<Tone, string> = { accent: "bg-app-accent", attention: "bg-app-attention", error: "bg-app-error" };
const MONTH = new Intl.DateTimeFormat("en-IE", { month: "long", year: "numeric", timeZone: "UTC" });

const nextMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
};
/** A mark at the very ends of the line hangs inwards instead of being cut in half (pack D-5). */
const at = (pct: number): CSSProperties => ({ left: `${pct}%`, transform: pct <= 1 ? "none" : pct >= 99 ? "translateX(-100%)" : "translateX(-50%)" });

/**
 * The component's dates on one line (plan date-picker-drawer C-26), drawn by the page's year view and by the date
 * drawer. Stages are numbered square tags on stems (dashed when not saved), items lettered rings under the axis,
 * today a gold disc, the completion date the end bar. The page adds the weeks between stages; the drawer adds its
 * pick (an azure pin, its run back to the stage before) and the months as pointer shortcuts.
 */
export function YearLine({
  marks,
  today,
  completionDate,
  month,
  pick = null,
  gaps = false,
  toneOf,
  onMonth,
  className = "",
}: {
  marks: ReadonlyArray<DateMark>;
  today: string;
  completionDate: string;
  /** The month shaded on the line, "YYYY-MM-01": the drawer's month in view, or this month on the page. */
  month: string;
  /** The drawer's pin. `ordinal` is the stage it moves, whose own mark gives way to the pin. */
  pick?: { iso: string; label: string; runFrom: string | null; ordinal: number | null } | null;
  /** The page's "16 weeks" labels between stages and the completion date. */
  gaps?: boolean;
  toneOf?: (ordinal: number) => Tone;
  /** Pointer shortcuts to a month (the drawer). Keyboard users have the arrows, so these take no tab stop. */
  onMonth?: (month: string) => void;
  className?: string;
}) {
  const stages = marks.filter((m) => m.kind === "stage" && m.ordinal !== pick?.ordinal);
  const items = marks.filter((m) => m.kind === "item");
  const dated = marks.filter((m) => m.kind !== "completion").map((m) => m.iso);
  const span = yearSpan([...dated, ...(pick ? [pick.iso] : [])], completionDate, today);
  const pct = (iso: string) => positionPct(iso, span);
  const band = { from: pct(month), to: pct(nextMonth(month)) };
  const range = calendarMonths(dated, today, completionDate);
  const months: string[] = [];
  for (let m = range.start; months.length < range.count; m = nextMonth(m)) months.push(m);
  const ghost = pick && pick.ordinal !== null ? marks.find((m) => m.kind === "stage" && m.ordinal === pick.ordinal && m.iso !== pick.iso) : undefined;
  const pickX = pick ? pct(pick.iso) : null;
  const todayX = pct(today);
  const labelRight = pickX !== null && pickX < 75 && (pickX >= todayX || pickX < 25);

  return (
    <div
      role={onMonth ? "group" : "img"}
      aria-label={`Your dates across the year, ${formatCalendarDate(span.from)} to ${formatCalendarDate(span.to)}`}
      className={`relative h-[124px] ${className}`}
    >
      <span aria-hidden="true" className="absolute inset-y-0 rounded-app-inner bg-app-accent-tint" style={{ left: `${band.from}%`, width: `${Math.max(0, band.to - band.from)}%` }} />
      {onMonth &&
        months.map((m) => (
          <button
            key={m}
            type="button"
            tabIndex={-1}
            aria-label={`Show ${MONTH.format(Date.parse(m))}`}
            onClick={() => onMonth(m)}
            className="absolute inset-y-0 cursor-pointer rounded-app-inner hover:bg-app-inset"
            style={{ left: `${pct(m)}%`, width: `${Math.max(0, pct(nextMonth(m)) - pct(m))}%` }}
          />
        ))}
      <span aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-[48px] h-px ${stages.length ? "bg-app-line" : "border-t border-dashed border-app-line"}`} />
      {stages.length === 0 && !pick && (
        <>
          <p className="absolute bottom-[60px] left-0 text-app-small text-app-muted">Your dates appear here as you set them.</p>
          <span className="absolute top-0 right-0 text-app-small whitespace-nowrap text-app-muted">{`Completion ${formatCalendarDate(completionDate)}`}</span>
        </>
      )}

      {gaps &&
        gapLabels([...marks.filter((m) => m.kind === "stage").map((m) => m.iso), completionDate], span).map((g) => (
          <span key={`${g.label}-${g.pct}`} aria-hidden="true" className="pointer-events-none absolute bottom-[42px] -translate-x-1/2 bg-app-surface px-1.5 text-app-label whitespace-nowrap text-app-muted" style={{ left: `${g.pct}%` }}>
            {g.label}
          </span>
        ))}

      {/* Today: a gold disc on the axis and a dashed line, the word on the side away from the pin. */}
      <span aria-hidden="true" className="pointer-events-none absolute top-[18px] bottom-[48px] border-l-[1.5px] border-dashed border-app-today-ring" style={{ left: `${todayX}%` }} />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-[43px] size-[11px] -translate-x-1/2 rounded-full bg-app-today shadow-[inset_0_0_0_1.5px_var(--app-today-ring)]" style={{ left: `${todayX}%` }} />
      <span aria-hidden="true" className={`pointer-events-none absolute top-0 text-app-label font-bold text-app-ink ${pickX !== null && pickX < todayX ? "pl-1.5" : "-translate-x-full pr-1.5"}`} style={{ left: `${todayX}%` }}>
        Today
      </span>

      {stages.map((s) => {
        const tone = toneOf?.(s.ordinal ?? 0) ?? "accent";
        return (
          <span key={s.short} aria-hidden="true" className="pointer-events-none absolute bottom-[44px] flex flex-col items-center" style={at(pct(s.iso))}>
            <MarkTag kind="stage" saved={s.saved} tone={tone === "accent" ? undefined : tone}>{s.short}</MarkTag>
            <span className={`w-px ${STEM[tone]}`} style={{ height: (s.ordinal ?? 0) % 2 === 1 ? 10 : 30 }} />
            <span className={`size-[9px] rounded-app-tag ${s.saved ? DOT[tone] : "border-[1.5px] border-dashed border-app-accent bg-app-surface"}`} />
          </span>
        );
      })}
      {items.map((m) => (
        <span key={m.short} aria-hidden="true" className="pointer-events-none absolute bottom-[22px] -translate-x-1/2" style={{ left: `${pct(m.iso)}%` }}>
          <MarkTag kind="item">{m.short}</MarkTag>
        </span>
      ))}
      <span aria-hidden="true" className="pointer-events-none absolute bottom-[48px] h-[30px] w-[3px] bg-app-accent" style={at(pct(completionDate))} />

      {ghost && (
        <span aria-hidden="true" className="pointer-events-none absolute bottom-[44px] size-[9px] -translate-x-1/2 rounded-app-tag border-[1.5px] border-dashed border-app-muted bg-app-surface" style={{ left: `${pct(ghost.iso)}%` }} />
      )}
      {pick && pickX !== null && (
        <>
          {pick.runFrom && (
            <span data-run aria-hidden="true" className="pointer-events-none absolute bottom-[46px] h-1 rounded-full bg-app-pick" style={{ left: `${pct(pick.runFrom)}%`, width: `${pickX - pct(pick.runFrom)}%` }} />
          )}
          <span aria-hidden="true" className="pointer-events-none absolute top-4 bottom-[48px] w-0.5 -translate-x-1/2 bg-app-pick" style={{ left: `${pickX}%` }} />
          <span aria-hidden="true" className="pointer-events-none absolute bottom-[42px] size-[13px] -translate-x-1/2 rounded-full bg-app-pick ring-2 ring-app-surface" style={{ left: `${pickX}%` }} />
          <span className={`pointer-events-none absolute top-0 rounded-app-tag bg-app-pick px-1 text-app-label leading-4 font-bold whitespace-nowrap text-app-on-accent tabular-nums ${labelRight ? "" : "-translate-x-full"}`} style={{ left: `${pickX}%` }}>
            {pick.label}
          </span>
        </>
      )}

      {monthTicks(span, stages.length === 0).map((tick) => (
        <span key={tick.iso} aria-hidden="true" className={`pointer-events-none absolute bottom-0 -translate-x-1/2 font-mono text-app-label ${tick.iso.slice(0, 7) === month.slice(0, 7) ? "font-bold text-app-accent" : "text-app-muted"}`} style={{ left: `${tick.pct}%` }}>
          {tick.label}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `cd frontend && npx vitest run components/app/year-line.spec.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Draw the year view with `YearLine`, and drop its own calendar (C-26)**

Replace `frontend/components/app/year-view.tsx` with:

```tsx
"use client";

import { useMemo } from "react";

import { formatCalendarDate, letteredItems, type StageLike } from "@/lib/app/component-setup";
import type { DateMark } from "@/lib/app/date-marks";

import { MarkTag } from "./mark-tag";
import { eyebrow } from "./styles";
import { YearLine } from "./year-line";

const textButton =
  "rounded-app-control px-1.5 py-1 text-app-meta font-semibold text-app-accent underline underline-offset-3 hover:text-app-accent-hover touch-manipulation";

/**
 * Pack D-5's year view, drawn since D-11 by the same line as the date drawer (plan date-picker-drawer C-26): every
 * date on one line, a key, and the teacher's items by letter. Read-only; the date drawer is the calendar now.
 */
export function YearView({
  stages,
  marks,
  completionDate,
  today,
  attentionStageIds,
  errorStageIds,
  footnote,
  onClose,
}: {
  stages: ReadonlyArray<StageLike>;
  /** The stage form's marks, from its draft, so a date not saved yet shows dashed. */
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  attentionStageIds: ReadonlyArray<string>;
  errorStageIds: ReadonlyArray<string>;
  footnote: string | null;
  onClose: () => void;
}) {
  const items = useMemo(() => letteredItems(stages), [stages]);
  const toneOf = (ordinal: number): "accent" | "attention" | "error" => {
    const id = stages.find((s) => s.ordinal === ordinal)?.id ?? "";
    return errorStageIds.includes(id) ? "error" : attentionStageIds.includes(id) ? "attention" : "accent";
  };

  return (
    <section className="rounded-app-card border border-app-field-border bg-app-surface px-5 pt-[18px] pb-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className={`${eyebrow} text-app-muted`}>Your dates across the year</h3>
        <button type="button" onClick={onClose} className={textButton}>
          Hide the year view
        </button>
      </div>

      <div className="-mx-5 mt-3 overflow-x-auto px-5 md:mx-0 md:overflow-visible md:px-0">
        <YearLine
          marks={marks}
          today={today}
          completionDate={completionDate}
          month={`${today.slice(0, 7)}-01`}
          gaps
          toneOf={toneOf}
          className="min-w-[560px] md:min-w-0"
        />
      </div>

      {footnote && <p className="mt-2 text-app-small text-app-muted">{footnote}</p>}

      <ul aria-label="What the marks mean" className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-app-line pt-3 text-app-small text-app-muted">
        <li className="flex items-center gap-2"><MarkTag kind="stage">S2</MarkTag>Stage date, numbered by the SEC</li>
        <li className="flex items-center gap-2"><MarkTag kind="stage" saved={false}>S2</MarkTag>Not saved yet</li>
        <li className="flex items-center gap-2"><MarkTag kind="item">A</MarkTag>Your item, lettered by date</li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-4 w-[3px] flex-none rounded-sm bg-app-accent" />
          {`Completion date, ${formatCalendarDate(completionDate)}`}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-[11px] flex-none rounded-full bg-app-today shadow-[inset_0_0_0_1.5px_var(--app-today-ring)]" />
          Today
        </li>
      </ul>

      {items.length > 0 && (
        <ul aria-label="Your items on the line" className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`flex size-[22px] flex-none items-center justify-center rounded-full font-mono text-app-label font-bold ${
                  item.dueDate ? "border-2 border-app-accent text-app-accent" : "border-2 border-dashed border-app-disabled text-app-muted"
                }`}
              >
                {item.letter}
              </span>
              <span className="min-w-0 text-app-meta text-app-ink">{item.text}</span>
              <span className="text-app-small text-app-muted">
                {item.dueDate
                  ? `${formatCalendarDate(item.dueDate)} · ${lower(item.stageLabel)}`
                  : `No date · ${lower(item.stageLabel)} · not shown on the line`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const lower = (label: string) => label.charAt(0).toLowerCase() + label.slice(1);
```

If `lib/app/timeline.ts`'s `monthWeeks`, `monthYearLabel` or `rangeFor` are now unused anywhere (`grep -rn "monthWeeks\|monthYearLabel\|rangeFor" frontend --include=*.tsx --include=*.ts`), leave them: the student timeline uses them.

In `stage-dates-form.tsx`, give the year view the marks: in `const yearView = (<YearView … />)` add `marks={marks}` after `stages={drafted}`.

- [ ] **Step 7: Update the year view's specs**

In `year-view.spec.tsx`: import `dateMarks` from `@/lib/app/date-marks` and pass `marks={dateMarks(stages(), {}, COMPLETION)}` in `view()` (before `{...props}`, and recompute it from `props.stages` when given: `marks={dateMarks(props.stages ?? stages(), {}, COMPLETION)}`). Then:
- in "names the numbers as the SEC's…", add `expect(key).toHaveTextContent("Not saved yet");` and `expect(key).toHaveTextContent("Today");`;
- in "puts every dated stage on the line…", change `getByText("1")` and `getByText("6")` to `getByText("S1")` and `getByText("S6")`;
- replace the two calendar cases ("opens the calendar on the current month…" and "shows what falls in the month, read-only…") with:

```tsx
  it("has no calendar of its own: the date drawer is the calendar", () => {
    view();
    expect(screen.queryByRole("button", { name: "Show calendar" })).not.toBeInTheDocument();
  });
```

In `stage-dates-form.spec.tsx`, replace "puts a date that isn't saved yet on the year view's calendar" with:

```tsx
  it("puts a date that isn't saved yet on the year view, dashed", async () => {
    render5();
    await typeDate("Stage 4 date", "2026-10-16");
    const line = screen.getByRole("img", { name: /Your dates across the year/ });
    expect(within(line).getByText("S4")).toHaveAttribute("data-saved", "false");
  });
```

- [ ] **Step 8: Run the specs and types**

Run: `cd frontend && npx vitest run components/app/year-line.spec.tsx components/app/year-view.spec.tsx components/app/stage-dates-form.spec.tsx && npx tsc --noEmit -p . && npm run lint`
Expected: PASS, no type or lint errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/components/app/mark-tag.tsx frontend/components/app/year-line.tsx frontend/components/app/year-line.spec.tsx frontend/components/app/year-view.tsx frontend/components/app/year-view.spec.tsx frontend/components/app/stage-dates-form.tsx frontend/components/app/stage-dates-form.spec.tsx
git commit -m "Draw the year view and the date drawer's line with one component, unsaved dates dashed, and drop the year view's own calendar"
```

---

### Task 12: `DateCalendar`: one month, the run, today's disc, greyed days that explain

**Files:**
- Modify: `frontend/components/ui/calendar.tsx`
- Modify: `frontend/components/app/date-calendar.tsx`, `frontend/components/app/date-calendar.spec.tsx`
- Modify: `frontend/components/app/date-picker-drawer.tsx` (one import line)

**Interfaces:**
- Consumes: `MarkTag` (Task 11), `DateMark`, `dayName`, `isoToLocalDate`, `localDateToIso`.
- Produces: `DateCalendar({ marks, completionDate, today, selected, month, range, runFrom, onMonth, onSelect, onAfterCompletion })`: `selected` and `month` (`"YYYY-MM-01"`) are controlled; `range` is `calendarMonths(…)`; `onAfterCompletion(iso)` fires on a tap on, or focus on, a day after the completion date.

- [ ] **Step 1: Rewrite the spec**

```tsx
// frontend/components/app/date-calendar.spec.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import type { DateMark } from "@/lib/app/date-marks";

import { DateCalendar } from "./date-calendar";

const marks: DateMark[] = [
  { iso: "2026-10-16", kind: "stage", short: "S4", name: "Stage 4", saved: true, ordinal: 4 },
  { iso: "2026-10-23", kind: "stage", short: "S5", name: "Stage 5 (not saved)", saved: false, ordinal: 5 },
  { iso: "2026-10-23", kind: "item", short: "B", name: "item B", saved: true },
  { iso: "2026-11-27", kind: "completion", short: "End", name: "the completion date", saved: true },
];

const draw = (props: Partial<ComponentProps<typeof DateCalendar>> = {}) => {
  const on = { onMonth: vi.fn(), onSelect: vi.fn(), onAfterCompletion: vi.fn() };
  render(
    <DateCalendar
      marks={marks} completionDate="2026-11-27" today="2026-10-14" selected="2026-10-16"
      month="2026-10-01" range={{ start: "2026-10-01", count: 2 }} runFrom={null} {...on} {...props}
    />,
  );
  return on;
};

describe("DateCalendar", () => {
  it("names every day by its date and what's on it, with a tag per mark, dashed when not saved", () => {
    draw();
    const day = screen.getByRole("button", { name: "Friday 23 October 2026: Stage 5 (not saved), item B" });
    expect(day.querySelector('[data-saved="false"]')).toHaveTextContent("S5");
    expect(screen.getByRole("button", { name: "Wednesday 14 October 2026: today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Friday 16 October 2026: Stage 4" })).toHaveAttribute("data-selected-single", "true");
  });

  it("shows one month, with arrows named for the month they go to", async () => {
    const { onMonth } = draw();
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "November 2026" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No earlier month" })).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(screen.getByRole("button", { name: "November 2026" }));
    expect(onMonth).toHaveBeenCalledWith("2026-11-01");
  });

  it("hands back a tapped day, but only reports a day after the completion date, which stays focusable", async () => {
    const first = draw({ selected: "" });
    await userEvent.click(screen.getByRole("button", { name: "Friday 30 October 2026" }));
    expect(first.onSelect).toHaveBeenCalledWith("2026-10-30");

    const { onSelect, onAfterCompletion } = draw({ month: "2026-11-01" });
    const late = screen.getByRole("button", { name: "Saturday 28 November 2026, after the completion date" });
    expect(late).toBeEnabled();
    expect(late).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(late);
    expect(onAfterCompletion).toHaveBeenCalledWith("2026-11-28");
    expect(onSelect).not.toHaveBeenCalled();
  });
});
```

(The second `draw` in the last case renders a second calendar into the same document; the names it queries exist only in its November.)

- [ ] **Step 2: Run it to see it fail**

Run: `cd frontend && npx vitest run components/app/date-calendar.spec.tsx`
Expected: FAIL (both months still drawn; no arrows; the late day is `disabled`).

- [ ] **Step 3: Restyle the shadcn Calendar (C-28)**

In `frontend/components/ui/calendar.tsx`, change these entries (template literals where a text size meets a text colour, UI-STANDARDS §2):

```tsx
      className={cn(
        "group/calendar bg-app-surface [--cell-radius:var(--app-radius-inner)] [--cell-size:--spacing(11)] sm:[--cell-size:--spacing(15)]",
        className
      )}
```

```tsx
        months: cn("relative flex flex-col", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-1.5", defaultClassNames.month),
        nav: cn("absolute top-0 right-0 flex items-center gap-2", defaultClassNames.nav),
        button_previous: cn(buttonVariants({ variant: "outline" }), "size-11 p-0 select-none aria-disabled:opacity-40", defaultClassNames.button_previous),
        button_next: cn(buttonVariants({ variant: "outline" }), "size-11 p-0 select-none aria-disabled:opacity-40", defaultClassNames.button_next),
        month_caption: cn("flex h-11 items-center", defaultClassNames.month_caption),
        caption_label: `font-heading text-app-title font-bold tracking-[-.015em] text-app-ink select-none ${defaultClassNames.caption_label}`,
        weekdays: cn("flex gap-2", defaultClassNames.weekdays),
        weekday: `w-(--cell-size) flex-none font-mono text-app-label font-bold text-app-muted select-none ${defaultClassNames.weekday}`,
        week: cn("mt-2 flex w-full gap-2", defaultClassNames.week),
        day: cn("group/day relative h-12 w-(--cell-size) flex-none rounded-(--cell-radius) p-0 text-center select-none", defaultClassNames.day),
        today: cn("", defaultClassNames.today),
```

and delete the `disabled:` entry (Part 2 never disables a day). In `CalendarDayButton`, replace the class list's first three strings with:

```tsx
        "group/day-button relative isolate z-10 flex size-full flex-col items-center justify-start gap-1 border-0 pt-1.5 text-app-base leading-5 font-normal tabular-nums",
        "group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:outline-2 group-data-[focused=true]/day:outline-offset-2 group-data-[focused=true]/day:outline-ring",
        "data-[run=true]:bg-app-pick-tint data-[selected-single=true]:bg-app-pick data-[selected-single=true]:text-app-on-accent data-[selected-single=true]:hover:bg-app-pick-hover",
        "aria-disabled:cursor-not-allowed aria-disabled:text-app-disabled aria-disabled:hover:bg-transparent aria-disabled:bg-[repeating-linear-gradient(135deg,var(--app-ground)_0_5px,var(--app-inset)_5px_6px)]",
        "data-[end=true]:after:absolute data-[end=true]:after:inset-y-1 data-[end=true]:after:-right-[5px] data-[end=true]:after:w-[3px] data-[end=true]:after:rounded-sm data-[end=true]:after:bg-app-accent",
```

(deleting the old `data-[range-…]` and `data-[selected-single=true]:bg-app-accent` strings), and update the file's header comment to say the cells are 44px, 60px from `sm:` (C-28), and the selection is azure.

- [ ] **Step 4: Rewrite `DateCalendar`**

```tsx
// frontend/components/app/date-calendar.tsx
"use client";

import { type ComponentProps, useMemo } from "react";
import type { DayButton } from "react-day-picker";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { type DateMark, dayName, isoToLocalDate, localDateToIso } from "@/lib/app/date-marks";

import { MarkTag } from "./mark-tag";

const MONTH = new Intl.DateTimeFormat("en-IE", { month: "long", year: "numeric" });
const TODAY_DISC =
  "-mt-[3px] grid size-[26px] place-items-center rounded-full bg-app-today font-bold text-app-ink shadow-[inset_0_0_0_1.5px_var(--app-today-ring)]";

/**
 * A day's tags (C-27). The completion date shares a day as its edge bar alone. A 60px day (sm: and up) shows three
 * tags and a 44px day two; a fuller day ends in "+n".
 */
function DayTags({ on }: { on: ReadonlyArray<DateMark> }) {
  const tags = on.length > 1 ? on.filter((m) => m.kind !== "completion") : on;
  if (tags.length === 0) return null;
  return (
    <span aria-hidden="true" className="flex justify-center gap-0.5">
      {tags.slice(0, tags.length > 3 ? 2 : 3).map((m, i) => (
        <MarkTag key={`${m.kind}-${m.short}`} kind={m.kind} saved={m.saved} className={i === 0 || tags.length <= 2 ? "" : "max-sm:hidden"}>
          {m.short}
        </MarkTag>
      ))}
      {tags.length > 2 && <MarkTag kind="more" className="sm:hidden">{`+${tags.length - 1}`}</MarkTag>}
      {tags.length > 3 && <MarkTag kind="more" className="max-sm:hidden">{`+${tags.length - 2}`}</MarkTag>}
    </span>
  );
}

/**
 * The component's dates on one month of a calendar (plan date-picker-drawer, Part 2). The month and the selected day
 * are the drawer's; a tap hands a day back through `onSelect` and saves nothing. Days after the completion date stay
 * focusable (`aria-disabled`) so a tap or focus can say why they can't be picked (C-24).
 */
export function DateCalendar({
  marks,
  completionDate,
  today,
  selected,
  month,
  range,
  runFrom,
  onMonth,
  onSelect,
  onAfterCompletion,
}: {
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  /** The day tapped in the drawer, drawn azure. */
  selected: string;
  /** The month in view, "YYYY-MM-01". */
  month: string;
  /** The months the arrows reach (calendarMonths). */
  range: { start: string; count: number };
  /** Where the azure run starts (runStart), or null. */
  runFrom: string | null;
  onMonth: (month: string) => void;
  onSelect: (iso: string) => void;
  onAfterCompletion: (iso: string) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, DateMark[]>();
    for (const mark of marks) map.set(mark.iso, [...(map.get(mark.iso) ?? []), mark]);
    return map;
  }, [marks]);

  // A stable component per set of marks, so react-day-picker doesn't remount every day on each render.
  const MarkedDay = useMemo(
    () =>
      function MarkedDay(props: ComponentProps<typeof DayButton>) {
        const { afterCompletion, run, end, today: isToday } = props.modifiers;
        return (
          <CalendarDayButton {...props} aria-disabled={afterCompletion || undefined} data-run={run || undefined} data-end={end || undefined}>
            <span className={isToday ? TODAY_DISC : undefined}>{props.children}</span>
            <DayTags on={byDay.get(localDateToIso(props.day.date)) ?? []} />
          </CalendarDayButton>
        );
      },
    [byDay],
  );

  const first = isoToLocalDate(range.start);
  const last = new Date(first.getFullYear(), first.getMonth() + range.count - 1, 1);
  const end = isoToLocalDate(completionDate);

  return (
    <Calendar
      mode="single"
      selected={selected ? isoToLocalDate(selected) : undefined}
      month={isoToLocalDate(month)}
      onMonthChange={(m) => onMonth(localDateToIso(m))}
      startMonth={first}
      endMonth={last}
      navLayout="after"
      showOutsideDays={false}
      weekStartsOn={1}
      today={isoToLocalDate(today)}
      modifiers={{
        afterCompletion: { after: end },
        end,
        run: runFrom && selected ? { after: isoToLocalDate(runFrom), before: isoToLocalDate(selected) } : [],
      }}
      onDayClick={(date, modifiers) => (modifiers.afterCompletion ? onAfterCompletion : onSelect)(localDateToIso(date))}
      onDayFocus={(date, modifiers) => {
        if (modifiers.afterCompletion) onAfterCompletion(localDateToIso(date));
      }}
      labels={{
        labelDayButton: (date) => dayName(localDateToIso(date), marks, completionDate, today),
        labelPrevious: (m) => (m ? MONTH.format(m) : "No earlier month"),
        labelNext: (m) => (m ? MONTH.format(m) : "No later month"),
      }}
      components={{ DayButton: MarkedDay }}
      className="w-full"
    />
  );
}
```

`navLayout="after"` (react-day-picker ≥ 9.7) puts the two arrows after the caption, so the tab order is caption → previous → next → days. If the arrows sit under the caption rather than beside it in the browser, the `nav` classes above (`absolute top-0 right-0`) place them; check it in Task 15.

In `frontend/components/app/date-picker-drawer.tsx`, change `import { DateCalendar, MarkTag } from "./date-calendar";` to:

```tsx
import { DateCalendar } from "./date-calendar";
import { MarkTag } from "./mark-tag";
```

(Task 13 rewrites the drawer; this keeps the tree compiling between commits.)

- [ ] **Step 5: Run it to see it pass**

Run: `cd frontend && npx vitest run components/app/date-calendar.spec.tsx`
Expected: PASS, 3 tests. (`date-picker-drawer.spec.tsx` fails until Task 13: it still passes Part 1's props.)

- [ ] **Step 6: Commit with Task 13** (the drawer needs the new props before the suite is green).

---

### Task 13: `DatePickerDrawer`: header, line, one month, and the footer

**Files:**
- Modify: `frontend/components/app/date-picker-drawer.tsx`
- Test: `frontend/components/app/date-picker-drawer.spec.tsx`

**Interfaces:**
- Consumes: `DateCalendar` (Task 12), `YearLine`, `MarkTag` (Task 11), `calendarMonths`, `pickReadout`, `runStart`, `Picking` (Task 10), `weekdayDate`.
- Produces: `DatePickerDrawer({ children, title, eyebrow: ReactNode, help: string, picking: Picking, value, marks, completionDate, today, onPick })`. `onPick(iso)` fires only from `Use this date`; `onPick("")` from `Clear date`.

- [ ] **Step 1: Update the spec**

In `date-picker-drawer.spec.tsx`: give the S4 mark `ordinal: 4`; give `draw` the new props (`eyebrow="Stage 4"`, `help="Nothing is saved until you press Save dates."`, `picking={{ kind: "stage", ordinal: 4 }}`); in the first case change `toHaveTextContent("not saved yet")` to `toHaveTextContent("Not saved yet")` and add `expect(dialog).toHaveTextContent("the date now");`. Replace the case "hands back the picked day, closes, and puts focus back on the date box" with these three:

```tsx
  it("a tap selects a day and says so; Use this date hands it back, closes, and puts focus back on the box", async () => {
    const onPick = vi.fn();
    draw("2026-10-16", onPick);
    await userEvent.click(box());
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Friday 30 October 2026" }));
    expect(onPick).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Fri 30 Oct 2026")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Use this date" }));
    expect(onPick).toHaveBeenCalledWith("2026-10-30");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(box()).toHaveFocus();
  });

  it("Clear date empties the box", async () => {
    const onPick = vi.fn();
    draw("2026-10-16", onPick);
    await userEvent.click(box());
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Clear date" }));
    expect(onPick).toHaveBeenCalledWith("");
  });

  it("says why a day after the completion date can't be picked, and keeps the day already chosen", async () => {
    const onPick = vi.fn();
    draw("2026-10-16", onPick);
    await userEvent.click(box());
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "November 2026" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Saturday 28 November 2026, after the completion date" }));
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Sat 28 Nov 2026 is after the completion date, Fri 27 Nov 2026. Nothing can be set after it.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Use this date" }));
    expect(onPick).toHaveBeenCalledWith("2026-10-16");
  });
```

The other cases (today focused when empty; Escape and Close pick nothing; typing and Alt+Down) stay as they are.

- [ ] **Step 2: Run it to see it fail**

Run: `cd frontend && npx vitest run components/app/date-picker-drawer.spec.tsx`
Expected: FAIL (no footer; a tap still closes the drawer).

- [ ] **Step 3: Rewrite the drawer**

Replace everything in `frontend/components/app/date-picker-drawer.tsx` below the `DateBoxOpener` type (keep that type and its comment as they are) with:

```tsx
const monthOf = (iso: string) => `${iso.slice(0, 7)}-01`;
const DAY_MONTH = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * The right-hand calendar drawer (plan date-picker-drawer, Part 2; pack D-11), opened by the caller's own date box: a
 * click, or Alt+Down; typing into the box still works. A tap selects a day and the footer says how it sits against
 * the stages either side (C-22, C-31). Only `Use this date` and `Clear date` hand anything back, through `onPick`
 * ("" clears). Nothing saves (C-5). Focus goes back to the box on close.
 */
export function DatePickerDrawer({
  children,
  title,
  eyebrow,
  help,
  picking,
  value,
  marks,
  completionDate,
  today,
  onPick,
}: {
  /** Renders the date box, spreading `opener` onto it. */
  children: (opener: DateBoxOpener) => ReactNode;
  /** Names the dialog, e.g. "Choose the Stage 4 date" (C-15). */
  title: string;
  /** Above the title: the stage's tag and name, or "New item · Stage 6" (C-32). */
  eyebrow: ReactNode;
  /** "Nothing is saved until you press Save dates." */
  help: string;
  picking: Picking;
  value: string;
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  /** The day from `Use this date`, or "" from `Clear date`. */
  onPick: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // The drawer's own state (C-22): the day tapped, the month in view, a day refused. Reset on every open.
  const [selected, setSelected] = useState(value);
  const [month, setMonth] = useState(monthOf(value || today));
  const [refused, setRefused] = useState<string | null>(null);
  const days = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLInputElement>(null);

  const show = (next: boolean) => {
    if (next) {
      setSelected(value);
      setMonth(monthOf(value || today));
      setRefused(null);
    }
    setOpen(next);
  };
  const finish = (iso: string) => {
    onPick(iso);
    setOpen(false);
  };
  const opener: DateBoxOpener = {
    ref: box,
    "aria-haspopup": "dialog",
    // Stop the click focusing the box: on a phone, focus is what opens the browser's own date wheel.
    onMouseDown: (event) => event.preventDefault(),
    onClick: (event) => {
      event.preventDefault();
      show(true);
    },
    onKeyDown: (event) => {
      if (event.altKey && event.key === "ArrowDown") {
        event.preventDefault();
        show(true);
      }
    },
  };
  // C-12: the chosen day, else today.
  const focusDay = () =>
    days.current?.querySelector<HTMLElement>('button[data-selected-single="true"]') ??
    days.current?.querySelector<HTMLElement>('[data-today="true"] button') ??
    true;

  const range = calendarMonths([value, selected, ...marks.map((m) => m.iso)].filter(Boolean), today, completionDate);
  const runFrom = runStart(marks, picking, selected);
  const readout = selected ? pickReadout(marks, picking, selected, completionDate) : null;
  const run = readout?.gaps.find((g) => g.run);
  const pinLabel = selected ? `${picking.kind === "stage" ? `S${picking.ordinal} ` : ""}${DAY_MONTH.format(Date.parse(selected))}` : "";

  return (
    <Drawer swipeDirection="right" open={open} onOpenChange={show}>
      {children(opener)}
      <DrawerContent initialFocus={focusDay} finalFocus={box}>
        <div className="flex items-start justify-between gap-3 border-b border-app-line px-4 pt-3 pb-3.5 sm:px-6 sm:pt-[18px] sm:pb-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="flex items-center gap-1.5 text-app-small text-app-muted">{eyebrow}</p>
            <DrawerTitle className="text-[20px] leading-[1.25] text-balance sm:text-app-section">{title}</DrawerTitle>
            <DrawerDescription className="mt-1 text-app-small text-app-grey">{help}</DrawerDescription>
          </div>
          <DrawerClose render={<Button type="button" variant="outline" />}>Close</DrawerClose>
        </div>

        <div className="border-b border-app-line px-4 pt-3 pb-2 sm:px-6">
          <YearLine
            marks={marks}
            today={today}
            completionDate={completionDate}
            month={month}
            onMonth={setMonth}
            pick={selected && selected <= completionDate ? { iso: selected, label: pinLabel, runFrom, ordinal: picking.kind === "stage" ? picking.ordinal : null } : null}
          />
        </div>

        <div ref={days} className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4 sm:px-6">
          <DateCalendar
            marks={marks}
            completionDate={completionDate}
            today={today}
            selected={selected}
            month={month}
            range={range}
            runFrom={runFrom}
            onMonth={setMonth}
            onSelect={(iso) => {
              setSelected(iso);
              setRefused(null);
            }}
            onAfterCompletion={setRefused}
          />
          {month === monthOf(completionDate) && (
            <p className="mt-2.5 text-app-small text-app-grey">{`Days after ${weekdayDate(completionDate)} can't be picked. It's the SEC's completion date.`}</p>
          )}
          <ul aria-label="What the marks mean" className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2 border-t border-app-line pt-3 text-app-small text-app-grey">
            <li className="flex items-center gap-1.5"><MarkTag kind="stage">S2</MarkTag>Stage date</li>
            <li className="flex items-center gap-1.5"><MarkTag kind="stage" saved={false}>S2</MarkTag>Not saved yet</li>
            <li className="flex items-center gap-1.5"><MarkTag kind="item">A</MarkTag>Your item</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-4 w-[3px] rounded-sm bg-app-accent" />Completion date</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="size-[22px] rounded-full bg-app-today shadow-[inset_0_0_0_1.5px_var(--app-today-ring)]" />Today</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-4 w-[18px] rounded-app-tag bg-app-pick" />Your pick</li>
            {run && (
              <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-4 w-[18px] rounded-app-tag bg-app-pick-tint" />{`Days since ${run.mark.name}`}</li>
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-3 border-t border-app-line px-4 pt-3 pb-4 sm:px-6 sm:pb-[18px]">
          {refused && (
            <p role="status" className="rounded-app-inner bg-app-inset px-2.5 py-2 text-app-small text-app-copy">
              {`${weekdayDate(refused)} is after the completion date, ${weekdayDate(completionDate)}. Nothing can be set after it.`}
            </p>
          )}
          <div aria-live="polite" className="flex min-h-[52px] flex-col gap-0.5 text-app-small text-app-copy">
            {selected && readout ? (
              <>
                <p className="flex flex-wrap items-baseline gap-x-2.5">
                  <strong className="font-heading text-app-title font-bold tracking-[-.015em] text-app-pick tabular-nums">{weekdayDate(selected)}</strong>
                  {value === selected ? (
                    <span className="text-app-muted">the date now</span>
                  ) : value ? (
                    <span className="text-app-muted">was <s>{weekdayDate(value)}</s></span>
                  ) : null}
                </p>
                {readout.gaps.length > 0 && (
                  <p className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {readout.gaps.map((g) => (
                      <span key={g.rest}>
                        <b className={`font-semibold ${g.run ? "text-app-pick" : "text-app-ink"}`}>{g.amount}</b> {g.rest}
                      </span>
                    ))}
                  </p>
                )}
                {readout.asks.map((ask) => (
                  <p key={ask} className="text-app-attention">{ask}</p>
                ))}
                {readout.also.length > 0 && <p className="text-app-muted">{`Also on this day: ${readout.also.join(", ")}`}</p>}
              </>
            ) : (
              <>
                <p className="font-heading text-app-title font-bold text-app-ink">No day picked yet</p>
                <p className="text-app-grey">Tap a day to see how it sits against your other dates.</p>
              </>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            {value ? (
              <Button type="button" variant="link" size="header" onClick={() => finish("")}>
                Clear date
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" size="form" disabled={!selected} onClick={() => finish(selected)} className="max-sm:flex-1">
              Use this date
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

and set the file's imports to:

```tsx
import { type KeyboardEvent, type MouseEvent, type ReactNode, type RefObject, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { weekdayDate } from "@/lib/app/component-setup";
import { calendarMonths, type DateMark, type Picking, pickReadout, runStart } from "@/lib/app/date-marks";

import { DateCalendar } from "./date-calendar";
import { MarkTag } from "./mark-tag";
import { YearLine } from "./year-line";
```

- [ ] **Step 4: Run it to see it pass**

Run: `cd frontend && npx vitest run components/app/date-picker-drawer.spec.tsx components/app/date-calendar.spec.tsx`
Expected: PASS. (`stage-dates-form` and `teacher-items` fail on types until Task 14 passes the new props.)

- [ ] **Step 5: Commit Tasks 12 and 13 together after Task 14's Step 4** (the tree type-checks only once the callers pass `eyebrow`, `help` and `picking`).

---

### Task 14: The page: the date box, "not saved", and the drawer's new props

**Files:**
- Modify: `frontend/components/app/stage-dates-form.tsx`, `frontend/components/app/stage-dates-form.spec.tsx`
- Modify: `frontend/components/app/teacher-items.tsx`, `frontend/components/app/teacher-items.spec.tsx`

**Interfaces:**
- Consumes: `DatePickerDrawer`'s new props (Task 13), `MarkTag` (Task 11).

- [ ] **Step 1: Write the failing cases**

In `stage-dates-form.spec.tsx`, in "opens the calendar from a click on a date box…", after clicking `Friday 23 October 2026` add:

```tsx
    await userEvent.click(within(dialog).getByRole("button", { name: "Use this date" }));
```

and add:

```tsx
  it("says on the row that a typed date isn't saved yet", async () => {
    render5();
    await typeDate("Stage 4 date", "2026-10-16");
    expect(screen.getByLabelText("Stage 4 date")).toHaveAccessibleDescription("Fri 16 Oct 2026 · not saved");
    expect(screen.getByLabelText("Stage 3 date")).not.toHaveAttribute("aria-describedby");
  });
```

In `teacher-items.spec.tsx`, in "picks an item's date on the calendar…", after clicking `Friday 23 October 2026` add the same `Use this date` click.

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && npx vitest run components/app/stage-dates-form.spec.tsx components/app/teacher-items.spec.tsx`
Expected: FAIL (no description on the box; type errors on the drawer's missing props surface as failing renders).

- [ ] **Step 3: The stage row (C-33)**

In `stage-dates-form.tsx`, add the imports:

```tsx
import { CalendarDays } from "lucide-react";
```

```tsx
import { MarkTag } from "./mark-tag";
```

In `StageDateRow`, after `const noteId = problem ? \`${id}-note\` : undefined;` add:

```tsx
  // C-33: a date typed or picked but not saved yet is dashed, and the line under the box says so. Red wins.
  const unsaved = !refusal && value !== "" && value !== (stage.dueDate ?? "");
  const whenId = `${id}-when`;
```

Give the drawer its new props, after `title={…}`:

```tsx
          eyebrow={
            <>
              <MarkTag kind="stage" saved={!unsaved}>{`S${stage.ordinal}`}</MarkTag>
              {stage.name}
            </>
          }
          help="Nothing is saved until you press Save dates."
          picking={{ kind: "stage", ordinal: stage.ordinal }}
```

Replace the render prop's `<input … />` with the box and its icon:

```tsx
          {(opener) => (
            <span className="relative block md:inline-block">
              <input
                {...opener}
                id={id}
                type="date"
                max={max}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={refusal ? true : undefined}
                aria-describedby={noteId ?? (unsaved ? whenId : undefined)}
                className={`min-h-11 w-full cursor-pointer rounded-app-control border bg-app-surface py-2.5 pr-10 pl-3 text-app-base text-app-ink hover:border-app-accent hover:bg-app-accent-tint md:min-h-0 md:w-[176px] md:py-2 md:pl-2.5 [&::-webkit-calendar-picker-indicator]:hidden ${unsaved ? "border-dashed border-app-accent" : inputBorder}`}
              />
              <CalendarDays aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 size-[18px] -translate-y-1/2 text-app-accent" />
            </span>
          )}
```

and replace the line under the box with:

```tsx
        <span id={whenId} className={`text-app-small md:text-right ${refusal ? "text-app-error-hover" : "text-app-muted"}`}>
          {value ? weekdayDate(value) : "No date yet"}
          {unsaved && (
            <>
              {" · "}
              <strong className="font-semibold text-app-ink">not saved</strong>
            </>
          )}
        </span>
```

- [ ] **Step 4: The item form**

In `teacher-items.tsx`, add `import { CalendarDays } from "lucide-react";`. After `const items = useMemo(…)` add:

```tsx
  const editingItem = items.find((item) => item.id === editing);
  const formEyebrow = editingItem
    ? `Item ${editingItem.letter} · ${editingItem.stageLabel}`
    : `New item · ${stages.find((s) => s.id === stageId)?.label ?? ""}`;
```

Give the drawer, after `title={…}`:

```tsx
              eyebrow={formEyebrow}
              help="Nothing is saved until you press Save item."
              picking={{ kind: "item" }}
```

and wrap its input with the same icon:

```tsx
              {(opener) => (
                <span className="relative block">
                  <input
                    {...control}
                    {...opener}
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`${control.className} cursor-pointer pr-10 [&::-webkit-calendar-picker-indicator]:hidden`}
                  />
                  <CalendarDays aria-hidden="true" className="pointer-events-none absolute top-1/2 right-0 size-[18px] -translate-y-1/2 text-app-accent" />
                </span>
              )}
```

- [ ] **Step 5: Run every app spec, types and lint**

Run: `cd frontend && npx vitest run components/app && npx tsc --noEmit -p . && npm run lint`
Expected: PASS, no errors.

- [ ] **Step 6: Commit Tasks 12, 13 and 14**

```bash
git add frontend/components/ui/calendar.tsx frontend/components/app/date-calendar.tsx frontend/components/app/date-calendar.spec.tsx frontend/components/app/date-picker-drawer.tsx frontend/components/app/date-picker-drawer.spec.tsx frontend/components/app/stage-dates-form.tsx frontend/components/app/stage-dates-form.spec.tsx frontend/components/app/teacher-items.tsx frontend/components/app/teacher-items.spec.tsx
git commit -m "Rework the date drawer to pack D-11: the line over one month, tap then Use this date, Clear date, and a dashed not-saved box on the page"
```

---

### Task 15: The journey, the docs, a look in the browser, and verify

**Files:**
- Modify: `frontend/e2e/phase2.e2e.ts`
- Modify: `docs/ARCHITECTURE.md`, `docs/PILOT-ROADMAP.md` (§6.2 `/teach/classes/[id]/component`), `docs/design/UI-STANDARDS.md`, `docs/BACKLOG.md`, `docs/HANDOFF.md`

- [ ] **Step 1: The journey taps, reads the gap, and uses the date**

In `phase2.e2e.ts`, replace the drawer round trip (from `await teacher.getByLabel("Stage 5 date", { exact: true }).fill("2026-12-11");` to the line before `await teacher.getByLabel("Stage 6 date", { exact: true }).fill("2027-01-22");`) with:

```ts
  await teacher.getByLabel("Stage 5 date", { exact: true }).fill("2026-12-11");
  await teacher.getByLabel("Stage 6 date", { exact: true }).click();
  const drawer = teacher.getByRole("dialog", { name: "Choose the Stage 6 date" });
  await expect(drawer.getByRole("button", { name: "Friday 22 January 2027: Stage 6" })).toBeFocused();
  await expectAccessible(teacher);
  await drawer.getByRole("button", { name: "Friday 29 January 2027" }).click();
  await expect(drawer).toContainText("7 weeks after Stage 5 (not saved)");
  await drawer.getByRole("button", { name: "Use this date" }).click();
  await expect(drawer).toHaveCount(0);
  await expect(teacher.getByLabel("Stage 6 date", { exact: true })).toHaveValue("2027-01-29");
  await expect(teacher.getByLabel("Stage 6 date", { exact: true })).toBeFocused();
```

(The two lines after it, which put Stage 6 and Stage 5 back, stay.)

- [ ] **Step 2: The docs**

- `docs/ARCHITECTURE.md`: in the date picker drawer paragraph, say that the drawer shows a `YearLine` over one month (`DateCalendar`, controlled), that a tap only selects and `Use this date` / `Clear date` call `onPick`, that the footer's words are `pickReadout` in `lib/app/date-marks.ts`, that days after the completion date are `aria-disabled` and report themselves, that `YearLine` also draws the page's year view (which no longer has a month grid), and that every right-hand drawer slides on `--app-sheet-*` in `components/ui/drawer.tsx`.
- `docs/PILOT-ROADMAP.md` §6.2, the `/teach/classes/[id]/component` row: replace the date drawer sentence with `Clicking a date box opens a right-hand drawer: the year's dates on a line over one month (unsaved dates dashed, today gold); a tap shows the gap to the stages either side, **Use this date** fills the box, **Clear date** empties it; days after the completion date are greyed and say why. A date not saved yet is dashed on its row, "· not saved".` In "Actions", `Choose a date on the calendar` becomes `Choose or clear a date on the calendar`.
- `docs/design/UI-STANDARDS.md` §10, add: `Right-hand drawers slide on --app-sheet-duration / --app-sheet-ease (300ms in) and --app-sheet-duration-exit / --app-sheet-ease-exit (200ms out), set once in components/ui/drawer.tsx (pack D-11).` §5, add: `--app-pick (azure) means "your pick" and --app-today (gold) means "today", in the date drawer and the year view only; neither is a state (pack D-11).`
- `docs/BACKLOG.md` row 3 (`date-picker-drawer`): `Part 1 built; Part 2 (pack D-11) built, not merged: self-review, changes doc and PR still to do`.

- [ ] **Step 3: Look at it in the browser**

Run `make db-up`, `make backend-run`, `make frontend-run`; open a teacher's Component tab and check against `docs/design/UI-CHECKLIST.md` and the frames in `docs/design/pilot/D-11-date-picker-drawer/design/`:
- 390 and 1140: the drawer matches frames 2–7 closely; a week fits at 390 with no sideways scroll; the arrows sit beside the month heading.
- The slide: the date drawer and the review drawer ("Full history" on a student's request) both slide in over 300ms and out over 200ms, with nothing jumping as they open. With reduced motion on, both appear at once.
- Keyboard only: Tab from `Close` reaches the arrows, the month (one stop), `Clear date`, `Use this date`; arrows move between days; Enter selects; focus returns to the box. Focusing a day after the completion date shows the reason.
- The page: a typed date shows dashed with `· not saved`; a refused date is red, not dashed; the year view shows the same marks as the drawer.

Write what was and wasn't checked into `docs/HANDOFF.md`.

- [ ] **Step 4: `docs/HANDOFF.md`**

Update the date picker drawer section: Part 2 built (what changed, in a sentence per decision C-22 to C-33), the `make verify` and `make e2e` counts, the browser check from Step 3, and still to do: `/self-review` in a fresh session, `write-changes` (`docs/changes/date-picker-drawer.md`), the PR into `pilotMain`.

- [ ] **Step 5: Verify**

Run (repo root): `make verify && make e2e`
Expected: both exit 0, axe clean with the drawer open on laptop and phone.

- [ ] **Step 6: Commit**

```bash
git add frontend/e2e/phase2.e2e.ts docs/ARCHITECTURE.md docs/PILOT-ROADMAP.md docs/design/UI-STANDARDS.md docs/BACKLOG.md docs/HANDOFF.md
git commit -m "Prove the reworked date drawer in the journey, and record pack D-11 in the docs"
```

---

## Part 3: one control per date (added 26 Oct 2026)

**Why.** Tim, looking at Part 2 in his own browser: the date box showed two calendar icons (the browser's own, which only Chromium lets us hide, and ours), and he didn't want dates changed by typing on the page at all. A date is chosen in the drawer, always; typing moves into the drawer.

**Goal:** the page's date box is one control that only opens the drawer; the drawer's footer gets a `Type a date` field.

| # | What happens | Why it matters to you |
|---|---|---|
| C-35 | **The box becomes a `<button>`**, not an `<input type="date">`. It shows `16/10/2026`, or `Choose a date` in grey, with our one calendar icon. Click, tap, Enter or Space opens the drawer. Nothing is typed on the page. Alt+Down goes: a button doesn't need it. | One icon in every browser (a button has no native picker icon to hide), and no way to change a date without seeing the calendar. Replaces C-10 and the typing half of C-21. |
| C-36 | **Name and value.** The name stays `Stage 4 date` (the sr-only `<label for>`). The value reaches a screen reader as the button's description (`aria-describedby`): the line under the box on a stage row (`Fri 16 Oct 2026 · not saved`), the box's own text on the item form. | A button named by a label doesn't read its own text, so without this a screen reader user would hear no date. |
| C-37 | **`Type a date`**, in the drawer's footer above the gaps: `dd/mm/yyyy`, digits only, the slashes added as you type (a phone's number pad has no slash); a pasted `2026-10-16` is accepted. A complete, real date selects it (the pin, the month and the footer move to it); anything else leaves no pick, so `Use this date` stays off. Enter in the field uses the date. A tap on a day writes it into the field. | The keyboard route and the tap route end in the same place: a selected day, confirmed with `Use this date`. |
| C-38 | A typed date **after the completion date** is refused like a greyed day: nothing is selected and the footer says `Sat 27 Feb 2027 is after the completion date, Fri 26 Feb 2027. Nothing can be set after it.` | One rule, one sentence, wherever the date came from. |
| C-39 | **Not a date**: when the field loses focus holding something that isn't one (`31/02/2026`, `16/10`), it says `That isn't a date. Type day, month, year, like 16/10/2026.` (`aria-invalid`, in its description). Nothing is said while you're still typing. | No scolding mid-keystroke. |
| C-40 | **`max` goes** from the page's boxes. The drawer is the only way to set a date and it can't pick after the completion date. The red "server refused" state stays (the completion date can move while a page is open); its spec mocks the refusal, and the journey intercepts the save. | The page can no longer produce a date the server would refuse, so the one e2e step that typed `2027-03-05` has to simulate it. |
| C-41 | **Tests set dates through the drawer.** Specs and the journey get one helper each: open the box, type into `Type a date`, press Enter. | The old `fill("2026-10-16")` on the box is gone with the input. |

**Concepts in play (Part 3).**

| Concept | What it is | Why it fits here | Where this repo already uses it |
|---|---|---|---|
| An input mask in a controlled input | The change handler keeps only digits and puts the separators back, so the field's value is always a prefix of `dd/mm/yyyy` | A phone's number pad has no `/`, and the parser then only ever sees one shape | `components/app/join-code-form.tsx` (typed code normalised to one shape before it's used); here it will be `lib/app/typed-date.ts` |
| Button vs input for "opens something" | An `<input>` says "type here"; a `<button aria-haspopup="dialog">` says "this opens a dialog" | The box no longer accepts typing, so it should not announce itself as an input | `components/app/request-drawer.tsx` (a `DrawerTrigger` button that opens the review drawer) |
| `aria-describedby` for a value | A control's name says what it is; its description is read after, so the current value goes there | Keeps `getByLabel("Stage 4 date")` stable while the date is still announced | `components/app/stage-dates-form.tsx` (the refusal note) |

### Task 16: `lib/app/typed-date.ts`

- Test first (`node --test`): `typedFromInput` keeps digits and adds slashes (`1610` → `16/10`, `16102026` → `16/10/2026`, over-long input cut at eight digits, `2026-10-16` → `16/10/2026`); `parseTypedDate` gives an ISO date only for a complete real date (`16/10/2026` → `2026-10-16`; `31/02/2026`, `16/10`, `` → null); `typedDate` turns an ISO date back (`2026-10-16` → `16/10/2026`).

### Task 17: the drawer's `Type a date` field

- `DatePickerDrawer` holds `typed` beside `selected`; reset on open to the box's value. A tap writes `typedDate(iso)` into it. Typing runs `typedFromInput`, then `parseTypedDate`: real and on or before the completion date selects and moves the month; real but after it sets `refused`; anything else clears `selected`. The error line shows on blur only. Enter calls `Use this date` when something is selected.
- Specs (lean): typing a date selects it and `Use this date` hands it back; a typed date after the completion date is refused; a half-typed date says it isn't one after blur.

### Task 18: the boxes become buttons

- `DateBoxOpener` drops `onMouseDown`/`onKeyDown` and types its ref for a button. `StageDateRow` and `TeacherItems` render a `<button type="button">` with the icon; the box text has an id the description can point at.
- Specs: `getByLabel("Stage 4 date")` is a button now: values are read as text (`16/10/2026`), "typing" becomes the helper, the `max` spec is removed, the not-saved description and red-refusal specs keep their words.

### Task 19: the journey, the docs, verify

- `e2e/helpers.ts` gets `setDate(page, label, iso)`; `phase2`, `phase4` and `ready-for-signoff` use it; the late-date step in `phase2` intercepts the save instead.
- `docs/ARCHITECTURE.md`, `docs/PILOT-ROADMAP.md` §6.2, `docs/HANDOFF.md`; run `make verify` and `make e2e`, and look at it in a browser.

## Not in this plan

- The stage sheet (click a stage heading, a right-hand sheet with its items). Next, built on `DateCalendar` and `YearLine`.
- Showing the teacher who ticked each item (parked from `teacher-item-ticks`; returns with the stage sheet).
- The run stretching forward to the next stage, and a slimmer line on phones (C-34).
- School holidays, autosave on pick, any backend change.
