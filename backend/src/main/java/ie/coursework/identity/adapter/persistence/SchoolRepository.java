package ie.coursework.identity.adapter.persistence;

import ie.coursework.identity.domain.School;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class SchoolRepository {

    private final JdbcClient jdbc;

    public SchoolRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID insert(String name, String rollNumber) {
        return jdbc.sql("INSERT INTO school (name, roll_number) VALUES (:name, :roll) RETURNING id")
                .param("name", name.strip())
                .param("roll", rollNumber.strip())
                .query(UUID.class)
                .single();
    }

    public Optional<School> findByRollNumber(String rollNumber) {
        return jdbc.sql("SELECT id, name, roll_number FROM school WHERE roll_number = :roll")
                .param("roll", rollNumber.strip())
                .query(School.class)
                .optional();
    }
}
