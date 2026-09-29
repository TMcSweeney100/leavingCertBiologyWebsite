package ie.coursework.progress.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.MutableClock;
import ie.coursework.support.TestAccounts;
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

/** Sign off, undo and revoke are one idempotent PUT (plan P4-6, P4-17). */
@AutoConfigureMockMvc
class SignoffTest extends PostgresIntegrationTest {

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

    private String path;
    private ApiSession teacher;

    @BeforeEach
    void stageTwoIsDue() throws Exception {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), BIO);
        components.stageDate(component, components.stageId(BIO, 2), LocalDate.of(2026, 10, 1));
        path = "/api/v1/components/" + component + "/students/" + world.approvedStudent() + "/checkpoints/"
                + components.checkpointId(BIO, 2) + "/signoff";
        teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    private int events(String type) {
        return jdbcTemplate.queryForObject("SELECT count(*) FROM audit_event WHERE event_type = ?", Integer.class, type);
    }

    @Test
    void signingOffTwiceIsOneSignoffAndOneAuditEvent() throws Exception {
        for (int i = 0; i < 2; i++) {
            teacher.put(path, "{\"signedOff\":true}").andExpect(status().isOk())
                    .andExpect(jsonPath("$.state").value("SIGNED_OFF"))
                    .andExpect(jsonPath("$.signedOffOn").value("2026-10-12"));
        }
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM checkpoint_signoff", Integer.class)).isEqualTo(1);
        assertThat(events("CHECKPOINT_SIGNED_OFF")).isEqualTo(1);
    }

    @Test
    void undoingOrRevokingLeavesTheRowAndPutsTheCellBackToDueOnce() throws Exception {
        teacher.put(path, "{\"signedOff\":true}").andExpect(status().isOk());
        for (int i = 0; i < 2; i++) {
            teacher.put(path, "{\"signedOff\":false}").andExpect(status().isOk())
                    .andExpect(jsonPath("$.state").value("DUE"))
                    .andExpect(jsonPath("$.signedOffOn").value(nullValue()));
        }
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM checkpoint_signoff WHERE revoked_at IS NOT NULL", Integer.class)).isEqualTo(1);
        assertThat(events("CHECKPOINT_SIGNOFF_REVOKED")).isEqualTo(1);
    }

    @Test
    void aCheckpointCanBeSignedOffBeforeItsStageIsDueOrDated() throws Exception {
        String early = path.replace(components.checkpointId(BIO, 2).toString(), components.checkpointId(BIO, 4).toString());
        teacher.put(early, "{\"signedOff\":true}").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("SIGNED_OFF"));
    }

    @Test
    void theBodyMustSayWhichWay() throws Exception {
        teacher.put(path, "{}").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }
}
