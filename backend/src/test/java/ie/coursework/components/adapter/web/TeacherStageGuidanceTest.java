package ie.coursework.components.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** Stage sheet S-3: the teacher's stage data carries what the student is told (the description and the prompts). */
@AutoConfigureMockMvc
class TeacherStageGuidanceTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    @Test
    void eachStageCarriesItsDescriptionAndPrompts() throws Exception {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        UUID stage1 = components.stageId(ComponentFixtures.BIOLOGY_2027, 1);
        String description = jdbcTemplate.queryForObject("SELECT description FROM template_stage WHERE id = ?", String.class, stage1);
        Integer prompts = jdbcTemplate.queryForObject("SELECT count(*)::int FROM template_prompt WHERE stage_id = ?", Integer.class, stage1);

        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .get("/api/v1/components/" + component)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.view").value("TEACHER"))
                .andExpect(jsonPath("$.stages[0].description").value(description))
                .andExpect(jsonPath("$.stages[0].prompts.length()").value(prompts));
    }
}
