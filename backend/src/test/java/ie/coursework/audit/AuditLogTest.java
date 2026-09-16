package ie.coursework.audit;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class AuditLogTest extends PostgresIntegrationTest {

    @Autowired private AuditLog auditLog;

    @Test
    void recordsWhoDidWhatToWhichSubject() {
        UUID actor = jdbcTemplate.queryForObject(
                "INSERT INTO app_user (first_name, last_name) VALUES ('Ms', 'Hanlon') RETURNING id", UUID.class);
        UUID subject = UUID.randomUUID();

        auditLog.record(actor, AuditEventType.ROLE_GRANTED, "user", subject, Map.of("role", "TEACHER"));

        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT actor_user_id, event_type, subject_type, subject_id, details->>'role' AS role, occurred_at"
                        + " FROM audit_event");
        assertThat(row.get("actor_user_id")).isEqualTo(actor);
        assertThat(row.get("event_type")).isEqualTo("ROLE_GRANTED");
        assertThat(row.get("subject_type")).isEqualTo("user");
        assertThat(row.get("subject_id")).isEqualTo(subject);
        assertThat(row.get("role")).isEqualTo("TEACHER");
        assertThat(row.get("occurred_at")).isNotNull();
    }

    @Test
    void theOperatorHasNoUserSoTheActorCanBeEmpty() {
        auditLog.record(null, AuditEventType.SCHOOL_CREATED, "school", UUID.randomUUID(), Map.of());

        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM audit_event WHERE actor_user_id IS NULL", Integer.class))
                .isEqualTo(1);
    }
}
