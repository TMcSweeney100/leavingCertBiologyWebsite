package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Design §7.2 and §7.3, for each of the three science templates. Reads only: nothing to roll back. */
class ScienceTemplateContentTest extends PostgresIntegrationTest {

    private static final String VERSION = """
            SELECT v.id FROM template_version v JOIN component_template t ON t.id = v.template_id
            WHERE t.slug = ? AND v.version_no = 1
            """;

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void isPublishedAtFortyPercentOfTwoHundredMarks(String slug) {
        Map<String, Object> row = jdbcTemplate.queryForMap("""
                SELECT t.weighting_percent, t.marks_total, t.deliverable_type, v.status, s.code
                FROM component_template t JOIN template_version v ON v.template_id = t.id
                JOIN subject s ON s.id = t.subject_id WHERE t.slug = ? AND v.version_no = 1
                """, slug);

        assertThat(row).containsEntry("weighting_percent", 40).containsEntry("marks_total", 200)
                .containsEntry("deliverable_type", "REPORT").containsEntry("status", "PUBLISHED")
                .containsEntry("code", slug.substring(0, slug.indexOf('-')).toUpperCase());
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void hasSixStagesWithTheDesignsHoursAndOnlyStageFourSupervised(String slug) {
        List<String> stages = jdbcTemplate.queryForList("""
                SELECT label || '|' || coalesce(hours_min::text, '-') || '-' || hours_max || '|' || supervised
                FROM template_stage WHERE version_id = (%s) ORDER BY ordinal
                """.formatted(VERSION), String.class, slug);

        assertThat(stages).containsExactly(
                "Stage 1|1-2|false", "Stage 2|2-3|false", "Stage 3|2-3|false",
                "Stage 4|1-2|true", "Stage 5|1-2|false", "Stage 6|--4|false");
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void usesTheBriefsStageNames(String slug) {
        String subject = slug.substring(0, 1).toUpperCase() + slug.substring(1, slug.indexOf('-'));
        List<String> names = jdbcTemplate.queryForList(
                "SELECT name FROM template_stage WHERE version_id = (%s) ORDER BY ordinal".formatted(VERSION),
                String.class, slug);

        assertThat(names).containsExactly("Initial Response to the Investigation Brief", "Background Research",
                "Designing and Planning the Experiment", "Conducting the Experiment", "Data Analysis and Conclusions",
                "Finalising the " + subject + " in Practice Investigation Report");
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void hasTheSevenReportSections(String slug) {
        List<String> sections = jdbcTemplate.queryForList(
                "SELECT label || ' ' || name FROM template_section WHERE version_id = (%s) ORDER BY ordinal".formatted(VERSION),
                String.class, slug);

        assertThat(sections).containsExactly("1 Title and Introduction", "2 Background Research",
                "3 Designing and Planning", "4 Conducting the Experiment", "5 Data and Data Analysis",
                "6 Conclusions", "7 References");
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void markBandsAddUpToTheTotalAndBandDCoversTheWholeReport(String slug) {
        List<String> bands = jdbcTemplate.queryForList("""
                SELECT b.label || ' ' || b.marks || ' ' || b.whole_report || ' ' ||
                       coalesce((SELECT string_agg(s.label, ',' ORDER BY s.ordinal) FROM template_mark_band_section l
                                 JOIN template_section s ON s.id = l.section_id WHERE l.band_id = b.id), '-')
                FROM template_mark_band b WHERE b.version_id = (%s) ORDER BY b.ordinal
                """.formatted(VERSION), String.class, slug);
        Integer total = jdbcTemplate.queryForObject(
                "SELECT sum(marks) FROM template_mark_band WHERE version_id = (%s)".formatted(VERSION), Integer.class, slug);

        assertThat(bands).containsExactly("A 50 false 1,2,7", "B 50 false 3,4", "C 50 false 5,6", "D 50 true -");
        assertThat(total).isEqualTo(200);
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void hasTheDesignsSixCheckpointsWithTheirBasis(String slug) {
        List<String> checkpoints = jdbcTemplate.queryForList("""
                SELECT s.ordinal || ' ' || c.basis || ' ' || c.text FROM template_checkpoint c
                JOIN template_stage s ON s.id = c.stage_id WHERE c.version_id = (%s) ORDER BY s.ordinal
                """.formatted(VERSION), String.class, slug);

        assertThat(checkpoints).containsExactly(
                "1 DESCRIBED Initial ideas discussed with the teacher",
                "2 EXPLICIT Investigative log shared with the teacher",
                "3 DESCRIBED Plan discussed with the teacher (feasibility and safety)",
                "4 EXPLICIT Experiment carried out under supervision, in line with the research and planning already shared",
                "5 EXPLICIT Data analysis shared with the teacher",
                "6 EXPLICIT Final report submitted to the teacher");
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void hasPromptsForStagesOneAndFiveOnly(String slug) {
        List<String> counts = jdbcTemplate.queryForList("""
                SELECT s.ordinal || ':' || count(p.id) FROM template_stage s LEFT JOIN template_prompt p ON p.stage_id = s.id
                WHERE s.version_id = (%s) GROUP BY s.ordinal ORDER BY s.ordinal
                """.formatted(VERSION), String.class, slug);

        assertThat(counts).containsExactly("1:5", "2:0", "3:0", "4:0", "5:4", "6:0");
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void sectionsAreNotYetLinkedToStages(String slug) {
        // Plan 2B P2-13, confirmed 16 Sep 2026: no section-to-stage mapping. Delete this test if one is ever loaded.
        Integer links = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM template_section_stage WHERE version_id = (%s)".formatted(VERSION), Integer.class, slug);

        assertThat(links).isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = {"template_stage", "template_section", "template_mark_band", "template_checkpoint", "template_prompt"})
    void everyRowNamesADocumentAndAPage(String table) {
        List<String> refs = jdbcTemplate.queryForList("SELECT source_ref FROM " + table, String.class);

        assertThat(refs).isNotEmpty().allSatisfy(ref -> assertThat(ref).matches(SourceRef.FORMAT));
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void theProcessNoteSaysTheStagesArentLinear(String slug) {
        String note = jdbcTemplate.queryForObject(
                "SELECT process_note FROM template_version WHERE id = (%s)".formatted(VERSION), String.class, slug);

        assertThat(Arrays.asList(note.split(" "))).contains("linear");
        assertThat(note).contains("move backwards and forwards between the stages");
    }
}
