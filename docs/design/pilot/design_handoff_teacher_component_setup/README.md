# Handoff: Teacher component setup (Pack D-5)

## Overview

The page a teacher lands on at `/teach/classes/[id]/component`. It does two jobs:

1. **Create the component** for a class, by choosing the exam year's brief (state 1).
2. **Set and maintain the six stage dates**, plus the teacher's own lettered items, for the life of the component (states 2–6).

The design covers every state in the D-5 spec at two widths (1140 and 390). The stage-dates editor is direction **3a**: compact numbered rows under a collapsible year view, one batch **Save dates** action, and a read-only month calendar.

---

## About the design files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behaviour. They are **not production code to copy**. They are single-file design documents that render several screen states side by side on one canvas; they use inline styles and a small custom runtime, neither of which belongs in the app.

**The task is to recreate these designs in the existing Next.js frontend**, using its established patterns, tokens and components. The route, the data layer and a first-pass implementation already exist (see *Where this lands*). This is largely an **upgrade of existing components**, not a greenfield build.

Do not introduce a new styling approach, a new date library, or a chart/timeline dependency. The year view and calendar are plain flex/grid + absolutely positioned marks, and should stay that way.

## Fidelity

**High-fidelity.** Final colours, typography, spacing, copy and interaction states. Recreate pixel-for-pixel at the two widths given, using the codebase's Tailwind tokens (which already carry every colour and size the design uses — see *Design tokens*).

Two things are deliberately **not** final:
- **Dates are placeholders.** Stage names, hour ranges and checkpoint texts are real (from the SEC brief); the specific dates (29 May 2026, 26 Feb 2027 etc.) are illustrative.
- **Two open questions** are exposed as toggles in the design file — see *Open questions*.

---

## Where this lands

The route and data layer exist. Files to change, all under `frontend/`:

| File | What happens to it |
|---|---|
| `app/(app)/teach/classes/[id]/component/page.tsx` | No change expected. Already branches: array of briefs → `CreateComponentForm`, component → `StageDatesForm`. |
| `components/app/create-component-form.tsx` | **Update** — add the "What you're setting up" summary card (state 1). |
| `components/app/stage-dates-form.tsx` | **Main work** — numbered rows, changed-count, warning/refusal treatments, items section moved out of per-stage loop. |
| `components/app/teacher-items.tsx` | **Rework** — items become one flat letter-ordered list for the whole component, not a list per stage. |
| `components/app/notice.tsx` | Reuse for the amber banners. Check the `tone="attention"` variant matches the design's 4px left edge + tint. |
| `components/app/error-panel.tsx` | Reuse as-is for the red panel. The design adds **no** "Try again" link — see *Interactions*. |
| `components/app/field.tsx` | Rows in the design are not plain `Field`s (they carry a mono ordinal, multi-line help, and a row-level tint). Either extend `Field` with a `leading`/`tone` prop or add a sibling `StageDateRow`. |
| **New:** `components/app/year-view.tsx` | The collapsible year line + key + month calendar. Purely presentational; takes stages, items, completion date, today. |
| `lib/app/component-setup.ts` | **Extend** — add item lettering, timeline position maths, week-gap labels. `formatCalendarDate` and `hoursLabel` already exist and are correct. |

Server contract already in place (`lib/api/schemas.ts`), no backend change needed for the happy path:

- `GET /components/{id}` → `teacherComponentSchema`: `{ view, id, classId, className, subjectCode, subjectName, brief, stages[], warnings[] }`
- `brief` → `{ id, subjectCode, examYear, secCode, title, topicTitle, completionDate }`
- `stages[]` → `{ id, ordinal, label, name, hoursMin, hoursMax, hoursGroup, supervised, checkpoint, dueDate, items[] }`
- `stages[].items[]` → `{ id, text, dueDate }`
- `warnings[]` → `{ code: "OUT_OF_ORDER" | "AFTER_COMPLETION_DATE", stageIds[], itemIds[] }`
- `PUT /components/{id}/stage-dates` with `{ dates: [{ stageId, dueDate }] }` → returns the updated component; field errors come back on `ApiError.fieldErrors` keyed by **stage id**.
- `GET /briefs?subjectCode=…` → array of `briefSummarySchema` (state 1).
- `POST /components` (create), and the existing teacher-item create/update/retire endpoints.

**One gap to confirm with the backend:** the design's state 6 needs to know the completion date *moved* and ideally what it moved from and when. Today `warnings[]` only carries `AFTER_COMPLETION_DATE`. Either that code is enough (copy drops the "from" date) or the view needs `brief.completionDateChangedAt`. Flag this rather than inventing a field.

---

## The three rules the page carries

These govern every state. If an implementation decision is ambiguous, resolve it in favour of these.

**1. Numbers are the SEC's, letters are yours.** Stages are numbered 1–6, and cannot be renamed, added or removed. Teacher items are lettered A, B, C… **in date order**, so a letter changes when a date changes. The mark shape repeats the distinction: **filled** circle = stage, **hollow** circle = item, **navy end-stop bar** = completion date.

**2. Red refuses, amber asks.** Red (`app-error`) is used *only* for a date the server rejected. Out-of-order dates and a moved completion date are **amber** (`app-attention`) — 2px inset edge and tint, never a solid fill. Solid amber keeps the meaning it has in D-2: a count of pending work.

**3. Nothing was lost.** One **Save dates** button covers all six stages, with a changed-count beside it, and a confirmation before leaving with unsaved dates (already implemented via `beforeunload`). Items save one at a time, matching their endpoints.

---

## Design tokens

**Every colour in the design already exists as a token in `app/globals.css`. Do not write hex values.**

| Design hex | Token | Tailwind | Used for |
|---|---|---|---|
| `#1F3A6E` | `--app-accent` | `text/bg/border-app-accent` | Primary button, links, active tab, stage marks, ordinals, end-stop |
| `#16294E` | `--app-accent-hover` | `hover:bg-app-accent-hover` | Primary button hover |
| `#F4F5F8` | `--app-accent-tint` | `bg-app-accent-tint` | Highlighted current month band; info panel ground |
| `#A04806` | `--app-attention` | `text/border-app-attention` | Out-of-order and moved-completion-date state |
| `#F6EDE6` | `--app-attention-tint` | `bg-app-attention-tint` | Amber row tint, amber banner ground |
| `#B3251E` | `--app-error` | `text/border-app-error` | Refused date: input border, 2px inset edge, marker |
| `#8E1D17` | `--app-error-hover` | `text-app-error-hover` | Red panel heading, refused inline message, Retire button label |
| `#FBF1F0` | `--app-error-tint` | `bg-app-error-tint` | Refused row tint, red panel ground |
| `#101419` | `--app-ink` | `text-app-ink` | Headings, stage names, calendar weekday numbers |
| `#343A42` | `--app-body` | `text-app-copy` | Body copy |
| `#4B535C` | `--app-grey` | `text-app-grey` | Secondary copy, status text beside the button |
| `#636B75` | `--app-muted` | `text-app-muted` | Field labels, metadata, hour ranges, checkpoints, month ticks |
| `#9AA2AC` | `--app-disabled` | `text-app-disabled` | Disabled *Progress* tab; undated-item dashed ring; "Today" line |
| `#E3E6EA` | `--app-line` | `border-app-line` | Hairlines, row dividers, calendar gridlines |
| `#DDE1E6` | `--app-field-border` | `border-app-field-border` | Field group and secondary button borders |
| `#EFF1F3` | `--app-inset` | `hover:bg-app-inset` | Secondary button hover |
| `#F7F8F9` | `--app-ground` | `bg-app-ground` | Page ground; out-of-month calendar cells |
| `#FFFFFF` | `--app-surface` | `bg-app-surface` | Cards, rows, inputs |

**Three values are new** and need adding to the token block (they are line-art greys/tints with no existing equivalent):

```css
--app-stem:          #C9D0D8;  /* 1px timeline stem, neutral */
--app-stem-attention:#D6A97F;  /* stem under an amber mark */
--app-stem-error:    #E0A9A5;  /* stem under a red mark */
--app-weekend:       #FBFCFC;  /* weekend calendar cell, one step off white */
```

### Type

Existing tokens, used exactly as the design does — no new sizes:

- `font-heading` (display) — page h1 `text-app-h1`/`lg:text-app-h1-lg` (28/32px, 700, `tracking-[-.03em]`), section h2 `text-app-section` (21px, 700, `tracking-[-.02em]`), banner headings 18px 700 `tracking-[-.015em]`, calendar month 19px 700.
- `font-sans` (body) — `text-app-base` (16px) body, inputs, stage names (600); `text-app-meta` (15px) row buttons, secondary copy; `text-app-small` (14px) metadata, hour ranges, checkpoints, inline messages.
- `font-mono` (label) — uppercase eyebrows `text-app-label` (12px, 700, `tracking-[.09em]`); stage ordinals 15px 700 (14px at 390); timeline mark numerals 13px 700; item letters 12–13px 700; SEC code 15px regular; month ticks and calendar weekday heads 12px.

### Spacing, radii, controls

- Card radius `rounded-app-card` (10px); control and chip radius `rounded-app-control` (8px); calendar day chips `rounded-app-inner` (6px).
- Content column `max-width: 880px`; prose and form blocks inside it capped at `620px`.
- Page padding: 1140 → `32px 28px 56px`; 390 → `22px 16px 40px`.
- Card padding: `18px 20px 16px` (year view), `16px 18px` / `13px 16px` (rows).
- Vertical rhythm between blocks: 14–20px; between a heading and its prose: 6–8px.
- Primary button: height 48px, padding `0 20px`, `rounded-app-control`, 16px/600, white on accent. Full-width at 390.
- Secondary button: padding `11px 15px`, 1px `app-field-border`, white ground, 15px/600 `text-app-copy`, `hover:bg-app-inset`.
- Date input: 1px `app-field-border`, `rounded-app-control`, `padding: 8px 10px`, `width: 176px` at 1140; at 390 `width: 100%`, `padding: 11px 12px`, `min-height: 44px`.
- Calendar arrows: 44×44 hit target, both widths.
- Focus: `outline: 2px solid var(--app-accent); outline-offset: 2px` (already global).

---

## Screens / views

The header (crest, app name, school, teacher name, Change password, Sign out), breadcrumb, class h1 and the three-tab nav are **D-1's and identical on every state** — states 1 and 3 show them in full; later frames are marked *page content* and start at the tab row. The *Progress* tab is present but disabled (`aria-disabled`, `text-app-disabled`, `cursor: not-allowed`).

### 1 · No component yet — *1140 + 390*

**Purpose:** create the component. The subject is fixed by the class, so the only choice is the exam year's brief.

**Layout:** `620px` column. Heading + one paragraph → Brief field → "What you're setting up" summary card → primary action row.

- **Brief select** — in a bordered card, mono uppercase label above a borderless `<select>` (16px, ink). Helper under it: "The 2028 briefs appear here when the SEC publishes them." Single option in the mock: "Biology in Practice Investigation, 2027".
- **Summary card** — mono uppercase eyebrow "What you're setting up", then five label/value rows. At 1140 rows are two columns (label `128px` fixed, `text-app-muted` 15px; value 16px ink); at 390 they stack, label above value. Rows: Brief · Topic · SEC code (mono) · Completion date (600 weight) · Stages ("6, set by the SEC — you choose a date for each").
- **Action row** — "Create component" primary, with "Students see the component as soon as it exists, with dates still to come." beside it (below it, at 390).

The commitment is shown **before** the action, not after. Drive the summary card from the selected brief, not from static copy.

### 2 · Just created, no dates — *1140*

**Purpose:** set the first dates. All six stages are listed so the shape of the year is visible before a single date is chosen.

- **Brief header block** — h2 brief title + year; topic · mono SEC code; then "These are your class's own dates, not SEC deadlines. The SEC's only date is the completion date, **26 Feb 2027**."
- **Info panel** (accent-tinted, 4px left accent edge, `rounded-app-card`): "Until you save dates, students see **"Dates coming from your teacher"** on this component and on their timeline." — states what students see rather than implying it.
- **Year view, present but empty** — 74px tall. Dashed hairline instead of a solid axis, the navy end-stop at the right with "Completion 26 Feb 2027" above it, and "Your dates appear here as you set them." on the left. Month ticks every other month. It holds the completion boundary so the teacher can see what they are planning inside.
- **Six stage rows**, every date empty, each showing "No date yet" under its input.
- **Action row** — "Save dates" + "No dates saved yet", with a secondary "Add item" pushed right (`margin-left: auto`).

### 3 · Dates set — the reference state — *1140 (calendar open) + 390 (year view collapsed)*

The canonical state: all six dates in, three teacher items (one undated). **Build this one first** — the others are deltas.

#### Year view (1140)

Card with a mono eyebrow "Your dates across the year" and a text-button "Hide the year view" on the right. Inside, a `148px` relative box:

- **Axis** — 1px `app-line`, at `bottom: 58px`, full width.
- **Current-month band** — `app-accent-tint` block spanning the month column, full height, `rounded-app-inner` (6px). That month's tick label goes accent + 700.
- **"Today"** — 1px dashed `app-disabled` vertical from the top to the axis, label right-aligned to the left of it, 12px muted.
- **Stage marks** — flex column, centred, anchored at the axis: mono numeral (13px/700, accent) on top, then a 1px stem in `app-stem`, then an **11px filled accent circle** sitting on the axis (`margin-bottom: -6px`). Stem heights **alternate 26px / 50px** by ordinal so adjacent numerals don't collide. Positioned by `left: %`, `translateX(-50%)` (the first mark at `left: 0` is not translated, so it doesn't clip).
- **Gap labels** — between consecutive marks, 12px muted, at `bottom: 52px`, centred on the midpoint, with a background chip matching whatever is behind it (white, or the tint inside the month band) so the axis reads through cleanly. Text: "16 weeks", "5 weeks", "9 weeks", "5 weeks". Only render a gap label where there is room.
- **Item marks** — **10px hollow circles**, 2px accent border, white fill, below the axis at `bottom: 40px`, with the mono letter under them at `bottom: 22px`. Undated items are **not** on the line.
- **End-stop** — 3px × 34px solid accent bar at the right edge.
- **Month ticks** — mono 12px muted, one per month (Jun → Feb), `translateX(-50%)`.

**Key row** (above a hairline): filled circle "Stage date, numbered by the SEC" · hollow circle "Your item, lettered by date" · 3px bar "Completion date, 26 Feb 2027".

**Letter key list** — one row per item: a 22px ring badge with the letter, the item text (15px ink), then metadata (14px muted). Dated items get a solid 2px accent ring; the **undated item gets a dashed `app-disabled` ring and muted letter**, with "No date · stage 4 · not shown on the line" spelling out its absence.

#### Month calendar (1140, inside the year view, below a hairline)

- **Header** — 44×44 prev/next buttons flanking `font-heading` 19px month + year (`min-width: 180px`, centred), and a "Hide calendar" text-button right.
- **Weekday heads** — 7-col grid, mono 12px/700 `tracking-[.06em]` muted, left-padded 8px.
- **Grid** — 7 columns, `gap: 1px` over an `app-line` background with a 1px `app-line` border and `rounded-app-control` + `overflow: hidden`, so the gaps *are* the gridlines. Cells `min-height: 62px`, `padding: 7px 8px`.
  - Weekday cell: white, date 16px ink.
  - Weekend cell: `--app-weekend`, date 16px muted.
  - Out-of-month cell: `app-ground`, empty.
  - Today: date goes 700.
- **Stage chip** — solid accent, white 12px/600, `rounded-app-inner`, single line, `text-overflow: ellipsis`. Label "Stage 5".
- **Item chip** — white ground, 1px accent border, accent 12px/600, mono bold letter then the text, ellipsised.
- **Footnote** — "Read-only. Dates are set in the rows below; nothing may be set after 26 Feb 2027." The calendar **never** sets a date.

#### Stage rows (1140)

One bordered card, `overflow: hidden`, rows divided by 1px `app-line` (no divider on the last):

`display: flex; align-items: center; gap: 18px; padding: 12px 16px`

1. **Ordinal** — `flex: none; width: 24px`, mono 15px/700 accent.
2. **Body** — `flex: 1; min-width: 0`, column, `gap: 1px`: stage name (16px/600 ink), hours (14px muted), checkpoint (14px muted, prefixed "Checkpoint: ").
3. **Date** — `flex: none`, column, right-aligned: visually-hidden `<label>` ("Stage 3 date"), the date input, and the resolved weekday under it (14px muted, e.g. "Fri 25 Sep 2026").

Action row: "Save dates" + "All 6 dates saved".

#### Items section (1140)

Separate `<section>` below the form, 32px up-margin. h2 "Your items", then: "Your own to-dos, attached to a stage. Students see them on their component page and their timeline. Letters follow the date, so they change when a date does."

One card per item: 26px letter ring badge (dashed + muted when undated) · text (16px ink) + metadata (14px muted, "Stage 6 · 13 Nov 2026", or "Stage 4 · no date, so not on the line or the calendar") · **Edit** and **Retire** buttons. Retire is a secondary button with an error-tinted border (`border: 1px solid rgba(179,37,30,.4)`) and `text-app-error-hover` label — destructive but not a solid red fill. "Add item" secondary button below the list.

#### 390

- Header collapses to two rows (crest + app name; teacher name + Change password + Sign out). h1 27px.
- **Year view is collapsed on arrival** — a nine-month line is not a phone object. In its place a small card: "Your dates run 29 May 2026 to 22 Jan 2027, inside the completion date of 26 Feb 2027." + a "Show the year view" text-button. Opened, it scrolls horizontally.
- **Stage rows stack**: ordinal + name/hours/checkpoint on top (`align-items: baseline`, `gap: 10px`), full-width input below, weekday under it. Row padding `12px 15px 13px`.
- Rows are chunked with "Stages 4–6 continue below." between groups.
- Full-width "Save dates", status line centred beneath it.
- A separate frame (`component · month open · 390`) shows the calendar on a phone: **dots, not text chips**, with what falls on the selected day listed underneath.

### 4 · A date after the completion date — refused — *1140 + 390*

Server refuses the **whole** save; nothing is written. The page says so three ways:

1. **Red panel above the form** (`role="alert" aria-live="polite"`) — `app-error-tint` ground, 1px `rgba(179,37,30,.3)` border, 4px `app-error` left edge. A 20px filled circular "!" badge + heading "Your dates weren't saved" (`font-heading` 18px/700, `text-app-error-hover`), then "One date needs another look. Nothing was changed.", then a `<ul>` naming each problem: mono "Stage 6" — "After the completion date, 26 Feb 2027."
2. **The row that caused it** — `app-error-tint` ground, `box-shadow: inset 2px 0 0 var(--app-error)` as the left edge, ordinal in `text-app-error-hover`, the hours line **replaced** by the named problem ("Stage 6 is after the completion date, Fri 26 Feb 2027. Choose a date on or before it."), input border `app-error` + `aria-invalid="true"`, weekday under it in error ink. Row switches to `align-items: flex-start` (the message wraps) with the ordinal nudged `padding-top: 2px`.
3. **The year line** — the offending mark and its stem go red, and it sits **past the end-stop**; the axis extends to a red "Mar" tick. Footnote under the line: "Stage 6 sits past the completion end-stop."

Status beside the button: "Nothing was saved — your other five dates are unchanged."

**No "Try again" link in the panel.** The retry *is* **Save dates**; a second primary would compete with it.

At 390 the panel is identical (17px heading) and the frame shows only the last two rows, with "Nothing was saved." centred under the button.

### 5 · Dates out of order — saved, with a warning — *1140*

Allowed, so it **saves**. Amber, never red.

- **Both rows involved** get `app-attention-tint` + `inset 2px 0 0 var(--app-attention)`, amber ordinals and amber input borders.
- **One message between them**, not one per row — the problem is the pair. A `role="status"` strip in the same amber tint, `padding-left: 42px` to align under the body column: "Stage 5 (Fri 9 Oct) is before stage 4 (Fri 16 Oct). That's allowed — students move between stages — but check it's what you meant."
- **On the line**, 5 sits left of 4 with amber marks and amber stems, so the crossing is visible before the words are read. Footnote: "Stages 4 and 5 are in the opposite order to their numbers."
- Status: "Saved. Two dates are out of order."
- Maps to `warnings[].code === "OUT_OF_ORDER"`, `stageIds` being the pair.

### 6 · The completion date moved — *1140*

Nothing the teacher did, so nothing is refused and nothing is red — **but the page must not look normal.**

- **Amber banner at the top of the content**, above the brief block (`role="status"`, `max-width: 640px`): heading "The completion date moved", body "The SEC moved this brief's completion date earlier, to **Fri 15 Jan 2027**. One of your dates is now after it. Fix it below and save."
- The brief block's completion date **updates to the new date**.
- The affected row is amber, with "Stage 6 is after the new completion date, Fri 15 Jan 2027. Choose a date on or before it." in place of its hours line.
- On the line, the **end-stop has moved left** of stage 6. Footnote: "The end-stop moved left. Stage 6 is now outside it."
- Status: "Saved 14 Sep 2026. One date needs fixing."
- **It persists until the date is fixed** — it is not a dismissible toast.

---

## Interactions & behaviour

**Batch date save.** All six dates are one draft; `PUT /components/{id}/stage-dates` sends every stage. Refusal is all-or-nothing, mapped back onto rows by stage id from `ApiError.fieldErrors`. On success, `router.refresh()`.

**Changed count.** The status text beside **Save dates** always says where things stand — "No dates saved yet" / "All 6 dates saved" / "2 dates changed, not saved yet" / "Nothing was saved — your other five dates are unchanged." / "Saved. Two dates are out of order." / "Saved 14 Sep 2026. One date needs fixing." Compute from the draft vs. server state (`datesChanged` already exists).

**Unsaved-changes guard.** `beforeunload` while dirty (already implemented). Keep it.

**Items save individually**, matching their endpoints — they are outside the batch. Edit and Retire act on one item.

**Letters are derived, never stored.** Sort items by `dueDate` ascending, undated last; assign A, B, C… in that order. A letter therefore changes when a date changes — which the copy warns about ("Letters follow the date, so they change when a date does"). Undated items still get a letter, rendered with a dashed ring, and are excluded from the line and the calendar.

**Year view disclosure.** Open by default ≥ some desktop breakpoint, **collapsed by default at 390**. The toggle is a text-button, label switching "Hide the year view" / "Show the year view". The calendar has its own nested toggle ("Hide calendar" / "Show calendar") — the line can be shown without the calendar (states 4–6 do exactly that). Persist neither; default per width is enough.

**Calendar navigation** is month-by-month via the two 44px arrows, opening on the current month (or the month of the nearest upcoming date). Read-only: no cell is clickable, nothing sets a date. `aria-label` on each arrow names its target month ("October 2026", "December 2026").

**Validation split.** Keep `noValidate` on the form and `max={brief.completionDate}` as a *hint* on the input — the `max` must not block a submit the server is meant to refuse. Out-of-order is never blocked client-side; it comes back as a `warnings[]` entry after a successful save.

**Transitions.** Use the existing `--app-duration` (160ms) / `--app-ease`. Disclosure height, tint changes, button hover. Nothing else animates; marks do not slide when dates change.

**Responsive.** Two designed widths, 1140 and 390. Between them: content column caps at 880px and centres; stage rows go from the three-column flex to the stacked form at the point the date input + body no longer fit (roughly 720px); the year view switches to collapsed-by-default and horizontal-scroll at the same point.

**Accessibility.**
- Red panel `role="alert" aria-live="polite"`; amber banners and the between-rows warning `role="status"`.
- Refused input `aria-invalid="true"` and its message associated via `aria-describedby`.
- Every date input has a visually-hidden label naming its stage ("Stage 3 date") — the visible stage name is not the field label.
- 4.5:1 minimum throughout; all the tokens above are pre-verified (ratios are in the token comments).
- 44px minimum hit targets at 390, and on the calendar arrows at every width.
- Disabled *Progress* tab is `aria-disabled`, not removed.

---

## State management

Client state in the dates form:

- `draft: Record<stageId, "YYYY-MM-DD" | "">` — seeded from `stages[].dueDate`, re-seeded on refresh.
- `error: ApiError | null` — drives both the red panel and per-row refusals.
- `busy: boolean` — disables the primary during the save.
- `dirty` (derived) — `datesChanged(stages, draft)`; drives the changed-count and the unload guard.
- `yearViewOpen: boolean` — default by width.
- `calendarOpen: boolean` — nested under the year view.
- `calendarMonth: Date` — the visible month.

Derived, not stored: `letteredItems` (sort + assign), timeline `%` positions, week-gap labels, weekday strings, and the warning-to-row mapping from `warnings[].stageIds`.

Server state stays in the component payload; refetch via `router.refresh()` after any mutation. No client cache.

---

## Assets

- `assets/crest-nwetss.png` — the school crest in the app header. Placeholder for the pilot school; the real app already renders a crest in `components/app/brand-lockup.tsx`. Use what's there.
- No icons. The "!" error badge is a styled `<span>`; the calendar arrows are `‹` `›` glyphs; every mark is a div/span with a border-radius. **Nothing is an SVG and nothing needs to become one.**
- Fonts: the design loads Space Grotesk / Public Sans / Space Mono from Google Fonts. The codebase already maps `--bipi-font-display` / `-body` / `-label` to `font-heading` / `font-sans` / `font-mono`. **Use the codebase's fonts** — do not add font links.

---

## Open questions

Both are toggles in the design file (`showCheckpoints`, `showWeekday`), on by default. Confirm before building:

1. **Checkpoints on the setup page.** Each row can show its checkpoint text ("Checkpoint: Plan discussed with the teacher (feasibility and safety)"). It is useful context for choosing a date, but it makes rows two to three lines tall. On = designed default.
2. **Resolved weekday under each input.** "Fri 25 Sep 2026" under the date field — it catches a date landing on a weekend, which matters for a school deadline. On = designed default.

---

## Files in this bundle

| File | What it is |
|---|---|
| `D-5 Teacher component setup.dc.html` | **The specification.** All six states, 1140 and 390, with the design notes and the three rules inline. Open in a browser. |
| `D-5 Teacher component setup - all states.dc.html` | Earlier full-state pass. Useful for the `month open · 390` frame and the narrower 936px content-column variants. |
| `D-5 Explorations.dc.html` | Rough explorations behind direction 3a. Reference only — **not** the spec. |
| `support.js` | Runtime the HTML files need in order to open. Not for the app. |
| `assets/crest-nwetss.png` | Placeholder crest. |

Each state frame carries a `data-screen-label` attribute naming it, so you can find any state by searching the file for e.g. `component · dates out of order · 1140`.
