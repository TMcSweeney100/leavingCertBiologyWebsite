package ie.coursework.classes.adapter.web;

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
class ClassListTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    private String create(String schoolId, String level) {
        return """
                {"schoolId":"%s","subjectCode":"CHEMISTRY","name":"5th Chem","yearGroup":5,"academicYear":"2026/27"%s}
                """.formatted(schoolId, level == null ? "" : ",\"level\":\"" + level + "\"");
    }

    @Test
    void aTeacherCreatesAClassAndGetsAJoinCode() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);

        String body = teacher.post("/api/v1/classes", create(world.schoolA().toString(), "MIXED"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("5th Chem"))
                .andExpect(jsonPath("$.subjectCode").value("CHEMISTRY"))
                .andExpect(jsonPath("$.subjectName").value("Chemistry"))
                .andExpect(jsonPath("$.level").value("MIXED"))
                .andExpect(jsonPath("$.joinCode.code").value(org.hamcrest.Matchers.matchesPattern("[A-HJKMNP-Z2-9]{8}")))
                .andExpect(jsonPath("$.joinCode.expiresAt").isNotEmpty())
                .andExpect(jsonPath("$.enrolments").isEmpty())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("ownerUserId");
    }

    @Test
    void levelIsOptionalAndTheRestIsValidated() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);

        teacher.post("/api/v1/classes", create(world.schoolA().toString(), null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.level").value(org.hamcrest.Matchers.nullValue()));
        teacher.post("/api/v1/classes", """
                {"schoolId":"%s","subjectCode":"CHEMISTRY","name":" ","yearGroup":4,"academicYear":"2026-27"}
                """.formatted(world.schoolA()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[*].field").value(
                        org.hamcrest.Matchers.containsInAnyOrder("name", "yearGroup", "academicYear")));
        teacher.post("/api/v1/classes", create(world.schoolA().toString(), null).replace("CHEMISTRY", "LATIN"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void listsOnlyMyClassesWithPendingCounts() throws Exception {
        ClassFixtures.World world = fixtures.world();

        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD).get("/api/v1/classes")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(world.class1().toString()))
                .andExpect(jsonPath("$[0].subjectName").value("Biology"))
                .andExpect(jsonPath("$[0].yearGroup").value(6))
                .andExpect(jsonPath("$[0].academicYear").value("2026/27"))
                .andExpect(jsonPath("$[0].pendingCount").value(1));
    }

    @Test
    void theRoleIsCheckedAtTheSchoolNamedInTheRequest() throws Exception {
        ClassFixtures.World world = fixtures.world();

        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .post("/api/v1/classes", create(world.schoolB().toString(), null))
                .andExpect(status().isNotFound());
    }
}
