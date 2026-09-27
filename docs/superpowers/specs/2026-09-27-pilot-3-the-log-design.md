# Pilot 3 — Phase 2 follow-ups, then the log — design

**Date:** 27 Sep 2026 · **Slug:** `pilot-3-the-log` · **Intent:** `docs/intent/pilot-3-the-log.md` (confirmed) · **Plan:** `docs/superpowers/plans/2026-09-27-pilot-3-the-log.md` (next)

One plan in two parts on two branches, built in order:

| Part | Branch | Changes doc | Gate |
|---|---|---|---|
| **A — Phase 2 follow-ups** | `pilot/2g-phase2-follow-ups` from `pilotMain` | `docs/changes/pilot-2g-phase2-follow-ups.md` | Part A gate (§A7) |
| **B — Phase 3, the log** | `pilot/3-the-log` from `pilotMain` *after* Part A merges | `docs/changes/pilot-3-the-log.md` | Gate P3 (roadmap §8.3) |

Each part gets its own `/self-review` in a fresh session and its own changes doc. Part B does not start until Part A is merged, so the log's forms inherit Part A's busy-label and focus patterns.

---

## Part A — Phase 2 follow-ups

### A1. SEC completion date on the student timeline (Q-P2-E)

- `TimelineRepository.between` gains a fourth `UNION ALL` branch, kind `'COMPLETION'`: `annual_brief.completion_date` reached through `component_instance.annual_brief_id`, for the student's `APPROVED` enrolments, filtered to `[from, to]`. Title is the brief's title; subject and class columns filled as for `STAGE`.
- Ordering: on a shared day the completion date sorts first (`kind_order` 0), since it's the hard deadline; existing kinds keep their relative order.
- Frontend: `timelineEntrySchema.kind` adds `"COMPLETION"`. `TimelineView` gives it the filled-square marker the D-4 tokens already share between completion and stage dates, the word "SEC completion date", and the subject edge bar.
- Docs: plan 2F's P2-44 row is marked changed by Q-P2-E; `ARCHITECTURE.md` §5's timeline bullet names four branches.

### A2. `done_at` on ticks

- No migration: `item_tick.done_at` exists (`V9`) and isn't read.
- `ItemTickRepository.doneItems` returns each ticked item's `done_at`. `StudentItemView` keeps `done` and adds `doneOn` (`LocalDate`, nullable), converted to the Europe/Dublin date on the server — the same rule as the view's `today`.
- `studentItemSchema` adds `doneOn: z.string().nullable()`. `ItemTick` renders "You ticked this · 2 Oct 2026" (D-3's line).

### A3. `TeacherItems` lost draft

- Cause: `run()` (`components/app/teacher-items.tsx`) clears **both** `editing` and `retiring` after any successful action, so retiring item B discards an unsaved edit of item A.
- Fix: each action clears only its own state. Retire clears `retiring`, and clears `editing` only when the retired item is the one being edited.
- Spec first: open A for editing, change its text, retire B, and A's form still holds the changed text.

### A4. Busy labels on submit

- Each of the 12 client components that set `busy` changes its submit label inline while busy (`{busy ? "Signing in…" : "Sign in"}`), present participle, matching its own verb. Each spec asserts the busy accessible name.
- Considered and rejected: a `<SubmitButton busyLabel>` wrapper. The forms use different `Button` variants and sizes, so it would mostly pass props through; twelve explicit ternaries are easier to review.

### A5. Failed submit focuses the alert

- `ErrorPanel` becomes a client component with an optional `focus` prop. With it, the panel renders `tabIndex={-1}` and focuses itself on mount and whenever a new `error` object arrives.
- Client forms pass `focus`. Server pages rendering a load failure do not: after a navigation, focus belongs to the main content (`UI-STANDARDS.md` §105).
- Specs: for each form, a rejected submit leaves `document.activeElement` on the alert.

### A6. `ComponentService.owned`'s two checks, isolated

- Real data can't fail only one check: `ComponentRepository.findOwned` and `ClassService.owned` both filter by the class owner. So this is a service-level unit test with stubbed collaborators: (1) `findOwned` returns the component and `classes.owned` throws `NOT_FOUND` → the call is `NOT_FOUND`; (2) `findOwned` is empty and `classes.owned` would pass → `NOT_FOUND`.
- Bite test for each: remove that check, watch its case fail, restore.

### A7. Part A gate

- [ ] `make verify` green
- [ ] `make e2e` green on `laptop` and `phone`, axe clean; the journey asserts the completion-date row on `/home` and the dated tick line
- [ ] `/self-review` in a fresh session; findings fixed or recorded
- [ ] `docs/changes/pilot-2g-phase2-follow-ups.md` committed on the branch; merged into `pilotMain`

---

## Part B — Phase 3, the log

### Decisions made (design stage)

| Question | Decision |
|---|---|
| Which kinds does Phase 3 create? | `NOTE`, `SOURCE` and `AI_USE` — all three. |
| Where do `AI_USE`'s fields come from? | SEC Coursework Rules and Procedures **2025–2026**, Appendix 2 §4 "Minimum acknowledgment requirements", p. 34. They match design §6.7 exactly, which answers Q6's field question. |
| How are per-kind fields stored? | One `fields jsonb` column, validated against one sealed Java record per kind (approach A). Rejected: a typed table per kind (joins on every read, a migration per field, contradicts design §6.6); browser-only validation. |
| Hidden, edited while hidden, then shown again — what does the teacher see? | **Everything.** Visibility is per entry, not per revision (design §6.6; FR-24e's line is about the entry). |
| Removed student? | Removal changes access, nothing is deleted. A removed student can't read or write the log (the existing `findForApprovedStudent` rule); the teacher view lists approved students only. Not treated as a feature: no re-approval test, no UI for it. |
| Audit events for the log? | None. Design §9's audit list doesn't include it; `log_visibility_change` is its own trail; audit details never hold student text. |
| R2 monitoring | Out of this plan; its roadmap row moves to "before go-live". |

### 3A. Log model

New feature package `ie.coursework.log` (`domain`, `application`, `adapter.persistence`, `adapter.web`). Migration `V11__log.sql`.

```sql
log_entry             (id uuid PK, instance_id → component_instance, student_user_id → app_user,
                       kind text CHECK IN ('NOTE','SOURCE','AI_USE'),
                       created_at timestamptz, visible_to_teacher boolean DEFAULT true,
                       current_revision int)
log_entry_revision    (entry_id → log_entry, revision_no int, body text, fields jsonb,
                       created_at timestamptz, PRIMARY KEY (entry_id, revision_no))
log_visibility_change (entry_id → log_entry, visible boolean, changed_at timestamptz)
```

- **Keyed on student and component**, not enrolment — the `item_tick` choice (review issue #3): enrolment ids can be re-created.
- **Index** `(instance_id, student_user_id, created_at DESC)` for the list.
- **Append-only, enforced in Postgres.** Triggers raise `check_violation` on any `UPDATE` or `DELETE` of `log_entry_revision` or `log_visibility_change`, and on any change to `log_entry` other than `visible_to_teacher` and `current_revision`. Row triggers don't fire on `TRUNCATE`, so `PostgresIntegrationTest`'s reset is unaffected.
- **Server-set time only.** Every timestamp is `Timestamps.utc(clock.instant())`. No request record has a `createdAt`; one sent by a client is ignored.
- **Kind is fixed at creation**; a revision's `fields` must match the entry's kind.

**Per-kind content** (`sealed interface EntryFields permits NoFields, SourceFields, AiUseFields`, in `log/domain/`, no Spring):

| Kind | Required | Optional | Source |
|---|---|---|---|
| `NOTE` | `body` | — | — |
| `SOURCE` | `type`; `title`; for the three online types also `url` and `dateAccessed` | `author`, `publication`, `datePublished` (free text), `locator`, `keyInformation`, `relevance`, `reflections`, `body` | NCCA-BIO p. 15–16; NCCA-BUS p. 19 (Appendix Three) and p. 21 |
| `AI_USE` | `toolNameAndVersion`, `developer`, `dateGenerated`, `howUsed` | `prompts`, `shareUrl`, `body` | SEC-RULES p. 34 |

- `SourceType`: `BOOK`, `NEWSPAPER_OR_MAGAZINE`, `ONLINE_TEXT_OR_IMAGE`, `ONLINE_AUDIO`, `ONLINE_VIDEO`, `OTHER`. The first five are the NCCA's own example headings (NCCA-BIO p. 15–16); `OTHER` is the app's catch-all for the journals, reports and organisations the appendix also lists.
- `datePublished` is free text because the NCCA's own examples range from "2013" to "date written not available".
- **Length caps** (app limits, not SEC content): `body` ≤ 4,000 characters; each short field ≤ 500; `prompts` ≤ 4,000.
- **Links**: `url` and `shareUrl` must be absolute `https` URLs with a host, else `VALIDATION_FAILED`. Stored, rendered with `rel="noopener noreferrer"`, never fetched (design §9).
- The records' compact constructors hold the rules and have plain unit tests. Stored with `CAST(:fields AS jsonb)`, as `AuditLog` writes `audit_event.details`.
- **`LogFieldSourcesTest`**: each field paired with its source phrase and page (e.g. `howUsed` ↔ "A brief description of how the AI tool was used", SEC-RULES p. 34); the test checks the phrase is on that page. `SourceDocuments` gains `SEC-RULES` → `Coursework Rules and Procedures For 2025_2026.pdf` (printed page = PDF page).

### 3B. Student log

Every endpoint's first step is `ComponentRepository.findForApprovedStudent(componentId, actor)`. An entry id is only ever looked up by `LogRepository.findOwn(entryId, studentId)`, which also requires the student to be approved in the entry's class — the `PersonalItemRepository` pattern. Anything else is `NOT_FOUND`.

| Endpoint | Does |
|---|---|
| `GET /components/{id}/log` | The actor's entries, newest first: `id`, `kind`, `createdAt`, `editedAt` (latest revision's time, null if one revision), `revisionCount`, `visibleToTeacher`, current `body` and `fields` |
| `POST /components/{id}/log` | `{kind, body, fields, visibleToTeacher?}` → entry plus revision 1; visible unless the student chose otherwise (FR-24b) |
| `GET /log/{entryId}` | One entry and its full revision history, newest first |
| `POST /log/{entryId}/revisions` | `{body, fields}` → revision n+1; kind unchanged |
| `PUT /log/{entryId}/visibility` | `{visible}` → updates the flag and appends a `log_visibility_change` row; no row when the value is unchanged |

Pages (roadmap §6.2), on the app page pattern (`ARCHITECTURE.md` §6):

- **`/components/[id]/log`** — entries newest first: kind as a word, date, "edited" marker, who can read it, and a one-tap **Hide from teacher / Show to teacher** button per entry (FR-24c). Empty state.
- **`/components/[id]/log/new`** — kind choice, then that kind's fields. Beside Save, a plain-words line that follows the visibility control (FR-24e): "Your teacher can read this" / "Only you can read this. Your teacher sees that you made an entry on 3 March."
- **`/components/[id]/log/[entryId]`** — the entry, a "Save new revision" form, and its revision history.
- The student component page links to the log.
- Forms use Part A's busy labels and alert focus.
- Built working-first on the Navy tokens; restyled when D-6 arrives.

### 3C. Teacher reading view

`GET /components/{id}/students/{studentId}/log`: `ComponentService.owned(actor, componentId)` first, then the student must be `APPROVED` in that class (looked up within the class, never by id alone). Otherwise `NOT_FOUND`.

`TeacherLogProjection` is the only code that builds the teacher's view:

```java
sealed interface TeacherEntry permits VisibleEntry, HiddenEntry
record VisibleEntry(UUID id, String kind, Instant createdAt, Instant editedAt, int revisionCount,
                    String body, EntryFields fields, List<Revision> history) implements TeacherEntry
record HiddenEntry(UUID id, String kind, Instant createdAt, Instant editedAt, int revisionCount,
                   Instant hiddenAt) implements TeacherEntry
```

(`Instant` here is the view's type; the repository reads `OffsetDateTime` per the timestamp convention.)

- `HiddenEntry` has **no** body, fields or history properties, so nothing added to a mapper can put them in the JSON.
- `hiddenAt` is the time of the latest `log_visibility_change` to hidden; null means the entry was private from the start. The page says "Hidden by the student on 3 Mar" or "Private entry · 3 Mar" — both distinct from no entry (FR-24d; Q3).
- A visible entry's `history` is every revision, including those written while it was hidden.
- As with `ComponentController.view`, the controller's declared return type must let Jackson serialise each record's own properties (`ARCHITECTURE.md` §10).

Page **`/teach/classes/[id]/students/[studentId]`**, linked from each approved student's name on the Students tab: visible entries with "edited" and history; hidden entries as one meta line; empty state. 4B adds checkpoints here later.

### 3D. Tests

- **Authz suite:** every new endpoint — anonymous 401; another student, a teacher of another class, a school leader, a pending and a removed student all 404.
- **Gate P3's named cases:** a sent `createdAt` is ignored; another student's log 404; a teacher of a different class 404.
- **`TeacherLogProjectionTest`:** a student's entry carries unique markers in its body, its fields and every revision; the student hides it; the teacher's **raw JSON text** contains no marker, and does contain the entry's kind, dates and revision count. Bite test: route a hidden entry through `VisibleEntry`, watch it fail, restore. A second case: hide, show again, the teacher sees the full history.
- **Guards:** `UPDATE`/`DELETE` on a revision or visibility row, and a change to a frozen `log_entry` column, are refused.
- **`LogFieldSourcesTest`** as in 3A.
- **e2e** `e2e/phase3.e2e.ts`, `laptop` and `phone`, axe clean on each new page: the student logs a note, a source and an AI use, and hides the note; the teacher sees the hidden note's line without its text; the student revises the source; the teacher sees "edited" and its history.

### 3E. Order of work on `pilot/3-the-log`

1. Write `docs/design/prompts/D-6-log.md` (the D-6 Claude Design prompt, on the pattern of D-3 to D-5), so the pack can be made while the code is built.
2. 3A — domain records and their tests; `V11__log.sql` and guard tests; `SourceDocuments` + `LogFieldSourcesTest`; `LogRepository`.
3. 3B — service, controllers, authz rows; schemas; the three student pages and their client components.
4. 3C — projection and its test; endpoint and authz rows; the teacher page.
5. e2e journey.
6. Restyle from D-6 — skipped and recorded in `HANDOFF.md` if the pack hasn't arrived, as in Phase 2.

### 3F. Docs kept true, in the same commits

- `ARCHITECTURE.md` §4 (log scoping bullets), §5 (`V11`, the log tables and guards; the timeline's fourth branch from Part A), §6 (the new pages), §10 if anything looks wrong but isn't.
- `docs/PILOT-ROADMAP.md`: §1 status board; §3 Q6 marked answered for the fields from the 2025–26 Rules; §7 endpoint rows; §8.3 status; §9 R2 moved to "before go-live".
- `CLAUDE.md` backend conventions: "A log entry id is only looked up with `LogRepository.findOwn(entryId, studentId)`, never by id alone."
- `docs/HANDOFF.md` at the end of each session.

### Gate P3 (roadmap §8.3, as extended here)

- [ ] `make verify` and `make e2e` green; the journey covers log, hide and edit
- [ ] A back-dated `createdAt` is ignored, and a test says so
- [ ] Authz: another student's log → 404; a teacher of a different class → 404
- [ ] The projection's raw-JSON test passes with its bite test
- [ ] `/self-review` in a fresh session; `docs/changes/pilot-3-the-log.md` committed on the branch

## Out of scope

R2 monitoring; `source_url` (waits on Tim's four URLs); prompts open by default at 1140; Sign in disabled during a lockout; phone rows wrapping their buttons; Phase 2's human content reviews; the reference and AI-use formatters and their pages (Phase 6); days-since-last-entry and the progress grid (Phase 4).

## Risks

- **Rules edition.** The Rules PDF in hand is 2025–2026 ("the 2026 State examinations"); the pilot cohort sits in 2027 and the briefs cite the Rules without a year. When the 2026–2027 edition is published, diff Appendix 2 against the `AI_USE` fields. A new optional field needs no migration.
- **`fields` shape is guarded only in Java.** Acceptable because every write goes through `LogService`; a direct SQL write could store a bad shape.
