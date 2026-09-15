package ie.coursework.identity.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.TestAccounts;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class PasswordChangeTest extends PostgresIntegrationTest {

    private static final String TEMPORARY = "Temporary-Pass-1";
    private static final String CHOSEN = "my-own-password";

    @Autowired private MockMvc mockMvc;
    @Autowired private TestAccounts accounts;

    private ApiSession signedInWithTemporaryPassword() throws Exception {
        accounts.user("k.hanlon", TEMPORARY, true);
        return new ApiSession(mockMvc).login("k.hanlon", TEMPORARY);
    }

    private static String change(String current, String next) {
        return "{\"currentPassword\":\"%s\",\"newPassword\":\"%s\"}".formatted(current, next);
    }

    @Test
    void untilThePasswordIsChangedOrdinaryEndpointsAreRefused() throws Exception {
        ApiSession teacher = signedInWithTemporaryPassword();

        teacher.get("/api/v1/subjects")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
        teacher.get("/api/v1/auth/me")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true));
    }

    @Test
    void theCurrentPasswordMustBeRight() throws Exception {
        signedInWithTemporaryPassword().post("/api/v1/auth/password", change("not-it-at-all", CHOSEN))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void theNewPasswordMustMeetThePolicy() throws Exception {
        signedInWithTemporaryPassword().post("/api/v1/auth/password", change(TEMPORARY, "short"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PASSWORD_TOO_SHORT"));
    }

    @Test
    void changingItUnlocksTheAccountAndReplacesTheOldPassword() throws Exception {
        ApiSession teacher = signedInWithTemporaryPassword();

        teacher.post("/api/v1/auth/password", change(TEMPORARY, CHOSEN)).andExpect(status().isNoContent());

        teacher.get("/api/v1/subjects").andExpect(status().isOk());
        teacher.get("/api/v1/auth/me").andExpect(jsonPath("$.mustChangePassword").value(false));
        new ApiSession(mockMvc).post("/api/v1/auth/login", "{\"username\":\"k.hanlon\",\"password\":\"%s\"}".formatted(TEMPORARY))
                .andExpect(status().isUnauthorized());
        new ApiSession(mockMvc).login("k.hanlon", CHOSEN);
        Assertions.assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_event WHERE event_type = 'PASSWORD_CHANGED'", Integer.class)).isEqualTo(1);
    }

    @Test
    void changingItSignsOutEveryOtherSession() throws Exception {
        accounts.user("k.hanlon", CHOSEN, false);
        ApiSession laptop = new ApiSession(mockMvc).login("k.hanlon", CHOSEN);
        ApiSession staffroomPc = new ApiSession(mockMvc).login("k.hanlon", CHOSEN);

        laptop.post("/api/v1/auth/password", change(CHOSEN, "a-brand-new-one")).andExpect(status().isNoContent());

        laptop.get("/api/v1/auth/me").andExpect(status().isOk());
        staffroomPc.get("/api/v1/auth/me").andExpect(status().isUnauthorized());
    }
}
