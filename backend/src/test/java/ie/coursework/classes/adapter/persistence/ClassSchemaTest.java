package ie.coursework.classes.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class ClassSchemaTest extends PostgresIntegrationTest {

    @Test
    void classAndEnrolmentTablesExist() {
        List<String> tables = jdbcTemplate.queryForList(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'", String.class);

        assertThat(tables).contains("class_group", "enrolment");
    }

    @Test
    void aJoinCodeMustUseTheUnambiguousAlphabet() {
        assertThatThrownBy(() -> insertClass("ABCD01IL", "2026-12-01T00:00:00Z"))
                .isInstanceOf(DataIntegrityViolationException.class);
        insertClass("ABCDEFGH", "2026-12-01T00:00:00Z");
    }

    @Test
    void aJoinCodeAndItsExpiryAreSetTogetherOrNotAtAll() {
        assertThatThrownBy(() -> insertClass("ABCDEFGH", null)).isInstanceOf(DataIntegrityViolationException.class);
        insertClass(null, null);
    }

    @Test
    void joinCodesAreUniqueAcrossSchools() {
        insertClass("ABCDEFGH", "2026-12-01T00:00:00Z");

        assertThatThrownBy(() -> insertClass("ABCDEFGH", "2026-12-01T00:00:00Z"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void levelAndYearGroupAndStatusAreConstrained() {
        UUID classId = insertClass(null, null);
        UUID student = insertUser();

        assertThatThrownBy(() -> jdbcTemplate.update(
                "UPDATE class_group SET level = 'FOUNDATION' WHERE id = ?", classId))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "UPDATE class_group SET year_group = 4 WHERE id = ?", classId))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO enrolment (class_group_id, student_user_id, status, requested_at) VALUES (?, ?, 'WAITING', now())",
                classId, student))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aStudentHasOneEnrolmentRowPerClass() {
        UUID classId = insertClass(null, null);
        UUID student = insertUser();
        jdbcTemplate.update(
                "INSERT INTO enrolment (class_group_id, student_user_id, status, requested_at) VALUES (?, ?, 'PENDING', now())",
                classId, student);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO enrolment (class_group_id, student_user_id, status, requested_at) VALUES (?, ?, 'PENDING', now())",
                classId, student))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private UUID insertClass(String joinCode, String expiresAt) {
        UUID school = jdbcTemplate.queryForObject(
                "INSERT INTO school (name, roll_number) VALUES ('S', ?) RETURNING id", UUID.class,
                UUID.randomUUID().toString().substring(0, 6));
        UUID subject = jdbcTemplate.queryForObject("SELECT id FROM subject WHERE code = 'BIOLOGY'", UUID.class);
        UUID owner = insertUser();
        return jdbcTemplate.queryForObject("""
                INSERT INTO class_group (school_id, subject_id, name, year_group, academic_year, owner_user_id,
                                         join_code, join_code_expires_at)
                VALUES (?, ?, '6A', 6, '2026/27', ?, ?, CAST(? AS timestamptz)) RETURNING id
                """, UUID.class, school, subject, owner, joinCode, expiresAt);
    }

    private UUID insertUser() {
        return jdbcTemplate.queryForObject(
                "INSERT INTO app_user (first_name, last_name) VALUES ('A', 'B') RETURNING id", UUID.class);
    }
}
