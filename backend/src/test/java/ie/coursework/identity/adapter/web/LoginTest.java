package ie.coursework.identity.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.TestAccounts;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class LoginTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestAccounts accounts;

    private String loginBody(String username, String password) {
        return "{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password);
    }

    @Test
    void correctCredentialsStartASessionAndReturnTheAccount() throws Exception {
        UUID userId = accounts.user("aoife.b");
        ApiSession browser = new ApiSession(mockMvc);

        browser.post("/api/v1/auth/login", loginBody("aoife.b", TestAccounts.PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(userId.toString()))
                .andExpect(jsonPath("$.username").value("aoife.b"))
                .andExpect(jsonPath("$.mustChangePassword").value(false));

        assertThat(browser.cookie("SESSION")).isPresent();
        browser.get("/api/v1/auth/me").andExpect(status().isOk());
    }

    @Test
    void theUsernameIsCaseInsensitive() throws Exception {
        accounts.user("aoife.b");

        new ApiSession(mockMvc).post("/api/v1/auth/login", loginBody("  Aoife.B ", TestAccounts.PASSWORD))
                .andExpect(status().isOk());
    }

    @Test
    void wrongPasswordUnknownUserAndDisabledUserAllGetTheSameAnswer() throws Exception {
        UUID disabled = accounts.user("disabled.user");
        accounts.disable(disabled, jdbcTemplate);
        accounts.user("aoife.b");

        String wrongPassword = new ApiSession(mockMvc).post("/api/v1/auth/login", loginBody("aoife.b", "not-the-password"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andReturn().getResponse().getContentAsString();
        String unknownUser = new ApiSession(mockMvc).post("/api/v1/auth/login", loginBody("nobody.here", "whatever-it-is"))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        String disabledUser = new ApiSession(mockMvc).post("/api/v1/auth/login", loginBody("disabled.user", TestAccounts.PASSWORD))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(unknownUser).isEqualTo(wrongPassword);
        assertThat(disabledUser).isEqualTo(wrongPassword);
    }

    @Test
    void aFailedLoginStartsNoSession() throws Exception {
        accounts.user("aoife.b");
        ApiSession browser = new ApiSession(mockMvc);

        browser.post("/api/v1/auth/login", loginBody("aoife.b", "not-the-password"));

        assertThat(browser.cookie("SESSION")).isEmpty();
    }

    @Test
    void anOverlongPasswordIsJustWrongNotAServerError() throws Exception {
        accounts.user("aoife.b");

        new ApiSession(mockMvc).post("/api/v1/auth/login", loginBody("aoife.b", "x".repeat(100)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void signingInAgainRotatesTheSessionId() throws Exception {
        accounts.user("first.user");
        accounts.user("second.user");
        ApiSession browser = new ApiSession(mockMvc).login("first.user", TestAccounts.PASSWORD);
        String before = browser.cookie("SESSION").orElseThrow();

        browser.login("second.user", TestAccounts.PASSWORD);

        assertThat(browser.cookie("SESSION")).isPresent().get().isNotEqualTo(before);
    }

    @Test
    void logoutEndsTheSession() throws Exception {
        accounts.user("aoife.b");
        ApiSession browser = new ApiSession(mockMvc).login("aoife.b", TestAccounts.PASSWORD);

        browser.post("/api/v1/auth/logout").andExpect(status().isNoContent());

        browser.get("/api/v1/auth/me").andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithoutTheCsrfHeaderIsRefused() throws Exception {
        accounts.user("aoife.b");

        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("aoife.b", TestAccounts.PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
    }
}
