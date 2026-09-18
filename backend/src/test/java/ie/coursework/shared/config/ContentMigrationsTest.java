package ie.coursework.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Content (templates, briefs, reference data) migrates through its own Flyway instance and history
 * table, after the schema. Every test here runs after PostgresIntegrationTest's reset, so the
 * subjects being present also proves the reset preserves content.
 */
class ContentMigrationsTest extends PostgresIntegrationTest {

    @Test
    void theFourPilotSubjectsAreLoaded() {
        List<String> codes = jdbcTemplate.queryForList("SELECT code FROM subject ORDER BY code", String.class);

        assertThat(codes).containsExactly("BIOLOGY", "BUSINESS", "CHEMISTRY", "PHYSICS");
    }

    @Test
    void contentHasItsOwnHistoryTable() {
        Integer applied = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM flyway_content_history WHERE success AND description = 'subjects'",
                Integer.class);

        assertThat(applied).isEqualTo(1);
    }

    @Test
    void schemaHistoryHoldsOnlySchemaMigrations() {
        List<String> descriptions = jdbcTemplate.queryForList(
                "SELECT description FROM flyway_schema_history WHERE version IS NOT NULL", String.class);

        assertThat(descriptions).contains("subject table").doesNotContain("subjects");
    }

    @Test
    void theScienceTemplatesMigrationApplied() {
        Integer applied = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM flyway_content_history WHERE success AND description = 'science templates'",
                Integer.class);

        assertThat(applied).isEqualTo(1);
    }

    @Test
    void theBusinessTemplateMigrationApplied() {
        Integer applied = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM flyway_content_history WHERE success AND description = 'business template'",
                Integer.class);

        assertThat(applied).isEqualTo(1);
    }

    @Test
    void noMigrationInEitherHistoryFailed() {
        Integer failed = jdbcTemplate.queryForObject(
                "SELECT (SELECT count(*) FROM flyway_schema_history WHERE NOT success)"
                        + " + (SELECT count(*) FROM flyway_content_history WHERE NOT success)",
                Integer.class);

        assertThat(failed).isZero();
    }
}
