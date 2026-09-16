package ie.coursework.classes.authz;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.support.ApiSession;
import org.junit.jupiter.api.Test;

class AnonymousScopeTest extends AuthzSuite {

    @Test
    void joinPreviewIsPublicButJoiningAndEverythingElseNeedsASession() throws Exception {
        ApiSession nobody = anonymous();

        nobody.get("/api/v1/join/" + world.class1Code()).andExpect(status().isOk());

        nobody.get("/api/v1/classes").andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        nobody.get("/api/v1/classes/" + world.class1()).andExpect(status().isUnauthorized());
        nobody.get("/api/v1/me/classes").andExpect(status().isUnauthorized());
        nobody.post("/api/v1/join/" + world.class1Code() + "/enrolments").andExpect(status().isUnauthorized());
        nobody.post("/api/v1/classes/" + world.class1() + "/enrolments/" + world.pendingEnrolment() + "/approve")
                .andExpect(status().isUnauthorized());
    }
}
