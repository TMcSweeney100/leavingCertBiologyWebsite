package ie.coursework.classes.adapter.persistence;

import ie.coursework.classes.domain.Subject;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class SubjectRepository {

    private final JdbcClient jdbc;

    public SubjectRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Subject> all() {
        return jdbc.sql("SELECT id, code, name FROM subject ORDER BY name").query(Subject.class).list();
    }

    public Optional<Subject> findByCode(String code) {
        return jdbc.sql("SELECT id, code, name FROM subject WHERE code = :code")
                .param("code", code)
                .query(Subject.class)
                .optional();
    }

    public Optional<Subject> findById(UUID id) {
        return jdbc.sql("SELECT id, code, name FROM subject WHERE id = :id")
                .param("id", id)
                .query(Subject.class)
                .optional();
    }
}
