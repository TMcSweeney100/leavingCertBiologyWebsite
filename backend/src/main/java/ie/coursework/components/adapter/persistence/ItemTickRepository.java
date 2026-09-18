package ie.coursework.components.adapter.persistence;

import ie.coursework.shared.persistence.Timestamps;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ItemTickRepository {

    private final JdbcClient jdbc;

    public ItemTickRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Set<UUID> doneItems(UUID componentId, UUID studentId) {
        return jdbc.sql("""
                SELECT teacher_item_id FROM item_tick
                WHERE instance_id = :component AND student_user_id = :student AND done_at IS NOT NULL
                """).param("component", componentId).param("student", studentId)
                .query(UUID.class).stream().collect(Collectors.toSet());
    }

    public void set(UUID componentId, UUID studentId, UUID itemId, boolean done, Instant now) {
        jdbc.sql("""
                INSERT INTO item_tick (instance_id, student_user_id, teacher_item_id, done_at, updated_at)
                VALUES (:component, :student, :item, :doneAt, :now)
                ON CONFLICT (student_user_id, teacher_item_id)
                DO UPDATE SET done_at = EXCLUDED.done_at, updated_at = EXCLUDED.updated_at
                """).param("component", componentId).param("student", studentId).param("item", itemId)
                .param("doneAt", done ? Timestamps.utc(now) : null, java.sql.Types.TIMESTAMP_WITH_TIMEZONE)
                .param("now", Timestamps.utc(now))
                .update();
    }
}
