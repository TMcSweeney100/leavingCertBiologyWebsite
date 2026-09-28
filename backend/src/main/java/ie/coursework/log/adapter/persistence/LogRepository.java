package ie.coursework.log.adapter.persistence;

import ie.coursework.log.domain.EntryFields;
import ie.coursework.log.domain.EntryKind;
import ie.coursework.log.domain.LogEntry;
import ie.coursework.log.domain.LogRevision;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * Design §6.6. {@code list}, {@code findOwn}, {@code hiddenAt} and {@code visibleHistory} take the student and
 * filter by them. {@code revisions(entryId)}, {@code addRevision} and {@code setVisibility} are keyed by entry id
 * alone: they are called only after LogService.own() has proved the caller owns that entry, and must never be
 * reached with an id that hasn't been through it. Only TeacherLogProjection's caller reads another student's
 * rows, and only after ComponentService has proved the teacher owns the class.
 */
@Repository
public class LogRepository {

    private static final String SELECT = """
            SELECT e.id, e.instance_id, e.kind, e.created_at, e.visible_to_teacher, e.current_revision,
                   r.body, r.fields::text AS fields, r.created_at AS revised_at
            FROM log_entry e
            JOIN log_entry_revision r ON r.entry_id = e.id AND r.revision_no = e.current_revision
            """;

    private final JdbcClient jdbc;
    private final ObjectMapper json;

    public LogRepository(JdbcClient jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Transactional
    public UUID create(UUID componentId, UUID studentId, EntryKind kind, boolean visible, String body, EntryFields fields, Instant now) {
        UUID id = jdbc.sql("""
                INSERT INTO log_entry (instance_id, student_user_id, kind, created_at, visible_to_teacher)
                VALUES (:component, :student, :kind, :now, :visible) RETURNING id
                """).param("component", componentId).param("student", studentId).param("kind", kind.name())
                .param("now", Timestamps.utc(now)).param("visible", visible)
                .query(UUID.class).single();
        insertRevision(id, 1, body, fields, now);
        return id;
    }

    public List<LogEntry> list(UUID componentId, UUID studentId) {
        return jdbc.sql(SELECT + """
                WHERE e.instance_id = :component AND e.student_user_id = :student
                ORDER BY e.created_at DESC, e.id
                """).param("component", componentId).param("student", studentId).query(this::entry).list();
    }

    /** The owner's entry, and only while they're approved in its class (the findForApprovedStudent rule). */
    public Optional<LogEntry> findOwn(UUID entryId, UUID studentId) {
        return jdbc.sql(SELECT + """
                JOIN component_instance i ON i.id = e.instance_id
                JOIN enrolment en ON en.class_group_id = i.class_group_id
                     AND en.student_user_id = e.student_user_id AND en.status = 'APPROVED'
                WHERE e.id = :id AND e.student_user_id = :student
                """).param("id", entryId).param("student", studentId).query(this::entry).optional();
    }

    public List<LogRevision> revisions(UUID entryId) {
        return jdbc.sql("""
                SELECT r.revision_no, r.body, r.fields::text AS fields, r.created_at, e.kind
                FROM log_entry_revision r JOIN log_entry e ON e.id = r.entry_id
                WHERE r.entry_id = :id ORDER BY r.revision_no DESC
                """).param("id", entryId).query(this::revision).list();
    }

    /** Moves current_revision first: the row lock serialises two saves of the same entry. */
    @Transactional
    public int addRevision(UUID entryId, String body, EntryFields fields, Instant now) {
        int number = jdbc.sql("UPDATE log_entry SET current_revision = current_revision + 1 WHERE id = :id RETURNING current_revision")
                .param("id", entryId).query(Integer.class).single();
        insertRevision(entryId, number, body, fields, now);
        return number;
    }

    public boolean setVisibility(UUID entryId, boolean visible, Instant now) {
        int changed = jdbc.sql("UPDATE log_entry SET visible_to_teacher = :visible WHERE id = :id AND visible_to_teacher <> :visible")
                .param("visible", visible).param("id", entryId).update();
        if (changed == 0) {
            return false;
        }
        jdbc.sql("INSERT INTO log_visibility_change (entry_id, visible, changed_at) VALUES (:id, :visible, :now)")
                .param("id", entryId).param("visible", visible).param("now", Timestamps.utc(now)).update();
        return true;
    }

    public Map<UUID, Instant> hiddenAt(UUID componentId, UUID studentId) {
        Map<UUID, Instant> hidden = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT e.id, max(c.changed_at) AS hidden_at
                FROM log_entry e JOIN log_visibility_change c ON c.entry_id = e.id AND NOT c.visible
                WHERE e.instance_id = :component AND e.student_user_id = :student AND NOT e.visible_to_teacher
                GROUP BY e.id
                """).param("component", componentId).param("student", studentId)
                .query(rs -> {
                    hidden.put(rs.getObject("id", UUID.class), rs.getObject("hidden_at", OffsetDateTime.class).toInstant());
                });
        return hidden;
    }

    /** Filtered to visible entries in SQL as well as by type in the projection: hidden history never leaves the database. */
    public Map<UUID, List<LogRevision>> visibleHistory(UUID componentId, UUID studentId) {
        Map<UUID, List<LogRevision>> history = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT r.entry_id, r.revision_no, r.body, r.fields::text AS fields, r.created_at, e.kind
                FROM log_entry_revision r JOIN log_entry e ON e.id = r.entry_id
                WHERE e.instance_id = :component AND e.student_user_id = :student AND e.visible_to_teacher
                ORDER BY r.entry_id, r.revision_no DESC
                """).param("component", componentId).param("student", studentId)
                .query(rs -> {
                    history.computeIfAbsent(rs.getObject("entry_id", UUID.class), k -> new ArrayList<>())
                            .add(revision(rs, 0));
                });
        return history;
    }

    private void insertRevision(UUID entryId, int number, String body, EntryFields fields, Instant now) {
        jdbc.sql("""
                INSERT INTO log_entry_revision (entry_id, revision_no, body, fields, created_at)
                VALUES (:id, :number, :body, CAST(:fields AS jsonb), :now)
                """).param("id", entryId).param("number", number).param("body", body)
                .param("fields", fields == null ? null : json.writeValueAsString(fields), java.sql.Types.VARCHAR)
                .param("now", Timestamps.utc(now)).update();
    }

    private LogEntry entry(ResultSet rs, int row) throws SQLException {
        EntryKind kind = EntryKind.valueOf(rs.getString("kind"));
        int revision = rs.getInt("current_revision");
        return new LogEntry(rs.getObject("id", UUID.class), rs.getObject("instance_id", UUID.class), kind,
                rs.getObject("created_at", OffsetDateTime.class).toInstant(), rs.getBoolean("visible_to_teacher"), revision,
                revision > 1 ? rs.getObject("revised_at", OffsetDateTime.class).toInstant() : null,
                rs.getString("body"), fields(kind, rs.getString("fields")));
    }

    private LogRevision revision(ResultSet rs, int row) throws SQLException {
        EntryKind kind = EntryKind.valueOf(rs.getString("kind"));
        return new LogRevision(rs.getInt("revision_no"), rs.getString("body"), fields(kind, rs.getString("fields")),
                rs.getObject("created_at", OffsetDateTime.class).toInstant());
    }

    private EntryFields fields(EntryKind kind, String value) {
        return value == null || kind.fieldsType() == null ? null : json.readValue(value, kind.fieldsType());
    }
}
