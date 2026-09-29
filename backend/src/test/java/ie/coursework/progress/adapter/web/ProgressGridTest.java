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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.web.servlet.MockMvc;

/** Design §8.4 and pack D-7: students × checkpoints, furthest behind first. */
@AutoConfigureMockMvc
class ProgressGridTest extends PostgresIntegrationTest {

    @TestConfiguration
    static class PinnedClock {
        @Bean
        @Primary
        Clock testClock() {
            return new MutableClock(Instant.parse("2026-10-12T08:00:00Z")); // Monday 12 Oct 2026, 09:00 Dublin
        }
    }

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;
    private static final String BUSINESS = "2027L033C2EL";

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private UUID component;

    @BeforeEach
    void aClassWithTwoApprovedStudents() throws Exception {
        world = fixtures.world();
        fixtures.classmate(world);
        component = components.component(world.class1(), world.teacher1(), BIO);
        components.stageDate(component, components.stageId(BIO, 1), LocalDate.of(2026, 9, 10));
        components.stageDate(component, components.stageId(BIO, 2), LocalDate.of(2026, 10, 1));
        components.stageDate(component, components.stageId(BIO, 3), LocalDate.of(2026, 11, 20));
        jdbcTemplate.update("""
                INSERT INTO checkpoint_signoff (instance_id, student_user_id, checkpoint_id, signed_off_by_user_id, signed_off_at)
                VALUES (?, ?, ?, ?, ?)
                """, component, world.approvedStudent(), components.checkpointId(BIO, 1), world.teacher1(),
                Timestamp.from(Instant.parse("2026-09-15T10:00:00Z")));
        as(ClassFixtures.APPROVED_STUDENT).post("/api/v1/components/" + component + "/log", "{\"kind\":\"NOTE\",\"body\":\"today\"}")
                .andExpect(status().isCreated());
    }

    @Test
    void approvedStudentsFurthestBehindFirstWithTheirCellsAndLogActivity() throws Exception {
        as(ClassFixtures.TEACHER1).get("/api/v1/components/" + component + "/progress")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.componentId").value(component.toString()))
                .andExpect(jsonPath("$.classId").value(world.class1().toString()))
                .andExpect(jsonPath("$.className").value(ClassFixtures.CLASS1_NAME))
                .andExpect(jsonPath("$.today").value("2026-10-12"))
                .andExpect(jsonPath("$.stages.length()").value(6))
                .andExpect(jsonPath("$.stages[0].ordinal").value(1))
                .andExpect(jsonPath("$.stages[0].label").value("Stage 1"))
                .andExpect(jsonPath("$.stages[0].dueDate").value("2026-09-10"))
                .andExpect(jsonPath("$.stages[0].checkpoint.text").value("Initial ideas discussed with the teacher"))
                .andExpect(jsonPath("$.students.length()").value(2)) // pending and removed students aren't on the grid
                .andExpect(jsonPath("$.students[0].lastName").value(ClassFixtures.CLASSMATE))
                .andExpect(jsonPath("$.students[0].behindBy").value(2))
                .andExpect(jsonPath("$.students[0].daysSinceLastLogActivity").value(nullValue()))
                .andExpect(jsonPath("$.students[0].lastLogActivityOn").value(nullValue()))
                .andExpect(jsonPath("$.students[1].lastName").value(ClassFixtures.APPROVED_STUDENT))
                .andExpect(jsonPath("$.students[1].behindBy").value(1))
                .andExpect(jsonPath("$.students[1].daysSinceLastLogActivity").value(0))
                .andExpect(jsonPath("$.students[1].lastLogActivityOn").value("2026-10-12"))
                .andExpect(jsonPath("$.students[1].cells.length()").value(6))
                .andExpect(jsonPath("$.students[1].cells[0].state").value("SIGNED_OFF"))
                .andExpect(jsonPath("$.students[1].cells[0].signedOffOn").value("2026-09-15"))
                .andExpect(jsonPath("$.students[1].cells[1].state").value("DUE"))
                .andExpect(jsonPath("$.students[1].cells[1].signedOffOn").value(nullValue()))
                .andExpect(jsonPath("$.students[1].cells[2].state").value("NOT_DUE"));
    }

    @Test
    void aStageWithoutACheckpointIsListedButHasNoCell() throws Exception {
        UUID business = components.component(world.class2(), world.teacher2(), BUSINESS);
        as(ClassFixtures.TEACHER2).get("/api/v1/components/" + business + "/progress")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages.length()").value(7))
                .andExpect(jsonPath("$.stages[5].checkpoint").value(nullValue()))
                .andExpect(jsonPath("$.stages[6].label").value(nullValue()))
                .andExpect(jsonPath("$.students.length()").value(0));
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }
}
