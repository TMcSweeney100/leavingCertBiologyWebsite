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

/** Backlog ready-for-signoff: links and requests are history; a request closes once and is never changed again. */
class ReadySchemaTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private UUID component;
    private UUID checkpoint;

    @BeforeEach
    void aComponent() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        checkpoint = components.checkpointId(BIO, 1);
    }

    private UUID ask() {
        return jdbcTemplate.queryForObject("""
                INSERT INTO signoff_request (instance_id, student_user_id, checkpoint_id, asked_at, student_note)
                VALUES (?, ?, ?, now(), 'plan on page 2') RETURNING id
                """, UUID.class, component, world.approvedStudent(), checkpoint);
    }

    private void answer(UUID id) {
        jdbcTemplate.update("""
                UPDATE signoff_request SET answered_by_user_id = ?, answered_at = now(), outcome = 'NOT_YET', teacher_note = 'add a hypothesis'
                WHERE id = ?
                """, world.teacher1(), id);
    }

    @Test
    void theSettingIsOffByDefault() {
        assertThat(jdbcTemplate.queryForObject("SELECT require_link_for_signoff FROM component_instance WHERE id = ?",
                Boolean.class, component)).isFalse();
    }

    @Test
    void aLinkIsNeverChangedOrDeleted() {
        UUID link = jdbcTemplate.queryForObject("""
                INSERT INTO document_link (instance_id, student_user_id, url, set_at) VALUES (?, ?, 'https://docs.google.com/d/1', now())
                RETURNING id
                """, UUID.class, component, world.approvedStudent());
        assertRefused("UPDATE document_link SET url = 'https://evil.example' WHERE id = ?", link, "document_link");
        assertRefused("DELETE FROM document_link WHERE id = ?", link, "document_link");
    }

    @Test
    void aSecondOpenRequestForTheSameCheckpointIsRefused() {
        ask();
        assertThatThrownBy(this::ask).isInstanceOf(DuplicateKeyException.class).hasMessageContaining("signoff_request_open");
    }

    @Test
    void anAnsweredRequestLetsTheStudentAskAgainAndBothRowsStay() {
        answer(ask());
        ask();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM signoff_request", Integer.class)).isEqualTo(2);
    }

    @Test
    void aClosedRequestIsNeverChangedAgain() {
        UUID id = ask();
        answer(id);
        assertRefused("UPDATE signoff_request SET teacher_note = 'changed my mind' WHERE id = ?", id, "signoff_request");
        assertRefused("UPDATE signoff_request SET withdrawn_at = now() WHERE id = ?", id, "signoff_request");
        assertRefused("DELETE FROM signoff_request WHERE id = ?", id, "signoff_request");
    }

    @Test
    void anOpenRequestsQuestionIsNeverRewritten() {
        UUID id = ask();
        assertRefused("UPDATE signoff_request SET student_note = 'something else' WHERE id = ?", id, "signoff_request");
        assertRefused("UPDATE signoff_request SET asked_at = asked_at - interval '3 days' WHERE id = ?", id, "signoff_request");
    }

    @Test
    void anAnswerHasItsTeacherDateAndOutcomeTogether() {
        UUID id = ask();
        assertThatThrownBy(() -> jdbcTemplate.update("UPDATE signoff_request SET answered_at = now() WHERE id = ?", id))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("signoff_request_answered_together");
    }

    @Test
    void notesHaveLimits() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO signoff_request (instance_id, student_user_id, checkpoint_id, asked_at, student_note)
                VALUES (?, ?, ?, now(), repeat('x', 281))
                """, component, world.approvedStudent(), checkpoint)).isInstanceOf(DataIntegrityViolationException.class);
    }

    private void assertRefused(String sql, UUID id, String table) {
        assertThatThrownBy(() -> jdbcTemplate.update(sql, id))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining(table);
    }
}
