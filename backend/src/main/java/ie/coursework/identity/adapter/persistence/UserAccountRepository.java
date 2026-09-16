package ie.coursework.identity.adapter.persistence;

import ie.coursework.identity.domain.UserProfile;
import ie.coursework.identity.domain.Username;
import ie.coursework.shared.persistence.Timestamps;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserAccountRepository {

    private static final String CREDENTIAL_COLUMNS = """
            SELECT c.user_id, c.username, c.password_hash, c.must_change, u.disabled_at IS NOT NULL AS disabled
            FROM password_credential c JOIN app_user u ON u.id = c.user_id
            """;

    private final JdbcClient jdbc;

    public UserAccountRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID insertUser(String firstName, String lastName) {
        return jdbc.sql("INSERT INTO app_user (first_name, last_name) VALUES (:first, :last) RETURNING id")
                .param("first", firstName.strip())
                .param("last", lastName.strip())
                .query(UUID.class)
                .single();
    }

    /** Throws DuplicateKeyException when the username is taken; the caller names the problem. */
    public void insertCredential(UUID userId, Username username, String passwordHash, boolean mustChange) {
        jdbc.sql("""
                INSERT INTO password_credential (user_id, username, password_hash, must_change)
                VALUES (:userId, :username, :hash, :mustChange)
                """)
                .param("userId", userId)
                .param("username", username.value())
                .param("hash", passwordHash)
                .param("mustChange", mustChange)
                .update();
    }

    public Optional<StoredCredential> findCredential(Username username) {
        return jdbc.sql(CREDENTIAL_COLUMNS + " WHERE c.username = :username")
                .param("username", username.value())
                .query(StoredCredential.class)
                .optional();
    }

    public Optional<StoredCredential> findCredential(UUID userId) {
        return jdbc.sql(CREDENTIAL_COLUMNS + " WHERE c.user_id = :userId")
                .param("userId", userId)
                .query(StoredCredential.class)
                .optional();
    }

    public void updatePassword(UUID userId, String passwordHash, boolean mustChange, Instant now) {
        jdbc.sql("""
                UPDATE password_credential
                SET password_hash = :hash, must_change = :mustChange, updated_at = :now
                WHERE user_id = :userId
                """)
                .param("hash", passwordHash)
                .param("mustChange", mustChange)
                .param("now", Timestamps.utc(now))
                .param("userId", userId)
                .update();
    }

    public Optional<UserProfile> findProfile(UUID userId) {
        return jdbc.sql("""
                SELECT u.id AS user_id, c.username, u.first_name, u.last_name, c.must_change,
                       u.disabled_at IS NOT NULL AS disabled
                FROM app_user u JOIN password_credential c ON c.user_id = u.id
                WHERE u.id = :userId
                """)
                .param("userId", userId)
                .query(UserProfile.class)
                .optional();
    }
}
