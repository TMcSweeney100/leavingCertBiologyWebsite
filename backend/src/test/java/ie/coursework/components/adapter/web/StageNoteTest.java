package ie.coursework.components.adapter.web;

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

/** Stage sheet S-8, S-24: one note per stage, set and cleared by the class's teacher, read by its approved students. */
@AutoConfigureMockMvc
class StageNoteTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private UUID component;
    private String note;
    private ApiSession teacher;

    @BeforeEach
    void component() throws Exception {
        ClassFixtures.World world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        note = "/api/v1/components/" + component + "/stages/" + components.stageId(ComponentFixtures.BIOLOGY_2027, 2) + "/note";
        teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    @Test
    void theTeacherSetsChangesAndClearsTheirNote() throws Exception {
        teacher.put(note, "{\"text\":\"  Bring your notes. https://drive.google.com/x  \"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("Bring your notes. https://drive.google.com/x"))
                .andExpect(jsonPath("$.updatedOn").isNotEmpty());
        teacher.put(note, "{\"text\":\"Workshop on Thursday.\"}").andExpect(status().isOk());
        teacher.get("/api/v1/components/" + component)
                .andExpect(jsonPath("$.stages[1].note.text").value("Workshop on Thursday."))
                .andExpect(jsonPath("$.stages[0].note").isEmpty());

        teacher.delete(note).andExpect(status().isNoContent());
        teacher.get("/api/v1/components/" + component).andExpect(jsonPath("$.stages[1].note").isEmpty());
    }

    @Test
    void aBlankOrTooLongNoteIsRefused() throws Exception {
        teacher.put(note, "{\"text\":\"   \"}").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        teacher.put(note, "{\"text\":\"%s\"}".formatted("x".repeat(1001))).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void aStageOfAnotherSubjectIsNotFound() throws Exception {
        String chemistry = "/api/v1/components/" + component + "/stages/"
                + components.stageId(ComponentFixtures.CHEMISTRY_2027, 2) + "/note";
        teacher.put(chemistry, "{\"text\":\"x\"}").andExpect(status().isNotFound());
        teacher.delete(chemistry).andExpect(status().isNotFound());
    }

    @Test
    void anApprovedStudentSeesTheNoteOnTheirStage() throws Exception {
        teacher.put(note, "{\"text\":\"Workshop on Thursday.\"}").andExpect(status().isOk());
        new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD)
                .get("/api/v1/components/" + component)
                .andExpect(jsonPath("$.view").value("STUDENT"))
                .andExpect(jsonPath("$.stages[1].note.text").value("Workshop on Thursday."))
                .andExpect(jsonPath("$.stages[1].note.updatedOn").isNotEmpty());
    }
}
