package ie.coursework.identity.adapter.cli;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.CourseworkApplication;
import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.TestAccounts;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

class OperatorProcessTest extends PostgresIntegrationTest {

    @Autowired private TestAccounts accounts;

    @Test
    void anOperatorInvocationRunsWithoutAWebServerAndReportsItsExitCode() {
        ConfigurableApplicationContext context = CourseworkApplication.start(new String[] {
                "operator", "create-school", "--name=Process School", "--roll=11111B",
                "--spring.datasource.url=" + POSTGRES.getJdbcUrl(),
                "--spring.datasource.username=" + POSTGRES.getUsername(),
                "--spring.datasource.password=" + POSTGRES.getPassword()});

        try {
            assertThat(context.containsBean("apiFilterChain")).isFalse();
            assertThat(SpringApplication.exit(context)).isZero();
        } finally {
            context.close();
        }
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM school WHERE roll_number = '11111B'", Integer.class))
                .isEqualTo(1);
    }

    /** The operator process has no session repository, so the reset must end sessions without one. */
    @Test
    void aPasswordResetEndsSessionsWithoutAWebServer() {
        UUID userId = accounts.user("k.hanlon");
        jdbcTemplate.update("""
                INSERT INTO spring_session (primary_id, session_id, creation_time, last_access_time,
                                            max_inactive_interval, expiry_time, principal_name)
                VALUES (?, ?, 0, 0, 1800, 9999999999999, ?)
                """, UUID.randomUUID().toString(), UUID.randomUUID().toString(), userId.toString());

        ConfigurableApplicationContext context = CourseworkApplication.start(new String[] {
                "operator", "reset-password", "--username=k.hanlon",
                "--spring.datasource.url=" + POSTGRES.getJdbcUrl(),
                "--spring.datasource.username=" + POSTGRES.getUsername(),
                "--spring.datasource.password=" + POSTGRES.getPassword()});

        try {
            assertThat(SpringApplication.exit(context)).isZero();
        } finally {
            context.close();
        }
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM spring_session", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT must_change FROM password_credential WHERE username = 'k.hanlon'", Boolean.class)).isTrue();
    }
}
