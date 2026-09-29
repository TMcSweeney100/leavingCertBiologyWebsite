package ie.coursework.progress.adapter.web;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.MutableClock;
import ie.coursework.support.TestAccounts;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.web.servlet.MockMvc;

/** Pack D-7's student view: one student's checkpoints with every revoked sign-off. */
@AutoConfigureMockMvc
class StudentCheckpointsTest extends PostgresIntegrationTest {

    @TestConfiguration
    static class PinnedClock {
        @Bean
        @Primary
        Clock testClock() {
            return new MutableClock(Instant.parse("2026-10-12T08:00:00Z")); // Monday 12 Oct 2026, 09:00 Dublin
        }
    }

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    @Test
    void theStudentsCheckpointsWithTheirStateAndEveryRevokedSignoff() throws Exception {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), BIO);
        components.stageDate(component, components.stageId(BIO, 1), LocalDate.of(2026, 9, 10));
        components.stageDate(component, components.stageId(BIO, 2), LocalDate.of(2026, 10, 1));
        UUID stage1 = components.checkpointId(BIO, 1);
        UUID revoked = jdbcTemplate.queryForObject("""
                INSERT INTO checkpoint_signoff (instance_id, student_user_id, checkpoint_id, signed_off_by_user_id, signed_off_at)
                VALUES (?, ?, ?, ?, ?) RETURNING id
                """, UUID.class, component, world.approvedStudent(), stage1, world.teacher1(),
                Timestamp.from(Instant.parse("2026-09-12T10:00:00Z")));
        jdbcTemplate.update("UPDATE checkpoint_signoff SET revoked_by_user_id = ?, revoked_at = ? WHERE id = ?",
                world.teacher1(), Timestamp.from(Instant.parse("2026-09-14T10:00:00Z")), revoked);
        jdbcTemplate.update("""
                INSERT INTO checkpoint_signoff (instance_id, student_user_id, checkpoint_id, signed_off_by_user_id, signed_off_at)
                VALUES (?, ?, ?, ?, ?)
                """, component, world.approvedStudent(), stage1, world.teacher1(), Timestamp.from(Instant.parse("2026-09-15T10:00:00Z")));

        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .get("/api/v1/components/" + component + "/students/" + world.approvedStudent() + "/checkpoints")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(world.approvedStudent().toString()))
                .andExpect(jsonPath("$.lastName").value(ClassFixtures.APPROVED_STUDENT))
                .andExpect(jsonPath("$.today").value("2026-10-12"))
                .andExpect(jsonPath("$.behindBy").value(1))
                .andExpect(jsonPath("$.daysSinceLastLogActivity").value(nullValue()))
                .andExpect(jsonPath("$.stages.length()").value(6))
                .andExpect(jsonPath("$.stages[0].checkpoint.id").value(stage1.toString()))
                .andExpect(jsonPath("$.stages[0].state").value("SIGNED_OFF"))
                .andExpect(jsonPath("$.stages[0].signedOffOn").value("2026-09-15"))
                .andExpect(jsonPath("$.stages[0].history.length()").value(1))
                .andExpect(jsonPath("$.stages[0].history[0].signedOffOn").value("2026-09-12"))
                .andExpect(jsonPath("$.stages[0].history[0].revokedOn").value("2026-09-14"))
                .andExpect(jsonPath("$.stages[0].history[0].revokedBy").value("Test " + ClassFixtures.TEACHER1))
                .andExpect(jsonPath("$.stages[1].state").value("DUE"))
                .andExpect(jsonPath("$.stages[1].history.length()").value(0));
    }
}
