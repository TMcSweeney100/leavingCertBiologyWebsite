package ie.coursework.timeline.adapter.web;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
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
class PersonalItemsTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    private ClassFixtures.World world;
    private ApiSession student;

    @BeforeEach
    void signIn() throws Exception {
        world = fixtures.world();
        student = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);
    }

    @Test
    void addsAnItemLabelledByAClassTheStudentIsIn() throws Exception {
        student.post("/api/v1/me/personal-items", item("Biology class test", "2026-10-23", "TEST", world.class1().toString()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Biology class test"))
                .andExpect(jsonPath("$.kind").value("TEST"))
                .andExpect(jsonPath("$.subjectName").value("Biology"));
        student.post("/api/v1/me/personal-items", item("Driving test", "2026-11-19", "OTHER", null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.classId").value(nullValue()));

        student.get("/api/v1/me/personal-items")
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Biology class test"));
    }

    @Test
    void aClassTheStudentIsntInIsNotFound() throws Exception {
        student.post("/api/v1/me/personal-items", item("Sneaky", "2026-10-23", "TEST", world.classB().toString()))
                .andExpect(status().isNotFound());
        new ApiSession(mockMvc).login(ClassFixtures.REMOVED_STUDENT, TestAccounts.PASSWORD)
                .post("/api/v1/me/personal-items", item("Removed", "2026-10-23", "TEST", world.class1().toString()))
                .andExpect(status().isNotFound());
    }

    @Test
    void editsAndDeletes() throws Exception {
        String body = student.post("/api/v1/me/personal-items", item("CAO", "2026-11-01", "DEADLINE", null))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");

        student.patch("/api/v1/me/personal-items/" + id, item("CAO account", "2026-11-02", "DEADLINE", null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("CAO account"))
                .andExpect(jsonPath("$.dueDate").value("2026-11-02"));
        student.delete("/api/v1/me/personal-items/" + id).andExpect(status().isNoContent());
        student.delete("/api/v1/me/personal-items/" + id).andExpect(status().isNotFound());
    }

    @Test
    void titleDateAndKindAreRequired() throws Exception {
        student.post("/api/v1/me/personal-items", item(" ", "2026-11-01", "OTHER", null))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        student.post("/api/v1/me/personal-items", "{\"title\":\"x\",\"kind\":\"OTHER\"}")
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        student.post("/api/v1/me/personal-items", item("x", "2026-11-01", "PARTY", null))
                .andExpect(status().isBadRequest());
    }

    static String item(String title, String date, String kind, String classId) {
        return "{\"title\":\"%s\",\"dueDate\":\"%s\",\"kind\":\"%s\",\"classId\":%s}".formatted(
                title, date, kind, classId == null ? "null" : "\"" + classId + "\"");
    }
}
