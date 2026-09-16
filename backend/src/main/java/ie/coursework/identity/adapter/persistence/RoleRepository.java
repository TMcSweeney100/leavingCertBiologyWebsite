package ie.coursework.identity.adapter.persistence;

import ie.coursework.identity.domain.Role;
import ie.coursework.identity.domain.RoleGrant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class RoleRepository {

    private final JdbcClient jdbc;

    public RoleRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** True if the grant is new, false if the user already held it. */
    public boolean grant(UUID userId, UUID schoolId, Role role) {
        return jdbc.sql("""
                INSERT INTO user_role (user_id, school_id, role) VALUES (:userId, :schoolId, :role)
                ON CONFLICT ON CONSTRAINT user_role_unique DO NOTHING
                """)
                .param("userId", userId)
                .param("schoolId", schoolId)
                .param("role", role.name())
                .update() == 1;
    }

    public List<RoleGrant> grantsFor(UUID userId) {
        return jdbc.sql("""
                SELECT r.school_id, s.name AS school_name, s.short_name AS school_short_name, r.role
                FROM user_role r JOIN school s ON s.id = r.school_id
                WHERE r.user_id = :userId
                ORDER BY s.name, r.role
                """)
                .param("userId", userId)
                .query((rs, row) -> new RoleGrant(
                        rs.getObject("school_id", UUID.class),
                        rs.getString("school_name"),
                        rs.getString("school_short_name"),
                        Role.valueOf(rs.getString("role"))))
                .list();
    }
}
