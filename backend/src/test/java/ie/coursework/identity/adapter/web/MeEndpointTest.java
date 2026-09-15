package ie.coursework.identity.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.identity.adapter.persistence.RoleRepository;
import ie.coursework.identity.domain.Role;
import ie.coursework.support.ApiSession;
import ie.coursework.support.TestAccounts;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class MeEndpointTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestAccounts accounts;
    @Autowired private RoleRepository roles;

    @Test
    void listsEveryRoleTheUserHolds() throws Exception {
        UUID school = accounts.school("North Wicklow ETSS", "76543A");
        UUID yearHead = accounts.userWithRole("year.head", school, Role.TEACHER);
        roles.grant(yearHead, school, Role.SCHOOL_LEADER);

        new ApiSession(mockMvc).login("year.head", TestAccounts.PASSWORD)
                .get("/api/v1/auth/me")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles.length()").value(2))
                .andExpect(jsonPath("$.roles[*].role").value(org.hamcrest.Matchers.containsInAnyOrder("TEACHER", "SCHOOL_LEADER")))
                .andExpect(jsonPath("$.roles[0].schoolName").value("North Wicklow ETSS"));
    }

    @Test
    void aRoleGrantedMidSessionShowsUpOnTheNextRequest() throws Exception {
        UUID school = accounts.school("North Wicklow ETSS", "76543A");
        UUID userId = accounts.user("new.teacher");
        ApiSession browser = new ApiSession(mockMvc).login("new.teacher", TestAccounts.PASSWORD);
        browser.get("/api/v1/auth/me").andExpect(jsonPath("$.roles.length()").value(0));

        roles.grant(userId, school, Role.TEACHER);

        browser.get("/api/v1/auth/me").andExpect(jsonPath("$.roles[0].role").value("TEACHER"));
    }

    @Test
    void aUserDisabledMidSessionIsSignedOutOnTheNextRequest() throws Exception {
        UUID userId = accounts.user("leaver");
        ApiSession browser = new ApiSession(mockMvc).login("leaver", TestAccounts.PASSWORD);

        accounts.disable(userId, jdbcTemplate);

        browser.get("/api/v1/auth/me")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }
}
