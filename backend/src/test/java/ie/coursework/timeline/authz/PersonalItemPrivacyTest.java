package ie.coursework.timeline.authz;

import static org.assertj.core.api.Assertions.assertThat;
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

/**
 * Design §6.8 and §10: no role but the owner can read a student's own items, in any view. The student labels
 * an item with teacher 1's class, the case most likely to leak.
 */
@AutoConfigureMockMvc
class PersonalItemPrivacyTest extends PostgresIntegrationTest {

    private static final String SECRET = "Nana's birthday";

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private UUID component;
    private String itemPath;

    @BeforeEach
    void aPrivateItem() throws Exception {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        String body = as(ClassFixtures.APPROVED_STUDENT).post("/api/v1/me/personal-items",
                "{\"title\":\"%s\",\"dueDate\":\"2026-11-20\",\"kind\":\"OTHER\",\"classId\":\"%s\"}".formatted(SECRET, world.class1()))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        itemPath = "/api/v1/me/personal-items/" + JsonPath.read(body, "$.id");
    }

    @Test
    void theClassesTeacherReachesNothing() throws Exception {
        nothingReachable(as(ClassFixtures.TEACHER1));
        String everythingTheTeacherSees = as(ClassFixtures.TEACHER1).get("/api/v1/components/" + component).andReturn().getResponse().getContentAsString()
                + as(ClassFixtures.TEACHER1).get("/api/v1/classes/" + world.class1()).andReturn().getResponse().getContentAsString()
                + as(ClassFixtures.TEACHER1).get("/api/v1/classes").andReturn().getResponse().getContentAsString();
        assertThat(everythingTheTeacherSees).doesNotContain("Nana");
    }

    @Test
    void aSchoolLeaderReachesNothing() throws Exception {
        nothingReachable(as(ClassFixtures.LEADER_A));
    }

    @Test
    void anotherStudentInTheSameClassReachesNothing() throws Exception {
        nothingReachable(as(ClassFixtures.PENDING_STUDENT));
    }

    @Test
    void anonymousIsUnauthenticated() throws Exception {
        new ApiSession(mockMvc).get("/api/v1/me/personal-items").andExpect(status().isUnauthorized());
        new ApiSession(mockMvc).get("/api/v1/me/timeline?from=2026-11-01&to=2026-11-30").andExpect(status().isUnauthorized());
    }

    private void nothingReachable(ApiSession session) throws Exception {
        session.get("/api/v1/me/personal-items").andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        session.get("/api/v1/me/timeline?from=2026-11-01&to=2026-11-30").andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        session.patch(itemPath, "{\"title\":\"Mine\",\"dueDate\":\"2026-11-20\",\"kind\":\"OTHER\",\"classId\":null}").andExpect(status().isNotFound());
        session.delete(itemPath).andExpect(status().isNotFound());
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }
}
