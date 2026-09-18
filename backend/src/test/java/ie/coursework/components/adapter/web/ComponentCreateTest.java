package ie.coursework.components.adapter.web;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class ComponentCreateTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private ApiSession teacher;

    @BeforeEach
    void signIn() throws Exception {
        world = fixtures.world();
        teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    @Test
    void aNewClassHasNoComponent() throws Exception {
        teacher.get("/api/v1/classes/" + world.class1()).andExpect(jsonPath("$.componentId").value(nullValue()));
    }

    @Test
    void creatingFromTheBriefGivesEveryStageWithoutDates() throws Exception {
        String body = teacher.post("/api/v1/classes/" + world.class1() + "/components",
                        "{\"briefId\":\"%s\"}".formatted(components.briefId(ComponentFixtures.BIOLOGY_2027)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.view").value("TEACHER"))
                .andExpect(jsonPath("$.className").value(ClassFixtures.CLASS1_NAME))
                .andExpect(jsonPath("$.subjectName").value("Biology"))
                .andExpect(jsonPath("$.brief.completionDate").value("2027-02-26"))
                .andExpect(jsonPath("$.stages.length()").value(6))
                .andExpect(jsonPath("$.stages[3].label").value("Stage 4"))
                .andExpect(jsonPath("$.stages[3].name").value("Conducting the Experiment"))
                .andExpect(jsonPath("$.stages[3].supervised").value(true))
                .andExpect(jsonPath("$.stages[3].hoursMin").value(1))
                .andExpect(jsonPath("$.stages[3].checkpoint").value(
                        "Experiment carried out under supervision, in line with the research and planning already shared"))
                .andExpect(jsonPath("$.stages[5].hoursMin").value(nullValue()))
                .andExpect(jsonPath("$.stages[0].dueDate").value(nullValue()))
                .andExpect(jsonPath("$.stages[0].items").isEmpty())
                .andExpect(jsonPath("$.warnings").isEmpty())
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");

        teacher.get("/api/v1/classes/" + world.class1()).andExpect(jsonPath("$.componentId").value(id));
        teacher.get("/api/v1/components/" + id).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
    }

    @Test
    void aSecondComponentForTheSameClassIsRefused() throws Exception {
        components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);

        teacher.post("/api/v1/classes/" + world.class1() + "/components",
                        "{\"briefId\":\"%s\"}".formatted(components.briefId(ComponentFixtures.BIOLOGY_2027)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COMPONENT_ALREADY_EXISTS"));
    }

    @Test
    void anotherSubjectsBriefIsNotFoundForThisClass() throws Exception {
        teacher.post("/api/v1/classes/" + world.class1() + "/components",
                        "{\"briefId\":\"%s\"}".formatted(components.briefId(ComponentFixtures.CHEMISTRY_2027)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void aBriefIdIsRequired() throws Exception {
        teacher.post("/api/v1/classes/" + world.class1() + "/components", "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }
}
