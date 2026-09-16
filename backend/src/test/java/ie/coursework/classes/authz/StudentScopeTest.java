package ie.coursework.classes.authz;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import org.junit.jupiter.api.Test;

class StudentScopeTest extends AuthzSuite {

    @Test
    void canListTheirOwnClasses() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).get("/api/v1/me/classes")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].className").value("6A Biology"));
    }

    @Test
    void teacherEndpointsAreNotFoundForAStudent() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        String class1 = "/api/v1/classes/" + world.class1();

        student.get("/api/v1/classes").andExpect(status().isNotFound());
        student.post("/api/v1/classes", """
                {"schoolId":"%s","subjectCode":"BIOLOGY","name":"6C","yearGroup":6,"academicYear":"2026/27"}
                """.formatted(world.schoolA())).andExpect(status().isNotFound());
        student.get(class1).andExpect(status().isNotFound());
        student.post(class1 + "/join-code").andExpect(status().isNotFound());
        student.post(class1 + "/enrolments/" + world.pendingEnrolment() + "/approve").andExpect(status().isNotFound());
        student.post(class1 + "/students/" + world.pendingStudent() + "/reset-codes").andExpect(status().isNotFound());
    }

    @Test
    void aStudentCannotSeeAnotherStudentsEnrolmentOrDecideTheirOwn() throws Exception {
        ApiSession student = as(ClassFixtures.PENDING_STUDENT);
        String own = "/api/v1/classes/" + world.class1() + "/enrolments/" + world.pendingEnrolment();

        student.post(own + "/approve").andExpect(status().isNotFound());
        student.post(own + "/remove").andExpect(status().isNotFound());
        student.delete("/api/v1/classes/" + world.class1() + "/join-code").andExpect(status().isNotFound());
    }

    @Test
    void aStudentAtAnotherSchoolSeesOnlyTheirOwnClasses() throws Exception {
        as(ClassFixtures.OUTSIDER).get("/api/v1/me/classes").andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    }
}
