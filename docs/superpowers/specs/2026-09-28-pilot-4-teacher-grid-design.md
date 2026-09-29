# Pilot 4 — the teacher grid and sign-offs — design

**Date:** 28 Sep 2026 · **Slug:** `pilot-4-teacher-grid` · **Branch:** `pilot/4-teacher-grid` from `pilotMain` · **Plan:** `docs/superpowers/plans/2026-09-28-pilot-4-teacher-grid.md` (next) · **Changes doc:** `docs/changes/pilot-4-teacher-grid.md`

Agreed with Tim in a brainstorming session on 28 Sep 2026 (no separate intent file; the decisions below are the record). Implements roadmap §8.4 (4A and 4B) and Gate P4 (`docs/PILOT-ROADMAP.md`), design §6.5, §7.3 and §8.4 (`docs/PILOT-DESIGN.md`). **Built straight to design pack D-7** (`docs/design/pilot/D-7-progress-grid/`, direction 1b "Bands"), which arrived the same day, before any Phase 4 code. Its `NOTES.md` has the exact copy; this spec doesn't repeat it except where a decision depends on it.

**Goal:** a teacher opens a class's Progress tab and sees who is behind, grouped into bands ("3 checkpoints behind", …, "Up to date"), furthest behind first. They sign checkpoints off, undo a stray click, and revoke a mistaken sign-off, from the grid and from one student's page. The student sees the sign-off on their component page. A "Hide names" switch makes the page safe to project.

---

## Decisions made

| # | Question | Decision |
|---|---|---|
| P4-1 | What does this plan cover? | **Phase 4 only** (4A grid, 4B sign-offs), plus a seed script for the 30 × 7 timing check and one small wording fix from Phase 3 (P4-2). The go-live jobs Gate P4's third box names (roadmap §9: backups tested, monitoring, onboarding runbook, erasure procedure…) get **their own readiness plan** afterwards. |
| P4-2 | Phase 3 question (a): a hidden entry shows the teacher more than the student is told. | **Change the student-facing wording to say everything the teacher sees.** No change to what the API sends. |
| P4-3 | Phase 3 question (b): a wrong value in well-formed JSON is now `VALIDATION_FAILED` with a `fieldErrors` entry, not `MALFORMED_REQUEST`, on every endpoint. | **Keep it.** Recorded as answered in the roadmap and handoff. Nothing in the frontend reads `MALFORMED_REQUEST`. |
| P4-4 | Undo after Hide/Show on the log (left out of the D-6 restyle). | **Not built.** Stays out. |
| P4-5 | May a teacher sign off a checkpoint before its stage date? | **Yes.** A student can be early; a signed-off checkpoint is never counted as behind. Also works when a stage has no date. (D-7 open question 4.) |
| P4-6 | Endpoint shape for sign off and revoke. | **One idempotent `PUT` per cell**, copying the tick endpoint: `PUT /components/{id}/students/{studentId}/checkpoints/{checkpointId}/signoff` with `{ "signedOff": true \| false }`. Replaces the roadmap sketch's `POST …/signoffs` + `POST /signoffs/{id}/revoke`, whose revoke path has no component in it and so can't go through `ComponentService` first (CLAUDE.md), and whose create turns a double-click into an error. |
| P4-7 | Should the grid show that a student has ticked something the teacher hasn't signed off? | **Not in Phase 4.** Students don't tick checkpoints; they tick the teacher's own items, a different thing. A student-side **"Ready for sign-off"** on each checkpoint, shown on the grid as a fourth cell state, is **the first thing in the next plan, before Phase 5**; Tim considers it essential. Recorded in roadmap §8.4. D-7's cells are a word plus a tint, so a fourth state fits without a redesign. |
| P4-8 | Where does the code live? | **Sign-off storage in `components`** (the student view reads it; design §6.5 pairs it with `item_tick`). **The grid, the one-student view, the rules and the endpoints in a new `progress` package**, which reads `components` and `log`. `log` already depends on `components`, so putting the grid in `components` would make the two depend on each other. |
| P4-9 | Does "days since last log entry" count hidden entries and edits? | **Yes, both.** It's the newest `log_entry_revision.created_at` across the student's entries in the component. The teacher already sees a hidden entry's existence and dates (Q3), so this reveals nothing new. D-7 agrees ("It counts private entries"). |
| P4-10 | How does the teacher's one-student page get its checkpoints? | **Its own endpoint**, `GET /components/{id}/students/{studentId}/checkpoints`, because D-7 shows each checkpoint's revoked sign-offs there ("Signed off on 10 Dec 2026, revoked on 12 Dec 2026 by Katelyn Hanlon") and the grid returns only live ones. *Changed from "reuse the grid endpoint" once the pack arrived.* |
| P4-11 | After a sign-off the order changes. Does the row move? | **No, until the teacher asks.** Rows and bands are fixed at load. After any change a **Re-sort (N changes)** button appears; pressing it (or reloading) re-sorts and regroups. A row's own "Behind by" updates at once. (D-7.) |
| P4-12 | Only approved students? | **Yes.** Pending requests stay on the Students tab. A removed student's sign-offs are kept, not shown, and can't be changed (404). |
| P4-13 | Build plain first, then restyle from D-7? | **No: build straight to D-7.** The pack arrived before any Phase 4 code; building twice would waste the frontend work. No restyle task. |
| P4-14 | Page width (D-7 open question 6). | **Header and tabs stay at the class pages' 880px; only the grid breaks out** to the full 1084px at laptop width. Tabs don't jump between class tabs. |
| P4-15 | Where is "Hide names" remembered? (D-7 said `localStorage`.) | **A cookie** (`app_hide_names=1`, path `/`, `SameSite=Lax`, a year). The page is server-rendered; the server can't read `localStorage`, so names would show on every load before the blur applied, which is the moment a projector shows them. The switch sets the cookie and toggles the blur at once; the server reads it and renders already blurred. |
| P4-16 | What does Hide names blur? (D-7 open question 8.) | **Names, sign-off dates, log lines, and the counts:** both numbers of the answer line ("14 of 30 students are behind") and each band heading's "N students". The band label ("3 checkpoints behind", "Up to date"), cell states and buttons stay readable so the teacher can keep working. Visual only (`filter: blur(var(--app-hide-blur))`); accessible names are unchanged. |
| P4-17 | Undo (D-7 open questions 2 and 3). | **Undo is a revoke**: it sends `{ "signedOff": false }`, writes a revoked record and a revoke audit event. It appears in a cell signed off in this page visit and **lasts until Re-sort or reload**, not on a timer (WCAG 2.2.1; the D-6 log's 5-second undo isn't built, P4-4). |
| P4-18 | Accessible names (D-7 open question 1). | **As D-7 proposes, with its improvement:** `link "Progress"` (`aria-current="page"`) in `nav "Class sections"`; **Sign off {checkpoint} for {student}**; **Undo sign-off of {checkpoint} for {student}**; **Revoke sign-off of {checkpoint} for {student}** (opens the strip); in the strip **Revoke sign-off of … for …** and **Keep sign-off of … for …** with short visible labels "Revoke" / "Keep sign-off"; **Re-sort (N changes)**; `switch "Hide names"`; picker links "All stages" and "Stage 3, Plan discussed, 11 Dec 2026, due". |
| P4-19 | Picker buttons at 390 have 6px gaps (D-7 open question 5). | **Accept 6px** for this picker (each target is at least 44 × 48); recorded as an exception in `UI-STANDARDS.md` §6. |
| P4-20 | Outline-button borders are 1.31:1, under WCAG 1.4.11's 3:1 (D-7 open question 7). | **Not in Phase 4.** App-wide since D-1; recorded in `HANDOFF.md` as a follow-up. |
| P4-21 | Roadmap §6.2 changes D-7 flags (open question 9). | **Accepted:** the `?stage=` view, Re-sort, Undo, and Checkpoints above the Log on the student page. Written into §6.2 first. |
| P4-22 | Business Stage 6 has no checkpoint. | **No table column** (30 empty cells would be noise and 30 blanks to a screen reader); it appears in the stage picker as a dashed, non-interactive "Stage 6 · No checkpoint · Nothing to sign off". The API still returns the stage with `checkpoint: null`. (D-7.) |

---

## 4A. Data and rules

### Migration `V12__checkpoint_signoffs.sql`

```sql
CREATE TABLE checkpoint_signoff (
    id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id           uuid        NOT NULL REFERENCES component_instance (id),
    student_user_id       uuid        NOT NULL REFERENCES app_user (id),
    checkpoint_id         uuid        NOT NULL REFERENCES template_checkpoint (id),
    signed_off_by_user_id uuid        NOT NULL REFERENCES app_user (id),
    signed_off_at         timestamptz NOT NULL,
    revoked_by_user_id    uuid        REFERENCES app_user (id),
    revoked_at            timestamptz,
    CONSTRAINT checkpoint_signoff_revoked_together CHECK ((revoked_by_user_id IS NULL) = (revoked_at IS NULL))
);
CREATE UNIQUE INDEX checkpoint_signoff_current
    ON checkpoint_signoff (instance_id, student_user_id, checkpoint_id) WHERE revoked_at IS NULL;
```

- **Never deleted.** A trigger raises `check_violation` on `DELETE`, and on any `UPDATE` other than setting `revoked_by_user_id` and `revoked_at` from null (once). Row triggers don't fire on `TRUNCATE`, so the test reset is unaffected (as `V11`).
- **Signing off again after a revoke or undo adds a new row**, so a mistake and its correction both stay on record.
- **Keyed on student and component, not enrolment** (design §6.5, review issue #3), as `item_tick` and `log_entry` are.
- An app table, truncated before each test; it references the content table `template_checkpoint`, as `instance_stage_date` references `template_stage`. A foreign key proves the checkpoint exists, not that it's this component's; the service's check 3 (below) does that.

### Audit

`AuditEventType` gains `CHECKPOINT_SIGNED_OFF` and `CHECKPOINT_SIGNOFF_REVOKED` (Undo writes the latter). Subject: the sign-off row; details: component, student and checkpoint ids. Written only when a row actually changed, inside the same transaction.

### Rules (`CheckpointState`, `progress/domain/`, no Spring)

- `CheckpointState` gains `SIGNED_OFF`: `at(stageDate, today, signedOff)` is `SIGNED_OFF` when signed off, else `DUE` when the stage date is strictly before today, else `NOT_DUE` (including no date). The existing two-argument form's callers move to the new one.
- **Behind by N** = the number of `DUE` cells.
- **Order:** `behindBy` descending; then days since last log activity descending, with "no entries yet" first; then surname, then first name, compared with an `en-IE` `Collator` (D-7 sorts with `localeCompare`, `en-IE`). One `Comparator`, unit-tested on its own.
- **Days since last log activity** = `DublinDate.today(clock)` minus `DublinDate.of(latest activity)`; null when there is none.
- **Date-boundary tests** pin the clock across a Dublin midnight in summer time (23:30 UTC on 20 Oct is 21 Oct in Dublin: a stage dated 20 Oct is due) and in winter time (roadmap §8.4 asks for these).

### Code changes outside `progress`

- `TemplateCheckpoint` gains `id` (the column exists; the record didn't need it until now). `TemplateRepository` gains a lookup of one checkpoint by id **within a template version**.
- `components/adapter/persistence/SignoffRepository`: live sign-offs for a component; all sign-offs (live and revoked, with the revoker's name) for one student in a component; `signOff(…)` as `INSERT … ON CONFLICT (instance_id, student_user_id, checkpoint_id) WHERE revoked_at IS NULL DO NOTHING` (the `EnrolmentRepository.request` mechanism, ARCHITECTURE §5); `revoke(…)` updating the live row.
- `LogRepository.lastActivity(componentId)`: `Map<studentId, Instant>` of the newest revision time per student.

## Endpoints

All three start with `ComponentService.requireOwned(actor, componentId)`; anything out of scope is `NOT_FOUND`.

### The grid: `GET /components/{id}/progress`

Built from a fixed number of queries (approved members, stages and checkpoints, stage dates, live sign-offs, last activity), never one per student; the rules run in Java over the results.

```json
{
  "componentId": "…", "classId": "…", "className": "6A Biology", "today": "2026-11-24",
  "stages": [
    { "stageId": "…", "label": "Stage 3", "name": "Designing and Planning the Experiment", "dueDate": "2026-11-20",
      "checkpoint": { "id": "…", "text": "Plan discussed with the teacher (feasibility and safety)" } }
  ],
  "students": [
    { "studentId": "…", "firstName": "Aoife", "lastName": "Byrne",
      "behindBy": 2, "lastLogActivityOn": "2026-11-03", "daysSinceLastLogActivity": 21,
      "cells": [ { "checkpointId": "…", "state": "SIGNED_OFF", "signedOffOn": "2026-11-12" } ] }
  ]
}
```

- `stages` lists every stage in order, with `checkpoint: null` where there's nothing to sign off (Business Stage 6), the same shape as the student view. `cells` has one entry per checkpoint, in stage order.
- `students` is sorted by the rule above. Only `APPROVED` members. The frontend groups them into bands by `behindBy`.
- `today` is the server's Dublin date (ARCHITECTURE §10); the page never uses the browser's clock. Dates are Dublin calendar dates, converted on the server as `doneOn` is.

### One student: `GET /components/{id}/students/{studentId}/checkpoints`

Check 2 below (approved in the class) after `requireOwned`.

```json
{
  "studentId": "…", "firstName": "Cian", "lastName": "Murphy", "today": "2026-12-14",
  "behindBy": 1, "lastLogActivityOn": "2026-11-30", "daysSinceLastLogActivity": 14,
  "stages": [
    { "stageId": "…", "label": "Stage 2", "name": "Background Research", "dueDate": "2026-12-01",
      "checkpoint": { "id": "…", "text": "Investigative log shared with the teacher" },
      "state": "DUE", "signedOffOn": null,
      "history": [ { "signedOffOn": "2026-12-10", "revokedOn": "2026-12-12", "revokedBy": "Katelyn Hanlon" } ] }
  ]
}
```

`history` lists revoked sign-offs only, newest first. `revokedBy` is the revoking teacher's first and last name.

### Sign off, undo and revoke: `PUT /components/{componentId}/students/{studentId}/checkpoints/{checkpointId}/signoff`

Body `{ "signedOff": boolean }` (required; missing is `VALIDATION_FAILED`). Three checks, in order; any failure is `NOT_FOUND`:

1. `ComponentService.requireOwned(actor, componentId)`.
2. The student is `APPROVED` in the component's class (looked up within the class, never by student id alone).
3. The checkpoint belongs to the component's brief's template version.

Then:

- **`true`:** insert with `ON CONFLICT … DO NOTHING`. Already signed off → unchanged, no audit.
- **`false`** (Undo and Revoke alike): set `revoked_by_user_id`, `revoked_at` on the live row. Nothing live → unchanged, no audit.
- **Response:** the cell, `{ "checkpointId", "state", "signedOffOn" }`, computed with the same rule as the grid.

### What the student sees

`ComponentService.studentView` reads the student's live sign-offs. `CheckpointView` becomes `{ text, state, signedOffOn }` with `state` one of `NOT_DUE`, `DUE`, `SIGNED_OFF`; `checkpointStateSchema` adds `"SIGNED_OFF"`. The stage card's new state is D-7's: ground `--app-done-ground`, a 3px green left edge, "Checkpoint · Signed off", the checkpoint text, then "Your teacher signed this off on 21 Jan 2027." The amber "Bring it up in your next class." nudge doesn't show for it.

---

## Pages (built to D-7)

**Tokens first:** D-7's `tokens.css` additions go into `globals.css` as `--app-*` (`--app-due`, `--app-due-tint`, `--app-due-row`, `--app-signed`, `--app-signed-recent`, `--text-app-behind`, `--app-hide-blur`), aliases where the pack says so.

### The Progress tab goes live

`ClassHeader` gets a `progress` tab linking to `/teach/classes/[id]/progress`, `aria-current="page"` when current. `class-header.spec.tsx` asserts today that Progress is **not** a link: that assertion changes in its own commit first, naming pack D-7 (roadmap §6.3 rule 3).

### `/teach/classes/[id]/progress`

Server page on the app pattern (ARCHITECTURE §6): `classDetail` first; no `componentId` → D-7's "Nothing to track yet." card with **Go to the Component tab**; otherwise `GET /progress` in `attempt()` and `ErrorPanel` on failure. The server also reads `?stage=` and the Hide names cookie and passes both down, so the first paint is already right.

- **Answer line** (`h2`, e.g. "14 of 30 students are behind") and its sub-line; **Hide names** switch and, after changes, **Re-sort (N changes)** beside it.
- **Stage picker** (`nav "Checkpoint view"`, plain links with `aria-current`): **All stages** and one card per stage with a checkpoint, in the URL as `?stage=all|1…6|R`. Business Stage 6 is a dashed, non-interactive item (P4-22).
- **1140: one `<table>`**, `table-layout: fixed`, visually hidden `<caption>`, a `<tbody>` per band opened by a `th scope="rowgroup"` (amber numeral, "checkpoints behind", "· N students"; the last band "Up to date" in ink), `th scope="row"` per student (name linking to their page), a log column ("Last entry 12 days ago", "Last entry yesterday", "Last entry today", "No entries yet"; ink and 600 weight at 14 days or more, never amber), and one column per checkpoint whose short header links to that stage's view. The grid breaks out of the 880px column to 1084px (P4-14) and scrolls inside its own card if it must.
- **390: a `<ul>` per band** under `h3` headings, never a table (UI-STANDARDS §3). In a one-stage view each row carries its action; in All each row lists what's missing ("Not signed off: Stages 2 and 3").
- **Default stage differs by width:** All at 1140, the latest due stage at 390. Both layouts are server-rendered and CSS shows one per breakpoint (the year view's precedent, no hydration mismatch); an explicit `?stage=` applies to both.
- **Cells** through a shared `SignoffControl`: "Due" / "Not due yet" with **Sign off**; "Signed off" with its date and **Revoke** (in the one-stage view and the student page); "Signed off today" with **Undo** when signed off in this visit (P4-17); "Signing off…" while busy. Revoke opens D-2's in-place strip with D-7's sentence and **Revoke** / **Keep sign-off**. A failure shows D-1's compact alert under the row with **Try again**, the cell unchanged.
- **Stable order and Re-sort** (P4-11): `ProgressGrid` keeps the band membership and order it was rendered with, and lays each refreshed payload out in that order; it counts changes since load; Re-sort adopts the server's current order and clears Undo.
- **Live region** sentences exactly as D-7's NOTES.
- **Hide names** (P4-15, P4-16): D-6's switch; toggling sets the cookie and a class on the grid's wrapper that blurs names, dates, log lines and the counts.
- **States**, copy from D-7: nothing due yet (grid shown below a card about early sign-offs); no stage dates (card and **Go to the Component tab**, "No date set" in the picker); no approved students (**Go to the Students tab**); everyone up to date; failed load (shared `ErrorPanel`).

### `/teach/classes/[id]/students/[studentId]` (the Phase 3 page)

Loads `GET …/checkpoints` beside the existing log call. A **Checkpoints** section sits **above** the Log: `h2` with the behind-by treatment, then one row per stage with a checkpoint (stage, date, state; the full text; the action through `SignoffControl`), each revoked sign-off shown under its text ("Signed off on 10 Dec 2026, revoked on 12 Dec 2026 by Katelyn Hanlon."). The Log section's heading gains "Last entry 14 days ago." Back links become `nav "Back to class"` with "6A Biology, Progress" first and "6A Biology, Students" second.

### Hidden-entry wording (P4-2)

`visibilityLine(false, today, kind)` in `frontend/lib/app/log.ts` becomes, for a note:

> Only you can read this. Your teacher sees that you made a note on 3 March, how many times you edit it and when, and the date you hid it, but never what it says.

"a note" is "a source" or "an AI use entry" for the other kinds. The teacher page's subtitle ("Any they keep private show only the kind and date.") is corrected to match what it shows. `log.test.ts` and the form spec change with it.

---

## Tests

- **Domain:** `CheckpointState` with the sign-off argument; behind-by counting; the comparator (including `en-IE` collation); days since activity; the Dublin boundary cases.
- **Migration:** a delete is refused; a second revoke is refused; changing any other column is refused; a second live sign-off for the same student and checkpoint is refused; a new one after a revoke is allowed.
- **Repositories** against Postgres: `SignoffRepository` (including `ON CONFLICT` returning without a second row, and history with the revoker's name), `LogRepository.lastActivity` (hidden entries and revisions count), the checkpoint-in-version lookup.
- **HTTP** through `ApiSession`: the grid's shape and order with a realistic spread; the one-student view with history; sign off, undo/revoke, idempotent repeats, audit rows written once; the student view's `SIGNED_OFF` and date.
- **`SignoffScopeTest`** for all three endpoints: anonymous 401; teacher of another class, the student themself, another student, a school leader → 404; a pending or removed student's id → 404; for the `PUT`, a checkpoint from another subject's template → 404. **Bite test:** remove check 2 and then check 3, watch each case fail, restore.
- **Frontend (Vitest, by role and accessible name):** `ProgressGrid` (bands, stable order after a change, Re-sort count and reset, Undo shown only for this visit's sign-offs, the live-region sentence, the alert and Try again, Hide names toggling the cookie and the blur class), `SignoffControl` (each state, the revoke strip with its full names), the stage picker (links and `aria-current`), the student page's Checkpoints section with history, the stage card's new state, the header's Progress link. **`node:test`** for pure helpers: banding, "Last entry …" wording, the answer line and sub-line, "Not signed off: Stages 2 and 3".
- **e2e** `e2e/phase4.e2e.ts` on `laptop` and `phone`, axe on the Progress page (All and a one-stage view) and the updated student page: two approved students, Stage 1 dated in the past; the teacher signs off the Stage 1 checkpoint of the student at the top (behind by 1); after Re-sort that student is in "Up to date", below the other (the grid lists furthest behind first, so the roadmap's "moves up the grid" is corrected to "moves down" in §8.4); Revoke puts them back on top; the student's component page shows "Your teacher signed this off on …"; Hide names blurs and survives a reload.

## Seed script and timing (Gate P4 box 2)

`scripts/seed-grid.mjs` (Node, `fetch`, cookie jar and CSRF header) builds a 30-student Biology class **through the public API only**: a teacher signs in, creates a class and a component, sets stage dates with some in the past; 30 students sign up with the join code; the teacher approves them and signs off a realistic spread. It then times the Progress page through the proxy (first and repeated load) and prints the result. Works against local and against the deployed stack without database access. The teacher account comes from the operator CLI beforehand, as in `scripts/e2e.sh`. Tim runs it against Render/Vercel for the gate.

## Order of work on `pilot/4-teacher-grid`

1. Roadmap §6.2 updated with D-7's behaviour changes (P4-21); the pack committed in its folder.
2. The hidden-entry wording fix (P4-2).
3. `V12` and its guard tests; audit event types.
4. Domain rules and their tests.
5. `TemplateCheckpoint.id`, `SignoffRepository`, `LogRepository.lastActivity`.
6. The grid endpoint; the one-student endpoint; the sign-off endpoint; `SignoffScopeTest` and its bite test.
7. The student view's `SIGNED_OFF`; schema and the stage card's new state.
8. D-7 tokens; frontend schemas and pure helpers; the Progress tab spec change (own commit); `SignoffControl`; the stage picker; `ProgressGrid` with Re-sort, Undo and Hide names; the Progress page; the student page's Checkpoints section.
9. e2e journey.
10. Seed script.
11. `UI-CHECKLIST.md` walk, screenshots at 390 and 1140 against the export, gate, docs and hand-over.

## Docs kept true, in the same commits

- `docs/ARCHITECTURE.md` §4 (the three sign-off checks), §5 (`V12`, its guard, the `progress` package), §6 (the Progress page, the Hide names cookie, both layouts rendered and CSS choosing).
- `CLAUDE.md` backend conventions: a sign-off is only reached through `ComponentService.requireOwned`, an approved-student check within the class, and a checkpoint looked up within the brief's template version.
- `docs/PILOT-ROADMAP.md`: §1 status board; §3 and §8.3 Phase 3 questions (a) and (b) marked answered; §6.2 Progress and student-view rows (P4-21); §6.3 D-7 marked arrived; §7 Phase 4 endpoint row rewritten (P4-6, P4-10); §8.4 status, Gate P4's "moves up the grid" corrected to "moves down", and "student says ready" recorded as the next plan's first item.
- `docs/design/UI-STANDARDS.md` §6: the picker's 6px exception (P4-19); anything else the build teaches.
- `docs/HANDOFF.md` at the end of each session, including the button-border contrast follow-up (P4-20).

## Gate P4 (roadmap §8.4, as extended here)

- [ ] `make verify` and `make e2e` green; the journey signs off (the student moves down after Re-sort, being less behind), revokes (back on top), shows the state on the student's page, and keeps Hide names across a reload
- [ ] `SignoffScopeTest` passes with its bite test
- [ ] The seed script's 30 × 7 class loads its Progress page in under a second on the deployed stack (Tim runs it)
- [ ] Every "before go-live" readiness item is done or explicitly accepted by Tim — **tracked by the separate readiness plan (P4-1)**, not by this branch
- [ ] `/self-review` in a fresh session; `docs/changes/pilot-4-teacher-grid.md` committed on the branch

## Out of scope

- **"Ready for sign-off" from the student**: next plan, first item (P4-7).
- The go-live readiness jobs (P4-1): their own plan.
- Undo after Hide/Show on the log (P4-4).
- Outline-button border contrast, app-wide (P4-20).
- The school leader view (Phase 5) and its on-track threshold (Q2).
- Showing teacher-item ticks on the grid: the grid is the teacher's own record.
- Carried over and unchanged: Sign in disabled during a lockout; phone rows wrapping their buttons on the Students tab; prompts open by default at 1140; Phase 2's human content reviews; `source_url`.

## Risks

- **Hide names is visual only.** Names stay in the page and in accessible names; it protects a projected screen, not the data. The cookie is per browser, so a shared staffroom PC keeps the last teacher's choice (acceptable: the safer state is sticky).
- **Two layouts in the DOM.** Rendering both and letting CSS choose doubles the rows in the HTML and puts duplicate controls in jsdom; component specs scope their queries to one layout's container. Playwright ignores the hidden layout.
- **Checkpoint wording isn't reviewed yet** (Gate P2's open content review, Q1). Sign-offs reference checkpoint ids, not text, so a later text correction doesn't disturb them; a structural change needs a new template version, which the grid would need to handle then.
- **Timing depends on the free Render tier** (cold starts). The gate measures a warm request; the script reports both.
