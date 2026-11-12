# Progress tab redesign — design notes

Page: `/teach/classes/[id]/progress`. Chosen 10 Nov 2026: direction **A, one stage at a time**, with its All tab. Takes the stage drawer's design B (white cards on the grey tray, the navy card with its green/amber bar, the amber "waiting" strip) to the Progress tab. Part of the `app-polish` idea in `docs/BACKLOG.md`.

`design/` holds plain HTML frames, as the student page redesign does. Open them in a browser; each has a PNG beside it. `blocks.js` fills every frame with 6th Year Biology's real sign-off state (32 students, Stages 1–3 due, Tim waiting on Stage 5). **One change from the real data: every student has a work link**, to show the stress case. Live, only Tim has one. `mock.css` maps every colour to an existing `--app-*` token.

| File | What it is |
|---|---|
| `a-stage-first.html` | **A, chosen**, laptop (1440): opens on one stage |
| `a-phone.html` | **A, chosen**, phone (375) |
| `a-all.html` | **A, chosen**: the All tab, laptop (1440) |
| `a-all-phone.html` | **A, chosen**: the All tab, phone (375) |
| `b-quiet-grid.html` | B, laptop (1440): opens on the all-stages grid. Reference only; A's All tab reuses its cells |

Intent: `docs/intent/progress-redesign.md`. Plan: `docs/superpowers/plans/2026-11-10-progress-redesign.md` (built after the student page). The interview changed two things the frames don't show:
- **The waiting requests are the main job.** Every request is listed, oldest first, with Review. They aren't a compact extra.
- **The student page gets a Next request bar**, so a teacher can answer a run of requests without coming back here.

## Why A

Tim, 10 Nov 2026: the live page feels intimidating. A's first screen is one stage's list: 20 names, one Sign off each. The live page opens on 192 cells. The whole class is still one click away under All. Cost: catching one student up across several stages means a click to All or to their student page.

## What both directions change

- **Waiting for you is compact:** the drawer's amber strip, then one row per request with a Review button.
- **The work link is an icon beside the name**, not a line of its own. Accessible name "Open Cian's work"; the build keeps a 44px target.
- **"Behind by N" is not repeated** under every name. A says it once in the row's meta, and B says it in the band heading.
- **"No entries yet" is not bold.** A shows "No entries" in muted text. B shows a dash.

## A: one stage at a time

- Laptop opens on the latest due stage, as the phone already does. "All" stays as the first tab.
- **Stage tabs** are one white card: each stage has a small progress bar and "N to sign off" (or its due date if it isn't due).
- **Navy card** for the chosen stage: the checkpoint in large text, the bar, and signed off / waiting / not yet.
- **Still to sign off · 20:** one row per student, furthest behind first. Each row has an amber number chip, the name and work icon, the meta line, and a Sign off button.
- **Signed off · 12** is collapsed to one line with Show.

### A's All tab

- **Laptop:**
  - The navy card says "23 of 32 students are behind". Its bar is green for up to date and amber for behind, with "2 are 3 behind · 7 are 2 behind · …" under it.
  - Under it is B's quiet grid, with a plain header row (number, short name as a link to the stage, Due or the date), because A's stage tabs already carry each stage's progress.
- **Phone:** no grid. Each student is a row with six stage dots (green tick signed off, amber ring due, amber filled waiting, grey not due). The row opens the student's page, where the teacher signs off. Signing off on a phone stays in the one-stage view.

## B: the quiet grid

- **The navy card is the table's header.** Its stage columns line up with the grid's columns: number, short name (a link to that stage), a progress bar, and "27/32 · Due". That replaces both the stage picker cards and the table header row.
- A **key** above the grid explains the four marks.
- **Cells:**
  - Signed off: a green tick, with the date only on hover.
  - Due: an amber "Sign off" button.
  - Not due: a faint dash (hover to sign off early).
  - Waiting: a navy "Review" with the stage number.
- **Up to date** is collapsed except for students who are waiting.

## Only new values

None. Every colour is an existing `--app-*` token.
