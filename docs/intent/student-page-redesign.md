# Intent — student-page-redesign

Confirmed with Tim, 10 Nov 2026, through HTML mockups and then `/interview-me`. Later steps treat this as settled. It takes the stage drawer's look (`docs/intent/stage-drawer-redesign.md`, design B) to a second screen. Design: direction **D, checkpoints first**, in `docs/design/pilot/student-page-redesign/` (`NOTES.md`, then `design/d-checkpoints-first.html` and `design/d-phone.html`).

## Statement of intent

- **Outcome:** the teacher's student page (`/teach/classes/[id]/students/[studentId]`) is rebuilt to D.
  - **Header card:** the student's name, the class, when the last log entry was, and Open their work.
  - **Navy card:** "Up to date · 3 of 6 signed off", a six-segment bar (one segment per stage, each jumping to its stage) and the counts.
  - **Checkpoints:** one card per stage, on a timeline, in stage order.
    - Each card's actions are always visible: History and Revoke when signed off, Sign off otherwise.
    - The teacher's last note shows on its stage.
    - A stage waiting for an answer is open in place, with the request and the answer form.
  - **Log:** a footer showing the latest three entries, one line each, then Show all.
    - Show all expands the list in place and brings in filter chips: All, Sources, Notes, AI use.
    - Any entry opens in place to show the whole entry.
- **User:** a teacher (Katelyn first) checking one student, or answering that student's request for a sign-off.
- **Why now:**
  - The page looks flat and lacks colour, and the checkpoints and the log carry the same weight.
  - The log is a wall of fully printed entries that you scroll past.
  - A checkpoint's answer line uses the same divider as the line between checkpoints, so you can't see where one ends.
  - Tim, 10 Nov 2026: the checkpoints and their actions matter much more than the log.
  - The drawer's look is going page by page: the drawer is done, this page is next, and the Progress tab follows (mockups in another session).
- **Success, checked by hand:**
  - Arriving from Progress's Review link, or from the waiting queue, lands on the waiting stage's card with its answer form in view.
  - Without opening anything, a teacher can tell which stages are signed off, waiting or not due, and can Revoke, open History or Sign off.
  - A student with many log entries doesn't push the checkpoints down. The log starts at three lines.
  - Filtering to Sources shows only sources, and clicking an entry shows all of it.
  - On a phone (375 wide) nothing is clipped and every control is reachable.
- **Constraints:**
  - Built first, on its own branch from `pilotMain`, before any Progress code. The two pages share `use-signoffs.ts` and `signoff-parts.tsx`. Anything restyled there, and any new `--app-*` token in `globals.css`, is written for Progress to reuse.
  - Every action keeps working exactly as today:
    - sign off and undo
    - revoke, with its confirm step
    - Accept and Not yet, with the note
    - the History drawer
  - The `#checkpoint-<id>` anchors keep working: `waiting-queue.tsx` and `progress-grid.tsx` link to them.
  - Private entries still show only their kind and date, never their content.
- **Out of scope:**
  - Any backend change.
  - Linking a log entry to a stage (the API has no stage on entries).
  - What students see.
  - Building the Progress tab's redesign (mockups only for now).
  - The class's Students tab.

## Decisions made

| Question | Answer |
|---|---|
| Which design? | D, checkpoints first. A (waiting stage pulled to the top, a list of one-line checkpoints) and C (A on a phone) are reference only. B (two columns) is rejected: it put the checkpoints in a side column. |
| Only this page? | This page is the build. The Progress tab is being redesigned in the same style in another session, mockups only for now. |
| Build order with Progress? | The student page first, on its own branch. Progress is built after this merges and reuses its tokens and sign-off parts. Building both at once in one checkout would have them editing the same shared files. |
| Waiting stage at the top, or in stage order? | In stage order, open in place (D). Arrivals from Progress and the waiting queue already jump to the stage's anchor; the navy bar's segments add jump links. |
| What does Show all do? | Expands the list in place. A right-hand drawer would cover the answer form with its backdrop while the teacher reads the evidence. |
| Filter chips? | Yes: All, Sources, Notes, AI use, with counts. They appear once the log is expanded. |
| Clicking an entry? | Opens it in place to show the whole entry. This applies to every row, including the first three. |

## Left to the plan

- The new token names and their measured contrast: the waiting card's border and the rail's green between signed-off stages.
- How the stage cards reuse `CheckpointCell`, `RevokeStrip`, `SignoffAlert`, `RequestReview` and `RequestDrawer`, and what in `signoff-parts.tsx` changes for both pages.
- The accessibility of the timeline (`<ol>`), the segment links, the in-place rows (`aria-expanded`) and the filter chips (`aria-pressed`, an announced count).
- Which existing specs change, and whether an e2e journey reads this page.
