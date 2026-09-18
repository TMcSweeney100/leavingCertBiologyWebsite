package ie.coursework.components.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class ItemTickTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private UUID component;
    private String tick;

    @BeforeEach
    void item() {
        ClassFixtures.World world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        UUID item = components.item(component, components.stageId(ComponentFixtures.BIOLOGY_2027, 6), "Full draft in", null);
        tick = "/api/v1/components/" + component + "/teacher-items/" + item + "/tick";
    }

    @Test
    void aStudentTicksAndUnticksTheirOwnCopy() throws Exception {
        ApiSession student = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);

        student.put(tick, "{\"done\":true}").andExpect(status().isOk()).andExpect(jsonPath("$.done").value(true));
        student.put(tick, "{\"done\":true}").andExpect(status().isOk());
        student.get("/api/v1/components/" + component).andExpect(jsonPath("$.stages[5].items[0].done").value(true));
        student.put(tick, "{\"done\":false}").andExpect(jsonPath("$.done").value(false));
    }

    @Test
    void theTeacherCannotTickForAStudent() throws Exception {
        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .put(tick, "{\"done\":true}").andExpect(status().isNotFound());
    }

    @Test
    void doneIsRequired() throws Exception {
        new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD)
                .put(tick, "{}").andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }
}
