package ie.coursework.components.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class StageDatesTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ApiSession teacher;
    private UUID component;
    private String path;

    @BeforeEach
    void component() throws Exception {
        ClassFixtures.World world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        path = "/api/v1/components/" + component + "/stage-dates";
        teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    @Test
    void setsTheDatesSentAndClearsTheRest() throws Exception {
        components.stageDate(component, stage(1), LocalDate.of(2026, 5, 29));

        teacher.put(path, dates(stage(3), "2026-09-25", stage(4), "2026-10-16"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages[0].dueDate").value(nullValue()))
                .andExpect(jsonPath("$.stages[2].dueDate").value("2026-09-25"))
                .andExpect(jsonPath("$.stages[3].dueDate").value("2026-10-16"))
                .andExpect(jsonPath("$.warnings").isEmpty());
    }

    @Test
    void aNullDateMeansNoDate() throws Exception {
        teacher.put(path, "{\"dates\":[{\"stageId\":\"%s\",\"dueDate\":null}]}".formatted(stage(2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages[1].dueDate").value(nullValue()));
    }

    @Test
    void theCompletionDateItselfIsAllowed() throws Exception {
        teacher.put(path, dates(stage(6), "2027-02-26")).andExpect(status().isOk());
    }

    @Test
    void aDateAfterTheCompletionDateIsRefusedByNameAndNothingIsSaved() throws Exception {
        teacher.put(path, dates(stage(3), "2026-09-25", stage(6), "2027-03-05"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("COMPLETION_DATE_EXCEEDED"))
                .andExpect(jsonPath("$.detail").value(
                        "Stage 6 is after the completion date, 26 Feb 2027. Choose a date on or before it."))
                .andExpect(jsonPath("$.fieldErrors[0].field").value(stage(6).toString()));

        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM instance_stage_date", Integer.class)).isZero();
    }

    @Test
    void severalLateDatesAreCounted() throws Exception {
        teacher.put(path, dates(stage(5), "2027-03-01", stage(6), "2027-03-05"))
                .andExpect(jsonPath("$.detail").value(
                        "2 dates are after the completion date, 26 Feb 2027. Choose dates on or before them."))
                .andExpect(jsonPath("$.fieldErrors.length()").value(2));
    }

    @Test
    void outOfOrderDatesAreSavedWithAWarningNamingBothStages() throws Exception {
        teacher.put(path, dates(stage(4), "2026-10-16", stage(5), "2026-10-09"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages[4].dueDate").value("2026-10-09"))
                .andExpect(jsonPath("$.warnings[0].code").value("OUT_OF_ORDER"))
                .andExpect(jsonPath("$.warnings[0].stageIds", contains(stage(4).toString(), stage(5).toString())));
    }

    @Test
    void aStageFromAnotherTemplateIsAValidationError() throws Exception {
        UUID chemistryStage = components.stageId(ComponentFixtures.CHEMISTRY_2027, 1);

        teacher.put(path, dates(chemistryStage, "2026-10-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void whenTheSecMovesTheCompletionDateEarlierLaterDatesAreFlaggedAndMustBeFixed() throws Exception {
        components.stageDate(component, stage(6), LocalDate.of(2027, 2, 20));
        // Content table: restore it whatever happens, or every later test sees the moved date.
        jdbcTemplate.update("UPDATE annual_brief SET completion_date = DATE '2027-02-12' WHERE sec_code = ?", BIO);
        try {
            teacher.get("/api/v1/components/" + component)
                    .andExpect(jsonPath("$.warnings[0].code").value("AFTER_COMPLETION_DATE"))
                    .andExpect(jsonPath("$.warnings[0].stageIds[0]").value(stage(6).toString()));

            teacher.put(path, dates(stage(3), "2026-09-25", stage(6), "2027-02-20"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail").value(
                            "Stage 6 is after the completion date, 12 Feb 2027. Choose a date on or before it."));
        } finally {
            jdbcTemplate.update("UPDATE annual_brief SET completion_date = DATE '2027-02-26' WHERE sec_code = ?", BIO);
        }
    }

    private UUID stage(int ordinal) {
        return components.stageId(BIO, ordinal);
    }

    private static String dates(Object... stageThenDate) {
        StringBuilder json = new StringBuilder("{\"dates\":[");
        for (int i = 0; i < stageThenDate.length; i += 2) {
            json.append(i == 0 ? "" : ",").append("{\"stageId\":\"%s\",\"dueDate\":\"%s\"}".formatted(stageThenDate[i], stageThenDate[i + 1]));
        }
        return json.append("]}").toString();
    }
}
