package ie.coursework.classes.authz;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import org.junit.jupiter.api.Test;

/** The leader's own view arrives in Phase 5. Until then a leader can reach nothing class-shaped. */
class LeaderScopeTest extends AuthzSuite {

    @Test
    void aLeaderReachesNoClassOrEnrolment() throws Exception {
        ApiSession leader = as(ClassFixtures.LEADER_A);
        String class1 = "/api/v1/classes/" + world.class1();

        leader.get("/api/v1/classes").andExpect(status().isNotFound());
        leader.get(class1).andExpect(status().isNotFound());
        leader.post(class1 + "/enrolments/" + world.pendingEnrolment() + "/approve").andExpect(status().isNotFound());
        leader.get("/api/v1/me/classes").andExpect(status().isOk()); // empty list: a leader is nobody's student
    }
}
