package ie.coursework.support;

import ie.coursework.identity.adapter.persistence.RoleRepository;
import ie.coursework.identity.adapter.persistence.SchoolRepository;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Role;
import ie.coursework.identity.domain.Username;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates schools and users with known passwords, straight through the repositories. */
@Component
public class TestAccounts {

    public static final String PASSWORD = "correct-horse-battery";

    private final UserAccountRepository users;
    private final SchoolRepository schools;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;

    public TestAccounts(UserAccountRepository users, SchoolRepository schools, RoleRepository roles,
            PasswordEncoder passwordEncoder) {
        this.users = users;
        this.schools = schools;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
    }

    public UUID school(String name, String rollNumber) {
        return schools.insert(name, rollNumber);
    }

    public UUID user(String username) {
        return user(username, PASSWORD, false);
    }

    public UUID user(String username, String password, boolean mustChange) {
        UUID userId = users.insertUser("Test", username);
        users.insertCredential(userId, Username.parse(username), passwordEncoder.encode(password), mustChange);
        return userId;
    }

    public UUID userWithRole(String username, UUID schoolId, Role role) {
        UUID userId = user(username);
        roles.grant(userId, schoolId, role);
        return userId;
    }

    public void disable(UUID userId, org.springframework.jdbc.core.JdbcTemplate jdbc) {
        jdbc.update("UPDATE app_user SET disabled_at = ? WHERE id = ?",
                java.sql.Timestamp.from(Instant.now()), userId);
    }
}
