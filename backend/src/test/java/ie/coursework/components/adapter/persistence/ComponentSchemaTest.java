package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

class ComponentSchemaTest extends PostgresIntegrationTest {

    @Autowired private ClassFixtures fixtures;
    private ClassFixtures.World world;
    private UUID component;

    @BeforeEach
    void biologyComponent() {
        world = fixtures.world();
        component = jdbcTemplate.queryForObject("""
                INSERT INTO component_instance (class_group_id, annual_brief_id, created_by_user_id)
                VALUES (?, (SELECT id FROM annual_brief WHERE sec_code = '2027L025C2EL'), ?) RETURNING id
                """, UUID.class, world.class1(), world.teacher1());
    }

    @Test
    void aStageDateOnTheCompletionDateIsStored() {
        setStageDate(stage("2027L025C2EL", 6), LocalDate.of(2027, 2, 26));

        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM instance_stage_date", Integer.class)).isEqualTo(1);
    }

    @Test
    void aStageDateAfterTheCompletionDateIsRefusedByTheDatabase() {
        assertThatThrownBy(() -> setStageDate(stage("2027L025C2EL", 6), LocalDate.of(2027, 2, 27)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("COMPLETION_DATE_EXCEEDED");
    }

    @Test
    void aTeacherItemDateAfterTheCompletionDateIsRefusedByTheDatabase() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO teacher_item (instance_id, template_stage_id, ordinal, text, due_date)
                VALUES (?, ?, 1, 'Full draft in', DATE '2027-03-01')
                """, component, stage("2027L025C2EL", 6)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aStageFromAnotherSubjectsTemplateIsRefused() {
        assertThatThrownBy(() -> setStageDate(stage("2027L022C2EL", 1), LocalDate.of(2026, 10, 1)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aClassHasOneComponent() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO component_instance (class_group_id, annual_brief_id, created_by_user_id)
                VALUES (?, (SELECT id FROM annual_brief WHERE sec_code = '2027L025C2EL'), ?)
                """, world.class1(), world.teacher1()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void anItemNeedsText() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO teacher_item (instance_id, template_stage_id, ordinal, text) VALUES (?, ?, 1, '  ')
                """, component, stage("2027L025C2EL", 4)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private void setStageDate(UUID stageId, LocalDate date) {
        jdbcTemplate.update("INSERT INTO instance_stage_date (instance_id, template_stage_id, due_date) VALUES (?, ?, ?)",
                component, stageId, date);
    }

    private UUID stage(String secCode, int ordinal) {
        return jdbcTemplate.queryForObject("""
                SELECT s.id FROM template_stage s JOIN annual_brief b ON b.template_version_id = s.version_id
                WHERE b.sec_code = ? AND s.ordinal = ?
                """, UUID.class, secCode, ordinal);
    }
}
