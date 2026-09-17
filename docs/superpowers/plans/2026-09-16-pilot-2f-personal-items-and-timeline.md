# Pilot 2F — Personal Items and the Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/home` becomes the student's timeline: stage dates and dated teacher items from every approved class, plus the student's own private items, in list, week and month views, labelled by subject with days remaining. The student adds, edits and deletes their own items, and no teacher or school leader can reach them.

**Architecture:** A new `ie.coursework.timeline` feature. `V10` adds `personal_item`. Every `PersonalItemRepository` method takes the owner and puts it in its `WHERE`, so there's no query by id alone. `TimelineRepository` runs one union query (stage dates, dated active teacher items, personal items) over a date range capped at 100 days. On the frontend, `lib/app/timeline.ts` turns `?view=&from=` into a range and does calendar arithmetic in UTC days; `/home` renders the view server-side, and adding, editing and deleting are small client components. Gate P2's journey is completed.

**Tech Stack:** Spring Boot 4.1, `JdbcClient`, Postgres 18; Next.js 15.3.9, Zod 4, Vitest + Testing Library, `node:test`, Playwright + axe.

**Roadmap:** §6.1 (student navigation), §6.2 (`/home` 2F row), §7 Phase 2, §8.2 2F and Gate P2. **Design:** §3.2, §6.8, §9, §10 (the `personal_item` authorisation case).

---

## Before you start

- 2E is merged: `git checkout -b pilot/2f-personal-items-and-timeline`.
- `make verify` and `make e2e` are green.
- Read: plan 2E (`ComponentRepository.forStudent`, `MyComponents`, the `/home` page it left); `EnrolmentRepository.findByStudent`; `frontend/lib/schedule.ts` (`dublinToday`, `parsePreviewDate`'s round-trip check); `frontend/e2e/phase1.e2e.ts` (its `/home` assertions must keep passing).
- **Design pack D-4 may not have arrived.** Build working-first; Task 7 restyles once `docs/design/pilot/D-4-timeline/` exists. D-4 also designs student navigation and decides where class approval status lives.
- Migration number: `V10`.

**Decisions this plan takes** (proposed; status in roadmap §3 "Phase 2 questions"):

| # | Decision | Where |
|---|---|---|
| P2-42 | **Personal items are private by construction:** every repository method takes the owner, `/me/…` endpoints use the session's user and take no user id, and no other query in the app joins `personal_item`. The authz suite proves a teacher and a leader reach none of a student's items through any endpoint, and that the title doesn't appear in any JSON they receive (design §6.8, §10). | `PersonalItemRepository`, `PersonalItemPrivacyTest` |
| P2-43 | **A personal item's class must be one the student has joined (pending or approved)**; any other id is 404. It only labels the item with a subject and grants nothing. A class the student is later removed from keeps labelling their own item. | `TimelineService` |
| P2-44 | **The timeline holds stage dates, dated active teacher items and personal items only.** The SEC completion date isn't a timeline item (design §3.2's list). **Pending Tim (Q-P2-E):** adding completion dates is one more union branch. | `TimelineRepository` |
| P2-45 | **Only approved classes contribute coursework items**; pending and removed don't. A student with only pending classes sees their own items and a note that a teacher needs to approve them. | `TimelineRepository`, `/home` |
| P2-46 | **Same-day order:** stage dates, then teacher items, then personal items; then subject name, stage order, title. | `TimelineRepository` |
| P2-47 | **Views and ranges:** list shows 28 days from `from` (default today), week is Monday to Sunday containing `from`, month is the calendar month containing `from`. `?view=list|week|month&from=YYYY-MM-DD` in the URL; anything malformed falls back to list from today. Previous and next move by 28 days, a week, or a month. The API refuses ranges over 100 days. | `lib/app/timeline.ts`, `TimelineRange` |
| P2-48 | **Days remaining are words:** "today", "tomorrow", "yesterday", "in 3 days", "2 days ago", counted in Dublin calendar days. | `relativeDay` |
| P2-49 | **Item kinds are written, never colour alone:** "Stage date", "From your teacher", and the personal kind ("Test", "Essay", "Deadline", "Other"). | `TimelineView` |
| P2-50 | **Adding happens in an inline form on `/home`** ("Add my own item"), not a sheet, until D-4 chooses. Delete confirms in place ("Delete item" / "Keep"), like D-2's Remove. The form says "Only you can see this. Your teachers can't." | `PersonalItemForm` |
| P2-51 | **Class status stays on `/home` under the timeline** ("My classes" with Pending approval / Approved) until D-4 decides where it lives. | `/home` |
| P2-52 | **A personal item's title is 1–120 characters.** | `V10`, `PersonalItemRequest` |

---

## File structure

Backend (`backend/src/main/java/ie/coursework/` unless noted):

| File | Responsibility | Task |
|---|---|---|
| `timeline/domain/PersonalItemKind.java`, `TimelineRange.java` + test | Kinds; range rule | 1 |
| `resources/db/migration/V10__personal_items.sql` | `personal_item` | 2 |
| `timeline/adapter/persistence/PersonalItemRepository.java` + test | Owner-scoped CRUD | 2 |
| `timeline/adapter/persistence/TimelineRepository.java` + test | The union query | 3 |
| `timeline/application/TimelineViews.java`, `TimelineService.java` | Views, class label check, range check | 4 |
| `timeline/adapter/web/TimelineController.java`, `PersonalItemController.java`, `PersonalItemRequest.java` | Endpoints | 4 |
| `test/…/timeline/adapter/web/PersonalItemsTest.java`, `TimelineTest.java` | HTTP | 4 |
| `test/…/timeline/authz/PersonalItemPrivacyTest.java` | Teachers, leaders, other students reach nothing | 4 |

Frontend (`frontend/`):

| File | Responsibility | Task |
|---|---|---|
| `lib/api/schemas.ts` | Timeline, personal item | 5 |
| `lib/app/timeline.ts` + `.test.ts` | Range from URL, stepping, relative days, grouping, month grid | 5 |
| `components/app/timeline-view.tsx` + spec | List, week, month; view switch; previous and next | 6 |
| `components/app/personal-item-form.tsx` + spec | Add and edit | 6 |
| `components/app/personal-item-actions.tsx` + spec | Edit, delete with confirm | 6 |
| `app/(app)/home/page.tsx` | The timeline page and its empty states | 6 |
| `e2e/phase2.e2e.ts` | Completes Gate P2's journey | 6 |

---

## Task 1: Kinds and the range rule

**Files:**
- Create: `backend/src/main/java/ie/coursework/timeline/domain/PersonalItemKind.java`, `TimelineRange.java`
- Test: `backend/src/test/java/ie/coursework/timeline/domain/TimelineRangeTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.timeline.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class TimelineRangeTest {

    private static final LocalDate FROM = LocalDate.of(2026, 10, 1);

    @Test
    void aSingleDayAndAHundredDaysAreFine() {
        assertThat(TimelineRange.problem(FROM, FROM)).isEmpty();
        assertThat(TimelineRange.problem(FROM, FROM.plusDays(99))).isEmpty();
    }

    @Test
    void endingBeforeItStartsIsRefused() {
        assertThat(TimelineRange.problem(FROM, FROM.minusDays(1))).contains("must be on or after from");
    }

    @Test
    void moreThanAHundredDaysIsRefused() {
        assertThat(TimelineRange.problem(FROM, FROM.plusDays(100))).contains("can be at most 100 days");
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw test -Dtest=TimelineRangeTest`
Expected: FAIL to compile.

- [ ] **Step 3: Implement**

```java
package ie.coursework.timeline.domain;

/** Design §6.8. Labels on the timeline; nothing depends on the kind. */
public enum PersonalItemKind {
    TEST,
    ESSAY,
    DEADLINE,
    OTHER
}
```

```java
package ie.coursework.timeline.domain;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/** Plan 2F P2-47: the largest view is a month; 100 days leaves room and caps the union query. */
public final class TimelineRange {

    public static final int MAX_DAYS = 100;

    private TimelineRange() {}

    /** Why {@code from}..{@code to} (inclusive) isn't an acceptable range, or empty if it is. */
    public static Optional<String> problem(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            return Optional.of("must be on or after from");
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_DAYS) {
            return Optional.of("can be at most " + MAX_DAYS + " days");
        }
        return Optional.empty();
    }
}
```

- [ ] **Step 4: Run it to see it pass, then commit**

Run: `cd backend && ./mvnw test -Dtest=TimelineRangeTest`
Expected: PASS.

```bash
git add backend/src/main/java/ie/coursework/timeline backend/src/test/java/ie/coursework/timeline
git commit -m "Name personal item kinds and cap a timeline range at 100 days"
```

---

## Task 2: Personal items, owner-scoped

**Files:**
- Create: `backend/src/main/resources/db/migration/V10__personal_items.sql`
- Create: `backend/src/main/java/ie/coursework/timeline/domain/PersonalItem.java`
- Create: `backend/src/main/java/ie/coursework/timeline/adapter/persistence/PersonalItemRepository.java`
- Test: `backend/src/test/java/ie/coursework/timeline/adapter/persistence/PersonalItemRepositoryTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.timeline.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.timeline.domain.PersonalItem;
import ie.coursework.timeline.domain.PersonalItemKind;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class PersonalItemRepositoryTest extends PostgresIntegrationTest {

    @Autowired private ClassFixtures fixtures;
    @Autowired private PersonalItemRepository items;

    @Test
    void everyOperationIsScopedToTheOwner() {
        ClassFixtures.World world = fixtures.world();
        UUID mine = items.insert(world.approvedStudent(), "Biology class test", LocalDate.of(2026, 10, 23),
                PersonalItemKind.TEST, world.class1(), Instant.now());
        items.insert(world.approvedStudent(), "Driving test", LocalDate.of(2026, 11, 19), PersonalItemKind.OTHER, null, Instant.now());

        assertThat(items.list(world.approvedStudent())).extracting(PersonalItem::title, PersonalItem::subjectName)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("Biology class test", "Biology"),
                        org.assertj.core.groups.Tuple.tuple("Driving test", null));
        assertThat(items.list(world.pendingStudent())).isEmpty();
        assertThat(items.find(mine, world.pendingStudent())).isEmpty();
        assertThat(items.update(mine, world.pendingStudent(), "Taken", LocalDate.of(2026, 10, 24), PersonalItemKind.ESSAY, null, Instant.now())).isFalse();
        assertThat(items.delete(mine, world.teacher1())).isFalse();

        assertThat(items.update(mine, world.approvedStudent(), "Biology test", LocalDate.of(2026, 10, 24), PersonalItemKind.TEST, null, Instant.now())).isTrue();
        assertThat(items.find(mine, world.approvedStudent())).get().extracting(PersonalItem::title).isEqualTo("Biology test");
        assertThat(items.delete(mine, world.approvedStudent())).isTrue();
        assertThat(items.find(mine, world.approvedStudent())).isEmpty();
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw test -Dtest=PersonalItemRepositoryTest`
Expected: FAIL to compile.

- [ ] **Step 3: Migration, record, repository**

`backend/src/main/resources/db/migration/V10__personal_items.sql` (checked on Postgres 18 when this plan was written):

```sql
-- The student's own timeline items (design §3.2, §6.8). Private to the student: no role but the owner reads
-- this table, in any view or aggregate. No revisions, no retention rule: students edit and delete freely.
CREATE TABLE personal_item (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id uuid        NOT NULL REFERENCES app_user (id),
    title           text        NOT NULL CONSTRAINT personal_item_title_present CHECK (btrim(title) <> '' AND char_length(title) <= 120),
    due_date        date        NOT NULL,
    kind            text        NOT NULL CONSTRAINT personal_item_kind_valid CHECK (kind IN ('TEST', 'ESSAY', 'DEADLINE', 'OTHER')),
    -- Only labels the item with a subject. Grants nobody any access.
    class_group_id  uuid        REFERENCES class_group (id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX personal_item_owner_date_idx ON personal_item (student_user_id, due_date);
```

```java
package ie.coursework.timeline.domain;

import java.time.LocalDate;
import java.util.UUID;

public record PersonalItem(UUID id, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId, String subjectName) {}
```

```java
package ie.coursework.timeline.adapter.persistence;

import ie.coursework.shared.persistence.Timestamps;
import ie.coursework.timeline.domain.PersonalItem;
import ie.coursework.timeline.domain.PersonalItemKind;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Design §6.8: private to the student. Every method takes the owner and filters by it; there is
 * deliberately no lookup by id alone. Don't add one, and don't join this table from any other feature.
 */
@Repository
public class PersonalItemRepository {

    private static final String SELECT = """
            SELECT p.id, p.title, p.due_date, p.kind, p.class_group_id, s.name AS subject_name
            FROM personal_item p
            LEFT JOIN class_group g ON g.id = p.class_group_id
            LEFT JOIN subject s ON s.id = g.subject_id
            WHERE p.student_user_id = :owner
            """;

    private final JdbcClient jdbc;

    public PersonalItemRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<PersonalItem> list(UUID owner) {
        return jdbc.sql(SELECT + " ORDER BY p.due_date, p.created_at").param("owner", owner)
                .query(PersonalItemRepository::map).list();
    }

    public Optional<PersonalItem> find(UUID id, UUID owner) {
        return jdbc.sql(SELECT + " AND p.id = :id").param("owner", owner).param("id", id)
                .query(PersonalItemRepository::map).optional();
    }

    public UUID insert(UUID owner, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId, Instant now) {
        return jdbc.sql("""
                INSERT INTO personal_item (student_user_id, title, due_date, kind, class_group_id, created_at, updated_at)
                VALUES (:owner, :title, :due, :kind, :class, :now, :now) RETURNING id
                """).param("owner", owner).param("title", title.strip()).param("due", dueDate)
                .param("kind", kind.name()).param("class", classId).param("now", Timestamps.utc(now))
                .query(UUID.class).single();
    }

    /** False when no item with that id belongs to {@code owner}. */
    public boolean update(UUID id, UUID owner, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId, Instant now) {
        return jdbc.sql("""
                UPDATE personal_item SET title = :title, due_date = :due, kind = :kind, class_group_id = :class, updated_at = :now
                WHERE id = :id AND student_user_id = :owner
                """).param("title", title.strip()).param("due", dueDate).param("kind", kind.name())
                .param("class", classId).param("now", Timestamps.utc(now)).param("id", id).param("owner", owner)
                .update() == 1;
    }

    public boolean delete(UUID id, UUID owner) {
        return jdbc.sql("DELETE FROM personal_item WHERE id = :id AND student_user_id = :owner")
                .param("id", id).param("owner", owner).update() == 1;
    }

    private static PersonalItem map(ResultSet rs, int row) throws SQLException {
        return new PersonalItem(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getObject("due_date", LocalDate.class),
                PersonalItemKind.valueOf(rs.getString("kind")),
                rs.getObject("class_group_id", UUID.class),
                rs.getString("subject_name"));
    }
}
```

If binding a null `UUID` fails, pass the type: `.param("class", classId, java.sql.Types.OTHER)`.

- [ ] **Step 4: Run it to see it pass, then commit**

Run: `cd backend && ./mvnw test -Dtest=PersonalItemRepositoryTest`
Expected: PASS.

```bash
git add backend/src/main/resources/db/migration/V10__personal_items.sql backend/src/main/java/ie/coursework/timeline \
        backend/src/test/java/ie/coursework/timeline/adapter/persistence/PersonalItemRepositoryTest.java
git commit -m "Store a student's own timeline items, reachable only through their owner"
```

---

## Task 3: The timeline query

**Files:**
- Create: `backend/src/main/java/ie/coursework/timeline/domain/TimelineEntry.java`
- Create: `backend/src/main/java/ie/coursework/timeline/adapter/persistence/TimelineRepository.java`
- Test: `backend/src/test/java/ie/coursework/timeline/adapter/persistence/TimelineRepositoryTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.timeline.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.timeline.domain.PersonalItemKind;
import ie.coursework.timeline.domain.TimelineEntry;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class TimelineRepositoryTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;
    private static final LocalDate FROM = LocalDate.of(2026, 9, 1);
    private static final LocalDate TO = LocalDate.of(2026, 12, 9);

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private PersonalItemRepository personal;
    @Autowired private TimelineRepository timeline;

    private ClassFixtures.World world;

    @BeforeEach
    void seed() {
        world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), BIO);
        components.stageDate(component, components.stageId(BIO, 4), LocalDate.of(2026, 10, 16));
        components.item(component, components.stageId(BIO, 6), "Full draft in for feedback", LocalDate.of(2026, 12, 4));
        components.item(component, components.stageId(BIO, 4), "Book a re-run slot", null);
        UUID retired = components.item(component, components.stageId(BIO, 4), "Retired", LocalDate.of(2026, 10, 20));
        jdbcTemplate.update("UPDATE teacher_item SET retired_at = now() WHERE id = ?", retired);
        personal.insert(world.approvedStudent(), "Biology class test", LocalDate.of(2026, 10, 16), PersonalItemKind.TEST, world.class1(), Instant.now());
        personal.insert(world.approvedStudent(), "Driving test", LocalDate.of(2026, 11, 19), PersonalItemKind.OTHER, null, Instant.now());
    }

    @Test
    void mergesStageDatesDatedTeacherItemsAndOwnItemsInDateOrder() {
        List<TimelineEntry> entries = timeline.between(world.approvedStudent(), FROM, TO);

        assertThat(entries).extracting(e -> e.kind() + " " + e.date() + " " + e.title() + " " + e.subjectName())
                .containsExactly(
                        "STAGE 2026-10-16 Conducting the Experiment Biology",
                        "PERSONAL 2026-10-16 Biology class test Biology",
                        "PERSONAL 2026-11-19 Driving test null",
                        "TEACHER_ITEM 2026-12-04 Full draft in for feedback Biology");
        assertThat(entries.getFirst().stageLabel()).isEqualTo("Stage 4");
        assertThat(entries.getFirst().componentId()).isNotNull();
    }

    @Test
    void theRangeIsInclusiveAndFilters() {
        assertThat(timeline.between(world.approvedStudent(), LocalDate.of(2026, 12, 4), LocalDate.of(2026, 12, 4)))
                .extracting(TimelineEntry::title).containsExactly("Full draft in for feedback");
    }

    @Test
    void pendingAndRemovedStudentsGetNoCoursework() {
        assertThat(timeline.between(world.pendingStudent(), FROM, TO)).isEmpty();
        assertThat(timeline.between(world.removedStudent(), FROM, TO)).isEmpty();
    }

    @Test
    void theTeacherGetsNoneOfTheStudentsItems() {
        assertThat(timeline.between(world.teacher1(), FROM, TO)).isEmpty();
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw test -Dtest=TimelineRepositoryTest`
Expected: FAIL to compile.

- [ ] **Step 3: Implement**

```java
package ie.coursework.timeline.domain;

import java.time.LocalDate;
import java.util.UUID;

/** One row of the timeline. Coursework rows carry the component; personal rows carry the item. */
public record TimelineEntry(String kind, LocalDate date, String title, String stageLabel, String subjectCode,
        String subjectName, UUID classId, String className, UUID componentId, UUID personalItemId, String personalKind) {}
```

```java
package ie.coursework.timeline.adapter.persistence;

import ie.coursework.timeline.domain.TimelineEntry;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Design §3.2: everything a student is assessed on, across every subject, plus their own items. One union
 * over approved enrolments and the student's own rows (plan 2F P2-44 to P2-46). Checked on Postgres 18 when
 * the plan was written.
 */
@Repository
public class TimelineRepository {

    private static final String SQL = """
            SELECT kind, due_date, stage_label, title, subject_code, subject_name, class_id, class_name,
                   component_id, personal_item_id, personal_kind
            FROM (
                SELECT 'STAGE' AS kind, d.due_date, st.label AS stage_label, st.name AS title, subj.code AS subject_code,
                       subj.name AS subject_name, g.id AS class_id, g.name AS class_name, i.id AS component_id,
                       NULL::uuid AS personal_item_id, NULL::text AS personal_kind, 1 AS kind_order, st.ordinal AS within
                FROM enrolment e
                JOIN class_group g ON g.id = e.class_group_id
                JOIN subject subj ON subj.id = g.subject_id
                JOIN component_instance i ON i.class_group_id = g.id
                JOIN instance_stage_date d ON d.instance_id = i.id
                JOIN template_stage st ON st.id = d.template_stage_id
                WHERE e.student_user_id = :student AND e.status = 'APPROVED'
                  AND d.due_date BETWEEN :from AND :to
                UNION ALL
                SELECT 'TEACHER_ITEM', t.due_date, st.label, t.text, subj.code, subj.name, g.id, g.name, i.id,
                       NULL::uuid, NULL::text, 2, st.ordinal * 1000 + t.ordinal
                FROM enrolment e
                JOIN class_group g ON g.id = e.class_group_id
                JOIN subject subj ON subj.id = g.subject_id
                JOIN component_instance i ON i.class_group_id = g.id
                JOIN teacher_item t ON t.instance_id = i.id AND t.retired_at IS NULL AND t.due_date IS NOT NULL
                JOIN template_stage st ON st.id = t.template_stage_id
                WHERE e.student_user_id = :student AND e.status = 'APPROVED'
                  AND t.due_date BETWEEN :from AND :to
                UNION ALL
                SELECT 'PERSONAL', p.due_date, NULL, p.title, subj.code, subj.name, g.id, g.name, NULL,
                       p.id, p.kind, 3, 0
                FROM personal_item p
                LEFT JOIN class_group g ON g.id = p.class_group_id
                LEFT JOIN subject subj ON subj.id = g.subject_id
                WHERE p.student_user_id = :student
                  AND p.due_date BETWEEN :from AND :to
            ) AS item
            ORDER BY due_date, kind_order, subject_name NULLS LAST, within, title
            """;

    private final JdbcClient jdbc;

    public TimelineRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<TimelineEntry> between(UUID studentId, LocalDate from, LocalDate to) {
        return jdbc.sql(SQL).param("student", studentId).param("from", from).param("to", to)
                .query((rs, i) -> new TimelineEntry(
                        rs.getString("kind"),
                        rs.getObject("due_date", LocalDate.class),
                        rs.getString("title"),
                        rs.getString("stage_label"),
                        rs.getString("subject_code"),
                        rs.getString("subject_name"),
                        rs.getObject("class_id", UUID.class),
                        rs.getString("class_name"),
                        rs.getObject("component_id", UUID.class),
                        rs.getObject("personal_item_id", UUID.class),
                        rs.getString("personal_kind")))
                .list();
    }
}
```

- [ ] **Step 4: Run it to see it pass, then commit**

Run: `cd backend && ./mvnw test -Dtest=TimelineRepositoryTest`
Expected: PASS.

```bash
git add backend/src/main/java/ie/coursework/timeline backend/src/test/java/ie/coursework/timeline/adapter/persistence/TimelineRepositoryTest.java
git commit -m "Merge approved coursework dates and a student's own items into one timeline query"
```

---

## Task 4: Endpoints, and privacy proven

**Files:**
- Create: `backend/src/main/java/ie/coursework/timeline/application/TimelineViews.java`, `TimelineService.java`
- Create: `backend/src/main/java/ie/coursework/timeline/adapter/web/TimelineController.java`, `PersonalItemController.java`, `PersonalItemRequest.java`
- Test: `backend/src/test/java/ie/coursework/timeline/adapter/web/PersonalItemsTest.java`, `TimelineTest.java`
- Test: `backend/src/test/java/ie/coursework/timeline/authz/PersonalItemPrivacyTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package ie.coursework.timeline.adapter.web;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class PersonalItemsTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    private ClassFixtures.World world;
    private ApiSession student;

    @BeforeEach
    void signIn() throws Exception {
        world = fixtures.world();
        student = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);
    }

    @Test
    void addsAnItemLabelledByAClassTheStudentIsIn() throws Exception {
        student.post("/api/v1/me/personal-items", item("Biology class test", "2026-10-23", "TEST", world.class1().toString()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Biology class test"))
                .andExpect(jsonPath("$.kind").value("TEST"))
                .andExpect(jsonPath("$.subjectName").value("Biology"));
        student.post("/api/v1/me/personal-items", item("Driving test", "2026-11-19", "OTHER", null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.classId").value(nullValue()));

        student.get("/api/v1/me/personal-items")
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Biology class test"));
    }

    @Test
    void aClassTheStudentIsntInIsNotFound() throws Exception {
        student.post("/api/v1/me/personal-items", item("Sneaky", "2026-10-23", "TEST", world.classB().toString()))
                .andExpect(status().isNotFound());
        new ApiSession(mockMvc).login(ClassFixtures.REMOVED_STUDENT, TestAccounts.PASSWORD)
                .post("/api/v1/me/personal-items", item("Removed", "2026-10-23", "TEST", world.class1().toString()))
                .andExpect(status().isNotFound());
    }

    @Test
    void editsAndDeletes() throws Exception {
        String body = student.post("/api/v1/me/personal-items", item("CAO", "2026-11-01", "DEADLINE", null))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");

        student.patch("/api/v1/me/personal-items/" + id, item("CAO account", "2026-11-02", "DEADLINE", null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("CAO account"))
                .andExpect(jsonPath("$.dueDate").value("2026-11-02"));
        student.delete("/api/v1/me/personal-items/" + id).andExpect(status().isNoContent());
        student.delete("/api/v1/me/personal-items/" + id).andExpect(status().isNotFound());
    }

    @Test
    void titleDateAndKindAreRequired() throws Exception {
        student.post("/api/v1/me/personal-items", item(" ", "2026-11-01", "OTHER", null))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        student.post("/api/v1/me/personal-items", "{\"title\":\"x\",\"kind\":\"OTHER\"}")
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        student.post("/api/v1/me/personal-items", item("x", "2026-11-01", "PARTY", null))
                .andExpect(status().isBadRequest());
    }

    static String item(String title, String date, String kind, String classId) {
        return "{\"title\":\"%s\",\"dueDate\":\"%s\",\"kind\":\"%s\",\"classId\":%s}".formatted(
                title, date, kind, classId == null ? "null" : "\"" + classId + "\"");
    }
}
```

```java
package ie.coursework.timeline.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class TimelineTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    @Test
    void returnsTheRangeAndItsItemsInOrderWithLabels() throws Exception {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        components.stageDate(component, components.stageId(ComponentFixtures.BIOLOGY_2027, 5), LocalDate.of(2026, 12, 9));
        components.item(component, components.stageId(ComponentFixtures.BIOLOGY_2027, 6), "Full draft in for feedback", LocalDate.of(2026, 12, 4));
        ApiSession student = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);
        student.post("/api/v1/me/personal-items", PersonalItemsTest.item("Biology class test", "2026-12-02", "TEST", world.class1().toString()));

        student.get("/api/v1/me/timeline?from=2026-12-01&to=2026-12-31")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.from").value("2026-12-01"))
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.items[0].kind").value("PERSONAL"))
                .andExpect(jsonPath("$.items[0].personalKind").value("TEST"))
                .andExpect(jsonPath("$.items[1].kind").value("TEACHER_ITEM"))
                .andExpect(jsonPath("$.items[1].componentId").value(component.toString()))
                .andExpect(jsonPath("$.items[2].kind").value("STAGE"))
                .andExpect(jsonPath("$.items[2].stageLabel").value("Stage 5"))
                .andExpect(jsonPath("$.items[2].subjectName").value("Biology"));
    }

    @Test
    void refusesABackwardsOrTooLongRange() throws Exception {
        fixtures.world();
        ApiSession student = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);

        student.get("/api/v1/me/timeline?from=2026-12-01&to=2026-11-30")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors[0].field").value("to"));
        student.get("/api/v1/me/timeline?from=2026-09-01&to=2027-06-30")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        student.get("/api/v1/me/timeline?from=soon&to=2026-11-30")
                .andExpect(status().isBadRequest());
    }
}
```

```java
package ie.coursework.timeline.authz;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
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

/**
 * Design §6.8 and §10: no role but the owner can read a student's own items, in any view. The student labels
 * an item with teacher 1's class, the case most likely to leak.
 */
@AutoConfigureMockMvc
class PersonalItemPrivacyTest extends PostgresIntegrationTest {

    private static final String SECRET = "Nana's birthday";

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private UUID component;
    private String itemPath;

    @BeforeEach
    void aPrivateItem() throws Exception {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        String body = as(ClassFixtures.APPROVED_STUDENT).post("/api/v1/me/personal-items",
                "{\"title\":\"%s\",\"dueDate\":\"2026-11-20\",\"kind\":\"OTHER\",\"classId\":\"%s\"}".formatted(SECRET, world.class1()))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        itemPath = "/api/v1/me/personal-items/" + JsonPath.read(body, "$.id");
    }

    @Test
    void theClassesTeacherReachesNothing() throws Exception {
        nothingReachable(as(ClassFixtures.TEACHER1));
        String everythingTheTeacherSees = as(ClassFixtures.TEACHER1).get("/api/v1/components/" + component).andReturn().getResponse().getContentAsString()
                + as(ClassFixtures.TEACHER1).get("/api/v1/classes/" + world.class1()).andReturn().getResponse().getContentAsString()
                + as(ClassFixtures.TEACHER1).get("/api/v1/classes").andReturn().getResponse().getContentAsString();
        assertThat(everythingTheTeacherSees).doesNotContain("Nana");
    }

    @Test
    void aSchoolLeaderReachesNothing() throws Exception {
        nothingReachable(as(ClassFixtures.LEADER_A));
    }

    @Test
    void anotherStudentInTheSameClassReachesNothing() throws Exception {
        nothingReachable(as(ClassFixtures.PENDING_STUDENT));
    }

    @Test
    void anonymousIsUnauthenticated() throws Exception {
        new ApiSession(mockMvc).get("/api/v1/me/personal-items").andExpect(status().isUnauthorized());
        new ApiSession(mockMvc).get("/api/v1/me/timeline?from=2026-11-01&to=2026-11-30").andExpect(status().isUnauthorized());
    }

    private void nothingReachable(ApiSession session) throws Exception {
        session.get("/api/v1/me/personal-items").andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        session.get("/api/v1/me/timeline?from=2026-11-01&to=2026-11-30").andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        session.patch(itemPath, "{\"title\":\"Mine\",\"dueDate\":\"2026-11-20\",\"kind\":\"OTHER\",\"classId\":null}").andExpect(status().isNotFound());
        session.delete(itemPath).andExpect(status().isNotFound());
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd backend && ./mvnw test -Dtest='PersonalItemsTest,TimelineTest,PersonalItemPrivacyTest'`
Expected: FAIL (routes unmapped).

- [ ] **Step 3: Views, service, controllers**

```java
package ie.coursework.timeline.application;

import ie.coursework.timeline.domain.PersonalItemKind;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Mirrored field for field by frontend/lib/api/schemas.ts. */
public final class TimelineViews {

    private TimelineViews() {}

    public record TimelineItem(String kind, LocalDate date, String title, String stageLabel, String subjectCode,
            String subjectName, UUID classId, String className, UUID componentId, UUID personalItemId, String personalKind) {}

    public record Timeline(LocalDate from, LocalDate to, List<TimelineItem> items) {}

    public record PersonalItemView(UUID id, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId, String subjectName) {}
}
```

```java
package ie.coursework.timeline.application;

import ie.coursework.classes.adapter.persistence.EnrolmentRepository;
import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.identity.domain.Actor;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import ie.coursework.shared.error.FieldError;
import ie.coursework.timeline.adapter.persistence.PersonalItemRepository;
import ie.coursework.timeline.adapter.persistence.TimelineRepository;
import ie.coursework.timeline.application.TimelineViews.PersonalItemView;
import ie.coursework.timeline.application.TimelineViews.Timeline;
import ie.coursework.timeline.application.TimelineViews.TimelineItem;
import ie.coursework.timeline.domain.PersonalItem;
import ie.coursework.timeline.domain.PersonalItemKind;
import ie.coursework.timeline.domain.TimelineRange;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Everything here acts on the signed-in user's own rows. There is no user id parameter to get wrong. */
@Service
public class TimelineService {

    private final TimelineRepository timeline;
    private final PersonalItemRepository personal;
    private final EnrolmentRepository enrolments;
    private final Clock clock;

    public TimelineService(TimelineRepository timeline, PersonalItemRepository personal, EnrolmentRepository enrolments, Clock clock) {
        this.timeline = timeline;
        this.personal = personal;
        this.enrolments = enrolments;
        this.clock = clock;
    }

    public Timeline timeline(Actor actor, LocalDate from, LocalDate to) {
        TimelineRange.problem(from, to).ifPresent(message -> {
            throw new DomainException(ErrorCode.VALIDATION_FAILED, "That date range isn't allowed.", List.of(new FieldError("to", message)));
        });
        return new Timeline(from, to, timeline.between(actor.userId(), from, to).stream()
                .map(e -> new TimelineItem(e.kind(), e.date(), e.title(), e.stageLabel(), e.subjectCode(), e.subjectName(),
                        e.classId(), e.className(), e.componentId(), e.personalItemId(), e.personalKind()))
                .toList());
    }

    public List<PersonalItemView> items(Actor actor) {
        return personal.list(actor.userId()).stream().map(TimelineService::view).toList();
    }

    @Transactional
    public PersonalItemView add(Actor actor, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId) {
        checkClass(actor, classId);
        UUID id = personal.insert(actor.userId(), title, dueDate, kind, classId, clock.instant());
        return view(personal.find(id, actor.userId()).orElseThrow());
    }

    @Transactional
    public PersonalItemView edit(Actor actor, UUID itemId, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId) {
        checkClass(actor, classId);
        if (!personal.update(itemId, actor.userId(), title, dueDate, kind, classId, clock.instant())) {
            throw notFound();
        }
        return view(personal.find(itemId, actor.userId()).orElseThrow());
    }

    @Transactional
    public void delete(Actor actor, UUID itemId) {
        if (!personal.delete(itemId, actor.userId())) {
            throw notFound();
        }
    }

    /** Plan 2F P2-43: a label, so only a class the student has joined; anything else is 404. */
    private void checkClass(Actor actor, UUID classId) {
        if (classId == null) {
            return;
        }
        boolean joined = enrolments.findByStudent(classId, actor.userId())
                .filter(e -> e.status() != EnrolmentStatus.REMOVED)
                .isPresent();
        if (!joined) {
            throw new DomainException(ErrorCode.NOT_FOUND, "No such class.");
        }
    }

    private static PersonalItemView view(PersonalItem item) {
        return new PersonalItemView(item.id(), item.title(), item.dueDate(), item.kind(), item.classId(), item.subjectName());
    }

    private static DomainException notFound() {
        return new DomainException(ErrorCode.NOT_FOUND, "No such item.");
    }
}
```

```java
package ie.coursework.timeline.adapter.web;

import ie.coursework.timeline.domain.PersonalItemKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

/** Used for create and for a full edit. */
public record PersonalItemRequest(
        @NotBlank @Size(max = 120) String title,
        @NotNull LocalDate dueDate,
        @NotNull PersonalItemKind kind,
        UUID classId) {}
```

```java
package ie.coursework.timeline.adapter.web;

import ie.coursework.identity.domain.Actor;
import ie.coursework.timeline.application.TimelineService;
import ie.coursework.timeline.application.TimelineViews.Timeline;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TimelineController {

    private final TimelineService timeline;

    public TimelineController(TimelineService timeline) {
        this.timeline = timeline;
    }

    @GetMapping("/api/v1/me/timeline")
    Timeline timeline(Actor actor,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return timeline.timeline(actor, from, to);
    }
}
```

```java
package ie.coursework.timeline.adapter.web;

import ie.coursework.identity.domain.Actor;
import ie.coursework.timeline.application.TimelineService;
import ie.coursework.timeline.application.TimelineViews.PersonalItemView;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user's own items (design §6.8). There's no user id in any path. */
@RestController
@RequestMapping("/api/v1/me/personal-items")
public class PersonalItemController {

    private final TimelineService timeline;

    public PersonalItemController(TimelineService timeline) {
        this.timeline = timeline;
    }

    @GetMapping
    List<PersonalItemView> list(Actor actor) {
        return timeline.items(actor);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    PersonalItemView add(Actor actor, @Valid @RequestBody PersonalItemRequest body) {
        return timeline.add(actor, body.title(), body.dueDate(), body.kind(), body.classId());
    }

    @PatchMapping("/{itemId}")
    PersonalItemView edit(Actor actor, @PathVariable UUID itemId, @Valid @RequestBody PersonalItemRequest body) {
        return timeline.edit(actor, itemId, body.title(), body.dueDate(), body.kind(), body.classId());
    }

    @DeleteMapping("/{itemId}")
    ResponseEntity<Void> delete(Actor actor, @PathVariable UUID itemId) {
        timeline.delete(actor, itemId);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `cd backend && ./mvnw test -Dtest='PersonalItemsTest,TimelineTest,PersonalItemPrivacyTest' && make backend-test`
Expected: PASS. `from=soon` relies on the type-mismatch handler 2D added to `ProblemDetailsAdvice`.

- [ ] **Step 5: Prove the privacy test bites, then commit**

Temporarily change `PersonalItemRepository.SELECT`'s `WHERE p.student_user_id = :owner` to `WHERE (p.student_user_id = :owner OR true)`, run `PersonalItemPrivacyTest`, see it fail, and revert.

```bash
git add backend/src/main/java/ie/coursework/timeline backend/src/test/java/ie/coursework/timeline
git commit -m "Serve the timeline and a student's own items, and prove teachers and leaders reach none of them"
```

---

## Task 5: Frontend data and timeline arithmetic

**Files:**
- Modify: `frontend/lib/api/schemas.ts`
- Create: `frontend/lib/app/timeline.ts`, `frontend/lib/app/timeline.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { monthWeeks, rangeFor, rangeLabel, relativeDay, stepFrom, toIsoDate, weekday } from './timeline.ts';

const TODAY = '2026-10-14'; // a Wednesday

describe('rangeFor', () => {
  test('defaults to a 28-day list from today', () => {
    assert.deepEqual(rangeFor({}, TODAY), { view: 'list', from: '2026-10-14', to: '2026-11-10' });
  });

  test('a week runs Monday to Sunday around from', () => {
    assert.deepEqual(rangeFor({ view: 'week', from: '2026-10-14' }, TODAY), { view: 'week', from: '2026-10-12', to: '2026-10-18' });
  });

  test('a month is the calendar month', () => {
    assert.deepEqual(rangeFor({ view: 'month', from: '2026-02-17' }, TODAY), { view: 'month', from: '2026-02-01', to: '2026-02-28' });
  });

  test('anything malformed falls back to the list from today', () => {
    assert.deepEqual(rangeFor({ view: 'year', from: '2026-02-30' }, TODAY), { view: 'list', from: TODAY, to: '2026-11-10' });
    assert.deepEqual(rangeFor({ view: ['week', 'month'], from: 'soon' }, TODAY), { view: 'week', from: '2026-10-12', to: '2026-10-18' });
  });
});

describe('stepFrom', () => {
  test('moves by the view', () => {
    assert.equal(stepFrom({ view: 'list', from: '2026-10-14', to: '2026-11-10' }, 1), '2026-11-11');
    assert.equal(stepFrom({ view: 'week', from: '2026-10-12', to: '2026-10-18' }, -1), '2026-10-05');
    assert.equal(stepFrom({ view: 'month', from: '2026-12-01', to: '2026-12-31' }, 1), '2027-01-01');
  });
});

describe('relativeDay', () => {
  test('in words', () => {
    assert.equal(relativeDay(TODAY, '2026-10-14'), 'today');
    assert.equal(relativeDay(TODAY, '2026-10-15'), 'tomorrow');
    assert.equal(relativeDay(TODAY, '2026-10-13'), 'yesterday');
    assert.equal(relativeDay(TODAY, '2026-10-17'), 'in 3 days');
    assert.equal(relativeDay(TODAY, '2026-10-12'), '2 days ago');
  });
});

describe('labels and grids', () => {
  test('range labels', () => {
    assert.equal(rangeLabel({ view: 'week', from: '2026-10-12', to: '2026-10-18' }), '12–18 Oct 2026');
    assert.equal(rangeLabel({ view: 'month', from: '2026-12-01', to: '2026-12-31' }), 'December 2026');
  });

  test('weekday and today as an ISO date', () => {
    assert.equal(weekday('2026-10-16'), 'Fri 16 Oct');
    assert.equal(toIsoDate(Date.parse('2026-10-16T00:00:00Z')), '2026-10-16');
  });

  test('a month grid is whole Monday-to-Sunday weeks', () => {
    const weeks = monthWeeks({ view: 'month', from: '2026-12-01', to: '2026-12-31' });
    assert.equal(weeks[0][0], '2026-11-30');
    assert.equal(weeks.at(-1)!.at(-1), '2027-01-03');
    assert.ok(weeks.every((w) => w.length === 7));
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd frontend && node --test lib/app/timeline.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Schemas**

Append to `frontend/lib/api/schemas.ts`:

```ts
// Mirrors timeline/application/TimelineViews.java (plan 2F).
export const personalKindSchema = z.enum(["TEST", "ESSAY", "DEADLINE", "OTHER"]);
export type PersonalKind = z.infer<typeof personalKindSchema>;

export const timelineItemSchema = z.object({
  kind: z.enum(["STAGE", "TEACHER_ITEM", "PERSONAL"]),
  date: z.string(),
  title: z.string(),
  stageLabel: z.string().nullable(),
  subjectCode: z.string().nullable(),
  subjectName: z.string().nullable(),
  classId: z.string().nullable(),
  className: z.string().nullable(),
  componentId: z.string().nullable(),
  personalItemId: z.string().nullable(),
  personalKind: personalKindSchema.nullable(),
});
export type TimelineItem = z.infer<typeof timelineItemSchema>;

export const timelineSchema = z.object({ from: z.string(), to: z.string(), items: z.array(timelineItemSchema) });
export type Timeline = z.infer<typeof timelineSchema>;

export const personalItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  dueDate: z.string(),
  kind: personalKindSchema,
  classId: z.string().nullable(),
  subjectName: z.string().nullable(),
});
export type PersonalItem = z.infer<typeof personalItemSchema>;
```

- [ ] **Step 4: `timeline.ts`**

```ts
/**
 * Timeline ranges and labels (plan 2F P2-47, P2-48). Calendar dates are "YYYY-MM-DD" strings, and all
 * arithmetic is on UTC midnights, so no timezone or DST change can move a date (as in lib/schedule.ts).
 */
export type View = 'list' | 'week' | 'month';
export type Range = { view: View; from: string; to: string };

const MS_PER_DAY = 86_400_000;
const LIST_DAYS = 28;
const epoch = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export const toIsoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => toIsoDate(epoch(iso) + days * MS_PER_DAY);
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function isIsoDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(epoch(value)) && toIsoDate(epoch(value)) === value;
}

function monday(iso: string) {
  const dayOfWeek = (new Date(epoch(iso)).getUTCDay() + 6) % 7;
  return addDays(iso, -dayOfWeek);
}

function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

function nextMonthStart(iso: string) {
  const d = new Date(epoch(monthStart(iso)));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return toIsoDate(d.getTime());
}

export function rangeFor(params: { view?: string | string[]; from?: string | string[] }, today: string): Range {
  const requested = first(params.view);
  const view: View = requested === 'week' || requested === 'month' ? requested : 'list';
  const fromParam = first(params.from);
  const anchor = isIsoDate(fromParam) ? fromParam : today;
  if (view === 'week') {
    const from = monday(anchor);
    return { view, from, to: addDays(from, 6) };
  }
  if (view === 'month') {
    const from = monthStart(anchor);
    return { view, from, to: addDays(nextMonthStart(from), -1) };
  }
  return { view: 'list', from: anchor, to: addDays(anchor, LIST_DAYS - 1) };
}

/** The `from` of the previous (-1) or next (1) range of the same view. */
export function stepFrom(range: Range, direction: 1 | -1): string {
  if (range.view === 'week') return addDays(range.from, 7 * direction);
  if (range.view === 'month') {
    if (direction === 1) return nextMonthStart(range.from);
    return monthStart(addDays(range.from, -1));
  }
  return addDays(range.from, LIST_DAYS * direction);
}

export function relativeDay(today: string, date: string): string {
  const days = Math.round((epoch(date) - epoch(today)) / MS_PER_DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

const DAY_MONTH = new Intl.DateTimeFormat('en-IE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const MONTH_YEAR = new Intl.DateTimeFormat('en-IE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const WEEKDAY = new Intl.DateTimeFormat('en-IE', { weekday: 'short', timeZone: 'UTC' });

/** "Fri 16 Oct". */
export function weekday(iso: string): string {
  return `${WEEKDAY.format(epoch(iso))} ${DAY_MONTH.format(epoch(iso))}`;
}

export function rangeLabel(range: Range): string {
  if (range.view === 'month') return MONTH_YEAR.format(epoch(range.from));
  const year = range.to.slice(0, 4);
  const [fromDay, fromMonth] = DAY_MONTH.format(epoch(range.from)).split(' ');
  const to = DAY_MONTH.format(epoch(range.to));
  return fromMonth === to.split(' ')[1] ? `${fromDay}–${to} ${year}` : `${fromDay} ${fromMonth} – ${to} ${year}`;
}

/** Whole Monday-to-Sunday weeks covering a month range. */
export function monthWeeks(range: Range): string[][] {
  const weeks: string[][] = [];
  for (let start = monday(range.from); epoch(start) <= epoch(range.to); start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}
```

If `en-IE` short months print "Sept" for September on your Node version, that's fine: no test uses September.

- [ ] **Step 5: Run it to see it pass, then commit**

Run: `cd frontend && node --test lib/app/timeline.test.ts && npm run typecheck`
Expected: PASS.

```bash
git add frontend/lib/api/schemas.ts frontend/lib/app/timeline.ts frontend/lib/app/timeline.test.ts
git commit -m "Turn the timeline URL into a list, week or month range, with days remaining in words"
```

---

## Task 6: The timeline page

**Files:**
- Create: `frontend/components/app/timeline-view.tsx` + spec, `personal-item-form.tsx` + spec, `personal-item-actions.tsx` + spec
- Modify: `frontend/app/(app)/home/page.tsx`, `frontend/e2e/phase2.e2e.ts`

- [ ] **Step 1: Write the failing specs**

`frontend/components/app/timeline-view.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TimelineItem } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { TimelineView } from "./timeline-view";

const base = { stageLabel: null, subjectCode: "BIOLOGY", subjectName: "Biology", classId: "c1", className: "6A Biology", componentId: "k1", personalItemId: null, personalKind: null };
const items: TimelineItem[] = [
  { ...base, kind: "PERSONAL", date: "2026-12-02", title: "Biology class test", componentId: null, personalItemId: "p1", personalKind: "TEST" },
  { ...base, kind: "TEACHER_ITEM", date: "2026-12-04", title: "Full draft in for feedback", stageLabel: "Stage 6" },
  { ...base, kind: "STAGE", date: "2026-12-09", title: "Data Analysis and Conclusions", stageLabel: "Stage 5" },
  { ...base, kind: "PERSONAL", date: "2026-12-10", title: "Driving test", subjectCode: null, subjectName: null, classId: null, className: null, componentId: null, personalItemId: "p2", personalKind: "OTHER" },
];

describe("TimelineView", () => {
  it("lists items in order with date, days remaining, kind in words and subject", () => {
    render(<TimelineView range={{ view: "list", from: "2026-12-01", to: "2026-12-28" }} today="2026-12-01" items={items} classes={[]} />);
    const rows = within(screen.getByRole("list", { name: "Timeline items" })).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/Wed 2 Dec.*tomorrow.*Test.*Biology class test.*Biology/),
      expect.stringMatching(/Fri 4 Dec.*in 3 days.*From your teacher.*Full draft in for feedback.*Biology/),
      expect.stringMatching(/Wed 9 Dec.*in 8 days.*Stage date.*Stage 5.*Data Analysis and Conclusions.*Biology/),
      expect.stringMatching(/Thu 10 Dec.*in 9 days.*Other.*Driving test/),
    ]);
  });

  it("links coursework items to their component and marks the current view", () => {
    render(<TimelineView range={{ view: "list", from: "2026-12-01", to: "2026-12-28" }} today="2026-12-01" items={items} classes={[]} />);
    expect(screen.getByRole("link", { name: /Full draft in for feedback/ })).toHaveAttribute("href", "/components/k1");
    expect(screen.getByRole("link", { name: "List" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Week" })).toHaveAttribute("href", "?view=week&from=2026-12-01");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "?view=list&from=2026-12-29");
  });

  it("offers edit and delete only on the student's own items", () => {
    render(<TimelineView range={{ view: "list", from: "2026-12-01", to: "2026-12-28" }} today="2026-12-01" items={items} classes={[]} />);
    expect(screen.getByRole("button", { name: "Edit Biology class test" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Full draft in for feedback" })).not.toBeInTheDocument();
  });

  it("says when nothing is in range", () => {
    render(<TimelineView range={{ view: "week", from: "2026-12-14", to: "2026-12-20" }} today="2026-12-01" items={[]} classes={[]} />);
    expect(screen.getByText("Nothing due 14–20 Dec 2026.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Timeline items" })).not.toBeInTheDocument();
  });

  it("draws a month as a table of weeks", () => {
    render(<TimelineView range={{ view: "month", from: "2026-12-01", to: "2026-12-31" }} today="2026-12-01" items={items} classes={[]} />);
    const table = screen.getByRole("table", { name: "December 2026" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(within(table).getByText("Full draft in for feedback")).toBeInTheDocument();
  });
});
```

`frontend/components/app/personal-item-form.spec.tsx`:

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

import { AddPersonalItem } from "./personal-item-form";

const classes = [{ classId: "c1", className: "6A Biology", subjectName: "Biology" }];

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("AddPersonalItem", () => {
  it("opens a form that says only the student can see it, and adds the item", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "p1", title: "Irish oral mock", dueDate: "2026-10-14", kind: "TEST", classId: null, subjectName: null });
    render(<AddPersonalItem classes={classes} />);
    await userEvent.click(screen.getByRole("button", { name: "Add my own item" }));

    expect(screen.getByText("Only you can see this. Your teachers can't.")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Irish oral mock");
    await userEvent.type(screen.getByLabelText("Date"), "2026-10-14");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Kind" }), "TEST");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/me/personal-items",
      { title: "Irish oral mock", dueDate: "2026-10-14", kind: "TEST", classId: null }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("can label the item with one of the student's classes", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "p1", title: "x", dueDate: "2026-10-23", kind: "TEST", classId: "c1", subjectName: "Biology" });
    render(<AddPersonalItem classes={classes} />);
    await userEvent.click(screen.getByRole("button", { name: "Add my own item" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Biology class test");
    await userEvent.type(screen.getByLabelText("Date"), "2026-10-23");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Class (optional)" }), "c1");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(vi.mocked(api.send).mock.calls[0][2]).toMatchObject({ classId: "c1" });
  });

  it("Cancel closes the form without saving", async () => {
    render(<AddPersonalItem classes={classes} />);
    await userEvent.click(screen.getByRole("button", { name: "Add my own item" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("textbox", { name: "Title" })).not.toBeInTheDocument();
    expect(api.send).not.toHaveBeenCalled();
  });
});
```

`frontend/components/app/personal-item-actions.spec.tsx`:

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

import { PersonalItemActions } from "./personal-item-actions";

const item = { id: "p1", title: "Driving test", dueDate: "2026-11-19", kind: "OTHER" as const, classId: null };

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("PersonalItemActions", () => {
  it("edits with the item's values filled in", async () => {
    vi.mocked(api.send).mockResolvedValue({ ...item, title: "Driving test (retake)", subjectName: null });
    render(<PersonalItemActions item={item} classes={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Driving test" }));
    const title = screen.getByRole("textbox", { name: "Title" });
    expect(title).toHaveValue("Driving test");
    await userEvent.type(title, " (retake)");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));
    expect(api.send).toHaveBeenCalledWith("PATCH", "/me/personal-items/p1",
      { title: "Driving test (retake)", dueDate: "2026-11-19", kind: "OTHER", classId: null }, expect.anything());
  });

  it("deletes only after confirming, and Keep backs out", async () => {
    render(<PersonalItemActions item={item} classes={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Driving test" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(api.sendNoContent).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Delete Driving test" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete item" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/me/personal-items/p1");
    expect(refresh).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && npx vitest run components/app/timeline-view.spec.tsx components/app/personal-item-form.spec.tsx components/app/personal-item-actions.spec.tsx`
Expected: FAIL (components missing).

- [ ] **Step 3: `PersonalItemForm`, `AddPersonalItem`, `PersonalItemActions`**

`frontend/components/app/personal-item-form.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type PersonalKind, personalItemSchema } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";

export type ClassOption = { classId: string; className: string; subjectName: string };
type Draft = { title: string; dueDate: string; kind: PersonalKind; classId: string | null };

const KINDS: ReadonlyArray<{ value: PersonalKind; label: string }> = [
  { value: "TEST", label: "Test" },
  { value: "ESSAY", label: "Essay" },
  { value: "DEADLINE", label: "Deadline" },
  { value: "OTHER", label: "Other" },
];

export const KIND_LABEL: Record<PersonalKind, string> = { TEST: "Test", ESSAY: "Essay", DEADLINE: "Deadline", OTHER: "Other" };

/** Add or edit one of the student's own items (plan 2F P2-50). Private by design, and it says so. */
export function PersonalItemForm({
  itemId,
  initial,
  classes,
  onDone,
}: {
  itemId?: string;
  initial?: Draft;
  classes: ClassOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial ?? { title: "", dueDate: "", kind: "OTHER", classId: null });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const id = itemId ?? "new";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (itemId) await api.send("PATCH", `/me/personal-items/${itemId}`, draft, personalItemSchema);
      else await api.send("POST", "/me/personal-items", draft, personalItemSchema);
      onDone();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-app-small text-app-grey">{"Only you can see this. Your teachers can't."}</p>
      {error && <ErrorPanel error={error} />}
      <FieldGroup>
        <Field id={`pi-title-${id}`} label="Title">
          {(c) => <input {...c} required maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />}
        </Field>
        <Field id={`pi-date-${id}`} label="Date">
          {(c) => <input {...c} type="date" required value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />}
        </Field>
        <Field id={`pi-kind-${id}`} label="Kind">
          {(c) => (
            <select {...c} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as PersonalKind })}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          )}
        </Field>
        <Field id={`pi-class-${id}`} label="Class (optional)">
          {(c) => (
            <select {...c} value={draft.classId ?? ""} onChange={(e) => setDraft({ ...draft, classId: e.target.value || null })}>
              <option value="">No class</option>
              {classes.map((k) => <option key={k.classId} value={k.classId}>{`${k.subjectName} · ${k.className}`}</option>)}
            </select>
          )}
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>Save item</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function AddPersonalItem({ classes }: { classes: ClassOption[] }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <PersonalItemForm classes={classes} onDone={() => setOpen(false)} />
  ) : (
    <div>
      <Button type="button" onClick={() => setOpen(true)}>Add my own item</Button>
    </div>
  );
}
```

`required` on the inputs lets the browser stop an empty submit, but jsdom doesn't enforce it and the server's `VALIDATION_FAILED` still shows through `ErrorPanel`. If the "Add my own item" button becomes a second primary button on the page, make it `variant="outline"` (UI-STANDARDS: one primary per screen).

`frontend/components/app/personal-item-actions.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import type { PersonalKind } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";
import { type ClassOption, PersonalItemForm } from "./personal-item-form";

type Item = { id: string; title: string; dueDate: string; kind: PersonalKind; classId: string | null };

/** Edit and delete on the student's own timeline items; delete confirms in place (plan 2F P2-50). */
export function PersonalItemActions({ item, classes }: { item: Item; classes: ClassOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "editing" | "confirming">("idle");
  const [error, setError] = useState<ApiError | null>(null);

  async function remove() {
    setError(null);
    try {
      await api.sendNoContent("DELETE", `/me/personal-items/${item.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    }
  }

  if (mode === "editing") {
    return (
      <PersonalItemForm
        itemId={item.id}
        initial={{ title: item.title, dueDate: item.dueDate, kind: item.kind, classId: item.classId }}
        classes={classes}
        onDone={() => setMode("idle")}
      />
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {mode === "confirming" ? (
        <>
          <span className="text-app-small text-app-copy">Delete this item?</span>
          <Button type="button" size="sm" variant="destructive" onClick={remove}>Delete item</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setMode("idle")}>Keep</Button>
        </>
      ) : (
        <>
          <Button type="button" size="sm" variant="outline" aria-label={`Edit ${item.title}`} onClick={() => setMode("editing")}>Edit</Button>
          <Button type="button" size="sm" variant="outline" aria-label={`Delete ${item.title}`} onClick={() => setMode("confirming")}>Delete</Button>
        </>
      )}
      {error && <ErrorPanel error={error} />}
    </div>
  );
}
```

- [ ] **Step 4: `TimelineView`**

```tsx
import Link from "next/link";

import type { TimelineItem } from "@/lib/api/schemas";
import { monthWeeks, type Range, rangeLabel, relativeDay, stepFrom, type View, weekday } from "@/lib/app/timeline";

import { PersonalItemActions } from "./personal-item-actions";
import { type ClassOption, KIND_LABEL } from "./personal-item-form";
import { textLink } from "./styles";

const VIEWS: ReadonlyArray<{ view: View; label: string }> = [
  { view: "list", label: "List" },
  { view: "week", label: "Week" },
  { view: "month", label: "Month" },
];

/** Plan 2F P2-49: the kind is always a word. */
function kindWord(item: TimelineItem) {
  if (item.kind === "STAGE") return "Stage date";
  if (item.kind === "TEACHER_ITEM") return "From your teacher";
  return item.personalKind ? KIND_LABEL[item.personalKind] : "Own item";
}

function Title({ item }: { item: TimelineItem }) {
  const text = item.stageLabel && item.kind === "STAGE" ? `${item.stageLabel} · ${item.title}` : item.title;
  return item.componentId ? <Link href={`/components/${item.componentId}`} className={textLink}>{text}</Link> : <span>{text}</span>;
}

/** Roadmap §6.2 `/home` 2F: list, week and month across every approved class, plus the student's own items. */
export function TimelineView({ range, today, items, classes }: { range: Range; today: string; items: TimelineItem[]; classes: ClassOption[] }) {
  const href = (view: View, from: string) => `?view=${view}&from=${from}`;
  const label = rangeLabel(range);
  const row = (item: TimelineItem) => (
    <li key={`${item.kind}-${item.personalItemId ?? item.componentId}-${item.date}-${item.title}`} className="flex flex-col gap-1 border-b border-app-line py-3">
      <span className="text-app-small text-app-grey">{`${weekday(item.date)} · ${relativeDay(today, item.date)} · ${kindWord(item)}`}</span>
      <span className="text-app-base text-app-ink"><Title item={item} /></span>
      {item.subjectName && <span className="text-app-small text-app-grey">{item.subjectName}</span>}
      {item.kind === "PERSONAL" && item.personalItemId && item.personalKind && (
        <PersonalItemActions item={{ id: item.personalItemId, title: item.title, dueDate: item.date, kind: item.personalKind, classId: item.classId }} classes={classes} />
      )}
    </li>
  );

  return (
    <section aria-labelledby="timeline-range" className="flex flex-col gap-4">
      <nav aria-label="Timeline view" className="flex flex-wrap items-center gap-4">
        {VIEWS.map((v) => (
          <Link key={v.view} href={href(v.view, range.from)} aria-current={v.view === range.view ? "page" : undefined}
            className={v.view === range.view ? "font-semibold text-app-accent" : textLink}>
            {v.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-4">
        <Link href={href(range.view, stepFrom(range, -1))} className={textLink}>Previous</Link>
        <h2 id="timeline-range" className="font-semibold text-app-ink">{label}</h2>
        <Link href={href(range.view, stepFrom(range, 1))} className={textLink}>Next</Link>
      </div>

      {range.view === "month" ? (
        <table className="w-full table-fixed border-collapse text-app-small">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <th key={d} scope="col" className="py-1 text-left">{d}</th>)}</tr>
          </thead>
          <tbody>
            {monthWeeks(range).map((week) => (
              <tr key={week[0]}>
                {week.map((date) => (
                  <td key={date} className={`h-20 border border-app-line p-1 align-top ${date < range.from || date > range.to ? "text-app-disabled" : ""}`}>
                    <span className={date === today ? "font-bold text-app-accent" : ""}>{Number(date.slice(8))}</span>
                    {items.filter((i) => i.date === date).map((i) => (
                      <span key={`${i.kind}-${i.title}`} className="block truncate">{i.title}</span>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : items.length === 0 ? (
        <p className="text-app-base text-app-copy">{`Nothing due ${label}.`}</p>
      ) : (
        <ul aria-label="Timeline items" className="flex flex-col">{items.map(row)}</ul>
      )}
    </section>
  );
}
```

The empty list renders a `<p>`, never an empty `<ul>`: `phase1.e2e.ts` asserts on the only `listitem` of a new student's `/home`, and must keep passing. `table` is named by its `<caption>`, which is what the spec's `getByRole("table", { name })` finds.

- [ ] **Step 5: `/home`**

```tsx
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { MyClasses } from "@/components/app/my-classes";
import { MyComponents } from "@/components/app/my-components";
import { Notice } from "@/components/app/notice";
import { AddPersonalItem } from "@/components/app/personal-item-form";
import { pageTitle, textLink } from "@/components/app/styles";
import { TimelineView } from "@/components/app/timeline-view";
import { enrolmentViewSchema, myComponentSchema, timelineSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { rangeFor, relativeDay, toIsoDate } from "@/lib/app/timeline";
import { dublinToday } from "@/lib/schedule";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const today = toIsoDate(dublinToday());
  const range = rangeFor(await searchParams, today);
  const [timeline, classes, components] = await Promise.all([
    attempt(() => serverApi.get(`/me/timeline?from=${range.from}&to=${range.to}`, timelineSchema)),
    attempt(() => serverApi.get("/me/classes", z.array(enrolmentViewSchema))),
    attempt(() => serverApi.get("/me/components", z.array(myComponentSchema))),
  ]);

  const joined = classes.ok ? classes.data : [];
  const approved = joined.filter((c) => c.status === "APPROVED");
  const next = timeline.ok ? timeline.data.items.find((i) => i.date >= today) : undefined;
  const options = joined.map((c) => ({ classId: c.classId, className: c.className, subjectName: c.subjectName }));

  return (
    <AppMain>
      <div className="flex flex-col gap-6">
        <h1 className={pageTitle}>Timeline</h1>
        {next && <p className="text-app-base text-app-ink">{`Next: ${next.title}, ${relativeDay(today, next.date)}.`}</p>}

        {classes.ok && joined.length === 0 && (
          <Notice tone="attention">
            <Link href="/join" className={textLink}>Join a class</Link> to see your coursework dates here. You can add your own items now.
          </Notice>
        )}
        {classes.ok && joined.length > 0 && approved.length === 0 && (
          <Notice tone="attention">A teacher needs to approve you before your coursework dates show here. Your own items still do.</Notice>
        )}
        {classes.ok && approved.length > 0 && components.ok && components.data.length === 0 && (
          <Notice tone="attention">{"Your teachers haven't set up coursework yet. Your own items still show here."}</Notice>
        )}

        {timeline.ok ? <TimelineView range={range} today={today} items={timeline.data.items} classes={options} /> : <ErrorPanel error={timeline.error} />}
        <AddPersonalItem classes={options} />

        {components.ok ? <MyComponents components={components.data} /> : <ErrorPanel error={components.error} />}
        {classes.ok ? <MyClasses classes={classes.data} /> : <ErrorPanel error={classes.error} />}
      </div>
    </AppMain>
  );
}
```

Fix import order if lint asks (`next/link` belongs with the other external imports at the top). Check `my-classes.tsx`: if it renders its own `h1` ("My classes"), change it to `h2` in the same commit so the page has one `h1`, and update its spec's heading level if it asserts one. The `Notice` with a link has an apostrophe-free JSX sentence, so it needs no string expression.

- [ ] **Step 6: Run the specs and the Phase 1 journey's `/home` assumptions**

Run: `cd frontend && npx vitest run components/app && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 7: Complete Gate P2's journey**

Append to `frontend/e2e/phase2.e2e.ts` (it reuses `STUDENT`, `componentUrl` and `P2` from 2D and 2E):

```ts
test("the timeline shows the stage date, the teacher's item and the student's own item, in order", async ({ browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  const student = await phone(browser);
  await student.goto("/login");
  await student.getByRole("textbox", { name: "Username" }).fill(STUDENT.username);
  await student.getByLabel("Password").fill(STUDENT.password);
  await student.getByRole("button", { name: "Sign in" }).click();
  await expect(student).toHaveURL(/\/home/);
  await expectAccessible(student);

  await student.getByRole("button", { name: "Add my own item" }).click();
  await expect(student.getByText("Only you can see this. Your teachers can't.")).toBeVisible();
  await student.getByRole("textbox", { name: "Title" }).fill("Biology class test");
  await student.getByLabel("Date").fill("2026-12-02");
  await student.getByRole("combobox", { name: "Kind" }).selectOption("TEST");
  await student.getByRole("combobox", { name: "Class (optional)" }).selectOption({ label: `Biology · ${P2.className}` });
  await student.getByRole("button", { name: "Save item" }).click();

  await student.goto("/home?view=list&from=2026-12-01");
  const rows = student.getByRole("list", { name: "Timeline items" }).getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Biology class test");
  await expect(rows.nth(0)).toContainText("Test");
  await expect(rows.nth(1)).toContainText("Full draft in for feedback");
  await expect(rows.nth(1)).toContainText("From your teacher");
  await expect(rows.nth(2)).toContainText("Data Analysis and Conclusions");
  await expect(rows.nth(2)).toContainText("Stage date");
  for (const i of [0, 1, 2]) await expect(rows.nth(i)).toContainText("Biology");
  await expectAccessible(student);

  await student.getByRole("link", { name: "Month" }).click();
  await expect(student.getByRole("table", { name: "December 2026" })).toBeVisible();
  await expectAccessible(student);

  expect(componentUrl).toMatch(/\/components\//);
});
```

- [ ] **Step 8: Verify and commit**

Run: `make verify && make e2e`
Expected: green on laptop and phone; axe clean on every timeline view the journey visits; `phase1.e2e.ts` unchanged and passing.

```bash
git add frontend
git commit -m "Make /home the student's timeline: coursework dates and private own items in list, week and month"
```

---

## Task 7: Restyle from D-4 (only when the pack exists)

**Precondition:** `docs/design/pilot/D-4-timeline/` exists. Otherwise leave unticked and note it in `docs/HANDOFF.md`.

- [ ] Read `NOTES.md`: student navigation (where Timeline, My components and Join a class live), where class approval status goes, sheet or page for adding, and label changes. Navigation and moving class status are §6.1/§6.2 changes: update the roadmap, get Tim's confirmation, change specs in their own commit first.
- [ ] Add the pack's `tokens.css` additions (item-kind markers) as `--app-*`.
- [ ] Restyle `TimelineView`, `PersonalItemForm`, `PersonalItemActions`, `/home`, and the student navigation to UI-STANDARDS §15; the countdown is the page's one bold moment (UI-BRIEF §9). Specs pass unchanged.
- [ ] If D-4 chose a sheet for adding: it closes with Escape and returns focus to "Add my own item" (spec that).
- [ ] UI-CHECKLIST at 390px and 1140px; `make e2e`.
- [ ] Commit: `git commit -m "Restyle the timeline and student navigation from design pack D-4"`

---

## Task 8: Docs and Gate P2

- [ ] `docs/ARCHITECTURE.md`: §1 or §5 the `timeline` feature and V10; §4 "Personal items: every `PersonalItemRepository` method takes the owner; no other feature joins `personal_item`; `PersonalItemPrivacyTest` holds the line"; §6 `/home`'s range-from-URL pattern.
- [ ] `CLAUDE.md` Rules that don't bend: "**A student's own items are private.** `personal_item` is only read through `PersonalItemRepository` with the owner, and never joined from another feature."
- [ ] `docs/PILOT-ROADMAP.md`: §1 Phase 2 built, date; §7 Phase 2 endpoint list exact; the Gate P2 checklist ticked where true.
- [ ] `docs/HANDOFF.md` rewritten, including "Gate P2" with what's still waiting on people: Tim's content review (if not done in 2B/2C), Katelyn's Biology checkpoint review, design packs D-3/D-4/D-5 restyles if the packs haven't arrived.
- [ ] Commit: `git commit -m "Record the timeline and personal items; walk Gate P2"`

---

## Gate P2 (roadmap §8.2)

- [ ] `make verify` and `make e2e` green, with the journey extended: teacher creates a Biology component, sets dates, one date after the completion date is refused with the named message; student sees the stages and adds a personal item; the timeline shows both, in order, labelled
- [ ] Content: Tim has checked every checkpoint, prompt, rule, band and date against the source PDFs; the review is recorded in `docs/HANDOFF.md`
- [ ] Katelyn has reviewed the Biology checkpoints
- [ ] Changing a published template's structure in a migration fails the test suite (2A)
- [ ] PR `pilot/2f-personal-items-and-timeline` → `pilotMain`
