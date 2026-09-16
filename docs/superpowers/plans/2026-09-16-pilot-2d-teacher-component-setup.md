# Pilot 2D — Teacher Component Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher opens the Component tab of their class, chooses the class subject's 2027 brief, sets a date for each stage, and adds, edits and retires their own items. A date after the brief's completion date is refused with a message naming the stage and the date; out-of-order dates are saved with a warning.

**Architecture:** A new `ie.coursework.components` feature. `V8` adds `component_instance` (one per class), `instance_stage_date` and `teacher_item`, with a trigger that backs up the service's completion-date rule. The rule and the out-of-order check are pure domain classes. `ComponentService` scopes everything through `ClassService.owned` and the component's owner. `GET /components/{id}` is role-shaped (teacher now, student in 2E) and carries a `view` discriminator. On the frontend, `/teach/classes/[id]/component` is a server page that shows either the brief chooser or the setup editor, and the class page's tab row becomes a shared `ClassHeader`.

**Tech Stack:** Spring Boot 4.1 / Java 21, `JdbcClient`, Postgres 18 trigger, JUnit 5 + Testcontainers + `ApiSession`; Next.js 15.3.9, Zod 4, Vitest + Testing Library, `node:test`, Playwright + axe.

**Roadmap:** §6.2 (`/teach/classes/[id]/component` row), §7 Phase 2, §8.2 2D. **Design:** §3.1, §4.3, §6.3, §6.4, §8.2.

---

## Before you start

- 2C is merged (the Biology 2027 brief must exist): `git checkout -b pilot/2d-teacher-component-setup`.
- `make verify` and `make e2e` are green.
- Read: `docs/ARCHITECTURE.md` §4 (authorisation), §6 (page and component patterns), §7 (the add-a-feature recipe); `backend/src/main/java/ie/coursework/classes/application/ClassService.java` (`owned`); `backend/src/test/java/ie/coursework/support/ClassFixtures.java` and `classes/authz/TeacherScopeTest.java`; `frontend/components/app/class-students.tsx` and its spec; `frontend/e2e/phase1.e2e.ts`.
- **Design pack D-5 may not have arrived.** Build working-first (roadmap §6.3): semantic HTML, the existing `Field`/`FieldGroup`/`Notice`/`ErrorPanel` building blocks, specs by role and name. The restyle is Task 10, done only once `docs/design/pilot/D-5-teacher-component-setup/` exists. Labels below are the D-5 prompt's proposals; if the pack renames one, change the spec in its own commit first.
- Migration numbers: this plan adds `V8`. 2E adds `V9`, 2F `V10`.

**Decisions this plan takes** (proposed; status in roadmap §3 "Phase 2 questions"):

| # | Decision | Where |
|---|---|---|
| P2-23 | **One component per class** (`UNIQUE (class_group_id)`), stricter than design §6.4's `UNIQUE (class_group_id, annual_brief_id)`. A class is one subject in one academic year (D-5: "A class does one coursework component"), and every "behind" and leader count assumes one. **Confirmed by Tim, 16 Sep 2026 (Q-P2-D).** | `V8` |
| P2-24 | **Stage dates are saved as one batch** (`PUT …/stage-dates` replaces the set; a stage left out or sent with `dueDate: null` has no date). Teacher items are saved one at a time. This matches roadmap §7's endpoints; D-5 may still choose save-per-row, which the same endpoint supports. | API, `StageDatesForm` |
| P2-25 | **Every date a teacher saves must be on or before the completion date**, including dates they didn't change in this save. When the SEC moves a completion date earlier, the page flags the dates now after it (`AFTER_COMPLETION_DATE` warning) and the next save asks the teacher to fix them (design §6.3: "asked to fix them"). | `ComponentService.setStageDates` |
| P2-26 | **Out of order means a later stage (by ordinal) is due before the dated stage just before it.** Undated stages are skipped. One warning per adjacent pair, naming both stages. | `StageOrder` |
| P2-27 | **`COMPLETION_DATE_EXCEEDED` carries one field error per refused date, keyed by stage id** (or `dueDate` for an item), and a detail sentence the page shows: "Stage 6 is after the completion date, 26 Feb 2027. Choose a date on or before it." (D-5's working copy). Several refused dates: "2 dates are after the completion date, 26 Feb 2027. Choose dates on or before them." | `CompletionDates`, `ErrorCode` |
| P2-28 | **`GET /components/{id}` returns `{ "view": "TEACHER", … }` to the class's teacher** and (2E) `{ "view": "STUDENT", … }` to an approved student; anyone else gets 404. The controller's return type is `Object` so Jackson writes the runtime record, not the interface. | `ComponentController` |
| P2-29 | **The class detail response gains `componentId` (nullable)**, so the Component tab knows whether to show the chooser or the editor without a second lookup. | `ClassViews.ClassDetail`, `classDetailSchema` |
| P2-30 | **The teacher view shows each stage's checkpoint read-only** (the D-5 prompt asks whether it helps; the data costs nothing and the restyle can hide it). | `SetupStage.checkpoint` |
| P2-31 | **No audit events for component setup.** Design §9's audit list is role changes, enrolment decisions, reset codes, sign-offs and join codes; dates and items aren't on it. | — |
| P2-32 | **A teacher item's text is 1–200 characters.** | `V8`, `TeacherItemRequest` |

---

## File structure

Backend, under `backend/src/main/java/ie/coursework/` unless noted:

| File | Responsibility | Task |
|---|---|---|
| `components/domain/CompletionDates.java` + test | The rule and its refusal sentence | 1 |
| `components/domain/StageOrder.java`, `DatedStage.java` + test | Out-of-order pairs | 1 |
| `resources/db/migration/V8__component_instances.sql` | Tables and the completion-date trigger | 2 |
| `test/…/components/adapter/persistence/ComponentSchemaTest.java` | The trigger and uniqueness | 2 |
| `components/domain/Brief.java`, `TemplateStage.java`, `ComponentInstance.java`, `TeacherItem.java` | Stored shapes | 3 |
| `components/adapter/persistence/BriefRepository.java`, `TemplateRepository.java`, `ComponentRepository.java`, `TeacherItemRepository.java` + `ComponentRepositoriesTest.java` | SQL | 3 |
| `components/application/ComponentViews.java`, `StageDateInput.java`, `ComponentService.java` | Views, scope, rules | 4, 5, 6 |
| `shared/error/ErrorCode.java` | `COMPLETION_DATE_EXCEEDED`, `COMPONENT_ALREADY_EXISTS` | 4 |
| `shared/error/ProblemDetailsAdvice.java` | Missing or malformed query parameter → `VALIDATION_FAILED`; malformed path id → `NOT_FOUND` | 4 |
| `components/adapter/web/ComponentController.java` + request records | Endpoints | 4, 5, 6 |
| `classes/application/ClassViews.java`, `ClassService.java` | `componentId` on class detail | 4 |
| `test/…/support/ComponentFixtures.java` | A Biology component on a fixture class | 4 |
| `test/…/components/adapter/web/BriefsEndpointTest.java`, `ComponentCreateTest.java`, `StageDatesTest.java`, `TeacherItemsTest.java` | HTTP | 4, 5, 6 |
| `test/…/components/authz/ComponentScopeTest.java` | Out-of-scope → 404 | 7 |

Frontend, under `frontend/`:

| File | Responsibility | Task |
|---|---|---|
| `lib/api/schemas.ts` | Brief, teacher component, class detail `componentId` | 8 |
| `lib/app/component-setup.ts` + `.test.ts` | Date formatting, hours label, draft comparison | 8 |
| `components/app/class-header.tsx` + spec | Back link, title, tab row (Students · Component · Progress) | 8 |
| `components/app/class-students.tsx` (+ spec fixture) | Uses `ClassHeader` | 8 |
| `components/app/create-component-form.tsx` + spec | Choose brief, Create component | 9 |
| `components/app/stage-dates-form.tsx` + spec | Dates per stage, Save dates, warnings, refused rows | 9 |
| `components/app/teacher-items.tsx` + spec | Add, edit, retire in place | 9 |
| `app/(app)/teach/classes/[id]/component/page.tsx` | Loads class, briefs or component | 9 |
| `e2e/helpers.ts`, `e2e/phase1.e2e.ts`, `e2e/phase2.e2e.ts` | Shared journey helpers; the teacher part of Gate P2 | 9 |

---

## Task 1: The completion-date rule and out-of-order dates

**Files:**
- Create: `backend/src/main/java/ie/coursework/components/domain/CompletionDates.java`, `DatedStage.java`, `StageOrder.java`
- Test: `backend/src/test/java/ie/coursework/components/domain/CompletionDatesTest.java`, `StageOrderTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package ie.coursework.components.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class CompletionDatesTest {

    private static final LocalDate COMPLETION = LocalDate.of(2027, 2, 26);

    @Test
    void theCompletionDateItselfIsAllowed() {
        assertThat(CompletionDates.allows(COMPLETION, COMPLETION)).isTrue();
        assertThat(CompletionDates.allows(COMPLETION.minusDays(90), COMPLETION)).isTrue();
    }

    @Test
    void theDayAfterIsNot() {
        assertThat(CompletionDates.allows(COMPLETION.plusDays(1), COMPLETION)).isFalse();
    }

    @Test
    void theRefusalNamesWhatAndTheDate() {
        assertThat(CompletionDates.refusal("Stage 6", COMPLETION))
                .isEqualTo("Stage 6 is after the completion date, 26 Feb 2027. Choose a date on or before it.");
    }

    @Test
    void severalRefusalsAreCounted() {
        assertThat(CompletionDates.refusals(2, COMPLETION))
                .isEqualTo("2 dates are after the completion date, 26 Feb 2027. Choose dates on or before them.");
    }
}
```

```java
package ie.coursework.components.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class StageOrderTest {

    private final UUID s3 = UUID.randomUUID();
    private final UUID s4 = UUID.randomUUID();
    private final UUID s5 = UUID.randomUUID();

    @Test
    void datesInStageOrderGiveNoWarning() {
        assertThat(StageOrder.outOfOrder(List.of(
                new DatedStage(s3, 3, LocalDate.of(2026, 9, 25)),
                new DatedStage(s4, 4, LocalDate.of(2026, 10, 16)),
                new DatedStage(s5, 5, LocalDate.of(2026, 10, 16))))).isEmpty();
    }

    @Test
    void aLaterStageDueBeforeTheOneBeforeItIsFlaggedAsAPair() {
        assertThat(StageOrder.outOfOrder(List.of(
                new DatedStage(s5, 5, LocalDate.of(2026, 10, 9)),
                new DatedStage(s4, 4, LocalDate.of(2026, 10, 16)))))
                .containsExactly(List.of(s4, s5));
    }

    @Test
    void undatedStagesAreSkipped() {
        assertThat(StageOrder.outOfOrder(List.of(
                new DatedStage(s3, 3, LocalDate.of(2026, 10, 10)),
                new DatedStage(s4, 4, null),
                new DatedStage(s5, 5, LocalDate.of(2026, 10, 1)))))
                .containsExactly(List.of(s3, s5));
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd backend && ./mvnw test -Dtest='CompletionDatesTest,StageOrderTest'`
Expected: FAIL to compile.

- [ ] **Step 3: Implement**

```java
package ie.coursework.components.domain;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Design §6.4 (FR-49): no class date may be after the brief's completion date. */
public final class CompletionDates {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    private CompletionDates() {}

    public static boolean allows(LocalDate dueDate, LocalDate completionDate) {
        return !dueDate.isAfter(completionDate);
    }

    /** "Stage 6 is after the completion date, 26 Feb 2027. Choose a date on or before it." */
    public static String refusal(String what, LocalDate completionDate) {
        return "%s is after the completion date, %s. Choose a date on or before it.".formatted(what, DAY.format(completionDate));
    }

    public static String refusals(int count, LocalDate completionDate) {
        return "%d dates are after the completion date, %s. Choose dates on or before them.".formatted(count, DAY.format(completionDate));
    }
}
```

```java
package ie.coursework.components.domain;

import java.time.LocalDate;
import java.util.UUID;

/** A stage's position and the class's date for it, or null when none is set. */
public record DatedStage(UUID stageId, int ordinal, LocalDate dueDate) {}
```

```java
package ie.coursework.components.domain;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Design §6.4: stages needn't be dated in order, because students move back and forth between them, but a
 * later stage due before the one before it is probably a slip, so it's a warning, never a refusal.
 */
public final class StageOrder {

    private StageOrder() {}

    /** Pairs [earlier stage, later stage] where the later stage is due before the dated stage before it. */
    public static List<List<UUID>> outOfOrder(List<DatedStage> stages) {
        List<DatedStage> dated = stages.stream()
                .filter(s -> s.dueDate() != null)
                .sorted(Comparator.comparingInt(DatedStage::ordinal))
                .toList();
        List<List<UUID>> pairs = new ArrayList<>();
        for (int i = 1; i < dated.size(); i++) {
            if (dated.get(i).dueDate().isBefore(dated.get(i - 1).dueDate())) {
                pairs.add(List.of(dated.get(i - 1).stageId(), dated.get(i).stageId()));
            }
        }
        return pairs;
    }
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `cd backend && ./mvnw test -Dtest='CompletionDatesTest,StageOrderTest'`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/ie/coursework/components/domain backend/src/test/java/ie/coursework/components/domain
git commit -m "Refuse class dates after the completion date and flag stages dated out of order"
```

---

## Task 2: Component tables and the completion-date trigger

**Files:**
- Create: `backend/src/main/resources/db/migration/V8__component_instances.sql`
- Test: `backend/src/test/java/ie/coursework/components/adapter/persistence/ComponentSchemaTest.java`

- [ ] **Step 1: Write the failing test**

These tables are app data (truncated before each test), so no rollback is needed. The brief and stages are the real 2027 content.

```java
package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

class ComponentSchemaTest extends PostgresIntegrationTest {

    @Autowired private ClassFixtures fixtures;
    private ClassFixtures.World world;
    private UUID component;

    @BeforeEach
    void biologyComponent() {
        world = fixtures.world();
        component = jdbcTemplate.queryForObject("""
                INSERT INTO component_instance (class_group_id, annual_brief_id, created_by_user_id)
                VALUES (?, (SELECT id FROM annual_brief WHERE sec_code = '2027L025C2EL'), ?) RETURNING id
                """, UUID.class, world.class1(), world.teacher1());
    }

    @Test
    void aStageDateOnTheCompletionDateIsStored() {
        setStageDate(stage("2027L025C2EL", 6), LocalDate.of(2027, 2, 26));

        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM instance_stage_date", Integer.class)).isEqualTo(1);
    }

    @Test
    void aStageDateAfterTheCompletionDateIsRefusedByTheDatabase() {
        assertThatThrownBy(() -> setStageDate(stage("2027L025C2EL", 6), LocalDate.of(2027, 2, 27)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("COMPLETION_DATE_EXCEEDED");
    }

    @Test
    void aTeacherItemDateAfterTheCompletionDateIsRefusedByTheDatabase() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO teacher_item (instance_id, template_stage_id, ordinal, text, due_date)
                VALUES (?, ?, 1, 'Full draft in', DATE '2027-03-01')
                """, component, stage("2027L025C2EL", 6)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aStageFromAnotherSubjectsTemplateIsRefused() {
        assertThatThrownBy(() -> setStageDate(stage("2027L022C2EL", 1), LocalDate.of(2026, 10, 1)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aClassHasOneComponent() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO component_instance (class_group_id, annual_brief_id, created_by_user_id)
                VALUES (?, (SELECT id FROM annual_brief WHERE sec_code = '2027L025C2EL'), ?)
                """, world.class1(), world.teacher1()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void anItemNeedsText() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO teacher_item (instance_id, template_stage_id, ordinal, text) VALUES (?, ?, 1, '  ')
                """, component, stage("2027L025C2EL", 4)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private void setStageDate(UUID stageId, LocalDate date) {
        jdbcTemplate.update("INSERT INTO instance_stage_date (instance_id, template_stage_id, due_date) VALUES (?, ?, ?)",
                component, stageId, date);
    }

    private UUID stage(String secCode, int ordinal) {
        return jdbcTemplate.queryForObject("""
                SELECT s.id FROM template_stage s JOIN annual_brief b ON b.template_version_id = s.version_id
                WHERE b.sec_code = ? AND s.ordinal = ?
                """, UUID.class, secCode, ordinal);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw test -Dtest=ComponentSchemaTest`
Expected: FAIL: `relation "component_instance" does not exist`.

- [ ] **Step 3: Write the migration**

`backend/src/main/resources/db/migration/V8__component_instances.sql` (applied to Postgres 18 on top of 2A–2C when this plan was written):

```sql
-- A class's component: the brief it runs, its stage dates, and the teacher's own items (design §6.4).

-- One component per class (plan 2D P2-23). A brief is shared by every class that runs it.
CREATE TABLE component_instance (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id     uuid        NOT NULL UNIQUE REFERENCES class_group (id),
    annual_brief_id    uuid        NOT NULL REFERENCES annual_brief (id),
    created_by_user_id uuid        NOT NULL REFERENCES app_user (id),
    created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX component_instance_brief_idx ON component_instance (annual_brief_id);

-- The class's own date for a stage. No row means "no date yet". Dates needn't be in stage order.
CREATE TABLE instance_stage_date (
    instance_id       uuid        NOT NULL REFERENCES component_instance (id),
    template_stage_id uuid        NOT NULL REFERENCES template_stage (id),
    due_date          date        NOT NULL,
    updated_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (instance_id, template_stage_id)
);

-- The teacher's own to-dos inside a stage. Retired, never deleted.
CREATE TABLE teacher_item (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id       uuid        NOT NULL REFERENCES component_instance (id),
    template_stage_id uuid        NOT NULL REFERENCES template_stage (id),
    ordinal           int         NOT NULL CONSTRAINT teacher_item_ordinal_positive CHECK (ordinal > 0),
    text              text        NOT NULL CONSTRAINT teacher_item_text_present CHECK (btrim(text) <> '' AND char_length(text) <= 200),
    due_date          date,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    retired_at        timestamptz,
    CONSTRAINT teacher_item_ordinal_unique UNIQUE (instance_id, template_stage_id, ordinal)
);
CREATE INDEX teacher_item_instance_idx ON teacher_item (instance_id);

-- Design §6.4: a date after the brief's completion date is refused in the service, and here as a backstop.
-- The stage must also belong to the version the component's brief pins.
CREATE FUNCTION check_component_date() RETURNS trigger
    LANGUAGE plpgsql AS $$
DECLARE
    v_completion date;
    v_version    uuid;
BEGIN
    SELECT b.completion_date, b.template_version_id INTO v_completion, v_version
    FROM component_instance i JOIN annual_brief b ON b.id = i.annual_brief_id
    WHERE i.id = NEW.instance_id;

    IF NOT EXISTS (SELECT 1 FROM template_stage WHERE id = NEW.template_stage_id AND version_id = v_version) THEN
        RAISE EXCEPTION 'stage % isn''t in this component''s template version', NEW.template_stage_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF NEW.due_date IS NOT NULL AND NEW.due_date > v_completion THEN
        RAISE EXCEPTION 'COMPLETION_DATE_EXCEEDED: % is after the completion date %', NEW.due_date, v_completion
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER instance_stage_date_within_completion BEFORE INSERT OR UPDATE ON instance_stage_date
    FOR EACH ROW EXECUTE FUNCTION check_component_date();
CREATE TRIGGER teacher_item_within_completion BEFORE INSERT OR UPDATE ON teacher_item
    FOR EACH ROW EXECUTE FUNCTION check_component_date();
```

- [ ] **Step 4: Run it to see it pass**

Run: `cd backend && ./mvnw test -Dtest=ComponentSchemaTest`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V8__component_instances.sql \
        backend/src/test/java/ie/coursework/components/adapter/persistence/ComponentSchemaTest.java
git commit -m "Store a class's component, its stage dates and teacher items, refusing dates after completion"
```

---

## Task 3: Repositories

**Files:**
- Create: `backend/src/main/java/ie/coursework/components/domain/Brief.java`, `TemplateStage.java`, `ComponentInstance.java`, `TeacherItem.java`
- Create: `backend/src/main/java/ie/coursework/components/adapter/persistence/BriefRepository.java`, `TemplateRepository.java`, `ComponentRepository.java`, `TeacherItemRepository.java`
- Test: `backend/src/test/java/ie/coursework/components/adapter/persistence/ComponentRepositoriesTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.components.domain.Brief;
import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.components.domain.TeacherItem;
import ie.coursework.components.domain.TemplateStage;
import ie.coursework.support.ClassFixtures;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ComponentRepositoriesTest extends PostgresIntegrationTest {

    @Autowired private ClassFixtures fixtures;
    @Autowired private BriefRepository briefs;
    @Autowired private TemplateRepository templates;
    @Autowired private ComponentRepository components;
    @Autowired private TeacherItemRepository items;

    private ClassFixtures.World world;
    private Brief biology;

    @BeforeEach
    void seed() {
        world = fixtures.world();
        biology = briefs.published("BIOLOGY", null).getFirst();
    }

    @Test
    void publishedBriefsAreFoundBySubjectAndYear() {
        assertThat(biology.secCode()).isEqualTo("2027L025C2EL");
        assertThat(biology.completionDate()).isEqualTo(LocalDate.of(2027, 2, 26));
        assertThat(briefs.published("BIOLOGY", 2028)).isEmpty();
        assertThat(briefs.findPublished(biology.id())).contains(biology);
    }

    @Test
    void aVersionsStagesComeInOrderWithTheirCheckpoints() {
        List<TemplateStage> stages = templates.stages(biology.versionId());
        Map<UUID, String> checkpoints = templates.checkpointTextByStage(biology.versionId());

        assertThat(stages).extracting(TemplateStage::displayLabel)
                .containsExactly("Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5", "Stage 6");
        assertThat(checkpoints.get(stages.get(1).id())).isEqualTo("Investigative log shared with the teacher");
    }

    @Test
    void aComponentIsFoundOnlyByItsClassesOwner() {
        UUID id = components.insert(world.class1(), biology.id(), world.teacher1());

        assertThat(components.idForClass(world.class1())).contains(id);
        assertThat(components.findOwned(id, world.teacher1())).contains(new ComponentInstance(id, world.class1(), biology.id()));
        assertThat(components.findOwned(id, world.teacher2())).isEmpty();
    }

    @Test
    void stageDatesAreReplacedAsASet() {
        UUID id = components.insert(world.class1(), biology.id(), world.teacher1());
        List<TemplateStage> stages = templates.stages(biology.versionId());
        UUID s3 = stages.get(2).id();
        UUID s4 = stages.get(3).id();

        components.replaceStageDates(id, Map.of(s3, LocalDate.of(2026, 9, 25), s4, LocalDate.of(2026, 10, 16)), Instant.now());
        components.replaceStageDates(id, Map.of(s4, LocalDate.of(2026, 10, 23)), Instant.now());

        assertThat(components.stageDates(id)).containsExactlyEntriesOf(Map.of(s4, LocalDate.of(2026, 10, 23)));
    }

    @Test
    void itemsAreNumberedWithinTheirStageAndRetiredItemsDisappear() {
        UUID id = components.insert(world.class1(), biology.id(), world.teacher1());
        UUID s6 = templates.stages(biology.versionId()).get(5).id();

        TeacherItem first = items.add(id, s6, "Full draft in for feedback", LocalDate.of(2026, 12, 4), Instant.now());
        TeacherItem second = items.add(id, s6, "Catch-up window closes", null, Instant.now());
        items.update(second.id(), "Catch-up window closes", LocalDate.of(2026, 11, 13), Instant.now());
        items.retire(first.id(), Instant.now());

        assertThat(second.ordinal()).isEqualTo(2);
        assertThat(items.active(id)).extracting(TeacherItem::text, TeacherItem::dueDate)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("Catch-up window closes", LocalDate.of(2026, 11, 13)));
        assertThat(items.findActive(first.id(), id)).isEmpty();
        assertThat(items.findActive(second.id(), UUID.randomUUID())).isEmpty();
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw test -Dtest=ComponentRepositoriesTest`
Expected: FAIL to compile.

- [ ] **Step 3: Write the domain records**

```java
package ie.coursework.components.domain;

import java.time.LocalDate;
import java.util.UUID;

/** A published annual brief, with what setting up and showing a component needs. */
public record Brief(UUID id, UUID templateId, UUID versionId, UUID subjectId, String subjectCode, int examYear,
        String secCode, String title, String topicTitle, LocalDate completionDate) {}
```

```java
package ie.coursework.components.domain;

import java.util.UUID;

public record TemplateStage(UUID id, int ordinal, String label, String name, String description, Integer hoursMin,
        Integer hoursMax, String hoursGroup, boolean supervised) {

    /** "Stage 4", or the name of an unnumbered stage ("Compilation of the final report"). */
    public String displayLabel() {
        return label != null ? label : name;
    }
}
```

```java
package ie.coursework.components.domain;

import java.util.UUID;

public record ComponentInstance(UUID id, UUID classId, UUID briefId) {}
```

```java
package ie.coursework.components.domain;

import java.time.LocalDate;
import java.util.UUID;

public record TeacherItem(UUID id, UUID componentId, UUID stageId, int ordinal, String text, LocalDate dueDate) {}
```

- [ ] **Step 4: Write the repositories**

```java
package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.Brief;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class BriefRepository {

    private static final String PUBLISHED = """
            SELECT b.id, b.template_id, b.template_version_id, t.subject_id, s.code AS subject_code, b.exam_year,
                   b.sec_code, b.title, b.topic_title, b.completion_date
            FROM annual_brief b
            JOIN component_template t ON t.id = b.template_id
            JOIN subject s ON s.id = t.subject_id
            WHERE b.status = 'PUBLISHED'
            """;

    private final JdbcClient jdbc;

    public BriefRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Newest exam year first. {@code examYear} null means every year. */
    public List<Brief> published(String subjectCode, Integer examYear) {
        if (examYear == null) {
            return jdbc.sql(PUBLISHED + " AND s.code = :subject ORDER BY b.exam_year DESC")
                    .param("subject", subjectCode).query(BriefRepository::map).list();
        }
        return jdbc.sql(PUBLISHED + " AND s.code = :subject AND b.exam_year = :year ORDER BY b.exam_year DESC")
                .param("subject", subjectCode).param("year", examYear).query(BriefRepository::map).list();
    }

    public Optional<Brief> findPublished(UUID id) {
        return jdbc.sql(PUBLISHED + " AND b.id = :id").param("id", id).query(BriefRepository::map).optional();
    }

    private static Brief map(ResultSet rs, int row) throws SQLException {
        return new Brief(
                rs.getObject("id", UUID.class),
                rs.getObject("template_id", UUID.class),
                rs.getObject("template_version_id", UUID.class),
                rs.getObject("subject_id", UUID.class),
                rs.getString("subject_code"),
                rs.getInt("exam_year"),
                rs.getString("sec_code"),
                rs.getString("title"),
                rs.getString("topic_title"),
                rs.getObject("completion_date", LocalDate.class));
    }
}
```

```java
package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.TemplateStage;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Reads a template version. Content is read-only to the application. 2E adds sections, bands and prompts. */
@Repository
public class TemplateRepository {

    private final JdbcClient jdbc;

    public TemplateRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<TemplateStage> stages(UUID versionId) {
        return jdbc.sql("""
                SELECT id, ordinal, label, name, description, hours_min, hours_max, hours_group, supervised
                FROM template_stage WHERE version_id = :version ORDER BY ordinal
                """).param("version", versionId).query(TemplateRepository::stage).list();
    }

    /** Stage id → the text of its first checkpoint. Stages without one are absent. */
    public Map<UUID, String> checkpointTextByStage(UUID versionId) {
        Map<UUID, String> texts = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT DISTINCT ON (stage_id) stage_id, text FROM template_checkpoint
                WHERE version_id = :version ORDER BY stage_id, ordinal
                """).param("version", versionId)
                .query(rs -> {
                    texts.put(rs.getObject("stage_id", UUID.class), rs.getString("text"));
                });
        return texts;
    }

    private static TemplateStage stage(ResultSet rs, int row) throws SQLException {
        return new TemplateStage(
                rs.getObject("id", UUID.class),
                rs.getInt("ordinal"),
                rs.getString("label"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getObject("hours_min", Integer.class),
                rs.getObject("hours_max", Integer.class),
                rs.getString("hours_group"),
                rs.getBoolean("supervised"));
    }
}
```

```java
package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.shared.persistence.Timestamps;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ComponentRepository {

    private final JdbcClient jdbc;

    public ComponentRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID insert(UUID classId, UUID briefId, UUID createdBy) {
        return jdbc.sql("""
                INSERT INTO component_instance (class_group_id, annual_brief_id, created_by_user_id)
                VALUES (:class, :brief, :by) RETURNING id
                """).param("class", classId).param("brief", briefId).param("by", createdBy)
                .query(UUID.class).single();
    }

    public Optional<UUID> idForClass(UUID classId) {
        return jdbc.sql("SELECT id FROM component_instance WHERE class_group_id = :class")
                .param("class", classId).query(UUID.class).optional();
    }

    /** The scope check for every teacher component endpoint: the component's class is this teacher's. */
    public Optional<ComponentInstance> findOwned(UUID componentId, UUID teacherId) {
        return jdbc.sql("""
                SELECT i.id, i.class_group_id, i.annual_brief_id FROM component_instance i
                JOIN class_group g ON g.id = i.class_group_id
                WHERE i.id = :id AND g.owner_user_id = :teacher
                """).param("id", componentId).param("teacher", teacherId)
                .query((rs, row) -> new ComponentInstance(rs.getObject("id", UUID.class),
                        rs.getObject("class_group_id", UUID.class), rs.getObject("annual_brief_id", UUID.class)))
                .optional();
    }

    public Map<UUID, LocalDate> stageDates(UUID componentId) {
        Map<UUID, LocalDate> dates = new LinkedHashMap<>();
        jdbc.sql("SELECT template_stage_id, due_date FROM instance_stage_date WHERE instance_id = :id")
                .param("id", componentId)
                .query(rs -> {
                    dates.put(rs.getObject("template_stage_id", UUID.class), rs.getObject("due_date", LocalDate.class));
                });
        return dates;
    }

    /** The class's dates become exactly {@code dates}; a stage not in the map has no date. */
    public void replaceStageDates(UUID componentId, Map<UUID, LocalDate> dates, Instant now) {
        jdbc.sql("DELETE FROM instance_stage_date WHERE instance_id = :id").param("id", componentId).update();
        dates.forEach((stageId, due) -> jdbc.sql("""
                INSERT INTO instance_stage_date (instance_id, template_stage_id, due_date, updated_at)
                VALUES (:id, :stage, :due, :now)
                """).param("id", componentId).param("stage", stageId).param("due", due)
                .param("now", Timestamps.utc(now)).update());
    }
}
```

```java
package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.TeacherItem;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class TeacherItemRepository {

    private static final String ACTIVE = """
            SELECT t.id, t.instance_id, t.template_stage_id, t.ordinal, t.text, t.due_date
            FROM teacher_item t JOIN template_stage s ON s.id = t.template_stage_id
            WHERE t.retired_at IS NULL
            """;

    private final JdbcClient jdbc;

    public TeacherItemRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Not retired, in stage order then the order they were added. */
    public List<TeacherItem> active(UUID componentId) {
        return jdbc.sql(ACTIVE + " AND t.instance_id = :id ORDER BY s.ordinal, t.ordinal")
                .param("id", componentId).query(TeacherItemRepository::map).list();
    }

    /** By id within one component, so an item id from another component is not found. */
    public Optional<TeacherItem> findActive(UUID itemId, UUID componentId) {
        return jdbc.sql(ACTIVE + " AND t.id = :item AND t.instance_id = :id")
                .param("item", itemId).param("id", componentId).query(TeacherItemRepository::map).optional();
    }

    public TeacherItem add(UUID componentId, UUID stageId, String text, LocalDate dueDate, Instant now) {
        return jdbc.sql("""
                INSERT INTO teacher_item (instance_id, template_stage_id, ordinal, text, due_date, created_at, updated_at)
                VALUES (:id, :stage,
                        (SELECT coalesce(max(ordinal), 0) + 1 FROM teacher_item WHERE instance_id = :id AND template_stage_id = :stage),
                        :text, :due, :now, :now)
                RETURNING id, instance_id, template_stage_id, ordinal, text, due_date
                """).param("id", componentId).param("stage", stageId).param("text", text.strip())
                .param("due", dueDate).param("now", Timestamps.utc(now))
                .query(TeacherItemRepository::map).single();
    }

    public void update(UUID itemId, String text, LocalDate dueDate, Instant now) {
        jdbc.sql("UPDATE teacher_item SET text = :text, due_date = :due, updated_at = :now WHERE id = :item")
                .param("text", text.strip()).param("due", dueDate).param("now", Timestamps.utc(now)).param("item", itemId)
                .update();
    }

    public void retire(UUID itemId, Instant now) {
        jdbc.sql("UPDATE teacher_item SET retired_at = :now WHERE id = :item")
                .param("now", Timestamps.utc(now)).param("item", itemId).update();
    }

    private static TeacherItem map(ResultSet rs, int row) throws SQLException {
        return new TeacherItem(
                rs.getObject("id", UUID.class),
                rs.getObject("instance_id", UUID.class),
                rs.getObject("template_stage_id", UUID.class),
                rs.getInt("ordinal"),
                rs.getString("text"),
                rs.getObject("due_date", LocalDate.class));
    }
}
```

`update` fires the V8 trigger on every row it touches, so an item whose date the SEC has since overtaken can't be saved unchanged. `ComponentService` refuses that first with a named message (P2-25).

If `JdbcClient` won't bind a `null` `LocalDate` ("could not determine data type"), bind `java.sql.Types.DATE` explicitly: `.param("due", dueDate, java.sql.Types.DATE)`.

- [ ] **Step 5: Run it to see it pass**

Run: `cd backend && ./mvnw test -Dtest=ComponentRepositoriesTest`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/ie/coursework/components backend/src/test/java/ie/coursework/components/adapter/persistence/ComponentRepositoriesTest.java
git commit -m "Read briefs and template stages; store components, stage dates and teacher items"
```

---

## Task 4: Briefs, creating a component, and the teacher view

**Files:**
- Create: `backend/src/main/java/ie/coursework/components/application/ComponentViews.java`, `ComponentService.java`
- Create: `backend/src/main/java/ie/coursework/components/adapter/web/ComponentController.java`, `CreateComponentRequest.java`
- Modify: `backend/src/main/java/ie/coursework/shared/error/ErrorCode.java`
- Modify: `backend/src/main/java/ie/coursework/classes/application/ClassViews.java`, `ClassService.java`
- Create: `backend/src/test/java/ie/coursework/support/ComponentFixtures.java`
- Test: `backend/src/test/java/ie/coursework/components/adapter/web/BriefsEndpointTest.java`, `ComponentCreateTest.java`

- [ ] **Step 1: Write the fixture and the failing tests**

`backend/src/test/java/ie/coursework/support/ComponentFixtures.java`:

```java
package ie.coursework.support;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Components on {@link ClassFixtures} classes, built on the real 2027 content. */
@Component
public class ComponentFixtures {

    public static final String BIOLOGY_2027 = "2027L025C2EL";
    public static final String CHEMISTRY_2027 = "2027L022C2EL";

    private final JdbcTemplate jdbc;

    public ComponentFixtures(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UUID component(UUID classId, UUID teacherId, String secCode) {
        return jdbc.queryForObject("""
                INSERT INTO component_instance (class_group_id, annual_brief_id, created_by_user_id)
                VALUES (?, ?, ?) RETURNING id
                """, UUID.class, classId, briefId(secCode), teacherId);
    }

    public UUID briefId(String secCode) {
        return jdbc.queryForObject("SELECT id FROM annual_brief WHERE sec_code = ?", UUID.class, secCode);
    }

    public UUID stageId(String secCode, int ordinal) {
        return jdbc.queryForObject("""
                SELECT s.id FROM template_stage s JOIN annual_brief b ON b.template_version_id = s.version_id
                WHERE b.sec_code = ? AND s.ordinal = ?
                """, UUID.class, secCode, ordinal);
    }

    public void stageDate(UUID componentId, UUID stageId, LocalDate date) {
        jdbc.update("INSERT INTO instance_stage_date (instance_id, template_stage_id, due_date) VALUES (?, ?, ?)",
                componentId, stageId, date);
    }

    public UUID item(UUID componentId, UUID stageId, String text, LocalDate date) {
        return jdbc.queryForObject("""
                INSERT INTO teacher_item (instance_id, template_stage_id, ordinal, text, due_date)
                VALUES (?, ?, (SELECT coalesce(max(ordinal), 0) + 1 FROM teacher_item WHERE instance_id = ?), ?, ?)
                RETURNING id
                """, UUID.class, componentId, stageId, componentId, text, date);
    }
}
```

`backend/src/test/java/ie/coursework/components/adapter/web/BriefsEndpointTest.java`:

```java
package ie.coursework.components.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class BriefsEndpointTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    @BeforeEach
    void world() {
        fixtures.world();
    }

    @Test
    void listsTheSubjectsPublishedBriefs() throws Exception {
        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .get("/api/v1/briefs?subjectCode=BIOLOGY")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].secCode").value("2027L025C2EL"))
                .andExpect(jsonPath("$[0].examYear").value(2027))
                .andExpect(jsonPath("$[0].title").value("Biology in Practice Investigation"))
                .andExpect(jsonPath("$[0].topicTitle").value("Membranes, Osmosis, Food Preservation"))
                .andExpect(jsonPath("$[0].completionDate").value("2027-02-26"));
    }

    @Test
    void anotherYearOrUnknownSubjectIsAnEmptyList() throws Exception {
        ApiSession teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);

        teacher.get("/api/v1/briefs?subjectCode=BIOLOGY&examYear=2028").andExpect(jsonPath("$").isEmpty());
        teacher.get("/api/v1/briefs?subjectCode=GEOGRAPHY").andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void needsASession() throws Exception {
        new ApiSession(mockMvc).get("/api/v1/briefs?subjectCode=BIOLOGY").andExpect(status().isUnauthorized());
    }
}
```

`backend/src/test/java/ie/coursework/components/adapter/web/ComponentCreateTest.java`:

```java
package ie.coursework.components.adapter.web;

import static org.hamcrest.Matchers.nullValue;
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

@AutoConfigureMockMvc
class ComponentCreateTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private ApiSession teacher;

    @BeforeEach
    void signIn() throws Exception {
        world = fixtures.world();
        teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    @Test
    void aNewClassHasNoComponent() throws Exception {
        teacher.get("/api/v1/classes/" + world.class1()).andExpect(jsonPath("$.componentId").value(nullValue()));
    }

    @Test
    void creatingFromTheBriefGivesEveryStageWithoutDates() throws Exception {
        String body = teacher.post("/api/v1/classes/" + world.class1() + "/components",
                        "{\"briefId\":\"%s\"}".formatted(components.briefId(ComponentFixtures.BIOLOGY_2027)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.view").value("TEACHER"))
                .andExpect(jsonPath("$.className").value(ClassFixtures.CLASS1_NAME))
                .andExpect(jsonPath("$.subjectName").value("Biology"))
                .andExpect(jsonPath("$.brief.completionDate").value("2027-02-26"))
                .andExpect(jsonPath("$.stages.length()").value(6))
                .andExpect(jsonPath("$.stages[3].label").value("Stage 4"))
                .andExpect(jsonPath("$.stages[3].name").value("Conducting the Experiment"))
                .andExpect(jsonPath("$.stages[3].supervised").value(true))
                .andExpect(jsonPath("$.stages[3].hoursMin").value(1))
                .andExpect(jsonPath("$.stages[3].checkpoint").value(
                        "Experiment carried out under supervision, in line with the research and planning already shared"))
                .andExpect(jsonPath("$.stages[5].hoursMin").value(nullValue()))
                .andExpect(jsonPath("$.stages[0].dueDate").value(nullValue()))
                .andExpect(jsonPath("$.stages[0].items").isEmpty())
                .andExpect(jsonPath("$.warnings").isEmpty())
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");

        teacher.get("/api/v1/classes/" + world.class1()).andExpect(jsonPath("$.componentId").value(id));
        teacher.get("/api/v1/components/" + id).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
    }

    @Test
    void aSecondComponentForTheSameClassIsRefused() throws Exception {
        components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);

        teacher.post("/api/v1/classes/" + world.class1() + "/components",
                        "{\"briefId\":\"%s\"}".formatted(components.briefId(ComponentFixtures.BIOLOGY_2027)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COMPONENT_ALREADY_EXISTS"));
    }

    @Test
    void anotherSubjectsBriefIsNotFoundForThisClass() throws Exception {
        teacher.post("/api/v1/classes/" + world.class1() + "/components",
                        "{\"briefId\":\"%s\"}".formatted(components.briefId(ComponentFixtures.CHEMISTRY_2027)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void aBriefIdIsRequired() throws Exception {
        teacher.post("/api/v1/classes/" + world.class1() + "/components", "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd backend && ./mvnw test -Dtest='BriefsEndpointTest,ComponentCreateTest'`
Expected: FAIL to compile (`ComponentFixtures` compiles; the tests fail with 404 for unmapped routes and `componentId` missing from the class JSON once compiled).

- [ ] **Step 3: Add the error codes**

In `ErrorCode.java`, after `ENROLMENT_ALREADY_REMOVED`:

```java
    COMPLETION_DATE_EXCEEDED(HttpStatus.BAD_REQUEST, "Date after the completion date"),
    COMPONENT_ALREADY_EXISTS(HttpStatus.CONFLICT, "This class already has a component"),
```

`ErrorCodeTest` checks every code's type URN shape; it needs no change.

- [ ] **Step 4: Write the views**

```java
package ie.coursework.components.application;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** What the component API returns. Mirrored field for field by frontend/lib/api/schemas.ts. */
public final class ComponentViews {

    private ComponentViews() {}

    public record BriefSummary(UUID id, String subjectCode, int examYear, String secCode, String title,
            String topicTitle, LocalDate completionDate) {}

    public record TeacherItemView(UUID id, String text, LocalDate dueDate) {}

    public record SetupStage(UUID id, int ordinal, String label, String name, Integer hoursMin, Integer hoursMax,
            String hoursGroup, boolean supervised, String checkpoint, LocalDate dueDate, List<TeacherItemView> items) {}

    public enum WarningCode { OUT_OF_ORDER, AFTER_COMPLETION_DATE }

    public record DateWarning(WarningCode code, List<UUID> stageIds, List<UUID> itemIds) {}

    /** {@code GET /components/{id}} is role-shaped (plan 2D P2-28); {@code view} says which shape this is. */
    public interface ComponentView {
        String view();
    }

    public record TeacherComponent(String view, UUID id, UUID classId, String className, String subjectCode,
            String subjectName, BriefSummary brief, List<SetupStage> stages, List<DateWarning> warnings)
            implements ComponentView {}
}
```

- [ ] **Step 5: Write the service**

```java
package ie.coursework.components.application;

import ie.coursework.classes.adapter.persistence.SubjectRepository;
import ie.coursework.classes.application.ClassService;
import ie.coursework.classes.domain.ClassGroup;
import ie.coursework.components.adapter.persistence.BriefRepository;
import ie.coursework.components.adapter.persistence.ComponentRepository;
import ie.coursework.components.adapter.persistence.TeacherItemRepository;
import ie.coursework.components.adapter.persistence.TemplateRepository;
import ie.coursework.components.application.ComponentViews.BriefSummary;
import ie.coursework.components.application.ComponentViews.ComponentView;
import ie.coursework.components.application.ComponentViews.DateWarning;
import ie.coursework.components.application.ComponentViews.SetupStage;
import ie.coursework.components.application.ComponentViews.TeacherComponent;
import ie.coursework.components.application.ComponentViews.TeacherItemView;
import ie.coursework.components.application.ComponentViews.WarningCode;
import ie.coursework.components.domain.Brief;
import ie.coursework.components.domain.CompletionDates;
import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.components.domain.DatedStage;
import ie.coursework.components.domain.StageOrder;
import ie.coursework.components.domain.TeacherItem;
import ie.coursework.components.domain.TemplateStage;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.Role;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Setting up a class's component (design §8.2). Every method checks scope first and answers 404 otherwise. */
@Service
public class ComponentService {

    /** A component the acting teacher owns, with its class and brief. */
    record Owned(ComponentInstance component, ClassGroup group, Brief brief) {}

    private final ClassService classes;
    private final SubjectRepository subjects;
    private final BriefRepository briefs;
    private final TemplateRepository templates;
    private final ComponentRepository components;
    private final TeacherItemRepository items;
    private final Clock clock;

    public ComponentService(ClassService classes, SubjectRepository subjects, BriefRepository briefs,
            TemplateRepository templates, ComponentRepository components, TeacherItemRepository items, Clock clock) {
        this.classes = classes;
        this.subjects = subjects;
        this.briefs = briefs;
        this.templates = templates;
        this.components = components;
        this.items = items;
        this.clock = clock;
    }

    /** Briefs are published SEC content: any signed-in user may list them. */
    public List<BriefSummary> briefs(Actor actor, String subjectCode, Integer examYear) {
        return briefs.published(subjectCode, examYear).stream().map(ComponentService::summary).toList();
    }

    @Transactional
    public TeacherComponent create(Actor actor, UUID classId, UUID briefId) {
        ClassGroup group = classes.owned(actor, classId);
        Brief brief = briefs.findPublished(briefId)
                .filter(b -> b.subjectId().equals(group.subjectId()))
                .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "No such brief for this class's subject."));
        if (components.idForClass(classId).isPresent()) {
            throw alreadyExists();
        }
        UUID id;
        try {
            id = components.insert(classId, brief.id(), actor.userId());
        } catch (DuplicateKeyException e) {
            throw alreadyExists();
        }
        return teacherView(owned(actor, id));
    }

    /** Role-shaped (plan 2D P2-28). 2E adds the approved student's view. */
    public ComponentView view(Actor actor, UUID componentId) {
        return teacherView(owned(actor, componentId));
    }

    Owned owned(Actor actor, UUID componentId) {
        if (!actor.holds(Role.TEACHER)) {
            throw notFound();
        }
        ComponentInstance component = components.findOwned(componentId, actor.userId()).orElseThrow(ComponentService::notFound);
        ClassGroup group = classes.owned(actor, component.classId());
        Brief brief = briefs.findPublished(component.briefId()).orElseThrow(() -> new IllegalStateException("brief missing"));
        return new Owned(component, group, brief);
    }

    TeacherComponent teacherView(Owned owned) {
        Brief brief = owned.brief();
        List<TemplateStage> stages = templates.stages(brief.versionId());
        Map<UUID, String> checkpoints = templates.checkpointTextByStage(brief.versionId());
        Map<UUID, LocalDate> dates = components.stageDates(owned.component().id());
        Map<UUID, List<TeacherItemView>> itemsByStage = items.active(owned.component().id()).stream()
                .collect(Collectors.groupingBy(TeacherItem::stageId,
                        Collectors.mapping(i -> new TeacherItemView(i.id(), i.text(), i.dueDate()), Collectors.toList())));

        List<SetupStage> setup = stages.stream().map(s -> new SetupStage(s.id(), s.ordinal(), s.label(), s.name(),
                s.hoursMin(), s.hoursMax(), s.hoursGroup(), s.supervised(), checkpoints.get(s.id()), dates.get(s.id()),
                itemsByStage.getOrDefault(s.id(), List.of()))).toList();

        return new TeacherComponent("TEACHER", owned.component().id(), owned.group().id(), owned.group().name(),
                brief.subjectCode(), subjects.findById(owned.group().subjectId()).orElseThrow().name(),
                summary(brief), setup, warnings(setup, brief.completionDate()));
    }

    private static List<DateWarning> warnings(List<SetupStage> stages, LocalDate completion) {
        Stream<DateWarning> outOfOrder = StageOrder.outOfOrder(
                        stages.stream().map(s -> new DatedStage(s.id(), s.ordinal(), s.dueDate())).toList())
                .stream().map(pair -> new DateWarning(WarningCode.OUT_OF_ORDER, pair, List.of()));

        List<UUID> lateStages = stages.stream()
                .filter(s -> s.dueDate() != null && !CompletionDates.allows(s.dueDate(), completion))
                .map(SetupStage::id).toList();
        List<UUID> lateItems = stages.stream().flatMap(s -> s.items().stream())
                .filter(i -> i.dueDate() != null && !CompletionDates.allows(i.dueDate(), completion))
                .map(TeacherItemView::id).toList();
        Stream<DateWarning> late = lateStages.isEmpty() && lateItems.isEmpty()
                ? Stream.empty()
                : Stream.of(new DateWarning(WarningCode.AFTER_COMPLETION_DATE, lateStages, lateItems));

        return Stream.concat(late, outOfOrder).toList();
    }

    static BriefSummary summary(Brief b) {
        return new BriefSummary(b.id(), b.subjectCode(), b.examYear(), b.secCode(), b.title(), b.topicTitle(), b.completionDate());
    }

    private static DomainException alreadyExists() {
        return new DomainException(ErrorCode.COMPONENT_ALREADY_EXISTS, "This class already has a component.");
    }

    static DomainException notFound() {
        return new DomainException(ErrorCode.NOT_FOUND, "No such component.");
    }
}
```

`clock` and `items` writes are used from Task 5 on; keep the fields now so the constructor doesn't change twice.

- [ ] **Step 6: Write the controller**

```java
package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateComponentRequest(@NotNull UUID briefId) {}
```

```java
package ie.coursework.components.adapter.web;

import ie.coursework.components.application.ComponentService;
import ie.coursework.components.application.ComponentViews.BriefSummary;
import ie.coursework.components.application.ComponentViews.TeacherComponent;
import ie.coursework.identity.domain.Actor;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ComponentController {

    private final ComponentService components;

    public ComponentController(ComponentService components) {
        this.components = components;
    }

    @GetMapping("/briefs")
    List<BriefSummary> briefs(Actor actor, @RequestParam String subjectCode, @RequestParam(required = false) Integer examYear) {
        return components.briefs(actor, subjectCode, examYear);
    }

    @PostMapping("/classes/{classId}/components")
    @ResponseStatus(HttpStatus.CREATED)
    TeacherComponent create(Actor actor, @PathVariable UUID classId, @Valid @RequestBody CreateComponentRequest body) {
        return components.create(actor, classId, body.briefId());
    }

    /**
     * Role-shaped. Declared {@code Object} on purpose: with the interface as the declared type, Jackson would
     * write only the interface's properties instead of the runtime record's.
     */
    @GetMapping("/components/{componentId}")
    Object view(Actor actor, @PathVariable UUID componentId) {
        return components.view(actor, componentId);
    }
}
```

- [ ] **Step 6a: Query parameters and malformed ids answer as problems, not 500s**

`GET /briefs` is the first endpoint with a required query parameter, and every `{…Id}` path variable is a `UUID`. Today a missing parameter or `/components/not-a-uuid` falls through to the advice's catch-all and returns `INTERNAL_ERROR`. Add to `BriefsEndpointTest`:

```java
    @Test
    void aMissingSubjectIsAValidationError() throws Exception {
        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .get("/api/v1/briefs")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("subjectCode"));
    }

    @Test
    void aMalformedYearIsAValidationErrorAndAMalformedIdIsNotFound() throws Exception {
        ApiSession teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
        teacher.get("/api/v1/briefs?subjectCode=BIOLOGY&examYear=soon").andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        // An id that can't exist is indistinguishable from one outside your scope (design §9).
        teacher.get("/api/v1/components/not-a-uuid").andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        teacher.get("/api/v1/classes/not-a-uuid").andExpect(status().isNotFound());
    }
```

Run them and watch both fail with 500. Then add to `ProblemDetailsAdvice` (imports `org.springframework.web.bind.MissingServletRequestParameterException`, `org.springframework.web.bind.annotation.PathVariable`, `org.springframework.web.method.annotation.MethodArgumentTypeMismatchException`), above the catch-all:

```java
    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<ProblemDetail> missingParameter(MissingServletRequestParameterException exception, HttpServletRequest request) {
        return respond(ErrorCode.VALIDATION_FAILED, "One or more fields are invalid.", request,
                List.of(new FieldError(exception.getParameterName(), "is required")));
    }

    /** A malformed path id is "not found" (design §9); a malformed query parameter is a validation error. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ProblemDetail> typeMismatch(MethodArgumentTypeMismatchException exception, HttpServletRequest request) {
        if (exception.getParameter().hasParameterAnnotation(PathVariable.class)) {
            return respond(ErrorCode.NOT_FOUND, "No such resource.", request, List.of());
        }
        return respond(ErrorCode.VALIDATION_FAILED, "One or more fields are invalid.", request,
                List.of(new FieldError(exception.getName(), "is not in the right format")));
    }
```

Run `BriefsEndpointTest` and `ProblemDetailsAdviceTest`: PASS.

- [ ] **Step 7: Add `componentId` to the class detail**

In `ClassViews.java`, the `ClassDetail` record gains a last component:

```java
    public record ClassDetail(UUID id, String name, String subjectCode, String subjectName, int yearGroup,
            String academicYear, Level level, JoinCodeView joinCode, List<MemberView> enrolments, UUID componentId) {}
```

In `ClassService.java`: add `ComponentRepository components` as the last constructor parameter and field (import `ie.coursework.components.adapter.persistence.ComponentRepository`), and end `detail` with:

```java
        return new ClassDetail(group.id(), group.name(), subject.code(), subject.name(), group.yearGroup(),
                group.academicYear(), group.level(), code, members, components.idForClass(classId).orElse(null));
```

There's no bean cycle: `ComponentService` depends on `ClassService`, and `ClassService` depends only on `ComponentRepository`.

- [ ] **Step 8: Run the tests to see them pass**

Run: `cd backend && ./mvnw test -Dtest='BriefsEndpointTest,ComponentCreateTest,ClassDetailTest'`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/ie/coursework backend/src/test/java/ie/coursework/support/ComponentFixtures.java \
        backend/src/test/java/ie/coursework/components/adapter/web
git commit -m "List published briefs, create a class's component from one, and show the teacher every stage"
```

The advice change is its own behaviour, so it can go in a separate commit first if you prefer: `git commit -m "Answer a missing query parameter as a validation error and a malformed id as not found"`.

---

## Task 5: Stage dates

**Files:**
- Create: `backend/src/main/java/ie/coursework/components/application/StageDateInput.java`
- Create: `backend/src/main/java/ie/coursework/components/adapter/web/StageDatesRequest.java`
- Modify: `ComponentService.java`, `ComponentController.java`
- Test: `backend/src/test/java/ie/coursework/components/adapter/web/StageDatesTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.components.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class StageDatesTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ApiSession teacher;
    private UUID component;
    private String path;

    @BeforeEach
    void component() throws Exception {
        ClassFixtures.World world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        path = "/api/v1/components/" + component + "/stage-dates";
        teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    @Test
    void setsTheDatesSentAndClearsTheRest() throws Exception {
        components.stageDate(component, stage(1), LocalDate.of(2026, 5, 29));

        teacher.put(path, dates(stage(3), "2026-09-25", stage(4), "2026-10-16"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages[0].dueDate").value(nullValue()))
                .andExpect(jsonPath("$.stages[2].dueDate").value("2026-09-25"))
                .andExpect(jsonPath("$.stages[3].dueDate").value("2026-10-16"))
                .andExpect(jsonPath("$.warnings").isEmpty());
    }

    @Test
    void aNullDateMeansNoDate() throws Exception {
        teacher.put(path, "{\"dates\":[{\"stageId\":\"%s\",\"dueDate\":null}]}".formatted(stage(2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages[1].dueDate").value(nullValue()));
    }

    @Test
    void theCompletionDateItselfIsAllowed() throws Exception {
        teacher.put(path, dates(stage(6), "2027-02-26")).andExpect(status().isOk());
    }

    @Test
    void aDateAfterTheCompletionDateIsRefusedByNameAndNothingIsSaved() throws Exception {
        teacher.put(path, dates(stage(3), "2026-09-25", stage(6), "2027-03-05"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("COMPLETION_DATE_EXCEEDED"))
                .andExpect(jsonPath("$.detail").value(
                        "Stage 6 is after the completion date, 26 Feb 2027. Choose a date on or before it."))
                .andExpect(jsonPath("$.fieldErrors[0].field").value(stage(6).toString()));

        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM instance_stage_date", Integer.class)).isZero();
    }

    @Test
    void severalLateDatesAreCounted() throws Exception {
        teacher.put(path, dates(stage(5), "2027-03-01", stage(6), "2027-03-05"))
                .andExpect(jsonPath("$.detail").value(
                        "2 dates are after the completion date, 26 Feb 2027. Choose dates on or before them."))
                .andExpect(jsonPath("$.fieldErrors.length()").value(2));
    }

    @Test
    void outOfOrderDatesAreSavedWithAWarningNamingBothStages() throws Exception {
        teacher.put(path, dates(stage(4), "2026-10-16", stage(5), "2026-10-09"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages[4].dueDate").value("2026-10-09"))
                .andExpect(jsonPath("$.warnings[0].code").value("OUT_OF_ORDER"))
                .andExpect(jsonPath("$.warnings[0].stageIds", contains(stage(4).toString(), stage(5).toString())));
    }

    @Test
    void aStageFromAnotherTemplateIsAValidationError() throws Exception {
        UUID chemistryStage = components.stageId(ComponentFixtures.CHEMISTRY_2027, 1);

        teacher.put(path, dates(chemistryStage, "2026-10-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void whenTheSecMovesTheCompletionDateEarlierLaterDatesAreFlaggedAndMustBeFixed() throws Exception {
        components.stageDate(component, stage(6), LocalDate.of(2027, 2, 20));
        // Content table: restore it whatever happens, or every later test sees the moved date.
        jdbcTemplate.update("UPDATE annual_brief SET completion_date = DATE '2027-02-12' WHERE sec_code = ?", BIO);
        try {
            teacher.get("/api/v1/components/" + component)
                    .andExpect(jsonPath("$.warnings[0].code").value("AFTER_COMPLETION_DATE"))
                    .andExpect(jsonPath("$.warnings[0].stageIds[0]").value(stage(6).toString()));

            teacher.put(path, dates(stage(3), "2026-09-25", stage(6), "2027-02-20"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail").value(
                            "Stage 6 is after the completion date, 12 Feb 2027. Choose a date on or before it."));
        } finally {
            jdbcTemplate.update("UPDATE annual_brief SET completion_date = DATE '2027-02-26' WHERE sec_code = ?", BIO);
        }
    }

    private UUID stage(int ordinal) {
        return components.stageId(BIO, ordinal);
    }

    private static String dates(Object... stageThenDate) {
        StringBuilder json = new StringBuilder("{\"dates\":[");
        for (int i = 0; i < stageThenDate.length; i += 2) {
            json.append(i == 0 ? "" : ",").append("{\"stageId\":\"%s\",\"dueDate\":\"%s\"}".formatted(stageThenDate[i], stageThenDate[i + 1]));
        }
        return json.append("]}").toString();
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw test -Dtest=StageDatesTest`
Expected: FAIL: 405 or 404 for `PUT …/stage-dates`.

- [ ] **Step 3: Implement**

```java
package ie.coursework.components.application;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

/** One stage's date in a batch save. A null date means the stage has no date. */
public record StageDateInput(@NotNull UUID stageId, LocalDate dueDate) {}
```

```java
package ie.coursework.components.adapter.web;

import ie.coursework.components.application.StageDateInput;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record StageDatesRequest(@NotNull List<@Valid StageDateInput> dates) {}
```

In `ComponentService`, add (imports: `ie.coursework.shared.error.FieldError`, `java.util.ArrayList`, `java.util.LinkedHashMap`, `java.util.function.Function`):

```java
    /** Replaces the class's stage dates (plan 2D P2-24, P2-25). */
    @Transactional
    public TeacherComponent setStageDates(Actor actor, UUID componentId, List<StageDateInput> input) {
        Owned owned = owned(actor, componentId);
        LocalDate completion = owned.brief().completionDate();
        Map<UUID, TemplateStage> stages = templates.stages(owned.brief().versionId()).stream()
                .collect(Collectors.toMap(TemplateStage::id, Function.identity()));

        Map<UUID, LocalDate> dates = new LinkedHashMap<>();
        List<FieldError> late = new ArrayList<>();
        for (StageDateInput in : input) {
            TemplateStage stage = stages.get(in.stageId());
            if (stage == null) {
                throw new DomainException(ErrorCode.VALIDATION_FAILED, "That stage isn't part of this component.",
                        List.of(new FieldError(String.valueOf(in.stageId()), "not a stage of this component")));
            }
            if (in.dueDate() == null) {
                continue;
            }
            if (!CompletionDates.allows(in.dueDate(), completion)) {
                late.add(new FieldError(stage.id().toString(), CompletionDates.refusal(stage.displayLabel(), completion)));
            }
            dates.put(stage.id(), in.dueDate());
        }
        if (!late.isEmpty()) {
            String detail = late.size() == 1 ? late.getFirst().message() : CompletionDates.refusals(late.size(), completion);
            throw new DomainException(ErrorCode.COMPLETION_DATE_EXCEEDED, detail, late);
        }
        components.replaceStageDates(componentId, dates, clock.instant());
        return teacherView(owned);
    }
```

In `ComponentController`, add (import `org.springframework.web.bind.annotation.PutMapping`):

```java
    @PutMapping("/components/{componentId}/stage-dates")
    TeacherComponent setStageDates(Actor actor, @PathVariable UUID componentId, @Valid @RequestBody StageDatesRequest body) {
        return components.setStageDates(actor, componentId, body.dates());
    }
```

- [ ] **Step 4: Run it to see it pass**

Run: `cd backend && ./mvnw test -Dtest=StageDatesTest`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/ie/coursework/components backend/src/test/java/ie/coursework/components/adapter/web/StageDatesTest.java
git commit -m "Save a class's stage dates as a batch, refusing any after the completion date by name"
```

---

## Task 6: Teacher items

**Files:**
- Create: `backend/src/main/java/ie/coursework/components/adapter/web/TeacherItemRequest.java`, `TeacherItemEdit.java`
- Modify: `ComponentService.java`, `ComponentController.java`
- Test: `backend/src/test/java/ie/coursework/components/adapter/web/TeacherItemsTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.components.adapter.web;

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

@AutoConfigureMockMvc
class TeacherItemsTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private ApiSession teacher;
    private UUID component;
    private String items;

    @BeforeEach
    void component() throws Exception {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        items = "/api/v1/components/" + component + "/teacher-items";
        teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    @Test
    void addsAnItemToAStageWithOrWithoutADate() throws Exception {
        teacher.post(items, item(6, "Full draft in for feedback", "\"2026-12-04\""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.text").value("Full draft in for feedback"))
                .andExpect(jsonPath("$.dueDate").value("2026-12-04"));
        teacher.post(items, item(4, "Book a re-run slot if your data needs it", "null")).andExpect(status().isCreated());

        teacher.get("/api/v1/components/" + component)
                .andExpect(jsonPath("$.stages[5].items[0].text").value("Full draft in for feedback"))
                .andExpect(jsonPath("$.stages[3].items[0].dueDate").isEmpty());
    }

    @Test
    void anItemDatedAfterTheCompletionDateIsRefused() throws Exception {
        teacher.post(items, item(6, "Too late", "\"2027-03-01\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("COMPLETION_DATE_EXCEEDED"))
                .andExpect(jsonPath("$.detail").value(
                        "That date is after the completion date, 26 Feb 2027. Choose a date on or before it."))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("dueDate"));
    }

    @Test
    void blankOrOverlongTextIsAValidationError() throws Exception {
        teacher.post(items, item(6, " ", "null")).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        teacher.post(items, item(6, "x".repeat(201), "null")).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void editsTextAndDate() throws Exception {
        String id = added(6, "Draft in");

        teacher.patch(items + "/" + id, "{\"text\":\"Full draft in for feedback\",\"dueDate\":\"2026-12-04\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("Full draft in for feedback"))
                .andExpect(jsonPath("$.dueDate").value("2026-12-04"));
    }

    @Test
    void retiringHidesTheItemAndASecondRetireIsNotFound() throws Exception {
        String id = added(6, "Catch-up window closes");

        teacher.delete(items + "/" + id).andExpect(status().isNoContent());
        teacher.get("/api/v1/components/" + component).andExpect(jsonPath("$.stages[5].items").isEmpty());
        teacher.delete(items + "/" + id).andExpect(status().isNotFound());
        teacher.patch(items + "/" + id, "{\"text\":\"Back\",\"dueDate\":null}").andExpect(status().isNotFound());
    }

    @Test
    void anItemFromAnotherComponentIsNotFoundUnderThisOne() throws Exception {
        UUID other = components.component(world.class2(), world.teacher2(), ComponentFixtures.BIOLOGY_2027);
        UUID theirs = components.item(other, components.stageId(ComponentFixtures.BIOLOGY_2027, 6), "Theirs", null);

        teacher.patch(items + "/" + theirs, "{\"text\":\"Mine now\",\"dueDate\":null}").andExpect(status().isNotFound());
        teacher.delete(items + "/" + theirs).andExpect(status().isNotFound());
    }

    private String added(int stage, String text) throws Exception {
        String body = teacher.post(items, item(stage, text, "null")).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private String item(int stage, String text, String dueDateJson) {
        return "{\"stageId\":\"%s\",\"text\":\"%s\",\"dueDate\":%s}".formatted(
                components.stageId(ComponentFixtures.BIOLOGY_2027, stage), text, dueDateJson);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw test -Dtest=TeacherItemsTest`
Expected: FAIL (404 for unmapped routes).

- [ ] **Step 3: Implement**

```java
package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record TeacherItemRequest(@NotNull UUID stageId, @NotBlank @Size(max = 200) String text, LocalDate dueDate) {}
```

```java
package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** A full edit: both fields are sent; a null date clears it. */
public record TeacherItemEdit(@NotBlank @Size(max = 200) String text, LocalDate dueDate) {}
```

In `ComponentService`:

```java
    @Transactional
    public TeacherItemView addItem(Actor actor, UUID componentId, UUID stageId, String text, LocalDate dueDate) {
        Owned owned = owned(actor, componentId);
        boolean inVersion = templates.stages(owned.brief().versionId()).stream().anyMatch(s -> s.id().equals(stageId));
        if (!inVersion) {
            throw new DomainException(ErrorCode.VALIDATION_FAILED, "That stage isn't part of this component.",
                    List.of(new FieldError("stageId", "not a stage of this component")));
        }
        checkItemDate(dueDate, owned.brief().completionDate());
        TeacherItem item = items.add(componentId, stageId, text, dueDate, clock.instant());
        return new TeacherItemView(item.id(), item.text(), item.dueDate());
    }

    @Transactional
    public TeacherItemView editItem(Actor actor, UUID componentId, UUID itemId, String text, LocalDate dueDate) {
        Owned owned = owned(actor, componentId);
        items.findActive(itemId, componentId).orElseThrow(ComponentService::itemNotFound);
        checkItemDate(dueDate, owned.brief().completionDate());
        items.update(itemId, text, dueDate, clock.instant());
        return new TeacherItemView(itemId, text.strip(), dueDate);
    }

    /** Retired items disappear for students; the row stays (design §6.4). */
    @Transactional
    public void retireItem(Actor actor, UUID componentId, UUID itemId) {
        owned(actor, componentId);
        items.findActive(itemId, componentId).orElseThrow(ComponentService::itemNotFound);
        items.retire(itemId, clock.instant());
    }

    private static void checkItemDate(LocalDate dueDate, LocalDate completion) {
        if (dueDate != null && !CompletionDates.allows(dueDate, completion)) {
            String message = CompletionDates.refusal("That date", completion);
            throw new DomainException(ErrorCode.COMPLETION_DATE_EXCEEDED, message, List.of(new FieldError("dueDate", message)));
        }
    }

    private static DomainException itemNotFound() {
        return new DomainException(ErrorCode.NOT_FOUND, "No such item.");
    }
```

In `ComponentController` (imports `DeleteMapping`, `PatchMapping`, `ResponseEntity`, `TeacherItemView`):

```java
    @PostMapping("/components/{componentId}/teacher-items")
    @ResponseStatus(HttpStatus.CREATED)
    TeacherItemView addItem(Actor actor, @PathVariable UUID componentId, @Valid @RequestBody TeacherItemRequest body) {
        return components.addItem(actor, componentId, body.stageId(), body.text(), body.dueDate());
    }

    @PatchMapping("/components/{componentId}/teacher-items/{itemId}")
    TeacherItemView editItem(Actor actor, @PathVariable UUID componentId, @PathVariable UUID itemId,
            @Valid @RequestBody TeacherItemEdit body) {
        return components.editItem(actor, componentId, itemId, body.text(), body.dueDate());
    }

    @DeleteMapping("/components/{componentId}/teacher-items/{itemId}")
    ResponseEntity<Void> retireItem(Actor actor, @PathVariable UUID componentId, @PathVariable UUID itemId) {
        components.retireItem(actor, componentId, itemId);
        return ResponseEntity.noContent().build();
    }
```

- [ ] **Step 4: Run it to see it pass**

Run: `cd backend && ./mvnw test -Dtest=TeacherItemsTest`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/ie/coursework/components backend/src/test/java/ie/coursework/components/adapter/web/TeacherItemsTest.java
git commit -m "Add, edit and retire a teacher's own items within a stage"
```

---

## Task 7: Scope — everyone else gets 404

**Files:**
- Create: `backend/src/test/java/ie/coursework/components/authz/ComponentScopeTest.java`

The endpoints exist, so these tests pass on their first run **only if scope is already right**. Prove each one bites: temporarily replace the body of `ComponentRepository.findOwned` with a query that ignores `owner_user_id`, run the suite, see `anotherTeacher…` fail, and revert.

- [ ] **Step 1: Write the tests**

```java
package ie.coursework.components.authz;

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
import org.springframework.test.web.servlet.ResultMatcher;

/** Teacher 1 owns class 1 and its Biology component. Design §9: anything out of scope is 404, never 403. */
@AutoConfigureMockMvc
class ComponentScopeTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private String component;
    private String item;

    @BeforeEach
    void seed() {
        world = fixtures.world();
        UUID id = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        component = "/api/v1/components/" + id;
        item = component + "/teacher-items/" + components.item(id, stage(6), "Full draft in", null);
    }

    @Test
    void theOwnerReachesEverything() throws Exception {
        ApiSession owner = as(ClassFixtures.TEACHER1);
        owner.get(component).andExpect(status().isOk());
        owner.put(component + "/stage-dates", "{\"dates\":[]}").andExpect(status().isOk());
    }

    @Test
    void anotherTeacherAtTheSameSchoolGetsNotFound() throws Exception {
        everyEndpoint(as(ClassFixtures.TEACHER2), status().isNotFound());
        as(ClassFixtures.TEACHER2).post("/api/v1/classes/" + world.class1() + "/components",
                "{\"briefId\":\"%s\"}".formatted(components.briefId(ComponentFixtures.BIOLOGY_2027)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aTeacherAtAnotherSchoolGetsNotFound() throws Exception {
        everyEndpoint(as(ClassFixtures.TEACHER_B), status().isNotFound());
    }

    @Test
    void aSchoolLeaderGetsNotFound() throws Exception {
        everyEndpoint(as(ClassFixtures.LEADER_A), status().isNotFound());
    }

    @Test
    void studentsGetNotFound() throws Exception {
        // 2E: the approved student's GET becomes their own view; change that one line then.
        everyEndpoint(as(ClassFixtures.APPROVED_STUDENT), status().isNotFound());
        everyEndpoint(as(ClassFixtures.PENDING_STUDENT), status().isNotFound());
        everyEndpoint(as(ClassFixtures.OUTSIDER), status().isNotFound());
    }

    @Test
    void anonymousIsUnauthenticated() throws Exception {
        new ApiSession(mockMvc).get(component).andExpect(status().isUnauthorized());
    }

    @Test
    void anotherTeachersItemCannotBeReachedThroughTheirOwnComponent() throws Exception {
        UUID theirs = components.component(world.class2(), world.teacher2(), ComponentFixtures.BIOLOGY_2027);
        String myItemUnderTheirComponent = "/api/v1/components/" + theirs + "/teacher-items/" + item.substring(item.lastIndexOf('/') + 1);

        as(ClassFixtures.TEACHER2).delete(myItemUnderTheirComponent).andExpect(status().isNotFound());
    }

    private void everyEndpoint(ApiSession session, ResultMatcher expected) throws Exception {
        session.get(component).andExpect(expected);
        session.put(component + "/stage-dates", "{\"dates\":[]}").andExpect(expected);
        session.post(component + "/teacher-items", "{\"stageId\":\"%s\",\"text\":\"x\",\"dueDate\":null}".formatted(stage(6)))
                .andExpect(expected);
        session.patch(item, "{\"text\":\"x\",\"dueDate\":null}").andExpect(expected);
        session.delete(item).andExpect(expected);
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }

    private UUID stage(int ordinal) {
        return components.stageId(ComponentFixtures.BIOLOGY_2027, ordinal);
    }
}
```

- [ ] **Step 2: Run it, and prove it bites**

Run: `cd backend && ./mvnw test -Dtest=ComponentScopeTest`
Expected: PASS. Then do the temporary break described above, see `anotherTeacherAtTheSameSchoolGetsNotFound` fail, and revert.

- [ ] **Step 3: `make backend-test`**

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/test/java/ie/coursework/components/authz/ComponentScopeTest.java
git commit -m "Prove every component endpoint is 404 outside the owning teacher"
```

---

## Task 8: Frontend data, helpers and the shared class header

**Files:**
- Modify: `frontend/lib/api/schemas.ts`
- Create: `frontend/lib/app/component-setup.ts`, `frontend/lib/app/component-setup.test.ts`
- Create: `frontend/components/app/class-header.tsx`, `frontend/components/app/class-header.spec.tsx`
- Modify: `frontend/components/app/class-students.tsx`, `frontend/components/app/class-students.spec.tsx`

- [ ] **Step 1: Write the failing tests**

`frontend/lib/app/component-setup.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { datesChanged, formatCalendarDate, hoursLabel } from './component-setup.ts';

describe('formatCalendarDate', () => {
  test('formats an ISO calendar date without moving it a day', () => {
    assert.equal(formatCalendarDate('2026-10-16'), '16 Oct 2026');
    assert.equal(formatCalendarDate('2027-02-26'), '26 Feb 2027');
  });
});

describe('hoursLabel', () => {
  const stage = (hoursMin: number | null, hoursMax: number | null, hoursGroup: string | null = null, label = 'Stage 1') =>
    ({ label, hoursMin, hoursMax, hoursGroup });

  test('a range, an upper bound, or nothing', () => {
    assert.equal(hoursLabel(stage(2, 3), []), '2–3 hours');
    assert.equal(hoursLabel(stage(null, 4), []), 'Up to 4 hours');
    assert.equal(hoursLabel(stage(null, null), []), '');
  });

  test('a shared estimate names the stages that share it', () => {
    const four = stage(6, 8, 'stages-4-5', 'Stage 4');
    const five = stage(6, 8, 'stages-4-5', 'Stage 5');
    assert.equal(hoursLabel(four, [four, five]), '6–8 hours for Stage 4 and Stage 5 together');
  });
});

describe('datesChanged', () => {
  test('compares the draft with what was saved, treating empty as no date', () => {
    const saved = [{ id: 'a', dueDate: '2026-10-16' }, { id: 'b', dueDate: null }];
    assert.equal(datesChanged(saved, { a: '2026-10-16', b: '' }), false);
    assert.equal(datesChanged(saved, { a: '2026-10-17', b: '' }), true);
    assert.equal(datesChanged(saved, { a: '2026-10-16', b: '2026-11-01' }), true);
  });
});
```

`frontend/components/app/class-header.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassHeader } from "./class-header";

const detail = { id: "c1", name: "6A Biology", subjectName: "Biology", yearGroup: 6, academicYear: "2026/27" };

describe("ClassHeader", () => {
  it("names the class and marks the current tab", () => {
    render(<ClassHeader detail={detail} current="component" />);
    expect(screen.getByRole("heading", { level: 1, name: "6A Biology" })).toBeInTheDocument();
    const tabs = screen.getByRole("navigation", { name: "Class sections" });
    expect(screen.getByRole("link", { name: "Component" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Students" })).toHaveAttribute("href", "/teach/classes/c1");
    expect(tabs).toHaveTextContent("Progress");
    expect(screen.queryByRole("link", { name: "Progress" })).not.toBeInTheDocument();
  });

  it("links back to my classes", () => {
    render(<ClassHeader detail={detail} current="students" />);
    expect(screen.getByRole("link", { name: "My classes" })).toHaveAttribute("href", "/teach");
    expect(screen.getByRole("link", { name: "Component" })).toHaveAttribute("href", "/teach/classes/c1/component");
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && node --test lib/app/component-setup.test.ts && npx vitest run components/app/class-header.spec.tsx`
Expected: FAIL (modules missing).

- [ ] **Step 3: Schemas**

Append to `frontend/lib/api/schemas.ts`, and add `componentId: z.string().nullable(),` as the last field of `classDetailSchema`:

```ts
// Mirrors components/application/ComponentViews.java.
export const briefSummarySchema = z.object({
  id: z.string(),
  subjectCode: z.string(),
  examYear: z.number(),
  secCode: z.string(),
  title: z.string(),
  topicTitle: z.string().nullable(),
  completionDate: z.string(),
});
export type BriefSummary = z.infer<typeof briefSummarySchema>;

export const teacherItemSchema = z.object({ id: z.string(), text: z.string(), dueDate: z.string().nullable() });
export type TeacherItem = z.infer<typeof teacherItemSchema>;

export const setupStageSchema = z.object({
  id: z.string(),
  ordinal: z.number(),
  label: z.string().nullable(),
  name: z.string(),
  hoursMin: z.number().nullable(),
  hoursMax: z.number().nullable(),
  hoursGroup: z.string().nullable(),
  supervised: z.boolean(),
  checkpoint: z.string().nullable(),
  dueDate: z.string().nullable(),
  items: z.array(teacherItemSchema),
});
export type SetupStage = z.infer<typeof setupStageSchema>;

export const dateWarningSchema = z.object({
  code: z.enum(["OUT_OF_ORDER", "AFTER_COMPLETION_DATE"]),
  stageIds: z.array(z.string()),
  itemIds: z.array(z.string()),
});
export type DateWarning = z.infer<typeof dateWarningSchema>;

export const teacherComponentSchema = z.object({
  view: z.literal("TEACHER"),
  id: z.string(),
  classId: z.string(),
  className: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  brief: briefSummarySchema,
  stages: z.array(setupStageSchema),
  warnings: z.array(dateWarningSchema),
});
export type TeacherComponent = z.infer<typeof teacherComponentSchema>;
```

In `class-students.spec.tsx`, add `componentId: null,` to the `detail` fixture so it type-checks.

- [ ] **Step 4: Helpers**

`frontend/lib/app/component-setup.ts`:

```ts
const CALENDAR_DATE = new Intl.DateTimeFormat('en-IE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/**
 * "2026-10-16" → "16 Oct 2026". A calendar date has no time or zone, so it's read and formatted in UTC; any
 * other zone could move it a day (the same hazard lib/schedule.ts documents).
 */
export function formatCalendarDate(iso: string): string {
  return CALENDAR_DATE.format(Date.parse(`${iso}T00:00:00Z`));
}

type Hours = { label: string | null; hoursMin: number | null; hoursMax: number | null; hoursGroup: string | null };

/** Display only (design §6.2). A shared estimate (Business Stages 4 and 5) names the stages sharing it. */
export function hoursLabel(stage: Hours, all: ReadonlyArray<Hours>): string {
  if (stage.hoursMax === null) return '';
  const range = stage.hoursMin === null ? `Up to ${stage.hoursMax} hours` : `${stage.hoursMin}–${stage.hoursMax} hours`;
  if (!stage.hoursGroup) return range;
  const sharing = all.filter((s) => s.hoursGroup === stage.hoursGroup).map((s) => s.label ?? '');
  return `${range} for ${sharing.join(' and ')} together`;
}

/** Whether the draft (stage id → "YYYY-MM-DD" or "") differs from the saved dates. */
export function datesChanged(saved: ReadonlyArray<{ id: string; dueDate: string | null }>, draft: Record<string, string>): boolean {
  return saved.some((s) => (s.dueDate ?? '') !== (draft[s.id] ?? ''));
}
```

- [ ] **Step 5: `ClassHeader`, and `ClassStudents` using it**

`frontend/components/app/class-header.tsx`:

```tsx
import Link from "next/link";

import { backLink, pageTitle } from "./styles";

export type ClassTab = "students" | "component";

const TAB = "-mb-px border-b-2 px-0.5 py-2.5 text-app-base font-semibold";

/**
 * The top of every class page (pack D-2): back link, class name, and the section tabs. Progress is shown
 * but unusable until Phase 4.
 */
export function ClassHeader({
  detail,
  current,
}: {
  detail: { id: string; name: string; subjectName: string; yearGroup: number; academicYear: string };
  current: ClassTab;
}) {
  const tabs: ReadonlyArray<{ key: ClassTab; label: string; href: string }> = [
    { key: "students", label: "Students", href: `/teach/classes/${detail.id}` },
    { key: "component", label: "Component", href: `/teach/classes/${detail.id}/component` },
  ];
  return (
    <>
      <Link href="/teach" className={backLink}>
        My classes
      </Link>
      <h1 className={`mt-2.5 break-words ${pageTitle}`}>{detail.name}</h1>
      <p className="mt-1.5 text-app-base text-app-grey">
        {detail.subjectName}, year {detail.yearGroup}, {detail.academicYear}
      </p>
      <nav aria-label="Class sections" className="mt-5 flex gap-6 border-b border-app-line">
        {tabs.map((tab) =>
          tab.key === current ? (
            <Link key={tab.key} href={tab.href} aria-current="page" className={`${TAB} border-app-accent text-app-accent`}>
              {tab.label}
            </Link>
          ) : (
            <Link key={tab.key} href={tab.href} className={`${TAB} border-transparent text-app-grey hover:text-app-ink`}>
              {tab.label}
            </Link>
          ),
        )}
        <span aria-disabled="true" className={`${TAB} cursor-not-allowed border-transparent text-app-disabled`}>
          Progress
        </span>
      </nav>
    </>
  );
}
```

In `frontend/components/app/class-students.tsx`, replace everything from `<Link href="/teach" className={backLink}>` down to the closing `</nav>` (and the comment above the nav) with:

```tsx
      <ClassHeader detail={detail} current="students" />
```

Add `import { ClassHeader } from "./class-header";` and remove `backLink` and `pageTitle` from the `./styles` import if nothing else uses them. `Link` is still used elsewhere in the file only if another link remains; let `npm run lint` tell you.

- [ ] **Step 6: Run the tests to see them pass**

Run: `cd frontend && node --test lib/app/component-setup.test.ts && npx vitest run components/app/class-header.spec.tsx components/app/class-students.spec.tsx && npm run typecheck`
Expected: PASS. The existing `ClassStudents` spec passes unchanged apart from the fixture's `componentId`.

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/api/schemas.ts frontend/lib/app/component-setup.ts frontend/lib/app/component-setup.test.ts \
        frontend/components/app/class-header.tsx frontend/components/app/class-header.spec.tsx \
        frontend/components/app/class-students.tsx frontend/components/app/class-students.spec.tsx
git commit -m "Share the class header and make the Component tab a link"
```

---

## Task 9: The Component tab

**Files:**
- Create: `frontend/components/app/create-component-form.tsx` + `.spec.tsx`
- Create: `frontend/components/app/stage-dates-form.tsx` + `.spec.tsx`
- Create: `frontend/components/app/teacher-items.tsx` + `.spec.tsx`
- Create: `frontend/app/(app)/teach/classes/[id]/component/page.tsx`
- Create: `frontend/e2e/helpers.ts`, `frontend/e2e/phase2.e2e.ts`
- Modify: `frontend/e2e/phase1.e2e.ts` (use the helpers)

- [ ] **Step 1: Write the failing specs**

`frontend/components/app/create-component-form.spec.tsx`:

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

import { CreateComponentForm } from "./create-component-form";

const brief = {
  id: "b1", subjectCode: "BIOLOGY", examYear: 2027, secCode: "2027L025C2EL",
  title: "Biology in Practice Investigation", topicTitle: "Membranes, Osmosis, Food Preservation", completionDate: "2027-02-26",
};

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("CreateComponentForm", () => {
  it("shows the brief's code, topic and completion date before creating", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<CreateComponentForm classId="c1" briefs={[brief]} />);

    expect(screen.getByRole("radio", { name: /Biology in Practice Investigation, 2027/ })).toBeChecked();
    expect(screen.getByText(/2027L025C2EL/)).toBeInTheDocument();
    expect(screen.getByText(/26 Feb 2027/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create component" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/components", { briefId: "b1" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("says so when there's no brief for the subject yet", () => {
    render(<CreateComponentForm classId="c1" briefs={[]} />);
    expect(screen.getByText(/no brief for this subject yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create component" })).not.toBeInTheDocument();
  });

  it("shows a refusal in the error panel", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({ status: 409, code: "COMPONENT_ALREADY_EXISTS", title: "t", detail: "This class already has a component.", fieldErrors: [] }));
    render(<CreateComponentForm classId="c1" briefs={[brief]} />);
    await userEvent.click(screen.getByRole("button", { name: "Create component" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This class already has a component.");
  });
});
```

Check `ApiError`'s constructor in `lib/api/problem.ts` and build the rejected error the way `class-students.spec.tsx` does if it differs.

`frontend/components/app/stage-dates-form.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TeacherComponent } from "@/lib/api/schemas";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api, ApiError } from "@/lib/api/client";

import { StageDatesForm } from "./stage-dates-form";

const stage = (n: number, dueDate: string | null, extra = {}) => ({
  id: `s${n}`, ordinal: n, label: `Stage ${n}`, name: `Name ${n}`, hoursMin: 1, hoursMax: 2, hoursGroup: null,
  supervised: n === 4, checkpoint: n === 3 ? "Plan discussed with the teacher (feasibility and safety)" : null,
  dueDate, items: [], ...extra,
});

const component = (overrides: Partial<TeacherComponent> = {}): TeacherComponent => ({
  view: "TEACHER", id: "k1", classId: "c1", className: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology",
  brief: { id: "b1", subjectCode: "BIOLOGY", examYear: 2027, secCode: "2027L025C2EL", title: "Biology in Practice Investigation", topicTitle: null, completionDate: "2027-02-26" },
  stages: [stage(3, "2026-09-25"), stage(4, null), stage(5, null), stage(6, null)],
  warnings: [],
  ...overrides,
});

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("StageDatesForm", () => {
  it("says these are the class's dates and the SEC's only date is the completion date", () => {
    render(<StageDatesForm component={component()} />);
    expect(screen.getByText(/your class's own dates, not SEC deadlines/i)).toBeInTheDocument();
    expect(screen.getByText(/completion date/i)).toHaveTextContent("26 Feb 2027");
  });

  it("labels each date by stage and shows hours and supervision", () => {
    render(<StageDatesForm component={component()} />);
    expect(screen.getByLabelText("Stage 3 Name 3")).toHaveValue("2026-09-25");
    expect(screen.getByLabelText("Stage 4 Name 4")).toHaveValue("");
    expect(screen.getByText(/supervised/i)).toBeInTheDocument();
    expect(screen.getAllByText("1–2 hours").length).toBeGreaterThan(0);
  });

  it("saves every stage's date in one request, with empty as no date", async () => {
    vi.mocked(api.send).mockResolvedValue(component());
    render(<StageDatesForm component={component()} />);
    await userEvent.type(screen.getByLabelText("Stage 4 Name 4"), "2026-10-16");
    await userEvent.click(screen.getByRole("button", { name: "Save dates" }));

    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/stage-dates", {
      dates: [
        { stageId: "s3", dueDate: "2026-09-25" },
        { stageId: "s4", dueDate: "2026-10-16" },
        { stageId: "s5", dueDate: null },
        { stageId: "s6", dueDate: null },
      ],
    }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("marks a refused date on its own row and in the error panel", async () => {
    const message = "Stage 6 is after the completion date, 26 Feb 2027. Choose a date on or before it.";
    vi.mocked(api.send).mockRejectedValue(new ApiError({ status: 400, code: "COMPLETION_DATE_EXCEEDED", title: "t", detail: message, fieldErrors: [{ field: "s6", message }] }));
    render(<StageDatesForm component={component()} />);
    await userEvent.type(screen.getByLabelText("Stage 6 Name 6"), "2027-03-05");
    await userEvent.click(screen.getByRole("button", { name: "Save dates" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Stage 6 Name 6")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Stage 3 Name 3")).not.toHaveAttribute("aria-invalid");
  });

  it("warns on out-of-order stages without blocking", () => {
    render(<StageDatesForm component={component({ warnings: [{ code: "OUT_OF_ORDER", stageIds: ["s4", "s5"], itemIds: [] }] })} />);
    const warning = screen.getByRole("status");
    expect(warning).toHaveTextContent("Stage 5 is due before Stage 4");
    expect(screen.getByRole("button", { name: "Save dates" })).toBeEnabled();
  });

  it("explains a completion date that moved", () => {
    render(<StageDatesForm component={component({ warnings: [{ code: "AFTER_COMPLETION_DATE", stageIds: ["s6"], itemIds: [] }], stages: [stage(6, "2027-02-20")] })} />);
    expect(screen.getByRole("status")).toHaveTextContent(/now after the completion date, 26 Feb 2027/);
  });

  it("invites the teacher to start when no dates are set", () => {
    render(<StageDatesForm component={component({ stages: [stage(1, null), stage(2, null)] })} />);
    expect(screen.getByText(/students see "dates coming from your teacher"/i)).toBeInTheDocument();
  });
});
```

`frontend/components/app/teacher-items.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { TeacherItems } from "./teacher-items";

const stage = { id: "s6", label: "Stage 6", name: "Finalising the Report", items: [{ id: "i1", text: "Full draft in for feedback", dueDate: "2026-12-04" }] };

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("TeacherItems", () => {
  it("lists items with their dates", () => {
    render(<TeacherItems componentId="k1" stage={stage} />);
    expect(screen.getByRole("listitem")).toHaveTextContent("Full draft in for feedback");
    expect(screen.getByRole("listitem")).toHaveTextContent("4 Dec 2026");
  });

  it("adds an item with an optional date", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i2", text: "Catch-up window closes", dueDate: null });
    render(<TeacherItems componentId="k1" stage={stage} />);
    await userEvent.click(screen.getByRole("button", { name: "Add item to Stage 6" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Item" }), "Catch-up window closes");
    await userEvent.click(screen.getByRole("button", { name: "Add item" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/components/k1/teacher-items",
      { stageId: "s6", text: "Catch-up window closes", dueDate: null }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("edits an item in place", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i1", text: "Draft in", dueDate: "2026-12-04" });
    render(<TeacherItems componentId="k1" stage={stage} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Full draft in for feedback" }));
    const text = screen.getByRole("textbox", { name: "Item" });
    await userEvent.clear(text);
    await userEvent.type(text, "Draft in");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("PATCH", "/components/k1/teacher-items/i1",
      { text: "Draft in", dueDate: "2026-12-04" }, expect.anything());
  });

  it("retires an item only after confirming in its row, and Keep backs out", async () => {
    render(<TeacherItems componentId="k1" stage={stage} />);
    const row = screen.getByRole("listitem");
    await userEvent.click(within(row).getByRole("button", { name: "Retire Full draft in for feedback" }));
    expect(within(row).getByText(/students won't see it/i)).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Keep" }));
    expect(api.sendNoContent).not.toHaveBeenCalled();

    await userEvent.click(within(row).getByRole("button", { name: "Retire Full draft in for feedback" }));
    await userEvent.click(within(row).getByRole("button", { name: "Retire item" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/teacher-items/i1");
    expect(refresh).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && npx vitest run components/app/create-component-form.spec.tsx components/app/stage-dates-form.spec.tsx components/app/teacher-items.spec.tsx`
Expected: FAIL (components missing).

- [ ] **Step 3: Write `CreateComponentForm`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type BriefSummary, teacherComponentSchema } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";

import { ErrorPanel } from "./error-panel";
import { card, lead, sectionTitle } from "./styles";

/** Roadmap §6.2 `/teach/classes/[id]/component`, no component yet: choose the brief (D-5 state 1). */
export function CreateComponentForm({ classId, briefs }: { classId: string; briefs: BriefSummary[] }) {
  const router = useRouter();
  const [briefId, setBriefId] = useState(briefs[0]?.id ?? "");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  if (briefs.length === 0) {
    return <p className={`mt-6 ${lead}`}>{"There's no brief for this subject yet. It appears here when the SEC publishes one."}</p>;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.send("POST", `/classes/${classId}/components`, { briefId }, teacherComponentSchema);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
      <h2 className={sectionTitle}>Choose the brief</h2>
      <p className={lead}>{"Stages are set by the brief. You'll add dates and your own items next."}</p>
      {error && <ErrorPanel error={error} />}
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Brief</legend>
        {briefs.map((b) => (
          <label key={b.id} className={`${card} flex cursor-pointer items-start gap-3 p-4`}>
            <input type="radio" name="brief" value={b.id} checked={briefId === b.id} onChange={() => setBriefId(b.id)} className="mt-1" />
            <span className="flex flex-col gap-1">
              <span className="font-semibold text-app-ink">{b.title}, {b.examYear}</span>
              <span className="text-app-small text-app-grey">SEC code {b.secCode}{b.topicTitle ? ` · ${b.topicTitle}` : ""}</span>
              <span className="text-app-small text-app-grey">Completion date {formatCalendarDate(b.completionDate)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <Button type="submit" disabled={busy || !briefId}>Create component</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Write `StageDatesForm`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type TeacherComponent, teacherComponentSchema } from "@/lib/api/schemas";
import { datesChanged, formatCalendarDate, hoursLabel } from "@/lib/app/component-setup";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { Notice } from "./notice";
import { lead, sectionTitle } from "./styles";
import { TeacherItems } from "./teacher-items";

const stageName = (s: { label: string | null; name: string }) => (s.label ? `${s.label} ${s.name}` : s.name);

/**
 * Roadmap §6.2 `/teach/classes/[id]/component`, component set (D-5 states 2–10). Dates save as one batch
 * (plan 2D P2-24); a date the server refuses is marked on its own row by stage id (P2-27).
 */
export function StageDatesForm({ component }: { component: TeacherComponent }) {
  const router = useRouter();
  const initial = useMemo(
    () => Object.fromEntries(component.stages.map((s) => [s.id, s.dueDate ?? ""])),
    [component.stages],
  );
  const [draft, setDraft] = useState<Record<string, string>>(initial);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = datesChanged(component.stages, draft);
  const completion = formatCalendarDate(component.brief.completionDate);
  const refused = new Map((error?.fieldErrors ?? []).map((f) => [f.field, f.message]));
  const byId = new Map(component.stages.map((s) => [s.id, s]));
  const noDates = component.stages.every((s) => !s.dueDate);

  useEffect(() => setDraft(initial), [initial]);

  // UI-STANDARDS: a long form confirms before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const dates = component.stages.map((s) => ({ stageId: s.id, dueDate: draft[s.id] || null }));
      await api.send("PUT", `/components/${component.id}/stage-dates`, { dates }, teacherComponentSchema);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-7 flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className={sectionTitle}>{component.brief.title}, {component.brief.examYear}</h2>
        <p className={lead}>
          {`These are your class's own dates, not SEC deadlines. The SEC's only date is the completion date, ${completion}.`}
        </p>
        {noDates && <p className={lead}>{'No dates yet. Until you set them, students see "dates coming from your teacher".'}</p>}
      </div>

      {component.warnings.map((w) => (
        <Notice key={`${w.code}-${w.stageIds.join("-")}`} tone="attention" role="status">
          {w.code === "OUT_OF_ORDER"
            ? `${byId.get(w.stageIds[1])?.label} is due before ${byId.get(w.stageIds[0])?.label}. That's allowed, because students move between stages, but check it's what you meant.`
            : `Some dates are now after the completion date, ${completion}, because the SEC changed it. Choose dates on or before it.`}
        </Notice>
      ))}

      {error && <ErrorPanel error={error} />}

      <form onSubmit={save} className="flex flex-col gap-4">
        <FieldGroup>
          {component.stages.map((s) => (
            <Field
              key={s.id}
              id={`date-${s.id}`}
              label={stageName(s)}
              error={refused.get(s.id)}
              help={[hoursLabel(s, component.stages), s.supervised ? "Supervised in class" : "", s.checkpoint ? `Checkpoint: ${s.checkpoint}` : ""]
                .filter(Boolean)
                .join(" · ")}
            >
              {(control) => (
                <input
                  {...control}
                  type="date"
                  max={component.brief.completionDate}
                  value={draft[s.id] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                />
              )}
            </Field>
          ))}
        </FieldGroup>
        <div>
          <Button type="submit" disabled={busy}>Save dates</Button>
        </div>
      </form>

      <section aria-labelledby="items-heading" className="flex flex-col gap-4">
        <h2 id="items-heading" className={sectionTitle}>Your items</h2>
        {component.stages.map((s) => (
          <TeacherItems key={s.id} componentId={component.id} stage={s} />
        ))}
      </section>
    </div>
  );
}
```

Copy with an apostrophe or a double quote is written as a string expression (`{"There's …"}`) because `react/no-unescaped-entities` refuses it as JSX text. `Field` puts the label's text into the `<label>`; the spec finds each input by "Stage 3 Name 3", which is `stageName`. The `max` attribute is a hint only: the server decides (root `CLAUDE.md`).

- [ ] **Step 5: Write `TeacherItems`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { teacherItemSchema } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";

type Stage = { id: string; label: string | null; name: string; items: { id: string; text: string; dueDate: string | null }[] };

/** A stage's teacher items: add, edit, retire (confirmed in the row, as D-2's Remove). */
export function TeacherItems({ componentId, stage }: { componentId: string; stage: Stage }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [retiring, setRetiring] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const stageLabel = stage.label ?? stage.name;
  const base = `/components/${componentId}/teacher-items`;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setEditing(null);
      setRetiring(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  function open(item?: { id: string; text: string; dueDate: string | null }) {
    setEditing(item?.id ?? "new");
    setText(item?.text ?? "");
    setDueDate(item?.dueDate ?? "");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = { text, dueDate: dueDate || null };
    void run(() =>
      editing === "new"
        ? api.send("POST", base, { stageId: stage.id, ...body }, teacherItemSchema)
        : api.send("PATCH", `${base}/${editing}`, body, teacherItemSchema),
    );
  }

  const form = (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <FieldGroup>
        <Field id={`item-text-${stage.id}`} label="Item">
          {(control) => <input {...control} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />}
        </Field>
        <Field id={`item-date-${stage.id}`} label="Date (optional)">
          {(control) => <input {...control} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>{editing === "new" ? "Add item" : "Save item"}</Button>
        <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
      </div>
    </form>
  );

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold text-app-ink">{stageLabel}</h3>
      {error && <ErrorPanel error={error} />}
      {stage.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {stage.items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 border-b border-app-line pb-2">
              {editing === item.id ? form : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-app-ink">{item.text}</span>
                  {item.dueDate && <span className="text-app-small text-app-grey">{formatCalendarDate(item.dueDate)}</span>}
                  <Button type="button" variant="outline" size="sm" onClick={() => open(item)} aria-label={`Edit ${item.text}`}>Edit</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setRetiring(item.id)} aria-label={`Retire ${item.text}`}>Retire</Button>
                </div>
              )}
              {retiring === item.id && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-app-small text-app-copy">{"Retire this item? Students won't see it any more."}</span>
                  <Button type="button" variant="destructive" size="sm" disabled={busy}
                    onClick={() => run(() => api.sendNoContent("DELETE", `${base}/${item.id}`))}>Retire item</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setRetiring(null)}>Keep</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing === "new" ? form : (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => open()} aria-label={`Add item to ${stageLabel}`}>Add item</Button>
        </div>
      )}
    </div>
  );
}
```

Check `components/ui/button.tsx` for the variant and size names (`outline`, `destructive`, `sm`); use the ones `class-students.tsx` uses if they differ.

- [ ] **Step 6: Run the specs to see them pass**

Run: `cd frontend && npx vitest run components/app/create-component-form.spec.tsx components/app/stage-dates-form.spec.tsx components/app/teacher-items.spec.tsx`
Expected: PASS.

If "saves every stage's date" fails because `userEvent.type` can't fill a `type="date"` input in jsdom, use `fireEvent.change(input, { target: { value: "2026-10-16" } })` from Testing Library for date inputs, in that spec only.

- [ ] **Step 7: The page**

`frontend/app/(app)/teach/classes/[id]/component/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ClassHeader } from "@/components/app/class-header";
import { CreateComponentForm } from "@/components/app/create-component-form";
import { ErrorPanel } from "@/components/app/error-panel";
import { StageDatesForm } from "@/components/app/stage-dates-form";
import { briefSummarySchema, classDetailSchema, teacherComponentSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function ClassComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await attempt(() => serverApi.get(`/classes/${encodeURIComponent(id)}`, classDetailSchema));
  if (!detail.ok && detail.error.code === "NOT_FOUND") notFound();
  if (!detail.ok) {
    return <AppMain width="class"><ErrorPanel error={detail.error} /></AppMain>;
  }

  const cls = detail.data;
  const body = cls.componentId
    ? await attempt(() => serverApi.get(`/components/${cls.componentId}`, teacherComponentSchema))
    : await attempt(() => serverApi.get(`/briefs?subjectCode=${encodeURIComponent(cls.subjectCode)}`, z.array(briefSummarySchema)));

  return (
    <AppMain width="class">
      <ClassHeader detail={cls} current="component" />
      {!body.ok ? (
        <div className="mt-6"><ErrorPanel error={body.error} /></div>
      ) : Array.isArray(body.data) ? (
        <CreateComponentForm classId={cls.id} briefs={body.data} />
      ) : (
        <StageDatesForm component={body.data} />
      )}
    </AppMain>
  );
}
```

- [ ] **Step 8: The journey**

Move `expectAccessible` and `phone` out of `e2e/phase1.e2e.ts` into `frontend/e2e/helpers.ts`, exported, and import them back into `phase1.e2e.ts`. Add to `helpers.ts`:

```ts
import { expect, type Page } from "@playwright/test";

export const TEACHER = {
  username: "e2e.teacher",
  temporary: process.env.E2E_TEACHER_PASSWORD ?? "",
  password: "e2e-teacher-password",
};

/** Signs the seeded teacher in whether or not an earlier journey already changed the temporary password. */
export async function signInTeacher(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Username" }).fill(TEACHER.username);
  await page.getByLabel("Password").fill(TEACHER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  const refused = page.getByRole("alert").filter({ hasText: "Wrong username or password" });
  await expect(page.getByRole("heading", { name: "Classes" }).or(refused)).toBeVisible();
  if (await refused.isVisible()) {
    await page.getByLabel("Password").fill(TEACHER.temporary);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByLabel("Current password").fill(TEACHER.temporary);
    await page.getByLabel("New password", { exact: true }).fill(TEACHER.password);
    await page.getByLabel("Confirm new password").fill(TEACHER.password);
    await page.getByRole("button", { name: "Change password" }).click();
  }
  await expect(page).toHaveURL(/\/teach$/);
}
```

Check the `/teach` page's heading name in `class-list.tsx` and use it in place of `"Classes"` if it differs.

`frontend/e2e/phase2.e2e.ts`:

```ts
import { expect, test } from "@playwright/test";

import { TEACHER, expectAccessible, signInTeacher } from "./helpers";

/**
 * Gate P2's journey (roadmap §8.2). 2D: the teacher creates a Biology component, sets dates, and a date after
 * the completion date is refused with the named message. 2E and 2F extend this file with the student's side.
 */
// Both Playwright projects (laptop, phone) run this file against one database, so names carry the project.
const P2 = { className: "" };

test.describe.configure({ mode: "serial" });

test("teacher sets up a Biology component", async ({ page: teacher }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set; run through scripts/e2e.sh");
  P2.className = `6P Biology ${test.info().project.name} ${Date.now().toString(36)}`;
  await signInTeacher(teacher);

  await teacher.getByRole("link", { name: "Create class" }).click();
  await teacher.getByRole("textbox", { name: "Class name" }).fill(P2.className);
  await teacher.getByRole("button", { name: "Create" }).click();
  await expect(teacher).toHaveURL(/\/teach\/classes\//);

  await teacher.getByRole("link", { name: "Component" }).click();
  await expect(teacher).toHaveURL(/\/component$/);
  await expectAccessible(teacher);
  await expect(teacher.getByText(/2027L025C2EL/)).toBeVisible();
  await teacher.getByRole("button", { name: "Create component" }).click();

  await expect(teacher.getByRole("button", { name: "Save dates" })).toBeVisible();
  await expectAccessible(teacher);

  await teacher.getByLabel("Stage 6 Finalising the Biology in Practice Investigation Report").fill("2027-03-05");
  await teacher.getByRole("button", { name: "Save dates" }).click();
  await expect(teacher.getByRole("alert").filter({ hasText: "Stage 6 is after the completion date, 26 Feb 2027" })).toBeVisible();
  await expectAccessible(teacher);

  await teacher.getByLabel("Stage 6 Finalising the Biology in Practice Investigation Report").fill("2027-01-22");
  await teacher.getByLabel("Stage 4 Conducting the Experiment").fill("2026-10-16");
  await teacher.getByLabel("Stage 5 Data Analysis and Conclusions").fill("2026-12-09");
  await teacher.getByRole("button", { name: "Save dates" }).click();
  await expect(teacher.getByRole("alert").filter({ hasText: "completion date" })).toHaveCount(0);
  await teacher.reload();
  await expect(teacher.getByLabel("Stage 4 Conducting the Experiment")).toHaveValue("2026-10-16");

  await teacher.getByRole("button", { name: "Add item to Stage 6" }).click();
  await teacher.getByRole("textbox", { name: "Item" }).fill("Full draft in for feedback");
  await teacher.getByLabel("Date (optional)").fill("2026-12-04");
  await teacher.getByRole("button", { name: "Add item" }).click();
  await expect(teacher.getByRole("listitem").filter({ hasText: "Full draft in for feedback" })).toBeVisible();
  await expectAccessible(teacher);
});
```

The dates are fixed, not relative to today, so 2F's journey can open December 2026 in the month view and find Stage 5 (9 Dec) beside the teacher item (4 Dec); the e2e database is thrown away each run.

- [ ] **Step 9: Verify**

Run: `make verify && make e2e`
Expected: both green; axe clean on the Component tab in all three states the journey visits.

- [ ] **Step 10: Commit**

```bash
git add frontend/components/app frontend/app/\(app\)/teach/classes/\[id\]/component frontend/e2e
git commit -m "Set up a class's component: choose the brief, save stage dates, manage teacher items"
```

---

## Task 10: Restyle from D-5 (only when the pack exists)

**Precondition:** `docs/design/pilot/D-5-teacher-component-setup/` exists with its `NOTES.md`. If it doesn't, leave this task unticked, note it in `docs/HANDOFF.md`, and finish the milestone without it (roadmap §6.3).

- [ ] **Step 1:** Read the pack's `NOTES.md`, including its answers on save model, checkpoints on this page, and date entry. Any behaviour change (save per row, hiding checkpoints) is a roadmap §6.2 change: update the row, get Tim's confirmation, then change the spec in its own commit.
- [ ] **Step 2:** Add the pack's `tokens.css` additions to `app/globals.css` as `--app-*` (a warning colour if it proposes one; the warnings above use amber until then).
- [ ] **Step 3:** Restyle `ClassHeader`, `CreateComponentForm`, `StageDatesForm`, `TeacherItems` to `docs/design/UI-STANDARDS.md` §15; run each spec after each component. Specs pass unchanged.
- [ ] **Step 4:** Walk `docs/design/UI-CHECKLIST.md` for the page at 1140px and 390px; `make e2e`.
- [ ] **Step 5:** Commit: `git commit -m "Restyle the Component tab from design pack D-5"`

---

## Task 11: Docs

- [ ] `docs/ARCHITECTURE.md`: §1 or §5 gains the `components` feature and V8; §4 gains "Component-scoped endpoints go through `ComponentService.owned` (the class's owner) first; a teacher item id is only looked up with `TeacherItemRepository.findActive(itemId, componentId)`"; §10 gains "`ComponentController.view` returns `Object` so Jackson writes the runtime record".
- [ ] `CLAUDE.md` Backend conventions: "Component-scoped endpoints go through `ComponentService.owned(actor, componentId)` first; a teacher item id is looked up with `TeacherItemRepository.findActive(itemId, componentId)`, never by id alone."
- [ ] `docs/PILOT-ROADMAP.md`: §1 2D built; §7 Phase 2 row lists the exact 2D endpoints; §6.2 component row unchanged unless D-5 changed it.
- [ ] `docs/HANDOFF.md` rewritten.
- [ ] Commit: `git commit -m "Record component setup in the architecture, conventions and roadmap"`

---

## Gate 2D

- [ ] `make verify` and `make e2e` green
- [ ] A date after the completion date is refused with the named message, in a backend test, a spec and the journey
- [ ] `ComponentScopeTest` passes and was shown to bite
- [ ] PR `pilot/2d-teacher-component-setup` → `pilotMain`
