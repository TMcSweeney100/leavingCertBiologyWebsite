package ie.coursework.classes.adapter.persistence;

import ie.coursework.classes.domain.ClassGroup;
import ie.coursework.classes.domain.Level;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ClassGroupRepository {

    private static final String COLUMNS = """
            SELECT id, school_id, subject_id, name, year_group, academic_year, level, owner_user_id,
                   join_code, join_code_expires_at
            FROM class_group
            """;

    private static final RowMapper<ClassGroup> MAPPER = ClassGroupRepository::map;

    private final JdbcClient jdbc;

    public ClassGroupRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID insert(UUID schoolId, UUID subjectId, String name, int yearGroup, String academicYear, Level level,
            UUID ownerUserId, String joinCode, Instant joinCodeExpiresAt) {
        return jdbc.sql("""
                INSERT INTO class_group (school_id, subject_id, name, year_group, academic_year, level, owner_user_id,
                                         join_code, join_code_expires_at)
                VALUES (:school, :subject, :name, :year, :academicYear, :level, :owner, :code, :expires)
                RETURNING id
                """)
                .param("school", schoolId)
                .param("subject", subjectId)
                .param("name", name.strip())
                .param("year", yearGroup)
                .param("academicYear", academicYear)
                .param("level", level == null ? null : level.name())
                .param("owner", ownerUserId)
                .param("code", joinCode)
                .param("expires", Timestamps.utc(joinCodeExpiresAt))
                .query(UUID.class)
                .single();
    }

    public Optional<ClassGroup> findById(UUID id) {
        return jdbc.sql(COLUMNS + " WHERE id = :id").param("id", id).query(MAPPER).optional();
    }

    /** The scope check for every teacher endpoint: the class exists and this teacher owns it. */
    public Optional<ClassGroup> findOwned(UUID id, UUID ownerUserId) {
        return jdbc.sql(COLUMNS + " WHERE id = :id AND owner_user_id = :owner")
                .param("id", id)
                .param("owner", ownerUserId)
                .query(MAPPER)
                .optional();
    }

    public List<ClassGroup> listOwnedBy(UUID ownerUserId) {
        return jdbc.sql(COLUMNS + " WHERE owner_user_id = :owner ORDER BY academic_year DESC, name")
                .param("owner", ownerUserId)
                .query(MAPPER)
                .list();
    }

    /** By code, whether or not it has expired; the caller checks {@link ClassGroup#joiningOpenAt}. */
    public Optional<ClassGroup> findByJoinCode(String joinCode) {
        return jdbc.sql(COLUMNS + " WHERE join_code = :code").param("code", joinCode).query(MAPPER).optional();
    }

    /** Both null turns joining off. */
    public void setJoinCode(UUID id, String joinCode, Instant expiresAt) {
        jdbc.sql("UPDATE class_group SET join_code = :code, join_code_expires_at = :expires WHERE id = :id")
                .param("code", joinCode)
                .param("expires", Timestamps.utc(expiresAt))
                .param("id", id)
                .update();
    }

    private static ClassGroup map(ResultSet rs, int row) throws SQLException {
        String level = rs.getString("level");
        OffsetDateTime expires = rs.getObject("join_code_expires_at", OffsetDateTime.class);
        return new ClassGroup(
                rs.getObject("id", UUID.class),
                rs.getObject("school_id", UUID.class),
                rs.getObject("subject_id", UUID.class),
                rs.getString("name"),
                rs.getInt("year_group"),
                rs.getString("academic_year"),
                level == null ? null : Level.valueOf(level),
                rs.getObject("owner_user_id", UUID.class),
                rs.getString("join_code"),
                expires == null ? null : expires.toInstant());
    }
}
