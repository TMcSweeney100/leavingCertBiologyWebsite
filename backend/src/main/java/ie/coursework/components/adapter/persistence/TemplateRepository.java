package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.TemplateStage;
import java.sql.ResultSet;
import java.sql.SQLException;
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
        jdbc.sql("""
                SELECT DISTINCT ON (stage_id) stage_id, text FROM template_checkpoint
                WHERE version_id = :version ORDER BY stage_id, ordinal
                """).param("version", versionId)
                .query(rs -> {
                    texts.put(rs.getObject("stage_id", UUID.class), rs.getString("text"));
                });
        return texts;
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
