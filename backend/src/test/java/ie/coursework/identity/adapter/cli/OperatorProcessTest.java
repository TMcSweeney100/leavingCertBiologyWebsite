package ie.coursework.identity.adapter.cli;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.CourseworkApplication;
import ie.coursework.PostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

class OperatorProcessTest extends PostgresIntegrationTest {

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
}
