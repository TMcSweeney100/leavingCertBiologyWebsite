package ie.coursework.progress.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
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

/** Ready-for-signoff: the teacher accepts or says not yet; a grid sign-off answers an open request too. */
@AutoConfigureMockMvc
class AnswerTest extends PostgresIntegrationTest {

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

    private String ask() { return "/api/v1/components/" + component + "/checkpoints/" + checkpoint + "/request"; }
    private String answer() {
        return "/api/v1/components/" + component + "/students/" + world.approvedStudent() + "/checkpoints/" + checkpoint + "/request/answer";
    }

    @Test
    void acceptingSignsOffAndKeepsTheNote() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post(ask(), "{\"note\":\"page 2\"}");
        as(ClassFixtures.TEACHER1).post(answer(), "{\"outcome\":\"ACCEPTED\",\"note\":\"Good, clear aim.\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("SIGNED_OFF"));
        assertThat(count("SELECT count(*) FROM checkpoint_signoff WHERE revoked_at IS NULL")).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT teacher_note FROM signoff_request", String.class)).isEqualTo("Good, clear aim.");
        assertThat(count("SELECT count(*) FROM audit_event WHERE event_type IN ('SIGNOFF_REQUEST_ANSWERED', 'CHECKPOINT_SIGNED_OFF')"))
                .isEqualTo(2);
    }

    @Test
    void notYetLeavesItUnsignedAndTheStudentCanAskAgain() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post(ask(), "{}");
        as(ClassFixtures.TEACHER1).post(answer(), "{\"outcome\":\"NOT_YET\",\"note\":\"Say what you'll measure.\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.state").value(org.hamcrest.Matchers.oneOf("DUE", "NOT_DUE")));
        assertThat(count("SELECT count(*) FROM checkpoint_signoff")).isZero();
        as(ClassFixtures.APPROVED_STUDENT).post(ask(), "{}").andExpect(status().isCreated());
    }

    @Test
    void answeringWhatIsntOpenIsAConflict() throws Exception {
        as(ClassFixtures.TEACHER1).post(answer(), "{\"outcome\":\"ACCEPTED\"}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SIGNOFF_REQUEST_NOT_OPEN"));
    }

    @Test
    void aSignOffFromTheGridAnswersTheOpenRequest() throws Exception { // decision R-11
        as(ClassFixtures.APPROVED_STUDENT).post(ask(), "{}");
        as(ClassFixtures.TEACHER1).put("/api/v1/components/" + component + "/students/" + world.approvedStudent()
                + "/checkpoints/" + checkpoint + "/signoff", "{\"signedOff\":true}").andExpect(status().isOk());
        assertThat(jdbcTemplate.queryForObject("SELECT outcome FROM signoff_request", String.class)).isEqualTo("ACCEPTED");
    }

    @Test
    void theOutcomeIsRequiredAndTheNoteHasALimit() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post(ask(), "{}");
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        teacher.post(answer(), "{}").andExpect(status().isBadRequest());
        teacher.post(answer(), "{\"outcome\":\"ACCEPTED\",\"note\":\"" + "x".repeat(501) + "\"}").andExpect(status().isBadRequest());
    }

    private int count(String sql) { return jdbcTemplate.queryForObject(sql, Integer.class); }
}
