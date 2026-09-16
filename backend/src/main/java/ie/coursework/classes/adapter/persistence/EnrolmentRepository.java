package ie.coursework.classes.adapter.persistence;

import ie.coursework.classes.domain.Enrolment;
import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class EnrolmentRepository {

    /** A row in the teacher's class list. */
    public record Member(UUID enrolmentId, UUID studentId, String firstName, String lastName, String username,
            EnrolmentStatus status, Instant requestedAt) {}

    /** A row in the student's own class list. */
    public record StudentClass(UUID enrolmentId, UUID classId, String className, String subjectName, String schoolName,
            EnrolmentStatus status) {}

    private static final String COLUMNS = """
            SELECT id, class_group_id, student_user_id, status, requested_at, decided_at, decided_by_user_id
            FROM enrolment
            """;

    private static final RowMapper<Enrolment> MAPPER = EnrolmentRepository::map;

    private final JdbcClient jdbc;

    public EnrolmentRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Creates a PENDING request, or reopens a REMOVED one. A PENDING or APPROVED row is left alone
     * (the caller has already checked the status). Returns the row id either way.
     *
     * <p>Mechanism: the {@code WHERE enrolment.status = 'REMOVED'} guard on the {@code DO UPDATE}
     * means Postgres only performs the update — and only then returns a row from
     * {@code RETURNING id} — when the conflicting row is REMOVED. When it's PENDING or APPROVED,
     * the guard blocks the update, the statement touches zero rows, and {@code RETURNING} comes
     * back empty, which is exactly why the {@code .orElseGet(...)} fallback below re-reads the
     * existing row by a plain SELECT. The guard and the fallback are one mechanism: don't change
     * the WHERE condition, or drop the fallback as a "needless" extra query, without the other —
     * doing either on its own silently breaks this method for the PENDING/APPROVED case.
     */
    public UUID request(UUID classGroupId, UUID studentUserId, Instant now) {
        return jdbc.sql("""
                INSERT INTO enrolment (class_group_id, student_user_id, status, requested_at)
                VALUES (:class, :student, 'PENDING', :now)
                ON CONFLICT ON CONSTRAINT enrolment_unique DO UPDATE
                    SET status = 'PENDING', requested_at = EXCLUDED.requested_at,
                        decided_at = NULL, decided_by_user_id = NULL
                    -- Guard: only REMOVED rows get reopened. A PENDING/APPROVED conflict skips the
                    -- update entirely, so RETURNING yields no row below (see the fallback).
                    WHERE enrolment.status = 'REMOVED'
                RETURNING id
                """)
                .param("class", classGroupId)
                .param("student", studentUserId)
                .param("now", Timestamps.utc(now))
                .query(UUID.class)
                .optional()
                // Empty here means the WHERE guard above blocked the update (row was PENDING or
                // APPROVED, not REMOVED) — re-read the existing row instead of treating it as absent.
                .orElseGet(() -> findByStudent(classGroupId, studentUserId).orElseThrow().id());
    }

    public void decide(UUID enrolmentId, EnrolmentStatus status, UUID decidedByUserId, Instant now) {
        jdbc.sql("""
                UPDATE enrolment SET status = :status, decided_at = :now, decided_by_user_id = :by WHERE id = :id
                """)
                .param("status", status.name())
                .param("now", Timestamps.utc(now))
                .param("by", decidedByUserId)
                .param("id", enrolmentId)
                .update();
    }

    /** Scoped: an enrolment id from another class is not found. */
    public Optional<Enrolment> findInClass(UUID enrolmentId, UUID classGroupId) {
        return jdbc.sql(COLUMNS + " WHERE id = :id AND class_group_id = :class")
                .param("id", enrolmentId)
                .param("class", classGroupId)
                .query(MAPPER)
                .optional();
    }

    public Optional<Enrolment> findByStudent(UUID classGroupId, UUID studentUserId) {
        return jdbc.sql(COLUMNS + " WHERE class_group_id = :class AND student_user_id = :student")
                .param("class", classGroupId)
                .param("student", studentUserId)
                .query(MAPPER)
                .optional();
    }

    /** PENDING and APPROVED members, pending first, then by surname. */
    public List<Member> membersOf(UUID classGroupId) {
        return jdbc.sql("""
                SELECT e.id AS enrolment_id, u.id AS student_id, u.first_name, u.last_name, c.username,
                       e.status, e.requested_at
                FROM enrolment e
                JOIN app_user u ON u.id = e.student_user_id
                JOIN password_credential c ON c.user_id = u.id
                WHERE e.class_group_id = :class AND e.status <> 'REMOVED'
                ORDER BY (e.status = 'PENDING') DESC, u.last_name, u.first_name
                """)
                .param("class", classGroupId)
                .query((rs, row) -> new Member(
                        rs.getObject("enrolment_id", UUID.class),
                        rs.getObject("student_id", UUID.class),
                        rs.getString("first_name"),
                        rs.getString("last_name"),
                        rs.getString("username"),
                        EnrolmentStatus.valueOf(rs.getString("status")),
                        rs.getObject("requested_at", OffsetDateTime.class).toInstant()))
                .list();
    }

    public int pendingCount(UUID classGroupId) {
        return jdbc.sql("SELECT count(*) FROM enrolment WHERE class_group_id = :class AND status = 'PENDING'")
                .param("class", classGroupId)
                .query(Integer.class)
                .single();
    }

    /** The student's PENDING and APPROVED classes. */
    public List<StudentClass> classesOf(UUID studentUserId) {
        return jdbc.sql("""
                SELECT e.id AS enrolment_id, g.id AS class_id, g.name AS class_name, s.name AS subject_name,
                       sc.name AS school_name, e.status
                FROM enrolment e
                JOIN class_group g ON g.id = e.class_group_id
                JOIN subject s ON s.id = g.subject_id
                JOIN school sc ON sc.id = g.school_id
                WHERE e.student_user_id = :student AND e.status <> 'REMOVED'
                ORDER BY s.name, g.name
                """)
                .param("student", studentUserId)
                .query((rs, row) -> new StudentClass(
                        rs.getObject("enrolment_id", UUID.class),
                        rs.getObject("class_id", UUID.class),
                        rs.getString("class_name"),
                        rs.getString("subject_name"),
                        rs.getString("school_name"),
                        EnrolmentStatus.valueOf(rs.getString("status"))))
                .list();
    }

    private static Enrolment map(ResultSet rs, int row) throws SQLException {
        OffsetDateTime decided = rs.getObject("decided_at", OffsetDateTime.class);
        return new Enrolment(
                rs.getObject("id", UUID.class),
                rs.getObject("class_group_id", UUID.class),
                rs.getObject("student_user_id", UUID.class),
                EnrolmentStatus.valueOf(rs.getString("status")),
                rs.getObject("requested_at", OffsetDateTime.class).toInstant(),
                decided == null ? null : decided.toInstant(),
                rs.getObject("decided_by_user_id", UUID.class));
    }
}
