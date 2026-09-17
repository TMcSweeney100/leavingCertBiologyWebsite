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
