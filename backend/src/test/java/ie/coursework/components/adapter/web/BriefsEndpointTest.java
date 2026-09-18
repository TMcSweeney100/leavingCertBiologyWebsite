package ie.coursework.components.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class BriefsEndpointTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    @BeforeEach
    void world() {
        fixtures.world();
    }

    @Test
    void listsTheSubjectsPublishedBriefs() throws Exception {
        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .get("/api/v1/briefs?subjectCode=BIOLOGY")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].secCode").value("2027L025C2EL"))
                .andExpect(jsonPath("$[0].examYear").value(2027))
                .andExpect(jsonPath("$[0].title").value("Biology in Practice Investigation"))
                .andExpect(jsonPath("$[0].topicTitle").value("Membranes, Osmosis, Food Preservation"))
                .andExpect(jsonPath("$[0].completionDate").value("2027-02-26"));
    }

    @Test
    void anotherYearOrUnknownSubjectIsAnEmptyList() throws Exception {
        ApiSession teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);

        teacher.get("/api/v1/briefs?subjectCode=BIOLOGY&examYear=2028").andExpect(jsonPath("$").isEmpty());
        teacher.get("/api/v1/briefs?subjectCode=GEOGRAPHY").andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void needsASession() throws Exception {
        new ApiSession(mockMvc).get("/api/v1/briefs?subjectCode=BIOLOGY").andExpect(status().isUnauthorized());
    }

    @Test
    void aMissingSubjectIsAValidationError() throws Exception {
        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .get("/api/v1/briefs")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("subjectCode"));
    }

    @Test
    void aMalformedYearIsAValidationErrorAndAMalformedIdIsNotFound() throws Exception {
        ApiSession teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
        teacher.get("/api/v1/briefs?subjectCode=BIOLOGY&examYear=soon").andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        // An id that can't exist is indistinguishable from one outside your scope (design §9).
        teacher.get("/api/v1/components/not-a-uuid").andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        teacher.get("/api/v1/classes/not-a-uuid").andExpect(status().isNotFound());
    }
}
