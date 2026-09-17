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
