package ie.coursework.log.authz;

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

/** Gate P3: another student's log is 404; nothing here is 403 (design §9). */
@AutoConfigureMockMvc
class LogScopeTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private String log;
    private java.util.UUID component;
    private String entry;
    private ClassFixtures.World world;

    @BeforeEach
    void anApprovedStudentsEntry() throws Exception {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        log = "/api/v1/components/" + component + "/log";
        String body = as(ClassFixtures.APPROVED_STUDENT).post(log, "{\"kind\":\"NOTE\",\"body\":\"mine\"}")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        entry = "/api/v1/log/" + JsonPath.read(body, "$.entry.id");
    }

    @Test
    void anonymousIsUnauthenticated() throws Exception {
        new ApiSession(mockMvc).get(log).andExpect(status().isUnauthorized());
        new ApiSession(mockMvc).get(entry).andExpect(status().isUnauthorized());
    }

    @Test
    void everyoneButTheOwnerGetsNotFound() throws Exception {
        for (String user : new String[] {ClassFixtures.PENDING_STUDENT, ClassFixtures.REMOVED_STUDENT, ClassFixtures.OUTSIDER,
                ClassFixtures.TEACHER1, ClassFixtures.TEACHER2, ClassFixtures.TEACHER_B, ClassFixtures.LEADER_A}) {
            ApiSession session = as(user);
            session.get(log).andExpect(status().isNotFound());
            session.post(log, "{\"kind\":\"NOTE\",\"body\":\"x\"}").andExpect(status().isNotFound());
            session.get(entry).andExpect(status().isNotFound());
            session.post(entry + "/revisions", "{\"body\":\"x\"}").andExpect(status().isNotFound());
            session.put(entry + "/visibility", "{\"visible\":false}").andExpect(status().isNotFound());
        }
    }

    @Test
    void anApprovedClassmateCantTouchTheOwnersEntryAndSeesOnlyTheirOwnLog() throws Exception {
        fixtures.classmate(world);
        ApiSession classmate = as(ClassFixtures.CLASSMATE);
        classmate.get(entry).andExpect(status().isNotFound());
        classmate.post(entry + "/revisions", "{\"body\":\"x\"}").andExpect(status().isNotFound());
        classmate.put(entry + "/visibility", "{\"visible\":false}").andExpect(status().isNotFound());

        String ownerEntryId = entry.substring(entry.lastIndexOf('/') + 1);
        String own = classmate.post(log, "{\"kind\":\"NOTE\",\"body\":\"theirs\"}").andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String listed = classmate.get(log).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(listed).doesNotContain(ownerEntryId).contains(JsonPath.<String>read(own, "$.entry.id"));

        as(ClassFixtures.APPROVED_STUDENT).get(entry).andExpect(status().isOk());
    }

    @Test
    void theOwnerLosesAccessWhenRemovedAndNothingIsDeleted() throws Exception {
        jdbcTemplate.update("UPDATE enrolment SET status = 'REMOVED' WHERE id = ?", world.approvedEnrolment());
        as(ClassFixtures.APPROVED_STUDENT).get(entry).andExpect(status().isNotFound());
        org.assertj.core.api.Assertions.assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM log_entry", Integer.class)).isEqualTo(1);
    }

    @Test
    void onlyTheClassesTeacherReadsAStudentsLog() throws Exception {
        String path = "/api/v1/components/" + component + "/students/" + world.approvedStudent() + "/log";
        as(ClassFixtures.TEACHER1).get(path).andExpect(status().isOk());
        for (String user : new String[] {ClassFixtures.TEACHER2, ClassFixtures.TEACHER_B, ClassFixtures.LEADER_A,
                ClassFixtures.APPROVED_STUDENT, ClassFixtures.PENDING_STUDENT}) {
            as(user).get(path).andExpect(status().isNotFound());
        }
        new ApiSession(mockMvc).get(path).andExpect(status().isUnauthorized());
    }

    @Test
    void theTeacherCantReadAPendingRemovedOrOutsideStudent() throws Exception {
        for (java.util.UUID student : new java.util.UUID[] {world.pendingStudent(), world.removedStudent(), world.outsider(), java.util.UUID.randomUUID()}) {
            as(ClassFixtures.TEACHER1).get("/api/v1/components/" + component + "/students/" + student + "/log")
                    .andExpect(status().isNotFound());
        }
    }

    @Test
    void aSecondApprovedStudentIsNotReachableThroughTheWrongComponentOrTheirClassmatesLog() throws Exception {
        java.util.UUID classmate = fixtures.classmate(world);
        as(ClassFixtures.CLASSMATE).post(log, "{\"kind\":\"NOTE\",\"body\":\"classmate-text\"}").andExpect(status().isCreated());
        // Teacher 2's class has no such student, and teacher 2's own component is not teacher 1's.
        java.util.UUID other = components.component(world.class2(), world.teacher2(), ComponentFixtures.BIOLOGY_2027);
        for (java.util.UUID student : new java.util.UUID[] {classmate, world.approvedStudent()}) {
            as(ClassFixtures.TEACHER1).get("/api/v1/components/" + other + "/students/" + student + "/log").andExpect(status().isNotFound());
            as(ClassFixtures.TEACHER2).get("/api/v1/components/" + other + "/students/" + student + "/log").andExpect(status().isNotFound());
            as(ClassFixtures.TEACHER2).get("/api/v1/components/" + component + "/students/" + student + "/log").andExpect(status().isNotFound());
        }
        // Each approved student's path returns only their own log.
        String own = as(ClassFixtures.TEACHER1).get("/api/v1/components/" + component + "/students/" + classmate + "/log")
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(own).contains("classmate-text").doesNotContain("mine");
        String owner = as(ClassFixtures.TEACHER1).get("/api/v1/components/" + component + "/students/" + world.approvedStudent() + "/log")
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(owner).contains("mine").doesNotContain("classmate-text");
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }
}
