package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ComponentRepository {

    private final JdbcClient jdbc;

    public ComponentRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID insert(UUID classId, UUID briefId, UUID createdBy) {
        return jdbc.sql("""
                INSERT INTO component_instance (class_group_id, annual_brief_id, created_by_user_id)
                VALUES (:class, :brief, :by) RETURNING id
                """).param("class", classId).param("brief", briefId).param("by", createdBy)
                .query(UUID.class).single();
    }

    public Optional<UUID> idForClass(UUID classId) {
        return jdbc.sql("SELECT id FROM component_instance WHERE class_group_id = :class")
                .param("class", classId).query(UUID.class).optional();
    }

    /** The scope check for every teacher component endpoint: the component's class is this teacher's. */
    public Optional<ComponentInstance> findOwned(UUID componentId, UUID teacherId) {
        return jdbc.sql("""
                SELECT i.id, i.class_group_id, i.annual_brief_id FROM component_instance i
                JOIN class_group g ON g.id = i.class_group_id
                WHERE i.id = :id AND g.owner_user_id = :teacher
                """).param("id", componentId).param("teacher", teacherId)
                .query((rs, row) -> new ComponentInstance(rs.getObject("id", UUID.class),
                        rs.getObject("class_group_id", UUID.class), rs.getObject("annual_brief_id", UUID.class)))
                .optional();
    }

    public Map<UUID, LocalDate> stageDates(UUID componentId) {
        Map<UUID, LocalDate> dates = new LinkedHashMap<>();
        jdbc.sql("SELECT template_stage_id, due_date FROM instance_stage_date WHERE instance_id = :id")
                .param("id", componentId)
                .query(rs -> {
                    dates.put(rs.getObject("template_stage_id", UUID.class), rs.getObject("due_date", LocalDate.class));
                });
        return dates;
    }

    /** The class's dates become exactly {@code dates}; a stage not in the map has no date. */
    public void replaceStageDates(UUID componentId, Map<UUID, LocalDate> dates, Instant now) {
        jdbc.sql("DELETE FROM instance_stage_date WHERE instance_id = :id").param("id", componentId).update();
        dates.forEach((stageId, due) -> jdbc.sql("""
                INSERT INTO instance_stage_date (instance_id, template_stage_id, due_date, updated_at)
                VALUES (:id, :stage, :due, :now)
                """).param("id", componentId).param("stage", stageId).param("due", due, Types.DATE)
                .param("now", Timestamps.utc(now)).update());
    }
}
