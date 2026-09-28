# Phase 3: the log (pilot-3-the-log, Part B)

## What was added

A student now keeps a dated, versioned log for each component: notes, sources they used, and every AI tool they used. They control, entry by entry, whether their teacher can read it. Timestamps are set by the server and can't be changed; an edit adds a revision and keeps the old one; nothing is deleted. A teacher can open a student's log from their name on the Students tab. They see that every entry exists, but only the content of entries the student left visible. A hidden entry is one line with no content.

## Files changed

| File | What changed and why |
|---|---|
| **Migration** | |
| `backend/src/main/resources/db/migration/V11__log.sql` | `log_entry`, `log_entry_revision` (`fields jsonb`), `log_visibility_change`; triggers make revisions and visibility changes append-only and freeze an entry's identity and `created_at` |
| **Domain** (`backend/.../log/domain/`) | |
| `EntryKind`, `SourceType`, `EntryFields`, `SourceFields`, `AiUseFields` | The three kinds and their per-kind fields; `EntryFields` is sealed and permits only the two records (a note stores `fields` as SQL NULL, decision P3-17) |
| `HttpsLink`, `LogContent` | https-only link check; every validation rule and length cap, returning `FieldError`s keyed by the request's JSON path |
| `LogEntry`, `LogRevision` | What the repository returns |
| **Persistence** | |
| `log/adapter/persistence/LogRepository.java` | Owner-scoped reads, append-only writes; `findOwn` also requires an APPROVED enrolment in the entry's class |
| **Service and web** | |
| `log/application/LogViews.java`, `LogService.java` | Student views and use cases; `stripLinks` trims links before validation so what's checked is what's stored; `teacherView` reads in one REPEATABLE READ snapshot |
| `log/adapter/web/LogController.java`, `LogEntryRequest`, `RevisionRequest`, `VisibilityRequest` | `GET/POST /components/{id}/log`, `GET /log/{id}`, `POST /log/{id}/revisions`, `PUT /log/{id}/visibility` |
| `log/application/TeacherLogProjection.java`, `TeacherLogViews.java`, `adapter/web/TeacherLogController.java` | The only code that builds the teacher's view; `HiddenEntry` has no body, fields or history properties |
| `components/application/ComponentService.java` | Public `requireOwned` so the log can reuse the teacher-owns-this-component check |
| `shared/error/ProblemDetailsAdvice.java` (+ test) | A wrong value in well-formed JSON (unknown enum, bad date) is now `VALIDATION_FAILED` with a `fieldErrors` entry, not `MALFORMED_REQUEST`. **Global, needs Tim's OK** |
| **Backend tests** | |
| `LogSchemaTest`, `LogRepositoryTest`, `LogEntriesTest`, `LogScopeTest`, `TeacherLogProjectionTest`, `HttpsLinkTest`, `LogContentTest` | Triggers, repository, HTTP behaviour, 404 scoping, the teacher's raw-JSON privacy test, validation |
| `content/LogFieldSourcesTest.java`, `SourceDocuments.java` | Each SOURCE / AI_USE field is paired with its phrase and found on its cited NCCA/SEC page; `SEC-RULES` added as a source document |
| `support/ClassFixtures.java` | `CLASSMATE`: a second approved student in class 1 |
| **Frontend** | |
| `lib/api/schemas.ts`, `lib/app/log.ts` (+ test) | Zod schemas mirroring the backend records (hidden teacher entry is `.strict()`); kind words, visibility line, Dublin date, field labels |
| `components/app/component-tabs.tsx` (+ spec), `app/(app)/components/[id]/page.tsx` | "Log" tab is live; new `current` prop |
| `components/app/log-list.tsx`, `log-visibility-toggle.tsx` (+ specs), `app/(app)/components/[id]/log/page.tsx` | Student list and one-tap hide/show |
| `components/app/log-entry-form.tsx` (+ spec), `.../log/new/page.tsx` | Create and revise modes, per-kind fields, the plain-words visibility line |
| `components/app/log-history.tsx` (+ spec), `.../log/[entryId]/page.tsx` | Entry page: revise and history |
| `components/app/class-students.tsx` (+ spec), `components/app/teacher-log.tsx` (+ spec), `.../teach/classes/[id]/students/[studentId]/page.tsx` | Teacher reading view |
| `frontend/e2e/phase3.e2e.ts` | The Gate P3 journey |
| **Docs** | |
| `docs/design/prompts/D-6-log.md`, `README.md` | The Claude Design prompt for the log |
| `docs/ARCHITECTURE.md`, `PILOT-ROADMAP.md`, `HANDOFF.md`, `CLAUDE.md`, the spec | Kept true with the code (log bullets, gate ticks, one new backend convention, P3-17) |

## How it fits together

**Student writes an entry:** browser `LogEntryForm` → `api.send("POST", "/components/{id}/log")` → Next.js proxy → `LogController` (takes the `Actor`) → `LogService.create` → `ComponentRepository.findForApprovedStudent` (404 unless approved) → `stripLinks` → `LogContent.problems` (400 with field errors) → `LogRepository.create` (`log_entry` + revision 1, both stamped with `clock.instant()`) → `router.push` back to the list.

**Revise:** `POST /log/{id}/revisions` → `LogService.own()` → `LogRepository.findOwn(entryId, actor.userId())` → `addRevision`, which first runs `UPDATE … SET current_revision = current_revision + 1 RETURNING`. That takes a row lock, so two simultaneous saves get revisions n+1 and n+2 instead of colliding.

**Teacher reads:** `GET /api/v1/components/{componentId}/students/{studentId}/log` → `ComponentService.requireOwned` (teacher owns the component's class) → the student must be APPROVED in *that* class → `LogRepository.list`, `hiddenAt`, `visibleHistory` → `TeacherLogProjection` builds a sealed `TeacherEntry`: `VisibleEntry` (content plus history) or `HiddenEntry` (kind, dates, revision count, `hiddenAt`). The Next page renders it with `TeacherLog`.

## Concepts & patterns used

- **Make the illegal state unrepresentable.** `HiddenEntry` has no body, fields or history properties, so no mapper change can put them in the JSON. Alternative: one entry record with nullable content, which relies on someone remembering to null it. Same idea as `ComponentViews.StudentComponent` vs `TeacherComponent`. The frontend mirrors it: the hidden-entry Zod schema is `.strict()`, so leaked content would fail parsing instead of rendering.
- **Append-only tables by trigger.** A `BEFORE UPDATE OR DELETE` trigger raising `check_violation` makes "timestamps can't change" true even against a stray SQL statement, not just through the app. Trade-off: a future erasure procedure has to lift the triggers deliberately (noted in the migration). Also used in `V7__template_guards.sql`.
- **Discriminated `jsonb` with sealed records.** One `fields jsonb` column; the `kind` column decides which record it deserialises into (`LogRepository.fields`). Alternative: a typed table per kind, which is three sets of revision/visibility plumbing. Nearest existing use of `jsonb`: `audit/AuditLog.java`.
- **Owner-scoped repository.** Reads take the student and filter by them; an entry id from another student is simply not found. Same as `timeline/adapter/persistence/PersonalItemRepository.java`. Note the exception: `revisions`, `addRevision` and `setVisibility` are keyed by entry id alone and are only safe because `LogService.own()` runs first (the javadoc says so).
- **Server-set time.** Request bodies carry no `createdAt`; unknown properties are ignored, and a test sends a back-dated one to prove it. Binding uses `Timestamps.utc(clock.instant())`.
- **Source-text check.** `LogFieldSourcesTest` finds each field's quoted phrase on its page, so field names can't drift from the SEC/NCCA documents. Same as `content/SourceTextTest.java`.
- **Bite test.** Break the code on purpose, watch the test fail, restore. Done for the teacher projection and for the owner filter.
- **Focus management on error / busy labels** (from Part A) used in every new form.

## Implementation techniques

- Test first throughout: each task began with a failing test that was run and read (for example `relation "log_entry" does not exist`, or `expected 201 but was 404` before the controller existed).
- Privacy tests look at the raw JSON *text*, not the parsed object: unique markers go in a hidden entry's body, fields and every revision, and the assertion is `doesNotContain("SECRET")`. A parsed-object test can miss a leaked field nobody thought to assert on.
- Bite test recipe used twice: change `e.visibleToTeacher()` to `true` in `TeacherLogProjection.project`, run `TeacherLogProjectionTest`, see the marker assertion fail, restore, confirm `git diff backend/src/main` is clean.
- The e2e journey passed first time; I re-ran `make e2e` independently rather than trusting the report (16/16, `laptop` and `phone`, axe clean).

## Things to know

- Visibility belongs to the *entry*, not a revision (P3-7). Hide, edit, show again: the teacher sees every revision, including ones written while hidden.
- `hiddenAt == null` means "private from the start"; creating an entry hidden writes no `log_visibility_change` row. The teacher page words these differently ("Private entry" vs "Hidden by the student on …").
- The tests reset the pinned `MutableClock` in `@BeforeEach`; Spring caches that bean across tests in one context, so an earlier test advancing it breaks the next one.
- Removing a student changes access; nothing is deleted (P3-8). `findOwn` joins on an APPROVED enrolment.
- Links are stored and rendered with `rel="noopener noreferrer"`, never fetched by the server.
- Row triggers don't fire on `TRUNCATE`, so the test reset still clears these tables.

## What I'd get wrong next time

- **No test had a second approved student in the class.** Every "other user" in the first scope tests (pending, removed, other school, teacher) failed the enrolment check before ownership was ever tested, so deleting `AND e.student_user_id = :student` would have passed everything. Fixed with `ClassFixtures.CLASSMATE` and a bite test. For any owner-scoped feature, the case that matters is an *equally authorised* other user.
- **`HttpsLink.valid` checked `value.strip()` but the raw string was stored.** Strip first, validate and store the same value.
- **`url` and `shareUrl` had no length cap**, breaking the 500-character rule; the plan's own code had the gap.
- **A trigger fired before a CHECK.** `theKindMustBeOneOfThree` updated `kind`, which the guard trigger refuses first, so the CHECK was never exercised. Use an INSERT to test a CHECK.
- **`AppUser.username` doesn't exist** (usernames live in another table); the plan's SQL in `LogScopeTest` had to use the enrolment id.

## Self-review findings

The fresh-session `/self-review` was **not run**: Tim chose to merge because the changes were small. What did happen were in-session reviews by separate agents (B2, B3–B6, B11), which caught the missing link caps, the missing classmate test, the trigger/CHECK test gap, and confirmed no path lets hidden content reach the teacher. A later code review then changed `LogVisibilityToggle`: the button's accessible name is now exactly its visible text ("Hide from your teacher", so speech control matches what's on screen), the entry title moved into `aria-describedby`, and showing a hidden entry warns that its earlier versions become readable (the P3-7 consequence, now said in words). Lint, types, 209 Vitest and `make e2e` 16/16 pass with those edits. The plan's fresh-session `/self-review` itself was still not run.

## Deviations from the plan

- `ProblemDetailsAdvice` changed globally (see table): needed so an unknown `kind` is a field error; not in the plan.
- `LogEntryForm` has `noValidate` so the browser's own bubble for `type="url"` can't pre-empt the server's message.
- The revise form gained a `role="status"` line, "Saved as a new revision." (UI-STANDARDS §8: confirm in place through a live region).
- `LogService.teacherView` is `REPEATABLE_READ`, `readOnly`, so its three reads share one snapshot.
- The toggle's label and description were reworked after review (see above).
- Extra tests beyond the plan: classmate, second class of the same teacher, tighter projection markers, stripped links, unknown kind.
- Task B15 (restyle from D-6) skipped: the design pack doesn't exist yet.

## Follow-ups

- **Decide the hidden-entry disclosure.** The teacher sees a hidden entry's kind, revision count and last-edited time, but the student-facing copy only promises "sees that you made an entry on <date>". Either make the copy honest or drop `editedAt` and `revisionCount` from `HiddenEntry`.
- **Confirm or reverse the global `ProblemDetailsAdvice` change.** Known limits: list indexes are dropped from field paths; wrong-*type* values are still `MALFORMED_REQUEST`; a bad enum inside `fields` is reported as `fields`, not `fields.type`.
- Not checked: manual keyboard run on a phone, a visual look at 390/1140, touch-target size, contrast of the inactive tab text, real-browser date picker.
- When D-6 arrives: Task B15 (restyle; every existing spec must keep passing).
- When the 2026–27 SEC Rules come out, diff Appendix 2 §4 against `LogFieldSourcesTest`.
