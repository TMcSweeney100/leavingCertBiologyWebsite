# Handoff: BiPi Schedule Hub

A live, mobile-first schedule page for 6th Year Leaving Cert Biology students doing the
**Biology in Practice Investigation (BiPi)**, replacing a static classroom poster.

---

## Overview

The site answers three questions at a glance, for students, parents and the teacher:

1. **What stage are we in right now?** (computed from today's date, not hardcoded)
2. **What is due, and when?**
3. **Which section of the final written report should be finished by that point?** — the
   stage -> report-section crosswalk is the core content and the main reason a poster was
   not enough.

It is a single page, read-only, no accounts, no tracking, no forms. One dynamic input: today's date.

## About the design files

The files in this bundle are **design references created in HTML** — a prototype showing
intended look and behaviour. They are **not production code to copy directly.**

The prototype is built as a self-contained HTML design document with an inline-styles-only
rendering layer. Do **not** try to port that layer. The task is to **recreate the design in the
target codebase** using its own patterns and libraries. Per the project spec the intended stack is
**Next.js (App Router) + React + shadcn/ui on Vercel** (a plain Vite + React SPA is an accepted
alternative — pick one before starting). If no environment exists yet, scaffold the Next.js one.

Everything you need is in three files:

| File | What it is |
|---|---|
| `design/BiPi Schedule Hub.dc.html` | The visual reference. Open it in a browser. |
| `schedule.data.ts` | **All content**, typed, ready to drop in. Includes the current-stage algorithm as a comment. |
| `tokens.css` | The full palette, type stack, radii and shadows as CSS custom properties. |

## Fidelity

**High-fidelity.** Colours, typography, spacing, radii, shadows and interaction states are all
final and specified exactly below. Recreate the UI faithfully using the codebase's component
library. Where a shadcn primitive exists, use it and restyle it to these tokens rather than
building from scratch:

| Design element | shadcn primitive |
|---|---|
| Stage card | `Card` |
| State pill / report badge | `Badge` |
| Term progress bar | `Progress` |
| Expandable stage detail | `Collapsible` |
| Crosswalk | `Table` |
| Nav pills | `Button variant="outline" size="sm"` (non-interactive: anchors) |

## Which direction to build

The prototype contains two turns of exploration. **Build option `2a` only** — the "Progress Rail"
direction, fleshed out (the top section of the file, id `#2a`). Turn 1 (`#1a`, `#1b`, `#1c`) is
superseded history: `1b` was the chosen direction and `2a` is its built-out version. Ignore
`1a` and `1c` entirely.

Each option in the file shows a **Mobile (390px)** frame and a **Laptop (1140px)** frame side by
side. Both are in scope and equally important — usage is expected to split roughly evenly between
school laptops and phones.

---

## Screens / views

There is **one page**. It has two layouts (mobile-first, one breakpoint) and eight sections.

### Layout container

| | Mobile | Laptop |
|---|---|---|
| Design width | 390px | 1140px (content), 1160px frame |
| Page ground | `--bipi-bg` | `--bipi-bg` |
| Horizontal padding | 18-20px | 40px |
| Breakpoint | — | switch at `1024px` (`lg:`) |

The laptop layout of the timeline section is a two-column grid: `1fr 300px`, `gap: 26px`,
`align-items: start`, with the right column `position: sticky; top: 16px`.

---

### 1. Header

Background `--bipi-surface`, `border-bottom: 1px solid --bipi-border`. Mobile padding 20px;
laptop 26px 40px.

| Element | Spec |
|---|---|
| Eyebrow | Space Mono 700, 9.5px, letter-spacing .14em (laptop .16em), uppercase, `--bipi-muted`. Copy: mobile "BiPi 2026-27", laptop "BiPi 2026-27 · class schedule" |
| H1 | Space Grotesk 700, mobile 26px/1.12 ls -.025em, laptop 38px/1.08 ls -.03em, `--bipi-ink`. Copy: "Biology in Practice Investigation" |
| Standfirst | Public Sans 400, 13px/1.5 (laptop 14px/1.5), `--bipi-muted`. Copy: "Membranes, Osmosis & Food Preservation. Six stages, seven report sections, one deadline." |
| Grade chip | Space Mono 700, 9px (laptop 10px), ls .1em, uppercase, `#fff` on `--bipi-ink`, radius 99px, padding 5px 9px (laptop 9px 14px). Copy: "40% of grade" / "40% of the Biology grade" |
| Nav pills | Public Sans 600, 10.5px (laptop 11px), `--bipi-ink-2`, 1px `--bipi-border`, bg `--bipi-bg`, radius 99px, padding 8px 11px, gap 6px. Four items: Right now / Timeline / Report sections / Report rules — in-page anchors |

**Laptop only — stepper.** Below the header block, `grid-template-columns: repeat(7, 1fr)`,
margin-top 26px. One column per stage (including Stage 1, Stage 2 and the catch-up window).
Each column: a dot + a 2px connector line filling the remaining width, then the stage label and
short date.

- Dot: current 16px, done/upcoming 12px. Current `--bipi-now` with `box-shadow: 0 0 0 5px --bipi-now-halo`; done solid `--bipi-done`; upcoming `#fff` with `2px solid --bipi-border`.
- Connector: 2px high; `--bipi-done` at 50% opacity when done, else `--bipi-border`.
- Label: Space Mono 700, 10px, ls .08em, uppercase — current `--bipi-now`, done `--bipi-ink-2`, upcoming `--bipi-muted`.
- Date: Public Sans 400, 10px, `--bipi-muted`, margin-top 3px.

### 2. "You are here" panel

The most important element on the page. First thing the eye should land on.

**Mobile.** Sits on a white band (18px padding). Panel: background `--bipi-now-tint` (6%),
`border: 1.5px solid --bipi-now-ring`, radius 14px, padding 16px 17px 17px.

| Element | Spec |
|---|---|
| Eyebrow | Space Mono 700, 9.5px, ls .14em, uppercase, `--bipi-now`. Copy: "● You are here" + today's date right-aligned in Space Mono 400 9.5px `--bipi-muted` |
| Stage line | Space Mono 400, 10px, ls .1em, uppercase, `--bipi-muted`, margin-top 14px. Copy: "Stage 4 / Weeks 5-7" |
| Stage title | Space Grotesk 700, 23px/1.15, ls -.02em, `--bipi-ink`, margin-top 5px |
| Countdown chip | `--bipi-now` bg, `#fff`, radius 8px, padding 7px 11px. Number Space Grotesk 700 17px; caption Space Mono 400 9.5px ls .06em uppercase ("days left") |
| Due chip | bg `--bipi-now-tint-3` (10%), text `--bipi-now-ink`, radius 8px, padding 7px 11px, Space Mono 700 10px ls .06em uppercase. Copy: "Due 16 Oct 2026" (non-breaking space after "Due") |
| What's due | Public Sans 400 13px/1.5 `--bipi-ink-2`, margin-top 14px. Bold lead-in "What's due:" |
| Report line | Divider `1px solid --bipi-border`, then Public Sans 400 11.5px/1.45 `--bipi-muted`. Copy: "Report §4 — Conducting the Experiment — should be written by then." |

Below the panel, still inside the white band: **term progress**, then a **Next up** row
(inset `--bipi-bg`, radius 10px, padding 12px 13px) with the next stage title and its short date
in Space Mono 700 11px `--bipi-now-ink`.

**Laptop.** Panel: `--bipi-surface`, `1.5px solid --bipi-now-ring`, radius 16px,
padding 26px 28px, `box-shadow: --bipi-shadow-now-lg`. Inner grid `1fr 250px`, gap 34px,
align-items center:

- Left: eyebrow ("● You are here · 6 Oct 2026"), stage line, H2 (Space Grotesk 700 30px/1.12 ls -.025em), then one paragraph (Public Sans 400 14px/1.55, max-width 620px) that reads "**Due 16 Oct 2026:** all primary data collected... Report section §4 — Conducting the Experiment — should be written by then."
- Right: countdown box — `--bipi-now` bg, radius 14px, padding 22px 14px, number Space Grotesk 700 54px/0.9 ls -.03em `#fff`, caption Space Mono 700 9.5px/1.4 ls .12em uppercase at 85% opacity ("days left to / Fri 16 Oct 2026").

### 3. Term progress + term ruler

**Mobile:** a 6px track, `--bipi-border`, radius 99px, with a `--bipi-now` fill at the
elapsed-percentage width. Above it, a label row (Space Mono 700 9px ls .1em uppercase
`--bipi-muted`): "Week 6 of 15" left, percentage right.

**Laptop:** same fill, but the track is **2px** and sits inside a `position: relative`,
46px-high container that also holds:

- **Today marker** — 9px circle, `--bipi-now`, `box-shadow: 0 0 0 4px oklch(0.52 0.14 268 / .18)`, at `left: <termPct>%`, `top: -4px`, `translateX(-50%)`.
- **One tick per deadline** (five: Stage 3, 4, catch-up, 5, 6), positioned by *real date spacing* — `left: (dueDate - TERM.start) / (TERM.end - TERM.start) * 100%`, not evenly spaced. Each: a 1px x 9px tick (current `--bipi-now`, done `--bipi-done`, upcoming `--bipi-tick-idle`), then the short date (Space Mono 700 9.5px/1.2) and a short label (Public Sans 400 8.5px/1.2 `--bipi-muted`), in a 74px-wide centred wrapper.
- **Edge clamping (important):** wrappers are `translateX(-50%)` centred *except* the first and last. A tick above 88% anchors `right: 0` and right-aligns its text; below 6% anchors `left: 0` and left-aligns. Without this the December tick overhangs the panel.

### 4. Completed strip

Background `--bipi-done-tint` (7%), `border-bottom: 1px solid --bipi-border`, padding 14px 18px
(laptop: no band, just a 22px 40px row). A filled circle 18px (laptop 20px), `--bipi-done`, white
check glyph; text Public Sans 600 11.5px/1.4 (laptop 12.5px) `--bipi-ink-2`. Copy in
`COMPLETED_STRIP`. Static — Stages 1-2 are always done by the time this site matters.

### 5. Timeline — the stage card

Section header: eyebrow ("Timeline") + H2 "What's left this term" (Space Grotesk 700, mobile
19px/1.2 ls -.02em, laptop 24px/1.18 ls -.025em) + mobile-only hint "Tap a stage for what it involves."

Five cards: Stage 3, Stage 4, Catch-up window, Stage 5, Stage 6. (Stages 1-2 appear only in the
completed strip, the stepper and the crosswalk.)

**Rail.** Each card sits in a `grid-template-columns: 26px 1fr` row, gap 12px (laptop 14px).
Left column: the state dot (same spec as the stepper dot), then a 2px vertical rail,
`min-height: 24px`, `flex: 1 1 auto`, margin-top 6px — `--bipi-done` at 50% opacity when done,
else `--bipi-border`.

**Card shell — three states.** All: `--bipi-surface`, radius 12px.

| State | Border | Extra |
|---|---|---|
| `current` | `1.5px solid --bipi-now` | `box-shadow: --bipi-shadow-now` |
| `done` | `1px solid --bipi-border` | `opacity: .72` |
| `upcoming` | `1px solid --bipi-border` | — |

Padding 14px 15px 15px (laptop 20px 22px 21px).

**Card contents.**

| Element | Spec |
|---|---|
| Eyebrow | Space Mono 700 9.5px ls .1em uppercase `--bipi-muted`, `white-space: nowrap`. Copy: "Stage 4 / Weeks 5-7" |
| State pill | Space Mono 700 8.5px ls .12em uppercase, padding 4px 7px, radius 99px. current: `--bipi-now` bg / `#fff`. done: `--bipi-done-tint-2` bg / `--bipi-done-ink`. upcoming: `--bipi-border` bg / `--bipi-muted`. Copy: "Now" / "Done" / "Upcoming" |
| Title | Space Grotesk 600, mobile 17px/1.2 ls -.015em, laptop 21px/1.18 ls -.02em. current `--bipi-ink`, done `--bipi-muted`, upcoming `--bipi-ink-2` |
| Date | Space Mono 700 10.5px (laptop 11px) `--bipi-ink-2`, margin-top 7px |
| Report badge | Space Mono 700 10px ls .06em, padding 5px 9px, radius 7px. current: bg `--bipi-now-tint-4` (12%), text `--bipi-now-ink`, border `1px solid oklch(0.52 0.14 268 / .3)`. else: bg `--bipi-surface-2`, text `--bipi-ink-2`, border `1px solid --bipi-border`. Copy: "Report §4 due", or "No section due" for the catch-up card |
| Section name | Public Sans 400 11px/1.35 `--bipi-muted`, beside the badge |
| Description | Public Sans 400 12.5px/1.5, `text-wrap: pretty`; current `--bipi-ink-2`, else `--bipi-muted`. **Laptop: always visible. Mobile: inside the collapsible.** |
| Disclosure trigger | Space Mono 700 10px ls .1em uppercase `--bipi-now`, `cursor: pointer`, `min-height: 34px` (hit target). Copy: "What this involves +" / "Hide detail —" |
| Task list | Mobile: single column, gap 7px. Laptop: `1fr 1fr`, gap 8px 22px. Each row `grid-template-columns: 14px 1fr`, gap 9px: a 5px `--bipi-now` dot (margin-top 6px) + Public Sans 400 12px/1.45 `--bipi-ink-2` |
| "What good looks like" | Inset `--bipi-bg`, radius 8px, padding 11px 12px, Public Sans 400 11.5px/1.45 `--bipi-ink-2`, bold lead-in |
| Teacher checkpoint | Inset `--bipi-now-tint-2` (7%), radius 8px, same type. **Required by the brief — must be reachable; on mobile it lives inside the collapsible, which is why the current stage is open on load.** |

On laptop the two insets sit side by side (`1fr 1fr`, gap 10px); on mobile they stack.
Laptop card header is a `1fr auto` grid — eyebrow/pill/title left, date and report badge
right-aligned.

### 6. Report sections (crosswalk)

Background `--bipi-surface` on laptop, `border-top: 1px solid --bipi-border`, padding 28px 40px.
Eyebrow "Report sections" + H2 "All seven sections, and when each one should be written".

**Laptop:** `grid-template-columns: 56px 1.5fr 1fr 1fr 100px`. Header cells Space Mono 700 9px
ls .13em uppercase `--bipi-muted`, padding-bottom 10px. Body cells `border-top: 1px solid --bipi-border`,
padding 11px 0.

| Column | Type |
|---|---|
| § | Space Mono 700 11.5px — "Due now" row `--bipi-now`, done `--bipi-muted`, else `--bipi-ink` |
| Report section | Public Sans 600 12.5px, `--bipi-ink` (done: `--bipi-muted`) |
| Written during / Due by | Public Sans 400 12.5px `--bipi-ink-2` (done: `--bipi-muted`) |
| Status | Space Mono 700 9px ls .1em uppercase, right-aligned. "Due now" `--bipi-now`, "Done" `--bipi-done-ink`, "To come" `--bipi-muted` |

**Mobile:** same rows as `grid-template-columns: 34px 1fr auto` — § / (name + "stage · due" sub-line
in Public Sans 400 11px `--bipi-muted`) / status.

Status is **live**: a section is "Due now" when its stage is the current stage, "Done" when its
stage is before the current one, "To come" otherwise.

### 7. Report rules

`border-top: 1px solid --bipi-border`, padding 28px 40px. Laptop grid `1fr 380px`, gap 34px.
Eyebrow "Report rules" + H2 "The bits people lose marks on".

- **Rules list** (`REPORT_RULES`, 8 items): laptop two columns (`1fr 1fr`, gap 0 26px), mobile one column inside a white card (1px `--bipi-border`, radius 12px). Each row `border-top: 1px solid --bipi-border`, padding 12px 0; key Space Mono 700 9.5px ls .12em uppercase `--bipi-now-ink`; value Public Sans 400 12.5px/1.5 `--bipi-ink-2`.
- **Marks card** (`MARK_BANDS`): `--bipi-surface`, 1px `--bipi-border`, radius 12px, padding 20px 22px. Header row: "How it's marked" (Space Mono 700 9.5px ls .14em uppercase `--bipi-muted`) and "200 marks" (Space Mono 700 12px `--bipi-ink`). Rows `grid-template-columns: 22px 1fr 34px`: band letter Space Mono 700 13px `--bipi-now-ink`, description Public Sans 400 12.5px/1.45, marks Space Mono 700 12.5px right-aligned.

This block is **phase-2 content** from the SEC brief, included because students lose marks on it.
It can be cut or moved to a second page without touching anything else.

### 8. Aside (laptop only)

Right column of the timeline grid, `position: sticky; top: 16px`, gap 16px. Two cards, both
`--bipi-surface`, 1px `--bipi-border`, radius 12px, padding 18px 20px:

1. **Coming up** — the stages after the current one. Row: title (Public Sans 600 12.5px/1.3) + report badge text (Public Sans 400 10.5px `--bipi-muted`) on the left, short date (Space Mono 700 11px `--bipi-now-ink`) right. Rows `border-top: 1px solid --bipi-border`, padding 10px 0.
2. **Term at a glance** — `TERM_AT_A_GLANCE`. Month name Space Grotesk 700 11px `--bipi-ink`; items `grid-template-columns: 34px 1fr`, day in Space Mono 700 10.5px `--bipi-now-ink`, text Public Sans 400 11.5px/1.4 `--bipi-ink-2`.

### 9. Footer

Background `--bipi-ink`, padding 24px 40px (mobile 18px). Laptop: `space-between`, wrap.

- Heading: Space Grotesk 700 14px/1.35 `#fff` — "SEC deadline — 26 February 2027"
- Body: Public Sans 400 12.5px/1.55 `--bipi-on-dark-body` — `SEC_DEADLINE.note`
- Meta (right-aligned on laptop): Space Mono 400 10px/1.5 `--bipi-on-dark-meta` — `SEC_DEADLINE.disclaimer`

---

## Interactions & behaviour

| Interaction | Behaviour |
|---|---|
| **Stage disclosure** | Each stage card's detail panel (tasks, "what good looks like", teacher checkpoint; on mobile also the description) toggles on click of the trigger row. **Panels are independent — opening one does not close another.** The **current stage is open on first load**; every other card starts closed. Trigger copy flips "What this involves +" -> "Hide detail —". Hit target min-height 34px on mobile. |
| **Current stage** | Derived from today's date on every render — see the algorithm at the foot of `schedule.data.ts`. Never hardcode. |
| **Countdown** | Whole days to the current stage's `dueDate`, floored at 0. Singular "day left" at 1. |
| **Term progress** | Percentage elapsed between `TERM.start` and `TERM.end`, clamped to 2-100 so the bar is never invisible in week 1. |
| **Nav pills** | In-page anchors to the four sections. Add `scroll-margin-top` so headings clear the top. |
| **Hover** | Not designed — the audience is mostly touch and glance. If you add any, keep it to a 1px border darkening on cards; do not add lift/scale. |
| **Transitions** | Only the disclosure. `height`/`opacity`, ~150-200ms, ease-out. Nothing else animates. |
| **Loading / error / empty** | None. All content is static at build time. |
| **Responsive** | One breakpoint at 1024px. Below: single column, 18-20px gutters, aside hidden, stepper hidden, ruler replaced by the 6px bar. Above: two-column timeline + sticky aside, stepper and ruler shown. |

### Edge cases to handle

- **Before term starts** — first non-done stage is Stage 3; progress clamps to 2%.
- **After 11-12 Dec** — `findIndex` returns -1; fall back to the last stage so the page reads "Stage 6 / finalising" rather than erroring. Countdown floors at 0.
- **Timezone** — compute "today" as start-of-day in **Europe/Dublin**. A naive UTC `new Date()` will flip the current stage a day early for evening users in winter.

## State management

Trivially small. No global store, no data fetching.

| State | Type | Notes |
|---|---|---|
| `openStages` | `Record<string, boolean>` | Which disclosure panels are open. **Seed it from the current stage id on mount** — and merge that seed on every write, or the seeded card silently closes the first time another card is toggled. |
| `today` | `Date` | Computed once per render/request. Consider a `?date=YYYY-MM-DD` query override in dev — the prototype has exactly this as a `previewDate` prop and it makes the live logic testable. |

Everything else is derived: stage states, countdown, term percentage, week number, crosswalk
statuses, "coming up" list.

**Progressive enhancement (spec requirement):** the full timeline, dates and crosswalk must be
readable with JS disabled. Render stage states and the countdown **server-side** (Next.js server
component / SSG with revalidation) and let only the disclosure toggles hydrate. Use `<details>`
if you want the disclosure to work without JS too.

## Design tokens

See `tokens.css` for the copy-paste version. Summary:

| Token | Authored (oklch) | Hex |
|---|---|---|
| `--bipi-bg` | oklch(0.973 0.005 265) | #F4F6FA |
| `--bipi-surface` | #ffffff | #FFFFFF |
| `--bipi-surface-2` | oklch(0.955 0.006 265) | #EEF0F4 |
| `--bipi-ink` | oklch(0.215 0.02 262) | #141A23 |
| `--bipi-ink-2` | oklch(0.34 0.018 262) | #333842 |
| `--bipi-muted` | oklch(0.525 0.016 262) | #656B74 |
| `--bipi-border` | oklch(0.905 0.008 265) | #DDE0E5 |
| `--bipi-now` | oklch(0.52 0.14 268) | #4662B9 |
| `--bipi-now-ink` | oklch(0.42 0.13 268) | #2F4693 |
| `--bipi-done` | oklch(0.53 0.115 158) | #1A7F51 |
| `--bipi-done-ink` | oklch(0.42 0.10 158) | #005D37 |
| `--bipi-tick-idle` | oklch(0.83 0.01 265) | #C4C7CE |
| `--bipi-on-dark-body` | oklch(0.78 0.02 262) | #B0B8C5 |
| `--bipi-on-dark-meta` | oklch(0.65 0.02 262) | #898F9C |

Tints (used as-is, not flattened): `--bipi-now` at 6% / 7% / 10% / 12% / 16% / 35%,
`--bipi-done` at 7% / 13%.

**Colour discipline — the one rule that matters:** `--bipi-now` is reserved for the current
stage and today's position. Nothing decorative uses it. Two accents total (indigo "now",
green "done") on a cool near-white ground.

### Typography

| Role | Family | Weights | Sizes used |
|---|---|---|---|
| Display | **Space Grotesk** | 600, 700 | 54 / 38 / 30 / 26 / 24 / 23 / 21 / 19 / 17 / 14 / 12 / 11px |
| Body | **Public Sans** | 400, 600 | 14 / 13 / 12.5 / 12 / 11.5 / 11 / 10.5 / 8.5px |
| Label | **Space Mono** | 400, 700 | 12 / 11.5 / 11 / 10.5 / 10 / 9.5 / 9 / 8.5px |

All three are Google Fonts. Display sizes carry negative tracking (-.015em to -.03em, tighter as
size increases); mono labels carry positive tracking (.06em to .16em) and are almost always
uppercase.

### Radii, shadows, spacing

- Radii: 7px (report badge), 8px (insets, chips), 10px (mobile inset row), 12px (cards), 14px (mobile panel, countdown box), 16px (laptop panel), 99px (pills).
- Shadows: only two, both indigo-tinted — `0 8px 24px oklch(0.52 0.14 268 / .14)` on the current stage card, `0 10px 30px oklch(0.52 0.14 268 / .10)` on the laptop you-are-here panel. Nothing else has a shadow.
- Spacing: 4-point-ish scale, values actually used: 4 5 6 7 8 9 10 12 13 14 16 18 20 22 26 28 30 34 40.

## Accessibility

- WCAG AA minimum. `--bipi-now` (#4662B9) on white is 5.6:1 — fine for text. Do **not** put `--bipi-muted` on `--bipi-now` tints, and do not drop label sizes below 8.5px.
- The done-state `opacity: .72` is applied to the whole card; verify the resulting contrast still passes, or swap it for explicit muted colours if the audit complains.
- Disclosure triggers need `aria-expanded`, `aria-controls` and a real `<button>` (the prototype uses a styled div — do not copy that).
- The state pill's meaning must not be colour-only: it always carries the words "Now" / "Done" / "Upcoming". Keep that.
- Respect `prefers-reduced-motion` on the disclosure transition.

## Assets

**None.** No images, no icons, no logos — the design is entirely type, rule and colour, per the
brief's "no heavy imagery" constraint. The only glyphs are a Unicode check (✓) in the completed
strip and dots (●) drawn as CSS circles.

Fonts load from Google Fonts:

```
https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Public+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap
```

Self-host via `next/font` for performance if you are on Next.js.

## Files

| Path | What it is |
|---|---|
| `design/BiPi Schedule Hub.dc.html` | The design reference. Build **option 2a** (top section). Open in a browser; `support.js` must sit beside it. |
| `design/support.js` | Runtime the prototype needs to render. Not part of the deliverable. |
| `schedule.data.ts` | All content + types + the current-stage algorithm. Drop straight in. |
| `tokens.css` | Palette, type stack, radii, shadows as CSS custom properties. |
| `reference/bipi-schedule-website-spec.md` | Original build spec — stack, data model, functional and non-functional requirements, out-of-scope list. |
| `reference/bipi-schedule-design-brief.md` | Original creative brief — audiences, mood, what needed designing. |

## Build order (suggested)

1. Scaffold, fonts, `tokens.css`, `schedule.data.ts`.
2. Current-stage logic + the derived values. Verify with a `?date=` override at five dates: 1 Sept, 6 Oct, 30 Oct, 20 Nov, 20 Dec.
3. Stage card in all three states (static, mobile).
4. "You are here" panel + term progress.
5. Timeline with the rail; add the disclosure last.
6. Laptop layout: stepper, term ruler with edge clamping, two-column grid, sticky aside.
7. Crosswalk, report rules, footer.
8. Accessibility pass, then a print stylesheet if a noticeboard copy is ever wanted.

## Acceptance checklist

- [ ] Current stage is derived from the real date in Europe/Dublin, and is correct at all five test dates.
- [ ] The current stage's card is open on load, with its teacher checkpoint visible without interaction on mobile.
- [ ] Opening a second stage does not close the first.
- [ ] The countdown reads "1 day left" (not "1 days left") the day before a deadline.
- [ ] Crosswalk shows all seven sections with a live "Due now" on the current one.
- [ ] Term ruler's December tick does not overhang its container at 1140px, 1280px or 1440px.
- [ ] `--bipi-now` appears nowhere except the current stage and today's marker.
- [ ] Timeline, dates and crosswalk are readable with JS disabled.
- [ ] No analytics, no cookies, no third-party requests except the font CDN.
- [ ] Footer states the SEC date, the ten-week buffer, and that this is a class schedule.

## Out of scope (v1)

Accounts, progress tracking, submissions, editing dates through a UI, multi-class support, and
content about the investigation topic itself. This site is about *when*, not *what*.

## Open questions for the client

1. Public link, or access-gated?
2. One class, or reusable by other Biology teachers with their own dates?
3. Next.js vs plain Vite + React?
4. Keep the report-rules block on this page, or move it to a second page?
5. Want a QR code block for the physical noticeboard?
