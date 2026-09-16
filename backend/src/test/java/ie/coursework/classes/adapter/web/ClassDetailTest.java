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
class ClassDetailTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    private ApiSession teacher1() throws Exception {
        return new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    @Test
    void showsTheCodeAndThePendingAndApprovedStudentsButNotRemovedOnes() throws Exception {
        ClassFixtures.World world = fixtures.world();

        teacher1().get("/api/v1/classes/" + world.class1())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.joinCode.code").value(world.class1Code()))
                .andExpect(jsonPath("$.enrolments.length()").value(2))
                .andExpect(jsonPath("$.enrolments[0].status").value("PENDING"))
                .andExpect(jsonPath("$.enrolments[0].username").value(ClassFixtures.PENDING_STUDENT))
                .andExpect(jsonPath("$.enrolments[1].status").value("APPROVED"))
                .andExpect(jsonPath("$.enrolments[*].username").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem(ClassFixtures.REMOVED_STUDENT))));
    }

    @Test
    void rotatingReplacesTheCodeAndIsAudited() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession teacher = teacher1();

        String newCode = teacher.post("/api/v1/classes/" + world.class1() + "/join-code")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.not(world.class1Code())))
                .andReturn().getResponse().getContentAsString();

        teacher.get("/api/v1/classes/" + world.class1()).andExpect(jsonPath("$.joinCode.code").value(
                org.hamcrest.Matchers.not(world.class1Code())));
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_event WHERE event_type = 'JOIN_CODE_ROTATED' AND subject_id = ?",
                Integer.class, world.class1())).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_event WHERE details::text LIKE '%' || ? || '%'", Integer.class,
                newCode.replaceAll(".*\"code\":\"([A-Z0-9]+)\".*", "$1")))
                .as("the code itself is never written to the audit log").isZero();
    }

    @Test
    void turningJoiningOffClearsTheCode() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession teacher = teacher1();

        teacher.delete("/api/v1/classes/" + world.class1() + "/join-code").andExpect(status().isNoContent());

        teacher.get("/api/v1/classes/" + world.class1())
                .andExpect(jsonPath("$.joinCode").value(org.hamcrest.Matchers.nullValue()));
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_event WHERE event_type = 'JOIN_CODE_DISABLED'", Integer.class)).isEqualTo(1);
    }

    @Test
    void anExpiredCodeIsShownAsNoCode() throws Exception {
        ClassFixtures.World world = fixtures.world();
        jdbcTemplate.update("UPDATE class_group SET join_code_expires_at = now() - interval '1 minute' WHERE id = ?",
                world.class1());

        teacher1().get("/api/v1/classes/" + world.class1())
                .andExpect(jsonPath("$.joinCode").value(org.hamcrest.Matchers.nullValue()));
    }
}
