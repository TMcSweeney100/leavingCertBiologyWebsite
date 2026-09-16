package ie.coursework.identity.adapter.persistence;

import ie.coursework.shared.persistence.Timestamps;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ResetCodeRepository {

    private final JdbcClient jdbc;

    public ResetCodeRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Issuing a new code marks any earlier live code for the user as used, so only one is ever live. */
    public UUID issue(UUID userId, String codeHash, UUID issuedByUserId, Instant now, Instant expiresAt) {
        jdbc.sql("UPDATE password_reset_code SET used_at = :now WHERE user_id = :user AND used_at IS NULL")
                .param("now", Timestamps.utc(now))
                .param("user", userId)
                .update();
        return jdbc.sql("""
                INSERT INTO password_reset_code (user_id, code_hash, issued_by_user_id, expires_at)
                VALUES (:user, :hash, :by, :expires) RETURNING id
                """)
                .param("user", userId)
                .param("hash", codeHash)
                .param("by", issuedByUserId)
                .param("expires", Timestamps.utc(expiresAt))
                .query(UUID.class)
                .single();
    }

    /** The id of the live, matching code for this user, if there is one. */
    public Optional<UUID> findLive(UUID userId, String codeHash, Instant now) {
        return jdbc.sql("""
                SELECT id FROM password_reset_code
                WHERE user_id = :user AND code_hash = :hash AND used_at IS NULL AND expires_at > :now
                """)
                .param("user", userId)
                .param("hash", codeHash)
                .param("now", Timestamps.utc(now))
                .query(UUID.class)
                .optional();
    }

    public void markUsed(UUID id, Instant now) {
        jdbc.sql("UPDATE password_reset_code SET used_at = :now WHERE id = :id")
                .param("now", Timestamps.utc(now))
                .param("id", id)
                .update();
    }
}
