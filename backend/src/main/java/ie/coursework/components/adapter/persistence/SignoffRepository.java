package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.Signoff;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Design §6.5. Called only after ProgressService (or ComponentService, for the student's own view) has scoped the
 * component, the student and the checkpoint; nothing here checks who is asking. Rows are never deleted (V12).
 */
@Repository
public class SignoffRepository {

    private static final String SELECT = """
            SELECT s.id, s.student_user_id, s.checkpoint_id, s.signed_off_at, s.revoked_at,
                   CASE WHEN s.revoked_at IS NULL THEN NULL ELSE u.first_name || ' ' || u.last_name END AS revoked_by
            FROM checkpoint_signoff s
            LEFT JOIN app_user u ON u.id = s.revoked_by_user_id
            """;

    private final JdbcClient jdbc;

    public SignoffRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Every live sign-off in a component: the grid's signed-off cells. */
    public List<Signoff> live(UUID componentId) {
        return jdbc.sql(SELECT + " WHERE s.instance_id = :component AND s.revoked_at IS NULL")
                .param("component", componentId).query(SignoffRepository::map).list();
    }

    /** One student's sign-offs in a component, live and revoked, newest first. */
    public List<Signoff> forStudent(UUID componentId, UUID studentId) {
        return jdbc.sql(SELECT + """
                 WHERE s.instance_id = :component AND s.student_user_id = :student
                ORDER BY s.signed_off_at DESC, s.id
                """).param("component", componentId).param("student", studentId).query(SignoffRepository::map).list();
    }

    /** The new row's id, or empty when a live sign-off already existed (V12's partial index; nothing changed). */
    public Optional<UUID> signOff(UUID componentId, UUID studentId, UUID checkpointId, UUID teacherId, Instant now) {
        return jdbc.sql("""
                INSERT INTO checkpoint_signoff (instance_id, student_user_id, checkpoint_id, signed_off_by_user_id, signed_off_at)
                VALUES (:component, :student, :checkpoint, :teacher, :now)
                ON CONFLICT (instance_id, student_user_id, checkpoint_id) WHERE revoked_at IS NULL DO NOTHING
                RETURNING id
                """).param("component", componentId).param("student", studentId).param("checkpoint", checkpointId)
                .param("teacher", teacherId).param("now", Timestamps.utc(now))
                .query(UUID.class).optional();
    }

    /** The revoked row's id, or empty when there was no live sign-off to revoke. Undo and Revoke both land here. */
    public Optional<UUID> revoke(UUID componentId, UUID studentId, UUID checkpointId, UUID teacherId, Instant now) {
        return jdbc.sql("""
                UPDATE checkpoint_signoff SET revoked_by_user_id = :teacher, revoked_at = :now
                WHERE instance_id = :component AND student_user_id = :student AND checkpoint_id = :checkpoint
                  AND revoked_at IS NULL
                RETURNING id
                """).param("component", componentId).param("student", studentId).param("checkpoint", checkpointId)
                .param("teacher", teacherId).param("now", Timestamps.utc(now))
                .query(UUID.class).optional();
    }

    private static Signoff map(ResultSet rs, int row) throws SQLException {
        OffsetDateTime revoked = rs.getObject("revoked_at", OffsetDateTime.class);
        return new Signoff(rs.getObject("id", UUID.class), rs.getObject("student_user_id", UUID.class),
                rs.getObject("checkpoint_id", UUID.class), rs.getObject("signed_off_at", OffsetDateTime.class).toInstant(),
                revoked == null ? null : revoked.toInstant(), rs.getString("revoked_by"));
    }
}
