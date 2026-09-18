package ie.coursework.timeline.adapter.persistence;

import ie.coursework.timeline.domain.TimelineEntry;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Design §3.2: everything a student is assessed on, across every subject, plus their own items. One union
 * over approved enrolments and the student's own rows (plan 2F P2-44 to P2-46). Checked on Postgres 18 when
 * the plan was written.
 */
@Repository
public class TimelineRepository {

    private static final String SQL = """
            SELECT kind, due_date, stage_label, title, subject_code, subject_name, class_id, class_name,
                   component_id, personal_item_id, personal_kind
            FROM (
                SELECT 'STAGE' AS kind, d.due_date, st.label AS stage_label, st.name AS title, subj.code AS subject_code,
                       subj.name AS subject_name, g.id AS class_id, g.name AS class_name, i.id AS component_id,
                       NULL::uuid AS personal_item_id, NULL::text AS personal_kind, 1 AS kind_order, st.ordinal AS within
                FROM enrolment e
                JOIN class_group g ON g.id = e.class_group_id
                JOIN subject subj ON subj.id = g.subject_id
                JOIN component_instance i ON i.class_group_id = g.id
                JOIN instance_stage_date d ON d.instance_id = i.id
                JOIN template_stage st ON st.id = d.template_stage_id
                WHERE e.student_user_id = :student AND e.status = 'APPROVED'
                  AND d.due_date BETWEEN :from AND :to
                UNION ALL
                SELECT 'TEACHER_ITEM', t.due_date, st.label, t.text, subj.code, subj.name, g.id, g.name, i.id,
                       NULL::uuid, NULL::text, 2, st.ordinal * 1000 + t.ordinal
                FROM enrolment e
                JOIN class_group g ON g.id = e.class_group_id
                JOIN subject subj ON subj.id = g.subject_id
                JOIN component_instance i ON i.class_group_id = g.id
                JOIN teacher_item t ON t.instance_id = i.id AND t.retired_at IS NULL AND t.due_date IS NOT NULL
                JOIN template_stage st ON st.id = t.template_stage_id
                WHERE e.student_user_id = :student AND e.status = 'APPROVED'
                  AND t.due_date BETWEEN :from AND :to
                UNION ALL
                SELECT 'PERSONAL', p.due_date, NULL, p.title, subj.code, subj.name, g.id, g.name, NULL,
                       p.id, p.kind, 3, 0
                FROM personal_item p
                LEFT JOIN class_group g ON g.id = p.class_group_id
                LEFT JOIN subject subj ON subj.id = g.subject_id
                WHERE p.student_user_id = :student
                  AND p.due_date BETWEEN :from AND :to
            ) AS item
            ORDER BY due_date, kind_order, subject_name NULLS LAST, within, title
            """;

    private final JdbcClient jdbc;

    public TimelineRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<TimelineEntry> between(UUID studentId, LocalDate from, LocalDate to) {
        return jdbc.sql(SQL).param("student", studentId).param("from", from).param("to", to)
                .query((rs, i) -> new TimelineEntry(
                        rs.getString("kind"),
                        rs.getObject("due_date", LocalDate.class),
                        rs.getString("title"),
                        rs.getString("stage_label"),
                        rs.getString("subject_code"),
                        rs.getString("subject_name"),
                        rs.getObject("class_id", UUID.class),
                        rs.getString("class_name"),
                        rs.getObject("component_id", UUID.class),
                        rs.getObject("personal_item_id", UUID.class),
                        rs.getString("personal_kind")))
                .list();
    }
}
