package ie.coursework.classes.authz;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import org.junit.jupiter.api.Test;

/** Teacher 1 owns class 1. Teacher 2 (same school) and teacher B (other school) own others. */
class TeacherScopeTest extends AuthzSuite {

    @Test
    void ownClassIsVisible() throws Exception {
        as(ClassFixtures.TEACHER1).get("/api/v1/classes/" + world.class1()).andExpect(status().isOk());
    }

    @Test
    void anotherTeachersClassIsNotFoundEvenAtTheSameSchool() throws Exception {
        ApiSession teacher2 = as(ClassFixtures.TEACHER2);
        String class1 = "/api/v1/classes/" + world.class1();

        teacher2.get(class1).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        teacher2.post(class1 + "/join-code").andExpect(status().isNotFound());
        teacher2.delete(class1 + "/join-code").andExpect(status().isNotFound());
        teacher2.post(class1 + "/enrolments/" + world.pendingEnrolment() + "/approve").andExpect(status().isNotFound());
        teacher2.post(class1 + "/enrolments/" + world.approvedEnrolment() + "/remove").andExpect(status().isNotFound());
        teacher2.post(class1 + "/students/" + world.approvedStudent() + "/reset-codes").andExpect(status().isNotFound());
    }

    @Test
    void aClassAtAnotherSchoolIsNotFound() throws Exception {
        as(ClassFixtures.TEACHER_B).get("/api/v1/classes/" + world.class1()).andExpect(status().isNotFound());
    }

    @Test
    void anEnrolmentIdFromAnotherClassIsNotFoundUnderMine() throws Exception {
        // Teacher 2 owns class 2; the enrolment belongs to class 1.
        as(ClassFixtures.TEACHER2)
                .post("/api/v1/classes/" + world.class2() + "/enrolments/" + world.pendingEnrolment() + "/approve")
                .andExpect(status().isNotFound());
    }

    @Test
    void aStudentNotInMyClassCannotBeIssuedAResetCode() throws Exception {
        as(ClassFixtures.TEACHER1)
                .post("/api/v1/classes/" + world.class1() + "/students/" + world.outsider() + "/reset-codes")
                .andExpect(status().isNotFound());
    }

    @Test
    void cannotCreateAClassAtASchoolWhereTheyDontTeach() throws Exception {
        as(ClassFixtures.TEACHER_B).post("/api/v1/classes", """
                {"schoolId":"%s","subjectCode":"BIOLOGY","name":"6C","yearGroup":6,"academicYear":"2026/27"}
                """.formatted(world.schoolA()))
                .andExpect(status().isNotFound());
    }

    @Test
    void anotherSchoolsTeacherCannotTouchMyEnrolmentsThroughTheirOwnClassId() throws Exception {
        as(ClassFixtures.TEACHER_B)
                .post("/api/v1/classes/" + world.classB() + "/enrolments/" + world.pendingEnrolment() + "/approve")
                .andExpect(status().isNotFound());
        as(ClassFixtures.TEACHER_B)
                .post("/api/v1/classes/" + world.classB() + "/students/" + world.approvedStudent() + "/reset-codes")
                .andExpect(status().isNotFound());
    }

    @Test
    void aTeacherCannotJoinPreviewLessThanAnyoneElseButCannotListStudentsClasses() throws Exception {
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        teacher.get("/api/v1/join/" + world.class1Code()).andExpect(status().isOk());
        teacher.get("/api/v1/me/classes").andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    }
}
