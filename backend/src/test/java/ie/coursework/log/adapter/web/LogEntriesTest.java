package ie.coursework.log.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.MutableClock;
import ie.coursework.support.TestAccounts;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class LogEntriesTest extends PostgresIntegrationTest {

    @TestConfiguration
    static class PinnedClock {
        @Bean
        @Primary
        Clock testClock() {
            return new MutableClock(Instant.parse("2026-10-12T08:00:00Z"));
        }
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private Clock clock;

    private String log;

    @BeforeEach
    void seed() {
        ((MutableClock) clock).advance(Duration.between(clock.instant(), Instant.parse("2026-10-12T08:00:00Z")));
        ClassFixtures.World world = fixtures.world();
        log = "/api/v1/components/" + components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027) + "/log";
    }

    @Test
    void aNoteIsVisibleByDefaultAndTheServerSetsItsTime() throws Exception {
        student().post(log, """
                {"kind":"NOTE","body":"Ran the pilot titration.","fields":null,"createdAt":"2020-01-01T00:00:00Z"}
                """).andExpect(status().isCreated())
                .andExpect(jsonPath("$.entry.kind").value("NOTE"))
                .andExpect(jsonPath("$.entry.visibleToTeacher").value(true))
                .andExpect(jsonPath("$.entry.createdAt").value("2026-10-12T08:00:00Z"))
                .andExpect(jsonPath("$.entry.editedAt").isEmpty())
                .andExpect(jsonPath("$.entry.fields").isEmpty())
                .andExpect(jsonPath("$.history.length()").value(1));
    }

    @Test
    void anOnlineSourceRoundTripsItsFields() throws Exception {
        student().post(log, """
                {"kind":"SOURCE","body":null,"fields":{"type":"ONLINE_VIDEO","title":"Zig & Zag – Christmas crises",
                 "url":"https://youtu.be/yCv4iyPqZKQ","dateAccessed":"2024-12-12","locator":"3:20 to 5:45"}}
                """).andExpect(status().isCreated())
                .andExpect(jsonPath("$.entry.fields.type").value("ONLINE_VIDEO"))
                .andExpect(jsonPath("$.entry.fields.url").value("https://youtu.be/yCv4iyPqZKQ"))
                .andExpect(jsonPath("$.entry.fields.dateAccessed").value("2024-12-12"));
    }

    @Test
    void anAiUseNeedsItsMinimumDetails() throws Exception {
        student().post(log, """
                {"kind":"AI_USE","fields":{"toolNameAndVersion":"ChatGPT-4","developer":"OpenAI"}}
                """).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[*].field").value(org.hamcrest.Matchers.containsInAnyOrder("fields.dateGenerated", "fields.howUsed")));
    }

    @Test
    void anHttpLinkIsRefused() throws Exception {
        student().post(log, """
                {"kind":"SOURCE","fields":{"type":"ONLINE_TEXT_OR_IMAGE","title":"Latin Library","url":"http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf","dateAccessed":"2024-06-17"}}
                """).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("fields.url"));
    }

    @Test
    void fieldsInTheWrongShapeAreAValidationFailure() throws Exception {
        student().post(log, """
                {"kind":"AI_USE","fields":{"toolNameAndVersion":"x","developer":"y","dateGenerated":"not a date","howUsed":"z"}}
                """).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        student().post(log, """
                {"kind":"NOTE","body":"x","fields":{"title":"no"}}
                """).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors[0].field").value("fields"));
    }

    @Test
    void aRevisionKeepsTheOldTextAndMarksTheEntryEdited() throws Exception {
        ApiSession student = student();
        String entry = "/api/v1/log/" + id(student.post(log, "{\"kind\":\"NOTE\",\"body\":\"v1\"}").andReturn().getResponse().getContentAsString());
        ((MutableClock) clock).advance(Duration.ofHours(2));
        student.post(entry + "/revisions", "{\"body\":\"v2\",\"createdAt\":\"2020-01-01T00:00:00Z\"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.entry.body").value("v2"))
                .andExpect(jsonPath("$.entry.revisionCount").value(2))
                .andExpect(jsonPath("$.entry.createdAt").value("2026-10-12T08:00:00Z"))
                .andExpect(jsonPath("$.entry.editedAt").value("2026-10-12T10:00:00Z"))
                .andExpect(jsonPath("$.history[*].body").value(org.hamcrest.Matchers.contains("v2", "v1")));
    }

    @Test
    void hidingIsOneCallAndTheListShowsIt() throws Exception {
        ApiSession student = student();
        String entry = "/api/v1/log/" + id(student.post(log, "{\"kind\":\"NOTE\",\"body\":\"private thought\"}").andReturn().getResponse().getContentAsString());
        student.put(entry + "/visibility", "{\"visible\":false}").andExpect(status().isOk())
                .andExpect(jsonPath("$.visibleToTeacher").value(false));
        student.get(log).andExpect(status().isOk()).andExpect(jsonPath("$[0].visibleToTeacher").value(false));
    }

    @Test
    void aStudentMayCreateAnEntryHidden() throws Exception {
        student().post(log, "{\"kind\":\"NOTE\",\"body\":\"x\",\"visibleToTeacher\":false}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.entry.visibleToTeacher").value(false));
    }

    @Test
    void linksAreStoredStrippedSoWhatIsCheckedIsWhatIsRendered() throws Exception {
        student().post(log, """
                {"kind":"SOURCE","fields":{"type":"ONLINE_TEXT_OR_IMAGE","title":"Latin Library","url":"  https://www.thelatinlibrary.com/x.pdf  ","dateAccessed":"2024-06-17"}}
                """).andExpect(status().isCreated())
                .andExpect(jsonPath("$.entry.fields.url").value("https://www.thelatinlibrary.com/x.pdf"));
        student().post(log, """
                {"kind":"AI_USE","fields":{"toolNameAndVersion":"x","developer":"y","dateGenerated":"2026-10-01","howUsed":"z","shareUrl":"  https://chat.example/s/1 "}}
                """).andExpect(status().isCreated())
                .andExpect(jsonPath("$.entry.fields.shareUrl").value("https://chat.example/s/1"));
        student().post(log, """
                {"kind":"AI_USE","fields":{"toolNameAndVersion":"x","developer":"y","dateGenerated":"2026-10-01","howUsed":"z","shareUrl":"   "}}
                """).andExpect(status().isCreated())
                .andExpect(jsonPath("$.entry.fields.shareUrl").isEmpty());
    }

    @Test
    void anUnknownKindIsAValidationFailureWithAFieldError() throws Exception {
        student().post(log, "{\"kind\":\"DIARY\",\"body\":\"x\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("kind"));
    }

    private static String id(String body) {
        return JsonPath.read(body, "$.entry.id");
    }

    private ApiSession student() throws Exception {
        return new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);
    }
}
