package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.StageNote;
import ie.coursework.shared.persistence.Timestamps;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Every method is keyed on the component, so a note is only ever reached through a component already in scope. */
@Repository
public class StageNoteRepository {

    private final JdbcClient jdbc;

    public StageNoteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The component's notes by stage. */
    public Map<UUID, StageNote> forComponent(UUID componentId) {
        Map<UUID, StageNote> notes = new LinkedHashMap<>();
        jdbc.sql("SELECT template_stage_id, text, updated_at FROM stage_note WHERE instance_id = :component")
                .param("component", componentId)
                .query(rs -> {
                    UUID stage = rs.getObject("template_stage_id", UUID.class);
                    notes.put(stage, new StageNote(stage, rs.getString("text"), rs.getObject("updated_at", OffsetDateTime.class).toInstant()));
                });
        return notes;
    }

    public StageNote set(UUID componentId, UUID stageId, String text, Instant now) {
        jdbc.sql("""
                INSERT INTO stage_note (instance_id, template_stage_id, text, updated_at)
                VALUES (:component, :stage, :text, :now)
                ON CONFLICT (instance_id, template_stage_id)
                DO UPDATE SET text = EXCLUDED.text, updated_at = EXCLUDED.updated_at
                """).param("component", componentId).param("stage", stageId).param("text", text)
                .param("now", Timestamps.utc(now))
                .update();
        return new StageNote(stageId, text, now);
    }

    public void clear(UUID componentId, UUID stageId) {
        jdbc.sql("DELETE FROM stage_note WHERE instance_id = :component AND template_stage_id = :stage")
                .param("component", componentId).param("stage", stageId)
                .update();
    }
}
