package ie.coursework.components.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class TeacherItemsTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private ApiSession teacher;
    private UUID component;
    private String items;

    @BeforeEach
    void component() throws Exception {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        items = "/api/v1/components/" + component + "/teacher-items";
        teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    @Test
    void addsAnItemToAStageWithOrWithoutADate() throws Exception {
        teacher.post(items, item(6, "Full draft in for feedback", "\"2026-12-04\""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.text").value("Full draft in for feedback"))
                .andExpect(jsonPath("$.dueDate").value("2026-12-04"));
        teacher.post(items, item(4, "Book a re-run slot if your data needs it", "null")).andExpect(status().isCreated());

        teacher.get("/api/v1/components/" + component)
                .andExpect(jsonPath("$.stages[5].items[0].text").value("Full draft in for feedback"))
                .andExpect(jsonPath("$.stages[3].items[0].dueDate").isEmpty());
    }

    @Test
    void anItemDatedAfterTheCompletionDateIsRefused() throws Exception {
        teacher.post(items, item(6, "Too late", "\"2027-03-01\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("COMPLETION_DATE_EXCEEDED"))
                .andExpect(jsonPath("$.detail").value(
                        "That date is after the completion date, 26 Feb 2027. Choose a date on or before it."))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("dueDate"));
    }

    @Test
    void blankOrOverlongTextIsAValidationError() throws Exception {
        teacher.post(items, item(6, " ", "null")).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        teacher.post(items, item(6, "x".repeat(201), "null")).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void editsTextAndDate() throws Exception {
        String id = added(6, "Draft in");

        teacher.patch(items + "/" + id, "{\"text\":\"Full draft in for feedback\",\"dueDate\":\"2026-12-04\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("Full draft in for feedback"))
                .andExpect(jsonPath("$.dueDate").value("2026-12-04"));
    }

    @Test
    void retiringHidesTheItemAndASecondRetireIsNotFound() throws Exception {
        String id = added(6, "Catch-up window closes");

        teacher.delete(items + "/" + id).andExpect(status().isNoContent());
        teacher.get("/api/v1/components/" + component).andExpect(jsonPath("$.stages[5].items").isEmpty());
        teacher.delete(items + "/" + id).andExpect(status().isNotFound());
        teacher.patch(items + "/" + id, "{\"text\":\"Back\",\"dueDate\":null}").andExpect(status().isNotFound());
    }

    @Test
    void anItemFromAnotherComponentIsNotFoundUnderThisOne() throws Exception {
        UUID other = components.component(world.class2(), world.teacher2(), ComponentFixtures.BIOLOGY_2027);
        UUID theirs = components.item(other, components.stageId(ComponentFixtures.BIOLOGY_2027, 6), "Theirs", null);

        teacher.patch(items + "/" + theirs, "{\"text\":\"Mine now\",\"dueDate\":null}").andExpect(status().isNotFound());
        teacher.delete(items + "/" + theirs).andExpect(status().isNotFound());
    }

    private String added(int stage, String text) throws Exception {
        String body = teacher.post(items, item(stage, text, "null")).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private String item(int stage, String text, String dueDateJson) {
        return "{\"stageId\":\"%s\",\"text\":\"%s\",\"dueDate\":%s}".formatted(
                components.stageId(ComponentFixtures.BIOLOGY_2027, stage), text, dueDateJson);
    }
}
