package ie.coursework.timeline.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class TimelineTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    @Test
    void returnsTheRangeAndItsItemsInOrderWithLabels() throws Exception {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        components.stageDate(component, components.stageId(ComponentFixtures.BIOLOGY_2027, 5), LocalDate.of(2026, 12, 9));
        components.item(component, components.stageId(ComponentFixtures.BIOLOGY_2027, 6), "Full draft in for feedback", LocalDate.of(2026, 12, 4));
        ApiSession student = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);
        student.post("/api/v1/me/personal-items", PersonalItemsTest.item("Biology class test", "2026-12-02", "TEST", world.class1().toString()));

        student.get("/api/v1/me/timeline?from=2026-12-01&to=2026-12-31")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.from").value("2026-12-01"))
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.items[0].kind").value("PERSONAL"))
                .andExpect(jsonPath("$.items[0].personalKind").value("TEST"))
                .andExpect(jsonPath("$.items[1].kind").value("TEACHER_ITEM"))
                .andExpect(jsonPath("$.items[1].componentId").value(component.toString()))
                .andExpect(jsonPath("$.items[2].kind").value("STAGE"))
                .andExpect(jsonPath("$.items[2].stageLabel").value("Stage 5"))
                .andExpect(jsonPath("$.items[2].subjectName").value("Biology"));
    }

    @Test
    void refusesABackwardsOrTooLongRange() throws Exception {
        fixtures.world();
        ApiSession student = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);

        student.get("/api/v1/me/timeline?from=2026-12-01&to=2026-11-30")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors[0].field").value("to"));
        student.get("/api/v1/me/timeline?from=2026-09-01&to=2027-06-30")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        student.get("/api/v1/me/timeline?from=soon&to=2026-11-30")
                .andExpect(status().isBadRequest());
    }
}
