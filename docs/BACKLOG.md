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
| 1 | `source-builder` | The student's sources become a copyable in-text citation and reference list | built on `pilot/source-builder`, not merged: self-review, changes doc and PR still to do (plan: docs/superpowers/plans/2026-10-25-source-builder.md) |
| 2 | `ai-use-record` | The student's AI uses become a reference entry and the report's AI appendix block | idea: check the fields against the SEC's Coursework Rules and Procedures first (`docs/PILOT-DESIGN.md` §6.7) |

### 1. Source builder (`source-builder`)

**Problem.** Students already record sources in their log (a log entry of kind `SOURCE`, with the fields in `docs/PILOT-DESIGN.md` §6.7, since Phase 3). But the app does nothing with them: when the student writes up, they still type every citation and the reference list by hand, and there's no one place that lists a component's sources.

**What it does.**
- Turns each `SOURCE` entry into an in-text citation and a reference-list entry, shaped like the NCCA's own examples (Biology Appendix 1, Business Appendix Four), with no formal style enforced (FR-29 to FR-31).
- A Sources page per component (`/components/[id]/sources`, roadmap §6) lists them, with Copy citation on each and Copy reference list for all of them.
- The NCCA's example strings are the formatter's test fixtures, reproduced exactly (roadmap 6B, Gate P6). They are read from the PDFs, never written from memory.

**Answered (25 Oct 2026, `docs/intent/source-builder.md`):** a live preview in the source form doubles as the nudge; incomplete sources are saved and flagged, never blocked; sources only, no AI uses; one consistent format per type modelled on the NCCA examples; its own page; hidden sources included; student only, no teacher view; FR-32 not in this feature.

### 2. AI-use record (`ai-use-record`)

**Problem.** Students log AI uses (kind `AI_USE`, since Phase 3), but must still write the reference entry and the report's AI appendix by hand. Roadmap milestone 6A.

**Before planning:** the `AI_USE` fields are already paired with SEC-RULES p. 34 in `LogFieldSourcesTest`; what's left to read is the shape of the appendix block the SEC wants in the report. Reuses the source builder's formatter pattern and Sources page.

## From Tim's testing

_To fill in: what came up while using the app by hand._

## Done

| Slug | What | Learning doc |
|---|---|---|
| Phases 1–4 | Foundation, components and timeline, the log, the teacher grid | `docs/PILOT-ROADMAP.md` §1, `docs/changes/` |
| `ready-for-signoff` | The student marks a checkpoint Ready with a note and can withdraw it; the teacher sees a Ready cell, a waiting queue on Progress and a badge per class at `/teach`, and answers Accept or Not yet with a note. Merged into `pilotMain` 25 Oct 2026 | `docs/changes/ready-for-signoff.md` |
| `document-link` | One link per component to wherever the student's report lives, opened by the teacher from the grid and the student's page; the URL is all that's stored (FR-38 to FR-40). Built inside `ready-for-signoff` | `docs/changes/ready-for-signoff.md` |
