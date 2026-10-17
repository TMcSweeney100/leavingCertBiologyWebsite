# Intent — ready-for-signoff

Confirmed with Tim, 17 Oct 2026, through `/interview-me`. Later steps treat this as settled. Folds backlog #2 (`document-link`) into backlog #1 (`ready-for-signoff`).

## Statement of intent

- **Outcome:** a student can say "this checkpoint is ready, look at it" and point the teacher at their work; the teacher answers each request with Accept or Not yet and an optional short note, and both keep the history.
- **User:** the teacher working through Progress each week, and the student who otherwise has to catch the teacher in class to say "I'm done".
- **What's in:**
  - **Document link** (backlog #2, FR-38–40): one `https` link per component, set by the student; old links kept as history; always visible to the teacher, on the request, the student page and the grid row; stored only, never fetched; rendered `rel="noopener noreferrer"`; a line reminds the student to keep their own backup.
  - **Ready request:** the student marks a checkpoint Ready with an optional note, and can withdraw it until it is answered.
  - **Teacher review on the student's page** (`/teach/classes/[id]/students/[studentId]`), opened at that checkpoint: the request, the student's note and the component's *current* link, with Accept / Not yet and an optional note. Accept signs off. Not yet returns the grid cell to Due / Not due yet; the student sees "Not yet · date", the teacher's note, and **Ask again**.
  - **Records:** the request history (asked, answered, accepted or declined, both notes) is its own append-only record, in the style of `checkpoint_signoff`. Nothing is written into the student's log.
  - **Queue:** a waiting count on each class card at `/teach`; the list, in order of asking, at the top of the Progress tab. **Ready** is a fourth grid cell state beside Not due yet, Due and Signed off.
  - **Per-class setting:** "Require a link when asking for sign-off", off by default, a single switch on the class's Component tab. Off and no link: the student is nudged to add one, the teacher sees "No link yet".
- **Why now:** the backlog's aim is a reason to use the app that beats doing it by hand; this replaces "ask in class" and "hunt for the file in Classroom or Teams".
- **Success:** a student asks with a link; the teacher opens the work from the queue in one click and accepts or declines; the student sees the answer. `make verify` and `make e2e` green with the journey extended. Another class's request is a 404.
- **Constraint:** test-first; 404 never 403; links never fetched by the server; teacher notes framed as general and nondirective (PILOT-DESIGN §4: teachers "should not engage in corrections of the report for redrafting", Biology p. 9). Pages built working-first; the plan includes writing a D-10 Claude Design prompt and ends with a restyle task that waits for the pack.
- **Out of scope:** a class Settings page (move the switch there when a second setting appears); notifications or email; accepting straight from the queue; a "declined" grid state; a link per request; teacher notes in the student's log.

## Decisions made in the interview

| Question | Answer |
|---|---|
| Where does the teacher's accept/decline note live? | On the request, as a per-checkpoint history both sides see. Not in the student's log, which stays the student's own record with student-controlled visibility. |
| What does the grid show after a decline? | Back to Due / Not due yet, no fifth state. The decline is obvious on the student's page instead. |
| Where does the teacher accept or decline? | On the student's page, where the log and the work are, not inline in the queue. |
| Fold in `document-link`? | Yes (Tim): a request is only useful with a link to the work. |
| Link per component or per request? | Per component; every request shows it. |
| Is a link required to ask? | The teacher chooses per class (one class = one component, `component_instance.class_group_id` is UNIQUE). Off by default. |
| Settings page or one switch? | One switch on the Component tab for now; a Settings tab once more settings arrive, which Tim expects. |
| Can a student withdraw? | Yes, until answered. |
| Which link does a request show? | The component's current link. |

## Design

A small Claude Design pack, D-10 (D-8 and D-9 are reserved for School overview and Writing tools, `docs/design/prompts/README.md`): the student's Ready control and note on the D-3 page, the queue, and the teacher's review panel. The Ready grid cell reuses D-7's word-plus-tint pattern and needs no new design.
