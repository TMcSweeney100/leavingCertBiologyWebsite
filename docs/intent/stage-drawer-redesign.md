# Intent — stage-drawer-redesign

Confirmed with Tim, 8 Nov 2026, through a Claude Design canvas and then `/interview-me`. Later steps treat this as settled. It follows `docs/intent/stage-sheet.md` (the drawer as first built) and changes how that drawer looks and is laid out, not what it does. Design: the "Stage Drawer Redesign" canvas (https://claude.ai/artifact/4pQ2htktpxPRsSyL2PWX3u, private to Tim), direction **B** ("Navy checkpoint, cards"); its source files are copied to `docs/design/pilot/stage-drawer-redesign/design/`.

## Statement of intent

- **Outcome:** the teacher's stage drawer (the stage sheet on the Component tab) is rebuilt to direction B.
  - New order: stage date, then the checkpoint as a navy card, then the guidelines, then the teacher's note, then the teacher's items. White cards on a grey tray.
  - The note is one cream card: it shows what students see, and Edit turns that same card into the text box. No separate preview.
  - An item opens as a view inside the drawer (who has ticked it, and Edit), not by expanding in place.
- **User:** a teacher planning or checking a stage. They should see straight away what the stage is for and who's behind.
- **Why now:** in the drawer today everything has the same weight and nothing stands out. The note appears twice (the box and its preview). Opening an item stretches the drawer.
- **Success:**
  - A teacher opens a stage and the checkpoint is the first thing they notice.
  - They read and edit the note in one place.
  - They check who has ticked an item without the drawer growing.
  - `www.` links in notes are clickable for students.
- **Constraints:**
  - Only this drawer changes. The new colours go into `frontend/app/globals.css` as shared `--app-*` values, so other screens can reuse them later.
  - What students see is unchanged, apart from `www.` links becoming clickable.
  - The `www.` fix is its own commit.
  - Everything the drawer does today keeps working: unsaved notes and dates survive closing it, the date calendar still opens inside it, and choosing an item's date returns to that item.
- **Out of scope:**
  - Restyling any other screen. Taking B's look app-wide is undecided; it's an idea row in `docs/BACKLOG.md` (`app-polish`).
  - Moving "Questions students get from the guidelines": it stays collapsed at the bottom.
  - Any backend change. The data is the same; only how it's shown changes.

## Decisions made

| Question | Answer |
|---|---|
| Which design? | B, "Navy checkpoint, cards". A and C stay on the canvas as reference only. |
| Is B's look for the whole app? | Not decided. For now, only this drawer. Tim: the app as a whole needs polishing, and B could well become that look. Recorded as the `app-polish` idea in the backlog. |
| Do the new colours become shared tokens? | Yes, in `globals.css`, named for reuse, even though only the drawer uses them for now. |
| The note: two boxes or one? | One. A card showing what students see, with Edit to change it in place. |
| An item: dialog or view inside the drawer? | A view inside the drawer, like the date calendar. A dialog would break the stage sheet's "no second layer" rule (S-4), need its own calendar, and go full screen on a phone anyway. |
| Fix `www.` links? | Yes, in this work, as its own commit. A teacher types `www.`; the help text says web links become clickable. |
| "Questions students get from the guidelines"? | Stay collapsed at the bottom. Not important enough to move. |

## Left to the plan

- The new token names and their measured contrast.
- How the note's read and edit modes work with the draft the page keeps, and where focus goes on Edit, Cancel, Save and Remove.
- How the item view sits beside the calendar view in the sheet, and where focus goes on the way in and out.
- Which existing tests change, and how the `phase2` journey changes.
