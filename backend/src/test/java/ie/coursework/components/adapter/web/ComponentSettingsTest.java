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

@AutoConfigureMockMvc
class ComponentSettingsTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private UUID component;

    @BeforeEach
    void component() {
        ClassFixtures.World world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }

    @Test
    void theClassesTeacherTurnsTheSettingOnAndTheViewSaysSo() throws Exception {
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        teacher.get("/api/v1/components/" + component).andExpect(jsonPath("$.requireLink").value(false));
        teacher.put("/api/v1/components/" + component + "/settings", "{\"requireLink\":true}").andExpect(status().isOk())
                .andExpect(jsonPath("$.view").value("TEACHER")).andExpect(jsonPath("$.requireLink").value(true));
    }

    @Test
    void nobodyElseReachesIt() throws Exception {
        for (String user : new String[] {ClassFixtures.TEACHER2, ClassFixtures.TEACHER_B, ClassFixtures.APPROVED_STUDENT}) {
            as(user).put("/api/v1/components/" + component + "/settings", "{\"requireLink\":true}").andExpect(status().isNotFound());
        }
    }

    @Test
    void theFlagIsRequired() throws Exception {
        as(ClassFixtures.TEACHER1).put("/api/v1/components/" + component + "/settings", "{}").andExpect(status().isBadRequest());
    }
}
