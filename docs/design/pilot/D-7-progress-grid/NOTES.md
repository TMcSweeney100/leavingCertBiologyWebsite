# Pack D-7 — Progress tab, sign-offs on the student view, signed-off stage card

Pages: `/teach/classes/[id]/progress`, `/teach/classes/[id]/students/[studentId]` (D-6 page, Checkpoints section added), `/components/[id]` (D-3 stage card, one extra state).
Export: `design/D-7 Progress grid.dc.html` (every state, both widths), which mounts `design/Progress tab.dc.html` and `design/Student checkpoints.dc.html`. Rough directions: `design/D-7 Explorations.dc.html` (1a Ledger, 1b Bands, 1c Due first); **1b chosen**.

## Direction chosen

1b Bands. The grid is one real `<table>`. Its rows are grouped into `<tbody>` row groups by how many due checkpoints each student is behind. Each group opens with a `th scope="rowgroup"` heading: a 36px amber numeral, then "checkpoints behind" and the number of students ("3 checkpoints behind · 2 students"). That heading is the page's one memorable thing. The last group reads "Up to date" in ink, with no numeral and no colour. Everything else is quiet: hairlines, white cells, small words. A stage picker above the grid switches between **All stages** and one checkpoint at a time. The one-stage view gives the full checkpoint text as the column heading and a 44px Sign off button per row, for going round the room. Removed decoration: the rough draft's pinned "checkpoint text" strip, which the one-stage view replaces.

## Tokens added

| Token | Value | Measured contrast | Used for |
|---|---|---|---|
| `--app-due` | `#A04806` (= attention) | 6.13 white · 5.31 on due tint · 5.77 on ground | "Due" word, band numeral, "Behind by N" |
| `--app-due-tint` | `#F6EDE6` (= attention tint) | navy on it 9.62 | Due cell ground |
| `--app-due-row` | `#FCF8F5` (new) | ink 17.50 · amber 5.81 · muted 5.11 | Due row on the student view |
| `--app-signed` | `#0F5C3A` (= done) | 8.04 white · 7.36 on done ground | "Signed off" |
| `--app-signed-recent` | `#F1F6F4` (= done ground) | navy 10.18 · body 10.51 | Cell signed off this session (offers Undo) |
| `--text-app-behind` | 36px / 32px (390) | large text, 5.77 on ground | Band numeral |
| `--app-hide-blur` | 7px | n/a | Hide names |

The due cell's amber hairline (`rgba(160,72,6,.32)`, about `#DAB89E`) is 1.85:1 against white. It carries no meaning; the word "Due" does. Cell buttons keep the app's `#DDE1E6` secondary-button border (1.31:1), the D-1/D-2 precedent. See open question 7.

## Per page

### /teach/classes/[id]/progress

- **1140:** header and tabs as D-2, but the main column widens from 880px to the full 1084px on this tab only, because the grid needs the width. Then the answer line, the Hide names switch and Re-sort, the stage picker (7 or 8 equal cards), and the table in its own `overflow-x:auto` card. `table-layout: fixed`: Student 196px, Log 134px, checkpoint columns share the rest (about 125px each).
- **390:** same header, answer line and switch. The picker is a row of numbered 48px buttons (All, 1–6, and R for the Business report), with the chosen checkpoint's full text in a card under it. Below that, the bands as `h3` headings, each over a `<ul>` of rows. In a one-stage view each row has its Sign off or Revoke on the right. In All, a row lists what's missing ("Not signed off: Stages 2 and 3") and the name links to the student view. **Recommended**, and chosen: no sideways scrolling, and the phone opens on the latest due stage.
- **Stage in the URL:** `?stage=all|1…6|R`. The default is `all` at 1140 and the latest due stage at 390. Back and refresh keep it.
- **Ordering:** furthest behind, then longest since the last log entry ("No entries yet" counts as longest), then surname (`localeCompare`, `en-IE`). One-stage views keep the same overall bands and order.
- **Re-sort:** rows and band membership are fixed at load. After any sign-off, undo or revoke, a secondary **Re-sort (N changes)** button appears beside Hide names. It re-sorts and regroups, and clears Undo. A row's own "Behind by N" line updates at once, so a student can briefly read "Up to date" inside the "1 checkpoint behind" band. That is deliberate: the band says where the row was sorted, the row says where it is now. A reload also re-sorts.
- **Log column:** a separate column. "Last entry 12 days ago", "Last entry yesterday", "Last entry today", "No entries yet". At 14 days or more, or with no entries, the words go ink and 600 weight. It never uses amber and never feeds the behind-by number. It counts private entries.

**Exact copy**

- Answer line (h2): "14 of 30 students are behind". Sub: "Stages 1, 2 and 3 are due. Furthest behind first." Business adds "Stage 6 has no checkpoint."
- Band headings: "3 checkpoints behind", "1 checkpoint behind", "Up to date", each with "N students".
- Cells: "Due" / "Sign off"; "Not due yet" / "Sign off"; "Signed off" / "2 Oct 2026"; "Signed off today" / "Undo"; while busy, "Signing off…".
- One-stage cells: "Due, not signed off", "Not due yet", "Signed off 2 Oct 2026" with **Revoke**, "Signed off today" with **Undo**.
- Revoke confirm strip: "Revoke the sign-off of “Plan discussed with the teacher (feasibility and safety)” for Aoife Byrne? It stays in the record as revoked by you." Buttons: **Revoke** (solid red), **Keep sign-off**.
- Failed sign-off (compact alert, `role="alert"`, under the row): "Couldn’t sign off “…” for Emma Nolan. Nothing changed. Check your connection and try again." Button: **Try again**.
- Live region sentences: "Signed off: Plan discussed with the teacher (feasibility and safety), for Aoife Byrne." · "Sign-off undone: …, for …. It stays in the record." · "Sign-off revoked: …, for …. It stays in the record." · "Couldn’t sign off … for …. Nothing changed."
- Nothing due yet: h2 "Nothing is due yet". Sub: "Stage 1’s checkpoint is due on 2 Oct 2026." Card: "You can sign off a checkpoint early when a student shows you their work. It counts once its date passes." The grid stays below.
- No stage dates: h2 "No stage dates yet". Sub: "Nothing can be due until the stages have dates." Card: "Set the stage dates on the Component tab and each checkpoint becomes due once its date passes. You can still sign off early when a student shows you their work." Link button: **Go to the Component tab**. Picker and headers read "No date set" / "No date".
- No component: "Nothing to track yet." / "6A Biology doesn’t have a component set up, so there are no checkpoints to sign off. Set one up on the class’s Component tab." **Go to the Component tab** (D-6 wording pattern).
- No approved students: "No students yet." / "Students appear here once you approve them. Share the join code from the Students tab, then approve their requests." **Go to the Students tab**.
- Everyone up to date: h2 "All 30 students are up to date". Sub: "Every checkpoint due so far (Stages 1, 2 and 3) is signed off. Stage 4’s is next, on 12 Feb 2027." No card, no colour.
- Failed load: the shared ErrorPanel: "Can't reach the service" / "Check your connection and try again in a moment." / **Try again**.
- Business: Stage 6 appears in the picker as a dashed, non-interactive item ("Stage 6 · No checkpoint · Nothing to sign off"), so the stage sequence still reads 1–6 then Report. It has **no table column**: a column of 30 empty cells would be noise, and a screen reader would read 30 blanks. The compilation stage's column is headed "Report" (D-3's label), short form "Final report".

**Collapsed by default:** nothing. The one-stage view is a URL, not a disclosure.

### /teach/classes/[id]/students/[studentId]

- **Checkpoints section sits above the Log.** The teacher arrives from the grid to act, and this is the answer to "where is this student". The log is the evidence behind it.
- **1140:** in the 916px column, "Checkpoints" (h2) on the left and the behind-by treatment on the right ("1 checkpoint behind"). Then one card of six rows, each a three-column grid: stage (label, stage name, date, state), the full checkpoint text, and the action. Then the Log as D-6 2l, headed "Last entry 14 days ago. 5 entries; Cian has shared 3 with you."
- **390:** the rows stack: label, date and state; full text; a full-width 44px **Sign off**, or "Signed off 6 Oct 2026" with a 44px **Revoke**.
- **Back links:** "6A Biology, Progress" first and "6A Biology, Students" second (at 390, "Progress" and "Students"), inside `<nav aria-label="Back to class">`.
- **History:** a checkpoint that was signed off and then revoked shows "Signed off on 10 Dec 2026, revoked on 12 Dec 2026 by Katelyn Hanlon." under its text. This is where "nothing is deleted" becomes visible.
- Revoke confirm (in place, in the row): "Revoke this sign-off for Cian Murphy? It stays in the record as revoked by you." **Revoke** / **Keep sign-off**.

### /components/[id] (D-3 stage card)

- One new checkpoint-box state. Ground `#F1F6F4`, a 3px `#0F5C3A` left edge, the mono label "Checkpoint · Signed off" in green, the quoted checkpoint text, then "Your teacher signed this off on 21 Jan 2027." (14px, green, 7.36:1). The date is a sentence because the label slot is uppercase mono and a date there reads as a code. "Not due yet" and "Not signed off yet" are unchanged.

## Components restyled

- `Table` (shadcn) for the 1140 grid, with `table-layout: fixed`, `th scope="row"` per student, `th scope="rowgroup"` per band, and a visually hidden `<caption>`. At 390 it is a plain `<ul>` per band, not a table (standards §3).
- Stage picker: plain `<a>` elements with `aria-current="true"` on the chosen one, in `<nav aria-label="Checkpoint view">`. Not shadcn `Tabs`, because each choice is a URL.
- Hide names: D-6's switch (`role="switch"`, `aria-checked`), off track `--app-switch-off`, on track navy.
- Revoke strip and the in-row alert reuse D-2's in-place confirm and D-1's compact alert. No `Dialog`.

## Motion

One moment: the switch knob, 160ms `--app-ease`. A sign-off changes the cell's words and ground instantly, with no animation, because a teacher working down a column is faster than any transition. The busy state is real network time, not a timed effect. With reduced motion, the knob jumps.

## Answers to the four questions

1. **Projected in class: Hide names.** A switch beside the answer line, on every Progress frame at both widths and always in the same place, one press to toggle. When on, it blurs names, sign-off dates and log lines with `filter: blur(7px)`. Bands, counts, cell states and buttons stay readable, so the teacher can still work, and still sign off, with the page projected. Off by default and remembered per device (localStorage), so a projector laptop stays hidden. The blur is visual only: screen readers and the accessible names still carry names, which is right for a teacher using one.
2. **Amber.** Yes: "Due, not signed off" is pending work, the teacher's own to-do, so it takes `--app-attention` (aliased as `--app-due`) and no new hue. Measured: 6.13:1 on white, 5.31:1 on the due tint, 5.77:1 for the band numeral on the band ground. The pending-request badge stays the other use. It doesn't compete: it lives on the Students tab and the class list, never on this tab.
3. **Column headers.** Headers are the stage label ("Stage 3"), then the checkpoint's opening words ("Plan discussed", never reworded, only cut), then the due state as a word ("Due" / "Not due"). The short phrase is a link to `?stage=3`, as is the picker card. The picker card also carries the date. The full text is reachable by keyboard and touch in three ways: the one-stage view's column header, the phone picker's text card, and every cell's accessible name ("Sign off Plan discussed with the teacher (feasibility and safety) for Aoife Byrne").
4. **Sign-off speed versus accidents.** One click, and the cell changes in place, with no confirm. A confirm would double the clicks for ten students and teach teachers to click through it. Three things cover a stray click. **Undo**, in the cell itself, stays until the next re-sort or reload rather than for a few seconds; a timer is hostile to WCAG 2.2.1 and to a teacher who looks up at the class. The **in-place Revoke** is always there after that. And **rows never move** under the pointer, so the cell next to a stray click is always the one it was. Targets: 48px cells at 1140, 44px buttons at 390 with 8px gaps (6px between picker buttons, see open question 5).

## Open questions for Tim

1. **Accessible names (the tests' contract).** Proposed: `link "Progress"` with `aria-current="page"` in `nav "Class sections"`. Tabs become links, because D-2's `role="tab"` spans can't navigate. **Sign off {checkpoint} for {student}** · **Revoke sign-off of {checkpoint} for {student}** (on the signed-off cell, which opens the strip) · **Revoke** (confirm) · **Keep sign-off** (cancel) · new: **Undo sign-off of {checkpoint} for {student}** · **Re-sort (N changes)** · `switch "Hide names"` · picker links "Stage 3, Plan discussed, 11 Dec 2026, due" and "All stages". Improvement: since several rows can have a confirm strip open in turn, give the strip's buttons their full names too ("Revoke sign-off of … for …", "Keep sign-off of … for …") and keep the visible labels short. The spec can then query unambiguously.
2. **Undo is a revoke.** Undo writes a revoked record (by the teacher, now) like any revoke; nothing is deleted. Confirm that the audit trail should show undone sign-offs, rather than erase a sign-off made seconds ago. I recommend showing them: it is simpler and matches "never deleted".
3. **Undo lifetime** differs from D-6 (`--app-undo-ms: 5000`): here it lasts until re-sort or reload. Keep the two different? I recommend yes, because the grid is a work surface.
4. **Early sign-off.** Allowed in "Not due yet" and "No date" cells. It counts toward nothing until the date passes. Confirm the backend accepts a sign-off before a stage's date.
5. **Picker at 390.** 7 or 8 buttons across 358px give buttons of about 44px with 6px gaps, under the 8px rule. Options: accept 6px (each target is at least 44×48), or drop "All" onto its own line. I recommend accepting 6px.
6. **Wider main column.** This tab uses the full 1084px while other class tabs stay at 880px, so the tab row jumps width between tabs. Alternatively, keep the header and tabs at 880px and let only the grid card widen. Which?
7. **Control borders at 3:1.** The app's secondary-button border (`#DDE1E6`, 1.31:1) is below WCAG 1.4.11's 3:1 for control boundaries. In the grid the button's word identifies it, but axe won't flag this and a strict audit might. That is an app-wide call, not this pack's.
8. **Hide names scope.** It blurs names, dates and log lines. Should it also blur the answer-line count ("14 of 30 students are behind")? I say no: counts identify nobody.
9. **Roadmap §6.2 changes flagged:** the `?stage=` query parameter (new URL state), a Re-sort control, Undo, and the student view's order (Checkpoints above Log). No fixed rule changes: the definitions of due and behind, the sort order, the separate log, sign-offs never deleted, teacher-only sign-off and approved students only are all as given.
