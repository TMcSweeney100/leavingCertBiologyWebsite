package ie.coursework;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base class for tests that need a real PostgreSQL 18.
 *
 * <p>Singleton container: started once in a static initializer and never stopped, so every
 * subclass in the JVM shares one database. Don't switch this to {@code @Testcontainers} /
 * {@code @Container}: that extension stops the container after the first class, and every later
 * class fails with "Failed to obtain JDBC Connection" — but only in a full build.
 *
 * <p>Before each test, every table is truncated except migration history and migrated content.
 * The reset is by exclusion rather than by a list of app tables on purpose: a new app table is
 * reset without anyone remembering to add it, and a content table someone forgets to preserve
 * fails its content tests loudly instead of leaking rows between tests quietly.
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class PostgresIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18");

    static {
        POSTGRES.start();
    }

    /** Migration history and content tables. Phase 2 adds the template and brief tables here. */
    private static final Set<String> PRESERVED_TABLES =
            Set.of("flyway_schema_history", "flyway_content_history", "subject");

    @Autowired protected JdbcTemplate jdbcTemplate;

    @BeforeEach
    void resetApplicationData() {
        List<String> tables = jdbcTemplate
                .queryForList("SELECT tablename FROM pg_tables WHERE schemaname = 'public'", String.class)
                .stream()
                .filter(table -> !PRESERVED_TABLES.contains(table))
                .toList();

        if (!tables.isEmpty()) {
            jdbcTemplate.execute("TRUNCATE TABLE " + String.join(", ", tables) + " CASCADE");
        }
    }
}
