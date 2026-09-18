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
