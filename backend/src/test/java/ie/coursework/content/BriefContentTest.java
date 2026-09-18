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
