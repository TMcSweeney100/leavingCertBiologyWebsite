# Pack D-11 — the date picker drawer (`/teach/classes/[id]/component`)

Designed with Tim, 25–26 Oct 2026, from `docs/design/prompts/D-11-date-picker-drawer.md`, the intent `docs/intent/date-picker-drawer.md` and the plan `docs/superpowers/plans/2026-10-25-date-picker-drawer.md`. It restyles the drawer built on `pilot/source-builder` and changes some of its behaviour; every behaviour change is listed under **Open questions**, so the plan and roadmap §6.2 are updated before the build.

Frames (sample content throughout, marked in each): `design/01-date-box.html` to `design/07-keyboard-focus.html`, each at 1140 and 390. Also: `design/direction-b-refined.html` (the drawer inside the real page, and the phone as four steps), `design/year-view-before-after.html`, `design/motion.html` (press to feel the slide), and the three rough directions, `design/explore-a-month-strip.html`, `explore-b-line-on-top.html`, `explore-c-calm-column.html`.

## Direction chosen

**B, the line on top.** The memorable element is a live copy of D-5's year line across the top of the drawer. Your pick is an azure pin on it, and an azure run goes back to the stage before, so "is this too close to the one before?" is answered in one glance, for all six stages at once. Below the line is one month at a time, which is where a day is picked; the line is also the month picker. Everything else stays quiet: navy marks with their own shapes, a one-line key, and a footer that says the gap in words. Two colours are new, and each means one thing: azure is "your pick", gold is "today".

A and C were drawn and set aside. A (a month strip) showed how busy each month is, not how far apart two dates are. C (the scrolling column, made calm) kept the scroll Tim wasn't convinced by.

## Tokens added

All in `tokens.css`; ratios measured (WCAG 2.x).

| Token | Value | Measured contrast | Used for |
|---|---|---|---|
| `--app-pick` | `#0A6AA8` | 5.77:1 on white, 5.43:1 on ground, 5.03:1 on pick-tint; white on it 5.77:1 | The picked day, the line's pin and run, the footer's date and the gap to the stage before |
| `--app-pick-hover` | `#08578A` | 7.66:1 on white; white on it 7.66:1; 6.68:1 on pick-tint | Hover and pressed on the picked day; the `S4` tag's text inside it |
| `--app-pick-tint` | `#E6F1F9` | ink 16.12:1, navy 9.70:1, body 10.01:1, muted 4.71:1 on it; 1.15:1 against white | The run of days from the stage before to your pick (a ground; the footer says the gap in words) |
| `--app-today` | `#FFC94D` | ink on it 12.07:1; 3.77:1 against pick | The today disc (a ground, never text) |
| `--app-today-ring` | `#A87400` | 4.07:1 on white, 3.83:1 on ground, 3.55:1 on pick-tint | The disc's 1.5px ring; the dashed today line on the line |
| `--app-day-cell` / `-lg` / `-h` / `--app-day-gap` | 44px / 60px / 48px / 8px | — | A day at 390 and 1140, its height, the gap |
| `--app-today-disc` | 26px | — | The disc behind today's number |
| `--app-radius-tag` | 3px | — | Mark tags (`S4`, `+2`) |
| `--app-sheet-duration` / `-exit` | 300ms / 200ms (0ms reduced) | — | The drawer's slide in and out |
| `--app-sheet-ease` / `-exit` | `cubic-bezier(.32,.72,0,1)` / `cubic-bezier(.4,0,1,1)` | — | The same |

The existing `--app-sheet-width` (520px) and `--app-scrim` are reused unchanged.

## Per page

### `/teach/classes/[id]/component`

**Layout.**
- 1140: the drawer is 520px from the right over the scrim; header, line and footer are fixed, and the body (month and key) scrolls if the window is short. Days are 60 × 48px with 8px gaps.
- 390: the drawer is full width; days are 44 × 48px with 8px gaps (seven fit in 358px with 50px to spare). The key sits under the month and scrolls under a 28px fade.

**The date box (frame 1).**
- The box stays the trigger: a click or tap opens the drawer, Alt+Down opens it from the keyboard, and typing still works. Accessible names unchanged: `Stage 3 date`, `Date (optional)`; `aria-haspopup="dialog"`.
- A lucide `CalendarDays` icon (decorative, `aria-hidden`) sits at the box's right where the browser's icon was hidden.
- Pointer over: navy border, `--app-accent-tint` ground, `cursor: pointer`. Keyboard focus: the app's 2px navy ring, offset 2px. 390: full row width, 48px tall.
- **Not saved** (proposed, see Open questions): a dashed navy border, and the line under the box reads `Thu 19 Nov 2026 · not saved` ("not saved" in 600 ink). That line becomes the input's description (`aria-describedby`). A refused box stays red and is never dashed; out of order stays amber, as D-5 has them.

**Header.**
- Above the title, a stage's `S4` tag and its name (`Conducting the Experiment`), or for an item `New item · Stage 6` / `Item C · Stage 6`.
- Title (names the dialog; unchanged from plan C-15): `Choose the Stage 4 date`; `Choose the date for “Full draft in”`; `Choose the date for the new item`.
- Help: `Nothing is saved until you press Save dates.` (items: `… Save item.`)
- `Close` (outline, top right).

**The line.**
- From the first month with a date (or this month) to the completion month. Stages are `S1`–`S6` navy squares on stems, alternating two heights so neighbours don't collide; items are lettered rings below the axis; today is a gold disc on the axis with a dashed gold line and the word `Today` (on the side away from the pin); the completion date is the navy end bar, with hatching after it.
- The pin: an azure head on the axis, a 2px azure stem, and a label (`S4 19 Nov`, or `4 Dec` for an item) that points away from today. The azure run (4px) goes from the stage before to the pin. While a different day is picked, the stage's saved date shows as a dashed ghost dot.
- The month in view is shaded (`--app-accent-tint`); its label is bold navy. Tapping a month on the line shows that month.
- The line is a `role="group"` named `Your dates across the year`; its month targets are pointer shortcuts (`tabindex="-1"`), so it adds no tab stops. Every fact on it is also in the grid, the footer or the day names.

**The month.**
- Heading `November 2026` with previous and next month buttons (44px, named for their target month, `October 2026`); the next button is disabled in the completion month, the previous one in the first.
- Weekdays `Mon` … `Sun` (mono 12px). Weekend numbers in `--app-muted`.
- Under the month in the completion month only: `Days after Fri 26 Feb 2027 can't be picked. It's the SEC's completion date.`

**Key** (`<ul aria-label="What the marks mean">`): `Stage date` · `Not saved yet` · `Your item` · `Completion date` · `Today` · `Your pick` · `Days since Stage 3` (only when picking a stage that has a dated stage before it).

**Footer** (fixed, `aria-live="polite"` on the readout).
- Nothing picked: `No day picked yet` / `Tap a day to see how it sits against your other dates.`; `Use this date` disabled.
- A day picked: the date in azure (`Thu 19 Nov 2026`, Space Grotesk 19px), then `was Fri 27 Nov 2026` (struck through) or `the date now`. Under it, the gaps: `13 days after Stage 3` (the number in azure: it is the run) and `8 weeks before Stage 5`; with no later dated stage, `13 weeks before the completion date`, or `On the completion date`. A stage that isn't saved adds ` (not saved)`. For an item, the nearest dated stages either side.
- Gap rule: under 21 days, exact days; from 21 days, whole weeks, rounded (the year view's labels use weeks the same way).
- A pick before the stage before (or after the stage after), in amber: `Before Stage 3 (Fri 6 Nov). That's allowed, but check it's what you meant.`; on the same day: `The same day as Stage 3. That's allowed, but check it's what you meant.`
- Anything else on the picked day: `Also on this day: item E, the completion date`.
- A tap on (or focus on) a greyed day, on an inset ground, `role="status"`: `Sat 27 Feb 2027 is after the completion date, Fri 26 Feb 2027. Nothing can be set after it.`
- Actions: `Clear date` (text button, left; only when the box has a date) and `Use this date` (the one primary, right; full width less `Clear date` at 390).

**Day names** (the specs' contract, unchanged): `Friday 16 October 2026: Stage 4 (not saved), item B`; today adds `today` first; a greyed day ends `, after the completion date`.

**Marks.** No colour-only meaning: a stage is a filled square tag with its number, not saved is the same tag dashed, an item is a ring with its letter, the completion date is a bar, today is a disc with a ring, your pick is a filled day. Inside the picked day, tags turn white-on-azure.

**Collapsed by default:** nothing in the drawer. The page's year view keeps D-5's default (open at 1140, collapsed at 390).

**Ordering.** Header → line → month → key → footer. Tags in a day: stages, then items; the completion date is the day's right-edge bar.

### The page's year view

Decided with Tim, 26 Oct 2026: the year view and the drawer's line become one component. The year view shows the same marks (stage squares, dashed when not saved, lettered rings, the gold today), keeps its `n weeks` gap labels and the shaded current month, adds `Not saved yet` and `Today` to its key, and loses `Show calendar` and its read-only month grid: the drawer is the calendar. It stays read-only. See `design/year-view-before-after.html`.

## Components restyled

- **`components/ui/drawer.tsx`** (Base UI Drawer): transitions `transform` only (today: `transform, height, opacity, filter`), on the new sheet tokens; the scrim's opacity on the same times. A header and a footer fixed, the body scrolling between them.
- **`components/ui/calendar.tsx`** (shadcn Calendar, react-day-picker): one month (`numberOfMonths` 1), our own month header with the two arrows, `--app-day-cell` sizes and gaps, `today` and `selected` restyled to the disc and the azure fill. The completion date's later days use react-day-picker's `disabled` matcher for styling and naming, but the day buttons must stay focusable and clickable so they can explain themselves (Open questions, 3); if the library can't do that, a custom `DayButton` with `aria-disabled` replaces its disabled state.
- **`components/app/date-calendar.tsx`**: `MarkTag` restyled (3px radius, item as a ring, completion as the bar); the run tint from the stage before; the today disc.
- **`components/app/year-view.tsx`**: rebuilt on the shared line; its own `Calendar` removed.
- **The date box** in `stage-dates-form.tsx` and `teacher-items.tsx`: the icon, hover, the dashed not-saved state.
- No primitive replaced by a plain element, except the line (positioned spans, as `year-view.tsx` already is).

## Motion

The drawer's slide is the page's one moment. In: 300ms on `cubic-bezier(.32,.72,0,1)`; out: 200ms on `cubic-bezier(.4,0,1,1)`; the scrim fades over the same times, linear. Only `transform` and the scrim's `opacity` move. Under reduced motion both are 0ms. The stutter Tim saw is drawing, not timing: today the drawer draws every month (about 300 day buttons) as it opens; D-11 draws one month (about 35). Changing month swaps the grid with no animation. `design/motion.html` plays both slides side by side.

## Answers to the four questions

- **Saved versus not saved.** The same tag, dashed instead of filled, plus the word: `Not saved yet` in the key, ` (not saved)` in the footer and the day name. A dashed outline reads as "pencilled in": noticed, never alarming, because it uses no amber and no red. Amber means "check this", and an unsaved date is normal mid-setup.
- **Several marks in a 44px day.** Tags under the number: three fit in a 60px day, two in a 44px day, and a fuller day ends in `+n`. The completion date costs no slot (it's the day's edge bar). Tapping the day lists everything in the footer, and its name lists everything for a screen reader. Frame 4 shows the cells at 2×.
- **A key?** Yes, one line under the month. The shapes are new to the drawer and dashed-versus-filled needs a word once; after the first week a teacher won't read it, so it sits below the month, not above.
- **The greyed days.** Hatching (the usual "closed" pattern), the end bar on the completion date, and one line under that month. If they tap one anyway, nothing is picked and the footer says why, in one sentence. Screen reader users hear the same reason when they focus it.

## Open questions for Tim

Behaviour changes against the plan and roadmap §6.2. Each needs the plan updated before the build.

1. **Select, then confirm** (agreed 25 Oct; changes plan C-5 and C-21). A tap selects a day and the footer shows the gaps; `Use this date` fills the box and closes; `Close` and Escape leave the box as it was. New accessible names for the specs: `Use this date`, `Clear date`.
2. **`Clear date`** in the footer (agreed 25 Oct). It empties the box and closes. It's the only way to clear a date on a phone, where a tap on the box opens the drawer.
3. **Greyed days stay focusable**: `aria-disabled` rather than `disabled`, so a tap or focus explains why. They still can't be picked.
4. **One month at a time, under the line** (replaces C-11's single scrolling column with no arrows). Month arrows come back, and the line's months are tappable.
5. **The year view shares the line and loses its month grid** (agreed 26 Oct; brings forward C-19's later tidy-up). `year-view.tsx` changes in the same build.
6. **The dashed box and "not saved" on the page row.** Agreed by Tim, 26 Oct 2026 (plan C-33).
7. **Motion tokens on the shared drawer.** Agreed by Tim, 26 Oct 2026: D-10's review drawer gets the same slide (plan C-30).
8. **The run stretching forward, and a slimmer phone line.** Tim took the recommendations, 26 Oct 2026: neither is built (plan C-34).

All eight are now decisions C-22 to C-34 in `docs/superpowers/plans/2026-10-25-date-picker-drawer.md`, which builds this pack as its Part 2 (Tasks 9–15).
