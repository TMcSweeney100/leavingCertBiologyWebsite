# Pilot 2C — Business Content and 2027 Briefs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Business template and the four final 2027 SEC briefs are published content, with completion dates, limits and formatting rules taken word for word from the briefs and checked against them.

**Architecture:** Two content migrations. `V3__business_template.sql` loads Business (six numbered stages plus the unnumbered Compilation, a shared 6–8 hour estimate for Stages 4 and 5, five sections with suggested word counts, four named mark bands, and the guidelines' prompts including Appendices One and Two). `V4__briefs_2027.sql` loads one `annual_brief` per template, each pinning version 1, with its topic, completion date, limits and the formatting-rules table as `brief_rule` rows. `SourceTextTest` (2B) is extended to the brief fields.

**Tech Stack:** Flyway content migrations, Postgres 18, JUnit 5 + Testcontainers, PDFBox (from 2B).

**Roadmap:** `docs/PILOT-ROADMAP.md` §8.2 2C. **Design:** §4.3–§4.5, §6.3, §7.2–§7.4.

---

## Before you start

- 2B is merged (or branch from `pilot/2b-science-content`): `git checkout -b pilot/2c-business-and-briefs`.
- `make verify` is green, including `SourceTextTest`.
- Read: plan 2B's "Source keys" table and `backend/src/test/java/ie/coursework/content/SourceDocuments.java`; `docs/PILOT-DESIGN.md` §4.3–§4.5 and §7.2–§7.4.
- **The SQL in this plan was checked before the plan was written** (16 Sep 2026): applied on top of 2A and 2B, and every quoted string (242 Business and brief strings, 434 with 2B's) was found on its cited page. If `SourceTextTest` reports a miss, find the truth in the PDF; never reword content to satisfy the test.

**Decisions this plan takes** (proposed; status in roadmap §3 "Phase 2 questions"):

| # | Decision | Where |
|---|---|---|
| P2-16 | **Business prompts attach to the stage the guidelines tie them to:** Stage 1's list (p. 4–5) to Stage 1, Appendix One's SMART questions to Stage 2 ("Appendix One provides student prompt questions to assist in refining the research question", p. 5), Appendix Two's planning questions to Stage 3 (p. 6), the analysis and evaluation lists to Stage 5 (p. 7), and Stage 6's list (p. 8). Appendix Three is a note-taking layout, not questions, and is left for Phase 6's sources record. | `V3` |
| P2-17 | **A prompt's `heading` is the guideline's own lead-in or table label** ("Specific", "Objectives", "In evaluating their findings students may find it useful to consider the following prompts"), with any trailing colon and footnote marker dropped. | `V3` |
| P2-18 | **Business mark bands have names, not letters**, and "References" carries no marks (brief p. 8). Band ↔ section: Introduction → 1; Investigation, Findings, Analysis and Evaluation → 2, 3; Conclusion → 4; Overall Coherence → whole report, with the brief's two sentences on what earns it as criteria. | `V3` |
| P2-19 | **Briefs are PUBLISHED, so teachers can use them.** Whether the 2027 briefs are *live* content for a 6th-year pilot is Q9, a go-live decision; loading them published costs nothing either way (design §7.4). | `V4` |
| P2-20 | **`source_url` stays NULL.** The briefs don't print their own URL, and the plan doesn't guess one. Tim can supply the examinations.ie links (Q-P2-F) and a later content migration sets them. | `V4` |
| P2-21 | **The formatting-rules table is stored row by row in the brief's words**: seven rows, "Section headings" to "Page margins". The margins row's cells are joined with full stops. The table's last row, "Images, tables, graphs: Refer to Section 4", is left out because the brief's limits are stored as fields. Science briefs say section headings are "numbered"; Business says "clearly identified" (design §4.4). | `brief_rule` |
| P2-22 | **A brief's topic is stored as the brief prints it**, paragraphs separated by blank lines, without image captions or acknowledgements. Only Biology prints a topic title ("Membranes, Osmosis, Food Preservation"); the others have `topic_title NULL`. | `annual_brief.topic_*` |

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `backend/src/main/resources/db/content/V3__business_template.sql` | Business template v1 | 1 |
| `backend/src/test/java/ie/coursework/content/BusinessTemplateContentTest.java` | Shape against design §7.2–§7.3 | 1 |
| `backend/src/main/resources/db/content/V4__briefs_2027.sql` | Four briefs and their rules | 2 |
| `backend/src/test/java/ie/coursework/content/BriefContentTest.java` | Dates (§4.3), limits (§4.4), rules, pinned versions | 2 |
| `backend/src/test/java/ie/coursework/content/SourceTextTest.java` | Extended to brief fields | 3 |
| `backend/src/test/java/ie/coursework/shared/config/ContentMigrationsTest.java` | The two migrations applied | 1, 2 |
| docs | Review record | 4 |

---

## Task 1: Load the Business template

**Files:**
- Create: `backend/src/main/resources/db/content/V3__business_template.sql`
- Create: `backend/src/test/java/ie/coursework/content/BusinessTemplateContentTest.java`
- Modify: `backend/src/test/java/ie/coursework/shared/config/ContentMigrationsTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Design §7.2 and §7.3 for Business. */
class BusinessTemplateContentTest extends PostgresIntegrationTest {

    private static final String VERSION = """
            (SELECT v.id FROM template_version v JOIN component_template t ON t.id = v.template_id
             WHERE t.slug = 'business-alive-investigative-study' AND v.version_no = 1)
            """;

    @Test
    void isPublishedForBusinessAtFortyPercentOfTwoHundredMarks() {
        Map<String, Object> row = jdbcTemplate.queryForMap("""
                SELECT t.weighting_percent, t.marks_total, v.status, s.code FROM component_template t
                JOIN template_version v ON v.template_id = t.id JOIN subject s ON s.id = t.subject_id
                WHERE v.id = %s
                """.formatted(VERSION));

        assertThat(row).containsEntry("weighting_percent", 40).containsEntry("marks_total", 200)
                .containsEntry("status", "PUBLISHED").containsEntry("code", "BUSINESS");
    }

    @Test
    void hasSixNumberedStagesThenAnUnnumberedCompilation() {
        List<String> stages = jdbcTemplate.queryForList("""
                SELECT coalesce(label, '(none)') || '|' || name || '|' || hours_min || '-' || hours_max || '|' ||
                       coalesce(hours_group, '-') || '|' || supervised
                FROM template_stage WHERE version_id = %s ORDER BY ordinal
                """.formatted(VERSION), String.class);

        assertThat(stages).containsExactly(
                "Stage 1|Getting Started|2-3|-|false",
                "Stage 2|Developing a question to research|1-2|-|false",
                "Stage 3|Developing a project plan|1-2|-|false",
                "Stage 4|Identifying sources and gathering information and data|6-8|stages-4-5|false",
                "Stage 5|Analysis and evaluation|6-8|stages-4-5|false",
                "Stage 6|Applying learning and drawing conclusions|1-2|-|false",
                "(none)|Compilation of the final report|2-3|-|false");
    }

    @Test
    void hasFiveSectionsWithSuggestedWordCounts() {
        List<String> sections = jdbcTemplate.queryForList("""
                SELECT label || ' ' || name || ' ' || coalesce(suggested_words::text, '-') || ' ' ||
                       cardinality(indicative_content)
                FROM template_section WHERE version_id = %s ORDER BY ordinal
                """.formatted(VERSION), String.class);

        assertThat(sections).containsExactly("1 Introduction 200 3", "2 Investigation and Findings 400 3",
                "3 Analysis and Evaluation 600 3", "4 Conclusions 300 4", "5 References - 1");
    }

    @Test
    void markBandsDontLineUpWithSectionsAndAddUpToTwoHundred() {
        List<String> bands = jdbcTemplate.queryForList("""
                SELECT b.name || '|' || b.marks || '|' || b.whole_report || '|' ||
                       coalesce((SELECT string_agg(s.label, ',' ORDER BY s.ordinal) FROM template_mark_band_section l
                                 JOIN template_section s ON s.id = l.section_id WHERE l.band_id = b.id), '-')
                FROM template_mark_band b WHERE b.version_id = %s ORDER BY b.ordinal
                """.formatted(VERSION), String.class);

        assertThat(bands).containsExactly("Introduction|20|false|1",
                "Investigation, Findings, Analysis and Evaluation|100|false|2,3",
                "Conclusion|30|false|4", "Overall Coherence|50|true|-");
    }

    @Test
    void hasTheDesignsCheckpointsAndNoneForStageSix() {
        List<String> checkpoints = jdbcTemplate.queryForList("""
                SELECT s.ordinal || ' ' || c.basis || ' ' || c.text FROM template_checkpoint c
                JOIN template_stage s ON s.id = c.stage_id WHERE c.version_id = %s ORDER BY s.ordinal
                """.formatted(VERSION), String.class);

        assertThat(checkpoints).containsExactly(
                "1 DESCRIBED Initial ideas discussed with the teacher",
                "2 EXPLICIT Research question discussed with the teacher",
                "3 EXPLICIT Project plan shared with the teacher",
                "4 EXPLICIT Research shared when the teacher asks",
                "5 EXPLICIT Analysis and evaluation shared with the teacher",
                "7 EXPLICIT Final report submitted for review and authentication");
    }

    @Test
    void promptsSitWithTheStagesTheGuidelinesTieThemTo() {
        List<String> counts = jdbcTemplate.queryForList("""
                SELECT s.ordinal || ':' || count(p.id) FROM template_stage s LEFT JOIN template_prompt p ON p.stage_id = s.id
                WHERE s.version_id = %s GROUP BY s.ordinal ORDER BY s.ordinal
                """.formatted(VERSION), String.class);
        List<String> smartHeadings = jdbcTemplate.queryForList("""
                SELECT DISTINCT p.heading FROM template_prompt p JOIN template_stage s ON s.id = p.stage_id
                WHERE p.version_id = %s AND s.ordinal = 2
                """.formatted(VERSION), String.class);

        assertThat(counts).containsExactly("1:5", "2:8", "3:21", "4:0", "5:9", "6:5", "7:0");
        assertThat(smartHeadings).containsExactlyInAnyOrder("Specific", "Measurable", "Achievable", "Relevant", "Timebound");
    }

    @Test
    void theProcessNoteIsAboutMonitoringAndReflectionAcrossStages() {
        String note = jdbcTemplate.queryForObject("SELECT process_note FROM template_version WHERE id = " + VERSION, String.class);

        assertThat(note).contains("reflection is a key aspect across the stages");
    }
}
```

In `ContentMigrationsTest`, add:

```java
    @Test
    void theBusinessTemplateMigrationApplied() {
        Integer applied = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM flyway_content_history WHERE success AND description = 'business template'",
                Integer.class);

        assertThat(applied).isEqualTo(1);
    }
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `cd backend && ./mvnw test -Dtest='BusinessTemplateContentTest,ContentMigrationsTest'`
Expected: FAIL (no Business rows; migration not applied).

- [ ] **Step 3: Write the content migration**

`backend/src/main/resources/db/content/V3__business_template.sql`, exactly as follows (copy, don't retype):

```sql
-- Business Alive Investigative Study template, version 1 (design §4.4, §4.5, §7.2, §7.3).
--
-- Source keys: NCCA-BUS = NCCA guidelines, November 2024, printed page numbers;
--              SEC-2027L033C2EL = final 2027 brief.
-- Every row is checked against those PDFs by SourceTextTest, and read by Tim against the PDFs before merge.

INSERT INTO component_template (subject_id, slug, name, deliverable_type, weighting_percent, marks_total)
SELECT id, 'business-alive-investigative-study', 'Business Alive Investigative Study', 'REPORT', 40, 200
FROM subject WHERE code = 'BUSINESS';

INSERT INTO template_version (template_id, version_no, process_note, process_note_source_ref)
SELECT id, 1,
       'Ongoing monitoring of the process and reflection is a key aspect across the stages of the Investigative Study.',
       'NCCA-BUS p. 4'
FROM component_template WHERE slug = 'business-alive-investigative-study';

CREATE TEMP VIEW business_version AS
SELECT v.id AS version_id
FROM template_version v
JOIN component_template t ON t.id = v.template_id
WHERE t.slug = 'business-alive-investigative-study' AND v.version_no = 1;

-- Stages: names from the brief (p. 5), descriptions and hours from the guidelines. Stages 4 and 5 share one
-- estimate, 6-8 hours (p. 6, p. 7). "Compilation of the final report" has no stage number (P2-2).
INSERT INTO template_stage (version_id, ordinal, label, name, description, hours_min, hours_max, hours_group, source_ref)
SELECT bv.version_id, stage.ordinal, stage.label, stage.name, stage.description,
       stage.hours_min, stage.hours_max, stage.hours_group, 'NCCA-BUS p. ' || stage.page
FROM business_version bv
CROSS JOIN (VALUES
    (1, 'Stage 1', 'Getting Started', 'Having received the brief, students will complete initial background research to inform their understanding and thinking around the theme.', 2, 3, NULL::text, 4),
    (2, 'Stage 2', 'Developing a question to research', 'Having completed their initial background research students will develop a research question.', 1, 2, NULL, 5),
    (3, 'Stage 3', 'Developing a project plan', 'Students should develop a project plan for their study.', 1, 2, NULL, 5),
    (4, 'Stage 4', 'Identifying sources and gathering information and data', 'Students will conduct research to further explore the question they have identified for research.', 6, 8, 'stages-4-5', 6),
    (5, 'Stage 5', 'Analysis and evaluation', 'In stage 5 students will analyse and evaluate the data and information that they have gathered.', 6, 8, 'stages-4-5', 6),
    (6, 'Stage 6', 'Applying learning and drawing conclusions', 'Once students have analysed and evaluated the information and data gathered during the Investigative Study they will be required to apply this learning as part of their conclusion.', 1, 2, NULL, 7),
    (7, NULL, 'Compilation of the final report', 'Students will compile their final report prior to submitting to their teacher for review and authentication before submission to the State Examinations Commission (SEC).', 2, 3, NULL, 8)
) AS stage (ordinal, label, name, description, hours_min, hours_max, hours_group, page);

-- Report structure (brief p. 7): five headings, four with a suggested word count, each with indicative content.
INSERT INTO template_section (version_id, ordinal, label, name, suggested_words, indicative_content, source_ref)
SELECT bv.version_id, section.ordinal, section.ordinal::text, section.name, section.words, section.content,
       'SEC-2027L033C2EL p. 7'
FROM business_version bv
CROSS JOIN (VALUES
    (1, 'Introduction', 200, ARRAY[
        'State your research question',
        'Explain the rationale for choosing this question',
        'Reflect on how you engaged with your project plan']),
    (2, 'Investigation and Findings', 400, ARRAY[
        'Explain the purpose and relevance of the different research methods and sources used appropriate to your research question',
        'Present your research findings in appropriate formats',
        'Consider a variety of perspectives']),
    (3, 'Analysis and Evaluation', 600, ARRAY[
        'Analyse your research findings',
        'Evaluate your research findings',
        'Demonstrate originality and critical thinking throughout your analysis and evaluation']),
    (4, 'Conclusions', 300, ARRAY[
        'Present conclusions justified by the analysis and evaluation',
        'Outline how your planning contributed to the successful completion of the study',
        'Discuss how your perspective evolved as a result of the study',
        'Consider how your findings connect to the real world of business']),
    (5, 'References', NULL::int, ARRAY[
        'Appropriately record the sources of all the information gathered.'])
) AS section (ordinal, name, words, content);

-- Mark allocation (brief p. 8). References has no marks of its own; Overall Coherence covers the whole report.
INSERT INTO template_mark_band (version_id, ordinal, name, marks, whole_report, criteria, source_ref)
SELECT bv.version_id, band.ordinal, band.name, band.marks, band.whole_report, band.criteria, 'SEC-2027L033C2EL p. 8'
FROM business_version bv
CROSS JOIN (VALUES
    (1, 'Introduction', 20, false, ARRAY[]::text[]),
    (2, 'Investigation, Findings, Analysis and Evaluation', 100, false, ARRAY[]::text[]),
    (3, 'Conclusion', 30, false, ARRAY[]::text[]),
    (4, 'Overall Coherence', 50, true, ARRAY[
        'Evidence of planning and reflection should be clear throughout.',
        'Marks are also awarded for logical structure, clarity of expression, originality, effective use of business terminology, and the inclusion of accurate references.'])
) AS band (ordinal, name, marks, whole_report, criteria);

INSERT INTO template_mark_band_section (version_id, band_id, section_id)
SELECT bv.version_id, b.id, s.id
FROM business_version bv
JOIN template_mark_band b ON b.version_id = bv.version_id
JOIN template_section s ON s.version_id = bv.version_id
JOIN (VALUES (1, 1), (2, 2), (2, 3), (3, 4)) AS covers (band, section)
  ON covers.band = b.ordinal AND covers.section = s.ordinal;

-- Checkpoints (design §7.3). Stage 6 has none: the guidelines state nothing for it.
INSERT INTO template_checkpoint (version_id, stage_id, ordinal, text, basis, source_quote, source_ref)
SELECT bv.version_id, stage.id, 1, point.text, point.basis, point.quote, 'NCCA-BUS p. ' || point.page
FROM business_version bv
JOIN (VALUES
    (1, 'Initial ideas discussed with the teacher', 'DESCRIBED', 'Teacher interaction with students at this stage provides an opportunity to familiarise themselves with the students’ initial ideas and to identify any gaps in understanding.', 5),
    (2, 'Research question discussed with the teacher', 'EXPLICIT', 'Students should discuss their proposed question to research with their teacher and the teacher may encourage students to use the student prompt questions to help the student to refine their question.', 5),
    (3, 'Project plan shared with the teacher', 'EXPLICIT', 'Sharing the plan with the teacher is an important step in the ongoing authentication process.', 6),
    (4, 'Research shared when the teacher asks', 'EXPLICIT', 'The teacher can ask for work to be shared by students at regular intervals as part of the ongoing process of authentication of student work.', 6),
    (5, 'Analysis and evaluation shared with the teacher', 'EXPLICIT', 'Sharing this work with the teacher is an important step in the ongoing authentication process.', 7),
    (7, 'Final report submitted for review and authentication', 'EXPLICIT', 'Students will compile their final report prior to submitting to their teacher for review and authentication before submission to the State Examinations Commission (SEC).', 8)
) AS point (stage_ordinal, text, basis, quote, page) ON true
JOIN template_stage stage ON stage.version_id = bv.version_id AND stage.ordinal = point.stage_ordinal;

-- Prompts. The guidelines mark each list "a set of sample prompts which may be used and is not exhaustive".
-- Stage 1 (p. 4, running onto p. 5); Stage 2 from Appendix One (p. 16); Stage 3 from Appendix Two (p. 18);
-- Stage 5 analysis and evaluation (p. 7); Stage 6 (p. 8).
INSERT INTO template_prompt (version_id, stage_id, ordinal, heading, text, source_ref)
SELECT bv.version_id, stage.id, prompt.ordinal, prompt.heading, prompt.text, 'NCCA-BUS p. ' || prompt.page
FROM business_version bv
JOIN (VALUES
    (1, 1, 'Students may find it useful to consider the following prompts', 'What do I already know about the theme within the brief?', 4),
    (1, 2, 'Students may find it useful to consider the following prompts', 'What else do I need to know/ would I like to know about this theme?', 4),
    (1, 3, 'Students may find it useful to consider the following prompts', 'Does this theme link to what I may have learned to date in my Leaving Certificate Business class, to business in the world around me or to other aspects of learning inside or outside school? How?', 4),
    (1, 4, 'Students may find it useful to consider the following prompts', 'How might I learn more about this theme? What resources or sources might be useful for me?', 4),
    (1, 5, 'Students may find it useful to consider the following prompts', 'Where will I store my background research? How might I do this?', 4),

    (2, 1, 'Specific', 'Is my question linked to the theme in the brief? Why and how is it linked? (Your background research might be useful here)', 16),
    (2, 2, 'Specific', 'Is my question clear and focused? Does the question state exactly what I want to answer? Is there anything I could change to make it clearer?', 16),
    (2, 3, 'Measurable', 'Can I find enough information to respond to my question from a range of different sources? Should I use primary and/or secondary sources?', 16),
    (2, 4, 'Measurable', 'Will I be able to access the information I need? If not, should I rethink my question?', 16),
    (2, 5, 'Achievable', 'Where will I find the information I need? What sources might I use and how will I access these sources? Are there sufficient sources of information or data available?', 16),
    (2, 6, 'Relevant', 'Is my question helping me to develop my understanding of the theme within the brief? Is it linked to what I am learning in my Business class or to business in the world around me?', 16),
    (2, 7, 'Timebound', 'Having considered the prompts set out in this table can I use my research question to make a project plan for my investigation?', 16),
    (2, 8, 'Timebound', 'Will I be able to carry out the plan in the time allocated? If not, do I need to reconsider or narrow my question?', 16),

    (3, 1, 'Objectives', 'What is the purpose of my research? What am I aiming to find out?', 18),
    (3, 2, 'Objectives', 'How is this linked to my research question? How is this relevant for business either locally, nationally or internationally? Why is it of interest to me?', 18),
    (3, 3, 'Objectives', 'What are my goals for each stage of my work?', 18),
    (3, 4, 'My role', 'What have I learned previously that might help me?', 18),
    (3, 5, 'My role', 'What will I need to do? What skills will I need in doing this study?', 18),
    (3, 6, 'My role', 'What competencies might I develop in doing this study?', 18),
    (3, 7, 'My role', 'How will I organise my work and keep records? How will I monitor and evaluate my progress?', 18),
    (3, 8, 'Resources', 'What resources will I need to access to answer my research question?', 18),
    (3, 9, 'Resources', 'When will I need access? How will I access these resources?', 18),
    (3, 10, 'Resources', 'Are these resources suitable for the question I have developed? Will they give me a range of perspectives?', 18),
    (3, 11, 'Time schedule', 'What is the time frame for my study? What are the main stages involved in the study? What will I need to do and when?', 18),
    (3, 12, 'Time schedule', 'Have I prepared a plan to make best use of my time?', 18),
    (3, 13, 'Time schedule', 'Have I allowed enough time to complete each stage of the work? How and when will I track my progress?', 18),
    (3, 14, 'Possible risks', 'Have I considered what might go wrong or challenges I might encounter?', 18),
    (3, 15, 'Possible risks', 'How might these risks impact on the progress or completion of my study? How might I overcome these?', 18),
    (3, 16, 'Possible risks', 'How will I identify what is working well?', 18),
    (3, 17, 'Ongoing monitoring and evaluation', 'What is working well? How do I know?', 18),
    (3, 18, 'Ongoing monitoring and evaluation', 'What could be better? How do I know/ What might I do to improve?', 18),
    (3, 19, 'Ongoing monitoring and evaluation', 'How am I progressing in line with my goals and timelines?', 18),
    (3, 20, 'Ongoing monitoring and evaluation', 'Do I need to reconsider my question? Do I need to access additional sources of information?', 18),
    (3, 21, 'Ongoing monitoring and evaluation', 'What are the limitations of my investigative study?', 18),

    (5, 1, 'Students may analyse the information and data they have gathered to identify key findings through', 'breaking down the information and/ or data into smaller parts', 7),
    (5, 2, 'Students may analyse the information and data they have gathered to identify key findings through', 'identifying patterns/ trends/ contradictions in the information and/or data', 7),
    (5, 3, 'Students may analyse the information and data they have gathered to identify key findings through', 'highlighting the most important aspects of the information/data relative to the research question', 7),
    (5, 4, 'In evaluating their findings students may find it useful to consider the following prompts', 'how is the information or data relevant to my research question?', 7),
    (5, 5, 'In evaluating their findings students may find it useful to consider the following prompts', 'is this a reliable source of information? How do I know? How recent is this information or data? Is it up to date?', 7),
    (5, 6, 'In evaluating their findings students may find it useful to consider the following prompts', 'is the information biased or unbiased? Why do I think this? How do I know? What is the purpose of the information or data? Is it based on fact or opinion?', 7),
    (5, 7, 'In evaluating their findings students may find it useful to consider the following prompts', 'are there any alternative explanations or perspectives?', 7),
    (5, 8, 'In evaluating their findings students may find it useful to consider the following prompts', 'what is the information I have gathered telling me? How do I know?', 7),
    (5, 9, 'In evaluating their findings students may find it useful to consider the following prompts', 'are there limitations to the findings? What are they?', 7),

    (6, 1, 'Students may find it useful to consider the following', 'how do my findings respond to my research question and the objectives I set at the outset of my study?', 8),
    (6, 2, 'Students may find it useful to consider the following', 'how do these findings relate to my learning across the Business specification and my learning in the Business classroom?', 8),
    (6, 3, 'Students may find it useful to consider the following', 'how can I apply these findings to the world of business (locally, nationally and/or internationally)? How do they link to the world of business or business-related stories or information in the media?', 8),
    (6, 4, 'Students may find it useful to consider the following', 'how do these findings link to the cross-cutting theme(s) in the specification?', 8),
    (6, 5, 'Students may find it useful to consider the following', 'how have the findings of my Investigative Study influenced my perspective(s)?', 8)
) AS prompt (stage_ordinal, ordinal, heading, text, page) ON true
JOIN template_stage stage ON stage.version_id = bv.version_id AND stage.ordinal = prompt.stage_ordinal;

UPDATE template_version v SET status = 'PUBLISHED', published_at = now()
FROM business_version bv WHERE v.id = bv.version_id;

DROP VIEW business_version;
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd backend && ./mvnw test -Dtest='BusinessTemplateContentTest,ContentMigrationsTest,SourceTextTest,ScienceTemplateContentTest'`
Expected: PASS. `SourceTextTest` now checks the Business rows too (its stage-name mapping already lists the Business brief) and checks 334 strings; the 100 brief strings arrive in Task 3.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/content/V3__business_template.sql \
        backend/src/test/java/ie/coursework/content/BusinessTemplateContentTest.java \
        backend/src/test/java/ie/coursework/shared/config/ContentMigrationsTest.java
git commit -m "Load the Business template: six stages plus Compilation, named mark bands, the guidelines' prompts"
```

---

## Task 2: Load the four 2027 briefs

**Files:**
- Create: `backend/src/main/resources/db/content/V4__briefs_2027.sql`
- Create: `backend/src/test/java/ie/coursework/content/BriefContentTest.java`
- Modify: `backend/src/test/java/ie/coursework/shared/config/ContentMigrationsTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Design §4.3 (completion dates), §4.4 (rules differ by subject), §6.3 (a brief pins a version). */
class BriefContentTest extends PostgresIntegrationTest {

    @ParameterizedTest
    @CsvSource({
            "PHYSICS,   2027L021C2EL, 2026-12-11",
            "BIOLOGY,   2027L025C2EL, 2027-02-26",
            "BUSINESS,  2027L033C2EL, 2027-03-12",
            "CHEMISTRY, 2027L022C2EL, 2027-04-23"})
    void eachBriefsCompletionDateIsTheOneInDesignFourPointThree(String subject, String secCode, LocalDate completion) {
        Map<String, Object> brief = jdbcTemplate.queryForMap("""
                SELECT b.sec_code, b.completion_date, b.status, b.exam_year, v.version_no, v.status AS version_status
                FROM annual_brief b
                JOIN component_template t ON t.id = b.template_id
                JOIN subject s ON s.id = t.subject_id
                JOIN template_version v ON v.id = b.template_version_id
                WHERE s.code = ? AND b.exam_year = 2027
                """, subject);

        assertThat(brief.get("sec_code")).isEqualTo(secCode);
        assertThat(((java.sql.Date) brief.get("completion_date")).toLocalDate()).isEqualTo(completion);
        assertThat(brief).containsEntry("status", "PUBLISHED").containsEntry("exam_year", 2027)
                .containsEntry("version_no", 1).containsEntry("version_status", "PUBLISHED");
    }

    @Test
    void theSciencesAllowTwentyImagesAndBusinessTen() {
        List<String> limits = jdbcTemplate.queryForList("""
                SELECT sec_code || ' ' || word_limit || ' ' || image_limit FROM annual_brief ORDER BY sec_code
                """, String.class);

        assertThat(limits).containsExactly("2027L021C2EL 1500 20", "2027L022C2EL 1500 20",
                "2027L025C2EL 1500 20", "2027L033C2EL 1500 10");
    }

    @Test
    void wordsNotCountedDifferForBusiness() {
        String business = notCounted("2027L033C2EL");
        String biology = notCounted("2027L025C2EL");

        assertThat(biology).contains("in formulae or equations");
        assertThat(business).contains("graphs, diagrams, images").doesNotContain("formulae");
    }

    @Test
    void theSciencesSayFormulaeDontCountAsImagesAndBusinessSaysLabelImages() {
        assertThat(imageNote("2027L022C2EL")).contains("will not be counted toward the image limit");
        assertThat(imageNote("2027L033C2EL")).contains("properly labelled (figure 1, figure 2, etc.)");
    }

    @Test
    void everyBriefHasTheSevenFormattingRulesInOrder() {
        List<String> keys = jdbcTemplate.queryForList("""
                SELECT string_agg(r.key, '|' ORDER BY r.ordinal) FROM brief_rule r GROUP BY r.brief_id
                """, String.class);

        assertThat(keys).hasSize(4).containsOnly("Section headings|Main body text|Text editing features permitted|"
                + "Text editing features not permitted|Page orientation|Page numbering|Page margins");
    }

    @Test
    void scienceHeadingsAreNumberedAndBusinessHeadingsClearlyIdentified() {
        assertThat(headingRule("2027L025C2EL")).startsWith("Each section should be numbered");
        assertThat(headingRule("2027L033C2EL")).startsWith("Each section should be clearly identified");
    }

    @Test
    void onlyBiologyPrintsATopicTitle() {
        List<String> titles = jdbcTemplate.queryForList(
                "SELECT sec_code || ' ' || coalesce(topic_title, '-') FROM annual_brief ORDER BY sec_code", String.class);

        assertThat(titles).containsExactly("2027L021C2EL -", "2027L022C2EL -",
                "2027L025C2EL Membranes, Osmosis, Food Preservation", "2027L033C2EL -");
    }

    @Test
    void aBriefsTitleIsItsTemplatesName() {
        Integer mismatched = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM annual_brief b JOIN component_template t ON t.id = b.template_id WHERE b.title <> t.name
                """, Integer.class);

        assertThat(mismatched).isZero();
    }

    private String notCounted(String code) {
        return jdbcTemplate.queryForObject("SELECT words_not_counted FROM annual_brief WHERE sec_code = ?", String.class, code);
    }

    private String imageNote(String code) {
        return jdbcTemplate.queryForObject("SELECT image_note FROM annual_brief WHERE sec_code = ?", String.class, code);
    }

    private String headingRule(String code) {
        return jdbcTemplate.queryForObject("""
                SELECT r.value FROM brief_rule r JOIN annual_brief b ON b.id = r.brief_id
                WHERE b.sec_code = ? AND r.key = 'Section headings'
                """, String.class, code);
    }
}
```

In `ContentMigrationsTest`, add:

```java
    @Test
    void theTwentyTwentySevenBriefsMigrationApplied() {
        Integer applied = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM flyway_content_history WHERE success AND description = 'briefs 2027'",
                Integer.class);

        assertThat(applied).isEqualTo(1);
    }
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `cd backend && ./mvnw test -Dtest='BriefContentTest,ContentMigrationsTest'`
Expected: FAIL (no briefs).

- [ ] **Step 3: Write the content migration**

`backend/src/main/resources/db/content/V4__briefs_2027.sql`, exactly as follows (copy, don't retype). The topics use `E'…'` strings for their paragraph breaks; a string continued on the next line inherits the `E`.

```sql
-- The four final 2027 SEC briefs (design §4.1, §4.3, §4.4, §7.4). Never the EN-EX sample briefs: their
-- dates are placeholders.
--
-- Source keys: SEC-2027L025C2EL Biology, SEC-2027L022C2EL Chemistry, SEC-2027L021C2EL Physics,
-- SEC-2027L033C2EL Business. Completion date p. 2, formatting rules p. 3, topic p. 6, limits p. 5 (Business)
-- or p. 7 (sciences). Checked against the PDFs by SourceTextTest and BriefContentTest.

INSERT INTO annual_brief (template_id, template_version_id, exam_year, sec_code, title, topic_title, topic_body,
                          completion_date, word_limit, words_not_counted, image_limit, image_note, source_ref)
SELECT t.id, v.id, 2027, brief.sec_code, t.name, brief.topic_title, brief.topic_body,
       brief.completion_date, 1500, brief.words_not_counted, brief.image_limit, brief.image_note,
       'SEC-' || brief.sec_code || ' p. 2'
FROM (VALUES
    ('biology-in-practice-investigation', '2027L025C2EL', DATE '2027-02-26',
     'Membranes, Osmosis, Food Preservation',
     E'Cells have a selectively permeable plasma membrane which can control the movement of substances into and out of the cell. One important substance that moves into and out of cells is water.\n\n'
     'Foods that have a high water content support microbial growth. This can lead to spoilage and decay. One method of food preservation involves the loss of water from microbial cells by osmosis. Preserving food by osmosis relies on placing food in solutions of high solute concentration, such as sugar syrups or salt brines.\n\n'
     'There are many factors (temperature, concentration gradient, surface area, etc.) that affect the rate of osmosis. Knowledge and understanding of these factors and how they affect osmosis can help scientists extend food shelf life and improve food safety.\n\n'
     'Investigate one or more aspects of this topic using the process described in Section 4 of this document.',
     'This word count does not include words used in references, in data tables, in formulae or equations, or as labels.',
     20,
     'To ensure fairness across the different methods, formulae and equations, whether produced using software or handwritten and photographed, will not be counted toward the image limit.'),

    ('chemistry-in-practice-investigation', '2027L022C2EL', DATE '2027-04-23',
     NULL,
     E'Chemical reactions can be classified in a number of ways, including: acid-base, decomposition, redox, combination, displacement, precipitation, etc. These reactions can happen at different speeds; some are instantaneous while others take place over longer periods of time.\n\n'
     'The ability to control the rate of these reactions has wide-ranging impacts across the areas of health, sustainability and technology, from the production and interactions of pharmaceuticals to the rate of electrochemical reactions in battery technology.\n\n'
     'There are a number of factors that are used to control the rate of chemical reactions, including: concentration, surface area, temperature, pressure, the presence of a catalyst, etc. The effects of these factors can be measured directly or indirectly using a variety of methods depending on the chemical and physical changes that take place.\n\n'
     'Investigate one or more aspects of this topic using the process described in Section 4 of this document.',
     'This word count does not include words used in references, in data tables, in formulae or equations, or as labels.',
     20,
     'To ensure fairness across the different methods, formulae and equations, whether produced using software or handwritten and photographed, will not be counted toward the image limit.'),

    ('physics-in-practice-investigation', '2027L021C2EL', DATE '2026-12-11',
     NULL,
     E'Sustainable practices in a domestic setting have led to ways of reducing domestic energy losses, allowing for a comfortable indoor environment with less energy input.\n\n'
     'Investigate one or more aspects of domestic sustainability – energy sources, energy usage and/or energy losses using the process described in Section 4 of this document.',
     'This word count does not include words used in references, in data tables, in formulae or equations, or as labels.',
     20,
     'To ensure fairness across the different methods, formulae and equations, whether produced using software or handwritten and photographed, will not be counted toward the image limit.'),

    ('business-alive-investigative-study', '2027L033C2EL', DATE '2027-03-12',
     NULL,
     E'‘Digitalisation is a major driver of productivity growth through the improvement of process efficiency and the quality of products and services. The growing adoption of technologies is disrupting traditional roles and transforming the world of work.’\n'
     'Department of Enterprise, Tourism and Employment\n'
     'Adapted from www.gov.ie\n\n'
     'You are required to investigate how a work practice that uses digital technology is impacting either employers or employees.\n\n'
     'Support your investigation with appropriate primary and/or secondary data.',
     'This word count does not include words used in references, in data tables, graphs, diagrams, images, or as labels.',
     10,
     'When referring to any specific image in the body of the report, the image must be properly labelled (figure 1, figure 2, etc.).')
) AS brief (slug, sec_code, completion_date, topic_title, topic_body, words_not_counted, image_limit, image_note)
JOIN component_template t ON t.slug = brief.slug
JOIN template_version v ON v.template_id = t.id AND v.version_no = 1;

-- The formatting-rules table (each brief, p. 3), row by row. The margins row's cells are joined with full
-- stops. "Images, tables, graphs: Refer to Section 4" is left out: the limits above are that section.
INSERT INTO brief_rule (brief_id, ordinal, key, value, source_ref)
SELECT b.id, rule.ordinal, rule.key,
       CASE WHEN rule.ordinal = 1 THEN
            CASE WHEN b.sec_code = '2027L033C2EL' THEN 'Each section should be clearly identified and begin on a new page of the report.'
                 ELSE 'Each section should be numbered and begin on a new page of the report.' END
            || ' The heading should use the following font: Arial, black, font size 14 and bold.'
       ELSE rule.value END,
       'SEC-' || b.sec_code || ' p. 3'
FROM annual_brief b
CROSS JOIN (VALUES
    (1, 'Section headings', NULL::text),
    (2, 'Main body text', 'Arial, black, font size 12 with 1.5 line spacing.'),
    (3, 'Text editing features permitted', 'Bold, italics, numbering, and bullets.'),
    (4, 'Text editing features not permitted', 'Coloured text (black text only), highlighted text, different fonts (Arial only).'),
    (5, 'Page orientation', 'Portrait only.'),
    (6, 'Page numbering', 'Bottom-centre of each page.'),
    (7, 'Page margins', 'No work should appear in the margins as it may not be visible to an examiner. Left margin 20 mm. Right margin 20 mm. Top margin 20 mm. Bottom margin 20 mm.')
) AS rule (ordinal, key, value)
WHERE b.exam_year = 2027;

UPDATE annual_brief SET status = 'PUBLISHED', published_at = now() WHERE exam_year = 2027;
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd backend && ./mvnw test -Dtest='BriefContentTest,ContentMigrationsTest,BriefGuardTest'`
Expected: PASS. `BriefGuardTest` (2A) still passes: its test brief uses code `2027L999C2EL` and a `test-science` template, and rolls back.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/content/V4__briefs_2027.sql \
        backend/src/test/java/ie/coursework/content/BriefContentTest.java \
        backend/src/test/java/ie/coursework/shared/config/ContentMigrationsTest.java
git commit -m "Load the four final 2027 briefs with their completion dates, limits and formatting rules"
```

---

## Task 3: Check the brief fields against the briefs

**Files:**
- Modify: `backend/src/test/java/ie/coursework/content/SourceTextTest.java`

- [ ] **Step 1: Extend the test, and watch the new part fail first**

In `SourceTextTest`, replace the hand-written `brief_doc` stage-name mapping with the loaded briefs, and add the brief fields. The whole `quotedContent()` becomes:

```java
    private List<Quoted> quotedContent() {
        List<Quoted> quoted = new ArrayList<>(jdbcTemplate.query("""
                SELECT 'stage description' AS what, source_ref, description AS text FROM template_stage
                UNION ALL SELECT 'process note', process_note_source_ref, process_note FROM template_version
                UNION ALL SELECT 'checkpoint quote', source_ref, source_quote FROM template_checkpoint
                UNION ALL SELECT 'prompt', source_ref, text FROM template_prompt
                UNION ALL SELECT 'prompt heading', source_ref, heading FROM template_prompt WHERE heading IS NOT NULL
                UNION ALL SELECT 'section name', source_ref, name FROM template_section
                UNION ALL SELECT 'section indicative content', source_ref, unnest(indicative_content) FROM template_section
                UNION ALL SELECT 'band name', source_ref, name FROM template_mark_band WHERE name IS NOT NULL
                UNION ALL SELECT 'band criterion', source_ref, unnest(criteria) FROM template_mark_band
                UNION ALL
                SELECT 'stage name', 'SEC-' || b.sec_code || ' p. 5', s.name
                FROM template_stage s JOIN annual_brief b ON b.template_version_id = s.version_id
                UNION ALL SELECT 'brief topic title', 'SEC-' || sec_code || ' p. 6', topic_title FROM annual_brief WHERE topic_title IS NOT NULL
                UNION ALL SELECT 'brief topic line', 'SEC-' || sec_code || ' p. 6', line
                          FROM annual_brief, unnest(string_to_array(topic_body, E'\\n')) AS line WHERE btrim(line) <> ''
                UNION ALL SELECT 'brief words not counted', 'SEC-' || sec_code || ' p. ' || CASE WHEN sec_code = '2027L033C2EL' THEN 5 ELSE 7 END, words_not_counted FROM annual_brief
                UNION ALL SELECT 'brief image note', 'SEC-' || sec_code || ' p. ' || CASE WHEN sec_code = '2027L033C2EL' THEN 5 ELSE 7 END, image_note FROM annual_brief WHERE image_note IS NOT NULL
                UNION ALL SELECT 'brief rule key', source_ref, key FROM brief_rule
                """, (rs, i) -> new Quoted(rs.getString("what"), rs.getString("source_ref"), rs.getString("text"))));
        // A rule's value can join table cells ("Left margin 20 mm. Right margin 20 mm."), so each sentence is
        // checked on its own, without its closing full stop.
        quoted.addAll(jdbcTemplate.query("""
                SELECT 'brief rule value' AS what, r.source_ref, rtrim(part, '.') AS text
                FROM brief_rule r, unnest(regexp_split_to_array(r.value, '(?<=\\.) ')) AS part
                """, (rs, i) -> new Quoted(rs.getString("what"), rs.getString("source_ref"), rs.getString("text"))));
        return quoted;
    }
```

Before replacing it, check the test catches a brief error: in your **local, uncommitted** `V4__briefs_2027.sql`, change Chemistry's `'Portrait only.'`-producing row or a word in its topic, run `./mvnw test -Dtest=SourceTextTest` after the replacement, and confirm the miss is named. Revert with `git checkout`.

The string `E'\\n'` inside a Java text block is `E'\n'` in SQL: a real newline.

- [ ] **Step 2: Run it**

Run: `cd backend && ./mvnw test -Dtest=SourceTextTest`
Expected: PASS, 434 strings.

- [ ] **Step 3: `make verify`**

Expected: `verify: all checks passed`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/test/java/ie/coursework/content/SourceTextTest.java
git commit -m "Check each brief's topic, limits and formatting rules against the brief"
```

---

## Task 4: Review and docs

- [ ] **Step 1: Docs**

- `docs/ARCHITECTURE.md` §5: extend the content-migrations bullet with `V3__business_template.sql` and `V4__briefs_2027.sql` (four published 2027 briefs, each pinning v1).
- `docs/PILOT-ROADMAP.md` §1: 2C built; §8.2 2C row: plan path.
- `docs/HANDOFF.md`: where things are.

- [ ] **Step 2: Content review checklist in the PR description**

```markdown
### Content review: Business template v1 and the 2027 briefs
Read `V3__business_template.sql` and `V4__briefs_2027.sql` beside the PDFs.
- [ ] Business stages, hours (incl. Stages 4+5 together 6-8), descriptions (NCCA-BUS p. 4-8)
- [ ] Business sections, word counts, indicative content, mark bands (brief p. 7-8)
- [ ] Business checkpoints and quotes; prompts incl. Appendix One (p. 16) and Two (p. 18)
- [ ] Each brief: SEC code, completion date (p. 2), formatting rules (p. 3), topic (p. 6), limits (p. 5 or 7)
- [ ] Physics completion date 11 Dec 2026 is right for a 6th-year pilot decision (Q9)
```

Record Tim's review in `docs/HANDOFF.md` under "Gate P2 — content review" with the date.

- [ ] **Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md docs/PILOT-ROADMAP.md docs/HANDOFF.md
git commit -m "Record the Business template and 2027 briefs"
```

---

## Gate 2C

- [ ] `make verify` green, `SourceTextTest` checking 434 strings
- [ ] Each brief's completion date equals design §4.3 (test)
- [ ] Tim has read V3 and V4 against the PDFs (recorded)
- [ ] PR `pilot/2c-business-and-briefs` → `pilotMain`
