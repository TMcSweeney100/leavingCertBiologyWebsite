# Pilot 2E — Student Component Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An approved student opens `/components/[id]` on a phone and sees where they are in that subject's coursework: the current stage and days to its date, every stage with its description, hours, date, checkpoint state, the teacher's items to tick (marked self-reported) and the guidelines' prompts, then the report sections, formatting rules and mark bands. Ticking works with one thumb.

**Architecture:** `GET /components/{id}` gains its student shape (`view: "STUDENT"`), built by `ComponentService` from the template version, the brief, the class's dates, active teacher items and the student's own ticks (`item_tick`, `V9`). The server supplies `today` as a Dublin calendar date and each checkpoint's state, so the page and the tests agree on the day. The frontend derives stage states (done, current, upcoming, undated) in a pure `lib/app/component-progress.ts` that reuses `countdownText` from `lib/schedule.ts`. The page is built from new app components; the BiPi components aren't reused as they are (decision P2-33). `GET /me/components` lists a student's components for navigation.

**Tech Stack:** Spring Boot 4.1, `JdbcClient`, Postgres 18; Next.js 15.3.9, Zod 4, Vitest + Testing Library, `node:test`, Playwright + axe.

**Roadmap:** §6.1 (student navigation), §6.2 (`/components/[id]` row), §7 Phase 2, §8.2 2E. **Design:** §4.6, §6.2–§6.5, §7.2–§7.3, §8.3, §8.4 ("due").

---

## Before you start

- 2D is merged: `git checkout -b pilot/2e-student-component-page`.
- `make verify` and `make e2e` are green.
- Read: plan 2D (the component package, `ComponentService.owned`, `ComponentViews`); `backend/src/main/java/ie/coursework/classes/adapter/persistence/EnrolmentRepository.java`; `frontend/lib/schedule.ts` (`countdownText`, and why calendar dates are handled as UTC midnights); `frontend/components/bipi/stage-card.tsx` and `lib/schedule.types.ts` (to see why they aren't reused directly).
- **Design pack D-3 may not have arrived.** Build working-first; Task 8 is the restyle and waits for `docs/design/pilot/D-3-student-component/`. D-3 is also where Tim decides between reusing the BiPi look and restyling in Navy.
- Migration number: `V9`.

**Decisions this plan takes** (proposed; status in roadmap §3 "Phase 2 questions"):

| # | Decision | Where |
|---|---|---|
| P2-33 | **The student page is built from new app components, not by adapting data into the BiPi components' props.** The BiPi `Stage` type needs text a teacher wrote for one class (`weekRange`, `whatsDue`, `whatGoodLooksLike`, `tasks`, `glanceText`, `teacherCheckpoint` as prose); the national template holds none of it, so filling those props would mean inventing content. What's reused is the logic: `countdownText` and the calendar-date discipline from `lib/schedule.ts`. D-3 decides the look (reuse BiPi styling or Navy). Roadmap §8.2 2E is reworded to match. **Confirmed by Tim, 16 Sep 2026 (Q-P2-C).** | 2E |
| P2-34 | **A checkpoint is `DUE` once its stage's date has passed** (the day after the date; design §8.4 "due once its stage's date has passed"), `NOT_DUE` before that or when the stage has no date. Phase 4 adds `SIGNED_OFF` with the date. The student page words them "Not due yet" and "Not signed off yet". | `CheckpointState` |
| P2-35 | **The server sends `today` (Dublin calendar date)** with the student view and computes checkpoint states from it. The page derives the current stage from the same `today`, so a page rendered at 00:30 in Dublin can't disagree with its own checkpoints. | `StudentComponent.today` |
| P2-36 | **The current stage is the first stage, by ordinal, whose date is today or later.** Stages before it are done, stages after it upcoming, undated stages "No date yet". Phases: `no-dates` (nothing dated), `in-progress`, `finished` (every dated stage has passed), `closed` (after the completion date). Design §4.6: nothing locks a student into the order; "current" is a pointer, not a gate. | `lib/app/component-progress.ts` |
| P2-37 | **A tick is `PUT …/teacher-items/{itemId}/tick` with `{ "done": true|false }`**, idempotent. Unticking keeps the row with `done_at NULL`. Only an approved student of the class can tick; the teacher can't tick for them. | `V9`, `ItemTickRepository` |
| P2-38 | **Ticks are labelled as the student's own record**: a ticked item says "Ticked by you", and the list says "Ticks are your own record, not your teacher's sign-off." (functional spec rule 1; D-3 may reword). | `ItemTick` |
| P2-39 | **Report sections are listed without a "written during" stage or live status**, because `template_section_stage` is empty (Q-P2-B, confirmed 16 Sep 2026: no mapping). The API still returns `stageIds` (always empty) so a later mapping needs no API change. | `ComponentOverview` |
| P2-40 | **`/home` gains a "My components" list** (one link per component, labelled by subject), working-first navigation until D-4 designs the student nav. | `/home` |
| P2-41 | **A teacher who opens `/components/[id]` for their own class is sent to its Component tab**, because the teacher shape isn't a student page. | `app/(app)/components/[id]/page.tsx` |

---

## File structure

Backend (`backend/src/main/java/ie/coursework/` unless noted):

| File | Responsibility | Task |
|---|---|---|
| `components/domain/CheckpointState.java`, `DublinDate.java` + tests | Due rule; today in Dublin | 1 |
| `resources/db/migration/V9__item_ticks.sql` | `item_tick` | 2 |
| `components/adapter/persistence/ItemTickRepository.java` | Ticks per student | 2 |
| `components/adapter/persistence/TemplateRepository.java` | + sections, bands, prompts, checkpoints, process note | 3 |
| `components/adapter/persistence/BriefRepository.java` | + brief details and rules | 3 |
| `components/adapter/persistence/ComponentRepository.java` | + approved-student scope, my components | 3 |
| `components/application/ComponentViews.java`, `ComponentService.java` | Student view, tick, my components | 4, 5 |
| `components/adapter/web/ComponentController.java`, `TickRequest.java`, `MeComponentsController.java` | Endpoints | 4, 5 |
| `test/…/components/adapter/web/StudentComponentViewTest.java`, `ItemTickTest.java`, `MyComponentsTest.java` | HTTP | 4, 5 |
| `test/…/components/authz/ComponentScopeTest.java` | Student view and tick scope | 5 |

Frontend (`frontend/`):

| File | Responsibility | Task |
|---|---|---|
| `lib/api/schemas.ts` | Student component, my components | 6 |
| `lib/app/component-progress.ts` + `.test.ts` | Stage states, phase, countdown | 6 |
| `components/app/component-tabs.tsx` | Overview · Log · Sources · AI use · Word checker | 7 |
| `components/app/component-overview.tsx` + spec | The page body | 7 |
| `components/app/item-tick.tsx` + spec | One tickable item | 7 |
| `components/app/my-components.tsx` + spec | Links on `/home` | 7 |
| `app/(app)/components/[id]/page.tsx`, `app/(app)/home/page.tsx` | Pages | 7 |
| `e2e/phase2.e2e.ts` | The student part of the journey | 7 |

---

## Task 1: Due checkpoints and Dublin's today

**Files:**
- Create: `backend/src/main/java/ie/coursework/components/domain/CheckpointState.java`, `DublinDate.java`
- Test: `backend/src/test/java/ie/coursework/components/domain/CheckpointStateTest.java`, `DublinDateTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package ie.coursework.components.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class CheckpointStateTest {

    private static final LocalDate STAGE_DATE = LocalDate.of(2026, 9, 25);

    @Test
    void notDueOnOrBeforeTheStagesDate() {
        assertThat(CheckpointState.at(STAGE_DATE, STAGE_DATE.minusDays(3))).isEqualTo(CheckpointState.NOT_DUE);
        assertThat(CheckpointState.at(STAGE_DATE, STAGE_DATE)).isEqualTo(CheckpointState.NOT_DUE);
    }

    @Test
    void dueFromTheDayAfter() {
        assertThat(CheckpointState.at(STAGE_DATE, STAGE_DATE.plusDays(1))).isEqualTo(CheckpointState.DUE);
    }

    @Test
    void neverDueWithoutADate() {
        assertThat(CheckpointState.at(null, LocalDate.of(2030, 1, 1))).isEqualTo(CheckpointState.NOT_DUE);
    }
}
```

```java
package ie.coursework.components.domain;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.support.MutableClock;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class DublinDateTest {

    @Test
    void halfPastMidnightInDublinSummerTimeIsAlreadyTomorrow() {
        // 23:30 UTC on 15 Oct is 00:30 IST on 16 Oct.
        assertThat(DublinDate.today(new MutableClock(Instant.parse("2026-10-15T23:30:00Z")))).isEqualTo(LocalDate.of(2026, 10, 16));
    }

    @Test
    void inWinterDublinIsUtc() {
        assertThat(DublinDate.today(new MutableClock(Instant.parse("2026-12-15T23:30:00Z")))).isEqualTo(LocalDate.of(2026, 12, 15));
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd backend && ./mvnw test -Dtest='CheckpointStateTest,DublinDateTest'`
Expected: FAIL to compile.

- [ ] **Step 3: Implement**

```java
package ie.coursework.components.domain;

import java.time.LocalDate;

/** Design §8.4: a checkpoint is due once its stage's date has passed. Phase 4 adds SIGNED_OFF. */
public enum CheckpointState {
    NOT_DUE,
    DUE;

    public static CheckpointState at(LocalDate stageDate, LocalDate today) {
        return stageDate != null && stageDate.isBefore(today) ? DUE : NOT_DUE;
    }
}
```

```java
package ie.coursework.components.domain;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

/** Schools run on Irish dates. The server runs in UTC, and Ireland is UTC+1 for much of the school year. */
public final class DublinDate {

    private static final ZoneId DUBLIN = ZoneId.of("Europe/Dublin");

    private DublinDate() {}

    public static LocalDate today(Clock clock) {
        return LocalDate.ofInstant(clock.instant(), DUBLIN);
    }
}
```

`MutableClock.withZone` returns itself in UTC, which is why this reads `clock.instant()` rather than `LocalDate.now(clock.withZone(…))`.

- [ ] **Step 4: Run them to see them pass**

Run: `cd backend && ./mvnw test -Dtest='CheckpointStateTest,DublinDateTest'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/ie/coursework/components/domain backend/src/test/java/ie/coursework/components/domain
git commit -m "Treat a checkpoint as due the day after its stage's date, in Dublin"
```

---

## Task 2: Ticks table and repository

**Files:**
- Create: `backend/src/main/resources/db/migration/V9__item_ticks.sql`
- Create: `backend/src/main/java/ie/coursework/components/adapter/persistence/ItemTickRepository.java`
- Test: `backend/src/test/java/ie/coursework/components/adapter/persistence/ItemTickRepositoryTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ItemTickRepositoryTest extends PostgresIntegrationTest {

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private ItemTickRepository ticks;

    @Test
    void tickingAndUntickingIsPerStudentAndKeepsTheRow() {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        UUID item = components.item(component, components.stageId(ComponentFixtures.BIOLOGY_2027, 6), "Full draft in", null);

        ticks.set(component, world.approvedStudent(), item, true, Instant.parse("2026-11-01T10:00:00Z"));
        assertThat(ticks.doneItems(component, world.approvedStudent())).containsExactly(item);
        assertThat(ticks.doneItems(component, world.pendingStudent())).isEmpty();

        ticks.set(component, world.approvedStudent(), item, false, Instant.parse("2026-11-02T10:00:00Z"));
        ticks.set(component, world.approvedStudent(), item, false, Instant.parse("2026-11-02T10:05:00Z"));
        assertThat(ticks.doneItems(component, world.approvedStudent())).isEmpty();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM item_tick", Integer.class)).isEqualTo(1);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw test -Dtest=ItemTickRepositoryTest`
Expected: FAIL to compile.

- [ ] **Step 3: Migration and repository**

`backend/src/main/resources/db/migration/V9__item_ticks.sql` (checked on Postgres 18 when this plan was written):

```sql
-- A student's own tick on a teacher item (design §6.5). Self-reported, and the interface says so.
-- Keyed on student and component, not enrolment (review issue #3). Unticking clears done_at; the row stays.
CREATE TABLE item_tick (
    instance_id     uuid        NOT NULL REFERENCES component_instance (id),
    student_user_id uuid        NOT NULL REFERENCES app_user (id),
    teacher_item_id uuid        NOT NULL REFERENCES teacher_item (id),
    done_at         timestamptz,
    updated_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (student_user_id, teacher_item_id)
);
CREATE INDEX item_tick_instance_idx ON item_tick (instance_id, student_user_id);
```

```java
package ie.coursework.components.adapter.persistence;

import ie.coursework.shared.persistence.Timestamps;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ItemTickRepository {

    private final JdbcClient jdbc;

    public ItemTickRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Set<UUID> doneItems(UUID componentId, UUID studentId) {
        return jdbc.sql("""
                SELECT teacher_item_id FROM item_tick
                WHERE instance_id = :component AND student_user_id = :student AND done_at IS NOT NULL
                """).param("component", componentId).param("student", studentId)
                .query(UUID.class).stream().collect(Collectors.toSet());
    }

    public void set(UUID componentId, UUID studentId, UUID itemId, boolean done, Instant now) {
        jdbc.sql("""
                INSERT INTO item_tick (instance_id, student_user_id, teacher_item_id, done_at, updated_at)
                VALUES (:component, :student, :item, :doneAt, :now)
                ON CONFLICT (student_user_id, teacher_item_id)
                DO UPDATE SET done_at = EXCLUDED.done_at, updated_at = EXCLUDED.updated_at
                """).param("component", componentId).param("student", studentId).param("item", itemId)
                .param("doneAt", done ? Timestamps.utc(now) : null, java.sql.Types.TIMESTAMP_WITH_TIMEZONE)
                .param("now", Timestamps.utc(now))
                .update();
    }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `cd backend && ./mvnw test -Dtest=ItemTickRepositoryTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V9__item_ticks.sql \
        backend/src/main/java/ie/coursework/components/adapter/persistence/ItemTickRepository.java \
        backend/src/test/java/ie/coursework/components/adapter/persistence/ItemTickRepositoryTest.java
git commit -m "Record a student's own ticks on teacher items"
```

---

## Task 3: Read what the student page shows

**Files:**
- Modify: `TemplateRepository.java`, `BriefRepository.java`, `ComponentRepository.java`
- Create: `backend/src/main/java/ie/coursework/components/domain/` records `TemplateSection.java`, `MarkBand.java`, `TemplatePrompt.java`, `TemplateCheckpoint.java`, `BriefDetails.java`, `BriefRule.java`, `StudentComponentRef.java`
- Test: `backend/src/test/java/ie/coursework/components/adapter/persistence/StudentReadRepositoriesTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.components.domain.Brief;
import ie.coursework.components.domain.MarkBand;
import ie.coursework.components.domain.TemplateSection;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class StudentReadRepositoriesTest extends PostgresIntegrationTest {

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private BriefRepository briefs;
    @Autowired private TemplateRepository templates;
    @Autowired private ComponentRepository componentRepository;

    @Test
    void readsBusinessSectionsBandsPromptsAndRules() {
        Brief business = briefs.published("BUSINESS", 2027).getFirst();

        assertThat(templates.sections(business.versionId())).extracting(TemplateSection::name, TemplateSection::suggestedWords)
                .startsWith(org.assertj.core.groups.Tuple.tuple("Introduction", 200));
        assertThat(templates.bands(business.versionId())).extracting(MarkBand::name, MarkBand::sectionLabels)
                .contains(org.assertj.core.groups.Tuple.tuple("Investigation, Findings, Analysis and Evaluation", java.util.List.of("2", "3")));
        assertThat(templates.prompts(business.versionId())).hasSize(48);
        assertThat(templates.checkpoints(business.versionId())).hasSize(6);
        assertThat(templates.processNote(business.versionId())).contains("reflection");
        assertThat(briefs.details(business.id()).imageLimit()).isEqualTo(10);
        assertThat(briefs.rules(business.id())).hasSize(7).first().extracting("key").isEqualTo("Section headings");
    }

    @Test
    void aComponentIsVisibleOnlyToApprovedStudentsOfItsClass() {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);

        assertThat(componentRepository.findForApprovedStudent(component, world.approvedStudent())).isPresent();
        assertThat(componentRepository.findForApprovedStudent(component, world.pendingStudent())).isEmpty();
        assertThat(componentRepository.findForApprovedStudent(component, world.removedStudent())).isEmpty();
        assertThat(componentRepository.findForApprovedStudent(component, world.outsider())).isEmpty();
        assertThat(componentRepository.forStudent(world.approvedStudent())).extracting("componentId").containsExactly(component);
        assertThat(componentRepository.forStudent(world.pendingStudent())).isEmpty();
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw test -Dtest=StudentReadRepositoriesTest`
Expected: FAIL to compile.

- [ ] **Step 3: Records**

```java
package ie.coursework.components.domain;

import java.util.List;
import java.util.UUID;

public record TemplateSection(String label, String name, Integer suggestedWords, List<String> indicativeContent, List<UUID> stageIds) {}
```

```java
package ie.coursework.components.domain;

import java.util.List;

public record MarkBand(String label, String name, int marks, boolean wholeReport, List<String> criteria, List<String> sectionLabels) {}
```

```java
package ie.coursework.components.domain;

import java.util.UUID;

public record TemplatePrompt(UUID stageId, String heading, String text) {}
```

```java
package ie.coursework.components.domain;

import java.util.UUID;

public record TemplateCheckpoint(UUID stageId, String text) {}
```

```java
package ie.coursework.components.domain;

public record BriefDetails(String topicBody, int wordLimit, String wordsNotCounted, int imageLimit, String imageNote) {}
```

```java
package ie.coursework.components.domain;

public record BriefRule(String key, String value) {}
```

```java
package ie.coursework.components.domain;

import java.time.LocalDate;
import java.util.UUID;

/** A component as a student's navigation lists it. */
public record StudentComponentRef(UUID componentId, UUID classId, String className, String subjectCode, String subjectName,
        String briefTitle, LocalDate completionDate) {}
```

- [ ] **Step 4: Repository methods**

Add to `TemplateRepository` (imports: the new records, `java.sql.Array`, `java.util.Arrays`):

```java
    public List<TemplateSection> sections(UUID versionId) {
        return jdbc.sql("""
                SELECT s.label, s.name, s.suggested_words, s.indicative_content,
                       coalesce(array_agg(l.stage_id ORDER BY st.ordinal) FILTER (WHERE l.stage_id IS NOT NULL), '{}') AS stage_ids
                FROM template_section s
                LEFT JOIN template_section_stage l ON l.section_id = s.id
                LEFT JOIN template_stage st ON st.id = l.stage_id
                WHERE s.version_id = :version
                GROUP BY s.id ORDER BY s.ordinal
                """).param("version", versionId)
                .query((rs, i) -> new TemplateSection(rs.getString("label"), rs.getString("name"),
                        rs.getObject("suggested_words", Integer.class), strings(rs.getArray("indicative_content")),
                        uuids(rs.getArray("stage_ids"))))
                .list();
    }

    public List<MarkBand> bands(UUID versionId) {
        return jdbc.sql("""
                SELECT b.label, b.name, b.marks, b.whole_report, b.criteria,
                       coalesce(array_agg(s.label ORDER BY s.ordinal) FILTER (WHERE s.id IS NOT NULL), '{}') AS section_labels
                FROM template_mark_band b
                LEFT JOIN template_mark_band_section l ON l.band_id = b.id
                LEFT JOIN template_section s ON s.id = l.section_id
                WHERE b.version_id = :version
                GROUP BY b.id ORDER BY b.ordinal
                """).param("version", versionId)
                .query((rs, i) -> new MarkBand(rs.getString("label"), rs.getString("name"), rs.getInt("marks"),
                        rs.getBoolean("whole_report"), strings(rs.getArray("criteria")), strings(rs.getArray("section_labels"))))
                .list();
    }

    public List<TemplatePrompt> prompts(UUID versionId) {
        return jdbc.sql("""
                SELECT p.stage_id, p.heading, p.text FROM template_prompt p JOIN template_stage s ON s.id = p.stage_id
                WHERE p.version_id = :version ORDER BY s.ordinal, p.ordinal
                """).param("version", versionId)
                .query((rs, i) -> new TemplatePrompt(rs.getObject("stage_id", UUID.class), rs.getString("heading"), rs.getString("text")))
                .list();
    }

    public List<TemplateCheckpoint> checkpoints(UUID versionId) {
        return jdbc.sql("""
                SELECT c.stage_id, c.text FROM template_checkpoint c JOIN template_stage s ON s.id = c.stage_id
                WHERE c.version_id = :version ORDER BY s.ordinal, c.ordinal
                """).param("version", versionId)
                .query((rs, i) -> new TemplateCheckpoint(rs.getObject("stage_id", UUID.class), rs.getString("text")))
                .list();
    }

    public String processNote(UUID versionId) {
        return jdbc.sql("SELECT process_note FROM template_version WHERE id = :version")
                .param("version", versionId).query(String.class).single();
    }

    private static List<String> strings(Array array) throws SQLException {
        return List.of((String[]) array.getArray());
    }

    private static List<UUID> uuids(Array array) throws SQLException {
        return Arrays.stream((Object[]) array.getArray()).map(UUID.class::cast).toList();
    }
```

Once `sections`, `bands`, `prompts` and `checkpoints` exist, rewrite 2D's `checkpointTextByStage` on top of `checkpoints(versionId)` (first per stage) so there's one query for checkpoints.

Add to `BriefRepository`:

```java
    public BriefDetails details(UUID briefId) {
        return jdbc.sql("""
                SELECT topic_body, word_limit, words_not_counted, image_limit, image_note FROM annual_brief WHERE id = :id
                """).param("id", briefId)
                .query((rs, i) -> new BriefDetails(rs.getString("topic_body"), rs.getInt("word_limit"),
                        rs.getString("words_not_counted"), rs.getInt("image_limit"), rs.getString("image_note")))
                .single();
    }

    public List<BriefRule> rules(UUID briefId) {
        return jdbc.sql("SELECT key, value FROM brief_rule WHERE brief_id = :id ORDER BY ordinal")
                .param("id", briefId).query(BriefRule.class).list();
    }
```

Add to `ComponentRepository`:

```java
    /** The scope check for a student: approved (not pending, not removed) in the component's class. */
    public Optional<ComponentInstance> findForApprovedStudent(UUID componentId, UUID studentId) {
        return jdbc.sql("""
                SELECT i.id, i.class_group_id, i.annual_brief_id FROM component_instance i
                JOIN enrolment e ON e.class_group_id = i.class_group_id
                WHERE i.id = :id AND e.student_user_id = :student AND e.status = 'APPROVED'
                """).param("id", componentId).param("student", studentId)
                .query((rs, row) -> new ComponentInstance(rs.getObject("id", UUID.class),
                        rs.getObject("class_group_id", UUID.class), rs.getObject("annual_brief_id", UUID.class)))
                .optional();
    }

    public List<StudentComponentRef> forStudent(UUID studentId) {
        return jdbc.sql("""
                SELECT i.id AS component_id, g.id AS class_id, g.name AS class_name, s.code AS subject_code,
                       s.name AS subject_name, b.title AS brief_title, b.completion_date
                FROM enrolment e
                JOIN class_group g ON g.id = e.class_group_id
                JOIN subject s ON s.id = g.subject_id
                JOIN component_instance i ON i.class_group_id = g.id
                JOIN annual_brief b ON b.id = i.annual_brief_id
                WHERE e.student_user_id = :student AND e.status = 'APPROVED'
                ORDER BY s.name, g.name
                """).param("student", studentId).query(StudentComponentRef.class).list();
    }
```

`query(StudentComponentRef.class)` maps snake_case columns to record components by name; if your Spring version doesn't, map by hand as `findForApprovedStudent` does.

- [ ] **Step 5: Run it to see it pass**

Run: `cd backend && ./mvnw test -Dtest='StudentReadRepositoriesTest,ComponentRepositoriesTest'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/ie/coursework/components backend/src/test/java/ie/coursework/components/adapter/persistence/StudentReadRepositoriesTest.java
git commit -m "Read sections, mark bands, prompts, checkpoints and brief rules; scope components to approved students"
```

---

## Task 4: The student view

**Files:**
- Modify: `ComponentViews.java`, `ComponentService.java`
- Test: `backend/src/test/java/ie/coursework/components/adapter/web/StudentComponentViewTest.java`

- [ ] **Step 1: Write the failing test**

The test pins the clock so checkpoint states are predictable. Override the `Clock` bean the way existing tests do (search for `MutableClock` under `backend/src/test` and copy that `@TestConfiguration`; if none exists, add this nested class):

```java
package ie.coursework.components.adapter.web;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.MutableClock;
import ie.coursework.support.TestAccounts;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
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
class StudentComponentViewTest extends PostgresIntegrationTest {

    @TestConfiguration
    static class PinnedClock {
        @Bean
        @Primary
        Clock clock() {
            // Monday 12 Oct 2026, 09:00 in Dublin.
            return new MutableClock(Instant.parse("2026-10-12T08:00:00Z"));
        }
    }

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private UUID component;
    private UUID draftItem;

    @BeforeEach
    void component() {
        ClassFixtures.World world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        components.stageDate(component, components.stageId(BIO, 3), LocalDate.of(2026, 9, 25));
        components.stageDate(component, components.stageId(BIO, 4), LocalDate.of(2026, 10, 16));
        draftItem = components.item(component, components.stageId(BIO, 6), "Full draft in for feedback", LocalDate.of(2026, 12, 4));
    }

    @Test
    void anApprovedStudentSeesTheWholeComponent() throws Exception {
        student().get("/api/v1/components/" + component)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.view").value("STUDENT"))
                .andExpect(jsonPath("$.today").value("2026-10-12"))
                .andExpect(jsonPath("$.subjectName").value("Biology"))
                .andExpect(jsonPath("$.brief.completionDate").value("2027-02-26"))
                .andExpect(jsonPath("$.brief.imageLimit").value(20))
                .andExpect(jsonPath("$.brief.rules.length()").value(7))
                .andExpect(jsonPath("$.processNote").value(org.hamcrest.Matchers.containsString("linear")))
                .andExpect(jsonPath("$.stages.length()").value(6))
                .andExpect(jsonPath("$.stages[0].prompts.length()").value(5))
                .andExpect(jsonPath("$.stages[0].description").value(org.hamcrest.Matchers.startsWith("This part of the investigation")))
                .andExpect(jsonPath("$.stages[2].dueDate").value("2026-09-25"))
                .andExpect(jsonPath("$.stages[2].checkpoint.state").value("DUE"))
                .andExpect(jsonPath("$.stages[3].checkpoint.state").value("NOT_DUE"))
                .andExpect(jsonPath("$.stages[4].dueDate").value(nullValue()))
                .andExpect(jsonPath("$.stages[5].items[0].text").value("Full draft in for feedback"))
                .andExpect(jsonPath("$.stages[5].items[0].done").value(false))
                .andExpect(jsonPath("$.sections.length()").value(7))
                .andExpect(jsonPath("$.markBands[3].wholeReport").value(true))
                .andExpect(jsonPath("$.marksTotal").value(200))
                .andExpect(jsonPath("$.weightingPercent").value(40));
    }

    @Test
    void theStudentViewCarriesNothingTeacherOnly() throws Exception {
        String json = student().get("/api/v1/components/" + component).andReturn().getResponse().getContentAsString();

        org.assertj.core.api.Assertions.assertThat(json).doesNotContain("\"warnings\"").doesNotContain("\"classId\"");
    }

    @Test
    void retiredItemsDisappearForStudents() throws Exception {
        jdbcTemplate.update("UPDATE teacher_item SET retired_at = now() WHERE id = ?", draftItem);

        student().get("/api/v1/components/" + component).andExpect(jsonPath("$.stages[5].items").isEmpty());
    }

    @Test
    void theTeacherStillGetsTheSetupView() throws Exception {
        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .get("/api/v1/components/" + component).andExpect(jsonPath("$.view").value("TEACHER"));
    }

    private ApiSession student() throws Exception {
        return new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);
    }
}
```

A `@TestConfiguration` with a `@Primary` clock gives this class its own Spring context, which starts slower; that's acceptable for one class. If a shared pinned-clock mechanism exists in the suite, use it instead.

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw test -Dtest=StudentComponentViewTest`
Expected: FAIL: the student gets 404.

- [ ] **Step 3: Views**

Add to `ComponentViews`:

```java
    public record RuleView(String key, String value) {}

    public record BriefDetail(int examYear, String secCode, String title, String topicTitle, String topicBody,
            LocalDate completionDate, int wordLimit, String wordsNotCounted, int imageLimit, String imageNote,
            List<RuleView> rules) {}

    public record CheckpointView(String text, CheckpointState state) {}

    public record StudentItem(UUID id, String text, LocalDate dueDate, boolean done) {}

    public record PromptView(String heading, String text) {}

    public record StudentStage(UUID id, int ordinal, String label, String name, String description, Integer hoursMin,
            Integer hoursMax, String hoursGroup, boolean supervised, LocalDate dueDate, CheckpointView checkpoint,
            List<StudentItem> items, List<PromptView> prompts) {}

    public record SectionView(String label, String name, Integer suggestedWords, List<String> indicativeContent, List<UUID> stageIds) {}

    public record MarkBandView(String label, String name, int marks, boolean wholeReport, List<String> criteria, List<String> sectionLabels) {}

    /** What an approved student sees (design §8.3). Nothing about other students, and no teacher warnings. */
    public record StudentComponent(String view, UUID id, String className, String subjectCode, String subjectName,
            int weightingPercent, int marksTotal, BriefDetail brief, String processNote, LocalDate today,
            List<StudentStage> stages, List<SectionView> sections, List<MarkBandView> markBands) implements ComponentView {}

    public record MyComponent(UUID componentId, String className, String subjectCode, String subjectName,
            String briefTitle, LocalDate completionDate) {}
```

(`import ie.coursework.components.domain.CheckpointState;`)

`weightingPercent` and `marksTotal` come from `component_template`: add `weightingPercent` and `marksTotal` to the `Brief` record and `BriefRepository`'s `PUBLISHED` select (`t.weighting_percent, t.marks_total`), and to its `map`.

- [ ] **Step 4: Service**

In `ComponentService`: add `ItemTickRepository ticks` to the constructor. Replace `view`:

```java
    /** Role-shaped (plan 2D P2-28): the class's teacher gets setup, an approved student their page, anyone else 404. */
    public ComponentView view(Actor actor, UUID componentId) {
        if (actor.holds(Role.TEACHER) && components.findOwned(componentId, actor.userId()).isPresent()) {
            return teacherView(owned(actor, componentId));
        }
        ComponentInstance component = components.findForApprovedStudent(componentId, actor.userId())
                .orElseThrow(ComponentService::notFound);
        return studentView(actor, component);
    }

    StudentComponent studentView(Actor actor, ComponentInstance component) {
        Brief brief = briefs.findPublished(component.briefId()).orElseThrow(() -> new IllegalStateException("brief missing"));
        ClassGroup group = classGroups.findById(component.classId()).orElseThrow();
        LocalDate today = DublinDate.today(clock);
        Map<UUID, LocalDate> dates = components.stageDates(component.id());
        Map<UUID, String> checkpoints = templates.checkpoints(brief.versionId()).stream()
                .collect(Collectors.toMap(TemplateCheckpoint::stageId, TemplateCheckpoint::text, (first, later) -> first));
        Map<UUID, List<PromptView>> prompts = templates.prompts(brief.versionId()).stream()
                .collect(Collectors.groupingBy(TemplatePrompt::stageId, LinkedHashMap::new,
                        Collectors.mapping(p -> new PromptView(p.heading(), p.text()), Collectors.toList())));
        Set<UUID> done = ticks.doneItems(component.id(), actor.userId());
        Map<UUID, List<StudentItem>> items = this.items.active(component.id()).stream()
                .collect(Collectors.groupingBy(TeacherItem::stageId,
                        Collectors.mapping(i -> new StudentItem(i.id(), i.text(), i.dueDate(), done.contains(i.id())), Collectors.toList())));

        List<StudentStage> stages = templates.stages(brief.versionId()).stream().map(s -> {
            LocalDate due = dates.get(s.id());
            String checkpoint = checkpoints.get(s.id());
            return new StudentStage(s.id(), s.ordinal(), s.label(), s.name(), s.description(), s.hoursMin(), s.hoursMax(),
                    s.hoursGroup(), s.supervised(), due,
                    checkpoint == null ? null : new CheckpointView(checkpoint, CheckpointState.at(due, today)),
                    items.getOrDefault(s.id(), List.of()), prompts.getOrDefault(s.id(), List.of()));
        }).toList();

        BriefDetails details = briefs.details(brief.id());
        BriefDetail detail = new BriefDetail(brief.examYear(), brief.secCode(), brief.title(), brief.topicTitle(),
                details.topicBody(), brief.completionDate(), details.wordLimit(), details.wordsNotCounted(),
                details.imageLimit(), details.imageNote(),
                briefs.rules(brief.id()).stream().map(r -> new RuleView(r.key(), r.value())).toList());

        return new StudentComponent("STUDENT", component.id(), group.name(), brief.subjectCode(),
                subjects.findById(group.subjectId()).orElseThrow().name(), brief.weightingPercent(), brief.marksTotal(),
                detail, templates.processNote(brief.versionId()), today, stages,
                templates.sections(brief.versionId()).stream()
                        .map(x -> new SectionView(x.label(), x.name(), x.suggestedWords(), x.indicativeContent(), x.stageIds())).toList(),
                templates.bands(brief.versionId()).stream()
                        .map(b -> new MarkBandView(b.label(), b.name(), b.marks(), b.wholeReport(), b.criteria(), b.sectionLabels())).toList());
    }
```

It needs `ClassGroupRepository classGroups` in the constructor too (import from `ie.coursework.classes.adapter.persistence`). A student's actor holds no TEACHER role at the class's school, so `classes.owned` can't be used for them; reading the class by id is safe here only because `findForApprovedStudent` has already scoped it.

- [ ] **Step 5: Run it to see it pass**

Run: `cd backend && ./mvnw test -Dtest='StudentComponentViewTest,ComponentCreateTest,StageDatesTest,TeacherItemsTest'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/ie/coursework/components backend/src/test/java/ie/coursework/components/adapter/web/StudentComponentViewTest.java
git commit -m "Show an approved student their component: stages, dates, checkpoint states, items, prompts, rules and marks"
```

---

## Task 5: Ticking, my components, and scope

**Files:**
- Create: `backend/src/main/java/ie/coursework/components/adapter/web/TickRequest.java`, `MeComponentsController.java`
- Modify: `ComponentService.java`, `ComponentController.java`
- Test: `backend/src/test/java/ie/coursework/components/adapter/web/ItemTickTest.java`, `MyComponentsTest.java`
- Modify: `backend/src/test/java/ie/coursework/components/authz/ComponentScopeTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package ie.coursework.components.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class ItemTickTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private UUID component;
    private String tick;

    @BeforeEach
    void item() {
        ClassFixtures.World world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        UUID item = components.item(component, components.stageId(ComponentFixtures.BIOLOGY_2027, 6), "Full draft in", null);
        tick = "/api/v1/components/" + component + "/teacher-items/" + item + "/tick";
    }

    @Test
    void aStudentTicksAndUnticksTheirOwnCopy() throws Exception {
        ApiSession student = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);

        student.put(tick, "{\"done\":true}").andExpect(status().isOk()).andExpect(jsonPath("$.done").value(true));
        student.put(tick, "{\"done\":true}").andExpect(status().isOk());
        student.get("/api/v1/components/" + component).andExpect(jsonPath("$.stages[5].items[0].done").value(true));
        student.put(tick, "{\"done\":false}").andExpect(jsonPath("$.done").value(false));
    }

    @Test
    void theTeacherCannotTickForAStudent() throws Exception {
        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .put(tick, "{\"done\":true}").andExpect(status().isNotFound());
    }

    @Test
    void doneIsRequired() throws Exception {
        new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD)
                .put(tick, "{}").andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }
}
```

```java
package ie.coursework.components.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class MyComponentsTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    @Test
    void listsComponentsOfApprovedClassesOnly() throws Exception {
        ClassFixtures.World world = fixtures.world();
        var id = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);

        new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD).get("/api/v1/me/components")
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].componentId").value(id.toString()))
                .andExpect(jsonPath("$[0].subjectName").value("Biology"))
                .andExpect(jsonPath("$[0].completionDate").value("2027-02-26"));
        new ApiSession(mockMvc).login(ClassFixtures.PENDING_STUDENT, TestAccounts.PASSWORD).get("/api/v1/me/components")
                .andExpect(jsonPath("$").isEmpty());
        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD).get("/api/v1/me/components")
                .andExpect(jsonPath("$").isEmpty());
    }
}
```

In `ComponentScopeTest`, change `studentsGetNotFound` so the approved student's GET is allowed and add tick scope:

```java
    @Test
    void anApprovedStudentReadsTheirViewButNoTeacherEndpoint() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.get(component).andExpect(status().isOk()).andExpect(jsonPath("$.view").value("STUDENT"));
        student.put(component + "/stage-dates", "{\"dates\":[]}").andExpect(status().isNotFound());
        student.post(component + "/teacher-items", "{\"stageId\":\"%s\",\"text\":\"x\",\"dueDate\":null}".formatted(stage(6)))
                .andExpect(status().isNotFound());
        student.patch(item, "{\"text\":\"x\",\"dueDate\":null}").andExpect(status().isNotFound());
        student.delete(item).andExpect(status().isNotFound());
    }

    @Test
    void pendingRemovedAndOutsideStudentsGetNotFound() throws Exception {
        everyEndpoint(as(ClassFixtures.PENDING_STUDENT), status().isNotFound());
        everyEndpoint(as(ClassFixtures.REMOVED_STUDENT), status().isNotFound());
        everyEndpoint(as(ClassFixtures.OUTSIDER), status().isNotFound());
    }

    @Test
    void onlyApprovedStudentsOfTheClassCanTick() throws Exception {
        String tick = item + "/tick";
        as(ClassFixtures.APPROVED_STUDENT).put(tick, "{\"done\":true}").andExpect(status().isOk());
        for (String who : new String[] {ClassFixtures.PENDING_STUDENT, ClassFixtures.OUTSIDER, ClassFixtures.TEACHER1,
                ClassFixtures.TEACHER2, ClassFixtures.LEADER_A}) {
            as(who).put(tick, "{\"done\":true}").andExpect(status().isNotFound());
        }
    }
```

(delete the old `studentsGetNotFound`; add `import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;`)

- [ ] **Step 2: Run them to see them fail**

Run: `cd backend && ./mvnw test -Dtest='ItemTickTest,MyComponentsTest,ComponentScopeTest'`
Expected: FAIL (tick and `/me/components` unmapped).

- [ ] **Step 3: Implement**

```java
package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotNull;

public record TickRequest(@NotNull Boolean done) {}
```

In `ComponentService`:

```java
    /** Self-reported (plan 2E P2-37). Only an approved student of the class, only on an active item. */
    @Transactional
    public StudentItem tick(Actor actor, UUID componentId, UUID itemId, boolean done) {
        ComponentInstance component = components.findForApprovedStudent(componentId, actor.userId())
                .orElseThrow(ComponentService::notFound);
        TeacherItem item = items.findActive(itemId, component.id()).orElseThrow(ComponentService::itemNotFound);
        ticks.set(component.id(), actor.userId(), item.id(), done, clock.instant());
        return new StudentItem(item.id(), item.text(), item.dueDate(), done);
    }

    public List<MyComponent> myComponents(Actor actor) {
        return components.forStudent(actor.userId()).stream()
                .map(c -> new MyComponent(c.componentId(), c.className(), c.subjectCode(), c.subjectName(), c.briefTitle(), c.completionDate()))
                .toList();
    }
```

In `ComponentController`:

```java
    @PutMapping("/components/{componentId}/teacher-items/{itemId}/tick")
    StudentItem tick(Actor actor, @PathVariable UUID componentId, @PathVariable UUID itemId, @Valid @RequestBody TickRequest body) {
        return components.tick(actor, componentId, itemId, body.done());
    }
```

```java
package ie.coursework.components.adapter.web;

import ie.coursework.components.application.ComponentService;
import ie.coursework.components.application.ComponentViews.MyComponent;
import ie.coursework.identity.domain.Actor;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeComponentsController {

    private final ComponentService components;

    public MeComponentsController(ComponentService components) {
        this.components = components;
    }

    /** Components of the signed-in user's approved classes. Empty for anyone who is nobody's student. */
    @GetMapping("/api/v1/me/components")
    List<MyComponent> myComponents(Actor actor) {
        return components.myComponents(actor);
    }
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `cd backend && ./mvnw test -Dtest='ItemTickTest,MyComponentsTest,ComponentScopeTest' && make backend-test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/ie/coursework/components backend/src/test/java/ie/coursework/components
git commit -m "Let approved students tick teacher items and list their components"
```

---

## Task 6: Frontend data and stage progress

**Files:**
- Modify: `frontend/lib/api/schemas.ts`
- Create: `frontend/lib/app/component-progress.ts`, `frontend/lib/app/component-progress.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { progress } from './component-progress.ts';

const stage = (ordinal: number, dueDate: string | null) => ({ id: `s${ordinal}`, ordinal, dueDate });
const COMPLETION = '2027-02-26';

describe('progress', () => {
  const stages = [stage(1, '2026-05-29'), stage(2, '2026-06-05'), stage(3, '2026-09-25'), stage(4, '2026-10-16'), stage(5, null), stage(6, '2027-01-22')];

  test('the current stage is the first dated today or later', () => {
    const p = progress(stages, '2026-10-12', COMPLETION);
    assert.equal(p.phase, 'in-progress');
    assert.equal(p.current?.id, 's4');
    assert.deepEqual(p.states, { s1: 'done', s2: 'done', s3: 'done', s4: 'current', s5: 'undated', s6: 'upcoming' });
    assert.equal(p.countdown, '4 days left');
  });

  test('on the stage date itself it is still current and due today', () => {
    const p = progress(stages, '2026-10-16', COMPLETION);
    assert.equal(p.current?.id, 's4');
    assert.equal(p.countdown, 'Due today');
  });

  test('before the first date nothing is done', () => {
    const p = progress(stages, '2026-05-01', COMPLETION);
    assert.equal(p.phase, 'before-start');
    assert.equal(p.current?.id, 's1');
  });

  test('no dates at all', () => {
    const p = progress([stage(1, null), stage(2, null)], '2026-10-12', COMPLETION);
    assert.equal(p.phase, 'no-dates');
    assert.equal(p.current, null);
    assert.deepEqual(p.states, { s1: 'undated', s2: 'undated' });
  });

  test('every dated stage passed, then the completion date passed', () => {
    assert.equal(progress(stages, '2027-02-01', COMPLETION).phase, 'finished');
    assert.equal(progress(stages, '2027-02-01', COMPLETION).countdown, '25 days left');
    const closed = progress(stages, '2027-02-27', COMPLETION);
    assert.equal(closed.phase, 'closed');
    assert.equal(closed.countdown, null);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd frontend && node --test lib/app/component-progress.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Schemas**

Append to `frontend/lib/api/schemas.ts`:

```ts
// Mirrors ComponentViews.StudentComponent (plan 2E).
export const checkpointStateSchema = z.enum(["NOT_DUE", "DUE"]);
export const studentStageSchema = z.object({
  id: z.string(),
  ordinal: z.number(),
  label: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  hoursMin: z.number().nullable(),
  hoursMax: z.number().nullable(),
  hoursGroup: z.string().nullable(),
  supervised: z.boolean(),
  dueDate: z.string().nullable(),
  checkpoint: z.object({ text: z.string(), state: checkpointStateSchema }).nullable(),
  items: z.array(z.object({ id: z.string(), text: z.string(), dueDate: z.string().nullable(), done: z.boolean() })),
  prompts: z.array(z.object({ heading: z.string().nullable(), text: z.string() })),
});
export type StudentStage = z.infer<typeof studentStageSchema>;

export const studentComponentSchema = z.object({
  view: z.literal("STUDENT"),
  id: z.string(),
  className: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  weightingPercent: z.number(),
  marksTotal: z.number(),
  brief: z.object({
    examYear: z.number(),
    secCode: z.string(),
    title: z.string(),
    topicTitle: z.string().nullable(),
    topicBody: z.string(),
    completionDate: z.string(),
    wordLimit: z.number(),
    wordsNotCounted: z.string(),
    imageLimit: z.number(),
    imageNote: z.string().nullable(),
    rules: z.array(z.object({ key: z.string(), value: z.string() })),
  }),
  processNote: z.string(),
  today: z.string(),
  stages: z.array(studentStageSchema),
  sections: z.array(z.object({
    label: z.string(), name: z.string(), suggestedWords: z.number().nullable(),
    indicativeContent: z.array(z.string()), stageIds: z.array(z.string()),
  })),
  markBands: z.array(z.object({
    label: z.string().nullable(), name: z.string().nullable(), marks: z.number(), wholeReport: z.boolean(),
    criteria: z.array(z.string()), sectionLabels: z.array(z.string()),
  })),
});
export type StudentComponent = z.infer<typeof studentComponentSchema>;

export const componentViewSchema = z.discriminatedUnion("view", [teacherComponentSchema, studentComponentSchema]);

export const studentItemSchema = z.object({ id: z.string(), text: z.string(), dueDate: z.string().nullable(), done: z.boolean() });

export const myComponentSchema = z.object({
  componentId: z.string(),
  className: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  briefTitle: z.string(),
  completionDate: z.string(),
});
export type MyComponent = z.infer<typeof myComponentSchema>;
```

- [ ] **Step 4: `component-progress.ts`**

```ts
import { countdownText } from '../schedule.ts';

export type StageState = 'done' | 'current' | 'upcoming' | 'undated';
export type Phase = 'no-dates' | 'before-start' | 'in-progress' | 'finished' | 'closed';

type Dated = { id: string; ordinal: number; dueDate: string | null };

const MS_PER_DAY = 86_400_000;
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/**
 * Where a student is (plan 2E P2-36). `today` is the server's Dublin date (P2-35), so nothing here reads a
 * clock. "Current" is the first stage, by ordinal, dated today or later: a pointer, never a gate (design §4.6).
 */
export function progress<S extends Dated>(stages: ReadonlyArray<S>, today: string, completionDate: string) {
  const ordered = [...stages].sort((a, b) => a.ordinal - b.ordinal);
  const t = day(today);
  const dated = ordered.filter((s) => s.dueDate !== null);
  const current = ordered.find((s) => s.dueDate !== null && day(s.dueDate) >= t) ?? null;

  const states: Record<string, StageState> = {};
  for (const s of ordered) {
    states[s.id] = s.dueDate === null ? 'undated'
      : s === current ? 'current'
      : day(s.dueDate) < t ? 'done'
      : 'upcoming';
  }

  const phase: Phase = t > day(completionDate) ? 'closed'
    : dated.length === 0 ? 'no-dates'
    : current === null ? 'finished'
    : dated.every((s) => day(s.dueDate!) >= t) ? 'before-start'
    : 'in-progress';

  const target = phase === 'closed' || phase === 'no-dates' ? null : current?.dueDate ?? completionDate;
  const daysLeft = target === null ? null : Math.round((day(target) - t) / MS_PER_DAY);
  return {
    phase,
    current: phase === 'closed' ? null : current,
    states,
    countdown: daysLeft === null ? null : countdownText(daysLeft, daysLeft === 0),
  };
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `cd frontend && node --test lib/app/component-progress.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/api/schemas.ts frontend/lib/app/component-progress.ts frontend/lib/app/component-progress.test.ts
git commit -m "Work out a student's current stage and countdown from the server's Dublin date"
```

---

## Task 7: The student component page

**Files:**
- Create: `frontend/components/app/component-tabs.tsx`, `component-overview.tsx` + spec, `item-tick.tsx` + spec, `my-components.tsx` + spec
- Create: `frontend/app/(app)/components/[id]/page.tsx`
- Modify: `frontend/app/(app)/home/page.tsx`, `frontend/e2e/phase2.e2e.ts`

- [ ] **Step 1: Write the failing specs**

`frontend/components/app/component-overview.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { StudentComponent } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { ComponentOverview } from "./component-overview";

const stage = (n: number, dueDate: string | null, extra: Partial<StudentComponent["stages"][number]> = {}) => ({
  id: `s${n}`, ordinal: n, label: `Stage ${n}`, name: `Stage name ${n}`, description: `What stage ${n} is.`,
  hoursMin: 1, hoursMax: 2, hoursGroup: null, supervised: false, dueDate,
  checkpoint: { text: `Checkpoint ${n}`, state: "NOT_DUE" as const }, items: [], prompts: [], ...extra,
});

const component = (overrides: Partial<StudentComponent> = {}): StudentComponent => ({
  view: "STUDENT", id: "k1", className: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology",
  weightingPercent: 40, marksTotal: 200,
  brief: {
    examYear: 2027, secCode: "2027L025C2EL", title: "Biology in Practice Investigation", topicTitle: "Membranes, Osmosis, Food Preservation",
    topicBody: "Cells have a selectively permeable plasma membrane.", completionDate: "2027-02-26", wordLimit: 1500,
    wordsNotCounted: "This word count does not include words used in references.", imageLimit: 20, imageNote: "Formulae don't count.",
    rules: [{ key: "Page orientation", value: "Portrait only." }],
  },
  processNote: "Nor is it intended to present the stages as a rigid or linear process.",
  today: "2026-10-12",
  stages: [
    stage(3, "2026-09-25", { checkpoint: { text: "Plan discussed with the teacher (feasibility and safety)", state: "DUE" } }),
    stage(4, "2026-10-16", { items: [{ id: "i1", text: "Book a re-run slot", dueDate: null, done: true }], prompts: [{ heading: "Data analysis may include", text: "calculations and/or graphs" }] }),
    stage(5, null),
  ],
  sections: [{ label: "1", name: "Title and Introduction", suggestedWords: null, indicativeContent: [], stageIds: [] }],
  markBands: [{ label: "D", name: "Scientific Literacy", marks: 50, wholeReport: true, criteria: ["Communication"], sectionLabels: [] }],
  ...overrides,
});

describe("ComponentOverview", () => {
  it("answers first: the current stage and how long is left", () => {
    render(<ComponentOverview component={component()} />);
    const now = screen.getByRole("region", { name: "Where you are" });
    expect(now).toHaveTextContent("Stage 4");
    expect(now).toHaveTextContent("4 days left");
    expect(now).toHaveTextContent("16 Oct 2026");
  });

  it("separates the class's dates from the SEC's completion date", () => {
    render(<ComponentOverview component={component()} />);
    expect(screen.getByText(/completion date/i)).toHaveTextContent("26 Feb 2027");
    expect(screen.getByText(/stage dates are your class's plan, set by your teacher/i)).toBeInTheDocument();
  });

  it("names each stage's state in words, and opens only the current stage", () => {
    render(<ComponentOverview component={component()} />);
    const stages = screen.getByRole("region", { name: "Stages" });
    expect(within(stages).getByText("Done")).toBeInTheDocument();
    expect(within(stages).getByText("Now")).toBeInTheDocument();
    expect(within(stages).getByText("No date yet")).toBeInTheDocument();
    expect(screen.getByText("What stage 4 is.")).toBeVisible();
  });

  it("shows a due checkpoint as not signed off yet, without blame", () => {
    render(<ComponentOverview component={component()} />);
    expect(screen.getByText("Plan discussed with the teacher (feasibility and safety)").closest("div")).toHaveTextContent("Not signed off yet");
  });

  it("says ticks are the student's own record", () => {
    render(<ComponentOverview component={component()} />);
    expect(screen.getByText(/ticks are your own record, not your teacher's sign-off/i)).toBeInTheDocument();
  });

  it("says the stages aren't a fixed order", () => {
    render(<ComponentOverview component={component()} />);
    expect(screen.getByText(/rigid or linear/)).toBeInTheDocument();
  });

  it("shows rules and marks", () => {
    render(<ComponentOverview component={component()} />);
    expect(screen.getByRole("region", { name: "Report rules" })).toHaveTextContent("Portrait only.");
    expect(screen.getByRole("region", { name: "How it's marked" })).toHaveTextContent("200 marks");
  });

  it("says dates are coming when the teacher hasn't set any", () => {
    render(<ComponentOverview component={component({ stages: [stage(1, null), stage(2, null)] })} />);
    expect(screen.getByRole("region", { name: "Where you are" })).toHaveTextContent(/dates are coming from your teacher/i);
  });

  it("is a record after the completion date", () => {
    render(<ComponentOverview component={component({ today: "2027-03-01" })} />);
    expect(screen.getByRole("region", { name: "Where you are" })).toHaveTextContent(/completion date has passed/i);
  });
});
```

`frontend/components/app/item-tick.spec.tsx`:

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

import { api } from "@/lib/api/client";

import { ItemTick } from "./item-tick";

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("ItemTick", () => {
  it("ticks straight away, says who ticked it, and saves", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i1", text: "Full draft in", dueDate: null, done: true });
    render(<ItemTick componentId="k1" item={{ id: "i1", text: "Full draft in", dueDate: "2026-12-04", done: false }} />);
    const box = screen.getByRole("checkbox", { name: /Full draft in/ });

    await userEvent.click(box);
    expect(box).toBeChecked();
    expect(screen.getByText("Ticked by you")).toBeInTheDocument();
    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/teacher-items/i1/tick", { done: true }, expect.anything());
  });

  it("puts the box back and shows the error when saving fails", async () => {
    vi.mocked(api.send).mockRejectedValue(new Error("offline"));
    render(<ItemTick componentId="k1" item={{ id: "i1", text: "Full draft in", dueDate: null, done: true }} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Full draft in/ }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Full draft in/ })).toBeChecked();
  });
});
```

`frontend/components/app/my-components.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MyComponents } from "./my-components";

describe("MyComponents", () => {
  it("links to each component, labelled by subject", () => {
    render(<MyComponents components={[{ componentId: "k1", className: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology", briefTitle: "Biology in Practice Investigation", completionDate: "2027-02-26" }]} />);
    expect(screen.getByRole("heading", { name: "My components" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Biology/ })).toHaveAttribute("href", "/components/k1");
  });

  it("renders nothing when there are none", () => {
    const { container } = render(<MyComponents components={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && npx vitest run components/app/component-overview.spec.tsx components/app/item-tick.spec.tsx components/app/my-components.spec.tsx`
Expected: FAIL (components missing).

- [ ] **Step 3: `ItemTick`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, ApiError } from "@/lib/api/client";
import { studentItemSchema } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";

import { ErrorPanel } from "./error-panel";

/** One teacher item a student can tick (plan 2E P2-37, P2-38). The box moves at once; a failure puts it back. */
export function ItemTick({ componentId, item }: { componentId: string; item: { id: string; text: string; dueDate: string | null; done: boolean } }) {
  const router = useRouter();
  const [done, setDone] = useState(item.done);
  const [error, setError] = useState<ApiError | null>(null);
  const id = `tick-${item.id}`;

  async function toggle(next: boolean) {
    setDone(next);
    setError(null);
    try {
      await api.send("PUT", `/components/${componentId}/teacher-items/${item.id}/tick`, { done: next }, studentItemSchema);
      router.refresh();
    } catch (e) {
      setDone(!next);
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-11 items-start gap-3">
        <input id={id} type="checkbox" checked={done} onChange={(e) => toggle(e.target.checked)} className="mt-1 size-5 flex-none" />
        <label htmlFor={id} className="flex flex-col text-app-base text-app-ink">
          <span>{item.text}</span>
          {item.dueDate && <span className="text-app-small text-app-grey">{formatCalendarDate(item.dueDate)}</span>}
        </label>
        {done && <span className="ml-auto text-app-small text-app-grey">Ticked by you</span>}
      </div>
      {error && <ErrorPanel error={error} />}
    </div>
  );
}
```

- [ ] **Step 4: `ComponentTabs`, `MyComponents`, `ComponentOverview`**

```tsx
import Link from "next/link";

const TAB = "-mb-px border-b-2 px-0.5 py-2.5 text-app-base font-semibold whitespace-nowrap";

/** Roadmap §6.1: inside a component, Overview · Log (P3) · Sources · AI use · Word checker (P6). */
export function ComponentTabs({ componentId }: { componentId: string }) {
  return (
    <nav aria-label="Component sections" className="mt-5 flex gap-6 overflow-x-auto border-b border-app-line">
      <Link href={`/components/${componentId}`} aria-current="page" className={`${TAB} border-app-accent text-app-accent`}>
        Overview
      </Link>
      {["Log", "Sources", "AI use", "Word checker"].map((tab) => (
        <span key={tab} aria-disabled="true" className={`${TAB} cursor-not-allowed border-transparent text-app-disabled`}>
          {tab}
        </span>
      ))}
    </nav>
  );
}
```

```tsx
import Link from "next/link";

import type { MyComponent } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";

import { card, sectionTitle } from "./styles";
import { subjectEdge } from "./subject";

/** Working-first student navigation to each component (plan 2E P2-40), until D-4 designs it. */
export function MyComponents({ components }: { components: MyComponent[] }) {
  if (components.length === 0) return null;
  return (
    <section aria-labelledby="my-components" className="flex flex-col gap-3">
      <h2 id="my-components" className={sectionTitle}>My components</h2>
      <ul className="flex flex-col gap-2">
        {components.map((c) => (
          <li key={c.componentId}>
            <Link href={`/components/${c.componentId}`} className={`${card} flex flex-col gap-0.5 border-l-4 p-4 ${subjectEdge(c.subjectCode)}`}>
              <span className="font-semibold text-app-ink">{c.subjectName}</span>
              <span className="text-app-small text-app-grey">{c.briefTitle} · completion date {formatCalendarDate(c.completionDate)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
import type { StudentComponent } from "@/lib/api/schemas";
import { progress, type StageState } from "@/lib/app/component-progress";
import { formatCalendarDate, hoursLabel } from "@/lib/app/component-setup";

import { ItemTick } from "./item-tick";
import { card, eyebrow, lead, pageTitle, sectionTitle } from "./styles";

const STATE_WORD: Record<StageState, string> = { done: "Done", current: "Now", upcoming: "Upcoming", undated: "No date yet" };
const CHECKPOINT_WORD = { NOT_DUE: "Not due yet", DUE: "Not signed off yet" } as const;

/**
 * Roadmap §6.2 `/components/[id]` (design §8.3), working-first until pack D-3. Answer first: where you are
 * and what's due; then every stage, current one open; then sections, rules and marks. Plan 2E P2-33: built
 * from app components, not the BiPi ones.
 */
export function ComponentOverview({ component }: { component: StudentComponent }) {
  const { brief } = component;
  const p = progress(component.stages, component.today, brief.completionDate);
  const completion = formatCalendarDate(brief.completionDate);

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section aria-labelledby="where-heading" className={`${card} flex flex-col gap-2 p-5`}>
        <h2 id="where-heading" className={eyebrow}>Where you are</h2>
        {p.phase === "closed" ? (
          <p className={lead}>{`The completion date has passed (${completion}). This page is now a record of the coursework.`}</p>
        ) : p.phase === "no-dates" ? (
          <p className={lead}>Dates are coming from your teacher. Everything else about the coursework is below.</p>
        ) : p.current ? (
          <>
            <p className="text-app-h2 font-bold text-app-ink">{p.current.label ?? p.current.name} · {p.current.name}</p>
            <p className={lead}>{`${p.countdown}. Due ${formatCalendarDate(p.current.dueDate!)}.`}</p>
          </>
        ) : (
          <p className={lead}>{`All the dated stages have passed. ${p.countdown} to the completion date.`}</p>
        )}
      </section>

      <p className={lead}>
        {`Stage dates are your class's plan, set by your teacher. The SEC's completion date is ${completion}: your finished coursework must be with your teacher by then.`}
      </p>
      <p className={lead}>{component.processNote}</p>

      <section aria-labelledby="stages-heading" className="flex flex-col gap-3">
        <h2 id="stages-heading" className={sectionTitle}>Stages</h2>
        <p className="text-app-small text-app-grey">{"Ticks are your own record, not your teacher's sign-off."}</p>
        {component.stages.map((s) => (
          <details key={s.id} open={p.states[s.id] === "current"} className={`${card} p-4`}>
            <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-semibold text-app-ink">{s.label ? `${s.label} · ${s.name}` : s.name}</span>
              <span className={eyebrow}>{STATE_WORD[p.states[s.id]]}</span>
              {s.dueDate && <span className="text-app-small text-app-grey">{formatCalendarDate(s.dueDate)}</span>}
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <p className={lead}>{s.description}</p>
              <p className="text-app-small text-app-grey">
                {[hoursLabel(s, component.stages), s.supervised ? "Done in supervised class time" : ""].filter(Boolean).join(" · ")}
              </p>
              {s.checkpoint && (
                <div className="flex flex-col gap-0.5">
                  <span className={eyebrow}>Checkpoint · {CHECKPOINT_WORD[s.checkpoint.state]}</span>
                  <span className="text-app-base text-app-ink">{s.checkpoint.text}</span>
                </div>
              )}
              {s.items.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className={eyebrow}>From your teacher</span>
                  {s.items.map((item) => <ItemTick key={item.id} componentId={component.id} item={item} />)}
                </div>
              )}
              {s.prompts.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-app-base font-semibold text-app-accent">Questions to help you</summary>
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                    {s.prompts.map((prompt, i) => (
                      <li key={i} className="text-app-base text-app-copy">
                        {prompt.heading && i > 0 && s.prompts[i - 1].heading === prompt.heading ? null : prompt.heading ? <span className="block text-app-small text-app-grey">{prompt.heading}</span> : null}
                        {prompt.text}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </details>
        ))}
      </section>

      <section aria-labelledby="sections-heading" className="flex flex-col gap-2">
        <h2 id="sections-heading" className={sectionTitle}>Report sections</h2>
        <ol className="flex flex-col gap-2">
          {component.sections.map((section) => (
            <li key={section.label} className="text-app-base text-app-ink">
              {section.label}. {section.name}
              {section.suggestedWords && <span className="text-app-grey">{` · about ${section.suggestedWords} words`}</span>}
              {section.indicativeContent.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-app-small text-app-copy">
                  {section.indicativeContent.map((line) => <li key={line}>{line}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="rules-heading" className="flex flex-col gap-2">
        <h2 id="rules-heading" className={sectionTitle}>Report rules</h2>
        <dl className="flex flex-col gap-2">
          <dt className={eyebrow}>Length</dt>
          <dd className={lead}>{`${brief.wordLimit.toLocaleString("en-IE")} words at most. ${brief.wordsNotCounted}`}</dd>
          <dt className={eyebrow}>Images</dt>
          <dd className={lead}>{`${brief.imageLimit} at most.${brief.imageNote ? ` ${brief.imageNote}` : ""}`}</dd>
          {brief.rules.map((rule) => (
            <div key={rule.key} className="contents">
              <dt className={eyebrow}>{rule.key}</dt>
              <dd className={lead}>{rule.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="marks-heading" className="flex flex-col gap-2">
        <h2 id="marks-heading" className={sectionTitle}>{"How it's marked"}</h2>
        <p className={lead}>{`${component.marksTotal} marks, ${component.weightingPercent}% of Leaving Cert ${component.subjectName}.`}</p>
        <dl className="flex flex-col gap-2">
          {component.markBands.map((band) => (
            <div key={`${band.label}${band.name}`} className="flex flex-col gap-0.5">
              <dt className="font-semibold text-app-ink">
                {[band.label, band.name].filter(Boolean).join(" · ")} · {band.marks} marks
                {band.wholeReport ? " · the whole report" : band.sectionLabels.length ? ` · sections ${band.sectionLabels.join(", ")}` : ""}
              </dt>
              {band.criteria.length > 0 && <dd className="text-app-small text-app-copy">{band.criteria.join(" · ")}</dd>}
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
```

Heading level: the page's `h1` is the subject (Step 5); every region above is labelled by its `h2`, which is what the spec's `getByRole("region", { name })` finds (a `<section>` with an accessible name is a region). If `text-app-h2` isn't a defined size in `globals.css`, use the largest `text-app-*` size `pageTitle` doesn't use.

- [ ] **Step 5: Pages**

`frontend/app/(app)/components/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ComponentOverview } from "@/components/app/component-overview";
import { ComponentTabs } from "@/components/app/component-tabs";
import { ErrorPanel } from "@/components/app/error-panel";
import { backLink, pageTitle } from "@/components/app/styles";
import { componentViewSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function ComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await attempt(() => serverApi.get(`/components/${encodeURIComponent(id)}`, componentViewSchema));
  if (!loaded.ok && loaded.error.code === "NOT_FOUND") notFound();
  // Plan 2E P2-41: a teacher opening their own class's component belongs on its Component tab.
  if (loaded.ok && loaded.data.view === "TEACHER") redirect(`/teach/classes/${loaded.data.classId}/component`);

  return (
    <AppMain>
      <Link href="/home" className={backLink}>Timeline</Link>
      {loaded.ok && loaded.data.view === "STUDENT" ? (
        <>
          <h1 className={`mt-2.5 ${pageTitle}`}>{loaded.data.subjectName}</h1>
          <p className="mt-1.5 text-app-base text-app-grey">{`${loaded.data.brief.title}, ${loaded.data.brief.examYear} · ${loaded.data.className}`}</p>
          <ComponentTabs componentId={loaded.data.id} />
          <ComponentOverview component={loaded.data} />
        </>
      ) : (
        !loaded.ok && <div className="mt-6"><ErrorPanel error={loaded.error} /></div>
      )}
    </AppMain>
  );
}
```

`frontend/app/(app)/home/page.tsx` loads components beside classes:

```tsx
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { MyClasses } from "@/components/app/my-classes";
import { MyComponents } from "@/components/app/my-components";
import { enrolmentViewSchema, myComponentSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [classes, components] = await Promise.all([
    attempt(() => serverApi.get("/me/classes", z.array(enrolmentViewSchema))),
    attempt(() => serverApi.get("/me/components", z.array(myComponentSchema))),
  ]);
  return (
    <AppMain>
      <div className="flex flex-col gap-8">
        {components.ok ? <MyComponents components={components.data} /> : <ErrorPanel error={components.error} />}
        {classes.ok ? <MyClasses classes={classes.data} /> : <ErrorPanel error={classes.error} />}
      </div>
    </AppMain>
  );
}
```

- [ ] **Step 6: Run the specs**

Run: `cd frontend && npx vitest run components/app && npm run typecheck && npm run lint`
Expected: PASS. `my-classes.spec.tsx` is unchanged and still passes.

- [ ] **Step 7: Extend the journey**

Append to `frontend/e2e/phase2.e2e.ts`, sharing state through a module-level `let` (the file is serial):

```ts
import { phone } from "./helpers";

const STUDENT = { username: "", password: "e2e-student-password" };
let componentUrl = "";

test("a student sees the component and ticks a teacher item", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  STUDENT.username = `e2e.p2.${test.info().project.name}.${Date.now().toString(36)}`;
  await signInTeacher(teacher);
  await teacher.getByRole("link", { name: P2.className }).click();
  const code = (await teacher.getByRole("region", { name: "Join code" }).locator("strong").textContent())?.trim() ?? "";

  const student = await phone(browser);
  await student.goto(`/join/${code}`);
  await student.getByRole("textbox", { name: "First name" }).fill("Cian");
  await student.getByRole("textbox", { name: "Surname" }).fill("Murphy");
  await student.getByRole("textbox", { name: "Username" }).fill(STUDENT.username);
  await student.getByLabel("Password").fill(STUDENT.password);
  await student.getByRole("button", { name: "Create account and join" }).click();
  await expect(student).toHaveURL(/\/home$/);

  await teacher.reload();
  await teacher.getByRole("button", { name: "Approve Cian Murphy" }).click();
  await expect(teacher.getByRole("region", { name: "Students" })).toContainText("Cian Murphy");

  await student.reload();
  await student.getByRole("link", { name: /Biology/ }).click();
  await expect(student.getByRole("heading", { level: 1, name: "Biology" })).toBeVisible();
  componentUrl = student.url();
  await expect(student.getByRole("region", { name: "Stages" })).toContainText("Conducting the Experiment");
  await expectAccessible(student);

  await student.getByText("Finalising the Biology in Practice Investigation Report").click();
  await student.getByRole("checkbox", { name: /Full draft in for feedback/ }).check();
  await expect(student.getByText("Ticked by you")).toBeVisible();
  await student.reload();
  await student.getByText("Finalising the Biology in Practice Investigation Report").click();
  await expect(student.getByRole("checkbox", { name: /Full draft in for feedback/ })).toBeChecked();
  await expectAccessible(student);
});
```

Merge the imports into the top of the file rather than repeating them. 2F uses `STUDENT` and `componentUrl`.

- [ ] **Step 8: Verify and commit**

Run: `make verify && make e2e`
Expected: green; axe clean on `/home` and `/components/[id]`.

```bash
git add frontend
git commit -m "Give students a component page with their stage, countdown, checkpoints, ticks, rules and marks"
```

---

## Task 8: Restyle from D-3 (only when the pack exists)

**Precondition:** `docs/design/pilot/D-3-student-component/` exists. Otherwise leave unticked and note it in `docs/HANDOFF.md`.

- [ ] Read `NOTES.md`: its A/B answer on the BiPi components and its label proposals. If Tim chose **A (reuse BiPi as they are)**, the reuse is of their *styling*: port the class strings and `--bipi-*` usage into the app components here. Don't feed the BiPi components invented props (P2-33). If a behaviour or label changes, update roadmap §6.2 and the spec first, in their own commit.
- [ ] Add the pack's `tokens.css` additions (e.g. "current" and "done" colours) as `--app-*`.
- [ ] Restyle `ComponentOverview`, `ItemTick`, `ComponentTabs`, `MyComponents` to UI-STANDARDS §15; specs pass unchanged.
- [ ] `docs/design/UI-CHECKLIST.md` at 390px and 1140px; `make e2e`.
- [ ] Commit: `git commit -m "Restyle the student component page from design pack D-3"`

---

## Task 9: Docs

- [ ] `docs/ARCHITECTURE.md`: §4 "A student reaches a component only through `ComponentRepository.findForApprovedStudent`"; §5 V9; §6 the component page pattern (role-shaped load with `componentViewSchema`, teacher redirected); §10 "The student view carries `today`: the page derives the current stage from the server's Dublin date, never the browser's clock".
- [ ] `CLAUDE.md` Backend conventions: "A student's component access goes through `ComponentRepository.findForApprovedStudent(componentId, studentId)`."
- [ ] `docs/PILOT-ROADMAP.md`: §1 2E built; §7 Phase 2 endpoints exact (§8.2 2E's row was reworded for P2-33 on 16 Sep 2026).
- [ ] `docs/HANDOFF.md` rewritten.
- [ ] Commit: `git commit -m "Record the student component page in the docs"`

---

## Gate 2E

- [ ] `make verify` and `make e2e` green
- [ ] `ComponentScopeTest`: approved student reads, can't set up; pending, removed, outside, teacher and leader can't tick
- [ ] `DublinDateTest` and `component-progress.test.ts` cover the midnight and due-today boundaries
- [ ] PR `pilot/2e-student-component-page` → `pilotMain`
