package ie.coursework.progress.authz;

import static org.assertj.core.api.Assertions.assertThat;
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

/** Only the class's approved students ask or set a link, and only its teacher answers or changes the setting; everyone else gets 404. */
@AutoConfigureMockMvc
class SignoffRequestScopeTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;
    private static final String ON = "{\"signedOff\":true}";

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private UUID component;
    private UUID checkpoint;

    @BeforeEach
    void aComponent() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        checkpoint = components.checkpointId(BIO, 1);
    }

    private String ask(UUID c) { return "/api/v1/components/" + component + "/checkpoints/" + c + "/request"; }
    private String link() { return "/api/v1/components/" + component + "/document-link"; }
    private String settings() { return "/api/v1/components/" + component + "/settings"; }
    private String answer(UUID s, UUID c) {
        return "/api/v1/components/" + component + "/students/" + s + "/checkpoints/" + c + "/request/answer";
    }
    private static final String URL = "{\"url\":\"https://docs.google.com/d/a\"}";
    private static final String ACCEPT = "{\"outcome\":\"ACCEPTED\"}";

    @Test
    void theRightActorsReachEveryRoute() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.put(link(), URL).andExpect(status().is2xxSuccessful());
        student.post(ask(checkpoint), "{}").andExpect(status().isCreated());
        student.delete(ask(checkpoint)).andExpect(status().is2xxSuccessful());
        student.post(ask(checkpoint), "{}").andExpect(status().isCreated());
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        teacher.get("/api/v1/signoff-requests/waiting").andExpect(status().isOk());
        teacher.put(settings(), "{\"requireLink\":true}").andExpect(status().is2xxSuccessful());
        teacher.post(answer(world.approvedStudent(), checkpoint), ACCEPT).andExpect(status().is2xxSuccessful());
    }

    @Test
    void anonymousIsUnauthenticated() throws Exception {
        ApiSession a = new ApiSession(mockMvc);
        a.post(ask(checkpoint), "{}").andExpect(status().isUnauthorized());
        a.delete(ask(checkpoint)).andExpect(status().isUnauthorized());
        a.put(link(), URL).andExpect(status().isUnauthorized());
        a.put(settings(), "{\"requireLink\":true}").andExpect(status().isUnauthorized());
        a.post(answer(world.approvedStudent(), checkpoint), ACCEPT).andExpect(status().isUnauthorized());
        a.get("/api/v1/signoff-requests/waiting").andExpect(status().isUnauthorized());
    }

    @Test
    void onlyAnApprovedStudentOfTheClassAsksOrSetsALink() throws Exception {
        for (String user : new String[] {ClassFixtures.PENDING_STUDENT, ClassFixtures.OUTSIDER, ClassFixtures.TEACHER2,
                ClassFixtures.TEACHER_B, ClassFixtures.LEADER_A}) {
            ApiSession s = as(user);
            s.post(ask(checkpoint), "{}").andExpect(status().isNotFound());
            s.delete(ask(checkpoint)).andExpect(status().isNotFound());
            s.put(link(), URL).andExpect(status().isNotFound());
        }
        assertThat(count("SELECT count(*) FROM signoff_request") + count("SELECT count(*) FROM document_link")).isZero();
    }

    @Test
    void aStudentCantAskForAnotherSubjectsOrAMadeUpCheckpoint() throws Exception {
        ApiSession s = as(ClassFixtures.APPROVED_STUDENT);
        s.post(ask(components.checkpointId(ComponentFixtures.CHEMISTRY_2027, 1)), "{}").andExpect(status().isNotFound());
        s.post(ask(UUID.randomUUID()), "{}").andExpect(status().isNotFound());
        assertThat(count("SELECT count(*) FROM signoff_request")).isZero();
    }

    @Test
    void onlyTheClassesTeacherAnswersOrChangesTheSetting() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post(ask(checkpoint), "{}").andExpect(status().isCreated());
        for (String user : new String[] {ClassFixtures.TEACHER2, ClassFixtures.TEACHER_B, ClassFixtures.LEADER_A,
                ClassFixtures.APPROVED_STUDENT}) {
            as(user).post(answer(world.approvedStudent(), checkpoint), ACCEPT).andExpect(status().isNotFound());
            as(user).put(settings(), "{\"requireLink\":true}").andExpect(status().isNotFound());
        }
        assertThat(count("SELECT count(*) FROM signoff_request WHERE answered_at IS NOT NULL")).isZero();
    }

    @Test
    void theTeacherCantAnswerForAPendingRemovedOutsideOrMadeUpStudent() throws Exception {
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        for (UUID s : new UUID[] {world.pendingStudent(), world.removedStudent(), world.outsider(), UUID.randomUUID()}) {
            teacher.post(answer(s, checkpoint), ACCEPT).andExpect(status().isNotFound());
        }
    }

    /** Bite test: an open request in class 2 must not be answerable through class 1's component id. */
    @Test
    void aRequestInAnotherComponentIsNotFoundThroughThisOne() throws Exception {
        UUID other = components.component(world.class2(), world.teacher1(), BIO);
        jdbcTemplate.update("""
                INSERT INTO signoff_request (instance_id, student_user_id, checkpoint_id, asked_at) VALUES (?, ?, ?, now())
                """, other, world.approvedStudent(), checkpoint);
        as(ClassFixtures.TEACHER1).post(answer(world.approvedStudent(), checkpoint), ACCEPT).andExpect(status().isConflict());
        assertThat(count("SELECT count(*) FROM signoff_request WHERE answered_at IS NOT NULL")).isZero();
    }

    private int count(String sql) { return jdbcTemplate.queryForObject(sql, Integer.class); }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }
}
