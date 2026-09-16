package ie.coursework.classes.authz;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Every scope test starts from the same world and signs one user in.
 *
 * <p>Until every 1C endpoint exists (Tasks 5-9), most {@code isNotFound()} assertions in these
 * suites pass "by accident": Spring's {@code NoResourceFoundException} 404s an unmapped route
 * regardless of who's asking. That's why each suite also carries at least one positive
 * (200-expecting) case — that's the one that actually proves the endpoint enforces scope, and
 * it's the one that's still red until its task lands.
 */
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
