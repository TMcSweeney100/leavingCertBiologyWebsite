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
        return insert(name, null, rollNumber);
    }

    public UUID insert(String name, String shortName, String rollNumber) {
        return jdbc.sql("INSERT INTO school (name, short_name, roll_number) VALUES (:name, :shortName, :roll) RETURNING id")
                .param("name", name.strip())
                .param("shortName", shortName == null ? null : shortName.strip())
                .param("roll", rollNumber.strip())
                .query(UUID.class)
                .single();
    }

    /** True if a school has that roll number. */
    public boolean setShortName(String rollNumber, String shortName) {
        return jdbc.sql("UPDATE school SET short_name = :shortName WHERE roll_number = :roll")
                .param("shortName", shortName.strip())
                .param("roll", rollNumber.strip())
                .update() == 1;
    }

    public Optional<School> findByRollNumber(String rollNumber) {
        return jdbc.sql("SELECT id, name, roll_number FROM school WHERE roll_number = :roll")
                .param("roll", rollNumber.strip())
                .query(School.class)
                .optional();
    }

    public Optional<School> findById(UUID id) {
        return jdbc.sql("SELECT id, name, roll_number FROM school WHERE id = :id")
                .param("id", id)
                .query(School.class)
                .optional();
    }
}
