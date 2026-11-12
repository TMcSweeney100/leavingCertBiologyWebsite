package ie.coursework.identity.adapter.cli;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.TestAccounts;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class OperatorCommandsTest extends PostgresIntegrationTest {

    @Autowired private OperatorCommands commands;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private MockMvc mockMvc;
    @Autowired private TestAccounts accounts;

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
    void createsASchoolWithAShortNameForTheAppHeader() {
        assertThat(run("operator", "create-school", "--name=North Wicklow Educate Together Secondary School",
                "--short-name=North Wicklow ETSS", "--roll=76543A")).isZero();

        assertThat(jdbcTemplate.queryForObject("SELECT short_name FROM school WHERE roll_number = '76543A'", String.class))
                .isEqualTo("North Wicklow ETSS");
    }

    @Test
    void setsTheShortNameOfASchoolThatAlreadyExists() {
        run("operator", "create-school", "--name=North Wicklow Educate Together Secondary School", "--roll=76543A");

        assertThat(run("operator", "set-school-short-name", "--roll=76543A", "--short-name=North Wicklow ETSS")).isZero();

        assertThat(jdbcTemplate.queryForObject("SELECT short_name FROM school WHERE roll_number = '76543A'", String.class))
                .isEqualTo("North Wicklow ETSS");
    }

    @Test
    void settingTheShortNameOfAnUnknownSchoolFails() {
        assertThat(run("operator", "set-school-short-name", "--roll=00000X", "--short-name=Nowhere")).isEqualTo(1);
        assertThat(printed()).contains("error: No school with that roll number.");
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

    @Test
    void resettingAPasswordGivesANewTemporaryOneThatMustBeChanged() {
        accounts.user("k.hanlon");

        assertThat(run("operator", "reset-password", "--username=K.Hanlon")).isZero();

        String temporary = printed().replaceAll("(?s).*Temporary password \\(shown once\\): (\\S+).*", "$1");
        String hash = jdbcTemplate.queryForObject(
                "SELECT password_hash FROM password_credential WHERE username = 'k.hanlon'", String.class);
        assertThat(passwordEncoder.matches(temporary, hash)).isTrue();
        assertThat(passwordEncoder.matches(TestAccounts.PASSWORD, hash)).isFalse();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT must_change FROM password_credential WHERE username = 'k.hanlon'", Boolean.class)).isTrue();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_event WHERE event_type = 'PASSWORD_RESET_BY_OPERATOR'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void resettingAPasswordSignsTheUserOutEverywhere() throws Exception {
        accounts.user("k.hanlon");
        ApiSession signedIn = new ApiSession(mockMvc).login("k.hanlon", TestAccounts.PASSWORD);

        run("operator", "reset-password", "--username=k.hanlon");

        signedIn.get("/api/v1/auth/me")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void resettingAnUnknownUsernameFails() {
        assertThat(run("operator", "reset-password", "--username=nobody")).isEqualTo(1);
        assertThat(printed()).contains("error: No user with that username.");
    }
}
