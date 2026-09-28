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
    private String entry;
    private ClassFixtures.World world;

    @BeforeEach
    void anApprovedStudentsEntry() throws Exception {
        world = fixtures.world();
        log = "/api/v1/components/" + components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027) + "/log";
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
    void theOwnerLosesAccessWhenRemovedAndNothingIsDeleted() throws Exception {
        jdbcTemplate.update("UPDATE enrolment SET status = 'REMOVED' WHERE id = ?", world.approvedEnrolment());
        as(ClassFixtures.APPROVED_STUDENT).get(entry).andExpect(status().isNotFound());
        org.assertj.core.api.Assertions.assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM log_entry", Integer.class)).isEqualTo(1);
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }
}
