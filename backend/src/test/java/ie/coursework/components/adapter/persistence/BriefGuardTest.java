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
