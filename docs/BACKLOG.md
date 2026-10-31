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
| — | _stage-sheet_ (proposed) | A right-hand stage sheet on the Component tab, where "who ticked each item" comes back | being designed (31 Oct): click a stage to open it; the teacher adds their own note per stage, shown to students alongside the official description, which is never replaced or hidden; the stage's items and who ticked them, added and edited there, so the page's separate item list goes and each stage row shows its item letters. Mockup: `docs/design/pilot/stage-sheet/design/`. Needs a plan |
| — | _student-preview_ (proposed) | In the stage sheet, a switch the teacher turns on and off to see the stage exactly as students do: the official description, the teacher's note, items, checkpoint and prompts (reusing the student's `StageCard`) | idea only: after stage-sheet |

The three features below are built and merged (see **Done**). Their notes stay here as the record of what was asked and answered.

### 1. Source builder (`source-builder`)

**Problem.** Students already record sources in their log (a log entry of kind `SOURCE`, with the fields in `docs/PILOT-DESIGN.md` §6.7, since Phase 3). But the app does nothing with them: when the student writes up, they still type every citation and the reference list by hand, and there's no one place that lists a component's sources.

**What it does.**
- Turns each `SOURCE` entry into an in-text citation and a reference-list entry, shaped like the NCCA's own examples (Biology Appendix 1, Business Appendix Four), with no formal style enforced (FR-29 to FR-31).
- A Sources page per component (`/components/[id]/sources`, roadmap §6) lists them, with Copy citation on each and Copy reference list for all of them.
- The NCCA's example strings are the formatter's test fixtures, reproduced exactly (roadmap 6B, Gate P6). They are read from the PDFs, never written from memory.

**Answered (25 Oct 2026, `docs/intent/source-builder.md`):** a live preview in the source form doubles as the nudge; incomplete sources are saved and flagged, never blocked; sources only, no AI uses; one consistent format per type modelled on the NCCA examples; its own page; hidden sources included; student only, no teacher view; FR-32 not in this feature.

### 2. AI-use record (`ai-use-record`)

**Problem.** Students log AI uses (kind `AI_USE`, since Phase 3), but must still write the reference entry and the report's AI appendix by hand. Roadmap milestone 6A.

**Answered (25 Oct 2026, `docs/intent/ai-use-record.md`):** all three outputs (NCCA in-text citation and reference entry, SEC appendix table); everything on the Sources page with an "AI use" chip per AI entry and an appendix section below; the greyed "AI use" tab removed; four appendix columns, no new field; prompts and share link under each row.

### 3. Date picker drawer (`date-picker-drawer`)

**Problem.** Every date on the Component tab is the browser's own date box, and its calendar is blank: a teacher picks a stage or item date without seeing where it sits among the others. The year view stays empty until the first Save.

**Answered (25 Oct 2026, `docs/intent/date-picker-drawer.md`):** a right-hand drawer with its own reusable calendar component (shadcn Calendar); stage and item dates both; unsaved dates shown, slightly different; picking fills the box and never saves; no holidays; the year view reads the draft too. Next after it: a right-hand stage sheet, where "who ticked each item" comes back.

## From Tim's testing

_To fill in: what came up while using the app by hand._

## Done

| Slug | What | Learning doc |
|---|---|---|
| Phases 1–4 | Foundation, components and timeline, the log, the teacher grid | `docs/PILOT-ROADMAP.md` §1, `docs/changes/` |
| `ready-for-signoff` | The student marks a checkpoint Ready with a note and can withdraw it; the teacher sees a Ready cell, a waiting queue on Progress and a badge per class at `/teach`, and answers Accept or Not yet with a note. Merged into `pilotMain` 25 Oct 2026 | `docs/changes/ready-for-signoff.md` |
| `source-builder` | A Sources tab per component: each logged source as an NCCA-style in-text citation and reference, Copy citation and Copy reference list, and a live preview in the source form. Merged into `pilotMain` 31 Oct 2026 | `docs/changes/source-builder.md` (not written yet) |
| `ai-use-record` | AI uses join the Sources page with an "AI use" chip and citation, plus an SEC Appendix 2 table to copy; the greyed AI use tab is gone. Merged with source-builder, 31 Oct 2026 | `docs/changes/ai-use-record.md` (not written yet) |
| `date-picker-drawer` | Every date on the teacher's Component tab opens a right-hand drawer: the year line over one month, tap then Use this date, typing in the footer, unsaved dates dashed (pack D-11). Merged with source-builder, 31 Oct 2026 | `docs/changes/date-picker-drawer.md` (not written yet) |
| `document-link` | One link per component to wherever the student's report lives, opened by the teacher from the grid and the student's page; the URL is all that's stored (FR-38 to FR-40). Built inside `ready-for-signoff` | `docs/changes/ready-for-signoff.md` |
