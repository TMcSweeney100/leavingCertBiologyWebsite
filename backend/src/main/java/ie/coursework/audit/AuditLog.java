package ie.coursework.audit;

import ie.coursework.shared.persistence.Timestamps;
import java.time.Clock;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Appends to the audit trail. Call it inside the same transaction as the change it records, so a
 * rolled-back change leaves no event behind.
 *
 * <p>{@code details} is for ids and enum names. Never put a password, a reset code, a join code or
 * anything a student wrote in it.
 */
@Component
public class AuditLog {

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public AuditLog(JdbcClient jdbc, ObjectMapper objectMapper, Clock clock) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public void record(UUID actorUserId, AuditEventType type, String subjectType, UUID subjectId, Map<String, ?> details) {
        jdbc.sql("""
                INSERT INTO audit_event (occurred_at, actor_user_id, event_type, subject_type, subject_id, details)
                VALUES (:occurredAt, :actor, :type, :subjectType, :subjectId, CAST(:details AS jsonb))
                """)
                .param("occurredAt", Timestamps.utc(clock.instant()))
                .param("actor", actorUserId)
                .param("type", type.name())
                .param("subjectType", subjectType)
                .param("subjectId", subjectId)
                .param("details", objectMapper.writeValueAsString(details))
                .update();
    }
}
