package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.DocumentLink;
import ie.coursework.shared.persistence.Timestamps;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** FR-38–39. Every link is kept; the newest per student is current. Callers have already scoped the student. */
@Repository
public class DocumentLinkRepository {

    private final JdbcClient jdbc;

    public DocumentLinkRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void add(UUID componentId, UUID studentId, String url, Instant now) {
        jdbc.sql("INSERT INTO document_link (instance_id, student_user_id, url, set_at) VALUES (:component, :student, :url, :now)")
                .param("component", componentId).param("student", studentId).param("url", url).param("now", Timestamps.utc(now))
                .update();
    }

    public Optional<DocumentLink> current(UUID componentId, UUID studentId) {
        return jdbc.sql("""
                SELECT url, set_at FROM document_link WHERE instance_id = :component AND student_user_id = :student
                ORDER BY set_at DESC, id LIMIT 1
                """).param("component", componentId).param("student", studentId)
                .query((rs, row) -> new DocumentLink(rs.getString("url"), rs.getObject("set_at", OffsetDateTime.class).toInstant()))
                .optional();
    }

    /** Each student's current link in a component, in one query for the grid. */
    public Map<UUID, DocumentLink> currentFor(UUID componentId) {
        Map<UUID, DocumentLink> links = new HashMap<>();
        jdbc.sql("""
                SELECT DISTINCT ON (student_user_id) student_user_id, url, set_at FROM document_link
                WHERE instance_id = :component ORDER BY student_user_id, set_at DESC, id
                """).param("component", componentId)
                .query((rs, row) -> links.put(rs.getObject("student_user_id", UUID.class),
                        new DocumentLink(rs.getString("url"), rs.getObject("set_at", OffsetDateTime.class).toInstant())))
                .list();
        return links;
    }
}
