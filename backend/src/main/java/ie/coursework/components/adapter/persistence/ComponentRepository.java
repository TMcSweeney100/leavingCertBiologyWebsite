package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.components.domain.StudentComponentRef;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ComponentRepository {

    private final JdbcClient jdbc;

    public ComponentRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID insert(UUID classId, UUID briefId, UUID createdBy) {
        return jdbc.sql("""
                INSERT INTO component_instance (class_group_id, annual_brief_id, created_by_user_id)
                VALUES (:class, :brief, :by) RETURNING id
                """).param("class", classId).param("brief", briefId).param("by", createdBy)
                .query(UUID.class).single();
    }

    public Optional<UUID> idForClass(UUID classId) {
        return jdbc.sql("SELECT id FROM component_instance WHERE class_group_id = :class")
                .param("class", classId).query(UUID.class).optional();
    }

    /** The scope check for every teacher component endpoint: the component's class is this teacher's. */
    public Optional<ComponentInstance> findOwned(UUID componentId, UUID teacherId) {
        return jdbc.sql("""
                SELECT i.id, i.class_group_id, i.annual_brief_id FROM component_instance i
                JOIN class_group g ON g.id = i.class_group_id
                WHERE i.id = :id AND g.owner_user_id = :teacher
                """).param("id", componentId).param("teacher", teacherId)
                .query((rs, row) -> new ComponentInstance(rs.getObject("id", UUID.class),
                        rs.getObject("class_group_id", UUID.class), rs.getObject("annual_brief_id", UUID.class)))
                .optional();
    }

    /** The scope check for a student: approved (not pending, not removed) in the component's class. */
    public Optional<ComponentInstance> findForApprovedStudent(UUID componentId, UUID studentId) {
        return jdbc.sql("""
                SELECT i.id, i.class_group_id, i.annual_brief_id FROM component_instance i
                JOIN enrolment e ON e.class_group_id = i.class_group_id
                WHERE i.id = :id AND e.student_user_id = :student AND e.status = 'APPROVED'
                """).param("id", componentId).param("student", studentId)
                .query((rs, row) -> new ComponentInstance(rs.getObject("id", UUID.class),
                        rs.getObject("class_group_id", UUID.class), rs.getObject("annual_brief_id", UUID.class)))
                .optional();
    }

    public List<StudentComponentRef> forStudent(UUID studentId) {
        return jdbc.sql("""
                SELECT i.id AS component_id, g.id AS class_id, g.name AS class_name, s.code AS subject_code,
                       s.name AS subject_name, b.title AS brief_title, b.completion_date
                FROM enrolment e
                JOIN class_group g ON g.id = e.class_group_id
                JOIN subject s ON s.id = g.subject_id
                JOIN component_instance i ON i.class_group_id = g.id
                JOIN annual_brief b ON b.id = i.annual_brief_id
                WHERE e.student_user_id = :student AND e.status = 'APPROVED'
                ORDER BY s.name, g.name
                """).param("student", studentId).query(StudentComponentRef.class).list();
    }

    public Map<UUID, LocalDate> stageDates(UUID componentId) {
        Map<UUID, LocalDate> dates = new LinkedHashMap<>();
        jdbc.sql("SELECT template_stage_id, due_date FROM instance_stage_date WHERE instance_id = :id")
                .param("id", componentId)
                .query(rs -> {
                    dates.put(rs.getObject("template_stage_id", UUID.class), rs.getObject("due_date", LocalDate.class));
                });
        return dates;
    }

    /** The class's dates become exactly {@code dates}; a stage not in the map has no date. */
    public void replaceStageDates(UUID componentId, Map<UUID, LocalDate> dates, Instant now) {
        jdbc.sql("DELETE FROM instance_stage_date WHERE instance_id = :id").param("id", componentId).update();
        dates.forEach((stageId, due) -> jdbc.sql("""
                INSERT INTO instance_stage_date (instance_id, template_stage_id, due_date, updated_at)
                VALUES (:id, :stage, :due, :now)
                """).param("id", componentId).param("stage", stageId).param("due", due, Types.DATE)
                .param("now", Timestamps.utc(now)).update());
    }
}
