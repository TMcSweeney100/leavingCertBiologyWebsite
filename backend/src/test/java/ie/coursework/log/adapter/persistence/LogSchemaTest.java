package ie.coursework.log.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

/** Design §6.6: the server sets created_at once; revisions and visibility changes are never updated or deleted. */
class LogSchemaTest extends PostgresIntegrationTest {

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private UUID entry;

    @BeforeEach
    void anEntryWithOneRevisionAndOneChange() {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        entry = jdbcTemplate.queryForObject("""
                INSERT INTO log_entry (instance_id, student_user_id, kind, created_at)
                VALUES (?, ?, 'NOTE', now()) RETURNING id
                """, UUID.class, component, world.approvedStudent());
        jdbcTemplate.update("INSERT INTO log_entry_revision (entry_id, revision_no, body, created_at) VALUES (?, 1, 'First', now())", entry);
        jdbcTemplate.update("INSERT INTO log_visibility_change (entry_id, visible, changed_at) VALUES (?, false, now())", entry);
    }

    @Test
    void newEntriesAreVisibleAndOnTheirFirstRevision() {
        assertThat(jdbcTemplate.queryForObject("SELECT visible_to_teacher FROM log_entry WHERE id = ?", Boolean.class, entry)).isTrue();
        assertThat(jdbcTemplate.queryForObject("SELECT current_revision FROM log_entry WHERE id = ?", Integer.class, entry)).isEqualTo(1);
    }

    @Test
    void revisionsCantBeChangedOrDeleted() {
        assertRefused("UPDATE log_entry_revision SET body = 'Rewritten' WHERE entry_id = ?");
        assertRefused("DELETE FROM log_entry_revision WHERE entry_id = ?");
    }

    @Test
    void visibilityChangesCantBeChangedOrDeleted() {
        assertRefused("UPDATE log_visibility_change SET visible = true WHERE entry_id = ?");
        assertRefused("DELETE FROM log_visibility_change WHERE entry_id = ?");
    }

    @Test
    void anEntrysIdentityAndCreationTimeAreFrozen() {
        assertRefused("UPDATE log_entry SET created_at = created_at - interval '3 days' WHERE id = ?");
        assertRefused("UPDATE log_entry SET kind = 'SOURCE' WHERE id = ?");
        assertRefused("DELETE FROM log_entry WHERE id = ?");
    }

    @Test
    void onlyVisibilityAndCurrentRevisionMayChange() {
        jdbcTemplate.update("UPDATE log_entry SET visible_to_teacher = false, current_revision = 2 WHERE id = ?", entry);
        assertThat(jdbcTemplate.queryForObject("SELECT visible_to_teacher FROM log_entry WHERE id = ?", Boolean.class, entry)).isFalse();
        assertRefused("UPDATE log_entry SET current_revision = 1 WHERE id = ?");
    }

    @Test
    void theKindMustBeOneOfThree() {
        assertThatThrownBy(() -> jdbcTemplate.update("UPDATE log_entry SET kind = 'DIARY' WHERE id = ?", entry))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private void assertRefused(String sql) {
        assertThatThrownBy(() -> jdbcTemplate.update(sql, entry))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("append-only");
    }
}
