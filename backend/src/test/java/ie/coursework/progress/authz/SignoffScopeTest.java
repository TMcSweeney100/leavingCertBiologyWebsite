package ie.coursework.progress.authz;

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

/** Gate P4: only the class's teacher reaches the grid or a sign-off, and only for its approved students (design §9). */
@AutoConfigureMockMvc
class SignoffScopeTest extends PostgresIntegrationTest {

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

    private String grid() { return "/api/v1/components/" + component + "/progress"; }
    private String student(UUID s) { return "/api/v1/components/" + component + "/students/" + s + "/checkpoints"; }
    private String signoff(UUID s, UUID c) { return student(s) + "/" + c + "/signoff"; }

    @Test
    void anonymousIsUnauthenticated() throws Exception {
        ApiSession anonymous = new ApiSession(mockMvc);
        anonymous.get(grid()).andExpect(status().isUnauthorized());
        anonymous.get(student(world.approvedStudent())).andExpect(status().isUnauthorized());
        anonymous.put(signoff(world.approvedStudent(), checkpoint), ON).andExpect(status().isUnauthorized());
    }

    @Test
    void everyoneButTheClassesTeacherGetsNotFound() throws Exception {
        for (String user : new String[] {ClassFixtures.TEACHER2, ClassFixtures.TEACHER_B, ClassFixtures.LEADER_A,
                ClassFixtures.APPROVED_STUDENT, ClassFixtures.PENDING_STUDENT, ClassFixtures.OUTSIDER}) {
            ApiSession session = as(user);
            session.get(grid()).andExpect(status().isNotFound());
            session.get(student(world.approvedStudent())).andExpect(status().isNotFound());
            session.put(signoff(world.approvedStudent(), checkpoint), ON).andExpect(status().isNotFound());
        }
        as(ClassFixtures.TEACHER1).get(grid()).andExpect(status().isOk());
    }

    @Test
    void theTeacherCantReachAPendingRemovedOutsideOrMadeUpStudent() throws Exception {
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        for (UUID s : new UUID[] {world.pendingStudent(), world.removedStudent(), world.outsider(), UUID.randomUUID()}) {
            teacher.get(student(s)).andExpect(status().isNotFound());
            teacher.put(signoff(s, checkpoint), ON).andExpect(status().isNotFound());
        }
    }

    @Test
    void theTeacherCantSignOffAnotherSubjectsOrAMadeUpCheckpoint() throws Exception {
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        UUID chemistry = components.checkpointId(ComponentFixtures.CHEMISTRY_2027, 1);
        teacher.put(signoff(world.approvedStudent(), chemistry), ON).andExpect(status().isNotFound());
        teacher.put(signoff(world.approvedStudent(), UUID.randomUUID()), ON).andExpect(status().isNotFound());
        org.assertj.core.api.Assertions.assertThat(
                jdbcTemplate.queryForObject("SELECT count(*) FROM checkpoint_signoff", Integer.class)).isZero();
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }
}
