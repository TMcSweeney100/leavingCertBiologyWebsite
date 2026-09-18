package ie.coursework.components.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class MyComponentsTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    @Test
    void listsComponentsOfApprovedClassesOnly() throws Exception {
        ClassFixtures.World world = fixtures.world();
        var id = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);

        new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD).get("/api/v1/me/components")
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].componentId").value(id.toString()))
                .andExpect(jsonPath("$[0].subjectName").value("Biology"))
                .andExpect(jsonPath("$[0].completionDate").value("2027-02-26"));
        new ApiSession(mockMvc).login(ClassFixtures.PENDING_STUDENT, TestAccounts.PASSWORD).get("/api/v1/me/components")
                .andExpect(jsonPath("$").isEmpty());
        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD).get("/api/v1/me/components")
                .andExpect(jsonPath("$").isEmpty());
    }
}
