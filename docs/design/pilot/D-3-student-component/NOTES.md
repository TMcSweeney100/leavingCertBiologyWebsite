# Pack D-3 — `/components/[id]` (student component page, Overview tab)

Frames: `D-3 Student component.dc.html`. Turn 2 (top section) is the pack: eight states, each at 390 and 1140. Turn 1 (below it) is the three rough directions and the BiPi A/B, kept for the record.
Tokens: `tokens.css` — additions only, on top of D-1/D-2. No `--bipi-*` value touched.
Repo destination: `docs/design/pilot/D-3-student-component/`.

| Frame | State |
|---|---|
| 2a | Mid-term, normal — Stage 4 now, 1–3 done, Stage 3 signed off, one teacher item ticked. The whole page. |
| 2b | A due checkpoint not signed off — today 28 Sep 2026. |
| 2c | Before the first stage — today 1 Sep 2026. |
| 2d | No dates set yet by the teacher. |
| 2e | After the completion date — today 2 Mar 2027. |
| 2f | Business, mid-term — 7 stages, no Stage 6 checkpoint, 5 sections with word counts. |
| 2g | Ticking a teacher item — before, the moment, after. |
| 2h | The shared error panel — failed load and failed tick. |

## Direction chosen

**1c, the stage strip**, inside 2e "Navy". The memorable element is the **strip**: the six (or seven) stages as one row of cells across the top, the current one solid ink, with that stage open directly beneath it. A student's first question is "where am I", and the strip answers it before any reading happens — then the panel under it answers "what's due" and "how long have I got". The countdown is still bold (48px mono numerals at 1140) but it is the second thing, not the first.

The strip is a **navigator**: tapping a cell opens that stage and scrolls to it. The current cell stays ink while another stage is open, so moving around never loses "where am I" — which is also what the guidelines' non-linear process needs.

BiPi's card and table design is **kept and recoloured**, not replaced: the same eyebrow line, state pill, report badge, inset checkpoint block and disclosure, rebuilt on app tokens at the app's 12px type floor. Cards run roughly 15% taller than BiPi's as a result.

Removed before finishing (brief §9): the "Stages continue" rule-and-label that sat under the top panel in the turn-1 frames. The strip already says there are more stages.

## Tokens added

| Token | Value | Measured contrast | Used for |
|---|---|---|---|
| `--app-now` | `#101419` | 18.48:1 on white; white on it 18.48:1 | current-stage 1.5px border, "Now" pill fill, current strip cell, countdown block |
| `--app-now-lift` | `0 6px 20px rgba(16,20,25,.08)` | — | the one shadow in the app; current-stage card only |
| `--app-done` | `#0F5C3A` | 8.04:1; on `--app-done-ground` 7.36:1 | "Done" pill text, done strip numeral, signed-off line |
| `--app-done-ground` | `#F1F6F4` | = `--app-approved-tint` | done pill and strip-cell ground |
| `--app-done-ink` | `#2C5C4A` | 7.19:1; on ground 6.58:1 | stage name inside a done strip cell at 14px |

**Why ink for "Now".** Navy is the primary action colour and amber is reserved for pending work, so neither can mark the current stage. Ink is the darkest thing on a light page, so the eye lands on it first; it cannot be mistaken for a control; it survives a black-and-white print; and it adds no fifth hue to a palette already carrying four subject colours and three statuses. Both `--app-now` tokens are aliases of existing values, named so there is one place to change if "Now" ever needs its own colour.

**Why green for "Done".** The same green D-1 gives "Approved". A done stage and a signed-off checkpoint are the same kind of fact — something settled — and the page uses green for nothing else.

**Colour budget on this page.** Teal (or purple) subject bar, ink for now, green for done, amber for a passed checkpoint, navy for links and tabs. Nothing else is coloured, and every state is a word as well as a colour.

## Per page

### `/components/[id]` — Overview

- **1140:** 916px column. Strip of 6–7 cells, each showing numeral, state word, stage name and date. You-are-here panel under it as a two-column card: text left, countdown block right (48px numerals). Stages as full-width rows; the open one expands in place with checkpoint and teacher items side by side. Report sections and marks in the left column of a two-column footer, report rules in the right.
- **390:** same order. Strip cells drop to numerals only at 52px tall, with a words legend under them ("Stages 1 to 3 done · Stage 4 now · Stages 5 and 6 upcoming") so colour is never the only carrier. Panel goes single-column, countdown as two pills. Stage rows stack; the open one holds checkpoint, teacher items and prompts in sequence. Footer sections stack.
- **Copy verbatim.** Tabs: Overview · Log · Sources · AI use · Word checker (last four greyed at `#9AA2AC`, `aria-disabled="true"`, `cursor: not-allowed`, as D-2 established). The tab row scrolls horizontally at 390 with a hidden scrollbar, matching `component-tabs.tsx`'s `overflow-x-auto` — all five tabs exist at both widths; the fifth is reachable by swipe on a phone. State words: **Done**, **Now**, **Upcoming**. Checkpoint states: **Checkpoint · Not due yet**, **Checkpoint · Not signed off yet**, **Checkpoint signed off** (+ " · 24 Sep 2026"). Self-report: "You ticked this · 2 Oct 2026" with the standing line "Ticking is your own record. It isn't your teacher's sign-off." Only-teacher line: "Only your teacher can sign this off." Non-linear line: "You can move back and forth between stages — the order is a guide, not a lock." Dates-provenance line: "Stage dates are your class's plan, set by your teacher. The SEC completion date is 26 Feb 2027 — your finished coursework must be with your teacher by then."
- **Collapsed by default:** every stage except the current one, and the prompts disclosure at 390 ("Questions to help you (3)"). Prompts are open by default at 1140, where there is room. A stage opens by tapping its row or its strip cell; only one is open at a time.
- **Ordering:** stage order is the national order, always. Nothing is re-sorted by state. Footer order is Report sections → Report rules → How it's marked, because the sections list is the one a student uses while writing.
- **2b, a passed checkpoint:** the stage keeps its **Done**-less neutral row but gains a 3px amber left edge, an amber strip cell, and one message block reading "Checkpoint · Not signed off yet — your teacher signs this off. Bring it up in your next class." Nothing red, no "overdue", no blame, and the current stage is still the ink one.
- **2c, before the first stage:** no stage is Done; the first stage is Now; the panel reads "Nothing is due yet" above the countdown to the first date.
- **2d, no dates:** every cell neutral, no Now, no countdown, and the line "Your teacher hasn't set stage dates yet. All the stages and what they involve are below." Deliberately **not** amber — nothing is late and nothing is the student's to fix.
- **2e, after the completion date:** the panel drops to a plain card, no ink border, no lift, no countdown. "Your coursework period is over. This page is your record of it."
- **2f, Business:** seven cells — six numerals plus a wider **Report** cell for the unnumbered "Compilation of the final report" — a purple subject bar, Stages 4 and 5 sharing "6–8 hours together", Stage 6 with no checkpoint block at all (not an empty one), and five report sections carrying suggested word counts.
- **Behaviour vs roadmap §6.2:** the strip is a navigator, which §6.2 does not mention; and the crosswalk table is replaced by a "Report §n due" badge on each stage card (your call), so the report-section list is a plain reference list with no status column.

## Components restyled

- **Button** — as D-1. Sign out is the outline variant at `size="header"`. Stage rows are `<button type="button">` wrapping the whole row, so the tap target is the card, not a chevron. Strip cells are buttons at 52px (390) / 44px+ (1140).
- **Badge** — state pills are Badge-shaped but built as plain `<span>`s: the mono label needs its own size and tracking. Three variants: ink solid (Now), green tint (Done), white with hairline (Upcoming).
- **Card** — white, 10px radius, 1px `#DDE1E6` hairline. The current-stage card is the one exception in the app: 1.5px ink border plus `--app-now-lift`.
- **Checkbox** — the teacher-item tick is a 22px box inside a 44px row; the label and the self-report line are both inside the hit area.
- **Collapsible** — used only for prompts, as a `<details>`/`<summary>`. Stage expansion is not a Collapsible: it is state on the page, because opening one stage closes another.
- **Table** — not used anywhere. Report sections, rules and mark bands are hairline-divided lists so they survive 390 without a horizontal scroll.
- **Alert** — the D-1 message block (4px left edge, tinted ground) carries the checkpoint states and the no-dates line.

## Motion

One moment: **the tick** (2g). The box fills instantly on press — no wait for the request — and the self-report line ("You ticked this · 2 Oct 2026") rises 4px and fades in over 160ms, `cubic-bezier(.2,.7,.3,1)`. The line is the only thing that moves, because it is the only new information. Stage expansion is height and opacity at the same 160ms. Under `prefers-reduced-motion: reduce` both durations drop to 0ms and everything appears in place. If the tick fails, the box reverts and the failure appears as an inline message in that row (2h) — never a page-level panel for one tick.

## Open questions for Tim

1. **"Not due yet" is a new checkpoint state.** Your list had two (Signed off, Not signed off yet) but three exist in the data: a checkpoint whose stage date hasn't arrived is neither. Drawn as "Checkpoint · Not due yet" in neutral. If that becomes the test contract, it needs adding to the label list.
2. **The strip is a navigator and only one stage opens at a time.** That is a behaviour §6.2 doesn't specify. The alternative — all stages independently expandable — makes the strip decorative and the page long. Say which you want before it's built.
3. **The crosswalk table is gone** (your call in the form). Consequence worth naming: there is no single place a student can see all seven sections with their status at once, only per-stage badges. The Log tab might be where that belongs later.
4. **Business Stages 4 and 5 share one estimate.** Drawn as "6–8 hours together" on both cards. If the data holds one value against two stages, the API needs to say which of the pair owns it.
5. **The "Report" cell breaks the strip's numeral rule.** Six numerals plus a word-cell is honest to the data but means the strip is not uniformly countable. The alternative is a 7th numeral and a legend, which implies the compilation is a stage like the others. Drawn as the word.
6. **Teacher items with their own dates aren't drawn as late.** Stage 6's "Full draft in for feedback, 4 Dec 2026" has a date that can pass while the stage is still current. Nothing marks it. Adding amber there would put two amber things on one card; leaving it means a student can miss it. Not resolved.
7. **"Days left" wording near zero.** The frames show "11 days left". At 1 it should be "1 day left"; at 0 and below the frames do not define the string — "Due today" and "Past its date" are my suggestions, both unwritten.
8. **Prompts open by default at 1140, collapsed at 390.** A behavioural difference by width. Simpler to collapse at both, at the cost of the laptop's spare room.
9. **The page has no link to the teacher.** Every "talk to your teacher" line is advice with nothing behind it. If the pilot shows checkpoints sitting unsigned, a "Ask about this checkpoint" action would need a home — probably the Log tab, not here.
