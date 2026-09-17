# Pilot 2A — Template Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The database can hold versioned component templates and annual briefs, and refuses any change to a published version's structure while still accepting text corrections.

**Architecture:** Two schema migrations. `V6` creates the template and brief tables from design §6.2–§6.3, with composite foreign keys so a checkpoint, prompt or link row can only point at a stage, section or band in its own version. `V7` adds two guard triggers: one generic function, parameterised with each table's correctable text columns, rejects inserts, deletes and non-text updates on rows of a PUBLISHED or RETIRED version; a second guards `annual_brief` and `brief_rule`. The tables are content, so the test reset preserves them and the tests that write to them roll back.

**Tech Stack:** Postgres 18 (PL/pgSQL triggers, `jsonb` for the column diff), Flyway, JUnit 5 + Testcontainers through `PostgresIntegrationTest`, Spring's test-managed transactions.

**Roadmap:** `docs/PILOT-ROADMAP.md` §8.2 2A. **Design:** §6.2, §6.3, §7.1.

---

## Before you start

- Branch: `git checkout pilotMain && git pull && git checkout -b pilot/2a-template-schema`. If `pilot/design-prompts-d3-d5` isn't merged yet, branch from it instead (it only adds docs).
- `make db-up` works and `make verify` is green on the branch point.
- Read: `docs/ARCHITECTURE.md` §5 (data) and §8 (testing); `backend/src/test/java/ie/coursework/PostgresIntegrationTest.java` (the reset by exclusion); `backend/src/main/resources/db/migration/V4__classes.sql` (house style for constraints).
- Migrations `V1`–`V5` exist. This plan adds `V6` and `V7`. **2D, 2E and 2F take `V8`, `V9` and `V10`.** Never edit a migration after it has run anywhere, including your local database: add the next number.

**Decisions this plan takes** (proposed; see roadmap §3 "Phase 2 questions" for their status):

| # | Decision | Where |
|---|---|---|
| P2-1 | **Hours are whole numbers, `hours_min` nullable.** "Up to 4 hours" is `hours_min NULL, hours_max 4`. Every hour figure in the four guidelines is a whole number. No free-text hours note: Biology's "1–2 hour period" per experiment and Chemistry's "1–2 hours of total laboratory time" both store as 1–2. | `template_stage` |
| P2-2 | **A stage's `label` is nullable.** Business's "Compilation of the final report" has `label NULL` and its name only (design §6.2: "without calling it Stage 7"). | `template_stage` |
| P2-3 | **Checkpoints carry `basis` (`EXPLICIT`/`DESCRIBED`) and `source_quote`,** in addition to design §6.2's `text` and `source_ref`. `text` is the working wording teachers review (Q1); `source_quote` is the guideline's sentence it rests on, word for word, so a test can find it in the PDF (2B). | `template_checkpoint` |
| P2-4 | **Sections and mark bands hold lists as `text[]`:** `indicative_content` (Business brief bullets) and `criteria` (science band bullets, Business "Overall Coherence" sentences). Lists are read whole and never queried item by item. | `template_section`, `template_mark_band` |
| P2-5 | **A `template_section_stage` link table exists from the start, empty until Tim answers Q-P2-B** (which stage each report section is written during; neither the SEC nor the NCCA states it). An empty link table costs nothing; adding it after versions are published would need a new version. | `template_section_stage` |
| P2-6 | **Prompts and checkpoints are ordered within their stage** (`UNIQUE (stage_id, ordinal)`), and prompts have an optional `heading` for Business Appendix One ("Specific", "Measurable", …) and Appendix Two ("Objectives", "My role", …). | `template_prompt` |
| P2-7 | **What counts as "text" on a published row** (design §6.2: "text corrections propagate"): names, labels, descriptions, prompt and checkpoint wording, quotes, source refs, indicative content and criteria. **Structure** is everything else: ordinals, parent ids, hours, `supervised`, marks, `whole_report`, `suggested_words`, `basis`, and link rows. | `V7` trigger arguments |
| P2-8 | **A brief's structure is frozen once published** (its template, version, exam year, SEC code and rule rows), but its completion date, limits and wording stay editable, because design §6.3 expects the SEC to move a completion date. | `V7` brief guard |

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `backend/src/main/resources/db/migration/V6__templates_and_briefs.sql` | Tables and constraints | 1 |
| `backend/src/test/java/ie/coursework/PostgresIntegrationTest.java` | Preserve the new content tables | 1 |
| `backend/src/test/java/ie/coursework/ContentResetPolicyTest.java` | Fails if a content table isn't preserved | 1 |
| `backend/src/test/java/ie/coursework/support/TemplateRows.java` | Inserts minimal template and brief rows for schema tests | 1 |
| `backend/src/test/java/ie/coursework/components/adapter/persistence/TemplateSchemaTest.java` | Constraints and composite keys | 1 |
| `backend/src/main/resources/db/migration/V7__template_guards.sql` | Structure guard and brief guard triggers | 2, 3 |
| `backend/src/test/java/ie/coursework/components/adapter/persistence/TemplateStructureGuardTest.java` | The structure trigger, table by table | 2 |
| `backend/src/test/java/ie/coursework/components/adapter/persistence/BriefGuardTest.java` | The brief trigger | 3 |
| `docs/ARCHITECTURE.md`, `CLAUDE.md`, `docs/PILOT-ROADMAP.md`, `docs/HANDOFF.md` | Keep the docs true | 4 |

`V7` is written across Tasks 2 and 3 **before either is committed to a shared branch**. If Task 2 has already run against your local database when you start Task 3, run `make db-down && docker volume rm biologyproject_postgres-data` (check the volume name with `docker volume ls`) or simply let Testcontainers do the work: the test container is fresh every JVM, so only `make backend-run` against the dev database would notice. If in doubt, put Task 3's SQL in `V8__brief_guard.sql` and renumber 2D–2F's migrations up by one.

---

## Task 1: Template and brief tables

**Files:**
- Create: `backend/src/main/resources/db/migration/V6__templates_and_briefs.sql`
- Create: `backend/src/test/java/ie/coursework/support/TemplateRows.java`
- Create: `backend/src/test/java/ie/coursework/ContentResetPolicyTest.java`
- Create: `backend/src/test/java/ie/coursework/components/adapter/persistence/TemplateSchemaTest.java`
- Modify: `backend/src/test/java/ie/coursework/PostgresIntegrationTest.java`

- [ ] **Step 1: Write the test helper**

`backend/src/test/java/ie/coursework/support/TemplateRows.java`:

```java
package ie.coursework.support;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Minimal template and brief rows for schema and trigger tests.
 *
 * <p>These tables are content: {@code PostgresIntegrationTest} doesn't truncate them. Every test that
 * uses this helper must run inside a transaction that rolls back ({@code @Transactional} on the test
 * class), or its rows leak into every later test in the JVM.
 */
public final class TemplateRows {

    private final JdbcTemplate jdbc;

    public TemplateRows(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UUID template(String slug) {
        UUID subject = jdbc.queryForObject("SELECT id FROM subject WHERE code = 'BIOLOGY'", UUID.class);
        return jdbc.queryForObject("""
                INSERT INTO component_template (subject_id, slug, name, deliverable_type, weighting_percent, marks_total)
                VALUES (?, ?, 'Test Investigation', 'REPORT', 40, 200) RETURNING id
                """, UUID.class, subject, slug);
    }

    public UUID draftVersion(UUID templateId, int versionNo) {
        return jdbc.queryForObject("""
                INSERT INTO template_version (template_id, version_no, process_note, process_note_source_ref)
                VALUES (?, ?, 'The stages are not linear.', 'TEST p. 1') RETURNING id
                """, UUID.class, templateId, versionNo);
    }

    public void publish(UUID versionId) {
        jdbc.update("UPDATE template_version SET status = 'PUBLISHED', published_at = now() WHERE id = ?", versionId);
    }

    public void retire(UUID versionId) {
        jdbc.update("UPDATE template_version SET status = 'RETIRED' WHERE id = ?", versionId);
    }

    public UUID stage(UUID versionId, int ordinal) {
        return jdbc.queryForObject("""
                INSERT INTO template_stage (version_id, ordinal, label, name, description, hours_min, hours_max, source_ref)
                VALUES (?, ?, ?, 'A stage', 'What happens.', 1, 2, 'TEST p. 2') RETURNING id
                """, UUID.class, versionId, ordinal, "Stage " + ordinal);
    }

    public UUID section(UUID versionId, int ordinal) {
        return jdbc.queryForObject("""
                INSERT INTO template_section (version_id, ordinal, label, name, source_ref)
                VALUES (?, ?, ?, 'A section', 'TEST p. 3') RETURNING id
                """, UUID.class, versionId, ordinal, String.valueOf(ordinal));
    }

    public UUID band(UUID versionId, int ordinal, int marks) {
        return jdbc.queryForObject("""
                INSERT INTO template_mark_band (version_id, ordinal, label, marks, whole_report, source_ref)
                VALUES (?, ?, ?, ?, false, 'TEST p. 4') RETURNING id
                """, UUID.class, versionId, ordinal, String.valueOf((char) ('A' + ordinal - 1)), marks);
    }

    public UUID checkpoint(UUID versionId, UUID stageId, int ordinal) {
        return jdbc.queryForObject("""
                INSERT INTO template_checkpoint (version_id, stage_id, ordinal, text, basis, source_quote, source_ref)
                VALUES (?, ?, ?, 'Plan shared with the teacher', 'EXPLICIT', 'Sharing the plan.', 'TEST p. 5')
                RETURNING id
                """, UUID.class, versionId, stageId, ordinal);
    }

    public UUID prompt(UUID versionId, UUID stageId, int ordinal) {
        return jdbc.queryForObject("""
                INSERT INTO template_prompt (version_id, stage_id, ordinal, text, source_ref)
                VALUES (?, ?, ?, 'What do I already know?', 'TEST p. 6') RETURNING id
                """, UUID.class, versionId, stageId, ordinal);
    }

    public void linkSectionToStage(UUID versionId, UUID sectionId, UUID stageId) {
        jdbc.update("INSERT INTO template_section_stage (version_id, section_id, stage_id) VALUES (?, ?, ?)",
                versionId, sectionId, stageId);
    }

    public void linkBandToSection(UUID versionId, UUID bandId, UUID sectionId) {
        jdbc.update("INSERT INTO template_mark_band_section (version_id, band_id, section_id) VALUES (?, ?, ?)",
                versionId, bandId, sectionId);
    }

    public UUID brief(UUID templateId, UUID versionId, int examYear) {
        return jdbc.queryForObject("""
                INSERT INTO annual_brief (template_id, template_version_id, exam_year, sec_code, title, topic_body,
                                          completion_date, word_limit, words_not_counted, image_limit, source_ref)
                VALUES (?, ?, ?, ?, 'Test Investigation', 'Investigate something.', ?, 1500,
                        'References do not count.', 20, 'TEST-BRIEF p. 2')
                RETURNING id
                """, UUID.class, templateId, versionId, examYear, examYear + "L999C2EL",
                LocalDate.of(examYear, 2, 26));
    }

    public void publishBrief(UUID briefId) {
        jdbc.update("UPDATE annual_brief SET status = 'PUBLISHED', published_at = now() WHERE id = ?", briefId);
    }

    public UUID briefRule(UUID briefId, int ordinal) {
        return jdbc.queryForObject("""
                INSERT INTO brief_rule (brief_id, ordinal, key, value, source_ref)
                VALUES (?, ?, 'Page orientation', 'Portrait only.', 'TEST-BRIEF p. 3') RETURNING id
                """, UUID.class, briefId, ordinal);
    }
}
```

- [ ] **Step 2: Write the failing schema tests**

`backend/src/test/java/ie/coursework/components/adapter/persistence/TemplateSchemaTest.java`:

```java
package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.TemplateRows;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

/** Content tables: every test rolls back (see TemplateRows). */
@Transactional
class TemplateSchemaTest extends PostgresIntegrationTest {

    private TemplateRows rows;
    private UUID version;

    @BeforeEach
    void draft() {
        rows = new TemplateRows(jdbcTemplate);
        version = rows.draftVersion(rows.template("test-science"), 1);
    }

    @Test
    void templateAndBriefTablesExist() {
        List<String> tables = jdbcTemplate.queryForList(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'", String.class);

        assertThat(tables).contains("component_template", "template_version", "template_stage", "template_section",
                "template_section_stage", "template_mark_band", "template_mark_band_section", "template_checkpoint",
                "template_prompt", "annual_brief", "brief_rule");
    }

    @Test
    void stageOrdinalsAreUniqueWithinAVersion() {
        rows.stage(version, 1);

        assertThatThrownBy(() -> rows.stage(version, 1)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aVersionNumberIsUsedOncePerTemplate() {
        UUID template = jdbcTemplate.queryForObject(
                "SELECT template_id FROM template_version WHERE id = ?", UUID.class, version);

        assertThatThrownBy(() -> rows.draftVersion(template, 1)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aCheckpointsStageMustBeInTheSameVersion() {
        UUID otherVersion = rows.draftVersion(rows.template("test-other"), 1);
        UUID stageInOther = rows.stage(otherVersion, 1);

        assertThatThrownBy(() -> rows.checkpoint(version, stageInOther, 1))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aBandAndItsSectionMustBeInTheSameVersion() {
        UUID band = rows.band(version, 1, 50);
        UUID sectionInOther = rows.section(rows.draftVersion(rows.template("test-other"), 1), 1);

        assertThatThrownBy(() -> rows.linkBandToSection(version, band, sectionInOther))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void checkpointBasisIsExplicitOrDescribed() {
        UUID checkpoint = rows.checkpoint(version, rows.stage(version, 1), 1);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "UPDATE template_checkpoint SET basis = 'IMPLIED' WHERE id = ?", checkpoint))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void hoursMinCannotExceedHoursMax() {
        UUID stage = rows.stage(version, 1);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "UPDATE template_stage SET hours_min = 5, hours_max = 4 WHERE id = ?", stage))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aPublishedVersionHasAPublishedAtAndADraftDoesNot() {
        assertThatThrownBy(() -> jdbcTemplate.update(
                "UPDATE template_version SET status = 'PUBLISHED' WHERE id = ?", version))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aBriefsExamYearMatchesItsSecCode() {
        UUID template = jdbcTemplate.queryForObject(
                "SELECT template_id FROM template_version WHERE id = ?", UUID.class, version);
        UUID brief = rows.brief(template, version, 2027);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "UPDATE annual_brief SET sec_code = '2028L025C2EL' WHERE id = ?", brief))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aBriefPinsAVersionOfItsOwnTemplate() {
        UUID otherTemplate = rows.template("test-other");

        assertThatThrownBy(() -> rows.brief(otherTemplate, version, 2027))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void oneBriefPerTemplatePerExamYear() {
        UUID template = jdbcTemplate.queryForObject(
                "SELECT template_id FROM template_version WHERE id = ?", UUID.class, version);
        rows.brief(template, version, 2027);

        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO annual_brief (template_id, template_version_id, exam_year, sec_code, title, topic_body,
                                          completion_date, word_limit, words_not_counted, image_limit, source_ref)
                VALUES (?, ?, 2027, '2027L998C2EL', 'Again', 'Body', DATE '2027-03-01', 1500, 'x', 20, 'x')
                """, template, version))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aBriefSourceUrlMustBeHttps() {
        UUID template = jdbcTemplate.queryForObject(
                "SELECT template_id FROM template_version WHERE id = ?", UUID.class, version);
        UUID brief = rows.brief(template, version, 2027);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "UPDATE annual_brief SET source_url = 'http://www.examinations.ie' WHERE id = ?", brief))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
```

`backend/src/test/java/ie/coursework/ContentResetPolicyTest.java`:

```java
package ie.coursework;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Content tables survive the per-test reset. A content table missing from the preserved list would be
 * emptied by the first test in the JVM and every content test after it would fail far from the cause.
 */
class ContentResetPolicyTest extends PostgresIntegrationTest {

    @Test
    void everyTemplateAndBriefTableIsPreserved() {
        List<String> content = jdbcTemplate.queryForList("""
                SELECT tablename FROM pg_tables
                WHERE schemaname = 'public'
                  AND (tablename LIKE 'template\\_%' OR tablename IN ('component_template', 'annual_brief', 'brief_rule'))
                """, String.class);

        assertThat(content).isNotEmpty();
        assertThat(PRESERVED_TABLES).containsAll(content);
    }
}
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `cd backend && ./mvnw test -Dtest='TemplateSchemaTest,ContentResetPolicyTest'`
Expected: FAIL. `TemplateSchemaTest` errors with `relation "component_template" does not exist`; `ContentResetPolicyTest` fails to compile because `PRESERVED_TABLES` is private.

- [ ] **Step 4: Write the migration**

`backend/src/main/resources/db/migration/V6__templates_and_briefs.sql`:

```sql
-- Component templates, versioned, and the SEC's annual briefs (design §6.2, §6.3). The rows are content
-- (db/content) and are reviewed against the source PDFs; this file is only their shape. V7 adds the
-- triggers that freeze a published version's structure.
--
-- Composite keys: every row below a version carries version_id, and points at its parent by
-- (id, version_id), so a checkpoint can't hang off a stage from another version.

CREATE TABLE component_template (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id        uuid        NOT NULL REFERENCES subject (id),
    slug              text        NOT NULL UNIQUE CONSTRAINT component_template_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name              text        NOT NULL CONSTRAINT component_template_name_present CHECK (btrim(name) <> ''),
    deliverable_type  text        NOT NULL CONSTRAINT component_template_deliverable_valid CHECK (deliverable_type IN ('REPORT')),
    weighting_percent int         NOT NULL CONSTRAINT component_template_weighting_valid CHECK (weighting_percent BETWEEN 1 AND 100),
    marks_total       int         NOT NULL CONSTRAINT component_template_marks_positive CHECK (marks_total > 0),
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE template_version (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id             uuid        NOT NULL REFERENCES component_template (id),
    version_no              int         NOT NULL CONSTRAINT template_version_no_positive CHECK (version_no > 0),
    status                  text        NOT NULL DEFAULT 'DRAFT'
                                        CONSTRAINT template_version_status_valid CHECK (status IN ('DRAFT', 'PUBLISHED', 'RETIRED')),
    -- "The stages aren't linear" (science) / "monitoring and reflection run across all stages" (Business).
    process_note            text        NOT NULL,
    process_note_source_ref text        NOT NULL,
    published_at            timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_version_unique UNIQUE (template_id, version_no),
    CONSTRAINT template_version_id_template UNIQUE (id, template_id),
    CONSTRAINT template_version_published_at CHECK ((status = 'DRAFT') = (published_at IS NULL))
);

CREATE TABLE template_stage (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id  uuid        NOT NULL REFERENCES template_version (id),
    ordinal     int         NOT NULL CONSTRAINT template_stage_ordinal_positive CHECK (ordinal > 0),
    -- "Stage 1" … "Stage 6"; NULL for Business's unnumbered "Compilation of the final report".
    label       text,
    name        text        NOT NULL,
    description text        NOT NULL,
    -- Display only in the pilot. "Up to 4 hours" is (NULL, 4).
    hours_min   int         CONSTRAINT template_stage_hours_min_valid CHECK (hours_min >= 0),
    hours_max   int         CONSTRAINT template_stage_hours_max_valid CHECK (hours_max > 0),
    -- Stages sharing one estimate (Business Stages 4 and 5, "6-8 hours") share a group key and the same hours.
    hours_group text,
    supervised  boolean     NOT NULL DEFAULT false,
    source_ref  text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_stage_ordinal_unique UNIQUE (version_id, ordinal),
    CONSTRAINT template_stage_id_version UNIQUE (id, version_id),
    CONSTRAINT template_stage_hours_order CHECK (hours_min IS NULL OR hours_max IS NULL OR hours_min <= hours_max)
);

CREATE TABLE template_section (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id         uuid        NOT NULL REFERENCES template_version (id),
    ordinal            int         NOT NULL CONSTRAINT template_section_ordinal_positive CHECK (ordinal > 0),
    label              text        NOT NULL,
    name               text        NOT NULL,
    suggested_words    int         CONSTRAINT template_section_words_positive CHECK (suggested_words > 0),
    indicative_content text[]      NOT NULL DEFAULT '{}',
    source_ref         text        NOT NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_section_ordinal_unique UNIQUE (version_id, ordinal),
    CONSTRAINT template_section_id_version UNIQUE (id, version_id)
);

-- Which stage a report section is written during. Empty until that mapping is confirmed (plan 2A P2-5).
CREATE TABLE template_section_stage (
    version_id uuid NOT NULL,
    section_id uuid NOT NULL,
    stage_id   uuid NOT NULL,
    PRIMARY KEY (section_id, stage_id),
    FOREIGN KEY (section_id, version_id) REFERENCES template_section (id, version_id),
    FOREIGN KEY (stage_id, version_id) REFERENCES template_stage (id, version_id)
);

CREATE TABLE template_mark_band (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id   uuid        NOT NULL REFERENCES template_version (id),
    ordinal      int         NOT NULL CONSTRAINT template_mark_band_ordinal_positive CHECK (ordinal > 0),
    -- Science bands are lettered A-D; Business bands have names only.
    label        text,
    name         text,
    marks        int         NOT NULL CONSTRAINT template_mark_band_marks_positive CHECK (marks > 0),
    whole_report boolean     NOT NULL,
    criteria     text[]      NOT NULL DEFAULT '{}',
    source_ref   text        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_mark_band_ordinal_unique UNIQUE (version_id, ordinal),
    CONSTRAINT template_mark_band_id_version UNIQUE (id, version_id),
    CONSTRAINT template_mark_band_named CHECK (label IS NOT NULL OR name IS NOT NULL)
);

CREATE TABLE template_mark_band_section (
    version_id uuid NOT NULL,
    band_id    uuid NOT NULL,
    section_id uuid NOT NULL,
    PRIMARY KEY (band_id, section_id),
    FOREIGN KEY (band_id, version_id) REFERENCES template_mark_band (id, version_id),
    FOREIGN KEY (section_id, version_id) REFERENCES template_section (id, version_id)
);

-- Teacher sign-offs, drawn only from where the guidelines have a student share work (design §7.3).
CREATE TABLE template_checkpoint (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id   uuid        NOT NULL,
    stage_id     uuid        NOT NULL,
    ordinal      int         NOT NULL CONSTRAINT template_checkpoint_ordinal_positive CHECK (ordinal > 0),
    -- Working wording, reviewed by the subject's teacher (roadmap Q1).
    text         text        NOT NULL,
    basis        text        NOT NULL CONSTRAINT template_checkpoint_basis_valid CHECK (basis IN ('EXPLICIT', 'DESCRIBED')),
    -- The guideline sentence the checkpoint rests on, word for word.
    source_quote text        NOT NULL,
    source_ref   text        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_checkpoint_ordinal_unique UNIQUE (stage_id, ordinal),
    FOREIGN KEY (stage_id, version_id) REFERENCES template_stage (id, version_id)
);

-- The guidelines' own sample questions, shown read-only.
CREATE TABLE template_prompt (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid        NOT NULL,
    stage_id   uuid        NOT NULL,
    ordinal    int         NOT NULL CONSTRAINT template_prompt_ordinal_positive CHECK (ordinal > 0),
    heading    text,
    text       text        NOT NULL,
    source_ref text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_prompt_ordinal_unique UNIQUE (stage_id, ordinal),
    FOREIGN KEY (stage_id, version_id) REFERENCES template_stage (id, version_id)
);

-- One SEC brief per template per exam year. It pins the template version whose sections it uses.
CREATE TABLE annual_brief (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id         uuid        NOT NULL REFERENCES component_template (id),
    template_version_id uuid        NOT NULL,
    exam_year           int         NOT NULL CONSTRAINT annual_brief_exam_year_valid CHECK (exam_year BETWEEN 2027 AND 2100),
    sec_code            text        NOT NULL UNIQUE CONSTRAINT annual_brief_sec_code_format CHECK (sec_code ~ '^[0-9]{4}L[0-9]{3}C[0-9]E[A-Z]$'),
    status              text        NOT NULL DEFAULT 'DRAFT' CONSTRAINT annual_brief_status_valid CHECK (status IN ('DRAFT', 'PUBLISHED')),
    title               text        NOT NULL,
    topic_title         text,
    topic_body          text        NOT NULL,
    completion_date     date        NOT NULL,
    word_limit          int         NOT NULL CONSTRAINT annual_brief_word_limit_positive CHECK (word_limit > 0),
    words_not_counted   text        NOT NULL,
    image_limit         int         NOT NULL CONSTRAINT annual_brief_image_limit_valid CHECK (image_limit >= 0),
    image_note          text,
    source_url          text        CONSTRAINT annual_brief_source_url_https CHECK (source_url ~ '^https://'),
    source_ref          text        NOT NULL,
    published_at        timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT annual_brief_one_per_year UNIQUE (template_id, exam_year),
    CONSTRAINT annual_brief_year_matches_code CHECK (exam_year = substring(sec_code, 1, 4)::int),
    CONSTRAINT annual_brief_published_at CHECK ((status = 'DRAFT') = (published_at IS NULL)),
    FOREIGN KEY (template_version_id, template_id) REFERENCES template_version (id, template_id)
);

-- The brief's formatting-rules table, row by row, in its own words.
CREATE TABLE brief_rule (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    brief_id   uuid        NOT NULL REFERENCES annual_brief (id),
    ordinal    int         NOT NULL CONSTRAINT brief_rule_ordinal_positive CHECK (ordinal > 0),
    key        text        NOT NULL,
    value      text        NOT NULL,
    source_ref text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT brief_rule_ordinal_unique UNIQUE (brief_id, ordinal)
);
```

- [ ] **Step 5: Preserve the content tables**

In `backend/src/test/java/ie/coursework/PostgresIntegrationTest.java`, replace the `PRESERVED_TABLES` declaration and its comment with:

```java
    /**
     * Migration history and content tables. Package-visible so {@code ContentResetPolicyTest} can check
     * it. A test that writes to one of these must roll back ({@code @Transactional}).
     */
    static final Set<String> PRESERVED_TABLES = Set.of(
            "flyway_schema_history", "flyway_content_history", "subject",
            "component_template", "template_version", "template_stage", "template_section",
            "template_section_stage", "template_mark_band", "template_mark_band_section",
            "template_checkpoint", "template_prompt", "annual_brief", "brief_rule");
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `cd backend && ./mvnw test -Dtest='TemplateSchemaTest,ContentResetPolicyTest,ContentMigrationsTest'`
Expected: PASS, 12 + 1 + 4 tests.

- [ ] **Step 7: Run the whole backend suite**

Run: `make backend-test`
Expected: PASS (155 existing tests plus the new ones). A failure in an unrelated class here usually means a test wrote to a content table without rolling back.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/db/migration/V6__templates_and_briefs.sql \
        backend/src/test/java/ie/coursework/PostgresIntegrationTest.java \
        backend/src/test/java/ie/coursework/ContentResetPolicyTest.java \
        backend/src/test/java/ie/coursework/support/TemplateRows.java \
        backend/src/test/java/ie/coursework/components/adapter/persistence/TemplateSchemaTest.java
git commit -m "Store versioned component templates and annual briefs"
```

---

## Task 2: Freeze a published version's structure

**Files:**
- Create: `backend/src/main/resources/db/migration/V7__template_guards.sql`
- Create: `backend/src/test/java/ie/coursework/components/adapter/persistence/TemplateStructureGuardTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.TemplateRows;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

/**
 * Design §6.2: text corrections propagate to classes already on a version; structure changes need a new
 * version. Each refused change is the last statement of its test, because a failed statement aborts the
 * test's transaction.
 */
@Transactional
class TemplateStructureGuardTest extends PostgresIntegrationTest {

    private TemplateRows rows;
    private UUID template;
    private UUID version;
    private UUID stage;
    private UUID section;
    private UUID band;
    private UUID checkpoint;
    private UUID prompt;

    @BeforeEach
    void publishedVersion() {
        rows = new TemplateRows(jdbcTemplate);
        template = rows.template("test-science");
        version = rows.draftVersion(template, 1);
        stage = rows.stage(version, 1);
        section = rows.section(version, 1);
        band = rows.band(version, 1, 50);
        checkpoint = rows.checkpoint(version, stage, 1);
        prompt = rows.prompt(version, stage, 1);
        rows.linkBandToSection(version, band, section);
        rows.linkSectionToStage(version, section, stage);
        rows.publish(version);
    }

    @Test
    void aDraftVersionTakesAnyChange() {
        UUID draft = rows.draftVersion(template, 2);
        UUID draftStage = rows.stage(draft, 1);

        jdbcTemplate.update("UPDATE template_stage SET ordinal = 2, hours_max = 3 WHERE id = ?", draftStage);
        jdbcTemplate.update("DELETE FROM template_stage WHERE id = ?", draftStage);

        assertThat(count("template_stage", draft)).isZero();
    }

    @Test
    void correctingPublishedTextIsAllowed() {
        jdbcTemplate.update("UPDATE template_stage SET name = 'Fixed', description = 'Fixed.', label = 'Stage 1' WHERE id = ?", stage);
        jdbcTemplate.update("UPDATE template_section SET name = 'Fixed', indicative_content = '{a,b}' WHERE id = ?", section);
        jdbcTemplate.update("UPDATE template_mark_band SET name = 'Fixed', criteria = '{c}' WHERE id = ?", band);
        jdbcTemplate.update("UPDATE template_checkpoint SET text = 'Fixed', source_quote = 'Fixed.', source_ref = 'X p. 1' WHERE id = ?", checkpoint);
        jdbcTemplate.update("UPDATE template_prompt SET text = 'Fixed?', heading = 'Specific' WHERE id = ?", prompt);
        jdbcTemplate.update("UPDATE template_version SET process_note = 'Fixed.' WHERE id = ?", version);

        assertThat(jdbcTemplate.queryForObject("SELECT name FROM template_stage WHERE id = ?", String.class, stage))
                .isEqualTo("Fixed");
    }

    @Test
    void addingAStageToAPublishedVersionIsRefused() {
        assertRefused(() -> rows.stage(version, 2));
    }

    @Test
    void removingAPromptFromAPublishedVersionIsRefused() {
        assertRefused(() -> jdbcTemplate.update("DELETE FROM template_prompt WHERE id = ?", prompt));
    }

    @Test
    void removingAStageFromAPublishedVersionIsRefused() {
        UUID bare = rows.draftVersion(template, 2);
        UUID lonely = rows.stage(bare, 1);
        rows.publish(bare);

        assertRefused(() -> jdbcTemplate.update("DELETE FROM template_stage WHERE id = ?", lonely));
    }

    @Test
    void reorderingAPublishedStageIsRefused() {
        assertRefused(() -> jdbcTemplate.update("UPDATE template_stage SET ordinal = 7 WHERE id = ?", stage));
    }

    @Test
    void changingPublishedHoursIsRefused() {
        assertRefused(() -> jdbcTemplate.update("UPDATE template_stage SET hours_max = 9 WHERE id = ?", stage));
    }

    @Test
    void changingWhetherAStageIsSupervisedIsRefused() {
        assertRefused(() -> jdbcTemplate.update("UPDATE template_stage SET supervised = true WHERE id = ?", stage));
    }

    @Test
    void addingASectionIsRefused() {
        assertRefused(() -> rows.section(version, 2));
    }

    @Test
    void changingASectionsSuggestedWordsIsRefused() {
        assertRefused(() -> jdbcTemplate.update("UPDATE template_section SET suggested_words = 300 WHERE id = ?", section));
    }

    @Test
    void addingABandIsRefused() {
        assertRefused(() -> rows.band(version, 2, 50));
    }

    @Test
    void changingABandsMarksIsRefused() {
        assertRefused(() -> jdbcTemplate.update("UPDATE template_mark_band SET marks = 40 WHERE id = ?", band));
    }

    @Test
    void changingWhatABandCoversIsRefused() {
        assertRefused(() -> jdbcTemplate.update("DELETE FROM template_mark_band_section WHERE band_id = ?", band));
    }

    @Test
    void changingWhichStageASectionIsWrittenDuringIsRefused() {
        assertRefused(() -> jdbcTemplate.update("DELETE FROM template_section_stage WHERE section_id = ?", section));
    }

    @Test
    void addingACheckpointIsRefused() {
        assertRefused(() -> rows.checkpoint(version, stage, 2));
    }

    @Test
    void changingACheckpointsBasisIsRefused() {
        assertRefused(() -> jdbcTemplate.update("UPDATE template_checkpoint SET basis = 'DESCRIBED' WHERE id = ?", checkpoint));
    }

    @Test
    void movingAPromptToAnotherStageIsRefused() {
        UUID draft = rows.draftVersion(template, 2);
        UUID draftStage = rows.stage(draft, 1);

        assertRefused(() -> jdbcTemplate.update(
                "UPDATE template_prompt SET version_id = ?, stage_id = ? WHERE id = ?", draft, draftStage, prompt));
    }

    @Test
    void aRetiredVersionIsFrozenToo() {
        rows.retire(version);

        assertRefused(() -> rows.stage(version, 2));
    }

    @Test
    void aPublishedVersionCannotGoBackToDraft() {
        assertRefused(() -> jdbcTemplate.update(
                "UPDATE template_version SET status = 'DRAFT', published_at = NULL WHERE id = ?", version));
    }

    @Test
    void aRetiredVersionCannotBeRepublished() {
        rows.retire(version);

        assertRefused(() -> jdbcTemplate.update("UPDATE template_version SET status = 'PUBLISHED' WHERE id = ?", version));
    }

    @Test
    void aPublishedVersionCannotBeRenumbered() {
        assertRefused(() -> jdbcTemplate.update("UPDATE template_version SET version_no = 5 WHERE id = ?", version));
    }

    @Test
    void aPublishedVersionCannotBeDeleted() {
        assertRefused(() -> jdbcTemplate.update("DELETE FROM template_version WHERE id = ?", version));
    }

    @Test
    void theRefusalSaysToCreateANewVersion() {
        assertThatThrownBy(() -> rows.stage(version, 2))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("new template version");
    }

    private int count(String table, UUID versionId) {
        return jdbcTemplate.queryForObject("SELECT count(*) FROM " + table + " WHERE version_id = ?", Integer.class, versionId);
    }

    private static void assertRefused(Runnable change) {
        assertThatThrownBy(change::run).isInstanceOf(DataIntegrityViolationException.class);
    }
}
```

`rows.stage(...)` returns a value, so wrap those in a lambda that discards it: `assertRefused(() -> rows.stage(version, 2))` compiles because `Runnable` accepts an expression lambda whose value is ignored.

- [ ] **Step 2: Run the tests to see them fail**

Run: `cd backend && ./mvnw test -Dtest=TemplateStructureGuardTest`
Expected: FAIL. `aDraftVersionTakesAnyChange` and `correctingPublishedTextIsAllowed` pass already; every `…IsRefused` test fails with "Expecting code to raise a throwable".

- [ ] **Step 3: Write the structure guard**

`backend/src/main/resources/db/migration/V7__template_guards.sql`:

```sql
-- Design §6.2: once a template version is PUBLISHED (or RETIRED), its text can be corrected but its
-- structure can't change. Classes already running stay on their version; structure changes make a new one.
--
-- One function guards every table below a version. Each trigger passes the names of that table's
-- correctable text columns (plan 2A P2-7). An UPDATE is allowed when the row is identical apart from
-- those columns; any other change, and any INSERT or DELETE, is refused.

CREATE FUNCTION template_version_status(p_version_id uuid) RETURNS text
    LANGUAGE sql STABLE AS $$ SELECT status FROM template_version WHERE id = p_version_id $$;

CREATE FUNCTION refuse_frozen_template_structure() RETURNS trigger
    LANGUAGE plpgsql AS $$
DECLARE
    v_old_status text;
    v_new_status text;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old_status := template_version_status(OLD.version_id);
    END IF;
    IF TG_OP IN ('UPDATE', 'INSERT') THEN
        v_new_status := template_version_status(NEW.version_id);
    END IF;

    IF TG_OP = 'UPDATE'
       AND v_old_status <> 'DRAFT'
       AND OLD.version_id = NEW.version_id
       AND (to_jsonb(NEW) - TG_ARGV) = (to_jsonb(OLD) - TG_ARGV) THEN
        RETURN NEW;
    END IF;

    IF coalesce(v_old_status, 'DRAFT') <> 'DRAFT' OR coalesce(v_new_status, 'DRAFT') <> 'DRAFT' THEN
        RAISE EXCEPTION '% on %: template version is %, so only its text can change; create a new template version',
            TG_OP, TG_TABLE_NAME, coalesce(v_old_status, v_new_status)
            USING ERRCODE = 'check_violation';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER template_stage_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_stage
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure('label', 'name', 'description', 'source_ref', 'created_at');
CREATE TRIGGER template_section_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_section
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure('label', 'name', 'indicative_content', 'source_ref', 'created_at');
CREATE TRIGGER template_section_stage_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_section_stage
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure();
CREATE TRIGGER template_mark_band_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_mark_band
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure('label', 'name', 'criteria', 'source_ref', 'created_at');
CREATE TRIGGER template_mark_band_section_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_mark_band_section
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure();
CREATE TRIGGER template_checkpoint_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_checkpoint
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure('text', 'source_quote', 'source_ref', 'created_at');
CREATE TRIGGER template_prompt_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_prompt
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure('heading', 'text', 'source_ref', 'created_at');

-- The version itself: DRAFT -> PUBLISHED -> RETIRED, never back; a non-draft version keeps its template
-- and number and is never deleted. Its process note is text and stays correctable.
CREATE FUNCTION guard_template_version_lifecycle() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status <> 'DRAFT' THEN
            RAISE EXCEPTION 'template version % is %: it can''t be deleted; retire it instead', OLD.id, OLD.status
                USING ERRCODE = 'check_violation';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.status <> 'DRAFT'
       AND (NEW.template_id <> OLD.template_id OR NEW.version_no <> OLD.version_no) THEN
        RAISE EXCEPTION 'template version % is %: its template and number are fixed; create a new template version',
            OLD.id, OLD.status USING ERRCODE = 'check_violation';
    END IF;

    IF NOT ((OLD.status = NEW.status)
            OR (OLD.status = 'DRAFT' AND NEW.status = 'PUBLISHED')
            OR (OLD.status = 'PUBLISHED' AND NEW.status = 'RETIRED')) THEN
        RAISE EXCEPTION 'template version % can''t go from % to %; create a new template version',
            OLD.id, OLD.status, NEW.status USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER template_version_lifecycle BEFORE UPDATE OR DELETE ON template_version
    FOR EACH ROW EXECUTE FUNCTION guard_template_version_lifecycle();
```

`to_jsonb(row) - text[]` removes those keys; comparing what's left compares every structural column at once, including ones a later migration adds, which are then structural by default.

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd backend && ./mvnw test -Dtest='TemplateStructureGuardTest,TemplateSchemaTest'`
Expected: PASS.

If `aPublishedVersionHasAPublishedAtAndADraftDoesNot` in `TemplateSchemaTest` now reports the lifecycle trigger's message instead of the check constraint's, that's fine: it still throws `DataIntegrityViolationException`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V7__template_guards.sql \
        backend/src/test/java/ie/coursework/components/adapter/persistence/TemplateStructureGuardTest.java
git commit -m "Refuse structure changes to a published template version, allow text corrections"
```

---

## Task 3: Guard published briefs

**Files:**
- Modify: `backend/src/main/resources/db/migration/V7__template_guards.sql` (append; see the note under "File structure" if V7 has already run on your dev database)
- Create: `backend/src/test/java/ie/coursework/components/adapter/persistence/BriefGuardTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.TemplateRows;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

/** Design §6.3 and plan 2A P2-8. */
@Transactional
class BriefGuardTest extends PostgresIntegrationTest {

    private TemplateRows rows;
    private UUID template;
    private UUID version;

    @BeforeEach
    void publishedTemplate() {
        rows = new TemplateRows(jdbcTemplate);
        template = rows.template("test-science");
        version = rows.draftVersion(template, 1);
        rows.stage(version, 1);
        rows.publish(version);
    }

    @Test
    void aBriefCannotBePublishedOnADraftVersion() {
        UUID draft = rows.draftVersion(template, 2);
        UUID brief = rows.brief(template, draft, 2028);

        assertRefused(() -> rows.publishBrief(brief));
    }

    @Test
    void aDraftBriefTakesAnyChange() {
        UUID brief = rows.brief(template, version, 2027);
        rows.briefRule(brief, 1);

        jdbcTemplate.update("UPDATE brief_rule SET ordinal = 2 WHERE brief_id = ?", brief);
        jdbcTemplate.update("DELETE FROM brief_rule WHERE brief_id = ?", brief);
        jdbcTemplate.update("UPDATE annual_brief SET exam_year = 2028, sec_code = '2028L999C2EL' WHERE id = ?", brief);

        assertThat(jdbcTemplate.queryForObject("SELECT exam_year FROM annual_brief WHERE id = ?", Integer.class, brief))
                .isEqualTo(2028);
    }

    @Test
    void aPublishedBriefsCompletionDateLimitsAndWordingCanChange() {
        UUID brief = published(2027);

        jdbcTemplate.update("""
                UPDATE annual_brief SET completion_date = DATE '2027-02-19', word_limit = 1400, image_limit = 18,
                       topic_body = 'Fixed.', words_not_counted = 'Fixed.', image_note = 'Fixed.' WHERE id = ?
                """, brief);

        assertThat(jdbcTemplate.queryForObject("SELECT completion_date FROM annual_brief WHERE id = ?", LocalDate.class, brief))
                .isEqualTo(LocalDate.of(2027, 2, 19));
    }

    @Test
    void aPublishedBriefKeepsItsExamYearAndCode() {
        UUID brief = published(2027);

        assertRefused(() -> jdbcTemplate.update(
                "UPDATE annual_brief SET exam_year = 2028, sec_code = '2028L999C2EL' WHERE id = ?", brief));
    }

    @Test
    void aPublishedBriefKeepsItsTemplateVersion() {
        UUID brief = published(2027);
        UUID next = rows.draftVersion(template, 2);
        rows.stage(next, 1);
        rows.publish(next);

        assertRefused(() -> jdbcTemplate.update("UPDATE annual_brief SET template_version_id = ? WHERE id = ?", next, brief));
    }

    @Test
    void aPublishedBriefCannotBeUnpublished() {
        UUID brief = published(2027);

        assertRefused(() -> jdbcTemplate.update(
                "UPDATE annual_brief SET status = 'DRAFT', published_at = NULL WHERE id = ?", brief));
    }

    @Test
    void aPublishedBriefCannotBeDeleted() {
        UUID brief = published(2027);

        assertRefused(() -> jdbcTemplate.update("DELETE FROM annual_brief WHERE id = ?", brief));
    }

    @Test
    void aPublishedBriefsRuleWordingCanBeCorrected() {
        UUID brief = published(2027);
        UUID rule = jdbcTemplate.queryForObject("SELECT id FROM brief_rule WHERE brief_id = ?", UUID.class, brief);

        jdbcTemplate.update("UPDATE brief_rule SET key = 'Orientation', value = 'Portrait only', source_ref = 'X p. 3' WHERE id = ?", rule);

        assertThat(jdbcTemplate.queryForObject("SELECT key FROM brief_rule WHERE id = ?", String.class, rule))
                .isEqualTo("Orientation");
    }

    @Test
    void aPublishedBriefTakesNoNewRules() {
        UUID brief = published(2027);

        assertRefused(() -> rows.briefRule(brief, 2));
    }

    @Test
    void aPublishedBriefsRulesCannotBeReorderedOrRemoved() {
        UUID brief = published(2027);

        assertRefused(() -> jdbcTemplate.update("UPDATE brief_rule SET ordinal = 9 WHERE brief_id = ?", brief));
    }

    private UUID published(int examYear) {
        UUID brief = rows.brief(template, version, examYear);
        rows.briefRule(brief, 1);
        rows.publishBrief(brief);
        return brief;
    }

    private static void assertRefused(Runnable change) {
        assertThatThrownBy(change::run).isInstanceOf(DataIntegrityViolationException.class);
    }
}
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `cd backend && ./mvnw test -Dtest=BriefGuardTest`
Expected: FAIL. The draft, "can change" and "can be corrected" tests pass; the `…Refused`-style tests fail with "Expecting code to raise a throwable".

- [ ] **Step 3: Append the brief guard to `V7__template_guards.sql`**

```sql
-- Design §6.3 and plan 2A P2-8: a published brief keeps its template, version, exam year and SEC code, and
-- its rule rows; its completion date, limits and wording stay correctable because the SEC can move a date.
CREATE FUNCTION guard_annual_brief() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status <> 'DRAFT' THEN
            RAISE EXCEPTION 'brief % is published: it can''t be deleted', OLD.sec_code USING ERRCODE = 'check_violation';
        END IF;
        RETURN OLD;
    END IF;

    IF NEW.status = 'PUBLISHED' AND template_version_status(NEW.template_version_id) <> 'PUBLISHED' THEN
        RAISE EXCEPTION 'brief % can''t be published on a template version that isn''t published', NEW.sec_code
            USING ERRCODE = 'check_violation';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'PUBLISHED'
       AND (NEW.status <> 'PUBLISHED'
            OR NEW.template_id <> OLD.template_id
            OR NEW.template_version_id <> OLD.template_version_id
            OR NEW.exam_year <> OLD.exam_year
            OR NEW.sec_code <> OLD.sec_code) THEN
        RAISE EXCEPTION 'brief % is published: its template, version, year, code and status are fixed', OLD.sec_code
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER annual_brief_guard BEFORE INSERT OR UPDATE OR DELETE ON annual_brief
    FOR EACH ROW EXECUTE FUNCTION guard_annual_brief();

CREATE FUNCTION brief_status(p_brief_id uuid) RETURNS text
    LANGUAGE sql STABLE AS $$ SELECT status FROM annual_brief WHERE id = p_brief_id $$;

CREATE FUNCTION refuse_frozen_brief_rules() RETURNS trigger
    LANGUAGE plpgsql AS $$
DECLARE
    v_old_status text;
    v_new_status text;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old_status := brief_status(OLD.brief_id);
    END IF;
    IF TG_OP IN ('UPDATE', 'INSERT') THEN
        v_new_status := brief_status(NEW.brief_id);
    END IF;

    IF TG_OP = 'UPDATE' AND v_old_status = 'PUBLISHED' AND OLD.brief_id = NEW.brief_id
       AND (to_jsonb(NEW) - TG_ARGV) = (to_jsonb(OLD) - TG_ARGV) THEN
        RETURN NEW;
    END IF;

    IF coalesce(v_old_status, 'DRAFT') <> 'DRAFT' OR coalesce(v_new_status, 'DRAFT') <> 'DRAFT' THEN
        RAISE EXCEPTION '% on brief_rule: the brief is published, so only rule wording can change', TG_OP
            USING ERRCODE = 'check_violation';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER brief_rule_frozen BEFORE INSERT OR UPDATE OR DELETE ON brief_rule
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_brief_rules('key', 'value', 'source_ref', 'created_at');
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd backend && ./mvnw test -Dtest='BriefGuardTest,TemplateStructureGuardTest,TemplateSchemaTest'`
Expected: PASS.

- [ ] **Step 5: Run `make verify`**

Run: `make verify`
Expected: `verify: all checks passed`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V7__template_guards.sql \
        backend/src/test/java/ie/coursework/components/adapter/persistence/BriefGuardTest.java
git commit -m "Keep a published brief's template, year, code and rules fixed while its dates stay correctable"
```

---

## Task 4: Docs

**Files:**
- Modify: `docs/ARCHITECTURE.md` §5, `CLAUDE.md` (Backend conventions), `docs/PILOT-ROADMAP.md` §1 and §8.2, `docs/HANDOFF.md`

- [ ] **Step 1: `docs/ARCHITECTURE.md` §5** — after the "Tables so far" bullet, add:

```markdown
- Content tables (`V6__templates_and_briefs.sql`): `component_template` → `template_version` → `template_stage`, `template_section`, `template_mark_band`, `template_checkpoint`, `template_prompt`, and the link tables `template_section_stage` and `template_mark_band_section`; `annual_brief` (pins a template version) and `brief_rule`. Rows below a version carry `version_id` and reference their parent by `(id, version_id)`, so nothing crosses versions.
- **A published version's structure is frozen by trigger** (`V7__template_guards.sql`). Each table's trigger names its correctable text columns; any other change, insert or delete on a PUBLISHED or RETIRED version raises `check_violation`. Fix wording with an UPDATE in a new content migration; change structure by adding a new version. A published brief keeps its template, version, year, code and rule rows, but its completion date, limits and wording can change.
- **Tests that write to content tables roll back** (`@Transactional` on the class, `support/TemplateRows` for rows): the reset preserves content tables, so anything a test leaves there leaks into every later test. `ContentResetPolicyTest` fails if a template or brief table isn't in `PRESERVED_TABLES`.
```

- [ ] **Step 2: `CLAUDE.md` Backend conventions** — add one bullet:

```markdown
- Content tables (`template_*`, `component_template`, `annual_brief`, `brief_rule`) survive the test reset. A test that inserts into them is `@Transactional` so it rolls back. Correct published content with UPDATEs of text columns; structure changes need a new template version (the V7 triggers refuse anything else).
```

- [ ] **Step 3: `docs/PILOT-ROADMAP.md`** — in §1 set 2A's row to "built" with the date, and in §8.2 under the 2A row add "Plan: `docs/superpowers/plans/2026-09-16-pilot-2a-template-schema.md`". Add the plan to the "Detailed plans so far" table if it isn't there.

- [ ] **Step 4: `docs/HANDOFF.md`** — rewrite "Where things are" to say 2A is built, with the backend test count from `make verify`.

- [ ] **Step 5: Commit**

```bash
git add docs/ARCHITECTURE.md CLAUDE.md docs/PILOT-ROADMAP.md docs/HANDOFF.md
git commit -m "Record the template schema and its guards in the docs"
```

---

## Gate 2A

- [ ] `make verify` green
- [ ] Every structural table has a "refused" test and at least one "text correction allowed" test covers it
- [ ] `ContentResetPolicyTest` passes
- [ ] `/code-review` on the branch; PR `pilot/2a-template-schema` → `pilotMain` (Tim opens and merges)
