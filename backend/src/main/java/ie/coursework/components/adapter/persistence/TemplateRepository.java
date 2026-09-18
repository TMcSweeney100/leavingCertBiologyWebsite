package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.MarkBand;
import ie.coursework.components.domain.TemplateCheckpoint;
import ie.coursework.components.domain.TemplatePrompt;
import ie.coursework.components.domain.TemplateSection;
import ie.coursework.components.domain.TemplateStage;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
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
        for (TemplateCheckpoint checkpoint : checkpoints(versionId)) {
            texts.putIfAbsent(checkpoint.stageId(), checkpoint.text());
        }
        return texts;
    }

    public List<TemplateSection> sections(UUID versionId) {
        return jdbc.sql("""
                SELECT s.label, s.name, s.suggested_words, s.indicative_content,
                       coalesce(array_agg(l.stage_id ORDER BY st.ordinal) FILTER (WHERE l.stage_id IS NOT NULL), '{}') AS stage_ids
                FROM template_section s
                LEFT JOIN template_section_stage l ON l.section_id = s.id
                LEFT JOIN template_stage st ON st.id = l.stage_id
                WHERE s.version_id = :version
                GROUP BY s.id ORDER BY s.ordinal
                """).param("version", versionId)
                .query((rs, i) -> new TemplateSection(rs.getString("label"), rs.getString("name"),
                        rs.getObject("suggested_words", Integer.class), strings(rs.getArray("indicative_content")),
                        uuids(rs.getArray("stage_ids"))))
                .list();
    }

    public List<MarkBand> bands(UUID versionId) {
        return jdbc.sql("""
                SELECT b.label, b.name, b.marks, b.whole_report, b.criteria,
                       coalesce(array_agg(s.label ORDER BY s.ordinal) FILTER (WHERE s.id IS NOT NULL), '{}') AS section_labels
                FROM template_mark_band b
                LEFT JOIN template_mark_band_section l ON l.band_id = b.id
                LEFT JOIN template_section s ON s.id = l.section_id
                WHERE b.version_id = :version
                GROUP BY b.id ORDER BY b.ordinal
                """).param("version", versionId)
                .query((rs, i) -> new MarkBand(rs.getString("label"), rs.getString("name"), rs.getInt("marks"),
                        rs.getBoolean("whole_report"), strings(rs.getArray("criteria")), strings(rs.getArray("section_labels"))))
                .list();
    }

    public List<TemplatePrompt> prompts(UUID versionId) {
        return jdbc.sql("""
                SELECT p.stage_id, p.heading, p.text FROM template_prompt p JOIN template_stage s ON s.id = p.stage_id
                WHERE p.version_id = :version ORDER BY s.ordinal, p.ordinal
                """).param("version", versionId)
                .query((rs, i) -> new TemplatePrompt(rs.getObject("stage_id", UUID.class), rs.getString("heading"), rs.getString("text")))
                .list();
    }

    public List<TemplateCheckpoint> checkpoints(UUID versionId) {
        return jdbc.sql("""
                SELECT c.stage_id, c.text FROM template_checkpoint c JOIN template_stage s ON s.id = c.stage_id
                WHERE c.version_id = :version ORDER BY s.ordinal, c.ordinal
                """).param("version", versionId)
                .query((rs, i) -> new TemplateCheckpoint(rs.getObject("stage_id", UUID.class), rs.getString("text")))
                .list();
    }

    public String processNote(UUID versionId) {
        return jdbc.sql("SELECT process_note FROM template_version WHERE id = :version")
                .param("version", versionId).query(String.class).single();
    }

    private static List<String> strings(Array array) throws SQLException {
        return List.of((String[]) array.getArray());
    }

    private static List<UUID> uuids(Array array) throws SQLException {
        return Arrays.stream((Object[]) array.getArray()).map(UUID.class::cast).toList();
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
