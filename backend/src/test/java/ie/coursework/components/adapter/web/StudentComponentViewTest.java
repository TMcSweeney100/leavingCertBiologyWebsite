package ie.coursework.components.adapter.web;

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

@AutoConfigureMockMvc
class StudentComponentViewTest extends PostgresIntegrationTest {

    @TestConfiguration
    static class PinnedClock {
        @Bean
        @Primary
        Clock testClock() {
            // Monday 12 Oct 2026, 09:00 in Dublin.
            return new MutableClock(Instant.parse("2026-10-12T08:00:00Z"));
        }
    }

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private UUID component;
    private UUID draftItem;

    @BeforeEach
    void component() {
        ClassFixtures.World world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        components.stageDate(component, components.stageId(BIO, 3), LocalDate.of(2026, 9, 25));
        components.stageDate(component, components.stageId(BIO, 4), LocalDate.of(2026, 10, 16));
        draftItem = components.item(component, components.stageId(BIO, 6), "Full draft in for feedback", LocalDate.of(2026, 12, 4));
    }

    @Test
    void anApprovedStudentSeesTheWholeComponent() throws Exception {
        student().get("/api/v1/components/" + component)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.view").value("STUDENT"))
                .andExpect(jsonPath("$.today").value("2026-10-12"))
                .andExpect(jsonPath("$.subjectName").value("Biology"))
                .andExpect(jsonPath("$.brief.completionDate").value("2027-02-26"))
                .andExpect(jsonPath("$.brief.imageLimit").value(20))
                .andExpect(jsonPath("$.brief.rules.length()").value(7))
                .andExpect(jsonPath("$.processNote").value(org.hamcrest.Matchers.containsString("linear")))
                .andExpect(jsonPath("$.stages.length()").value(6))
                .andExpect(jsonPath("$.stages[0].prompts.length()").value(5))
                .andExpect(jsonPath("$.stages[0].description").value(org.hamcrest.Matchers.startsWith("This part of the investigation")))
                .andExpect(jsonPath("$.stages[2].dueDate").value("2026-09-25"))
                .andExpect(jsonPath("$.stages[2].checkpoint.state").value("DUE"))
                .andExpect(jsonPath("$.stages[3].checkpoint.state").value("NOT_DUE"))
                .andExpect(jsonPath("$.stages[4].dueDate").value(nullValue()))
                .andExpect(jsonPath("$.stages[5].items[0].text").value("Full draft in for feedback"))
                .andExpect(jsonPath("$.stages[5].items[0].done").value(false))
                .andExpect(jsonPath("$.sections.length()").value(7))
                .andExpect(jsonPath("$.markBands[3].wholeReport").value(true))
                .andExpect(jsonPath("$.marksTotal").value(200))
                .andExpect(jsonPath("$.weightingPercent").value(40));
    }

    @Test
    void theStudentViewCarriesNothingTeacherOnly() throws Exception {
        String json = student().get("/api/v1/components/" + component).andReturn().getResponse().getContentAsString();

        org.assertj.core.api.Assertions.assertThat(json).doesNotContain("\"warnings\"").doesNotContain("\"classId\"");
    }

    @Test
    void retiredItemsDisappearForStudents() throws Exception {
        jdbcTemplate.update("UPDATE teacher_item SET retired_at = now() WHERE id = ?", draftItem);

        student().get("/api/v1/components/" + component).andExpect(jsonPath("$.stages[5].items").isEmpty());
    }

    @Test
    void theTeacherStillGetsTheSetupView() throws Exception {
        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .get("/api/v1/components/" + component).andExpect(jsonPath("$.view").value("TEACHER"));
    }

    private ApiSession student() throws Exception {
        return new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);
    }
}
