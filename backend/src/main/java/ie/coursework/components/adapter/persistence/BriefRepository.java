package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.Brief;
import ie.coursework.components.domain.BriefDetails;
import ie.coursework.components.domain.BriefRule;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class BriefRepository {

    private static final String PUBLISHED = """
            SELECT b.id, b.template_id, b.template_version_id, t.subject_id, s.code AS subject_code, b.exam_year,
                   b.sec_code, b.title, b.topic_title, b.completion_date
            FROM annual_brief b
            JOIN component_template t ON t.id = b.template_id
            JOIN subject s ON s.id = t.subject_id
            WHERE b.status = 'PUBLISHED'
            """;

    private final JdbcClient jdbc;

    public BriefRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Newest exam year first. {@code examYear} null means every year. */
    public List<Brief> published(String subjectCode, Integer examYear) {
        if (examYear == null) {
            return jdbc.sql(PUBLISHED + " AND s.code = :subject ORDER BY b.exam_year DESC")
                    .param("subject", subjectCode).query(BriefRepository::map).list();
        }
        return jdbc.sql(PUBLISHED + " AND s.code = :subject AND b.exam_year = :year ORDER BY b.exam_year DESC")
                .param("subject", subjectCode).param("year", examYear).query(BriefRepository::map).list();
    }

    public Optional<Brief> findPublished(UUID id) {
        return jdbc.sql(PUBLISHED + " AND b.id = :id").param("id", id).query(BriefRepository::map).optional();
    }

    public BriefDetails details(UUID briefId) {
        return jdbc.sql("""
                SELECT topic_body, word_limit, words_not_counted, image_limit, image_note FROM annual_brief WHERE id = :id
                """).param("id", briefId)
                .query((rs, i) -> new BriefDetails(rs.getString("topic_body"), rs.getInt("word_limit"),
                        rs.getString("words_not_counted"), rs.getInt("image_limit"), rs.getString("image_note")))
                .single();
    }

    public List<BriefRule> rules(UUID briefId) {
        return jdbc.sql("SELECT key, value FROM brief_rule WHERE brief_id = :id ORDER BY ordinal")
                .param("id", briefId).query(BriefRule.class).list();
    }

    private static Brief map(ResultSet rs, int row) throws SQLException {
        return new Brief(
                rs.getObject("id", UUID.class),
                rs.getObject("template_id", UUID.class),
                rs.getObject("template_version_id", UUID.class),
                rs.getObject("subject_id", UUID.class),
                rs.getString("subject_code"),
                rs.getInt("exam_year"),
                rs.getString("sec_code"),
                rs.getString("title"),
                rs.getString("topic_title"),
                rs.getObject("completion_date", LocalDate.class));
    }
}
