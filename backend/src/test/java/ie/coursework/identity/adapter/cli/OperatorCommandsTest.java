package ie.coursework.identity.adapter.cli;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

class OperatorCommandsTest extends PostgresIntegrationTest {

    @Autowired private OperatorCommands commands;
    @Autowired private PasswordEncoder passwordEncoder;

    private final ByteArrayOutputStream output = new ByteArrayOutputStream();

    private int run(String... args) {
        return commands.run(new DefaultApplicationArguments(args), new PrintStream(output, true, StandardCharsets.UTF_8));
    }

    private String printed() {
        return output.toString(StandardCharsets.UTF_8);
    }

    @Test
    void createsASchool() {
        assertThat(run("operator", "create-school", "--name=North Wicklow ETSS", "--roll=76543A")).isZero();

        assertThat(jdbcTemplate.queryForObject("SELECT name FROM school WHERE roll_number = '76543A'", String.class))
                .isEqualTo("North Wicklow ETSS");
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM audit_event WHERE event_type = 'SCHOOL_CREATED'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void createsAUserWhoMustChangeTheirTemporaryPassword() {
        assertThat(run("operator", "create-user", "--first-name=Katelyn", "--last-name=Hanlon", "--username=K.Hanlon")).isZero();

        String temporary = printed().replaceAll("(?s).*Temporary password \\(shown once\\): (\\S+).*", "$1");
        String hash = jdbcTemplate.queryForObject(
                "SELECT password_hash FROM password_credential WHERE username = 'k.hanlon'", String.class);
        assertThat(passwordEncoder.matches(temporary, hash)).isTrue();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT must_change FROM password_credential WHERE username = 'k.hanlon'", Boolean.class)).isTrue();
    }

    @Test
    void grantsARoleAtASchool() {
        run("operator", "create-school", "--name=North Wicklow ETSS", "--roll=76543A");
        run("operator", "create-user", "--first-name=Katelyn", "--last-name=Hanlon", "--username=k.hanlon");

        assertThat(run("operator", "grant-role", "--username=k.hanlon", "--roll=76543A", "--role=TEACHER")).isZero();

        assertThat(jdbcTemplate.queryForObject("SELECT role FROM user_role", String.class)).isEqualTo("TEACHER");
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM audit_event WHERE event_type = 'ROLE_GRANTED'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void aTakenUsernameIsReportedAndExitsNonZero() {
        run("operator", "create-user", "--first-name=A", "--last-name=B", "--username=k.hanlon");

        assertThat(run("operator", "create-user", "--first-name=C", "--last-name=D", "--username=k.hanlon")).isEqualTo(1);
        assertThat(printed()).contains("error: That username is taken.");
    }

    @Test
    void anUnknownCommandOrMissingOptionPrintsUsage() {
        assertThat(run("operator", "delete-everything")).isEqualTo(2);
        assertThat(run("operator", "create-school", "--name=No roll")).isEqualTo(2);
        assertThat(printed()).contains("usage:");
    }
}
