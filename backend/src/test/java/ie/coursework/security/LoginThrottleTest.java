package ie.coursework.security;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class LoginThrottleTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestAccounts accounts;

    private static String body(String username, String password) {
        return "{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password);
    }

    @Test
    void theSixthAttemptOnOneUsernameIsRefusedEvenWithTheRightPassword() throws Exception {
        accounts.user("aoife.b");
        ApiSession attacker = new ApiSession(mockMvc);
        for (int i = 0; i < 5; i++) {
            attacker.post("/api/v1/auth/login", body("aoife.b", "wrong-guess-" + i)).andExpect(status().isUnauthorized());
        }

        new ApiSession(mockMvc).post("/api/v1/auth/login", body("aoife.b", TestAccounts.PASSWORD))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("TOO_MANY_ATTEMPTS"));
    }

    @Test
    void anotherUsernameIsUnaffected() throws Exception {
        accounts.user("aoife.b");
        accounts.user("cian.m");
        ApiSession attacker = new ApiSession(mockMvc);
        for (int i = 0; i < 5; i++) {
            attacker.post("/api/v1/auth/login", body("aoife.b", "wrong-guess-" + i));
        }

        new ApiSession(mockMvc).login("cian.m", TestAccounts.PASSWORD);
    }

    @Test
    void aSuccessfulLoginClearsTheUsernameCount() throws Exception {
        accounts.user("aoife.b");
        ApiSession student = new ApiSession(mockMvc);
        for (int i = 0; i < 4; i++) {
            student.post("/api/v1/auth/login", body("aoife.b", "typo-" + i));
        }
        student.login("aoife.b", TestAccounts.PASSWORD);

        for (int i = 0; i < 4; i++) {
            student.post("/api/v1/auth/login", body("aoife.b", "typo-again-" + i)).andExpect(status().isUnauthorized());
        }
    }
}
