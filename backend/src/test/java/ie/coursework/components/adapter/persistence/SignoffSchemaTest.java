package ie.coursework.components.adapter.persistence;

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
import org.springframework.dao.DuplicateKeyException;

/** Design §6.5: sign-offs are never deleted; undoing one records who revoked it and when. */
class SignoffSchemaTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private UUID component;
    private UUID checkpoint;
    private UUID signoff;

    @BeforeEach
    void oneLiveSignoff() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        checkpoint = components.checkpointId(BIO, 1);
        signoff = insert();
    }

    private UUID insert() {
        return jdbcTemplate.queryForObject("""
                INSERT INTO checkpoint_signoff (instance_id, student_user_id, checkpoint_id, signed_off_by_user_id, signed_off_at)
                VALUES (?, ?, ?, ?, now()) RETURNING id
                """, UUID.class, component, world.approvedStudent(), checkpoint, world.teacher1());
    }

    private void revoke(UUID id) {
        jdbcTemplate.update("UPDATE checkpoint_signoff SET revoked_by_user_id = ?, revoked_at = now() WHERE id = ?",
                world.teacher1(), id);
    }

    @Test
    void aSecondLiveSignoffForTheSameStudentAndCheckpointIsRefused() {
        assertThatThrownBy(this::insert).isInstanceOf(DuplicateKeyException.class)
                .hasMessageContaining("checkpoint_signoff_current");
    }

    @Test
    void aNewSignoffAfterARevokeIsAllowedAndBothRowsStay() {
        revoke(signoff);
        insert();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM checkpoint_signoff", Integer.class)).isEqualTo(2);
    }

    @Test
    void aSignoffIsNeverDeleted() {
        assertRefused("DELETE FROM checkpoint_signoff WHERE id = ?");
    }

    @Test
    void aSignoffIsRevokedOnceAndNeverUnrevoked() {
        revoke(signoff);
        assertRefused("UPDATE checkpoint_signoff SET revoked_at = now() WHERE id = ?");
        assertRefused("UPDATE checkpoint_signoff SET revoked_by_user_id = NULL, revoked_at = NULL WHERE id = ?");
    }

    @Test
    void nothingButTheRevokeColumnsMayChange() {
        assertRefused("UPDATE checkpoint_signoff SET signed_off_at = signed_off_at - interval '3 days' WHERE id = ?");
        assertRefused("UPDATE checkpoint_signoff SET student_user_id = signed_off_by_user_id WHERE id = ?");
    }

    @Test
    void revokedByAndRevokedAtAreSetTogether() {
        assertThatThrownBy(() -> jdbcTemplate.update("UPDATE checkpoint_signoff SET revoked_at = now() WHERE id = ?", signoff))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private void assertRefused(String sql) {
        assertThatThrownBy(() -> jdbcTemplate.update(sql, signoff))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("checkpoint_signoff");
    }
}
