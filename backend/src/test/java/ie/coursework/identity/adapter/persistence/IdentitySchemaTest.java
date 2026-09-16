package ie.coursework.identity.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class IdentitySchemaTest extends PostgresIntegrationTest {

    @Test
    void identityAndSessionTablesExist() {
        List<String> tables = jdbcTemplate.queryForList(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'", String.class);

        assertThat(tables).contains(
                "school", "app_user", "password_credential", "user_role",
                "password_reset_code", "audit_event", "spring_session", "spring_session_attributes");
    }

    @Test
    void appUserHasNoEmailOrDateOfBirth() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'app_user'", String.class);

        assertThat(columns).containsExactlyInAnyOrder("id", "first_name", "last_name", "disabled_at", "created_at");
    }

    @Test
    void usernamesMustAlreadyBeNormalised() {
        UUID user = insertUser();

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO password_credential (user_id, username, password_hash) VALUES (?, 'Aoife.B', 'x')", user))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void usernamesAreUnique() {
        UUID first = insertUser();
        UUID second = insertUser();
        jdbcTemplate.update("INSERT INTO password_credential (user_id, username, password_hash) VALUES (?, 'aoife.b', 'x')", first);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO password_credential (user_id, username, password_hash) VALUES (?, 'aoife.b', 'x')", second))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aRoleIsOneOfThreeAndHeldOncePerSchool() {
        UUID user = insertUser();
        UUID school = jdbcTemplate.queryForObject(
                "INSERT INTO school (name, roll_number) VALUES ('Test School', '99999Z') RETURNING id", UUID.class);
        jdbcTemplate.update("INSERT INTO user_role (user_id, school_id, role) VALUES (?, ?, 'TEACHER')", user, school);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO user_role (user_id, school_id, role) VALUES (?, ?, 'TEACHER')", user, school))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO user_role (user_id, school_id, role) VALUES (?, ?, 'PRINCIPAL')", user, school))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private UUID insertUser() {
        return jdbcTemplate.queryForObject(
                "INSERT INTO app_user (first_name, last_name) VALUES ('Aoife', 'Byrne') RETURNING id", UUID.class);
    }
}
