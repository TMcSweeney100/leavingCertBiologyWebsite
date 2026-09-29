# Claude Design prompt: pack D-7 (progress grid and sign-offs)

Edit freely, then paste everything below the line into Claude Design, **in the same project as D-1 to D-6** so it keeps the Navy direction. Attach:

- `docs/design/UI-BRIEF.md` (the brief; §5 is the Navy system, §9 names this page's memorable thing);
- `docs/design/UI-STANDARDS.md` (§3 layout and tables, §5 colour, §6 interactive elements, §13 accessibility floor);
- `docs/design/UI-CHECKLIST.md` (what the build is checked against before it's called done);
- `docs/design/pilot/D-1-app-shell-auth/tokens.css`;
- screenshots of the D-2 frame for the Students tab of `/teach/classes/[id]` (the class page and its tab row), the D-5 frame for the Component tab, the D-6 frame for the teacher's reading view `/teach/classes/[id]/students/[studentId]`, and the D-3 stage card with its checkpoint box.

Sources: `docs/PILOT-ROADMAP.md` §6.1 (teacher navigation), §6.2 (`/teach/classes/[id]/progress` and `/teach/classes/[id]/students/[studentId]` rows), §7 Phase 4 and §8.4; `docs/PILOT-DESIGN.md` §6.5 (sign-offs are never deleted), §7.3 (the checkpoints and their basis) and §8.4 (what "behind" means). Checkpoint wording is from `backend/src/main/resources/db/content/V2__science_templates.sql` and `V3__business_template.sql`. Needed for build milestones **4A/4B**.

---

I'm designing the teacher's progress grid for the Leaving Cert coursework app, in the same **2e "Navy"** direction you set in D-1 to D-6. The attached `UI-BRIEF.md` and `tokens.css` are the system; `UI-STANDARDS.md` and `UI-CHECKLIST.md` are how it will be built and checked. **Build on them; don't start a new palette.**

This pack is the **Progress** tab of the class page you drew in D-2 (`/teach/classes/[id]/progress`), greyed out until now, plus **sign-offs on the teacher's view of one student** (`/teach/classes/[id]/students/[studentId]`, drawn in D-6), plus one small change to the student's stage card from D-3.

**This pack is desktop-first.** Teachers use it on a laptop at the start of a lesson or in a free class, sometimes on a school PC plugged into the classroom projector. Design at **1140px first**; the page must still work on a phone at **390px**, for a teacher checking one student in the corridor, but the phone is the second layout, not the first.

Please give me **two or three directions** for the grid at **1140px** first, rough. After I pick one, build every state below at **1140px and 390px**.

## What the teacher is doing

Finding out who is behind without asking around. The page answers one question: **which students need me this week, and for what?** Passing this page's gate is what lets the pilot start in a real school, so it has to be right on day one.

## What "behind" means (fixed, not open)

- A **checkpoint** is a point in a stage where the SEC or NCCA guidelines have the student share work with the teacher. Each stage has at most one. The teacher, never the student, signs it off.
- A checkpoint is **due** once its stage's date has passed. The teacher sets the stage dates on the Component tab (D-5). A stage without a date is never due.
- A student is **behind by N** where N is the number of due checkpoints they don't have a sign-off for. **This number is the page's one memorable thing** (brief §9). Spend the boldness there.
- **Order:** furthest behind first; then the longest since their last log entry; then by surname.
- **Log activity is shown separately from progress.** "Hasn't written a log entry in three weeks" and "hasn't had the plan signed off" are different problems and must not blur into one score. Days since the last log entry counts every entry, including ones the student keeps private (the teacher already sees that a private entry exists and its date, D-6).
- **Only approved students appear.** Pending join requests stay on the Students tab.
- **Ticks are not on this page.** A student's ticks on the teacher's own items are self-reported (D-3 says so); the grid is only the teacher's own sign-offs.

## The checkpoints (the grid's columns)

Quote these exactly. They're what teachers review (roadmap Q1), and they're long, so the column headers need a short form. **Propose how the header shows the stage and date while the full checkpoint text stays readable and reachable (not only on hover).** The full text must also be in each cell's accessible name.

**Biology, Chemistry and Physics** (six stages, a checkpoint in each):

| Stage | Checkpoint |
|---|---|
| Stage 1 · Initial Response to the Investigation Brief | Initial ideas discussed with the teacher |
| Stage 2 · Background Research | Investigative log shared with the teacher |
| Stage 3 · Designing and Planning the Experiment | Plan discussed with the teacher (feasibility and safety) |
| Stage 4 · Conducting the Experiment | Experiment carried out under supervision, in line with the research and planning already shared |
| Stage 5 · Data Analysis and Conclusions | Data analysis shared with the teacher |
| Stage 6 · Finalising the Biology in Practice Investigation Report | Final report submitted to the teacher |

(Stage names above are Biology's. Chemistry and Physics name Stage 6 for their own subject.)

**Business** has six numbered stages and an unnumbered "Compilation of the final report". **Stage 6 has no checkpoint**, so a Business grid has six checkpoint columns and one stage without one. Show how the grid handles a stage with nothing to sign off. Use a Biology class for most frames and one Business frame for this.

## Each cell, and what the teacher can do

One cell is one student × one checkpoint. Its states, each carried by a word as well as any colour or shape:

| State | When | What the teacher can do |
|---|---|---|
| **Not due yet** | The stage date hasn't passed, or isn't set | Sign off (a student can be early) |
| **Due, not signed off** | The stage date has passed and there's no sign-off. This is what "behind" counts. | Sign off |
| **Signed off** | There's a current sign-off. Show the date. | Revoke |

- **Leave room for a fourth state, coming in the next phase:** **Ready for sign-off**, when the student has said on their own page that they've done it and the teacher hasn't signed it off yet. Don't draw its frames now, but choose a cell treatment that can take one more state without a redesign, and say in `NOTES.md` how you'd show it.
- **Sign off** should be fast. A teacher may sign off ten students in a row at the start of a lesson after going round the room. Say whether it's one click with the cell changing in place, or one click plus a confirm, and why.
- **Revoke** is the undo for a mistake. It's rarer and it removes a student's progress, so it **confirms in place** the way D-2's Remove and Turn joining off do (no `window.confirm`, no modal unless you argue for one). Nothing is ever deleted: a revoked sign-off is kept with who revoked it and when, and the cell goes back to Due or Not due yet.
- After a sign-off or a revoke the student's **behind by** number changes, and the row may move in the order. **Don't move the row under the teacher's cursor.** Propose when the re-sort happens (on the next load, or with a "Re-sort" control, or another way) so a teacher signing off down a column never loses their place.
- Every change is announced to a screen reader as a sentence ("Signed off: Plan discussed with the teacher, for Aoife Byrne").

## The student's row

Each row carries: the student's name (a link to their student view), **behind by N** (or the words for zero), the cells, and **days since their last log entry** ("Last entry 12 days ago", "Last entry today", "No entries yet"). Use a 40-character surname in one row so wrapping is tested.

## Pages and states to draw

Progress tab, `/teach/classes/[id]/progress`:

1. **The grid, mid-year, 1140px.** A Biology class of **30 students**, Stages 1–3 due, 4–6 not due yet. A realistic spread: a few students behind by 2 or 3, most behind by 0 or 1, some signed off early on Stage 4, two with no log entries. Furthest behind first.
2. **The same grid at 390px.** Seven columns won't fit. Propose the phone layout: for instance a list of students with their behind-by number that opens one student's checkpoints, or the grid scrolling inside its own container (never the page, standards §3). Recommend one.
3. **Signing off:** a cell before, during (the busy state), and after, with the behind-by number updated.
4. **Revoking:** the in-place confirmation on a signed-off cell, and the result.
5. **A failed sign-off:** the compact alert from D-1, in place, with the cell unchanged.
6. **Nothing due yet:** stage dates set, but none has passed. The grid is still useful for early sign-offs; say so without alarm.
7. **No stage dates set:** nothing can be due. Point the teacher to the Component tab to set dates.
8. **No component:** the class hasn't set one up. Say why the tab is empty and link to the Component tab, as D-6 does for the log.
9. **No approved students:** point to the Students tab and the join code.
10. **Everyone up to date:** every due checkpoint signed off. A calm, specific sentence, not a celebration.
11. **Business grid:** Stage 6 with no checkpoint, and the Compilation column.
12. **The shared error panel** for a failed load.
13. **Tab row:** Students · Component · **Progress**, with Progress now live and current.

Student view, `/teach/classes/[id]/students/[studentId]` (the D-6 page):

14. **Checkpoints section** added to the page: the student's checkpoints with their states and dates, the same Sign off and Revoke actions as the grid, and the student's behind-by number. Decide where it sits relative to the log, and draw it at 1140px and 390px.
15. **A link back** to the Progress tab as well as the Students tab.

Student component page, `/components/[id]` (the D-3 stage card):

16. **A signed-off checkpoint** in the stage card's checkpoint box: today it says "Not due yet" or "Not signed off yet"; add the signed-off state with its date ("Signed off on 3 Mar 2027", or better wording). Same card, one more state; don't redesign the card.

## Things I want your view on

- **Projected in class.** A teacher may open this with the laptop on the classroom projector. A list of names sorted by who is furthest behind is a public ranking. There should be a toggle that allows the teacher to blur out the names and dates incase they show it on the screen, the toggle should be easy to use to see and to get to and switch back and forth seemlessly
- **Amber.** The brief reserves amber for pending work. Is "due, not signed off" pending work in that sense (I think it is), or does it need its own treatment? Whatever you choose, measure it and record it in `NOTES.md`.
- **Column headers.** Six to seven long checkpoint names across 1140px. Stage number plus a short phrase, the stage date and its due state, with the full text reachable by keyboard and touch. Show your answer.
- **Sign off speed versus accidents.** One click is fast; a stray click signs off the wrong student. Tell me how you balance it (a visible undo? the in-place revoke? a larger target?).

## Rules that constrain you

- Build on `tokens.css` and the D-1 to D-6 component language: white cards with hairlines, 4px-edge messages, in-place confirmations, subject edge bars only on class rows.
- **A real data table at 1140px** (`<table>`, a header row, a row header per student) so a screen reader can move by row and column. Scrolling, if any, happens inside the table's own container; the page never scrolls sideways.
- Light only. Body 16px, nothing under 12px, `tabular-nums` on every number that lines up. Dates "3 Mar 2027". Sentence case. One primary button per screen (the grid may have none; say so if so). Nothing only on hover.
- **Role-and-name-queryable controls.** The specs query by role and accessible name, so every control needs a real one. These are proposals and will become the tests' contract; improve them in `NOTES.md` "Open questions": **Progress** (tab), **Sign off *[checkpoint]* for *[student name]***, **Revoke sign-off of *[checkpoint]* for *[student name]***, **Revoke** (the confirm), **Keep sign-off** (the cancel).
- **44px touch targets** at 390px, 24px minimum pointer targets at 1140px, 8px between neighbours; focus visible on every cell; **one `h1` per page**; **no colour-only meaning** (every cell state and the behind-by number have words).
- A 30 × 7 grid must render complete on first paint: no spinners, no skeleton, nothing that jumps. It's server-rendered.
- Any behaviour change goes in `NOTES.md` under "Open questions". The fixed rules (the definition of due and behind, the sort order, log activity kept separate, sign-offs never deleted, only the teacher signs off, only approved students shown) aren't open.
- Never invent or reword checkpoint text. Student names and stage dates in the frames are sample content; mark them as such.

## What I want back

1. Two or three rough directions for the grid at 1140px.
2. After I choose: every state above, at 1140px and 390px where it makes sense (at least 1, 2, 3, 4, 11 and 14 at both), plus the error panel.
3. `tokens.css` additions only (a cell state or a behind-by treatment, if you add one), with measured contrast ratios.
4. `NOTES.md` on the brief's §8 template, with exact copy and your answers to the four questions above, answering every open question.
5. Frame HTML per state, saved as `docs/design/pilot/D-7-progress-grid/`.
6. Calm and exact. A teacher should see who needs them in under two seconds, and sign off a row of students without losing their place.
