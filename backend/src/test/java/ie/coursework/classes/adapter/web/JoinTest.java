package ie.coursework.classes.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class JoinTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    private static String signUp(String username, String password) {
        return """
                {"firstName":"Aoife","lastName":"Byrne","username":"%s","password":"%s"}
                """.formatted(username, password);
    }

    @Test
    void previewNamesTheClassSubjectAndSchoolAndIsForgivingAboutTyping() throws Exception {
        ClassFixtures.World world = fixtures.world();
        String typed = world.class1Code().toLowerCase().replaceFirst("(....)(....)", "$1-$2");

        new ApiSession(mockMvc).get("/api/v1/join/" + typed)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.className").value("6A Biology"))
                .andExpect(jsonPath("$.subjectName").value("Biology"))
                .andExpect(jsonPath("$.schoolName").value("School A"));
    }

    @Test
    void unknownExpiredAndDisabledCodesGetOneAnswer() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession nobody = new ApiSession(mockMvc);

        nobody.get("/api/v1/join/ZZZZZZZZ").andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("JOIN_CODE_INVALID"));
        nobody.get("/api/v1/join/not-a-code").andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("JOIN_CODE_INVALID"));

        jdbcTemplate.update("UPDATE class_group SET join_code_expires_at = now() - interval '1 minute' WHERE id = ?", world.class1());
        nobody.get("/api/v1/join/" + world.class1Code()).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("JOIN_CODE_INVALID"));
    }

    @Test
    void signUpCreatesAStudentSignsThemInAndRequestsToJoin() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession phone = new ApiSession(mockMvc);

        phone.post("/api/v1/join/" + world.class1Code() + "/accounts", signUp("Aoife.Byrne", "aoife-loves-cells"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.className").value("6A Biology"));

        assertThat(phone.cookie("SESSION")).isPresent();
        phone.get("/api/v1/auth/me")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("aoife.byrne"))
                .andExpect(jsonPath("$.mustChangePassword").value(false))
                .andExpect(jsonPath("$.roles[0].role").value("STUDENT"))
                .andExpect(jsonPath("$.roles[0].schoolId").value(world.schoolA().toString()));
        phone.get("/api/v1/me/classes").andExpect(jsonPath("$[0].status").value("PENDING"));
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_event WHERE event_type IN ('USER_CREATED', 'ROLE_GRANTED')", Integer.class))
                .isEqualTo(2);
    }

    @Test
    void signUpValidatesTheUsernameAndPasswordAndReportsATakenName() throws Exception {
        ClassFixtures.World world = fixtures.world();
        String path = "/api/v1/join/" + world.class1Code() + "/accounts";

        new ApiSession(mockMvc).post(path, signUp("ab", "aoife-loves-cells"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("USERNAME_INVALID"));
        new ApiSession(mockMvc).post(path, signUp("aoife.b", "short"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PASSWORD_TOO_SHORT"));
        new ApiSession(mockMvc).post(path, signUp(ClassFixtures.APPROVED_STUDENT, "aoife-loves-cells"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("USERNAME_TAKEN"));
        new ApiSession(mockMvc).post("/api/v1/join/ZZZZZZZZ/accounts", signUp("aoife.b", "aoife-loves-cells"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("JOIN_CODE_INVALID"));
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM password_credential WHERE username = 'aoife.b'", Integer.class))
                .as("a refused sign-up leaves no account behind").isZero();
    }

    @Test
    void anExistingAccountJoinsASecondClassAndSeesItsStatus() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession student = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);

        student.post("/api/v1/join/CKASSTWP/enrolments")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.className").value("6B Biology"));
        student.get("/api/v1/me/classes").andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void joiningAgainIsHarmlessAndShowsTheCurrentStatus() throws Exception {
        ClassFixtures.World world = fixtures.world();

        new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD)
                .post("/api/v1/join/" + world.class1Code() + "/enrolments")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.enrolmentId").value(world.approvedEnrolment().toString()));
        new ApiSession(mockMvc).login(ClassFixtures.REMOVED_STUDENT, TestAccounts.PASSWORD)
                .post("/api/v1/join/" + world.class1Code() + "/enrolments")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void aTeacherJoiningTheirOwnCodeGetsAStudentRoleTooBecauseTheDesignAllowsSeveralRoles() throws Exception {
        ClassFixtures.World world = fixtures.world();

        new ApiSession(mockMvc).login(ClassFixtures.TEACHER2, TestAccounts.PASSWORD)
                .post("/api/v1/join/" + world.class1Code() + "/enrolments")
                .andExpect(status().isOk());
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_role WHERE user_id = ? AND role = 'STUDENT'", Integer.class, world.teacher2()))
                .isEqualTo(1);
    }
}
