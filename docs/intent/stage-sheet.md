# Intent — stage-sheet

Confirmed with Tim, 31 Oct 2026, through brainstorming and then `/interview-me`. Later steps treat this as settled. It is the `stage-sheet` row in `docs/BACKLOG.md`, named as "next" in `docs/intent/date-picker-drawer.md`, where "who ticked each item" was parked for it. Mockups: `docs/design/pilot/stage-sheet/design/` (`explore-one-drawer`, `explore-stage-rows`, `explore-sheet-date`, each as HTML and PNG).

## Statement of intent

- **Outcome:** on the teacher's Component tab (`/teach/classes/[id]/component`), clicking a stage opens a right-hand sheet for that stage, holding its date, the teacher's own note for students, the official guideline text and prompts, the stage's items with who has ticked them, and the checkpoint's sign-off counts. The note sits alongside the official text, never replacing or hiding it. The page's separate item list goes; each stage row shows its item letters instead.
- **User:** the teacher, at two moments: planning a stage ahead (note, items, dates) and checking on it in the week it runs (who has ticked, who's waiting). Students see the note, with clickable links and an "Updated" tag.
- **Why now:** it's next on the backlog. Students have ticked teacher items since Phase 2, but no teacher can see those ticks anywhere. And a teacher setting dates can't see what each stage tells students: the teacher's stage data has no `description` or `prompts`.
- **Success:** three hand tests on a laptop and a phone:
  1. Set up Stage 2 completely (its date, two items with dates, a note with a Drive link) in one sitting without leaving the Component tab.
  2. Open the current stage and answer "who hasn't ticked B, and who's waiting for sign-off?" in a few seconds, without the Progress tab.
  3. As a student, see the note at the top of Stage 2 with its link working and the "Updated" tag, and the stage's items as before.

  What comes up while testing goes into "From Tim's testing" in `docs/BACKLOG.md`.
- **Constraints:**
  - The repo's rules hold: the official text is never edited, hidden or reworded; no uploads; links are never visited by the server; every check happens in Spring, and anything outside the teacher's component is a 404.
  - Save dates stays on the page for setup; the sheet adds Save this date for its own stage.
  - The date drawer's calendar is reused inside the sheet, never as a second drawer on top.
  - Built in three parts, each tested by hand before the next: **(1)** the sheet with the date, official text, prompts and items, the page's item list removed; **(2)** who ticked each item, plus the checkpoint counts; **(3)** the teacher's note.
- **Out of scope:**
  - the student preview (its own backlog row, `student-preview`: a switch the teacher turns on and off)
  - copying setup from another class
  - "seen by N students" (it records new data about students)
  - notes that appear from a date
  - hiding or replacing the official text
  - renaming stages or adding stages (`docs/PILOT-DESIGN.md`, "Not in the pilot")
  - students replying to notes (that's messaging; notifications are out of the pilot)
  - suggested note wording written by us (it would sit beside the NCCA's text and read as official)
  - attachments
  - which report sections a stage feeds

## Decisions made

| Question | Answer |
|---|---|
| Can the teacher change the official stage description? | No. It's the NCCA's text with a `source_ref`. The teacher adds their own note, shown alongside it. |
| Can the teacher hide the official description? | No. |
| What else goes in the sheet? | Who ticked each item (yes); the checkpoint's sign-off counts (yes, one line); the guideline prompts (yes, folded); a preview of what students see (later: its own backlog row, switchable); report sections (no). |
| Does it all fit in one drawer? | Yes, because only the resting content shows. The sheet swaps between three views: at rest, picking a date (the existing calendar takes over the sheet, with a back link), and an item opened in place (its form, and who has and hasn't ticked it). No second drawer. |
| Does the page keep its separate item list? | No. Items are added and edited in the sheet; each stage row shows its item letters and a "Your note" chip. The year view still shows every item by letter. |
| Where is a stage's date changed? | On the row and in the sheet, sharing one unsaved draft, so a date picked in one shows (dashed) in the other. |
| How does the sheet save a date? | Its own Save this date, for that stage only. Save dates on the page stays for setup. Not a rewrite to per-stage saving everywhere: that would reverse pack D-5's batch, bring warnings mid-setup, and redo tested work. |
| What format is the note? | Plain text with line breaks, about 1,000 characters. `http(s)` addresses become links that open in a new tab. Only the text is stored. |
| What else does the note get? | An "Updated" tag for students for 7 days after a change, worked out from the note's date, so nothing new is recorded about students; and a live preview under the box showing it as students will see it. |
| When does a teacher open a stage? | Both when planning ahead and in the week a stage runs. |
| Build order after the sheet? | Who ticked, then the note. Ticking has existed since Phase 2 with no teacher able to see it; this makes it pay off. |
| What is success? | The three hand tests above. |

**The agent's calls, stated in the session and not challenged** (confirm or change at the plan):

- Students see the note in the stage card above the official text, headed "Note from your teacher" (the card already uses "From your teacher" for items), with "Updated 28 Oct" under it.
- The note has its own Save note button; clearing the text removes it.
- Who ticked names students as the Progress grid does.
- "3 waiting for you" in the counts line links to the waiting list on the Progress tab.
- Opening a sheet adds `?stage=N` to the address, so Back closes it and other pages can link to a stage.
- On a phone the sheet fills the screen, like the date drawer.

## Left to the plan

- How Part 2 loads its data: a new teacher endpoint for item ticks, plus the existing `GET /components/{id}/progress` for names and checkpoint states, fetched in parallel; and what the sheet shows when one of them fails.
- The shape of the draft so a one-stage save keeps other rows' unsaved dates (today `useEffect(() => setDraft(initial), [initial])` resets all of them), and Save this date sending the other stages' saved dates, since `replaceStageDates` clears any stage left out.
- The row's markup: the stage name as the button that opens the sheet, the date box still its own button, and where focus goes when each view opens and closes.
- The note's table, migration and endpoint, and the `note` field on the teacher's and student's stage data (with the Zod schemas in the same change).
- The `phase2` journey adds an item through the page's list today; it changes to go through the sheet.
- Whether the sheet is built from these mockups or from a Claude Design pack first.
