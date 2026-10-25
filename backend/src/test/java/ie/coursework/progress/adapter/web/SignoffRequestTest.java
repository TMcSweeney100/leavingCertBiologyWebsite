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

/** Ready-for-signoff: the student asks for a checkpoint's sign-off and can withdraw until it is answered. */
@AutoConfigureMockMvc
class SignoffRequestTest extends PostgresIntegrationTest {

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

    private String request(UUID c) { return "/api/v1/components/" + component + "/checkpoints/" + c + "/request"; }

    @Test
    void theStudentAsksWithANoteAndAskingTwiceChangesNothing() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.post(request(checkpoint), "{\"note\":\"  plan's on page 2 \"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.note").value("plan's on page 2")).andExpect(jsonPath("$.askedOn").isNotEmpty());
        student.post(request(checkpoint), "{\"note\":\"other\"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.note").value("plan's on page 2"));
        assertThat(count("SELECT count(*) FROM signoff_request")).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM audit_event WHERE event_type = 'SIGNOFF_REQUESTED'")).isEqualTo(1);
    }

    @Test
    void aBlankNoteIsNoNote() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post(request(checkpoint), "{\"note\":\"   \"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.note").doesNotExist());
    }

    @Test
    void aNoteOver280IsRefused() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post(request(checkpoint), "{\"note\":\"" + "x".repeat(281) + "\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void aSignedOffCheckpointCantBeAskedFor() throws Exception {
        as(ClassFixtures.TEACHER1).put("/api/v1/components/" + component + "/students/" + world.approvedStudent()
                + "/checkpoints/" + checkpoint + "/signoff", "{\"signedOff\":true}").andExpect(status().isOk());
        as(ClassFixtures.APPROVED_STUDENT).post(request(checkpoint), "{}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CHECKPOINT_ALREADY_SIGNED_OFF"));
    }

    @Test
    void whenTheClassRequiresALinkTheStudentMustHaveOne() throws Exception {
        jdbcTemplate.update("UPDATE component_instance SET require_link_for_signoff = true WHERE id = ?", component);
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.post(request(checkpoint), "{}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("DOCUMENT_LINK_REQUIRED"));
        student.put("/api/v1/components/" + component + "/document-link", "{\"url\":\"https://docs.google.com/d/a\"}");
        student.post(request(checkpoint), "{}").andExpect(status().isCreated());
    }

    @Test
    void theStudentWithdrawsAnOpenRequestOnly() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.post(request(checkpoint), "{}").andExpect(status().isCreated());
        student.delete(request(checkpoint)).andExpect(status().isNoContent());
        student.delete(request(checkpoint)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SIGNOFF_REQUEST_NOT_OPEN"));
        assertThat(count("SELECT count(*) FROM signoff_request WHERE withdrawn_at IS NOT NULL")).isEqualTo(1);
    }

    private int count(String sql) { return jdbcTemplate.queryForObject(sql, Integer.class); }
}
