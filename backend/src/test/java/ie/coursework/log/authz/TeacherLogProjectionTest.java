package ie.coursework.log.authz;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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

/**
 * Design §6.6 and FR-24d: the teacher sees that every entry exists, but a hidden entry's body, fields and
 * history never reach them. Every secret carries "SECRET" so one assertion on the raw JSON covers them all.
 * Bite-tested in the plan (Task B11 Step 6).
 */
@AutoConfigureMockMvc
class TeacherLogProjectionTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private String log;
    private String teacherPath;

    @BeforeEach
    void seed() {
        world = fixtures.world();
        var component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        log = "/api/v1/components/" + component + "/log";
        teacherPath = "/api/v1/components/" + component + "/students/" + world.approvedStudent() + "/log";
    }

    @Test
    void aHiddenEntrysContentNeverReachesTheTeacher() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        create(student, "{\"kind\":\"NOTE\",\"body\":\"Visible note text\"}");
        String note = create(student, "{\"kind\":\"NOTE\",\"body\":\"SECRET-note-v1\"}");
        student.post(note + "/revisions", "{\"body\":\"SECRET-note-v2\"}").andExpect(status().isCreated());
        student.put(note + "/visibility", "{\"visible\":false}").andExpect(status().isOk());
        String source = create(student, """
                {"kind":"SOURCE","fields":{"type":"ONLINE_TEXT_OR_IMAGE","title":"SECRET-title","url":"https://example.ie/SECRET-url","dateAccessed":"2026-10-01","reflections":"SECRET-reflection"}}
                """);
        student.put(source + "/visibility", "{\"visible\":false}").andExpect(status().isOk());
        create(student, """
                {"kind":"AI_USE","visibleToTeacher":false,"fields":{"toolNameAndVersion":"SECRET-tool","developer":"SECRET-dev","dateGenerated":"2026-10-01","howUsed":"SECRET-how","prompts":"SECRET-prompt"}}
                """);

        String json = as(ClassFixtures.TEACHER1).get(teacherPath).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(json).doesNotContain("SECRET");
        assertThat(json).contains("Visible note text");
        assertThat(JsonPath.<Integer>read(json, "$.entries.length()")).isEqualTo(4);
        assertThat(JsonPath.<java.util.List<String>>read(json, "$.entries[?(@.visibility == 'HIDDEN')].kind"))
                .containsExactlyInAnyOrder("NOTE", "SOURCE", "AI_USE");
        assertThat(JsonPath.<java.util.List<Integer>>read(json, "$.entries[?(@.kind == 'NOTE' && @.visibility == 'HIDDEN')].revisionCount"))
                .containsExactly(2);
        // Hidden after being visible (Q3): hiddenAt is set. Private from the start: it isn't.
        assertThat(JsonPath.<java.util.List<Object>>read(json, "$.entries[?(@.kind == 'NOTE' && @.visibility == 'HIDDEN')].hiddenAt"))
                .doesNotContainNull();
        assertThat(JsonPath.<java.util.List<Object>>read(json, "$.entries[?(@.kind == 'AI_USE')].hiddenAt")).containsExactly((Object) null);
        assertThat(JsonPath.<java.util.List<Object>>read(json, "$.entries[?(@.visibility == 'HIDDEN')].createdAt")).doesNotContainNull();
    }

    @Test
    void showingAnEntryAgainShowsItsWholeHistory() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        String note = create(student, "{\"kind\":\"NOTE\",\"body\":\"before hiding\"}");
        student.put(note + "/visibility", "{\"visible\":false}").andExpect(status().isOk());
        student.post(note + "/revisions", "{\"body\":\"written while hidden\"}").andExpect(status().isCreated());
        student.put(note + "/visibility", "{\"visible\":true}").andExpect(status().isOk());

        as(ClassFixtures.TEACHER1).get(teacherPath).andExpect(status().isOk())
                .andExpect(jsonPath("$.entries[0].visibility").value("VISIBLE"))
                .andExpect(jsonPath("$.entries[0].body").value("written while hidden"))
                .andExpect(jsonPath("$.entries[0].history[*].body").value(org.hamcrest.Matchers.contains("written while hidden", "before hiding")));
    }

    @Test
    void theTeacherSeesTheStudentsName() throws Exception {
        as(ClassFixtures.TEACHER1).get(teacherPath).andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(world.approvedStudent().toString()))
                .andExpect(jsonPath("$.entries").isEmpty());
    }

    private String create(ApiSession student, String json) throws Exception {
        String body = student.post(log, json).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return "/api/v1/log/" + JsonPath.read(body, "$.entry.id");
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }
}
