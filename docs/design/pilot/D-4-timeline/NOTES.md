# Pack D-4 — `/home` (timeline) and student navigation

Frames: `design/D-4 Timeline.dc.html` — in this pack, with its `support.js` and `assets/crest-nwetss.png` beside it; open the HTML directly in a browser, no build step. Round 3 (`3a`, at the top of the file) is the chosen direction and is drawn at 1140 in both aside states; rounds 2 and 1 are kept below it as the rejected alternatives. **The ten states in the pack brief are not yet drawn** — they are specified in copy below and are the next piece of work.

Tokens: `tokens.css` (additions only; no new hue, no changed D-1/D-2 value).
Repo destination: `docs/design/pilot/D-4-timeline/`.

## Direction chosen

**2e "Navy"**, continued from D-1 and D-2. The memorable element is the **countdown to the next thing due**: white Space Grotesk 700 at 48px on a solid navy band at the top of the list, with the item's title, kind and subject on white directly beneath it. It is the only saturated surface on the page, exactly as the join code is the only one on `/teach/classes/[id]`. Everything else is white cards, hairlines and one accent.

The page is a **list with a calendar beside it that folds away**. Shown (the 1140 default), the month sits in a 344px aside with the two completion dates under it, and the list reads as day cards. Hidden, the aside collapses and the list takes the full 916px column as a four-column row grid — date, marker, item, days remaining. The state is in the URL (`?view=list&from=2026-10-12&calendar=off`).

The change that makes the toggle safe: **student navigation moved out of the aside and into a row under the header**, so nothing a student must reach can disappear with the calendar. At 390 there is no aside at all — the Month view already does that job.

Before finishing, one decoration was removed: the day cards originally carried a subject name in their header as well as on the item row. It is gone; the edge bar and the item's own meta line already say it.

## Tokens added

No new colours. Contrast on `#FFFFFF`, and on `--app-ground` `#F7F8F9` where the token sits on the page ground.

| Token | Value | Measured contrast | Used for |
|---|---|---|---|
| `--app-marker` / `--app-marker-sm` | `11px` / `9px` | — | item-kind marker, 1140 / 390 |
| `--app-marker-stroke` | `2px` | — | the two hollow markers |
| `--app-marker-fixed` | `var(--app-accent)` `#1F3A6E` | 11.12:1 white · 10.46:1 ground | completion date, stage date |
| `--app-marker-added` | `var(--app-grey)` `#4B535C` | 7.80:1 white · 7.34:1 ground | teacher item, own item |
| `--text-app-countdown` | `48px` | white on accent 11.12:1 | countdown, 1140 |
| `--text-app-countdown-sm` | `34px` | white on accent 11.12:1 | countdown, 390 |
| `--app-calendar-dot` | `5px` | accent 10.46:1 on ground | "something is due" dot |
| `--app-calendar-cell` | `34px` | — | month cell, aside |
| `--app-aside` / `--app-aside-gap` | `344px` / `40px` | — | the collapsing aside |
| `--app-row-date` / `-sm` | `96px` / `58px` | — | mono date column |
| `--app-row-remaining` | `96px` | — | days-remaining column |

**Kinds are shapes, not colours.** Completion date = filled square in a 2px ring; stage date = filled square; teacher item = hollow circle; own item = hollow diamond. Each is also written as a word in the row's meta line, so the page survives greyscale printing and colour blindness with nothing lost. Subject stays D-2's 4px left edge bar plus the subject written out.

## Per page

### `/home` — Timeline

- **1140:** header, then a navigation row, then a 916px centred column. `h1` "Timeline" with **Add my own item** (navy) and **Show calendar** / **Hide calendar** (outline) on its baseline. Countdown band, then the view switcher and range on one line, then the list. With the calendar shown the column splits: list left, 344px aside right holding the month and the completion dates.
- **390:** the D-1 phone header, the navigation row wrapping beneath it, countdown, view switcher, then the list. No aside; **Add my own item** is a full-width navy button at the end of the list, and is also the empty states' primary action.
- **Ordering:** strictly chronological, earliest first, from today. Items on the same date sort completion date, stage date, teacher item, own item — the fixed weight, which is also the type scale: stage titles are Space Grotesk 20px/600, everything else Public Sans 17px/600. Overdue items stay in place, above today, never hidden.
- **Collapsed by default:** the calendar aside is *shown* by default at 1140 and absent at 390. Nothing else is collapsed — a timeline that hides items isn't one.

**Copy, verbatim.** These are the strings the tests should assert.

| Where | String |
|---|---|
| Page title | `Timeline` |
| Countdown label | `Next up` |
| Countdown | `in 2 days` · `tomorrow` · `today` · `2 days ago` (from `relativeDay`) |
| Kind words | `Completion date` · `Stage date` · `From your teacher` · `Test` · `Essay` · `Deadline` · `Other` |
| Own-item meta | `Test · my own item` |
| Privacy line, on the form | `Only you can see this. Your teachers can't.` |
| Navigation | `Timeline` · `Join a class` · then one link per subject, labelled by subject |
| Pending, in the nav | `Business` followed by `Pending approval` |
| View switcher | `List` · `Week` · `Month` |
| Range controls | `Previous` · `Next`, with the range as an `h2`: `12 Oct – 8 Nov 2026` |
| Calendar toggle | `Show calendar` / `Hide calendar` |
| Calendar note | `A dot means something is due. The list beside it says what.` |
| Add | `Add my own item` |
| Edit / delete | `Edit` · `Delete`, accessible names `Edit Irish oral mock` / `Delete Irish oral mock` |
| Delete confirmation | `Delete this item?` then `Delete item` (red fill) and `Keep` (outline) |
| Deleted | `Irish oral mock deleted.` with `Undo` |
| Nothing in range | `Nothing due 12 Oct – 8 Nov 2026.` then `Your next item is Driving test, Thursday 19 Nov 2026.` and **Add my own item** |
| No components yet | `Your teachers haven't set up coursework yet. Your own items still show here.` |
| Pending classes only | `A teacher needs to approve you before your coursework dates show here. Your own items still do.` |
| Brand new student | `Nothing here yet.` / `Join a class with the code your teacher gave you, and add anything else you need to remember.` then **Join a class** (navy) and **Add my own item** (outline) |
| Form title | `Add my own item` / `Edit my own item` |
| Form fields | `Title` · `Date` · `Kind` · `Class (optional)`, with `No class` as the first class option |
| Form buttons | `Save item` · `Cancel` |
| Title missing | `Give the item a title.` |
| Date missing | `Give the item a date.` |
| Failed save | the shared error panel, unchanged: `That didn't save` |
| Failed load | the shared error panel, unchanged: `Can't reach the service` / `Check your connection and try again in a moment.` / `Try again` |

**Where class approval status lives — the answer you asked for.** *In the navigation row, on the subject itself.* A pending class appears where its subject link will appear once approved, greyed, not a link, with `Pending approval` in mono amber beside it. Three reasons: it is where the student will look for the subject; it makes the wait legible as "this subject isn't open yet" rather than as an unrelated notice; and it keeps the timeline free of anything that isn't a date. When **every** class is pending, the timeline additionally carries the amber message block above the list, because with no dates at all the nav row alone is too quiet to explain an empty page. `My classes` as a separate page is not needed and is not drawn.

**Behaviour changes against roadmap §6.2** — flagged, not built, see open questions: the `calendar` query parameter; the student-set `Important` flag; the completion date as a timeline item (already answered as Q-P2-E); the delete undo.

## Components restyled

- **`TimelineView`** — the `<ul>` of bare rows becomes either day cards (`<article>` per date, hairline header carrying the weekday and days remaining) or the flat four-column row, depending on the aside. `Previous` / range / `Next` keep their current DOM order and accessible names.
- **`Notice`** — reused unchanged for the three empty-ish states and for pending-only classes; `tone="attention"`.
- **`ErrorPanel`** — reused unchanged, in place, for both the failed load and the failed save.
- **`Field` / `FieldGroup`** — the add/edit form is D-1's field group, four rows. The privacy line sits above the group, not in a row, so it reads as a promise about the form rather than help for one field.
- **`Button`** — no new variant. `default` for **Add my own item** and **Save item**, `outline` for **Cancel**, **Edit**, **Delete** and the calendar toggle, `confirmDestructive` for **Delete item**.
- **Table** — used only for the month view (the existing `<table>` is right; it keeps the `caption` and `scope="col"`). The aside's month is a `<div>` grid, not a table: it is a pointer into the list, not a data table.
- **No icon-only controls.** The calendar toggle is a word.

## Motion

One moment: the **aside opening and closing** — width and opacity, `160ms`, `cubic-bezier(.2,.7,.3,1)`, the existing `--app-duration` / `--app-ease`. Chosen over animating the countdown because the aside is the only thing on the page the student deliberately changes, and an instant reflow of the whole list reads as a page reload. Under `prefers-reduced-motion: reduce` the duration token is already `0ms` and the aside simply appears. The countdown never animates or counts down live.

## Open questions for Tim

1. **The calendar toggle changes the row form, not just the width.** Shown → day cards; hidden → flat rows. If you'd rather the day cards simply widened, say so — it is a smaller change and I'll redraw. Also: should the preference persist across sessions, or is the URL enough? The frames assume the URL only.
2. **`Important`, set by the student.** Your weights question. The frames fix the order by source *and* draw an optional `Important` flag on the student's own items (round 2, `2b`), because a fixed order can't know the driving test matters more this week than Stage 5. It is a new column on `personal_item` and a fifth field on the form, so it needs your yes before it is built. Not in the chosen direction's frames.
3. **The completion date as a timeline item.** Q-P2-E was answered on 20 Sep, after this pack's brief was written. The frames treat it as the heaviest kind, with its own marker. Confirm the label: `Completion date`, or the SEC's own wording?
4. **`My components` as a label.** It is the system's word, not a student's. `My subjects` reads better on a phone and matches how the nav is actually labelled (by subject). Changing it touches the nav, the `/home` section heading and two specs.
5. **Delete undo vs confirm.** The frames keep the built in-place confirmation *and* add an undo line after deleting. Two safety nets may be one too many; the undo is the kinder one if you want only one.
6. **`From your teacher` as the kind word.** It reads better than `Teacher item` to a student but is longer in a row. It is the built string, so changing it is a spec change.
7. **Nothing-in-range copy names the next item's date.** That needs one item beyond the range in the response, which the timeline query does not return today. Either widen the query or drop the second sentence.
8. **Overdue items.** Drawn in place, in normal ink, with `2 days ago` — not red, not tinted, per the brief's rule that red is for errors. Confirm nothing stronger is wanted for something a week overdue.
9. **A student with no subjects in the pilot's four.** The nav row then holds only `Timeline` and `Join a class`, which looks broken. The empty state covers it in words; a quieter nav row might be better.
