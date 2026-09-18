package ie.coursework.support;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Components on {@link ClassFixtures} classes, built on the real 2027 content. */
@Component
public class ComponentFixtures {

    public static final String BIOLOGY_2027 = "2027L025C2EL";
    public static final String CHEMISTRY_2027 = "2027L022C2EL";

    private final JdbcTemplate jdbc;

    public ComponentFixtures(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UUID component(UUID classId, UUID teacherId, String secCode) {
        return jdbc.queryForObject("""
                INSERT INTO component_instance (class_group_id, annual_brief_id, created_by_user_id)
                VALUES (?, ?, ?) RETURNING id
                """, UUID.class, classId, briefId(secCode), teacherId);
    }

    public UUID briefId(String secCode) {
        return jdbc.queryForObject("SELECT id FROM annual_brief WHERE sec_code = ?", UUID.class, secCode);
    }

    public UUID stageId(String secCode, int ordinal) {
        return jdbc.queryForObject("""
                SELECT s.id FROM template_stage s JOIN annual_brief b ON b.template_version_id = s.version_id
                WHERE b.sec_code = ? AND s.ordinal = ?
                """, UUID.class, secCode, ordinal);
    }

    public void stageDate(UUID componentId, UUID stageId, LocalDate date) {
        jdbc.update("INSERT INTO instance_stage_date (instance_id, template_stage_id, due_date) VALUES (?, ?, ?)",
                componentId, stageId, date);
    }

    public UUID item(UUID componentId, UUID stageId, String text, LocalDate date) {
        return jdbc.queryForObject("""
                INSERT INTO teacher_item (instance_id, template_stage_id, ordinal, text, due_date)
                VALUES (?, ?, (SELECT coalesce(max(ordinal), 0) + 1 FROM teacher_item WHERE instance_id = ?), ?, ?)
                RETURNING id
                """, UUID.class, componentId, stageId, componentId, text, date);
    }
}
