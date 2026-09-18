package ie.coursework.timeline.adapter.persistence;

import ie.coursework.shared.persistence.Timestamps;
import ie.coursework.timeline.domain.PersonalItem;
import ie.coursework.timeline.domain.PersonalItemKind;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Design §6.8: private to the student. Every method takes the owner and filters by it; there is
 * deliberately no lookup by id alone. Don't add one, and don't join this table from any other feature.
 */
@Repository
public class PersonalItemRepository {

    private static final String SELECT = """
            SELECT p.id, p.title, p.due_date, p.kind, p.class_group_id, s.name AS subject_name
            FROM personal_item p
            LEFT JOIN class_group g ON g.id = p.class_group_id
            LEFT JOIN subject s ON s.id = g.subject_id
            WHERE p.student_user_id = :owner
            """;

    private final JdbcClient jdbc;

    public PersonalItemRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<PersonalItem> list(UUID owner) {
        return jdbc.sql(SELECT + " ORDER BY p.due_date, p.created_at").param("owner", owner)
                .query(PersonalItemRepository::map).list();
    }

    public Optional<PersonalItem> find(UUID id, UUID owner) {
        return jdbc.sql(SELECT + " AND p.id = :id").param("owner", owner).param("id", id)
                .query(PersonalItemRepository::map).optional();
    }

    public UUID insert(UUID owner, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId, Instant now) {
        return jdbc.sql("""
                INSERT INTO personal_item (student_user_id, title, due_date, kind, class_group_id, created_at, updated_at)
                VALUES (:owner, :title, :due, :kind, :class, :now, :now) RETURNING id
                """).param("owner", owner).param("title", title.strip()).param("due", dueDate)
                .param("kind", kind.name()).param("class", classId).param("now", Timestamps.utc(now))
                .query(UUID.class).single();
    }

    /** False when no item with that id belongs to {@code owner}. */
    public boolean update(UUID id, UUID owner, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId, Instant now) {
        return jdbc.sql("""
                UPDATE personal_item SET title = :title, due_date = :due, kind = :kind, class_group_id = :class, updated_at = :now
                WHERE id = :id AND student_user_id = :owner
                """).param("title", title.strip()).param("due", dueDate).param("kind", kind.name())
                .param("class", classId).param("now", Timestamps.utc(now)).param("id", id).param("owner", owner)
                .update() == 1;
    }

    public boolean delete(UUID id, UUID owner) {
        return jdbc.sql("DELETE FROM personal_item WHERE id = :id AND student_user_id = :owner")
                .param("id", id).param("owner", owner).update() == 1;
    }

    private static PersonalItem map(ResultSet rs, int row) throws SQLException {
        return new PersonalItem(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getObject("due_date", LocalDate.class),
                PersonalItemKind.valueOf(rs.getString("kind")),
                rs.getObject("class_group_id", UUID.class),
                rs.getString("subject_name"));
    }
}
