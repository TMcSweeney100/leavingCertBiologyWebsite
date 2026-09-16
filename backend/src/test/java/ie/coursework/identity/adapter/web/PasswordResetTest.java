package ie.coursework.identity.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class PasswordResetTest extends PostgresIntegrationTest {

    private static final String NEW_PASSWORD = "a-fresh-start-2026";

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    private String issue(ClassFixtures.World world, java.util.UUID studentId) throws Exception {
        String body = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .post("/api/v1/classes/" + world.class1() + "/students/" + studentId + "/reset-codes")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.matchesPattern("[A-HJKMNP-Z2-9]{8}")))
                .andExpect(jsonPath("$.expiresAt").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        return body.replaceAll(".*\"code\":\"([A-Z0-9]+)\".*", "$1");
    }

    private static String redeem(String username, String code, String password) {
        return "{\"username\":\"%s\",\"code\":\"%s\",\"newPassword\":\"%s\"}".formatted(username, code, password);
    }

    @Test
    void aTeacherIssuesACodeAndTheStudentRedeemsItOnce() throws Exception {
        ClassFixtures.World world = fixtures.world();
        String code = issue(world, world.approvedStudent());
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM password_reset_code WHERE code_hash = ?", Integer.class, code))
                .as("the code is stored hashed").isZero();

        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, code.toLowerCase(), NEW_PASSWORD))
                .andExpect(status().isNoContent());

        new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, NEW_PASSWORD);
        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, code, "another-new-one-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("RESET_CODE_INVALID"));
        assertThat(jdbcTemplate.queryForList("SELECT event_type FROM audit_event WHERE event_type LIKE 'RESET_CODE_%' ORDER BY occurred_at", String.class))
                .containsExactly("RESET_CODE_ISSUED", "RESET_CODE_REDEEMED");
    }

    @Test
    void redeemingEndsEveryExistingSessionOfThatStudent() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession oldPhone = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);
        String code = issue(world, world.approvedStudent());

        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, code, NEW_PASSWORD))
                .andExpect(status().isNoContent());

        oldPhone.get("/api/v1/auth/me").andExpect(status().isUnauthorized());
    }

    @Test
    void wrongCodeWrongUserExpiredCodeAndWeakPasswordAreRefused() throws Exception {
        ClassFixtures.World world = fixtures.world();
        String code = issue(world, world.approvedStudent());

        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, "ZZZZZZZZ", NEW_PASSWORD))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("RESET_CODE_INVALID"));
        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.PENDING_STUDENT, code, NEW_PASSWORD))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("RESET_CODE_INVALID"));
        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem("nobody.here", code, NEW_PASSWORD))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("RESET_CODE_INVALID"));
        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, code, "short"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PASSWORD_TOO_SHORT"));

        jdbcTemplate.update("UPDATE password_reset_code SET expires_at = now() - interval '1 minute'");
        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, code, NEW_PASSWORD))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("RESET_CODE_INVALID"));
    }

    @Test
    void issuingAgainInvalidatesTheEarlierCode() throws Exception {
        ClassFixtures.World world = fixtures.world();
        String first = issue(world, world.approvedStudent());
        String second = issue(world, world.approvedStudent());

        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, first, NEW_PASSWORD))
                .andExpect(status().isBadRequest());
        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, second, NEW_PASSWORD))
                .andExpect(status().isNoContent());
    }

    @Test
    void guessingIsThrottledLikeLogin() throws Exception {
        fixtures.world();
        ApiSession attacker = new ApiSession(mockMvc);
        for (int i = 0; i < 5; i++) {
            attacker.post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, "ZZZZZZZ" + (i + 2), NEW_PASSWORD))
                    .andExpect(status().isBadRequest());
        }

        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, "ZZZZZZZ9", NEW_PASSWORD))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("TOO_MANY_ATTEMPTS"));
    }

    @Test
    void aCodeCanOnlyBeIssuedForAStudentInMyClass() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);

        teacher.post("/api/v1/classes/" + world.class1() + "/students/" + world.removedStudent() + "/reset-codes")
                .andExpect(status().isNotFound());
        teacher.post("/api/v1/classes/" + world.class1() + "/students/" + world.pendingStudent() + "/reset-codes")
                .andExpect(status().isCreated());
    }
}
