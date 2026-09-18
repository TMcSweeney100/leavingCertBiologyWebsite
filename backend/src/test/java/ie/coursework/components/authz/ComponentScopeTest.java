package ie.coursework.components.authz;

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
import org.springframework.test.web.servlet.ResultMatcher;

/** Teacher 1 owns class 1 and its Biology component. Design §9: anything out of scope is 404, never 403. */
@AutoConfigureMockMvc
class ComponentScopeTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private String component;
    private String item;

    @BeforeEach
    void seed() {
        world = fixtures.world();
        UUID id = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        component = "/api/v1/components/" + id;
        item = component + "/teacher-items/" + components.item(id, stage(6), "Full draft in", null);
    }

    @Test
    void theOwnerReachesEverything() throws Exception {
        ApiSession owner = as(ClassFixtures.TEACHER1);
        owner.get(component).andExpect(status().isOk());
        owner.put(component + "/stage-dates", "{\"dates\":[]}").andExpect(status().isOk());
    }

    @Test
    void anotherTeacherAtTheSameSchoolGetsNotFound() throws Exception {
        everyEndpoint(as(ClassFixtures.TEACHER2), status().isNotFound());
        as(ClassFixtures.TEACHER2).post("/api/v1/classes/" + world.class1() + "/components",
                "{\"briefId\":\"%s\"}".formatted(components.briefId(ComponentFixtures.BIOLOGY_2027)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aTeacherAtAnotherSchoolGetsNotFound() throws Exception {
        everyEndpoint(as(ClassFixtures.TEACHER_B), status().isNotFound());
    }

    @Test
    void aSchoolLeaderGetsNotFound() throws Exception {
        everyEndpoint(as(ClassFixtures.LEADER_A), status().isNotFound());
    }

    @Test
    void studentsGetNotFound() throws Exception {
        // 2E: the approved student's GET becomes their own view; every other endpoint stays 404 for them.
        ApiSession approved = as(ClassFixtures.APPROVED_STUDENT);
        approved.get(component).andExpect(status().isOk());
        approved.put(component + "/stage-dates", "{\"dates\":[]}").andExpect(status().isNotFound());
        approved.post(component + "/teacher-items", "{\"stageId\":\"%s\",\"text\":\"x\",\"dueDate\":null}".formatted(stage(6)))
                .andExpect(status().isNotFound());
        approved.patch(item, "{\"text\":\"x\",\"dueDate\":null}").andExpect(status().isNotFound());
        approved.delete(item).andExpect(status().isNotFound());

        everyEndpoint(as(ClassFixtures.PENDING_STUDENT), status().isNotFound());
        everyEndpoint(as(ClassFixtures.OUTSIDER), status().isNotFound());
    }

    @Test
    void anonymousIsUnauthenticated() throws Exception {
        new ApiSession(mockMvc).get(component).andExpect(status().isUnauthorized());
    }

    @Test
    void anotherTeachersItemCannotBeReachedThroughTheirOwnComponent() throws Exception {
        UUID theirs = components.component(world.class2(), world.teacher2(), ComponentFixtures.BIOLOGY_2027);
        String myItemUnderTheirComponent = "/api/v1/components/" + theirs + "/teacher-items/" + item.substring(item.lastIndexOf('/') + 1);

        as(ClassFixtures.TEACHER2).delete(myItemUnderTheirComponent).andExpect(status().isNotFound());
    }

    private void everyEndpoint(ApiSession session, ResultMatcher expected) throws Exception {
        session.get(component).andExpect(expected);
        session.put(component + "/stage-dates", "{\"dates\":[]}").andExpect(expected);
        session.post(component + "/teacher-items", "{\"stageId\":\"%s\",\"text\":\"x\",\"dueDate\":null}".formatted(stage(6)))
                .andExpect(expected);
        session.patch(item, "{\"text\":\"x\",\"dueDate\":null}").andExpect(expected);
        session.delete(item).andExpect(expected);
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }

    private UUID stage(int ordinal) {
        return components.stageId(ComponentFixtures.BIOLOGY_2027, ordinal);
    }
}
