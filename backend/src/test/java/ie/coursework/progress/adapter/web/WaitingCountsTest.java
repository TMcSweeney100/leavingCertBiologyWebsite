package ie.coursework.progress.adapter.web;

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

/** Ready-for-signoff: the per-class waiting counts behind the badge on /teach (R-21). */
@AutoConfigureMockMvc
class WaitingCountsTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private UUID component;
    private UUID checkpoint;

    @BeforeEach
    void setUp() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        checkpoint = components.checkpointId(BIO, 1);
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }

    @Test
    void theTeacherSeesACountForEachClassWithSomeoneWaiting() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post("/api/v1/components/" + component + "/checkpoints/" + checkpoint + "/request", "{}");
        as(ClassFixtures.TEACHER1).get("/api/v1/signoff-requests/waiting").andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].classId").value(world.class1().toString()))
                .andExpect(jsonPath("$[0].waiting").value(1));
        as(ClassFixtures.TEACHER2).get("/api/v1/signoff-requests/waiting").andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void aStudentGetsNotFound() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).get("/api/v1/signoff-requests/waiting").andExpect(status().isNotFound());
    }
}
