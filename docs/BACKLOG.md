# Backlog

The working list for the pilot app since Phases 1–4 were finished (17 Oct 2026). It replaces `docs/PILOT-ROADMAP.md` as the place where new work is tracked. The roadmap is frozen, but its decisions (§2, R1–R28) and its page and API inventories still hold.

**The aim right now:** give teachers and students a reason to use the app that beats doing it by hand. Small features, one at a time, over the next week or two. After that, a new roadmap for the next stage.

## How a feature moves

1. It goes in **Up next** with a slug and a few lines: the problem, what it does, and the open questions.
2. Before building it, a plan must be written. You can also use the skill /interview-me to get a better understanding of what is needed. This is very important aswell.
3. Branch `pilot/<slug>` from `pilotMain`. Test first. `make verify` (and `make e2e` when a journey changes) green before every commit.
4. Write `docs/changes/<slug>.md`, open the PR into `pilotMain`, then move the row to **Done**.

A diff that fits in one sentence skips step 2.

## Up next

| # | Slug | Feature | Status |
|---|---|---|---|
| 1 | `ready-for-signoff` | The student says a checkpoint is ready; the teacher gets a queue | not planned |
| 2 | `document-link` | The student attaches a link to their report; the teacher opens it from the grid | not planned |

### 1. Ready for sign-off (`ready-for-signoff`)

**Problem.** The only way a teacher finds out a student is ready for a checkpoint is by asking, or by scanning the grid. The student has no way to say "I've done this, have a look".

**What it does.**
- On their component page, the student marks a checkpoint **Ready for sign-off**, with an optional short note ("plan's on page 2").
- The teacher's Progress grid shows it as a fourth cell state, next to Not due yet, Due and Signed off. Pack D-7's cells are a word plus a tint, so it fits without a redesign (spec P4-7).
- The teacher sees a queue, *3 students waiting for you*, that opens the students in the order they asked.
- Signing off clears the request.

**Open questions (each with a best guess):**
- Can the student withdraw a request? *Guess: yes, until it's signed off.*
- Can the teacher turn a request down with a reason, rather than just leaving it? *Yes the teacher should be able to leave a note saying why it was turned down, they should aslo be able to leave a note saying they accept it aswell, the note could be stored as a log for the student? It would be easy to trace it in the future?*
- Where does the queue live: on the Progress tab, on `/teach` across every class, or both? *Guess: a count on each class card at `/teach`, and the list at the top of Progress.*


### 2. Link to the student's document (`document-link`)

**Problem.** The work lives in Google Docs, OneDrive or the school's own system. To look at it, a teacher has to go hunting through Classroom or Teams for the right file.

**What it does.**
- The student attaches one link per component: wherever their report actually lives (FR-38).
- The teacher opens it from that student's row on the Progress grid and from the student's page.
- The app never uploads, fetches, mirrors or caches the document (FR-39, and CLAUDE.md's rule against server-side fetching of student links). It stores the URL and nothing else.
- A line reminds the student to keep their own backup (FR-40).

**Open questions (each with a best guess):**
- Any `https` link, or only known hosts (Google, Microsoft, the school's domain)? *Guess: any `https` link, the same rule as log sources.*
- Is the link always visible to the teacher, or can the student hide it the way they hide log entries? *Guess: always visible. Its whole purpose is to be opened by the teacher.*
- Keep the old links when the student changes it? *Guess: yes, as history, the same way log revisions are kept.*
- Should a ready-for-sign-off request be able to point at the link ("see page 2")? *Guess: yes, so build `document-link` first, or at least design the two together.*

## From Tim's testing

_To fill in: what came up while using the app by hand._

## Done

| Slug | What | Learning doc |
|---|---|---|
| Phases 1–4 | Foundation, components and timeline, the log, the teacher grid | `docs/PILOT-ROADMAP.md` §1, `docs/changes/` |
