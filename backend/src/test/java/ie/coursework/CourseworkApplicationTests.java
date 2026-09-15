package ie.coursework;

import org.junit.jupiter.api.Test;

class CourseworkApplicationTests extends PostgresIntegrationTest {

    @Test
    void contextLoadsAgainstPostgres() {
        // Starting the context runs Flyway against the container, so this fails if the app can't
        // reach Postgres 18 or a migration doesn't apply.
    }
}
