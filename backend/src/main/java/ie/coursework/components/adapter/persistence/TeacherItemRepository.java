package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.TeacherItem;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class TeacherItemRepository {

    private static final String ACTIVE = """
            SELECT t.id, t.instance_id, t.template_stage_id, t.ordinal, t.text, t.due_date
            FROM teacher_item t JOIN template_stage s ON s.id = t.template_stage_id
            WHERE t.retired_at IS NULL
            """;

    private final JdbcClient jdbc;

    public TeacherItemRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Not retired, in stage order then the order they were added. */
    public List<TeacherItem> active(UUID componentId) {
        return jdbc.sql(ACTIVE + " AND t.instance_id = :id ORDER BY s.ordinal, t.ordinal")
                .param("id", componentId).query(TeacherItemRepository::map).list();
    }

    /** By id within one component, so an item id from another component is not found. */
    public Optional<TeacherItem> findActive(UUID itemId, UUID componentId) {
        return jdbc.sql(ACTIVE + " AND t.id = :item AND t.instance_id = :id")
                .param("item", itemId).param("id", componentId).query(TeacherItemRepository::map).optional();
    }

    public TeacherItem add(UUID componentId, UUID stageId, String text, LocalDate dueDate, Instant now) {
        return jdbc.sql("""
                INSERT INTO teacher_item (instance_id, template_stage_id, ordinal, text, due_date, created_at, updated_at)
                VALUES (:id, :stage,
                        (SELECT coalesce(max(ordinal), 0) + 1 FROM teacher_item WHERE instance_id = :id AND template_stage_id = :stage),
                        :text, :due, :now, :now)
                RETURNING id, instance_id, template_stage_id, ordinal, text, due_date
                """).param("id", componentId).param("stage", stageId).param("text", text.strip())
                .param("due", dueDate, Types.DATE).param("now", Timestamps.utc(now))
                .query(TeacherItemRepository::map).single();
    }

    public void update(UUID itemId, String text, LocalDate dueDate, Instant now) {
        jdbc.sql("UPDATE teacher_item SET text = :text, due_date = :due, updated_at = :now WHERE id = :item")
                .param("text", text.strip()).param("due", dueDate, Types.DATE).param("now", Timestamps.utc(now))
                .param("item", itemId).update();
    }

    public void retire(UUID itemId, Instant now) {
        jdbc.sql("UPDATE teacher_item SET retired_at = :now WHERE id = :item")
                .param("now", Timestamps.utc(now)).param("item", itemId).update();
    }

    private static TeacherItem map(ResultSet rs, int row) throws SQLException {
        return new TeacherItem(
                rs.getObject("id", UUID.class),
                rs.getObject("instance_id", UUID.class),
                rs.getObject("template_stage_id", UUID.class),
                rs.getInt("ordinal"),
                rs.getString("text"),
                rs.getObject("due_date", LocalDate.class));
    }
}
