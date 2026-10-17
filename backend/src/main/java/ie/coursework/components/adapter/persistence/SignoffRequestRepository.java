package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.RequestOutcome;
import ie.coursework.components.domain.SignoffRequest;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Ready-for-signoff. Called only after a service has scoped the component, the student and the checkpoint; nothing
 * here checks who is asking. Rows are never deleted (V13). Withdrawn rows are never read back (decision R-16).
 */
@Repository
public class SignoffRequestRepository {

    private static final String OPEN = "withdrawn_at IS NULL AND answered_at IS NULL";
    private static final String SELECT = """
            SELECT id, student_user_id, checkpoint_id, asked_at, student_note, answered_at, outcome, teacher_note
            FROM signoff_request
            """;

    private final JdbcClient jdbc;

    public SignoffRequestRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The new row's id, or empty when one was already open (V13's partial index; nothing changed). */
    public Optional<UUID> ask(UUID componentId, UUID studentId, UUID checkpointId, String note, Instant now) {
        return jdbc.sql("""
                INSERT INTO signoff_request (instance_id, student_user_id, checkpoint_id, asked_at, student_note)
                VALUES (:component, :student, :checkpoint, :now, :note)
                ON CONFLICT (instance_id, student_user_id, checkpoint_id) WHERE withdrawn_at IS NULL AND answered_at IS NULL DO NOTHING
                RETURNING id
                """).param("component", componentId).param("student", studentId).param("checkpoint", checkpointId)
                .param("now", Timestamps.utc(now)).param("note", note)
                .query(UUID.class).optional();
    }

    /** The withdrawn row's id, or empty when nothing was open. */
    public Optional<UUID> withdraw(UUID componentId, UUID studentId, UUID checkpointId, Instant now) {
        return jdbc.sql("UPDATE signoff_request SET withdrawn_at = :now WHERE " + scope() + " AND " + OPEN + " RETURNING id")
                .param("component", componentId).param("student", studentId).param("checkpoint", checkpointId)
                .param("now", Timestamps.utc(now)).query(UUID.class).optional();
    }

    /** The answered row's id, or empty when nothing was open. */
    public Optional<UUID> answer(UUID componentId, UUID studentId, UUID checkpointId, UUID teacherId, RequestOutcome outcome,
            String note, Instant now) {
        return jdbc.sql("""
                UPDATE signoff_request SET answered_by_user_id = :teacher, answered_at = :now, outcome = :outcome, teacher_note = :note
                WHERE\s""" + scope() + " AND " + OPEN + " RETURNING id")
                .param("component", componentId).param("student", studentId).param("checkpoint", checkpointId)
                .param("teacher", teacherId).param("now", Timestamps.utc(now)).param("outcome", outcome.name()).param("note", note)
                .query(UUID.class).optional();
    }

    /** Every open request in a component, oldest first: the teacher's queue. */
    public List<SignoffRequest> open(UUID componentId) {
        return jdbc.sql(SELECT + " WHERE instance_id = :component AND " + OPEN + " ORDER BY asked_at, id")
                .param("component", componentId).query(SignoffRequestRepository::map).list();
    }

    /** One student's open and answered requests in a component, newest first. */
    public List<SignoffRequest> forStudent(UUID componentId, UUID studentId) {
        return jdbc.sql(SELECT + """
                 WHERE instance_id = :component AND student_user_id = :student AND withdrawn_at IS NULL
                ORDER BY asked_at DESC, id
                """).param("component", componentId).param("student", studentId).query(SignoffRequestRepository::map).list();
    }

    /** Open requests per class the teacher owns, counting only students still approved in that class. */
    public Map<UUID, Integer> waitingByClass(UUID teacherId) {
        Map<UUID, Integer> counts = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT i.class_group_id, count(*) AS waiting
                FROM signoff_request r
                JOIN component_instance i ON i.id = r.instance_id
                JOIN class_group g ON g.id = i.class_group_id
                JOIN enrolment e ON e.class_group_id = g.id AND e.student_user_id = r.student_user_id AND e.status = 'APPROVED'
                WHERE g.owner_user_id = :teacher AND r.withdrawn_at IS NULL AND r.answered_at IS NULL
                GROUP BY i.class_group_id
                """).param("teacher", teacherId)
                .query((rs, row) -> counts.put(rs.getObject("class_group_id", UUID.class), rs.getInt("waiting"))).list();
        return counts;
    }

    private static String scope() {
        return "instance_id = :component AND student_user_id = :student AND checkpoint_id = :checkpoint";
    }

    private static SignoffRequest map(ResultSet rs, int row) throws SQLException {
        OffsetDateTime answered = rs.getObject("answered_at", OffsetDateTime.class);
        String outcome = rs.getString("outcome");
        return new SignoffRequest(rs.getObject("id", UUID.class), rs.getObject("student_user_id", UUID.class),
                rs.getObject("checkpoint_id", UUID.class), rs.getObject("asked_at", OffsetDateTime.class).toInstant(),
                rs.getString("student_note"), answered == null ? null : answered.toInstant(),
                outcome == null ? null : RequestOutcome.valueOf(outcome), rs.getString("teacher_note"));
    }
}
