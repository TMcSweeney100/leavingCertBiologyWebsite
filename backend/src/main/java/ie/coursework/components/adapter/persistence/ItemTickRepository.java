package ie.coursework.components.adapter.persistence;

import ie.coursework.shared.persistence.Timestamps;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ItemTickRepository {

    private final JdbcClient jdbc;

    public ItemTickRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Each ticked item and when it was ticked. Unticked rows (done_at null) aren't returned. */
    public Map<UUID, Instant> doneItems(UUID componentId, UUID studentId) {
        Map<UUID, Instant> done = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT teacher_item_id, done_at FROM item_tick
                WHERE instance_id = :component AND student_user_id = :student AND done_at IS NOT NULL
                """).param("component", componentId).param("student", studentId)
                .query(rs -> {
                    done.put(rs.getObject("teacher_item_id", UUID.class),
                            rs.getObject("done_at", OffsetDateTime.class).toInstant());
                });
        return done;
    }

    /** Stage sheet S-15: who has ticked each active item in the component. Unticked rows and retired items aren't returned. */
    public Map<UUID, List<UUID>> tickedBy(UUID componentId) {
        Map<UUID, List<UUID>> ticked = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT t.teacher_item_id, t.student_user_id FROM item_tick t
                JOIN teacher_item i ON i.id = t.teacher_item_id AND i.retired_at IS NULL
                WHERE t.instance_id = :component AND t.done_at IS NOT NULL
                ORDER BY t.teacher_item_id
                """).param("component", componentId)
                .query(rs -> {
                    ticked.computeIfAbsent(rs.getObject("teacher_item_id", UUID.class), k -> new ArrayList<>())
                            .add(rs.getObject("student_user_id", UUID.class));
                });
        return ticked;
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
