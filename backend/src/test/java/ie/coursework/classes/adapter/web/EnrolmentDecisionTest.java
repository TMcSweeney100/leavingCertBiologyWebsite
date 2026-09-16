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
class EnrolmentDecisionTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    private ApiSession teacher1() throws Exception {
        return new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    private static String path(ClassFixtures.World world, java.util.UUID enrolment, String action) {
        return "/api/v1/classes/" + world.class1() + "/enrolments/" + enrolment + "/" + action;
    }

    @Test
    void approvingAPendingRequestIsAuditedAndVisibleToTheStudent() throws Exception {
        ClassFixtures.World world = fixtures.world();

        teacher1().post(path(world, world.pendingEnrolment(), "approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.enrolmentId").value(world.pendingEnrolment().toString()));

        new ApiSession(mockMvc).login(ClassFixtures.PENDING_STUDENT, TestAccounts.PASSWORD).get("/api/v1/me/classes")
                .andExpect(jsonPath("$[0].status").value("APPROVED"));
        assertThat(jdbcTemplate.queryForMap(
                "SELECT actor_user_id, details->>'studentId' AS student FROM audit_event WHERE event_type = 'ENROLMENT_APPROVED'"))
                .containsEntry("actor_user_id", world.teacher1())
                .containsEntry("student", world.pendingStudent().toString());
    }

    @Test
    void approvingTwiceIsRefused() throws Exception {
        ClassFixtures.World world = fixtures.world();

        teacher1().post(path(world, world.approvedEnrolment(), "approve"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ENROLMENT_NOT_PENDING"));
    }

    @Test
    void decliningAPendingRequestAndRemovingAnApprovedStudentBothEndAsRemoved() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession teacher = teacher1();

        teacher.post(path(world, world.pendingEnrolment(), "remove")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REMOVED"));
        teacher.post(path(world, world.approvedEnrolment(), "remove")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REMOVED"));

        teacher.get("/api/v1/classes/" + world.class1()).andExpect(jsonPath("$.enrolments").isEmpty());
        new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD).get("/api/v1/me/classes")
                .andExpect(jsonPath("$").isEmpty());
        assertThat(jdbcTemplate.queryForList(
                "SELECT details->>'was' FROM audit_event WHERE event_type = 'ENROLMENT_REMOVED' ORDER BY occurred_at", String.class))
                .containsExactly("PENDING", "APPROVED");
    }

    @Test
    void removingTwiceIsRefused() throws Exception {
        ClassFixtures.World world = fixtures.world();

        teacher1().post(path(world, world.removedEnrolment(), "remove"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ENROLMENT_ALREADY_REMOVED"));
    }
}
