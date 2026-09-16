package ie.coursework.classes.authz;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** Every scope test starts from the same world and signs one user in. */
@AutoConfigureMockMvc
abstract class AuthzSuite extends PostgresIntegrationTest {

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ClassFixtures fixtures;
    protected ClassFixtures.World world;

    @BeforeEach
    void seed() {
        world = fixtures.world();
    }

    protected ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }

    protected ApiSession anonymous() {
        return new ApiSession(mockMvc);
    }
}
