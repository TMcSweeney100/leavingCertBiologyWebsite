package ie.coursework.classes.adapter.web;

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
class SubjectControllerTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestAccounts accounts;

    @Test
    void listsThePilotSubjectsByName() throws Exception {
        accounts.user("k.hanlon");

        new ApiSession(mockMvc).login("k.hanlon", TestAccounts.PASSWORD)
                .get("/api/v1/subjects")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Biology", "Business", "Chemistry", "Physics")))
                .andExpect(jsonPath("$[0].code").value("BIOLOGY"));
    }

    @Test
    void needsASession() throws Exception {
        new ApiSession(mockMvc).get("/api/v1/subjects").andExpect(status().isUnauthorized());
    }
}
