# Pilot 3 — Phase 2 Follow-ups, then the Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close six Phase 2 follow-ups (Part A), then give students a dated, versioned log per component — notes, sources and AI use — that they control the teacher's view of, and give the teacher a reading view that shows every entry's existence but only visible entries' content (Part B, Gate P3).

**Architecture:** Part A touches existing code only: one more branch in the timeline union, a read of `item_tick.done_at`, three frontend form fixes and a unit test. Part B adds a feature package `ie.coursework.log`: `V11` creates three append-only tables guarded by triggers; each kind's own fields are one `jsonb` column validated against a sealed Java record per kind; `LogService` scopes every call through the existing approved-student and owning-teacher checks; `TeacherLogProjection` is the only code that builds the teacher's view, using a `HiddenEntry` type that has no content properties at all. Frontend pages follow the app page pattern (`ARCHITECTURE.md` §6).

**Tech Stack:** Spring Boot 4.1, Jackson 3 (`tools.jackson`), `JdbcClient`, Postgres 18, Mockito (from `spring-boot-starter-test`, first use here); Next.js 15.3.9, Zod 4, Vitest + Testing Library, `node:test`, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-09-27-pilot-3-the-log-design.md`. **Intent:** `docs/intent/pilot-3-the-log.md`. **Roadmap:** §6.2 (log rows), §7 Phase 3, §8.3 and Gate P3. **Design:** §6.6, §6.7, §8.5, §9.

## Global Constraints

- **Test first.** Watch each test fail for the right reason before writing the code that passes it.
- **Out of scope is 404, never 403.** Every service method takes the `Actor` first and checks scope before anything else.
- **Never invent SEC or NCCA content.** `SOURCE` and `AI_USE` fields come only from NCCA-BIO p. 15–16, NCCA-BUS p. 19 and p. 21, and SEC-RULES p. 34; `LogFieldSourcesTest` checks each phrase on its page.
- **Server-set time only.** Bind with `Timestamps.utc(clock.instant())`; read `OffsetDateTime`, then `.toInstant()`.
- **Links** (`url`, `shareUrl`) are absolute `https` URLs with a host; stored, rendered `rel="noopener noreferrer"`, never fetched.
- **Length caps:** `body` ≤ 4,000 characters; each short field ≤ 500; `prompts` ≤ 4,000.
- **Next.js stays on 15.3.9.** App routes stay behind `APP_ENABLED`.
- **Component specs query by role and accessible name.**
- **`make verify` green before every task commit.** Where Docker isn't available, run the frontend checks and say plainly that the backend and e2e didn't run.
- **Never commit** `docs/newDevelopement/subjectDocs/Tim_Mc_Sweeney_CV_September_2026.pdf`.

---

## Two parts, two branches

| Part | Branch | Starts from | Ends with |
|---|---|---|---|
| **A — Phase 2 follow-ups** (Tasks A1–A7) | `pilot/2g-phase2-follow-ups` | `pilotMain` | Part A gate, fresh-session `/self-review`, `docs/changes/pilot-2g-phase2-follow-ups.md`, merge into `pilotMain` |
| **B — Phase 3, the log** (Tasks B1–B15) | `pilot/3-the-log` | `pilotMain` **after Part A merges** | Gate P3, fresh-session `/self-review`, `docs/changes/pilot-3-the-log.md`, merge into `pilotMain` |

**Don't start Part B until Part A is merged.** Part B's forms rely on Part A's busy labels and alert focus.

---

## Decisions made

Every question asked while planning, and what was agreed (Tim, 27 Sep 2026, through `/interview-me` and brainstorming).

| # | Question | Decision |
|---|---|---|
| P3-1 | Phase 3 only, or the Phase 2 follow-ups too? | Follow-ups first, as Part A of this plan, clearly separate from Phase 3. |
| P3-2 | Which follow-ups? | Q-P2-E completion date on the timeline; `done_at` on ticks; the `TeacherItems` lost draft; busy labels; alert focus; isolating `ComponentService.owned`'s checks. Left out: `source_url` (waiting on Tim's URLs), prompts open at 1140, lockout-disabled Sign in, phone row wrapping. |
| P3-3 | Branches and changes docs? | One plan, two branches in order, two changes docs, two self-reviews. |
| P3-4 | R2 monitoring? | Out. Its roadmap row moves to "before go-live". |
| P3-5 | Which log kinds? | `NOTE`, `SOURCE` and `AI_USE`. `AI_USE` was first deferred, then brought in once Tim added the SEC Coursework Rules and Procedures 2025–2026: its Appendix 2 §4 (p. 34) matches design §6.7's fields exactly. |
| P3-6 | How are per-kind fields stored? | One `fields jsonb` column validated against a sealed Java record per kind. Rejected: a typed table per kind; browser-only validation. |
| P3-7 | Hidden, edited while hidden, then shown — what does the teacher see? | Everything. Visibility is per entry, not per revision. |
| P3-8 | A removed student's log? | Removal changes access; nothing is deleted. No re-approval feature or test. |
| P3-9 | Audit events for the log? | None; `log_visibility_change` is its own trail. |
| P3-10 | Same-day timeline order with a completion date? | Completion date first. |
| P3-11 | Busy labels: wrapper or inline? | Inline ternaries in each form; no `SubmitButton` wrapper. Scope: the 11 primary submit/commit buttons (Task A4's table). `ClassStudents`' in-row approve/decline/remove buttons are row actions, not submits, and keep their labels. |
| P3-12 | Which failed actions move focus to the alert? | Every client form or action that shows an `ErrorPanel`, **except** `ItemTick` (a checkbox that reverts; moving focus off it would lose the user's place). Server pages never. |
| P3-13 | Can a student create an entry hidden? | Yes: the new-entry form's visibility control defaults to visible (FR-24b) and can be switched before saving. Creating hidden writes no `log_visibility_change` row; the teacher sees "Private entry". |
| P3-14 | `datePublished` type | Free text: the NCCA examples range from "2013" to "date written not available". |
| P3-15 | Source types | `BOOK`, `NEWSPAPER_OR_MAGAZINE`, `ONLINE_TEXT_OR_IMAGE`, `ONLINE_AUDIO`, `ONLINE_VIDEO` (NCCA-BIO p. 15–16 headings) and `OTHER` (the app's catch-all). |
| P3-16 | Where does the log live in the UI? | The student's `ComponentTabs` "Log" tab becomes live; the teacher reaches a student's log from their name on the Students tab. |

---

## Concepts in play

| Concept | What it is | Why it fits here | Already used in this repo |
|---|---|---|---|
| **Union query with a kind column** | Several `SELECT`s of the same shape glued by `UNION ALL`, each tagging its rows with a kind | Adding the completion date is one more branch, not a second query | `timeline/adapter/persistence/TimelineRepository.java` |
| **Server-side "today" in Dublin** | Convert instants to a calendar date in `Europe/Dublin` on the server, never in the browser | "You ticked this · 2 Oct" must agree with the server's view of the date | `components/domain/DublinDate.java` |
| **Discriminated `jsonb` + sealed records** | One `jsonb` column whose shape is decided by a `kind` column; `sealed interface … permits` closes the set of shapes so `switch` must cover every kind | Three kinds share revisions, visibility and scoping; only their fields differ | `jsonb` write: `audit/AuditLog.java`; sealed-style role union: `components/application/ComponentViews.java` (`ComponentView`) |
| **Append-only tables enforced by trigger** | A `BEFORE UPDATE OR DELETE` trigger that raises `check_violation` | "Timestamps can't be changed" must hold even against a stray SQL statement | `db/migration/V7__template_guards.sql`, `V8__component_instances.sql` |
| **Owner-scoped repository** | Every query takes the owner and filters by it; no lookup by id alone | An entry id from another student is simply not found | `timeline/adapter/persistence/PersonalItemRepository.java` |
| **Make the illegal state unrepresentable** | A type that lacks the properties that must never leak, instead of nulling them | The teacher projection can't serialise a hidden entry's body by accident | `ComponentViews.StudentComponent` vs `TeacherComponent` (separate records per role) |
| **Bite test** | Break the code on purpose, watch the test fail, restore | Proves a privacy test tests something | `timeline/authz/PersonalItemPrivacyTest.java` (mutate-and-revert) |
| **Source-text check** | A test that finds each quoted phrase on its cited PDF page | Field names come from SEC/NCCA documents, so they must be checkable | `content/SourceTextTest.java`, `content/SourceDocuments.java` |
| **Mockito stubs for a unit test** | Replace a collaborator with a stub so one branch can be exercised alone | Real data can't make only one of `ComponentService.owned`'s two checks fail | First use in this repo (Task A6); `spring-boot-starter-test` already ships it |
| **Client component + `router.refresh()`** | Mutate through `api`, then ask Next to re-render the server component | Every log mutation | `components/app/personal-item-form.tsx` |
| **Zod discriminated union** | A schema that picks a branch by a literal field | Entries differ by `kind`; teacher entries by `visibility` | `lib/api/schemas.ts` (`componentViewSchema`) |
| **Focus management on error** | Move keyboard focus to the alert after a failed submit | `UI-STANDARDS.md` §83; announced by `role="alert"`, reachable by keyboard | New in Task A5 |

---

## File structure

### Part A

| File | Change | Task |
|---|---|---|
| `backend/.../timeline/adapter/persistence/TimelineRepository.java` | Fourth union branch `COMPLETION`; `kind_order` renumbered | A1 |
| `backend/src/test/.../timeline/adapter/persistence/TimelineRepositoryTest.java` | Completion-date cases | A1 |
| `frontend/lib/api/schemas.ts` | `timelineItemSchema.kind` adds `COMPLETION`; `studentItemSchema` and the student stage item add `doneOn` | A1, A2 |
| `frontend/components/app/timeline-view.tsx` + spec | Word, marker and title for `COMPLETION` | A1 |
| `backend/.../components/domain/DublinDate.java` + test | `of(Instant)` | A2 |
| `backend/.../components/adapter/persistence/ItemTickRepository.java` + test | `doneItems` returns `Map<UUID, Instant>` | A2 |
| `backend/.../components/application/ComponentViews.java`, `ComponentService.java` | `StudentItem.doneOn` | A2 |
| `frontend/components/app/item-tick.tsx` + spec | "You ticked this · 2 Oct 2026" | A2 |
| `frontend/components/app/teacher-items.tsx` + spec | Retire keeps another item's draft | A3 |
| 11 client components + their specs | Busy labels | A4 |
| `frontend/components/app/error-panel.tsx` + spec; client forms | `focus` prop | A5 |
| `backend/src/test/.../components/application/ComponentServiceOwnedTest.java` | The two checks, isolated | A6 |
| `frontend/e2e/phase2.e2e.ts` | Completion row, dated tick line | A7 |

### Part B

Backend, `backend/src/main/java/ie/coursework/log/` unless noted:

| File | Responsibility | Task |
|---|---|---|
| `domain/EntryKind.java`, `SourceType.java`, `EntryFields.java`, `NoFields.java`, `SourceFields.java`, `AiUseFields.java`, `HttpsLink.java`, `LogContent.java` | Kinds, per-kind fields, validation rules; no Spring | B2 |
| `domain/LogEntry.java`, `LogRevision.java` | What the repository returns | B5 |
| `resources/db/migration/V11__log.sql` | Tables, index, append-only triggers | B3 |
| `adapter/persistence/LogRepository.java` | Owner-scoped reads and appends | B5 |
| `application/LogViews.java`, `LogService.java` | Student views and use cases | B6 |
| `adapter/web/LogEntryRequest.java`, `RevisionRequest.java`, `VisibilityRequest.java`, `LogController.java` | Student endpoints | B6 |
| `application/TeacherLogProjection.java`, `TeacherLogViews.java` | The only builder of the teacher's view | B11 |
| `adapter/web/TeacherLogController.java` | Teacher endpoint | B11 |
| `backend/src/test/java/ie/coursework/content/SourceDocuments.java` | `SEC-RULES` key | B4 |
| Tests: `log/domain/*Test.java`, `log/adapter/persistence/LogSchemaTest.java`, `LogRepositoryTest.java`, `log/adapter/web/LogEntriesTest.java`, `log/authz/LogScopeTest.java`, `log/authz/TeacherLogProjectionTest.java`, `content/LogFieldSourcesTest.java` | | B2–B6, B11 |

Frontend, `frontend/`:

| File | Responsibility | Task |
|---|---|---|
| `lib/api/schemas.ts` | Log entry, detail, teacher log | B7 |
| `lib/app/log.ts` + `.test.ts` | Kind words, visibility line, Dublin date of an instant, source-type labels, which source types are online | B7 |
| `components/app/component-tabs.tsx` + spec | "Log" tab live, `current` prop | B8 |
| `app/(app)/components/[id]/log/page.tsx` | Log list | B8 |
| `components/app/log-list.tsx`, `log-visibility-toggle.tsx` + specs | List rows; one-tap hide/show | B8 |
| `components/app/log-entry-form.tsx` + spec | Kind choice, per-kind fields, visibility line; create and revise | B9, B10 |
| `app/(app)/components/[id]/log/new/page.tsx` | New entry | B9 |
| `app/(app)/components/[id]/log/[entryId]/page.tsx`, `components/app/log-history.tsx` + spec | Entry, revise, history | B10 |
| `components/app/class-students.tsx` + spec | Approved names link to the student's log | B12 |
| `app/(app)/teach/classes/[id]/students/[studentId]/page.tsx`, `components/app/teacher-log.tsx` + spec | Teacher reading view | B12 |
| `e2e/phase3.e2e.ts` | Gate P3 journey | B13 |
| `docs/design/prompts/D-6-log.md` | Claude Design prompt | B1 |

---

# Part A — Phase 2 follow-ups

**Before you start:** `git checkout pilotMain && git pull --ff-only 2>/dev/null; git checkout -b pilot/2g-phase2-follow-ups`. Run `make verify` and note the counts (348+ backend tests; `node:test` and Vitest totals) so you can report the deltas.

## Task A1: SEC completion date on the timeline (Q-P2-E)

**Files:**
- Modify: `backend/src/main/java/ie/coursework/timeline/adapter/persistence/TimelineRepository.java`
- Test: `backend/src/test/java/ie/coursework/timeline/adapter/persistence/TimelineRepositoryTest.java`
- Modify: `frontend/lib/api/schemas.ts:205`, `frontend/components/app/timeline-view.tsx:23-40`
- Test: `frontend/components/app/timeline-view.spec.tsx`
- Docs: `docs/ARCHITECTURE.md` §5 timeline bullet; `docs/superpowers/plans/2026-09-16-pilot-2f-personal-items-and-timeline.md` P2-44 row

**Interfaces:**
- Produces: timeline items with `kind = "COMPLETION"`, `title` = the brief's title, `stageLabel` null, subject/class/component columns filled, `personalItemId`/`personalKind` null.

- [ ] **Step 1: Write the failing repository test.** Read `TimelineRepositoryTest` first and reuse its setup (it builds a world with `ClassFixtures`, a Biology component with `ComponentFixtures`, and reads `between`). Add:

```java
@Test
void theBriefsCompletionDateIsItsOwnItemAndComesFirstOnItsDay() {
    ClassFixtures.World world = fixtures.world();
    UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
    LocalDate completion = LocalDate.of(2027, 2, 26); // the 2027 Biology brief (plan 2C, BriefContentTest)
    components.stageDate(component, components.stageId(ComponentFixtures.BIOLOGY_2027, 6), completion);

    List<TimelineEntry> day = timeline.between(world.approvedStudent(), completion, completion);

    assertThat(day).extracting(TimelineEntry::kind).containsExactly("COMPLETION", "STAGE");
    TimelineEntry item = day.getFirst();
    assertThat(item.title()).isEqualTo(jdbc.queryForObject(
            "SELECT title FROM annual_brief WHERE sec_code = ?", String.class, ComponentFixtures.BIOLOGY_2027));
    assertThat(item.subjectName()).isEqualTo("Biology");
    assertThat(item.componentId()).isEqualTo(component);
    assertThat(item.stageLabel()).isNull();
}

@Test
void completionDatesOnlyForApprovedClassesAndOnlyInRange() {
    ClassFixtures.World world = fixtures.world();
    components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
    LocalDate completion = LocalDate.of(2027, 2, 26);

    assertThat(timeline.between(world.pendingStudent(), completion, completion)).isEmpty();
    assertThat(timeline.between(world.removedStudent(), completion, completion)).isEmpty();
    assertThat(timeline.between(world.approvedStudent(), completion.minusDays(1), completion.minusDays(1))).isEmpty();
}
```

(If the test class names its collaborators differently — `repository` instead of `timeline`, `jdbcTemplate` instead of `jdbc` — use its names. `jdbcTemplate` is inherited from `PostgresIntegrationTest`.)

- [ ] **Step 2: Run it and watch it fail.** `cd backend && ./mvnw test -Dtest=TimelineRepositoryTest` → FAIL: the first test finds only `STAGE`.

- [ ] **Step 3: Add the branch.** In `TimelineRepository.SQL`, renumber `kind_order` (`STAGE` 1 → 2, `TEACHER_ITEM` 2 → 3, `PERSONAL` 3 → 4) and add as the first branch inside `FROM (`:

```sql
                SELECT 'COMPLETION' AS kind, b.completion_date AS due_date, NULL::text AS stage_label, b.title,
                       subj.code AS subject_code, subj.name AS subject_name, g.id AS class_id, g.name AS class_name,
                       i.id AS component_id, NULL::uuid AS personal_item_id, NULL::text AS personal_kind,
                       1 AS kind_order, 0 AS within
                FROM enrolment e
                JOIN class_group g ON g.id = e.class_group_id
                JOIN subject subj ON subj.id = g.subject_id
                JOIN component_instance i ON i.class_group_id = g.id
                JOIN annual_brief b ON b.id = i.annual_brief_id
                WHERE e.student_user_id = :student AND e.status = 'APPROVED'
                  AND b.completion_date BETWEEN :from AND :to
                UNION ALL
```

Move the column aliases (`AS kind`, `AS due_date`, …) from the `STAGE` branch to this one, since the first branch names the columns; leave `STAGE`'s values as they are. Update the class Javadoc: "stage dates, the brief's completion date, dated active teacher items, personal items (plan 2F P2-44, changed by Q-P2-E)".

- [ ] **Step 4: Run it.** `./mvnw test -Dtest='TimelineRepositoryTest,TimelineTest,PersonalItemPrivacyTest'` → PASS. If `TimelineTest` asserted an exact item count over a range that now includes 26 Feb 2027, update that expectation and say so in the commit.

- [ ] **Step 5: Write the failing frontend spec.** In `timeline-view.spec.tsx`, using its `base` fixture and `view()` helper:

```tsx
it("shows the SEC completion date as its own item, in words", () => {
  const completion: TimelineItem = { ...base, kind: "COMPLETION", date: "2027-02-26", title: "Biology in Practice Investigation" };
  view({ items: [completion], range: { view: "list", from: "2027-02-01", to: "2027-02-28" }, today: "2027-02-01" });
  const row = within(screen.getByRole("list", { name: "Timeline items" })).getByRole("listitem");
  expect(row).toHaveTextContent("SEC completion date · Biology");
  expect(within(row).getByRole("link", { name: "Biology in Practice Investigation" })).toHaveAttribute("href", "/components/k1");
});
```

- [ ] **Step 6: Run it and watch it fail.** `cd frontend && npx vitest run components/app/timeline-view.spec.tsx` → FAIL (Zod or TypeScript rejects `"COMPLETION"`, or the word reads "Own item").

- [ ] **Step 7: Implement.** In `lib/api/schemas.ts`: `kind: z.enum(["COMPLETION", "STAGE", "TEACHER_ITEM", "PERSONAL"]),`. In `timeline-view.tsx`:

```tsx
function kindWord(item: TimelineItem) {
  if (item.kind === "COMPLETION") return "SEC completion date";
  if (item.kind === "STAGE") return "Stage date";
  if (item.kind === "TEACHER_ITEM") return "From your teacher";
  return item.personalKind ? KIND_LABEL[item.personalKind] : "Own item";
}
```

In `Marker`, draw `COMPLETION` like `STAGE`: `if (item.kind === "STAGE" || item.kind === "COMPLETION") return <span aria-hidden="true" className={\`${size} flex-none bg-app-accent\`} />;`. Everywhere the file tests `item.kind === "STAGE"` for the subject edge bar and the heading-weight title (lines ~72 and ~77), test `(item.kind === "STAGE" || item.kind === "COMPLETION")`. `Title` needs no change (it only prefixes `stageLabel` for `STAGE`).

- [ ] **Step 8: Run it.** `npx vitest run components/app/timeline-view.spec.tsx && npm run typecheck` → PASS.

- [ ] **Step 9: Docs.** `ARCHITECTURE.md` §5 timeline bullet: "one union query — the brief's completion date, approved-enrolment stage dates, …; same-day order completion, stage, teacher item, personal". In plan 2F's decisions table, append to P2-44: "**Changed 27 Sep 2026 (Q-P2-E, plan pilot-3-the-log Task A1):** the completion date is its own item, first on its day."

- [ ] **Step 10: Commit.**

```bash
git add backend/src/main/java/ie/coursework/timeline backend/src/test/java/ie/coursework/timeline frontend/lib/api/schemas.ts frontend/components/app/timeline-view.tsx frontend/components/app/timeline-view.spec.tsx docs/ARCHITECTURE.md docs/superpowers/plans/2026-09-16-pilot-2f-personal-items-and-timeline.md
git commit -m "Show the SEC completion date on the student timeline (Q-P2-E)"
```

## Task A2: `done_at` on ticks

**Files:**
- Modify: `backend/src/main/java/ie/coursework/components/domain/DublinDate.java`; test `DublinDateTest.java`
- Modify: `backend/src/main/java/ie/coursework/components/adapter/persistence/ItemTickRepository.java`; test `ItemTickRepositoryTest.java`
- Modify: `backend/src/main/java/ie/coursework/components/application/ComponentViews.java` (`StudentItem`), `ComponentService.java` (`studentView`, `tick`)
- Test: `backend/src/test/java/ie/coursework/components/adapter/web/StudentComponentViewTest.java` (pinned clock)
- Modify: `frontend/lib/api/schemas.ts` (`studentItemSchema` and the student stage `items` schema), `frontend/components/app/item-tick.tsx`; test `item-tick.spec.tsx`

**Interfaces:**
- Produces: `DublinDate.of(Instant) -> LocalDate`; `ItemTickRepository.doneItems(UUID componentId, UUID studentId) -> Map<UUID, Instant>`; `StudentItem(UUID id, String text, LocalDate dueDate, boolean done, LocalDate doneOn)`; frontend item `{ id, text, dueDate, done, doneOn: string | null }`.

- [ ] **Step 1: Failing domain test.** In `DublinDateTest`:

```java
@Test
void anInstantLateOnAnIrishSummerEveningIsThatIrishDay() {
    // 23:30 UTC on 1 Oct 2026 is 00:30 on 2 Oct in Dublin (IST, UTC+1).
    assertThat(DublinDate.of(Instant.parse("2026-10-01T23:30:00Z"))).isEqualTo(LocalDate.of(2026, 10, 2));
}
```

- [ ] **Step 2: Run** `./mvnw test -Dtest=DublinDateTest` → FAIL (no `of`).

- [ ] **Step 3: Implement.**

```java
    public static LocalDate of(Instant instant) {
        return LocalDate.ofInstant(instant, DUBLIN);
    }
```

and make `today` call `of(clock.instant())`. Add `import java.time.Instant;`.

- [ ] **Step 4: Failing repository test.** In `ItemTickRepositoryTest`, change the existing `doneItems` assertions from a set to the map's `keySet()`, and add:

```java
@Test
void doneItemsCarriesWhenEachItemWasTicked() {
    // reuse the test's existing world/component/item setup
    Instant when = Instant.parse("2026-10-01T23:30:00Z");
    ticks.set(component, student, item, true, when);
    assertThat(ticks.doneItems(component, student)).containsEntry(item, when);
    ticks.set(component, student, item, false, when.plusSeconds(60));
    assertThat(ticks.doneItems(component, student)).isEmpty();
}
```

- [ ] **Step 5: Run** `./mvnw test -Dtest=ItemTickRepositoryTest` → FAIL (compile: `Set` has no `containsEntry`).

- [ ] **Step 6: Implement.**

```java
    /** Each ticked item and when it was ticked. Unticked rows (done_at null) aren't returned. */
    public Map<UUID, Instant> doneItems(UUID componentId, UUID studentId) {
        Map<UUID, Instant> done = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT teacher_item_id, done_at FROM item_tick
                WHERE instance_id = :component AND student_user_id = :student AND done_at IS NOT NULL
                """).param("component", componentId).param("student", studentId)
                .query(rs -> {
                    done.put(rs.getObject("teacher_item_id", UUID.class),
                            rs.getObject("done_at", OffsetDateTime.class).toInstant());
                });
        return done;
    }
```

(imports: `java.time.OffsetDateTime`, `java.util.LinkedHashMap`, `java.util.Map`; drop `Set`/`Collectors`.)

- [ ] **Step 7: Failing HTTP test.** In `StudentComponentViewTest` (its `PinnedClock` is Monday 12 Oct 2026, 09:00 in Dublin), add a case that has the approved student tick a teacher item through the API and reads the view back:

```java
    @Test
    void aTickedItemSaysWhichDayItWasTicked() throws Exception {
        UUID item = components.item(component, components.stageId(BIO, 6), "Full draft in", null);
        ApiSession student = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);
        student.put("/api/v1/components/" + component + "/teacher-items/" + item + "/tick", "{\"done\":true}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.doneOn").value("2026-10-12"));
        student.get("/api/v1/components/" + component).andExpect(status().isOk())
                .andExpect(jsonPath("$.stages[?(@.ordinal == 6)].items[0].doneOn").value(org.hamcrest.Matchers.contains("2026-10-12")));
        student.put("/api/v1/components/" + component + "/teacher-items/" + item + "/tick", "{\"done\":false}")
                .andExpect(jsonPath("$.doneOn").value(org.hamcrest.Matchers.nullValue()));
    }
```

(Use the class's existing names for the component id and imports; add `ApiSession`, `TestAccounts` and `status`/`jsonPath` imports if missing.)

- [ ] **Step 8: Run** `./mvnw test -Dtest=StudentComponentViewTest` → FAIL (`doneOn` missing).

- [ ] **Step 9: Implement.** `ComponentViews`: `public record StudentItem(UUID id, String text, LocalDate dueDate, boolean done, LocalDate doneOn) {}`. `ComponentService.studentView`:

```java
        Map<UUID, Instant> done = ticks.doneItems(component.id(), actor.userId());
        Map<UUID, List<StudentItem>> items = this.items.active(component.id()).stream()
                .collect(Collectors.groupingBy(TeacherItem::stageId,
                        Collectors.mapping(i -> {
                            Instant at = done.get(i.id());
                            return new StudentItem(i.id(), i.text(), i.dueDate(), at != null, at == null ? null : DublinDate.of(at));
                        }, Collectors.toList())));
```

`ComponentService.tick`: `Instant now = clock.instant(); ticks.set(component.id(), actor.userId(), item.id(), done, now); return new StudentItem(item.id(), item.text(), item.dueDate(), done, done ? DublinDate.of(now) : null);`

- [ ] **Step 10: Run** `./mvnw test -Dtest='ItemTickTest,StudentComponentViewTest,ItemTickRepositoryTest,DublinDateTest'` → PASS.

- [ ] **Step 11: Failing frontend spec.** In `item-tick.spec.tsx`:

```tsx
it("says when the student ticked it", () => {
  render(<ItemTick componentId="k1" item={{ id: "i1", text: "Full draft in", dueDate: null, done: true, doneOn: "2026-10-02" }} />);
  expect(screen.getByText("You ticked this · 2 Oct 2026")).toBeInTheDocument();
});

it("says only 'You ticked this' until the server has a date", async () => {
  vi.mocked(api.send).mockReturnValue(new Promise(() => {})); // still in flight
  render(<ItemTick componentId="k1" item={{ id: "i1", text: "Full draft in", dueDate: null, done: false, doneOn: null }} />);
  await userEvent.click(screen.getByRole("checkbox", { name: "Full draft in" }));
  expect(screen.getByText("You ticked this")).toBeInTheDocument();
});
```

Update the spec's other `item` fixtures to include `doneOn: null`.

- [ ] **Step 12: Run** `npx vitest run components/app/item-tick.spec.tsx` → FAIL.

- [ ] **Step 13: Implement.** `schemas.ts`: add `doneOn: z.string().nullable()` to `studentItemSchema` and to the student stage `items` object schema (search `done: z.boolean()`). `item-tick.tsx`: widen the `item` prop type with `doneOn: string | null`, and:

```tsx
        {done && (
          <span aria-live="polite" className="app-appear ml-auto text-app-small text-app-grey">
            {item.done && item.doneOn ? `You ticked this · ${formatCalendarDate(item.doneOn)}` : "You ticked this"}
          </span>
        )}
```

Pass `doneOn` through wherever `StageCard` builds the `item` prop (search `ItemTick` in `components/app`).

- [ ] **Step 14: Run** `npx vitest run components/app && npm run typecheck` → PASS.

- [ ] **Step 15: Commit.** `git commit -am "Say when a student ticked a teacher item"`

## Task A3: `TeacherItems` keeps another item's draft when one is retired

**Files:**
- Modify: `frontend/components/app/teacher-items.tsx:34-47,161`
- Test: `frontend/components/app/teacher-items.spec.tsx`

- [ ] **Step 1: Failing spec.** Using the spec's `stages()` fixture (items `i2` "Full draft in for feedback" and `i1` "Catch-up window closes" in Stage 6):

```tsx
it("retiring one item keeps an unsaved edit of another", async () => {
  vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
  render(<TeacherItems componentId="k1" stages={stages()} />);
  await userEvent.click(screen.getByRole("button", { name: "Edit Full draft in for feedback" }));
  const box = screen.getByRole("textbox", { name: "Item" });
  await userEvent.clear(box);
  await userEvent.type(box, "Half-typed change");
  await userEvent.click(screen.getByRole("button", { name: "Retire Catch-up window closes" }));
  await userEvent.click(screen.getByRole("button", { name: "Retire item" }));

  expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/teacher-items/i1");
  expect(screen.getByRole("textbox", { name: "Item" })).toHaveValue("Half-typed change");
});
```

- [ ] **Step 2: Run** `npx vitest run components/app/teacher-items.spec.tsx` → FAIL: the textbox is gone after retiring.

- [ ] **Step 3: Implement.** Give `run` a callback for what to clear:

```tsx
  async function run(action: () => Promise<unknown>, after: () => void) {
    setBusy(true);
    setError(null);
    try {
      await action();
      after();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }
```

In `submit`: `void run(() => …, () => setEditing(null));`. In the Retire item button:

```tsx
onClick={() => run(() => api.sendNoContent("DELETE", `${base}/${item.id}`), () => {
  setRetiring(null);
  if (editing === item.id) setEditing(null);
})}
```

- [ ] **Step 4: Run** the spec → PASS, and the whole file's other cases still pass.

- [ ] **Step 5: Commit.** `git commit -am "Keep a teacher's unsaved item edit when another item is retired"`

## Task A4: Busy labels on submit

**Files:** each component below and its `*.spec.tsx`.

| Component | Idle label | Busy label |
|---|---|---|
| `login-form.tsx` | Sign in | Signing in… |
| `change-password-form.tsx` | Change password | Changing password… |
| `reset-form.tsx` | Set new password | Setting password… |
| `sign-up-form.tsx` | Create account and join | Creating account… |
| `join-button.tsx` | Join this class | Joining… |
| `sign-out-button.tsx` | Sign out | Signing out… |
| `create-class-form.tsx` | Create | Creating… |
| `create-component-form.tsx` | Create component | Creating component… |
| `stage-dates-form.tsx` | Save dates | Saving dates… |
| `teacher-items.tsx` (form submit) | Save item | Saving… |
| `personal-item-form.tsx` | Save item | Saving… |

The ellipsis is the single character `…` (U+2026), as the checklist writes it.

- [ ] **Step 1: Failing specs.** In each spec, add one case that holds the request in flight and reads the button by its busy name. The shape, shown for `login-form.spec.tsx`:

```tsx
it("says it's signing in while the request is in flight", async () => {
  vi.mocked(api.send).mockReturnValue(new Promise(() => {}));
  render(<LoginForm />); // with the props the spec already passes
  await userEvent.type(screen.getByRole("textbox", { name: "Username" }), "a.student");
  await userEvent.type(screen.getByLabelText("Password"), "correct-horse-battery");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
});
```

Each other spec does the same with its own form's minimum valid input (copy it from that spec's existing success case) and its row of the table. `sign-out-button` and `join-button` mock whichever `api` method they call (`sendNoContent` or `send`).

- [ ] **Step 2: Run** `npx vitest run components/app` → 11 new FAILs, one per component.

- [ ] **Step 3: Implement.** In each component, replace the fixed label with a ternary, e.g. `login-form.tsx`:

```tsx
        <Button type="submit" size="form" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
```

- [ ] **Step 4: Run** `npx vitest run components/app` → PASS. Also run `grep -rn '"Sign in"\|"Save item"\|"Save dates"\|"Create component"' e2e` — the e2e journeys click buttons by their idle names, which is still correct because they click before the request starts.

- [ ] **Step 5: Commit.** `git commit -am "Show a present-participle label on submit buttons while busy"`

## Task A5: A failed submit focuses the alert

**Files:**
- Modify: `frontend/components/app/error-panel.tsx`; test `error-panel.spec.tsx`
- Modify: every client component that renders `<ErrorPanel` except `item-tick.tsx`: `change-password-form`, `class-students`, `create-class-form`, `create-component-form`, `join-button`, `login-form`, `personal-item-actions`, `personal-item-form`, `reset-form`, `sign-up-form` (both), `stage-dates-form`, `teacher-items`
- Test: `login-form.spec.tsx`, `personal-item-form.spec.tsx`, `stage-dates-form.spec.tsx` (one representative per form family; the prop is one line elsewhere)

**Interfaces:**
- Produces: `ErrorPanel` prop `focus?: boolean`.

- [ ] **Step 1: Failing panel spec.** In `error-panel.spec.tsx`:

```tsx
it("takes focus when asked, and again for a new error", () => {
  const first = new ApiError({ code: "VALIDATION_FAILED", status: 400, detail: "Check the date." });
  const { rerender } = render(<><button>Before</button><ErrorPanel error={first} focus /></>);
  expect(screen.getByRole("alert")).toHaveFocus();
  screen.getByRole("button", { name: "Before" }).focus();
  const second = new ApiError({ code: "VALIDATION_FAILED", status: 400, detail: "Check the title." });
  rerender(<><button>Before</button><ErrorPanel error={second} focus /></>);
  expect(screen.getByRole("alert")).toHaveFocus();
});

it("leaves focus alone by default", () => {
  render(<><button autoFocus>Stay</button><ErrorPanel error={new ApiError({ code: "NOT_FOUND", status: 404, detail: "No such class." })} /></>);
  expect(screen.getByRole("button", { name: "Stay" })).toHaveFocus();
});
```


- [ ] **Step 2: Run** `npx vitest run components/app/error-panel.spec.tsx` → FAIL.

- [ ] **Step 3: Implement.** Add `"use client";` as the first line of `error-panel.tsx`, then:

```tsx
import { useEffect, useRef } from "react";
…
  /** A client form passes this so a failed submit puts keyboard focus on the message (UI-STANDARDS §83).
      Pages that failed to load don't: after a navigation, focus belongs to the main content (§105). */
  focus?: boolean;
…
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus, error]);
…
    <section ref={ref} tabIndex={focus ? -1 : undefined} role="alert" … className={`… outline-none focus-visible:outline-2 …`}>
```

Keep the existing class list; add a visible focus style matching `UI-STANDARDS.md` §29 (never `outline-none` without a `focus-visible:` replacement on the same element).

- [ ] **Step 4: Run** the panel spec → PASS. Run `npx vitest run components/app` → still PASS (server pages don't render in these specs).

- [ ] **Step 5: Failing form spec.** In `login-form.spec.tsx` (and the same shape in `personal-item-form.spec.tsx`, `stage-dates-form.spec.tsx`):

```tsx
it("moves focus to the alert when sign-in fails", async () => {
  vi.mocked(api.send).mockRejectedValue(new ApiError({ code: "INVALID_CREDENTIALS", status: 401, detail: "Wrong username or password." }));
  render(<LoginForm />);
  // fill and submit exactly as the spec's existing failure case does
  expect(await screen.findByRole("alert")).toHaveFocus();
});
```

- [ ] **Step 6: Run** → FAIL. **Implement:** pass `focus` on every client `<ErrorPanel` listed above (`<ErrorPanel error={error} focus />`; `stage-dates-form` keeps its other props). **Run** `npx vitest run components/app` → PASS.

- [ ] **Step 7: Commit.** `git commit -am "Move focus to the alert when a submit fails"`

## Task A6: `ComponentService.owned`'s two checks, isolated

**Files:**
- Create: `backend/src/test/java/ie/coursework/components/application/ComponentServiceOwnedTest.java`

`owned` is package-private (`ComponentService.java:255`), so the test lives in the same package. It's a plain unit test: no Spring, no database.

- [ ] **Step 1: Write the test.**

```java
package ie.coursework.components.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ie.coursework.classes.adapter.persistence.ClassGroupRepository;
import ie.coursework.classes.adapter.persistence.SubjectRepository;
import ie.coursework.classes.application.ClassService;
import ie.coursework.components.adapter.persistence.BriefRepository;
import ie.coursework.components.adapter.persistence.ComponentRepository;
import ie.coursework.components.adapter.persistence.ItemTickRepository;
import ie.coursework.components.adapter.persistence.TeacherItemRepository;
import ie.coursework.components.adapter.persistence.TemplateRepository;
import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.Role;
import ie.coursework.identity.domain.RoleGrant;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Found reviewing 2D Task 7: owned() checks the component's own owner filter and ClassService.owned
 * independently. Real data can't fail only one (both filter by the class owner), so each is stubbed
 * to fail alone. Bite-test each case by deleting its check in owned().
 */
class ComponentServiceOwnedTest {

    private final ClassService classes = mock(ClassService.class);
    private final ComponentRepository components = mock(ComponentRepository.class);
    private final ComponentService service = new ComponentService(classes, mock(ClassGroupRepository.class),
            mock(SubjectRepository.class), mock(BriefRepository.class), mock(TemplateRepository.class), components,
            mock(TeacherItemRepository.class), mock(ItemTickRepository.class), Clock.systemUTC());

    private final UUID teacher = UUID.randomUUID();
    private final Actor actor = new Actor(teacher, List.of(new RoleGrant(UUID.randomUUID(), "School A", "SA", Role.TEACHER)));
    private final ComponentInstance component = new ComponentInstance(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());

    @Test
    void theClassCheckAloneRefuses() {
        when(components.findOwned(component.id(), teacher)).thenReturn(Optional.of(component));
        when(classes.owned(any(), any())).thenThrow(new DomainException(ErrorCode.NOT_FOUND, "No such class."));
        assertThatThrownBy(() -> service.owned(actor, component.id()))
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).errorCode()).isEqualTo(ErrorCode.NOT_FOUND);
    }

    @Test
    void theComponentOwnerFilterAloneRefuses() {
        when(components.findOwned(component.id(), teacher)).thenReturn(Optional.empty());
        when(classes.owned(any(), any())).thenReturn(null); // would pass
        assertThatThrownBy(() -> service.owned(actor, component.id()))
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).errorCode()).isEqualTo(ErrorCode.NOT_FOUND);
    }
}
```

Check the import packages of `ClassGroupRepository` and `SubjectRepository` against `ComponentService.java`'s imports and use those.

- [ ] **Step 2: Run** `./mvnw test -Dtest=ComponentServiceOwnedTest` → PASS (these guard existing behaviour).

- [ ] **Step 3: Bite-test each case.** Temporarily replace line 260 `ClassGroup group = classes.owned(actor, component.classId());` with `ClassGroup group = null;` → `theClassCheckAloneRefuses` FAILS (then `briefs.findPublished` on a mock returns empty and throws `IllegalStateException`, not `DomainException`). Restore. Temporarily make `findOwned(...)` fall back to a lookup that ignores the owner — e.g. replace `.orElseThrow(ComponentService::notFound)` with `.orElse(new ComponentInstance(componentId, UUID.randomUUID(), UUID.randomUUID()))` → `theComponentOwnerFilterAloneRefuses` FAILS. Restore. `git diff backend/src/main` must be empty afterwards.

- [ ] **Step 4: Commit.** `git add backend/src/test/java/ie/coursework/components/application && git commit -m "Test each of ComponentService.owned's two scope checks on its own"`.

## Task A7: Part A journey, gate and hand-over

**Files:**
- Modify: `frontend/e2e/phase2.e2e.ts`
- Create: `docs/changes/pilot-2g-phase2-follow-ups.md` (via the `write-changes` skill)
- Modify: `docs/HANDOFF.md`, `docs/PILOT-ROADMAP.md` §1 and §3 (Q-P2-E row: "built, plan pilot-3-the-log A1")

- [ ] **Step 1: Extend the journey.** In `phase2.e2e.ts`, in "a student sees the component and ticks a teacher item", replace `await expect(student.getByText("You ticked this")).toBeVisible();` with:

```ts
  await expect(student.getByText("You ticked this")).toBeVisible();
  await student.reload();
  await student.getByTestId("stage-list").getByText("Finalising the Biology in Practice Investigation Report").click();
  await expect(student.getByText(/^You ticked this · \d{1,2} [A-Z][a-z]{2} \d{4}$/)).toBeVisible();
```

(and drop the now-duplicated reload and click that follow). At the end of the timeline test, add:

```ts
  await student.goto("/home?view=list&from=2027-02-26");
  const completion = student.getByRole("list", { name: "Timeline items" }).getByRole("listitem").first();
  await expect(completion).toContainText("SEC completion date · Biology");
  await expectAccessible(student);
```

- [ ] **Step 2: Run the gate.** `make verify` then `make e2e`. Both must be green; paste the summary lines (backend test count, `node:test` and Vitest counts, `10/10`-style e2e result) into the task report. If Docker isn't available, run `cd frontend && npm run lint && npm run typecheck && npm test && npm run build` and record that backend and e2e did not run.

- [ ] **Step 3: Commit** the journey: `git commit -am "Extend the Phase 2 journey: completion date and dated tick"`.

- [ ] **Step 4: Stop for review.** Tell Tim Part A is ready for `/self-review` in a fresh session (diff base `pilotMain`). Fix or record every finding before continuing.

- [ ] **Step 5: Changes doc.** Run the `write-changes` skill with slug `pilot-2g-phase2-follow-ups`; commit `docs/changes/pilot-2g-phase2-follow-ups.md` on the branch.

- [ ] **Step 6: Docs.** `HANDOFF.md`: remove the five "Not done" bullets Part A fixed (the two `UI-CHECKLIST.md` items — busy labels and alert focus — `ComponentService.owned`, the `TeacherItems` draft, the D-3 tick date); record Part A as built with the verification output. Roadmap §3: Q-P2-E row "built". Commit: `git commit -am "Record Part A of pilot-3-the-log as built"`.

- [ ] **Step 7: Merge.** Offer Tim the `superpowers:finishing-a-development-branch` options. On his yes, merge into `pilotMain` locally (`git checkout pilotMain && git merge --no-ff pilot/2g-phase2-follow-ups -m "Merge pilot/2g-phase2-follow-ups: Phase 2 follow-ups"`). Confirm before any push.

### Part A gate

- [ ] `make verify` green
- [ ] `make e2e` green on `laptop` and `phone`, axe clean; the journey asserts the completion-date row and the dated tick line
- [ ] `/self-review` in a fresh session; findings fixed or recorded
- [ ] `docs/changes/pilot-2g-phase2-follow-ups.md` committed on the branch; merged into `pilotMain`

---
# Part B — Phase 3, the log

**Before you start:** Part A is merged. `git checkout pilotMain && git checkout -b pilot/3-the-log`. `make verify` green; note the counts. Migration number: `V11`. Read `ARCHITECTURE.md` §4 (the personal-item bullet), §5, §6 and §7 (the add-a-feature recipe), and `timeline/` end to end — the log copies its owner-scoped shape.

**One deviation from the spec, decided while planning (P3-17):** the spec's `NoFields` record is dropped. A `NOTE` stores `fields` as SQL `NULL` and returns `"fields": null`. Reason: Jackson refuses to serialise a record with no properties by default (`FAIL_ON_EMPTY_BEANS`), and `null` says "this kind has no fields" more plainly than `{}`. `EntryFields` therefore permits two records. Update the spec's 3A table in the same commit as Task B2.

## Task B1: The D-6 Claude Design prompt

**Files:**
- Create: `docs/design/prompts/D-6-log.md`
- Modify: `docs/design/prompts/README.md` (D-6 row: "prompt written")

Written first so Claude Design can work while the code is built. Follow `D-5-teacher-component-setup.md`'s structure: an editor's note (what to attach), sources, then the prompt below the line.

- [ ] **Step 1: Write the prompt.** Content, in this order:
  1. **Attach:** `docs/design/UI-BRIEF.md`; `docs/design/pilot/D-1-app-shell-auth/tokens.css`; screenshots of D-3's `/components/[id]` (the tab row) and D-2's Students tab.
  2. **Sources line:** roadmap §6.2 (the three `/components/[id]/log…` rows and `/teach/classes/[id]/students/[studentId]`), §7 Phase 3; design §6.6, §6.7, §8.5; FR-24a–e (`docs/newDevelopement/FUNCTIONAL-SPEC.md`); SEC Rules Appendix 2 §4 (p. 34). Needed for milestone **3B/3C**.
  3. **Opening:** same Navy direction as D-1 to D-5; build on the tokens; **two or three directions** for the log list at 390px first (students use phones), then every state at 390px and 1140px.
  4. **What the student is doing:** keeping a dated trail of their project — notes, sources they used, and every use of an AI tool — that proves the work is theirs. Dates are set by the server and can't be changed; an edit adds a revision and keeps the old one; nothing is deleted.
  5. **The three kinds and their fields,** with the field labels from Task B7's `FIELD_LABELS` (paste the table), marking required fields. Online source types need a link and a date accessed.
  6. **Visibility (the page's most important job):** new entries are visible to the teacher by default; hiding or showing is **one tap** on the list; at the moment of writing the form says, in words, "Your teacher can read this." or "Only you can read this. Your teacher sees that you made an entry on 3 March." A hidden entry must look different from a visible one without relying on colour.
  7. **Pages and states** — student: log list (empty; mixed visible and hidden; an edited entry), new entry (each kind; validation errors on a field; a refused non-https link), entry detail (history of 3 revisions; revise form). Teacher `/teach/classes/[id]/students/[studentId]`: visible entries with "edited" and expandable history; a hidden entry as one line "Hidden by the student on 3 Mar"; a private-from-the-start entry "Private entry · 3 Mar"; no entries; the class has no component yet.
  8. **Constraints:** role-and-name-queryable controls (existing specs rely on names like "Save entry", "Hide … from your teacher"); 44px touch targets; focus visible; one `h1` per page; no colour-only meaning; links open with `rel="noopener noreferrer"`.
  9. **Deliverable:** a `NOTES.md` answering open questions, `tokens.css` additions (with contrast ratios), frame HTML per state, saved as `docs/design/pilot/D-6-log/`.

- [ ] **Step 2: Commit.** `git add docs/design/prompts && git commit -m "Write the D-6 Claude Design prompt for the log"`. Tell Tim it's ready to paste.

## Task B2: Kinds, fields and their rules (domain)

**Files:**
- Create: `backend/src/main/java/ie/coursework/log/domain/EntryKind.java`, `SourceType.java`, `EntryFields.java`, `SourceFields.java`, `AiUseFields.java`, `HttpsLink.java`, `LogContent.java`
- Test: `backend/src/test/java/ie/coursework/log/domain/HttpsLinkTest.java`, `LogContentTest.java`
- Modify: `docs/superpowers/specs/2026-09-27-pilot-3-the-log-design.md` (P3-17)

**Interfaces:**
- Produces:
  - `enum EntryKind { NOTE, SOURCE, AI_USE; Class<? extends EntryFields> fieldsType() }` — `null` for `NOTE`
  - `enum SourceType { BOOK, NEWSPAPER_OR_MAGAZINE, ONLINE_TEXT_OR_IMAGE, ONLINE_AUDIO, ONLINE_VIDEO, OTHER; boolean online() }`
  - `sealed interface EntryFields permits SourceFields, AiUseFields`
  - `record SourceFields(SourceType type, String title, String author, String publication, String datePublished, String url, LocalDate dateAccessed, String locator, String keyInformation, String relevance, String reflections)`
  - `record AiUseFields(String toolNameAndVersion, String developer, LocalDate dateGenerated, String howUsed, String prompts, String shareUrl)`
  - `HttpsLink.valid(String) -> boolean`
  - `LogContent.problems(EntryKind kind, String body, EntryFields fields) -> List<FieldError>`; constants `BODY_MAX = 4000`, `SHORT_MAX = 500`, `LONG_MAX = 4000`

- [ ] **Step 1: Failing tests.**

```java
package ie.coursework.log.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class HttpsLinkTest {

    @Test
    void acceptsAbsoluteHttpsWithAHost() {
        assertThat(HttpsLink.valid("https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/")).isTrue();
        assertThat(HttpsLink.valid("https://chat.openai.com/share/f45a1e23-2217-4443-a244-d56ab26ae940")).isTrue();
    }

    @Test
    void refusesEverythingElse() {
        assertThat(HttpsLink.valid("http://youtu.be/yCv4iyPqZKQ")).isFalse();
        assertThat(HttpsLink.valid("javascript:alert(1)")).isFalse();
        assertThat(HttpsLink.valid("https://")).isFalse();
        assertThat(HttpsLink.valid("thelatinlibrary.com/101/RhetoricalDevices")).isFalse();
        assertThat(HttpsLink.valid("https://exa mple.com")).isFalse();
        assertThat(HttpsLink.valid(null)).isFalse();
    }
}
```

```java
package ie.coursework.log.domain;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.shared.error.FieldError;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class LogContentTest {

    private static SourceFields book(String title) {
        return new SourceFields(SourceType.BOOK, title, "McLeskey, J.", null, "2013", null, null, "p. 57", null, null, null);
    }

    private static SourceFields online(String url, LocalDate accessed) {
        return new SourceFields(SourceType.ONLINE_VIDEO, "Zig & Zag – Christmas crises", "ApintTurtle", null, "20/12/2008",
                url, accessed, "3:20 to 5:45", null, null, null);
    }

    private static AiUseFields ai(String tool, String developer, LocalDate date, String howUsed, String shareUrl) {
        return new AiUseFields(tool, developer, date, howUsed, null, shareUrl);
    }

    @Test
    void aNoteNeedsABodyAndNoFields() {
        assertThat(LogContent.problems(EntryKind.NOTE, "Ran the pilot titration today.", null)).isEmpty();
        assertThat(LogContent.problems(EntryKind.NOTE, "  ", null)).extracting(FieldError::field).containsExactly("body");
        assertThat(LogContent.problems(EntryKind.NOTE, "x", book("A book"))).extracting(FieldError::field).containsExactly("fields");
    }

    @Test
    void theBodyIsCappedAt4000Characters() {
        assertThat(LogContent.problems(EntryKind.NOTE, "a".repeat(4000), null)).isEmpty();
        assertThat(LogContent.problems(EntryKind.NOTE, "a".repeat(4001), null)).extracting(FieldError::field).containsExactly("body");
    }

    @Test
    void aSourceNeedsItsTypeAndTitle() {
        assertThat(LogContent.problems(EntryKind.SOURCE, null, book("Inclusion: effective practice for all students?"))).isEmpty();
        assertThat(LogContent.problems(EntryKind.SOURCE, null, book(" "))).extracting(FieldError::field).containsExactly("fields.title");
        assertThat(LogContent.problems(EntryKind.SOURCE, null, null)).extracting(FieldError::field).containsExactly("fields");
    }

    @Test
    void anOnlineSourceNeedsAnHttpsLinkAndTheDateAccessed() {
        assertThat(LogContent.problems(EntryKind.SOURCE, null, online("https://youtu.be/yCv4iyPqZKQ", LocalDate.of(2024, 12, 12)))).isEmpty();
        assertThat(LogContent.problems(EntryKind.SOURCE, null, online(null, null)))
                .extracting(FieldError::field).containsExactly("fields.url", "fields.dateAccessed");
        assertThat(LogContent.problems(EntryKind.SOURCE, null, online("http://youtu.be/yCv4iyPqZKQ", LocalDate.of(2024, 12, 12))))
                .extracting(FieldError::message).containsExactly("must be a full https:// link");
    }

    @Test
    void anOfflineSourceMayStillCarryALinkButOnlyAnHttpsOne() {
        SourceFields withBadLink = new SourceFields(SourceType.BOOK, "A book", null, null, null, "ftp://x", null, null, null, null, null);
        assertThat(LogContent.problems(EntryKind.SOURCE, null, withBadLink)).extracting(FieldError::field).containsExactly("fields.url");
    }

    @Test
    void anAiUseNeedsTheFourMinimumDetails() {
        // SEC Coursework Rules and Procedures 2025-2026, Appendix 2 §4, p. 34.
        assertThat(LogContent.problems(EntryKind.AI_USE, null,
                ai("ChatGPT-4", "OpenAI", LocalDate.of(2025, 2, 14), "Used to suggest possible project themes.", null))).isEmpty();
        assertThat(LogContent.problems(EntryKind.AI_USE, null, ai(null, "", null, " ", null)))
                .extracting(FieldError::field)
                .containsExactly("fields.toolNameAndVersion", "fields.developer", "fields.dateGenerated", "fields.howUsed");
        assertThat(LogContent.problems(EntryKind.AI_USE, null,
                ai("ChatGPT-4", "OpenAI", LocalDate.of(2025, 2, 14), "Brainstorming", "chat.openai.com/share/x")))
                .extracting(FieldError::field).containsExactly("fields.shareUrl");
    }

    @Test
    void shortFieldsAreCappedAt500AndPromptsAt4000() {
        AiUseFields longTool = new AiUseFields("t".repeat(501), "OpenAI", LocalDate.of(2025, 2, 14), "x", "p".repeat(4000), null);
        assertThat(LogContent.problems(EntryKind.AI_USE, null, longTool)).extracting(FieldError::field)
                .containsExactly("fields.toolNameAndVersion");
        AiUseFields longPrompts = new AiUseFields("ChatGPT-4", "OpenAI", LocalDate.of(2025, 2, 14), "x", "p".repeat(4001), null);
        assertThat(LogContent.problems(EntryKind.AI_USE, null, longPrompts)).extracting(FieldError::field)
                .containsExactly("fields.prompts");
    }

    @Test
    void fieldsMustMatchTheKind() {
        assertThat(LogContent.problems(EntryKind.AI_USE, null, book("A book"))).extracting(FieldError::field).containsExactly("fields");
    }
}
```

- [ ] **Step 2: Run** `./mvnw test -Dtest='HttpsLinkTest,LogContentTest'` → FAIL (classes missing).

- [ ] **Step 3: Implement.**

```java
package ie.coursework.log.domain;

/** Design §6.6: one trail, three kinds. The kind is fixed when an entry is created. */
public enum EntryKind {
    NOTE(null),
    SOURCE(SourceFields.class),
    AI_USE(AiUseFields.class);

    private final Class<? extends EntryFields> fieldsType;

    EntryKind(Class<? extends EntryFields> fieldsType) {
        this.fieldsType = fieldsType;
    }

    /** The record this kind's {@code fields} must be; null for a note, which has none. */
    public Class<? extends EntryFields> fieldsType() {
        return fieldsType;
    }
}
```

```java
package ie.coursework.log.domain;

/** The NCCA's example headings (NCCA-BIO p. 15-16), plus OTHER for journals, reports and organisations. */
public enum SourceType {
    BOOK, NEWSPAPER_OR_MAGAZINE, ONLINE_TEXT_OR_IMAGE, ONLINE_AUDIO, ONLINE_VIDEO, OTHER;

    /** "Where students wish to refer to an internet site or online source … the hyperlink and date read or downloaded." */
    public boolean online() {
        return name().startsWith("ONLINE_");
    }
}
```

```java
package ie.coursework.log.domain;

/**
 * A kind's own details, stored as one jsonb column (plan pilot-3-the-log P3-6). Sealed, so a switch over it
 * must handle every kind. A note has no fields: it stores null (P3-17).
 */
public sealed interface EntryFields permits SourceFields, AiUseFields {}
```

```java
package ie.coursework.log.domain;

import java.time.LocalDate;

/**
 * NCCA referencing guidance (NCCA-BIO p. 15-16; NCCA-BUS p. 21) and Business Appendix Three's prompts
 * (NCCA-BUS p. 19). LogFieldSourcesTest checks each field's phrase on its page.
 */
public record SourceFields(SourceType type, String title, String author, String publication, String datePublished,
        String url, LocalDate dateAccessed, String locator, String keyInformation, String relevance, String reflections)
        implements EntryFields {}
```

```java
package ie.coursework.log.domain;

import java.time.LocalDate;

/** SEC Coursework Rules and Procedures 2025-2026, Appendix 2 §4 "Minimum acknowledgment requirements", p. 34. */
public record AiUseFields(String toolNameAndVersion, String developer, LocalDate dateGenerated, String howUsed,
        String prompts, String shareUrl) implements EntryFields {}
```

```java
package ie.coursework.log.domain;

import java.net.URI;
import java.net.URISyntaxException;

/** Design §9: links are https only. Stored and shown, never fetched by the server. */
public final class HttpsLink {

    private HttpsLink() {}

    public static boolean valid(String value) {
        if (value == null) {
            return false;
        }
        try {
            URI uri = new URI(value.strip());
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null && !uri.getHost().isBlank();
        } catch (URISyntaxException e) {
            return false;
        }
    }
}
```

```java
package ie.coursework.log.domain;

import ie.coursework.shared.error.FieldError;
import java.util.ArrayList;
import java.util.List;

/** What makes an entry's body and fields acceptable. Field keys match the request's JSON paths. */
public final class LogContent {

    public static final int BODY_MAX = 4000;
    public static final int SHORT_MAX = 500;
    public static final int LONG_MAX = 4000;

    private LogContent() {}

    public static List<FieldError> problems(EntryKind kind, String body, EntryFields fields) {
        List<FieldError> problems = new ArrayList<>();
        if (body != null && body.length() > BODY_MAX) {
            problems.add(new FieldError("body", "must be at most " + BODY_MAX + " characters"));
        }
        switch (kind) {
            case NOTE -> {
                if (blank(body)) problems.add(new FieldError("body", "write something"));
                if (fields != null) problems.add(new FieldError("fields", "a note has no fields"));
            }
            case SOURCE -> {
                if (fields instanceof SourceFields source) source(source, problems);
                else problems.add(new FieldError("fields", "a source needs its details"));
            }
            case AI_USE -> {
                if (fields instanceof AiUseFields ai) aiUse(ai, problems);
                else problems.add(new FieldError("fields", "an AI use needs its details"));
            }
        }
        return problems;
    }

    private static void source(SourceFields s, List<FieldError> problems) {
        if (s.type() == null) problems.add(new FieldError("fields.type", "choose a type"));
        required("fields.title", s.title(), problems);
        if (s.type() != null && s.type().online()) {
            required("fields.url", s.url(), problems);
            if (s.dateAccessed() == null) problems.add(new FieldError("fields.dateAccessed", "required for an online source"));
        }
        link("fields.url", s.url(), problems);
        capped("fields.author", s.author(), SHORT_MAX, problems);
        capped("fields.publication", s.publication(), SHORT_MAX, problems);
        capped("fields.datePublished", s.datePublished(), SHORT_MAX, problems);
        capped("fields.locator", s.locator(), SHORT_MAX, problems);
        capped("fields.keyInformation", s.keyInformation(), LONG_MAX, problems);
        capped("fields.relevance", s.relevance(), LONG_MAX, problems);
        capped("fields.reflections", s.reflections(), LONG_MAX, problems);
    }

    private static void aiUse(AiUseFields a, List<FieldError> problems) {
        required("fields.toolNameAndVersion", a.toolNameAndVersion(), problems);
        required("fields.developer", a.developer(), problems);
        if (a.dateGenerated() == null) problems.add(new FieldError("fields.dateGenerated", "required"));
        required("fields.howUsed", a.howUsed(), problems);
        capped("fields.prompts", a.prompts(), LONG_MAX, problems);
        link("fields.shareUrl", a.shareUrl(), problems);
    }

    /** Required and, when present, within SHORT_MAX — except howUsed, which is a description. */
    private static void required(String field, String value, List<FieldError> problems) {
        if (blank(value)) {
            problems.add(new FieldError(field, "required"));
        } else {
            capped(field, value, field.equals("fields.howUsed") ? LONG_MAX : SHORT_MAX, problems);
        }
    }

    private static void capped(String field, String value, int max, List<FieldError> problems) {
        if (value != null && value.length() > max) {
            problems.add(new FieldError(field, "must be at most " + max + " characters"));
        }
    }

    private static void link(String field, String value, List<FieldError> problems) {
        if (!blank(value) && !HttpsLink.valid(value) && problems.stream().noneMatch(p -> p.field().equals(field))) {
            problems.add(new FieldError(field, "must be a full https:// link"));
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
```

- [ ] **Step 4: Run** → PASS. Check `aNoteNeedsABodyAndNoFields`' first assertion order and the online-source order match (`url` before `dateAccessed`); if not, reorder the checks, not the test.

- [ ] **Step 5: Spec note.** In the spec's 3A per-kind table, change the `NOTE` row's Optional cell to "— (`fields` is null; P3-17)" and replace `permits NoFields, SourceFields, AiUseFields` with `permits SourceFields, AiUseFields`.

- [ ] **Step 6: Commit.** `git add backend/src/main/java/ie/coursework/log backend/src/test/java/ie/coursework/log docs/superpowers/specs && git commit -m "Add the log's entry kinds, per-kind fields and their rules"`

## Task B3: `V11__log.sql` — tables and append-only guards

**Files:**
- Create: `backend/src/main/resources/db/migration/V11__log.sql`
- Test: `backend/src/test/java/ie/coursework/log/adapter/persistence/LogSchemaTest.java`

- [ ] **Step 1: Failing test.**

```java
package ie.coursework.log.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

/** Design §6.6: the server sets created_at once; revisions and visibility changes are never updated or deleted. */
class LogSchemaTest extends PostgresIntegrationTest {

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private UUID entry;

    @BeforeEach
    void anEntryWithOneRevisionAndOneChange() {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        entry = jdbcTemplate.queryForObject("""
                INSERT INTO log_entry (instance_id, student_user_id, kind, created_at)
                VALUES (?, ?, 'NOTE', now()) RETURNING id
                """, UUID.class, component, world.approvedStudent());
        jdbcTemplate.update("INSERT INTO log_entry_revision (entry_id, revision_no, body, created_at) VALUES (?, 1, 'First', now())", entry);
        jdbcTemplate.update("INSERT INTO log_visibility_change (entry_id, visible, changed_at) VALUES (?, false, now())", entry);
    }

    @Test
    void newEntriesAreVisibleAndOnTheirFirstRevision() {
        assertThat(jdbcTemplate.queryForObject("SELECT visible_to_teacher FROM log_entry WHERE id = ?", Boolean.class, entry)).isTrue();
        assertThat(jdbcTemplate.queryForObject("SELECT current_revision FROM log_entry WHERE id = ?", Integer.class, entry)).isEqualTo(1);
    }

    @Test
    void revisionsCantBeChangedOrDeleted() {
        assertRefused("UPDATE log_entry_revision SET body = 'Rewritten' WHERE entry_id = ?");
        assertRefused("DELETE FROM log_entry_revision WHERE entry_id = ?");
    }

    @Test
    void visibilityChangesCantBeChangedOrDeleted() {
        assertRefused("UPDATE log_visibility_change SET visible = true WHERE entry_id = ?");
        assertRefused("DELETE FROM log_visibility_change WHERE entry_id = ?");
    }

    @Test
    void anEntrysIdentityAndCreationTimeAreFrozen() {
        assertRefused("UPDATE log_entry SET created_at = created_at - interval '3 days' WHERE id = ?");
        assertRefused("UPDATE log_entry SET kind = 'SOURCE' WHERE id = ?");
        assertRefused("DELETE FROM log_entry WHERE id = ?");
    }

    @Test
    void onlyVisibilityAndCurrentRevisionMayChange() {
        jdbcTemplate.update("UPDATE log_entry SET visible_to_teacher = false, current_revision = 2 WHERE id = ?", entry);
        assertThat(jdbcTemplate.queryForObject("SELECT visible_to_teacher FROM log_entry WHERE id = ?", Boolean.class, entry)).isFalse();
        assertRefused("UPDATE log_entry SET current_revision = 1 WHERE id = ?");
    }

    @Test
    void theKindMustBeOneOfThree() {
        assertThatThrownBy(() -> jdbcTemplate.update("UPDATE log_entry SET kind = 'DIARY' WHERE id = ?", entry))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private void assertRefused(String sql) {
        assertThatThrownBy(() -> jdbcTemplate.update(sql, entry))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("append-only");
    }
}
```

`theKindMustBeOneOfThree` may trip the trigger before the CHECK; either is a `DataIntegrityViolationException`, which is all it asserts.

- [ ] **Step 2: Run** `./mvnw test -Dtest=LogSchemaTest` → FAIL (`relation "log_entry" does not exist`).

- [ ] **Step 3: Write the migration.**

```sql
-- Phase 3 (design §6.6): a student's dated, versioned log per component. Keyed on student and component,
-- not enrolment (the item_tick choice, review issue #3). Append-only: nothing here is ever deleted, and only
-- an entry's visibility and current revision ever change. Erasure goes through the school (design §6.6);
-- the operator procedure for it (roadmap R8) will need to lift these triggers deliberately.

CREATE TABLE log_entry (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id        uuid        NOT NULL REFERENCES component_instance (id),
    student_user_id    uuid        NOT NULL REFERENCES app_user (id),
    kind               text        NOT NULL CHECK (kind IN ('NOTE', 'SOURCE', 'AI_USE')),
    created_at         timestamptz NOT NULL,
    visible_to_teacher boolean     NOT NULL DEFAULT true,
    current_revision   integer     NOT NULL DEFAULT 1 CHECK (current_revision >= 1)
);
CREATE INDEX log_entry_list_idx ON log_entry (instance_id, student_user_id, created_at DESC);

CREATE TABLE log_entry_revision (
    entry_id    uuid        NOT NULL REFERENCES log_entry (id),
    revision_no integer     NOT NULL CHECK (revision_no >= 1),
    body        text        CHECK (length(body) <= 4000),
    fields      jsonb,
    created_at  timestamptz NOT NULL,
    PRIMARY KEY (entry_id, revision_no)
);

CREATE TABLE log_visibility_change (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id   uuid        NOT NULL REFERENCES log_entry (id),
    visible    boolean     NOT NULL,
    changed_at timestamptz NOT NULL
);
CREATE INDEX log_visibility_change_entry_idx ON log_visibility_change (entry_id, changed_at DESC);

CREATE FUNCTION log_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '% is append-only: rows are never updated or deleted', TG_TABLE_NAME
        USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER log_entry_revision_append_only BEFORE UPDATE OR DELETE ON log_entry_revision
    FOR EACH ROW EXECUTE FUNCTION log_append_only();
CREATE TRIGGER log_visibility_change_append_only BEFORE UPDATE OR DELETE ON log_visibility_change
    FOR EACH ROW EXECUTE FUNCTION log_append_only();

-- An entry's identity and creation time are frozen; its revision number only moves forward.
CREATE FUNCTION log_entry_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE'
       OR NEW.id <> OLD.id OR NEW.instance_id <> OLD.instance_id OR NEW.student_user_id <> OLD.student_user_id
       OR NEW.kind <> OLD.kind OR NEW.created_at <> OLD.created_at
       OR NEW.current_revision < OLD.current_revision THEN
        RAISE EXCEPTION 'log_entry is append-only: only visible_to_teacher and a forward current_revision may change'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER log_entry_guard BEFORE UPDATE OR DELETE ON log_entry
    FOR EACH ROW EXECUTE FUNCTION log_entry_guard();
```

Row triggers don't fire on `TRUNCATE`, so `PostgresIntegrationTest`'s reset still clears these tables; they are app tables, so they stay out of `PRESERVED_TABLES`.

- [ ] **Step 4: Run** `./mvnw test -Dtest='LogSchemaTest,ContentResetPolicyTest'` → PASS.

- [ ] **Step 5: Docs.** `ARCHITECTURE.md` §5: add a `log` bullet — "`V11__log.sql`: `log_entry` (student + component, kind, server-set `created_at`, `visible_to_teacher`, `current_revision`), `log_entry_revision` (PK `entry_id, revision_no`; `fields jsonb`, null for a note), `log_visibility_change`. Triggers make revisions and visibility changes append-only and freeze an entry's identity and creation time; row triggers don't fire on `TRUNCATE`, so the test reset is unaffected."

- [ ] **Step 6: Commit.** `git add backend/src/main/resources/db/migration/V11__log.sql backend/src/test/java/ie/coursework/log docs/ARCHITECTURE.md && git commit -m "Add the log tables with append-only guards (V11)"`

## Task B4: Every field's source, checked on its page

**Files:**
- Modify: `backend/src/test/java/ie/coursework/content/SourceDocuments.java:28-36`
- Create: `backend/src/test/java/ie/coursework/content/LogFieldSourcesTest.java`

- [ ] **Step 1: Failing test.**

```java
package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The log's SOURCE and AI_USE fields are code, not content rows, so SourceTextTest can't see them. Each field
 * is paired here with the phrase it comes from; the phrase must be on the cited page. Never reword a phrase
 * to make this pass: fix the field instead.
 */
class LogFieldSourcesTest {

    record FieldSource(String field, String sourceRef, String phrase) {}

    static List<FieldSource> fields() {
        return List.of(
                new FieldSource("SourceType.BOOK", "NCCA-BIO p. 15", "Book:"),
                new FieldSource("SourceType.NEWSPAPER_OR_MAGAZINE", "NCCA-BIO p. 15", "Newspaper/magazine article:"),
                new FieldSource("SourceType.ONLINE_TEXT_OR_IMAGE", "NCCA-BIO p. 15", "Text/image accessed online:"),
                new FieldSource("SourceType.ONLINE_AUDIO", "NCCA-BIO p. 15", "Audio accessed online:"),
                new FieldSource("SourceType.ONLINE_VIDEO", "NCCA-BIO p. 15", "Video accessed online:"),
                new FieldSource("SourceFields.author", "NCCA-BIO p. 15", "they should give the author's name"),
                new FieldSource("SourceFields.title", "NCCA-BIO p. 15", "the title of the publication"),
                new FieldSource("SourceFields.datePublished", "NCCA-BIO p. 15", "year of publication"),
                new FieldSource("SourceFields.locator", "NCCA-BIO p. 15", "the page number or chapter/section of the publication"),
                new FieldSource("SourceFields.publication", "NCCA-BIO p. 16", "Irish Examiner"),
                new FieldSource("SourceFields.url", "NCCA-BIO p. 15", "including the hyperlink and date read or downloaded"),
                new FieldSource("SourceFields.url (Business)", "NCCA-BUS p. 21", "including the hyperlink and date read or downloaded"),
                new FieldSource("SourceFields.dateAccessed", "NCCA-BUS p. 19", "Date accessed:"),
                new FieldSource("SourceFields.keyInformation", "NCCA-BUS p. 19", "Key information"),
                new FieldSource("SourceFields.relevance", "NCCA-BUS p. 19", "How and why this is relevant to my question"),
                new FieldSource("SourceFields.reflections", "NCCA-BUS p. 19", "My reflections/thoughts on this"),
                new FieldSource("AiUseFields.toolNameAndVersion", "SEC-RULES p. 34", "The name and version of the AI tool used"),
                new FieldSource("AiUseFields.developer", "SEC-RULES p. 34", "The developer or publisher of the AI tool"),
                new FieldSource("AiUseFields.dateGenerated", "SEC-RULES p. 34", "The date the AI output was generated"),
                new FieldSource("AiUseFields.howUsed", "SEC-RULES p. 34", "A brief description of how the AI tool was used"),
                new FieldSource("AiUseFields.prompts", "SEC-RULES p. 34", "Where applicable, candidates must include the prompt(s) used to generate the output from the AI tool"),
                new FieldSource("AiUseFields.shareUrl", "SEC-RULES p. 34", "If the tool generates a shareable URL or session link, this should also be included in the appendix"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("fields")
    void eachFieldsPhraseIsOnItsPage(FieldSource f) {
        SourceRef ref = SourceRef.parse(f.sourceRef());
        assertThat(SourceDocuments.startsOnPage(ref, f.phrase()))
                .as("%s: \"%s\" not on %s; found on printed pages %s", f.field(), f.phrase(), f.sourceRef(),
                        SourceDocuments.printedPagesContaining(ref.key(), f.phrase()))
                .isTrue();
    }
}
```

- [ ] **Step 2: Run** `./mvnw test -Dtest=LogFieldSourcesTest` → the six `SEC-RULES` cases FAIL with "Unknown source document: SEC-RULES"; every NCCA case passes. If an NCCA case fails, read the failure's "found on printed pages" and fix the **page** — never the phrase.

- [ ] **Step 3: Add the source.** In `SourceDocuments.SOURCES`, switch `Map.of` to `Map.ofEntries` if the entry count exceeds ten, and add:

```java
            Map.entry("SEC-RULES", new Source("Coursework Rules and Procedures For 2025_2026.pdf", 0)),
```

(the Rules' printed page numbers equal their PDF page numbers). If `SourceDocumentsTest` lists every key, add `SEC-RULES` there too.

- [ ] **Step 4: Run** `./mvnw test -Dtest='LogFieldSourcesTest,SourceDocumentsTest,SourceTextTest'` → PASS.

- [ ] **Step 5: Commit.** `git add backend/src/test/java/ie/coursework/content && git commit -m "Check every log field against the SEC or NCCA page it comes from"`

## Task B5: `LogRepository`

**Files:**
- Create: `backend/src/main/java/ie/coursework/log/domain/LogEntry.java`, `LogRevision.java`
- Create: `backend/src/main/java/ie/coursework/log/adapter/persistence/LogRepository.java`
- Test: `backend/src/test/java/ie/coursework/log/adapter/persistence/LogRepositoryTest.java`

**Interfaces:**
- Consumes: `EntryKind`, `EntryFields`, `SourceFields`, `AiUseFields` (B2); `V11` (B3).
- Produces:
  - `record LogEntry(UUID id, UUID componentId, EntryKind kind, Instant createdAt, boolean visibleToTeacher, int revisionCount, Instant editedAt, String body, EntryFields fields)` — `editedAt` null while there's one revision
  - `record LogRevision(int number, String body, EntryFields fields, Instant createdAt)`
  - `LogRepository`:
    - `UUID create(UUID componentId, UUID studentId, EntryKind kind, boolean visible, String body, EntryFields fields, Instant now)`
    - `List<LogEntry> list(UUID componentId, UUID studentId)` — newest first
    - `Optional<LogEntry> findOwn(UUID entryId, UUID studentId)` — owner **and** approved in the entry's class
    - `List<LogRevision> revisions(UUID entryId)` — newest first
    - `int addRevision(UUID entryId, String body, EntryFields fields, Instant now)` — returns the new number
    - `boolean setVisibility(UUID entryId, boolean visible, Instant now)` — false when unchanged
    - `Map<UUID, Instant> hiddenAt(UUID componentId, UUID studentId)` — for each currently hidden entry that has a change to hidden, its latest one
    - `Map<UUID, List<LogRevision>> visibleHistory(UUID componentId, UUID studentId)` — revisions of **visible** entries only

- [ ] **Step 1: Failing test.**

```java
package ie.coursework.log.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.log.domain.AiUseFields;
import ie.coursework.log.domain.EntryKind;
import ie.coursework.log.domain.LogEntry;
import ie.coursework.log.domain.SourceFields;
import ie.coursework.log.domain.SourceType;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class LogRepositoryTest extends PostgresIntegrationTest {

    private static final Instant T0 = Instant.parse("2026-10-05T09:00:00Z");

    @Autowired private LogRepository log;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private UUID component;

    @BeforeEach
    void seed() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
    }

    @Test
    void createsAndListsNewestFirstWithFieldsRoundTripped() {
        SourceFields book = new SourceFields(SourceType.BOOK, "Inclusion", "McLeskey, J.", null, "2013", null, null, "p. 57", null, null, null);
        UUID first = log.create(component, world.approvedStudent(), EntryKind.SOURCE, true, null, book, T0);
        UUID second = log.create(component, world.approvedStudent(), EntryKind.NOTE, false, "Pilot run", null, T0.plusSeconds(60));

        assertThat(log.list(component, world.approvedStudent())).extracting(LogEntry::id).containsExactly(second, first);
        LogEntry source = log.findOwn(first, world.approvedStudent()).orElseThrow();
        assertThat(source.fields()).isEqualTo(book);
        assertThat(source.createdAt()).isEqualTo(T0);
        assertThat(source.revisionCount()).isEqualTo(1);
        assertThat(source.editedAt()).isNull();
        assertThat(log.findOwn(second, world.approvedStudent()).orElseThrow().visibleToTeacher()).isFalse();
    }

    @Test
    void findOwnIsTheOwnerOnlyAndOnlyWhileApproved() {
        UUID entry = log.create(component, world.approvedStudent(), EntryKind.NOTE, true, "Mine", null, T0);
        assertThat(log.findOwn(entry, world.pendingStudent())).isEmpty();
        assertThat(log.findOwn(entry, world.teacher1())).isEmpty();
        jdbcTemplate.update("UPDATE enrolment SET status = 'REMOVED' WHERE id = ?", world.approvedEnrolment());
        assertThat(log.findOwn(entry, world.approvedStudent())).isEmpty();
    }

    @Test
    void revisionsAppendAndMoveTheCurrentOne() {
        UUID entry = log.create(component, world.approvedStudent(), EntryKind.NOTE, true, "v1", null, T0);
        assertThat(log.addRevision(entry, "v2", null, T0.plusSeconds(3600))).isEqualTo(2);

        LogEntry current = log.findOwn(entry, world.approvedStudent()).orElseThrow();
        assertThat(current.body()).isEqualTo("v2");
        assertThat(current.revisionCount()).isEqualTo(2);
        assertThat(current.editedAt()).isEqualTo(T0.plusSeconds(3600));
        assertThat(current.createdAt()).isEqualTo(T0);
        assertThat(log.revisions(entry)).extracting(r -> r.body()).containsExactly("v2", "v1");
    }

    @Test
    void visibilityChangesAreRecordedOnlyWhenTheyChangeSomething() {
        UUID entry = log.create(component, world.approvedStudent(), EntryKind.NOTE, true, "x", null, T0);
        assertThat(log.setVisibility(entry, true, T0.plusSeconds(1))).isFalse();
        assertThat(log.setVisibility(entry, false, T0.plusSeconds(2))).isTrue();
        assertThat(log.hiddenAt(component, world.approvedStudent())).containsEntry(entry, T0.plusSeconds(2));
        assertThat(log.setVisibility(entry, true, T0.plusSeconds(3))).isTrue();
        assertThat(log.hiddenAt(component, world.approvedStudent())).isEmpty();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM log_visibility_change WHERE entry_id = ?", Integer.class, entry)).isEqualTo(2);
    }

    @Test
    void anEntryCreatedHiddenHasNoHiddenAt() {
        UUID entry = log.create(component, world.approvedStudent(), EntryKind.NOTE, false, "private", null, T0);
        assertThat(log.hiddenAt(component, world.approvedStudent())).doesNotContainKey(entry);
    }

    @Test
    void visibleHistoryLeavesHiddenEntriesOut() {
        AiUseFields ai = new AiUseFields("ChatGPT-4", "OpenAI", LocalDate.of(2025, 2, 14), "Brainstorming themes", null, null);
        UUID shown = log.create(component, world.approvedStudent(), EntryKind.AI_USE, true, null, ai, T0);
        UUID hidden = log.create(component, world.approvedStudent(), EntryKind.NOTE, false, "secret", null, T0);
        var history = log.visibleHistory(component, world.approvedStudent());
        assertThat(history).containsKey(shown).doesNotContainKey(hidden);
        assertThat(history.get(shown).getFirst().fields()).isEqualTo(ai);
    }
}
```

- [ ] **Step 2: Run** `./mvnw test -Dtest=LogRepositoryTest` → FAIL (no `LogRepository`).

- [ ] **Step 3: Implement.**

```java
package ie.coursework.log.domain;

import java.time.Instant;
import java.util.UUID;

/** An entry with its current revision's content. {@code editedAt} is null until there's a second revision. */
public record LogEntry(UUID id, UUID componentId, EntryKind kind, Instant createdAt, boolean visibleToTeacher,
        int revisionCount, Instant editedAt, String body, EntryFields fields) {}
```

```java
package ie.coursework.log.domain;

import java.time.Instant;

public record LogRevision(int number, String body, EntryFields fields, Instant createdAt) {}
```

```java
package ie.coursework.log.adapter.persistence;

import ie.coursework.log.domain.EntryFields;
import ie.coursework.log.domain.EntryKind;
import ie.coursework.log.domain.LogEntry;
import ie.coursework.log.domain.LogRevision;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

/**
 * Design §6.6. Every read takes the student and filters by them; there is deliberately no lookup by entry id
 * alone (the PersonalItemRepository rule). Only TeacherLogProjection's caller reads another student's rows,
 * and only after ComponentService has proved the teacher owns the class.
 */
@Repository
public class LogRepository {

    private static final String SELECT = """
            SELECT e.id, e.instance_id, e.kind, e.created_at, e.visible_to_teacher, e.current_revision,
                   r.body, r.fields::text AS fields, r.created_at AS revised_at
            FROM log_entry e
            JOIN log_entry_revision r ON r.entry_id = e.id AND r.revision_no = e.current_revision
            """;

    private final JdbcClient jdbc;
    private final ObjectMapper json;

    public LogRepository(JdbcClient jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public UUID create(UUID componentId, UUID studentId, EntryKind kind, boolean visible, String body, EntryFields fields, Instant now) {
        UUID id = jdbc.sql("""
                INSERT INTO log_entry (instance_id, student_user_id, kind, created_at, visible_to_teacher)
                VALUES (:component, :student, :kind, :now, :visible) RETURNING id
                """).param("component", componentId).param("student", studentId).param("kind", kind.name())
                .param("now", Timestamps.utc(now)).param("visible", visible)
                .query(UUID.class).single();
        insertRevision(id, 1, body, fields, now);
        return id;
    }

    public List<LogEntry> list(UUID componentId, UUID studentId) {
        return jdbc.sql(SELECT + """
                WHERE e.instance_id = :component AND e.student_user_id = :student
                ORDER BY e.created_at DESC, e.id
                """).param("component", componentId).param("student", studentId).query(this::entry).list();
    }

    /** The owner's entry, and only while they're approved in its class (the findForApprovedStudent rule). */
    public Optional<LogEntry> findOwn(UUID entryId, UUID studentId) {
        return jdbc.sql(SELECT + """
                JOIN component_instance i ON i.id = e.instance_id
                JOIN enrolment en ON en.class_group_id = i.class_group_id
                     AND en.student_user_id = e.student_user_id AND en.status = 'APPROVED'
                WHERE e.id = :id AND e.student_user_id = :student
                """).param("id", entryId).param("student", studentId).query(this::entry).optional();
    }

    public List<LogRevision> revisions(UUID entryId) {
        return jdbc.sql("""
                SELECT r.revision_no, r.body, r.fields::text AS fields, r.created_at, e.kind
                FROM log_entry_revision r JOIN log_entry e ON e.id = r.entry_id
                WHERE r.entry_id = :id ORDER BY r.revision_no DESC
                """).param("id", entryId).query(this::revision).list();
    }

    /** Moves current_revision first: the row lock serialises two saves of the same entry. */
    public int addRevision(UUID entryId, String body, EntryFields fields, Instant now) {
        int number = jdbc.sql("UPDATE log_entry SET current_revision = current_revision + 1 WHERE id = :id RETURNING current_revision")
                .param("id", entryId).query(Integer.class).single();
        insertRevision(entryId, number, body, fields, now);
        return number;
    }

    public boolean setVisibility(UUID entryId, boolean visible, Instant now) {
        int changed = jdbc.sql("UPDATE log_entry SET visible_to_teacher = :visible WHERE id = :id AND visible_to_teacher <> :visible")
                .param("visible", visible).param("id", entryId).update();
        if (changed == 0) {
            return false;
        }
        jdbc.sql("INSERT INTO log_visibility_change (entry_id, visible, changed_at) VALUES (:id, :visible, :now)")
                .param("id", entryId).param("visible", visible).param("now", Timestamps.utc(now)).update();
        return true;
    }

    public Map<UUID, Instant> hiddenAt(UUID componentId, UUID studentId) {
        Map<UUID, Instant> hidden = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT e.id, max(c.changed_at) AS hidden_at
                FROM log_entry e JOIN log_visibility_change c ON c.entry_id = e.id AND NOT c.visible
                WHERE e.instance_id = :component AND e.student_user_id = :student AND NOT e.visible_to_teacher
                GROUP BY e.id
                """).param("component", componentId).param("student", studentId)
                .query(rs -> {
                    hidden.put(rs.getObject("id", UUID.class), rs.getObject("hidden_at", OffsetDateTime.class).toInstant());
                });
        return hidden;
    }

    /** Filtered to visible entries in SQL as well as by type in the projection: hidden history never leaves the database. */
    public Map<UUID, List<LogRevision>> visibleHistory(UUID componentId, UUID studentId) {
        Map<UUID, List<LogRevision>> history = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT r.entry_id, r.revision_no, r.body, r.fields::text AS fields, r.created_at, e.kind
                FROM log_entry_revision r JOIN log_entry e ON e.id = r.entry_id
                WHERE e.instance_id = :component AND e.student_user_id = :student AND e.visible_to_teacher
                ORDER BY r.entry_id, r.revision_no DESC
                """).param("component", componentId).param("student", studentId)
                .query(rs -> {
                    history.computeIfAbsent(rs.getObject("entry_id", UUID.class), k -> new ArrayList<>())
                            .add(revision(rs, 0));
                });
        return history;
    }

    private void insertRevision(UUID entryId, int number, String body, EntryFields fields, Instant now) {
        jdbc.sql("""
                INSERT INTO log_entry_revision (entry_id, revision_no, body, fields, created_at)
                VALUES (:id, :number, :body, CAST(:fields AS jsonb), :now)
                """).param("id", entryId).param("number", number).param("body", body)
                .param("fields", fields == null ? null : json.writeValueAsString(fields), java.sql.Types.VARCHAR)
                .param("now", Timestamps.utc(now)).update();
    }

    private LogEntry entry(ResultSet rs, int row) throws SQLException {
        EntryKind kind = EntryKind.valueOf(rs.getString("kind"));
        int revision = rs.getInt("current_revision");
        return new LogEntry(rs.getObject("id", UUID.class), rs.getObject("instance_id", UUID.class), kind,
                rs.getObject("created_at", OffsetDateTime.class).toInstant(), rs.getBoolean("visible_to_teacher"), revision,
                revision > 1 ? rs.getObject("revised_at", OffsetDateTime.class).toInstant() : null,
                rs.getString("body"), fields(kind, rs.getString("fields")));
    }

    private LogRevision revision(ResultSet rs, int row) throws SQLException {
        EntryKind kind = EntryKind.valueOf(rs.getString("kind"));
        return new LogRevision(rs.getInt("revision_no"), rs.getString("body"), fields(kind, rs.getString("fields")),
                rs.getObject("created_at", OffsetDateTime.class).toInstant());
    }

    private EntryFields fields(EntryKind kind, String value) {
        return value == null || kind.fieldsType() == null ? null : json.readValue(value, kind.fieldsType());
    }
}
```

- [ ] **Step 4: Run** `./mvnw test -Dtest=LogRepositoryTest` → PASS. If `SourceFields` equality fails on `dateAccessed`, check the stored JSON (`SELECT fields FROM log_entry_revision`): dates must be `"2024-12-12"` strings; if they're arrays, Spring's `ObjectMapper` isn't the one injected — inject the Spring bean, don't build your own.

- [ ] **Step 5: Commit.** `git add backend/src/main/java/ie/coursework/log backend/src/test/java/ie/coursework/log && git commit -m "Add LogRepository: owner-scoped reads, append-only writes"`

## Task B6: The student's log API

**Files:**
- Create: `backend/src/main/java/ie/coursework/log/application/LogViews.java`, `LogService.java`
- Create: `backend/src/main/java/ie/coursework/log/adapter/web/LogController.java`, `LogEntryRequest.java`, `RevisionRequest.java`, `VisibilityRequest.java`
- Test: `backend/src/test/java/ie/coursework/log/adapter/web/LogEntriesTest.java`, `backend/src/test/java/ie/coursework/log/authz/LogScopeTest.java`
- Docs: roadmap §7 Phase 3 row; `ARCHITECTURE.md` §4; `CLAUDE.md` backend conventions

**Interfaces:**
- Consumes: `LogRepository` (B5); `ComponentRepository.findForApprovedStudent(UUID, UUID) -> Optional<ComponentInstance>`; `LogContent.problems` (B2).
- Produces:
  - `LogViews.StudentEntry(UUID id, UUID componentId, EntryKind kind, Instant createdAt, Instant editedAt, int revisionCount, boolean visibleToTeacher, String body, EntryFields fields)`
  - `LogViews.RevisionView(int number, String body, EntryFields fields, Instant createdAt)`
  - `LogViews.StudentEntryDetail(StudentEntry entry, List<RevisionView> history)`
  - `LogService.list/create/detail/revise/setVisibility`, each taking `Actor` first
  - Endpoints: `GET|POST /api/v1/components/{componentId}/log`, `GET /api/v1/log/{entryId}`, `POST /api/v1/log/{entryId}/revisions`, `PUT /api/v1/log/{entryId}/visibility`

- [ ] **Step 1: Failing HTTP test.**

```java
package ie.coursework.log.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.MutableClock;
import ie.coursework.support.TestAccounts;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class LogEntriesTest extends PostgresIntegrationTest {

    @TestConfiguration
    static class PinnedClock {
        @Bean
        @Primary
        Clock testClock() {
            return new MutableClock(Instant.parse("2026-10-12T08:00:00Z"));
        }
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private Clock clock;

    private String log;

    @BeforeEach
    void seed() {
        ClassFixtures.World world = fixtures.world();
        log = "/api/v1/components/" + components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027) + "/log";
    }

    @Test
    void aNoteIsVisibleByDefaultAndTheServerSetsItsTime() throws Exception {
        student().post(log, """
                {"kind":"NOTE","body":"Ran the pilot titration.","fields":null,"createdAt":"2020-01-01T00:00:00Z"}
                """).andExpect(status().isCreated())
                .andExpect(jsonPath("$.entry.kind").value("NOTE"))
                .andExpect(jsonPath("$.entry.visibleToTeacher").value(true))
                .andExpect(jsonPath("$.entry.createdAt").value("2026-10-12T08:00:00Z"))
                .andExpect(jsonPath("$.entry.editedAt").isEmpty())
                .andExpect(jsonPath("$.entry.fields").isEmpty())
                .andExpect(jsonPath("$.history.length()").value(1));
    }

    @Test
    void anOnlineSourceRoundTripsItsFields() throws Exception {
        student().post(log, """
                {"kind":"SOURCE","body":null,"fields":{"type":"ONLINE_VIDEO","title":"Zig & Zag – Christmas crises",
                 "url":"https://youtu.be/yCv4iyPqZKQ","dateAccessed":"2024-12-12","locator":"3:20 to 5:45"}}
                """).andExpect(status().isCreated())
                .andExpect(jsonPath("$.entry.fields.type").value("ONLINE_VIDEO"))
                .andExpect(jsonPath("$.entry.fields.url").value("https://youtu.be/yCv4iyPqZKQ"))
                .andExpect(jsonPath("$.entry.fields.dateAccessed").value("2024-12-12"));
    }

    @Test
    void anAiUseNeedsItsMinimumDetails() throws Exception {
        student().post(log, """
                {"kind":"AI_USE","fields":{"toolNameAndVersion":"ChatGPT-4","developer":"OpenAI"}}
                """).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[*].field").value(org.hamcrest.Matchers.containsInAnyOrder("fields.dateGenerated", "fields.howUsed")));
    }

    @Test
    void anHttpLinkIsRefused() throws Exception {
        student().post(log, """
                {"kind":"SOURCE","fields":{"type":"ONLINE_TEXT_OR_IMAGE","title":"Latin Library","url":"http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf","dateAccessed":"2024-06-17"}}
                """).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("fields.url"));
    }

    @Test
    void fieldsInTheWrongShapeAreAValidationFailure() throws Exception {
        student().post(log, """
                {"kind":"AI_USE","fields":{"toolNameAndVersion":"x","developer":"y","dateGenerated":"not a date","howUsed":"z"}}
                """).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        student().post(log, """
                {"kind":"NOTE","body":"x","fields":{"title":"no"}}
                """).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors[0].field").value("fields"));
    }

    @Test
    void aRevisionKeepsTheOldTextAndMarksTheEntryEdited() throws Exception {
        ApiSession student = student();
        String entry = "/api/v1/log/" + id(student.post(log, "{\"kind\":\"NOTE\",\"body\":\"v1\"}").andReturn().getResponse().getContentAsString());
        ((MutableClock) clock).advance(Duration.ofHours(2));
        student.post(entry + "/revisions", "{\"body\":\"v2\",\"createdAt\":\"2020-01-01T00:00:00Z\"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.entry.body").value("v2"))
                .andExpect(jsonPath("$.entry.revisionCount").value(2))
                .andExpect(jsonPath("$.entry.createdAt").value("2026-10-12T08:00:00Z"))
                .andExpect(jsonPath("$.entry.editedAt").value("2026-10-12T10:00:00Z"))
                .andExpect(jsonPath("$.history[*].body").value(org.hamcrest.Matchers.contains("v2", "v1")));
    }

    @Test
    void hidingIsOneCallAndTheListShowsIt() throws Exception {
        ApiSession student = student();
        String entry = "/api/v1/log/" + id(student.post(log, "{\"kind\":\"NOTE\",\"body\":\"private thought\"}").andReturn().getResponse().getContentAsString());
        student.put(entry + "/visibility", "{\"visible\":false}").andExpect(status().isOk())
                .andExpect(jsonPath("$.visibleToTeacher").value(false));
        student.get(log).andExpect(status().isOk()).andExpect(jsonPath("$[0].visibleToTeacher").value(false));
    }

    @Test
    void aStudentMayCreateAnEntryHidden() throws Exception {
        student().post(log, "{\"kind\":\"NOTE\",\"body\":\"x\",\"visibleToTeacher\":false}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.entry.visibleToTeacher").value(false));
    }

    private static String id(String body) {
        return JsonPath.read(body, "$.entry.id");
    }

    private ApiSession student() throws Exception {
        return new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);
    }
}
```

If `jsonPath("$.entry.editedAt").isEmpty()` doesn't match a JSON `null` in this Spring version, use `.value(org.hamcrest.Matchers.nullValue())`.

- [ ] **Step 2: Failing scope test.**

```java
package ie.coursework.log.authz;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** Gate P3: another student's log is 404; nothing here is 403 (design §9). */
@AutoConfigureMockMvc
class LogScopeTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private String log;
    private String entry;

    @BeforeEach
    void anApprovedStudentsEntry() throws Exception {
        ClassFixtures.World world = fixtures.world();
        log = "/api/v1/components/" + components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027) + "/log";
        String body = as(ClassFixtures.APPROVED_STUDENT).post(log, "{\"kind\":\"NOTE\",\"body\":\"mine\"}")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        entry = "/api/v1/log/" + JsonPath.read(body, "$.entry.id");
    }

    @Test
    void anonymousIsUnauthenticated() throws Exception {
        new ApiSession(mockMvc).get(log).andExpect(status().isUnauthorized());
        new ApiSession(mockMvc).get(entry).andExpect(status().isUnauthorized());
    }

    @Test
    void everyoneButTheOwnerGetsNotFound() throws Exception {
        for (String user : new String[] {ClassFixtures.PENDING_STUDENT, ClassFixtures.REMOVED_STUDENT, ClassFixtures.OUTSIDER,
                ClassFixtures.TEACHER1, ClassFixtures.TEACHER2, ClassFixtures.TEACHER_B, ClassFixtures.LEADER_A}) {
            ApiSession session = as(user);
            session.get(log).andExpect(status().isNotFound());
            session.post(log, "{\"kind\":\"NOTE\",\"body\":\"x\"}").andExpect(status().isNotFound());
            session.get(entry).andExpect(status().isNotFound());
            session.post(entry + "/revisions", "{\"body\":\"x\"}").andExpect(status().isNotFound());
            session.put(entry + "/visibility", "{\"visible\":false}").andExpect(status().isNotFound());
        }
    }

    @Test
    void theOwnerLosesAccessWhenRemovedAndNothingIsDeleted() throws Exception {
        jdbcTemplate.update("UPDATE enrolment SET status = 'REMOVED' WHERE student_user_id = (SELECT id FROM app_user WHERE username = ?)",
                ClassFixtures.APPROVED_STUDENT);
        as(ClassFixtures.APPROVED_STUDENT).get(entry).andExpect(status().isNotFound());
        org.assertj.core.api.Assertions.assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM log_entry", Integer.class)).isEqualTo(1);
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }
}
```

The teacher's own endpoint gets its rows in Task B11.

- [ ] **Step 3: Run** `./mvnw test -Dtest='LogEntriesTest,LogScopeTest'` → FAIL (404 for everything: no controller).

- [ ] **Step 4: Implement the views and requests.**

```java
package ie.coursework.log.application;

import ie.coursework.log.domain.EntryFields;
import ie.coursework.log.domain.EntryKind;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** What the student's log API returns. Mirrored field for field by frontend/lib/api/schemas.ts. */
public final class LogViews {

    private LogViews() {}

    public record StudentEntry(UUID id, UUID componentId, EntryKind kind, Instant createdAt, Instant editedAt,
            int revisionCount, boolean visibleToTeacher, String body, EntryFields fields) {}

    public record RevisionView(int number, String body, EntryFields fields, Instant createdAt) {}

    public record StudentEntryDetail(StudentEntry entry, List<RevisionView> history) {}
}
```

```java
package ie.coursework.log.adapter.web;

import ie.coursework.log.domain.EntryKind;
import jakarta.validation.constraints.NotNull;
import tools.jackson.databind.JsonNode;

/** No createdAt: the server sets it (design §6.6). An unknown property sent by a client is ignored. */
public record LogEntryRequest(@NotNull EntryKind kind, String body, JsonNode fields, Boolean visibleToTeacher) {}
```

```java
package ie.coursework.log.adapter.web;

import tools.jackson.databind.JsonNode;

public record RevisionRequest(String body, JsonNode fields) {}
```

```java
package ie.coursework.log.adapter.web;

import jakarta.validation.constraints.NotNull;

public record VisibilityRequest(@NotNull Boolean visible) {}
```

- [ ] **Step 5: Implement the service.**

```java
package ie.coursework.log.application;

import ie.coursework.components.adapter.persistence.ComponentRepository;
import ie.coursework.identity.domain.Actor;
import ie.coursework.log.adapter.persistence.LogRepository;
import ie.coursework.log.application.LogViews.RevisionView;
import ie.coursework.log.application.LogViews.StudentEntry;
import ie.coursework.log.application.LogViews.StudentEntryDetail;
import ie.coursework.log.domain.EntryFields;
import ie.coursework.log.domain.EntryKind;
import ie.coursework.log.domain.LogContent;
import ie.coursework.log.domain.LogEntry;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import ie.coursework.shared.error.FieldError;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * The student's own log (design §6.6, §8.5). Every call is scoped to an approved student of the component's
 * class; an entry id is only looked up with its owner (LogRepository.findOwn). Anything else is 404.
 */
@Service
public class LogService {

    private final LogRepository log;
    private final ComponentRepository components;
    private final ObjectMapper json;
    private final Clock clock;

    public LogService(LogRepository log, ComponentRepository components, ObjectMapper json, Clock clock) {
        this.log = log;
        this.components = components;
        this.json = json;
        this.clock = clock;
    }

    public List<StudentEntry> list(Actor actor, UUID componentId) {
        approved(actor, componentId);
        return log.list(componentId, actor.userId()).stream().map(LogService::view).toList();
    }

    /** New entries are visible unless the student chose otherwise (FR-24b, plan P3-13). */
    @Transactional
    public StudentEntryDetail create(Actor actor, UUID componentId, EntryKind kind, String body, JsonNode fieldsJson, Boolean visible) {
        approved(actor, componentId);
        EntryFields fields = fields(kind, fieldsJson);
        check(kind, body, fields);
        UUID id = log.create(componentId, actor.userId(), kind, visible == null || visible, clean(body), fields, clock.instant());
        return detail(actor, id);
    }

    public StudentEntryDetail detail(Actor actor, UUID entryId) {
        LogEntry entry = own(actor, entryId);
        return new StudentEntryDetail(view(entry), log.revisions(entryId).stream()
                .map(r -> new RevisionView(r.number(), r.body(), r.fields(), r.createdAt())).toList());
    }

    /** An edit is a new revision; the kind never changes (design §6.6). */
    @Transactional
    public StudentEntryDetail revise(Actor actor, UUID entryId, String body, JsonNode fieldsJson) {
        LogEntry entry = own(actor, entryId);
        EntryFields fields = fields(entry.kind(), fieldsJson);
        check(entry.kind(), body, fields);
        log.addRevision(entryId, clean(body), fields, clock.instant());
        return detail(actor, entryId);
    }

    /** One tap (FR-24c). Recorded in log_visibility_change only when it changes something. */
    @Transactional
    public StudentEntry setVisibility(Actor actor, UUID entryId, boolean visible) {
        own(actor, entryId);
        log.setVisibility(entryId, visible, clock.instant());
        return view(own(actor, entryId));
    }

    private void approved(Actor actor, UUID componentId) {
        components.findForApprovedStudent(componentId, actor.userId()).orElseThrow(LogService::notFound);
    }

    private LogEntry own(Actor actor, UUID entryId) {
        return log.findOwn(entryId, actor.userId()).orElseThrow(LogService::notFound);
    }

    private EntryFields fields(EntryKind kind, JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (kind.fieldsType() == null) {
            throw invalid(List.of(new FieldError("fields", "a note has no fields")));
        }
        try {
            return json.treeToValue(node, kind.fieldsType());
        } catch (JacksonException e) {
            throw invalid(List.of(new FieldError("fields", "these details aren't in the right shape")));
        }
    }

    private static void check(EntryKind kind, String body, EntryFields fields) {
        List<FieldError> problems = LogContent.problems(kind, body, fields);
        if (!problems.isEmpty()) {
            throw invalid(problems);
        }
    }

    private static String clean(String body) {
        return body == null || body.isBlank() ? null : body;
    }

    static StudentEntry view(LogEntry e) {
        return new StudentEntry(e.id(), e.componentId(), e.kind(), e.createdAt(), e.editedAt(), e.revisionCount(),
                e.visibleToTeacher(), e.body(), e.fields());
    }

    private static DomainException invalid(List<FieldError> problems) {
        return new DomainException(ErrorCode.VALIDATION_FAILED, "Check the highlighted details.", problems);
    }

    static DomainException notFound() {
        return new DomainException(ErrorCode.NOT_FOUND, "No such log entry.");
    }
}
```

- [ ] **Step 6: Implement the controller.**

```java
package ie.coursework.log.adapter.web;

import ie.coursework.identity.domain.Actor;
import ie.coursework.log.application.LogService;
import ie.coursework.log.application.LogViews.StudentEntry;
import ie.coursework.log.application.LogViews.StudentEntryDetail;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The student's own log (roadmap §7 Phase 3). The acting user is always the owner; no user id is in any path. */
@RestController
@RequestMapping("/api/v1")
public class LogController {

    private final LogService log;

    public LogController(LogService log) {
        this.log = log;
    }

    @GetMapping("/components/{componentId}/log")
    List<StudentEntry> list(Actor actor, @PathVariable UUID componentId) {
        return log.list(actor, componentId);
    }

    @PostMapping("/components/{componentId}/log")
    @ResponseStatus(HttpStatus.CREATED)
    StudentEntryDetail create(Actor actor, @PathVariable UUID componentId, @Valid @RequestBody LogEntryRequest body) {
        return log.create(actor, componentId, body.kind(), body.body(), body.fields(), body.visibleToTeacher());
    }

    @GetMapping("/log/{entryId}")
    StudentEntryDetail detail(Actor actor, @PathVariable UUID entryId) {
        return log.detail(actor, entryId);
    }

    @PostMapping("/log/{entryId}/revisions")
    @ResponseStatus(HttpStatus.CREATED)
    StudentEntryDetail revise(Actor actor, @PathVariable UUID entryId, @Valid @RequestBody RevisionRequest body) {
        return log.revise(actor, entryId, body.body(), body.fields());
    }

    @PutMapping("/log/{entryId}/visibility")
    StudentEntry visibility(Actor actor, @PathVariable UUID entryId, @Valid @RequestBody VisibilityRequest body) {
        return log.setVisibility(actor, entryId, body.visible());
    }
}
```

- [ ] **Step 7: Run** `./mvnw test -Dtest='LogEntriesTest,LogScopeTest'` → PASS. If `createdAt` in the request is **rejected** (400 `MALFORMED_REQUEST`) rather than ignored, the app's `ObjectMapper` fails on unknown properties: stop and tell Tim — Gate P3 says "ignored", and changing a global Jackson setting is his call. If `fields` for a `NOTE` comes back as `{}`, the `null` check in `LogRepository.insertRevision` isn't reached — check the request's `fields` is `NullNode`-safe as written.

- [ ] **Step 8: Docs.**
  - Roadmap §7, Phase 3 row: replace with the built endpoints (`GET|POST /components/{id}/log` · `GET /log/{entryId}` (entry and history) · `POST /log/{entryId}/revisions` · `PUT /log/{entryId}/visibility` · `GET /components/{id}/students/{studentId}/log` (teacher projection, B11)).
  - `ARCHITECTURE.md` §4: "**A student reaches their log only through `ComponentRepository.findForApprovedStudent`; an entry id only through `LogRepository.findOwn(entryId, studentId)`**, which also requires the student to be approved in the entry's class. A removed student loses access; nothing is deleted."
  - `CLAUDE.md` backend conventions, after the component bullets: "- A log entry id is only looked up with `LogRepository.findOwn(entryId, studentId)`, never by id alone."

- [ ] **Step 9: Commit.** `git add backend/src docs/PILOT-ROADMAP.md docs/ARCHITECTURE.md CLAUDE.md && git commit -m "Add the student's log API: create, revise, history, one-tap visibility"`

## Task B7: Frontend schemas and log helpers

**Files:**
- Modify: `frontend/lib/api/schemas.ts`
- Create: `frontend/lib/app/log.ts`, `frontend/lib/app/log.test.ts`

**Interfaces:**
- Produces (schemas): `entryKindSchema`, `sourceTypeSchema`, `sourceFieldsSchema`, `aiUseFieldsSchema`, `logEntrySchema` (discriminated on `kind`), `logEntryDetailSchema`, `type LogEntry`, `type EntryKind`, `type SourceType`.
- Produces (`lib/app/log.ts`): `KIND_WORD: Record<EntryKind, string>`, `SOURCE_TYPES: ReadonlyArray<{ value: SourceType; label: string }>`, `isOnline(type: SourceType): boolean`, `FIELD_LABELS`, `dublinDate(iso: string): string` (YYYY-MM-DD), `dayMonth(isoDate: string): string` ("3 March"), `visibilityLine(visible: boolean, today: string): string`, `entryTitle(entry: LogEntry): string`.

- [ ] **Step 1: Failing test** (`lib/app/log.test.ts`, `node:test`, matching the other `lib/app/*.test.ts` files' import style):

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { dayMonth, dublinDate, entryTitle, isOnline, visibilityLine } from "./log.ts";

test("an instant late on an Irish summer evening is the next Irish day", () => {
  assert.equal(dublinDate("2026-10-01T23:30:00Z"), "2026-10-02");
  assert.equal(dublinDate("2027-01-15T23:30:00Z"), "2027-01-15"); // GMT in winter
});

test("the visibility line says who can read the entry, in words (FR-24e)", () => {
  assert.equal(visibilityLine(true, "2027-03-03"), "Your teacher can read this.");
  assert.equal(visibilityLine(false, "2027-03-03"), "Only you can read this. Your teacher sees that you made an entry on 3 March.");
  assert.equal(dayMonth("2026-10-12"), "12 October");
});

test("online source types are the three the NCCA lists as accessed online", () => {
  assert.deepEqual(["BOOK", "NEWSPAPER_OR_MAGAZINE", "ONLINE_TEXT_OR_IMAGE", "ONLINE_AUDIO", "ONLINE_VIDEO", "OTHER"].map((t) => isOnline(t as never)),
    [false, false, true, true, true, false]);
});

test("an entry's title comes from what the student wrote", () => {
  const base = { id: "e1", componentId: "k1", createdAt: "2026-10-12T08:00:00Z", editedAt: null, revisionCount: 1, visibleToTeacher: true };
  assert.equal(entryTitle({ ...base, kind: "NOTE", body: "Ran the pilot titration.\nSecond line", fields: null }), "Ran the pilot titration.");
  assert.equal(entryTitle({ ...base, kind: "NOTE", body: "x".repeat(100), fields: null }), `${"x".repeat(79)}…`);
  assert.equal(entryTitle({ ...base, kind: "SOURCE", body: null, fields: { type: "BOOK", title: "Inclusion", author: null, publication: null, datePublished: null, url: null, dateAccessed: null, locator: null, keyInformation: null, relevance: null, reflections: null } }), "Inclusion");
  assert.equal(entryTitle({ ...base, kind: "AI_USE", body: null, fields: { toolNameAndVersion: "ChatGPT-4", developer: "OpenAI", dateGenerated: "2025-02-14", howUsed: "x", prompts: null, shareUrl: null } }), "ChatGPT-4");
});
```

- [ ] **Step 2: Run** `cd frontend && node --test lib/app/log.test.ts` → FAIL (no module).

- [ ] **Step 3: Schemas.** Append to `lib/api/schemas.ts`:

```ts
// Mirrors log/application/LogViews.java and log/domain/*Fields.java (plan pilot-3-the-log).
export const entryKindSchema = z.enum(["NOTE", "SOURCE", "AI_USE"]);
export type EntryKind = z.infer<typeof entryKindSchema>;
export const sourceTypeSchema = z.enum(["BOOK", "NEWSPAPER_OR_MAGAZINE", "ONLINE_TEXT_OR_IMAGE", "ONLINE_AUDIO", "ONLINE_VIDEO", "OTHER"]);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const sourceFieldsSchema = z.object({
  type: sourceTypeSchema,
  title: z.string(),
  author: z.string().nullable(),
  publication: z.string().nullable(),
  datePublished: z.string().nullable(),
  url: z.string().nullable(),
  dateAccessed: z.string().nullable(),
  locator: z.string().nullable(),
  keyInformation: z.string().nullable(),
  relevance: z.string().nullable(),
  reflections: z.string().nullable(),
});
export type SourceFields = z.infer<typeof sourceFieldsSchema>;

export const aiUseFieldsSchema = z.object({
  toolNameAndVersion: z.string(),
  developer: z.string(),
  dateGenerated: z.string(),
  howUsed: z.string(),
  prompts: z.string().nullable(),
  shareUrl: z.string().nullable(),
});
export type AiUseFields = z.infer<typeof aiUseFieldsSchema>;

const entryBase = {
  id: z.string(),
  componentId: z.string(),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
  revisionCount: z.number(),
  visibleToTeacher: z.boolean(),
  body: z.string().nullable(),
};
export const logEntrySchema = z.discriminatedUnion("kind", [
  z.object({ ...entryBase, kind: z.literal("NOTE"), fields: z.null() }),
  z.object({ ...entryBase, kind: z.literal("SOURCE"), fields: sourceFieldsSchema }),
  z.object({ ...entryBase, kind: z.literal("AI_USE"), fields: aiUseFieldsSchema }),
]);
export type LogEntry = z.infer<typeof logEntrySchema>;

export const revisionSchema = z.object({
  number: z.number(),
  body: z.string().nullable(),
  fields: z.union([sourceFieldsSchema, aiUseFieldsSchema]).nullable(),
  createdAt: z.string(),
});
export type Revision = z.infer<typeof revisionSchema>;

export const logEntryDetailSchema = z.object({ entry: logEntrySchema, history: z.array(revisionSchema) });
export type LogEntryDetail = z.infer<typeof logEntryDetailSchema>;
```

- [ ] **Step 4: Helpers.** Create `lib/app/log.ts`:

```ts
import type { EntryKind, LogEntry, SourceType } from "@/lib/api/schemas";

/** The kind is always a word, never colour alone. */
export const KIND_WORD: Record<EntryKind, string> = { NOTE: "Note", SOURCE: "Source", AI_USE: "AI use" };

/** NCCA-BIO p. 15-16's example headings, in the NCCA's order, plus the app's catch-all. */
export const SOURCE_TYPES: ReadonlyArray<{ value: SourceType; label: string }> = [
  { value: "BOOK", label: "Book" },
  { value: "NEWSPAPER_OR_MAGAZINE", label: "Newspaper or magazine article" },
  { value: "ONLINE_TEXT_OR_IMAGE", label: "Text or image online" },
  { value: "ONLINE_AUDIO", label: "Audio online" },
  { value: "ONLINE_VIDEO", label: "Video online" },
  { value: "OTHER", label: "Other (journal, report, organisation, person)" },
];

export const isOnline = (type: SourceType): boolean => type.startsWith("ONLINE_");

/** Labels for each field. The backend's LogFieldSourcesTest ties each field to its SEC or NCCA page. */
export const FIELD_LABELS = {
  body: { NOTE: "Note", SOURCE: "Notes (optional)", AI_USE: "Notes (optional)" },
  type: "Type of source",
  title: "Title",
  author: "Author (optional)",
  publication: "Newspaper, magazine or publisher (optional)",
  datePublished: "Date or year published (optional)",
  url: "Link",
  dateAccessed: "Date accessed",
  locator: "Page, chapter, section or timestamp (optional)",
  keyInformation: "Key information (optional)",
  relevance: "How and why this is relevant to my question (optional)",
  reflections: "My reflections (optional)",
  toolNameAndVersion: "AI tool and version",
  developer: "Developer or publisher",
  dateGenerated: "Date the output was generated",
  howUsed: "How you used it",
  prompts: "Prompts you used (optional)",
  shareUrl: "Share link (optional)",
} as const;

const DUBLIN_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit" });
const DAY_MONTH = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "long", timeZone: "UTC" });

/** The Irish calendar day an instant falls on, as YYYY-MM-DD. */
export function dublinDate(iso: string): string {
  return DUBLIN_DAY.format(new Date(iso));
}

/** "3 March", from a YYYY-MM-DD date. */
export function dayMonth(isoDate: string): string {
  return DAY_MONTH.format(new Date(`${isoDate}T00:00:00Z`));
}

/** FR-24e: said in words at the moment of writing. */
export function visibilityLine(visible: boolean, today: string): string {
  return visible
    ? "Your teacher can read this."
    : `Only you can read this. Your teacher sees that you made an entry on ${dayMonth(today)}.`;
}

export function entryTitle(entry: LogEntry): string {
  if (entry.kind === "SOURCE") return entry.fields.title;
  if (entry.kind === "AI_USE") return entry.fields.toolNameAndVersion;
  const line = (entry.body ?? "").split("\n")[0].trim();
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
}
```

(If other `lib/app/*.test.ts` files import with a `.ts` extension, keep `./log.ts` in the test; if they import extensionless, match them.)

- [ ] **Step 5: Run** `node --test lib/app/log.test.ts && npm run typecheck` → PASS.

- [ ] **Step 6: Commit.** `git add frontend/lib && git commit -m "Add the log's schemas and pure helpers"`

## Task B8: The log list, with one-tap hide and show

**Files:**
- Modify: `frontend/components/app/component-tabs.tsx`; create `component-tabs.spec.tsx` if none exists
- Modify: `frontend/app/(app)/components/[id]/page.tsx` (pass `current="overview"`)
- Create: `frontend/components/app/log-visibility-toggle.tsx` + `.spec.tsx`, `frontend/components/app/log-list.tsx` + `.spec.tsx`
- Create: `frontend/app/(app)/components/[id]/log/page.tsx`
- Modify: `frontend/middleware.ts` only if `/components` isn't already covered (it is — ARCHITECTURE §6); no change expected

**Interfaces:**
- Consumes: `logEntrySchema`, `KIND_WORD`, `entryTitle`, `dublinDate` (B7); `formatCalendarDate` (`lib/app/component-setup.ts`).
- Produces: `ComponentTabs({ componentId, current: "overview" | "log" })`; `LogVisibilityToggle({ entryId, title, visible })`; `LogList({ componentId, entries })`.

- [ ] **Step 1: Failing specs.**

`component-tabs.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComponentTabs } from "./component-tabs";

describe("ComponentTabs", () => {
  it("makes the Log tab a live link and marks the current tab", () => {
    render(<ComponentTabs componentId="k1" current="log" />);
    expect(screen.getByRole("link", { name: "Log" })).toHaveAttribute("href", "/components/k1/log");
    expect(screen.getByRole("link", { name: "Log" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("link", { name: "Sources" })).not.toBeInTheDocument();
  });
});
```

`log-visibility-toggle.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api, ApiError } from "@/lib/api/client";

import { LogVisibilityToggle } from "./log-visibility-toggle";

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("LogVisibilityToggle", () => {
  it("hides a visible entry in one tap", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<LogVisibilityToggle entryId="e1" title="Pilot run" visible />);
    await userEvent.click(screen.getByRole("button", { name: "Hide Pilot run from your teacher" }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/log/e1/visibility", { visible: false }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a hidden entry in one tap", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<LogVisibilityToggle entryId="e1" title="Pilot run" visible={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Show Pilot run to your teacher" }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/log/e1/visibility", { visible: true }, expect.anything());
  });

  it("puts a failure in an alert and focuses it", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({ code: "NOT_FOUND", status: 404, detail: "No such log entry." }));
    render(<LogVisibilityToggle entryId="e1" title="Pilot run" visible />);
    await userEvent.click(screen.getByRole("button", { name: "Hide Pilot run from your teacher" }));
    expect(await screen.findByRole("alert")).toHaveFocus();
  });
});
```

`log-list.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import type { LogEntry } from "@/lib/api/schemas";

import { LogList } from "./log-list";

const base = { componentId: "k1", createdAt: "2026-10-12T08:00:00Z", editedAt: null, revisionCount: 1, visibleToTeacher: true, body: null };
const entries: LogEntry[] = [
  { ...base, id: "e2", kind: "NOTE", body: "Private thought", visibleToTeacher: false, fields: null },
  { ...base, id: "e1", kind: "AI_USE", editedAt: "2026-10-13T08:00:00Z", revisionCount: 2,
    fields: { toolNameAndVersion: "ChatGPT-4", developer: "OpenAI", dateGenerated: "2026-10-12", howUsed: "Brainstorming", prompts: null, shareUrl: null } },
];

describe("LogList", () => {
  it("shows each entry's kind, date, edited mark and who can read it, newest first", () => {
    render(<LogList componentId="k1" entries={entries} />);
    const rows = within(screen.getByRole("list", { name: "Log entries" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Note");
    expect(rows[0]).toHaveTextContent("12 Oct 2026");
    expect(rows[0]).toHaveTextContent("Only you can read this");
    expect(rows[1]).toHaveTextContent("AI use");
    expect(rows[1]).toHaveTextContent("Edited");
    expect(rows[1]).toHaveTextContent("Your teacher can read this");
    expect(within(rows[1]).getByRole("link", { name: "ChatGPT-4" })).toHaveAttribute("href", "/components/k1/log/e1");
  });

  it("says so when the log is empty, and offers a first entry", () => {
    render(<LogList componentId="k1" entries={[]} />);
    expect(screen.getByText("Nothing in your log yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New entry" })).toHaveAttribute("href", "/components/k1/log/new");
  });
});
```

- [ ] **Step 2: Run** `npx vitest run components/app/component-tabs.spec.tsx components/app/log-visibility-toggle.spec.tsx components/app/log-list.spec.tsx` → FAIL.

- [ ] **Step 3: Implement `ComponentTabs`.**

```tsx
import Link from "next/link";

const TAB = "-mb-px border-b-2 px-0.5 py-2.5 text-app-base font-semibold whitespace-nowrap";
const ON = `${TAB} border-app-accent text-app-accent`;
const OFF = `${TAB} border-transparent text-app-grey hover:text-app-ink`;

/** Roadmap §6.1: inside a component, Overview · Log (P3) · Sources · AI use · Word checker (P6). */
export function ComponentTabs({ componentId, current }: { componentId: string; current: "overview" | "log" }) {
  const tabs = [
    { key: "overview", label: "Overview", href: `/components/${componentId}` },
    { key: "log", label: "Log", href: `/components/${componentId}/log` },
  ] as const;
  return (
    <nav aria-label="Component sections" className="mt-5 flex gap-6 overflow-x-auto border-b border-app-line">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} aria-current={current === t.key ? "page" : undefined} className={current === t.key ? ON : OFF}>
          {t.label}
        </Link>
      ))}
      {["Sources", "AI use", "Word checker"].map((tab) => (
        <span key={tab} aria-disabled="true" className={`${TAB} cursor-not-allowed border-transparent text-app-disabled`}>
          {tab}
        </span>
      ))}
    </nav>
  );
}
```

Check `text-app-grey` on the off tab against `UI-STANDARDS.md` §61 (4.5:1); it's the colour already used for secondary text on white. In `app/(app)/components/[id]/page.tsx`, pass `current="overview"`.

- [ ] **Step 4: Implement `LogVisibilityToggle`.**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { logEntrySchema } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";

/** FR-24c: one tap, not buried in a menu. The name says what the tap will do, and to which entry. */
export function LogVisibilityToggle({ entryId, title, visible }: { entryId: string; title: string; visible: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await api.send("PUT", `/log/${entryId}/visibility`, { visible: !visible }, logEntrySchema);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  const label = visible ? "Hide from your teacher" : "Show to your teacher";
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" size="header" disabled={busy} onClick={toggle}
        aria-label={visible ? `Hide ${title} from your teacher` : `Show ${title} to your teacher`}>
        {busy ? (visible ? "Hiding…" : "Showing…") : label}
      </Button>
      {error && <ErrorPanel error={error} focus />}
    </div>
  );
}
```

- [ ] **Step 5: Implement `LogList`.**

```tsx
import Link from "next/link";

import type { LogEntry } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate, entryTitle, KIND_WORD } from "@/lib/app/log";

import { LogVisibilityToggle } from "./log-visibility-toggle";
import { card, textLink } from "./styles";

/** Roadmap §6.2 `/components/[id]/log`: newest first; kind, date, "edited", and who can read each entry. */
export function LogList({ componentId, entries }: { componentId: string; entries: LogEntry[] }) {
  const newEntry = <Link href={`/components/${componentId}/log/new`} className={textLink}>New entry</Link>;
  if (entries.length === 0) {
    return (
      <div className="mt-6 flex flex-col gap-2">
        <p className="text-app-base text-app-grey">Nothing in your log yet.</p>
        {newEntry}
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-4">
      {newEntry}
      <ul aria-label="Log entries" className="flex flex-col gap-3">
        {entries.map((e) => {
          const title = entryTitle(e);
          return (
            <li key={e.id} className={`${card} flex flex-col gap-2 p-4 ${e.visibleToTeacher ? "" : "border-dashed"}`}>
              <p className="text-app-small text-app-grey">
                {`${KIND_WORD[e.kind]} · ${formatCalendarDate(dublinDate(e.createdAt))}${e.editedAt ? " · Edited" : ""}`}
              </p>
              <Link href={`/components/${componentId}/log/${e.id}`} className={`${textLink} text-app-lead font-semibold`}>{title}</Link>
              <p className="text-app-small text-app-copy">
                {e.visibleToTeacher ? "Your teacher can read this." : "Only you can read this. Your teacher sees the date."}
              </p>
              <LogVisibilityToggle entryId={e.id} title={title} visible={e.visibleToTeacher} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

A hidden entry differs from a visible one in words ("Only you can read this") and by a dashed border — never by colour alone.

- [ ] **Step 6: The page.** `app/(app)/components/[id]/log/page.tsx`:

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ComponentTabs } from "@/components/app/component-tabs";
import { ErrorPanel } from "@/components/app/error-panel";
import { LogList } from "@/components/app/log-list";
import { backLink, pageTitle } from "@/components/app/styles";
import { componentViewSchema, logEntrySchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function LogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = encodeURIComponent(id);
  const [component, entries] = await Promise.all([
    attempt(() => serverApi.get(`/components/${path}`, componentViewSchema)),
    attempt(() => serverApi.get(`/components/${path}/log`, z.array(logEntrySchema))),
  ]);
  if (!component.ok && component.error.code === "NOT_FOUND") notFound();
  if (component.ok && component.data.view === "TEACHER") redirect(`/teach/classes/${component.data.classId}/component`);

  return (
    <AppMain>
      <Link href="/home" className={backLink}>Timeline</Link>
      {component.ok && component.data.view === "STUDENT" ? (
        <>
          <h1 className={`mt-2.5 ${pageTitle}`}>{`${component.data.subjectName} log`}</h1>
          <ComponentTabs componentId={component.data.id} current="log" />
          {entries.ok ? <LogList componentId={component.data.id} entries={entries.data} /> : <div className="mt-6"><ErrorPanel error={entries.error} /></div>}
        </>
      ) : (
        !component.ok && <div className="mt-6"><ErrorPanel error={component.error} /></div>
      )}
    </AppMain>
  );
}
```

- [ ] **Step 7: Run** `npx vitest run components/app && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 8: Commit.** `git add frontend && git commit -m "Add the student's log list with one-tap hide and show"`

## Task B9: New entry — kinds, fields and the plain-words line

**Files:**
- Create: `frontend/components/app/log-entry-form.tsx` + `.spec.tsx`
- Create: `frontend/app/(app)/components/[id]/log/new/page.tsx`

**Interfaces:**
- Consumes: `FIELD_LABELS`, `SOURCE_TYPES`, `isOnline`, `visibilityLine`, `KIND_WORD` (B7); `logEntryDetailSchema`.
- Produces: `LogEntryForm(props: { componentId: string; today: string } & ({ mode: "create" } | { mode: "revise"; entryId: string; kind: EntryKind; body: string | null; fields: Record<string, string | null> | null }))`. Revise is used by B10.

- [ ] **Step 1: Failing spec.**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api, ApiError } from "@/lib/api/client";

import { LogEntryForm } from "./log-entry-form";

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("LogEntryForm", () => {
  it("writes a note, visible by default, and says so in words", async () => {
    vi.mocked(api.send).mockResolvedValue({ entry: { id: "e1" }, history: [] });
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    expect(screen.getByRole("checkbox", { name: "Let my teacher read this" })).toBeChecked();
    expect(screen.getByText("Your teacher can read this.")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "Ran the pilot titration.");
    await userEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/components/k1/log",
      { kind: "NOTE", body: "Ran the pilot titration.", fields: null, visibleToTeacher: true }, expect.anything());
    expect(push).toHaveBeenCalledWith("/components/k1/log");
  });

  it("changes the line when the student keeps the entry to themselves (FR-24e)", async () => {
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Let my teacher read this" }));
    expect(screen.getByText("Only you can read this. Your teacher sees that you made an entry on 3 March.")).toBeInTheDocument();
  });

  it("asks an online source for its link and the date accessed", async () => {
    vi.mocked(api.send).mockResolvedValue({ entry: { id: "e1" }, history: [] });
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("radio", { name: "Source" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Type of source" }), "ONLINE_VIDEO");
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Zig & Zag");
    await userEvent.type(screen.getByRole("textbox", { name: "Link" }), "https://youtu.be/yCv4iyPqZKQ");
    await userEvent.type(screen.getByLabelText("Date accessed"), "2024-12-12");
    await userEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(vi.mocked(api.send).mock.calls[0][2]).toMatchObject({
      kind: "SOURCE", body: null,
      fields: { type: "ONLINE_VIDEO", title: "Zig & Zag", url: "https://youtu.be/yCv4iyPqZKQ", dateAccessed: "2024-12-12", author: null },
    });
  });

  it("doesn't ask a book for a link", async () => {
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("radio", { name: "Source" }));
    expect(screen.queryByRole("textbox", { name: "Link" })).not.toBeInTheDocument();
  });

  it("records an AI use with the SEC's four minimum details", async () => {
    vi.mocked(api.send).mockResolvedValue({ entry: { id: "e1" }, history: [] });
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("radio", { name: "AI use" }));
    await userEvent.type(screen.getByRole("textbox", { name: "AI tool and version" }), "ChatGPT-4");
    await userEvent.type(screen.getByRole("textbox", { name: "Developer or publisher" }), "OpenAI");
    await userEvent.type(screen.getByLabelText("Date the output was generated"), "2027-03-02");
    await userEvent.type(screen.getByRole("textbox", { name: "How you used it" }), "Suggested project themes.");
    await userEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(vi.mocked(api.send).mock.calls[0][2]).toMatchObject({
      kind: "AI_USE",
      fields: { toolNameAndVersion: "ChatGPT-4", developer: "OpenAI", dateGenerated: "2027-03-02", howUsed: "Suggested project themes.", prompts: null, shareUrl: null },
    });
  });

  it("shows a refused link under its field and focuses the alert", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({ code: "VALIDATION_FAILED", status: 400, detail: "Check the highlighted details.",
      fieldErrors: [{ field: "fields.url", message: "must be a full https:// link" }] }));
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("radio", { name: "Source" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Type of source" }), "ONLINE_TEXT_OR_IMAGE");
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Latin Library");
    await userEvent.type(screen.getByRole("textbox", { name: "Link" }), "http://x.ie");
    await userEvent.type(screen.getByLabelText("Date accessed"), "2024-06-17");
    await userEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(await screen.findByRole("alert")).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "Link" })).toHaveAttribute("aria-invalid", "true");
  });
});
```

- [ ] **Step 2: Run** `npx vitest run components/app/log-entry-form.spec.tsx` → FAIL.

- [ ] **Step 3: Implement.** `Field` (`components/app/field.tsx`) takes `id`, `label` and optional `error`/`help`, and passes the control props (including `aria-invalid`/`aria-describedby`) to its render child.

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type EntryKind, logEntryDetailSchema, type SourceType } from "@/lib/api/schemas";
import { FIELD_LABELS, isOnline, KIND_WORD, SOURCE_TYPES, visibilityLine } from "@/lib/app/log";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";

type Values = Record<string, string>;
type Props = { componentId: string; today: string } & (
  | { mode: "create" }
  | { mode: "revise"; entryId: string; kind: EntryKind; body: string | null; fields: Record<string, string | null> | null }
);

const SOURCE_KEYS = ["type", "title", "author", "publication", "datePublished", "url", "dateAccessed", "locator", "keyInformation", "relevance", "reflections"] as const;
const AI_KEYS = ["toolNameAndVersion", "developer", "dateGenerated", "howUsed", "prompts", "shareUrl"] as const;
const LONG = new Set(["keyInformation", "relevance", "reflections", "howUsed", "prompts"]);
const DATES = new Set(["dateAccessed", "dateGenerated"]);

/** Empty inputs are sent as null, so the server's "required" rules see what the student left blank. */
function payload(kind: EntryKind, values: Values) {
  const pick = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, values[k]?.trim() ? values[k].trim() : null]));
  return kind === "SOURCE" ? pick(SOURCE_KEYS) : kind === "AI_USE" ? pick(AI_KEYS) : null;
}

/** Design §8.5 and FR-24e. Create chooses the kind and visibility; revise keeps both and adds a revision. */
export function LogEntryForm(props: Props) {
  const router = useRouter();
  const revising = props.mode === "revise";
  const [kind, setKind] = useState<EntryKind>(revising ? props.kind : "NOTE");
  const [body, setBody] = useState(revising ? (props.body ?? "") : "");
  const [values, setValues] = useState<Values>(() => {
    const start: Values = { type: "BOOK" };
    if (revising && props.fields) for (const [k, v] of Object.entries(props.fields)) start[k] = v ?? "";
    return start;
  });
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fieldError = (key: string) => error?.fieldErrors?.find((f) => f.field === key)?.message;
  const set = (key: string) => (e: { target: { value: string } }) => setValues({ ...values, [key]: e.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const content = { body: body.trim() ? body : null, fields: payload(kind, values) };
    try {
      if (props.mode === "create") {
        await api.send("POST", `/components/${props.componentId}/log`, { kind, ...content, visibleToTeacher: visible }, logEntryDetailSchema);
        router.push(`/components/${props.componentId}/log`);
      } else {
        await api.send("POST", `/log/${props.entryId}/revisions`, content, logEntryDetailSchema);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  const input = (key: string) => (
    <Field key={key} id={`log-${key}`} label={FIELD_LABELS[key as keyof typeof FIELD_LABELS] as string} error={fieldError(`fields.${key}`)}>
      {(c) => LONG.has(key)
        ? <textarea {...c} rows={3} value={values[key] ?? ""} onChange={set(key)} />
        : <input {...c} type={DATES.has(key) ? "date" : key === "url" || key === "shareUrl" ? "url" : "text"}
            inputMode={key === "url" || key === "shareUrl" ? "url" : undefined} value={values[key] ?? ""} onChange={set(key)} />}
    </Field>
  );

  const online = isOnline((values.type ?? "BOOK") as SourceType);

  return (
    <form onSubmit={submit} className="mt-6 flex max-w-[620px] flex-col gap-4">
      {error && <ErrorPanel error={error} focus />}
      {!revising && (
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-2 text-app-base font-semibold text-app-ink">Kind of entry</legend>
          {(["NOTE", "SOURCE", "AI_USE"] as const).map((k) => (
            <label key={k} className="flex min-h-11 items-center gap-2 text-app-base">
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
              {KIND_WORD[k]}
            </label>
          ))}
        </fieldset>
      )}
      <FieldGroup>
        {kind === "SOURCE" && (
          <Field id="log-type" label={FIELD_LABELS.type} error={fieldError("fields.type")}>
            {(c) => (
              <select {...c} value={values.type} onChange={set("type")}>
                {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            )}
          </Field>
        )}
        {kind === "SOURCE" && ["title", "author", "publication", "datePublished"].map(input)}
        {kind === "SOURCE" && (online || values.url) && ["url", "dateAccessed"].map(input)}
        {kind === "SOURCE" && ["locator", "keyInformation", "relevance", "reflections"].map(input)}
        {kind === "AI_USE" && AI_KEYS.map(input)}
        <Field id="log-body" label={FIELD_LABELS.body[kind]} error={fieldError("body")}>
          {(c) => <textarea {...c} rows={kind === "NOTE" ? 6 : 3} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />}
        </Field>
      </FieldGroup>
      {!revising && (
        <div className="flex flex-col gap-1.5">
          <label className="flex min-h-11 items-center gap-2 text-app-base">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
            Let my teacher read this
          </label>
          <p aria-live="polite" className="text-app-small text-app-copy">{visibilityLine(visible, props.today)}</p>
        </div>
      )}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : revising ? "Save new revision" : "Save entry"}
        </Button>
      </div>
    </form>
  );
}
```


- [ ] **Step 4: The page.** `app/(app)/components/[id]/log/new/page.tsx`:

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { LogEntryForm } from "@/components/app/log-entry-form";
import { backLink, pageTitle } from "@/components/app/styles";
import { componentViewSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { toIsoDate } from "@/lib/app/timeline";
import { dublinToday } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function NewLogEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const component = await attempt(() => serverApi.get(`/components/${encodeURIComponent(id)}`, componentViewSchema));
  if (!component.ok && component.error.code === "NOT_FOUND") notFound();
  if (component.ok && component.data.view === "TEACHER") redirect(`/teach/classes/${component.data.classId}/component`);

  return (
    <AppMain>
      <Link href={`/components/${id}/log`} className={backLink}>Log</Link>
      <h1 className={`mt-2.5 ${pageTitle}`}>New entry</h1>
      {component.ok
        // Today's Irish date comes from the server so the FR-24e line can't disagree with the entry's date.
        ? <LogEntryForm mode="create" componentId={component.data.id} today={toIsoDate(dublinToday())} />
        : <div className="mt-6"><ErrorPanel error={component.error} /></div>}
    </AppMain>
  );
}
```

- [ ] **Step 5: Run** `npx vitest run components/app && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 6: Commit.** `git add frontend && git commit -m "Add the new log entry form: notes, sources, AI use, and who can read it"`

## Task B10: Entry detail — revise and history

**Files:**
- Create: `frontend/components/app/log-history.tsx` + `.spec.tsx`
- Create: `frontend/app/(app)/components/[id]/log/[entryId]/page.tsx`
- Test: extend `log-entry-form.spec.tsx` with a revise case

**Interfaces:**
- Consumes: `LogEntryForm` revise mode (B9); `logEntryDetailSchema`, `Revision` (B7).
- Produces: `LogHistory({ history: Revision[] })`, shared by the teacher view in B12; `SourceFieldsView`/`AiUseFieldsView` rendering helpers exported from `log-history.tsx`.

- [ ] **Step 1: Failing specs.** Revise case in `log-entry-form.spec.tsx`:

```tsx
it("saves a new revision without changing the kind", async () => {
  vi.mocked(api.send).mockResolvedValue({ entry: { id: "e1" }, history: [] });
  render(<LogEntryForm mode="revise" entryId="e1" kind="NOTE" body="v1" fields={null} componentId="k1" today="2027-03-03" />);
  expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  const note = screen.getByRole("textbox", { name: "Note" });
  await userEvent.clear(note);
  await userEvent.type(note, "v2");
  await userEvent.click(screen.getByRole("button", { name: "Save new revision" }));
  expect(api.send).toHaveBeenCalledWith("POST", "/log/e1/revisions", { body: "v2", fields: null }, expect.anything());
  expect(refresh).toHaveBeenCalled();
});
```

`log-history.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LogHistory } from "./log-history";

describe("LogHistory", () => {
  it("lists every revision newest first with its date, and renders a link safely", () => {
    render(<LogHistory history={[
      { number: 2, body: null, createdAt: "2026-10-13T08:00:00Z",
        fields: { type: "ONLINE_VIDEO", title: "Zig & Zag", author: null, publication: null, datePublished: null, url: "https://youtu.be/yCv4iyPqZKQ", dateAccessed: "2024-12-12", locator: "3:20 to 5:45", keyInformation: null, relevance: null, reflections: null } },
      { number: 1, body: "first go", createdAt: "2026-10-12T08:00:00Z", fields: null },
    ]} />);
    const rows = within(screen.getByRole("list", { name: "Revisions" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Revision 2 · 13 Oct 2026");
    expect(rows[1]).toHaveTextContent("Revision 1 · 12 Oct 2026");
    expect(rows[1]).toHaveTextContent("first go");
    const link = within(rows[0]).getByRole("link", { name: "https://youtu.be/yCv4iyPqZKQ" });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement `log-history.tsx`.**

```tsx
import type { AiUseFields, Revision, SourceFields } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate, FIELD_LABELS, SOURCE_TYPES } from "@/lib/app/log";

import { textLink } from "./styles";

/** Design §9: a link is shown, opened in a new tab without an opener, and never fetched by us. */
function SafeLink({ href }: { href: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`${textLink} [overflow-wrap:anywhere]`}>{href}</a>;
}

function Row({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <dt className="text-app-small text-app-grey">{label.replace(" (optional)", "")}</dt>
      <dd className="text-app-base text-app-ink whitespace-pre-wrap">{link ? <SafeLink href={value} /> : value}</dd>
    </div>
  );
}

export function SourceFieldsView({ f }: { f: SourceFields }) {
  return (
    <dl className="flex flex-col gap-2">
      <Row label={FIELD_LABELS.type} value={SOURCE_TYPES.find((t) => t.value === f.type)?.label ?? f.type} />
      <Row label={FIELD_LABELS.title} value={f.title} />
      <Row label={FIELD_LABELS.author} value={f.author} />
      <Row label={FIELD_LABELS.publication} value={f.publication} />
      <Row label={FIELD_LABELS.datePublished} value={f.datePublished} />
      <Row label={FIELD_LABELS.url} value={f.url} link />
      <Row label={FIELD_LABELS.dateAccessed} value={f.dateAccessed && formatCalendarDate(f.dateAccessed)} />
      <Row label={FIELD_LABELS.locator} value={f.locator} />
      <Row label={FIELD_LABELS.keyInformation} value={f.keyInformation} />
      <Row label={FIELD_LABELS.relevance} value={f.relevance} />
      <Row label={FIELD_LABELS.reflections} value={f.reflections} />
    </dl>
  );
}

export function AiUseFieldsView({ f }: { f: AiUseFields }) {
  return (
    <dl className="flex flex-col gap-2">
      <Row label={FIELD_LABELS.toolNameAndVersion} value={f.toolNameAndVersion} />
      <Row label={FIELD_LABELS.developer} value={f.developer} />
      <Row label={FIELD_LABELS.dateGenerated} value={formatCalendarDate(f.dateGenerated)} />
      <Row label={FIELD_LABELS.howUsed} value={f.howUsed} />
      <Row label={FIELD_LABELS.prompts} value={f.prompts} />
      <Row label={FIELD_LABELS.shareUrl} value={f.shareUrl} link />
    </dl>
  );
}

export function RevisionContent({ body, fields }: { body: string | null; fields: Revision["fields"] }) {
  return (
    <div className="flex flex-col gap-2">
      {fields && ("toolNameAndVersion" in fields ? <AiUseFieldsView f={fields} /> : <SourceFieldsView f={fields} />)}
      {body && <p className="text-app-base text-app-ink whitespace-pre-wrap">{body}</p>}
    </div>
  );
}

/** Design §8.5: an edited entry keeps its history, newest first. */
export function LogHistory({ history }: { history: Revision[] }) {
  return (
    <ul aria-label="Revisions" className="flex flex-col gap-3">
      {history.map((r) => (
        <li key={r.number} className="flex flex-col gap-2 border-t border-app-line pt-3">
          <p className="text-app-small font-semibold text-app-grey">{`Revision ${r.number} · ${formatCalendarDate(dublinDate(r.createdAt))}`}</p>
          <RevisionContent body={r.body} fields={r.fields} />
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: The page.** `app/(app)/components/[id]/log/[entryId]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { LogEntryForm } from "@/components/app/log-entry-form";
import { LogHistory } from "@/components/app/log-history";
import { LogVisibilityToggle } from "@/components/app/log-visibility-toggle";
import { backLink, pageTitle, sectionTitle } from "@/components/app/styles";
import { logEntryDetailSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { entryTitle, KIND_WORD } from "@/lib/app/log";
import { toIsoDate } from "@/lib/app/timeline";
import { dublinToday } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function LogEntryPage({ params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { id, entryId } = await params;
  const loaded = await attempt(() => serverApi.get(`/log/${encodeURIComponent(entryId)}`, logEntryDetailSchema));
  if (!loaded.ok && loaded.error.code === "NOT_FOUND") notFound();
  // An entry from another component under this URL is a 404 too.
  if (loaded.ok && loaded.data.entry.componentId !== id) notFound();

  return (
    <AppMain>
      <Link href={`/components/${id}/log`} className={backLink}>Log</Link>
      {loaded.ok ? (
        <>
          <p className="mt-2.5 text-app-small text-app-grey">{KIND_WORD[loaded.data.entry.kind]}</p>
          <h1 className={pageTitle}>{entryTitle(loaded.data.entry)}</h1>
          <p className="mt-2 text-app-small text-app-copy">
            {loaded.data.entry.visibleToTeacher ? "Your teacher can read this, and its history." : "Only you can read this. Your teacher sees the date."}
          </p>
          <div className="mt-3">
            <LogVisibilityToggle entryId={entryId} title={entryTitle(loaded.data.entry)} visible={loaded.data.entry.visibleToTeacher} />
          </div>
          <section aria-labelledby="revise-heading" className="mt-8">
            <h2 id="revise-heading" className={sectionTitle}>Edit</h2>
            <p className="text-app-small text-app-grey">Saving adds a new revision. The earlier ones stay in the history.</p>
            <LogEntryForm mode="revise" entryId={entryId} kind={loaded.data.entry.kind} body={loaded.data.entry.body}
              fields={loaded.data.entry.fields as Record<string, string | null> | null} componentId={id} today={toIsoDate(dublinToday())} />
          </section>
          <section aria-labelledby="history-heading" className="mt-8">
            <h2 id="history-heading" className={sectionTitle}>History</h2>
            <LogHistory history={loaded.data.history} />
          </section>
        </>
      ) : (
        <div className="mt-6"><ErrorPanel error={loaded.error} /></div>
      )}
    </AppMain>
  );
}
```

- [ ] **Step 5: Run** `npx vitest run components/app && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 6: Commit.** `git add frontend && git commit -m "Add the log entry page: revise and history"`

## Task B11: The teacher projection and its endpoint

**Files:**
- Modify: `backend/src/main/java/ie/coursework/components/application/ComponentService.java` (public `requireOwned`)
- Create: `backend/src/main/java/ie/coursework/log/application/TeacherLogViews.java`, `TeacherLogProjection.java`
- Modify: `backend/src/main/java/ie/coursework/log/application/LogService.java` (constructor, `teacherView`)
- Create: `backend/src/main/java/ie/coursework/log/adapter/web/TeacherLogController.java`
- Test: `backend/src/test/java/ie/coursework/log/authz/TeacherLogProjectionTest.java`; add rows to `LogScopeTest`

**Interfaces:**
- Consumes: `LogRepository.list`, `hiddenAt`, `visibleHistory` (B5); `EnrolmentRepository.membersOf(UUID classId) -> List<Member>` (`Member(enrolmentId, studentId, firstName, lastName, username, status, requestedAt)`).
- Produces:
  - `ComponentService.requireOwned(Actor, UUID componentId) -> ComponentInstance` (public; 404 unless the actor teaches the class)
  - `sealed interface TeacherEntry permits VisibleEntry, HiddenEntry { String visibility(); }`
  - `record VisibleEntry(String visibility, UUID id, EntryKind kind, Instant createdAt, Instant editedAt, int revisionCount, String body, EntryFields fields, List<RevisionView> history)` — `visibility` is `"VISIBLE"`
  - `record HiddenEntry(String visibility, UUID id, EntryKind kind, Instant createdAt, Instant editedAt, int revisionCount, Instant hiddenAt)` — `visibility` is `"HIDDEN"`
  - `record TeacherStudentLog(UUID studentId, String firstName, String lastName, UUID componentId, List<TeacherEntry> entries)`
  - `TeacherLogProjection.project(List<LogEntry>, Map<UUID, Instant> hiddenAt, Map<UUID, List<LogRevision>> visibleHistory) -> List<TeacherEntry>`
  - `GET /api/v1/components/{componentId}/students/{studentId}/log`

- [ ] **Step 1: Failing test — the one the gate hangs on.**

```java
package ie.coursework.log.authz;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Design §6.6 and FR-24d: the teacher sees that every entry exists, but a hidden entry's body, fields and
 * history never reach them. Every secret carries "SECRET" so one assertion on the raw JSON covers them all.
 * Bite-tested in the plan (Task B11 Step 6).
 */
@AutoConfigureMockMvc
class TeacherLogProjectionTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private String log;
    private String teacherPath;

    @BeforeEach
    void seed() {
        world = fixtures.world();
        var component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        log = "/api/v1/components/" + component + "/log";
        teacherPath = "/api/v1/components/" + component + "/students/" + world.approvedStudent() + "/log";
    }

    @Test
    void aHiddenEntrysContentNeverReachesTheTeacher() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        create(student, "{\"kind\":\"NOTE\",\"body\":\"Visible note text\"}");
        String note = create(student, "{\"kind\":\"NOTE\",\"body\":\"SECRET-note-v1\"}");
        student.post(note + "/revisions", "{\"body\":\"SECRET-note-v2\"}").andExpect(status().isCreated());
        student.put(note + "/visibility", "{\"visible\":false}").andExpect(status().isOk());
        String source = create(student, """
                {"kind":"SOURCE","fields":{"type":"ONLINE_TEXT_OR_IMAGE","title":"SECRET-title","url":"https://example.ie/SECRET-url","dateAccessed":"2026-10-01","reflections":"SECRET-reflection"}}
                """);
        student.put(source + "/visibility", "{\"visible\":false}").andExpect(status().isOk());
        create(student, """
                {"kind":"AI_USE","visibleToTeacher":false,"fields":{"toolNameAndVersion":"SECRET-tool","developer":"SECRET-dev","dateGenerated":"2026-10-01","howUsed":"SECRET-how","prompts":"SECRET-prompt"}}
                """);

        String json = as(ClassFixtures.TEACHER1).get(teacherPath).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(json).doesNotContain("SECRET");
        assertThat(json).contains("Visible note text");
        assertThat(JsonPath.<Integer>read(json, "$.entries.length()")).isEqualTo(4);
        assertThat(JsonPath.<java.util.List<String>>read(json, "$.entries[?(@.visibility == 'HIDDEN')].kind"))
                .containsExactlyInAnyOrder("NOTE", "SOURCE", "AI_USE");
        assertThat(JsonPath.<java.util.List<Integer>>read(json, "$.entries[?(@.kind == 'NOTE' && @.visibility == 'HIDDEN')].revisionCount"))
                .containsExactly(2);
        // Hidden after being visible (Q3): hiddenAt is set. Private from the start: it isn't.
        assertThat(JsonPath.<java.util.List<Object>>read(json, "$.entries[?(@.kind == 'NOTE' && @.visibility == 'HIDDEN')].hiddenAt"))
                .doesNotContainNull();
        assertThat(JsonPath.<java.util.List<Object>>read(json, "$.entries[?(@.kind == 'AI_USE')].hiddenAt")).containsExactly((Object) null);
        assertThat(JsonPath.<java.util.List<Object>>read(json, "$.entries[?(@.visibility == 'HIDDEN')].createdAt")).doesNotContainNull();
    }

    @Test
    void showingAnEntryAgainShowsItsWholeHistory() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        String note = create(student, "{\"kind\":\"NOTE\",\"body\":\"before hiding\"}");
        student.put(note + "/visibility", "{\"visible\":false}").andExpect(status().isOk());
        student.post(note + "/revisions", "{\"body\":\"written while hidden\"}").andExpect(status().isCreated());
        student.put(note + "/visibility", "{\"visible\":true}").andExpect(status().isOk());

        as(ClassFixtures.TEACHER1).get(teacherPath).andExpect(status().isOk())
                .andExpect(jsonPath("$.entries[0].visibility").value("VISIBLE"))
                .andExpect(jsonPath("$.entries[0].body").value("written while hidden"))
                .andExpect(jsonPath("$.entries[0].history[*].body").value(org.hamcrest.Matchers.contains("written while hidden", "before hiding")));
    }

    @Test
    void theTeacherSeesTheStudentsName() throws Exception {
        as(ClassFixtures.TEACHER1).get(teacherPath).andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(world.approvedStudent().toString()))
                .andExpect(jsonPath("$.entries").isEmpty());
    }

    private String create(ApiSession student, String json) throws Exception {
        String body = student.post(log, json).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return "/api/v1/log/" + JsonPath.read(body, "$.entry.id");
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }
}
```

Add to `LogScopeTest` (it needs the component id: keep `component` in a field alongside `log`):

```java
    @Test
    void onlyTheClassesTeacherReadsAStudentsLog() throws Exception {
        String path = "/api/v1/components/" + component + "/students/" + world.approvedStudent() + "/log";
        as(ClassFixtures.TEACHER1).get(path).andExpect(status().isOk());
        for (String user : new String[] {ClassFixtures.TEACHER2, ClassFixtures.TEACHER_B, ClassFixtures.LEADER_A,
                ClassFixtures.APPROVED_STUDENT, ClassFixtures.PENDING_STUDENT}) {
            as(user).get(path).andExpect(status().isNotFound());
        }
        new ApiSession(mockMvc).get(path).andExpect(status().isUnauthorized());
    }

    @Test
    void theTeacherCantReadAPendingRemovedOrOutsideStudent() throws Exception {
        for (java.util.UUID student : new java.util.UUID[] {world.pendingStudent(), world.removedStudent(), world.outsider(), java.util.UUID.randomUUID()}) {
            as(ClassFixtures.TEACHER1).get("/api/v1/components/" + component + "/students/" + student + "/log")
                    .andExpect(status().isNotFound());
        }
    }
```

(Promote `world` and `component` to fields in `LogScopeTest.anApprovedStudentsEntry`.)

- [ ] **Step 2: Run** `./mvnw test -Dtest='TeacherLogProjectionTest,LogScopeTest'` → FAIL (404: no endpoint).

- [ ] **Step 3: `requireOwned`.** In `ComponentService`, next to `owned`:

```java
    /** For another feature's teacher endpoint (the log's reading view): the component if the actor teaches its class, else 404. */
    public ComponentInstance requireOwned(Actor actor, UUID componentId) {
        return owned(actor, componentId).component();
    }
```

- [ ] **Step 4: Views and projection.**

```java
package ie.coursework.log.application;

import ie.coursework.log.application.LogViews.RevisionView;
import ie.coursework.log.domain.EntryFields;
import ie.coursework.log.domain.EntryKind;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** What a teacher gets for one student's log. Mirrored by teacherStudentLogSchema in frontend/lib/api/schemas.ts. */
public final class TeacherLogViews {

    private TeacherLogViews() {}

    public sealed interface TeacherEntry permits VisibleEntry, HiddenEntry {
        String visibility();
    }

    public record VisibleEntry(String visibility, UUID id, EntryKind kind, Instant createdAt, Instant editedAt,
            int revisionCount, String body, EntryFields fields, List<RevisionView> history) implements TeacherEntry {}

    /** No body, fields or history: not null, absent. Nothing added to a mapper can put them in the JSON. */
    public record HiddenEntry(String visibility, UUID id, EntryKind kind, Instant createdAt, Instant editedAt,
            int revisionCount, Instant hiddenAt) implements TeacherEntry {}

    public record TeacherStudentLog(UUID studentId, String firstName, String lastName, UUID componentId,
            List<TeacherEntry> entries) {}
}
```

```java
package ie.coursework.log.application;

import ie.coursework.log.application.LogViews.RevisionView;
import ie.coursework.log.application.TeacherLogViews.HiddenEntry;
import ie.coursework.log.application.TeacherLogViews.TeacherEntry;
import ie.coursework.log.application.TeacherLogViews.VisibleEntry;
import ie.coursework.log.domain.LogEntry;
import ie.coursework.log.domain.LogRevision;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Design §6.6: the teacher's view is enforced in one projection, and this is it. Metadata for every entry;
 * body, fields and history only where visible_to_teacher is true. Nothing else builds a teacher's log view.
 */
public final class TeacherLogProjection {

    private TeacherLogProjection() {}

    public static List<TeacherEntry> project(List<LogEntry> entries, Map<UUID, Instant> hiddenAt,
            Map<UUID, List<LogRevision>> visibleHistory) {
        return entries.stream().map(e -> e.visibleToTeacher()
                ? (TeacherEntry) new VisibleEntry("VISIBLE", e.id(), e.kind(), e.createdAt(), e.editedAt(), e.revisionCount(),
                        e.body(), e.fields(), visibleHistory.getOrDefault(e.id(), List.of()).stream()
                                .map(r -> new RevisionView(r.number(), r.body(), r.fields(), r.createdAt())).toList())
                : new HiddenEntry("HIDDEN", e.id(), e.kind(), e.createdAt(), e.editedAt(), e.revisionCount(), hiddenAt.get(e.id())))
                .toList();
    }
}
```

- [ ] **Step 5: Service and controller.** `LogService` gains two collaborators — update its constructor to `LogService(LogRepository log, ComponentRepository components, ComponentService componentService, EnrolmentRepository enrolments, ObjectMapper json, Clock clock)` — and:

```java
    /** Roadmap §8.3 3C. The class's teacher, and only for an approved student of that class; anything else is 404. */
    public TeacherStudentLog teacherView(Actor actor, UUID componentId, UUID studentId) {
        ComponentInstance component = componentService.requireOwned(actor, componentId);
        Member student = enrolments.membersOf(component.classId()).stream()
                .filter(m -> m.studentId().equals(studentId) && m.status() == EnrolmentStatus.APPROVED)
                .findFirst().orElseThrow(LogService::notFound);
        return new TeacherStudentLog(student.studentId(), student.firstName(), student.lastName(), component.id(),
                TeacherLogProjection.project(log.list(componentId, studentId), log.hiddenAt(componentId, studentId),
                        log.visibleHistory(componentId, studentId)));
    }
```

(imports: `ComponentService`, `ComponentInstance`, `EnrolmentRepository`, `EnrolmentRepository.Member`, `EnrolmentStatus`, `TeacherLogViews.TeacherStudentLog`.)

```java
package ie.coursework.log.adapter.web;

import ie.coursework.identity.domain.Actor;
import ie.coursework.log.application.LogService;
import ie.coursework.log.application.TeacherLogViews.TeacherStudentLog;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The teacher's reading view of one student's log (design §6.6, roadmap §8.3 3C). */
@RestController
@RequestMapping("/api/v1/components/{componentId}/students/{studentId}/log")
public class TeacherLogController {

    private final LogService log;

    public TeacherLogController(LogService log) {
        this.log = log;
    }

    /** Declared as the concrete record: each entry then serialises by its own runtime type (ARCHITECTURE §10). */
    @GetMapping
    TeacherStudentLog read(Actor actor, @PathVariable UUID componentId, @PathVariable UUID studentId) {
        return log.teacherView(actor, componentId, studentId);
    }
}
```

- [ ] **Step 6: Run, then bite.** `./mvnw test -Dtest='TeacherLogProjectionTest,LogScopeTest,LogEntriesTest'` → PASS. Then in `TeacherLogProjection.project`, temporarily replace the whole ternary with the `VisibleEntry` branch (so hidden entries are built as visible), run `TeacherLogProjectionTest` → `aHiddenEntrysContentNeverReachesTheTeacher` FAILS on `doesNotContain("SECRET")`. Restore; `git diff backend/src/main` shows only this task's intended changes.

- [ ] **Step 7: Docs.** `ARCHITECTURE.md` §4: "**A teacher reads a student's log only through `TeacherLogProjection`**, after `ComponentService.requireOwned` and an approved-member check. A hidden entry is a `HiddenEntry`, a type with no body, fields or history properties; `LogRepository.visibleHistory` also filters hidden entries out in SQL. `TeacherLogProjectionTest` proves the raw JSON carries none of a hidden entry's content." Add the endpoint to the authz bullet's list.

- [ ] **Step 8: Commit.** `git add backend/src docs/ARCHITECTURE.md && git commit -m "Add the teacher's log projection: every entry's existence, only visible content"`

## Task B12: The teacher's reading view

**Files:**
- Modify: `frontend/lib/api/schemas.ts` (teacher log)
- Create: `frontend/components/app/teacher-log.tsx` + `.spec.tsx`
- Create: `frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx`
- Modify: `frontend/components/app/class-students.tsx` + `class-students.spec.tsx` (approved names link)

**Interfaces:**
- Consumes: `RevisionContent`, `LogHistory` (B10); `KIND_WORD`, `dublinDate` (B7); `classDetailSchema` (has `componentId`).
- Produces: `teacherStudentLogSchema`, `type TeacherStudentLog`, `TeacherLog({ log })`.

- [ ] **Step 1: Schema.** Append to `schemas.ts`:

```ts
// Mirrors log/application/TeacherLogViews.java. A hidden entry is .strict(): if content ever reached the
// browser in one, parsing would fail and the page would show an error rather than the content.
const teacherEntryBase = { id: z.string(), kind: entryKindSchema, createdAt: z.string(), editedAt: z.string().nullable(), revisionCount: z.number() };
export const teacherEntrySchema = z.discriminatedUnion("visibility", [
  z.object({ ...teacherEntryBase, visibility: z.literal("VISIBLE"), body: z.string().nullable(),
    fields: z.union([sourceFieldsSchema, aiUseFieldsSchema]).nullable(), history: z.array(revisionSchema) }),
  z.object({ ...teacherEntryBase, visibility: z.literal("HIDDEN"), hiddenAt: z.string().nullable() }).strict(),
]);
export type TeacherEntry = z.infer<typeof teacherEntrySchema>;
export const teacherStudentLogSchema = z.object({
  studentId: z.string(), firstName: z.string(), lastName: z.string(), componentId: z.string(), entries: z.array(teacherEntrySchema),
});
export type TeacherStudentLog = z.infer<typeof teacherStudentLogSchema>;
```

- [ ] **Step 2: Failing specs.** `teacher-log.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { teacherStudentLogSchema, type TeacherStudentLog } from "@/lib/api/schemas";

import { TeacherLog } from "./teacher-log";

const log: TeacherStudentLog = {
  studentId: "s1", firstName: "Cian", lastName: "Murphy", componentId: "k1",
  entries: [
    { visibility: "HIDDEN", id: "e3", kind: "NOTE", createdAt: "2027-03-03T10:00:00Z", editedAt: null, revisionCount: 1, hiddenAt: "2027-03-04T10:00:00Z" },
    { visibility: "HIDDEN", id: "e2", kind: "AI_USE", createdAt: "2027-03-02T10:00:00Z", editedAt: null, revisionCount: 1, hiddenAt: null },
    { visibility: "VISIBLE", id: "e1", kind: "NOTE", createdAt: "2027-03-01T10:00:00Z", editedAt: "2027-03-02T10:00:00Z", revisionCount: 2,
      body: "Pilot run went well", fields: null,
      history: [
        { number: 2, body: "Pilot run went well", fields: null, createdAt: "2027-03-02T10:00:00Z" },
        { number: 1, body: "Pilot run", fields: null, createdAt: "2027-03-01T10:00:00Z" },
      ] },
  ],
};

describe("TeacherLog", () => {
  it("shows a hidden entry exists, when, and that it was hidden — never what it said", () => {
    render(<TeacherLog log={log} />);
    const rows = within(screen.getByRole("list", { name: "Log entries" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Note · 3 Mar 2027 · Hidden by the student on 4 Mar 2027");
    expect(rows[1]).toHaveTextContent("AI use · Private entry · 2 Mar 2027");
  });

  it("shows a visible entry, marks it edited, and keeps its history one tap away", () => {
    render(<TeacherLog log={log} />);
    const rows = within(screen.getByRole("list", { name: "Log entries" })).getAllByRole("listitem");
    expect(rows[2]).toHaveTextContent("Note · 1 Mar 2027 · Edited");
    expect(rows[2]).toHaveTextContent("Pilot run went well");
    expect(within(rows[2]).getByText("History (2 revisions)")).toBeInTheDocument();
  });

  it("says when the student hasn't written anything", () => {
    render(<TeacherLog log={{ ...log, entries: [] }} />);
    expect(screen.getByText("Cian hasn't written any log entries yet.")).toBeInTheDocument();
  });

  it("refuses a hidden entry that carries content", () => {
    const leaked = { ...log, entries: [{ ...log.entries[0], body: "leak" }] };
    expect(teacherStudentLogSchema.safeParse(leaked).success).toBe(false);
  });
});
```

In `class-students.spec.tsx`, add: the approved student's name is a link to `/teach/classes/<class id>/students/<student id>` (use the spec's existing approved member fixture's ids).

- [ ] **Step 3: Run** `npx vitest run components/app/teacher-log.spec.tsx components/app/class-students.spec.tsx` → FAIL.

- [ ] **Step 4: Implement `TeacherLog`.**

```tsx
import type { TeacherStudentLog } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate, KIND_WORD } from "@/lib/app/log";

import { LogHistory, RevisionContent } from "./log-history";
import { card } from "./styles";

const day = (iso: string) => formatCalendarDate(dublinDate(iso));

/**
 * FR-24d: a hidden entry looks different from no entry. It shows its kind and date and, when the student
 * hid something they'd shown before (Q3), when — never its content, which the API doesn't send.
 */
export function TeacherLog({ log }: { log: TeacherStudentLog }) {
  if (log.entries.length === 0) {
    return <p className="mt-6 text-app-base text-app-grey">{`${log.firstName} hasn't written any log entries yet.`}</p>;
  }
  return (
    <ul aria-label="Log entries" className="mt-6 flex flex-col gap-3">
      {log.entries.map((e) =>
        e.visibility === "HIDDEN" ? (
          <li key={e.id} className={`${card} border-dashed px-4 py-3 text-app-small text-app-grey`}>
            {e.hiddenAt
              ? `${KIND_WORD[e.kind]} · ${day(e.createdAt)} · Hidden by the student on ${day(e.hiddenAt)}`
              : `${KIND_WORD[e.kind]} · Private entry · ${day(e.createdAt)}`}
          </li>
        ) : (
          <li key={e.id} className={`${card} flex flex-col gap-3 p-4`}>
            <p className="text-app-small text-app-grey">{`${KIND_WORD[e.kind]} · ${day(e.createdAt)}${e.editedAt ? " · Edited" : ""}`}</p>
            <RevisionContent body={e.body} fields={e.fields} />
            {e.revisionCount > 1 && (
              <details>
                <summary className="min-h-11 cursor-pointer text-app-small font-semibold text-app-accent">{`History (${e.revisionCount} revisions)`}</summary>
                <div className="mt-3"><LogHistory history={e.history} /></div>
              </details>
            )}
          </li>
        ),
      )}
    </ul>
  );
}
```

- [ ] **Step 5: Link the names.** In `class-students.tsx`'s approved row, wrap the name:

```tsx
                    <p id={nameId} className="text-app-lead font-semibold break-words text-app-ink">
                      <Link href={`/teach/classes/${detail.id}/students/${m.studentId}`} className={textLink}>{fullName(m)}</Link>
                    </p>
```

(import `Link` from `next/link` and `textLink` from `./styles` if not already.)

- [ ] **Step 6: The page.** `app/(app)/teach/classes/[id]/students/[studentId]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { Notice } from "@/components/app/notice";
import { TeacherLog } from "@/components/app/teacher-log";
import { backLink, pageTitle } from "@/components/app/styles";
import { classDetailSchema, teacherStudentLogSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function StudentLogPage({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params;
  const detail = await attempt(() => serverApi.get(`/classes/${encodeURIComponent(id)}`, classDetailSchema));
  if (!detail.ok && detail.error.code === "NOT_FOUND") notFound();
  if (!detail.ok) return <AppMain width="class"><ErrorPanel error={detail.error} /></AppMain>;

  const cls = detail.data;
  const back = <Link href={`/teach/classes/${cls.id}`} className={backLink}>{cls.name}</Link>;
  if (!cls.componentId) {
    return (
      <AppMain width="class">
        {back}
        <h1 className={`mt-2.5 ${pageTitle}`}>Student log</h1>
        <div className="mt-6"><Notice tone="attention" heading="No component yet">{"Set up this class's component first. Students keep their log inside it."}</Notice></div>
      </AppMain>
    );
  }

  const log = await attempt(() => serverApi.get(
    `/components/${cls.componentId}/students/${encodeURIComponent(studentId)}/log`, teacherStudentLogSchema));
  if (!log.ok && log.error.code === "NOT_FOUND") notFound();

  return (
    <AppMain width="class">
      {back}
      {log.ok ? (
        <>
          <h1 className={`mt-2.5 ${pageTitle}`}>{`${log.data.firstName} ${log.data.lastName}`}</h1>
          <p className="mt-1.5 text-app-base text-app-grey">{"Their log. Entries they've hidden show only the date."}</p>
          <TeacherLog log={log.data} />
        </>
      ) : (
        <div className="mt-6"><ErrorPanel error={log.error} /></div>
      )}
    </AppMain>
  );
}
```


- [ ] **Step 7: Run** `npx vitest run components/app && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 8: Commit.** `git add frontend && git commit -m "Add the teacher's reading view of a student's log"`

## Task B13: The Gate P3 journey

**Files:**
- Create: `frontend/e2e/phase3.e2e.ts`

Self-contained: it doesn't import state from `phase2.e2e.ts`.

- [ ] **Step 1: Write the journey.**

```ts
import { expect, type Page, test } from "@playwright/test";

import { TEACHER, expectAccessible, phone, signInTeacher } from "./helpers";

/**
 * Gate P3's journey (roadmap §8.3): a student logs a note, a source and an AI use and hides the note; the
 * teacher sees that the note exists but not its text; the student edits the source; the teacher sees
 * "Edited" and its history.
 */
const P3 = { className: "", student: "", password: "e2e-student-password" };
const NOTE = "Pilot run went well, retest Tuesday";

test.describe.configure({ mode: "serial" });

test("a class with a component and an approved student", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set; run through scripts/e2e.sh");
  P3.className = `6L Biology ${test.info().project.name} ${Date.now().toString(36)}`;
  P3.student = `e2e.p3.${test.info().project.name}.${Date.now().toString(36)}`;
  await signInTeacher(teacher);
  await teacher.getByRole("link", { name: "Create class" }).click();
  await teacher.getByRole("textbox", { name: "Class name" }).fill(P3.className);
  await teacher.getByRole("button", { name: "Create" }).click();
  await teacher.getByRole("link", { name: "Component" }).click();
  await teacher.getByRole("button", { name: "Create component" }).click();
  await expect(teacher.getByRole("button", { name: "Save dates" })).toBeVisible();
  await teacher.getByRole("link", { name: "Students" }).click();
  const code = (await teacher.getByRole("region", { name: "Join code" }).locator("strong").textContent())?.trim() ?? "";

  const student = await phone(browser);
  await student.goto(`/join/${code}`);
  await student.getByRole("textbox", { name: "First name" }).fill("Aoife");
  await student.getByRole("textbox", { name: "Surname" }).fill("Byrne");
  await student.getByRole("textbox", { name: "Username" }).fill(P3.student);
  await student.getByLabel("Password").fill(P3.password);
  await student.getByRole("button", { name: "Create account and join" }).click();
  await expect(student).toHaveURL(/\/home$/);

  await teacher.reload();
  await teacher.getByRole("button", { name: "Approve Aoife Byrne" }).click();
  await expect(teacher.getByRole("link", { name: "Aoife Byrne" })).toBeVisible();
});

async function signInStudent(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Username" }).fill(P3.student);
  await page.getByLabel("Password").fill(P3.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/home/);
}

async function newEntry(student: Page) {
  await student.getByRole("link", { name: "New entry" }).click();
  await expect(student.getByRole("heading", { level: 1, name: "New entry" })).toBeVisible();
}

async function save(student: Page) {
  await Promise.all([
    student.waitForResponse((r) => r.url().endsWith("/log") && r.request().method() === "POST"),
    student.getByRole("button", { name: "Save entry" }).click(),
  ]);
  await expect(student).toHaveURL(/\/log$/);
}

test("the student logs a note, a source and an AI use, hides the note and edits the source", async ({ browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  const student = await phone(browser);
  await signInStudent(student);
  await student.getByRole("link", { name: /Biology/ }).click();
  await student.getByRole("navigation", { name: "Component sections" }).getByRole("link", { name: "Log" }).click();
  await expect(student.getByText("Nothing in your log yet.")).toBeVisible();
  await expectAccessible(student);

  await newEntry(student);
  await expect(student.getByText("Your teacher can read this.")).toBeVisible();
  await expectAccessible(student);
  await student.getByRole("textbox", { name: "Note" }).fill(NOTE);
  await save(student);

  await newEntry(student);
  await student.getByRole("radio", { name: "Source" }).check();
  await student.getByRole("combobox", { name: "Type of source" }).selectOption("ONLINE_VIDEO");
  await student.getByRole("textbox", { name: "Title" }).fill("Titration technique demo");
  await student.getByRole("textbox", { name: "Link" }).fill("https://youtu.be/yCv4iyPqZKQ");
  await student.getByLabel("Date accessed").fill("2026-10-01");
  await expectAccessible(student);
  await save(student);

  await newEntry(student);
  await student.getByRole("radio", { name: "AI use" }).check();
  await student.getByRole("textbox", { name: "AI tool and version" }).fill("ChatGPT-4");
  await student.getByRole("textbox", { name: "Developer or publisher" }).fill("OpenAI");
  await student.getByLabel("Date the output was generated").fill("2026-10-01");
  await student.getByRole("textbox", { name: "How you used it" }).fill("Suggested possible project themes.");
  await save(student);

  await student.getByRole("button", { name: `Hide ${NOTE} from your teacher` }).click();
  await expect(student.getByRole("button", { name: `Show ${NOTE} to your teacher` })).toBeVisible();
  await expectAccessible(student);

  await student.getByRole("link", { name: "Titration technique demo" }).click();
  await student.getByRole("textbox", { name: "Title" }).fill("Titration technique demo (RTÉ)");
  await Promise.all([
    student.waitForResponse((r) => r.url().includes("/revisions") && r.request().method() === "POST"),
    student.getByRole("button", { name: "Save new revision" }).click(),
  ]);
  await expect(student.getByRole("list", { name: "Revisions" }).getByRole("listitem")).toHaveCount(2);
  await expectAccessible(student);
});

test("the teacher sees the hidden note exists but not its text, and the edited source's history", async ({ page: teacher }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await signInTeacher(teacher);
  await teacher.getByRole("link", { name: P3.className }).click();
  await teacher.getByRole("link", { name: "Aoife Byrne" }).click();
  await expect(teacher.getByRole("heading", { level: 1, name: "Aoife Byrne" })).toBeVisible();

  const rows = teacher.getByRole("list", { name: "Log entries" }).getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(teacher.getByText(/Note · .* · Hidden by the student on /)).toBeVisible();
  await expect(teacher.getByText(NOTE)).toHaveCount(0);
  const source = rows.filter({ hasText: "Titration technique demo (RTÉ)" });
  await expect(source).toContainText("Edited");
  await source.getByText("History (2 revisions)").click();
  await expect(source.getByRole("list", { name: "Revisions" }).getByRole("listitem")).toHaveCount(2);
  await expect(rows.filter({ hasText: "ChatGPT-4" })).toContainText("AI use");
  await expectAccessible(teacher);
});
```


- [ ] **Step 2: Run** `make e2e`. Expected: every file green on both projects; paste the summary. A failure here is a real finding: fix the app, or the test if (and only if) the test is wrong, and say which in the commit.

- [ ] **Step 3: Commit.** `git add frontend/e2e/phase3.e2e.ts && git commit -m "Add Gate P3's journey: log, hide, edit, and the teacher's view"`

## Task B14: Gate P3 and hand-over

**Files:**
- Modify: `docs/PILOT-ROADMAP.md` (§1 status board; §3 Q6 "fields answered from the 2025–26 Rules, p. 34; formatters still Phase 6"; §8.3 status and Gate P3 ticks; §9 R2 "When" → "Before go-live")
- Modify: `docs/HANDOFF.md`, `docs/ARCHITECTURE.md` §6 (the four new pages)
- Create: `docs/changes/pilot-3-the-log.md` (via `write-changes`)

- [ ] **Step 1: Verify.** `make verify` and `make e2e`; paste the counts. Walk `UI-CHECKLIST.md` for the four new pages and record which items were checked and how (keyboard-only run of the student flow on a phone viewport; axe clean from the journey). Say plainly what couldn't be checked.

- [ ] **Step 2: Docs.** `ARCHITECTURE.md` §6: a bullet for the log pages (`/components/[id]/log`, `/new`, `/[entryId]`; the teacher's `/teach/classes/[id]/students/[studentId]`; `LogEntryForm`'s create/revise modes; the hidden-entry schema is `.strict()`). Roadmap updates as listed above. Commit: `git commit -am "Record Phase 3 as built: roadmap, architecture"`.

- [ ] **Step 3: Stop for review.** Tell Tim Part B is ready for `/self-review` in a fresh session (diff base `pilotMain`). Fix or record every finding.

- [ ] **Step 4: Changes doc.** `write-changes` with slug `pilot-3-the-log` → commit `docs/changes/pilot-3-the-log.md`.

- [ ] **Step 5: Handoff.** Rewrite `docs/HANDOFF.md`'s "Where things are" for Phase 3; waiting on a human: D-6 (if not arrived), Tim's review of the log pages, the Rules-edition risk (diff Appendix 2 when the 2026–27 edition is out). Commit.

- [ ] **Step 6: Merge.** `superpowers:finishing-a-development-branch`; on Tim's yes, merge locally into `pilotMain`. Confirm before any push.

### Gate P3

- [ ] `make verify` and `make e2e` green; the journey covers log, hide and edit
- [ ] A back-dated `createdAt` is ignored, and a test says so (`LogEntriesTest`)
- [ ] Authz: another student's log → 404; a teacher of a different class → 404 (`LogScopeTest`)
- [ ] The projection's raw-JSON test passes with its bite test (`TeacherLogProjectionTest`)
- [ ] `/self-review` in a fresh session; `docs/changes/pilot-3-the-log.md` committed on the branch

## Task B15: Restyle from D-6 (only once the pack exists)

**Skip this task, and record it as skipped in `HANDOFF.md`, if `docs/design/pilot/D-6-log/` doesn't exist** — as 2E Task 8 and 2F Task 7 were skipped until their packs came.

When it exists, follow roadmap §6.3 (the design handoff protocol) and the pattern of 2F Task 7:

- [ ] **Step 1:** Read the pack's `NOTES.md` and frames at 390px and 1140px; list each difference from the built pages and each open question's answer. Add any new tokens to `app/globals.css` with their contrast ratios.
- [ ] **Step 2:** Restyle `LogList`, `LogVisibilityToggle`, `LogEntryForm`, `LogHistory`, `TeacherLog` and the four pages. **Every existing spec must keep passing unchanged** — they query by role and name, which is the contract (§6.3). If the pack renames a control, change the spec and the journey in the same commit and say why.
- [ ] **Step 3:** `make verify` and `make e2e` green; axe clean. Say what you checked in a browser at both widths, or that you couldn't.
- [ ] **Step 4:** Commit `Restyle the log from design pack D-6`, update `HANDOFF.md`.

---

## Self-review notes (for the executor)

- Names that cross tasks: `LogRepository.findOwn`, `hiddenAt`, `visibleHistory` (B5 → B6, B11); `LogViews.RevisionView` (B6 → B11); `ComponentService.requireOwned` (B11); `LogEntryForm` modes (B9 → B10); `RevisionContent`/`LogHistory` (B10 → B12); `FIELD_LABELS` (B7 → B1's prompt, B9, B10).
- The JSON names the frontend relies on are the Java record component names: `entry`, `history`, `visibleToTeacher`, `revisionCount`, `editedAt`, `visibility`, `hiddenAt`.
- If any SEC or NCCA phrase in `LogFieldSourcesTest` fails, stop and ask Tim; never reword it.
