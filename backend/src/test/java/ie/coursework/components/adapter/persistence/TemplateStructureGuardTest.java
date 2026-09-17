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
