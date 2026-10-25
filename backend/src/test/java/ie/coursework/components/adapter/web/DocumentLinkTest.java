package ie.coursework.components.adapter.web;

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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class DocumentLinkTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID component;

    @BeforeEach
    void component() {
        ClassFixtures.World world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }

    private String link() { return "/api/v1/components/" + component + "/document-link"; }

    @Test
    void anApprovedStudentSetsAndReplacesTheirLink() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.put(link(), "{\"url\":\"  https://docs.google.com/d/abc  \"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://docs.google.com/d/abc"))
                .andExpect(jsonPath("$.setOn").isNotEmpty());
        student.put(link(), "{\"url\":\"https://onedrive.live.com/x\"}").andExpect(status().isOk());
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM document_link", Integer.class)).isEqualTo(2);
    }

    @Test
    void theSameLinkTwiceAddsNoRow() throws Exception { // decision R-19
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.put(link(), "{\"url\":\"https://docs.google.com/d/abc\"}").andExpect(status().isOk());
        student.put(link(), "{\"url\":\"https://docs.google.com/d/abc\"}").andExpect(status().isOk());
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM document_link", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM audit_event WHERE event_type = 'DOCUMENT_LINK_SET'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void onlyHttpsLinksAreKept() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        for (String bad : new String[] {"http://docs.google.com/d/abc", "javascript:alert(1)", "docs.google.com", ""}) {
            student.put(link(), "{\"url\":\"" + bad + "\"}").andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        }
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM document_link", Integer.class)).isZero();
    }
}
