package ie.coursework.log.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.log.domain.AiUseFields;
import ie.coursework.log.domain.EntryKind;
import ie.coursework.log.domain.LogEntry;
import ie.coursework.log.domain.SourceFields;
import ie.coursework.log.domain.SourceType;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class LogRepositoryTest extends PostgresIntegrationTest {

    private static final Instant T0 = Instant.parse("2026-10-05T09:00:00Z");

    @Autowired private LogRepository log;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private UUID component;

    @BeforeEach
    void seed() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
    }

    @Test
    void createsAndListsNewestFirstWithFieldsRoundTripped() {
        SourceFields book = new SourceFields(SourceType.BOOK, "Inclusion", "McLeskey, J.", null, "2013", null, null, "p. 57", null, null, null);
        UUID first = log.create(component, world.approvedStudent(), EntryKind.SOURCE, true, null, book, T0);
        UUID second = log.create(component, world.approvedStudent(), EntryKind.NOTE, false, "Pilot run", null, T0.plusSeconds(60));

        assertThat(log.list(component, world.approvedStudent())).extracting(LogEntry::id).containsExactly(second, first);
        LogEntry source = log.findOwn(first, world.approvedStudent()).orElseThrow();
        assertThat(source.fields()).isEqualTo(book);
        assertThat(source.createdAt()).isEqualTo(T0);
        assertThat(source.revisionCount()).isEqualTo(1);
        assertThat(source.editedAt()).isNull();
        assertThat(log.findOwn(second, world.approvedStudent()).orElseThrow().visibleToTeacher()).isFalse();
    }

    @Test
    void findOwnIsTheOwnerOnlyAndOnlyWhileApproved() {
        UUID entry = log.create(component, world.approvedStudent(), EntryKind.NOTE, true, "Mine", null, T0);
        assertThat(log.findOwn(entry, world.pendingStudent())).isEmpty();
        assertThat(log.findOwn(entry, world.teacher1())).isEmpty();
        jdbcTemplate.update("UPDATE enrolment SET status = 'REMOVED' WHERE id = ?", world.approvedEnrolment());
        assertThat(log.findOwn(entry, world.approvedStudent())).isEmpty();
    }

    @Test
    void anApprovedClassmateNeverGetsTheOwnersRows() {
        UUID classmate = fixtures.classmate(world);
        UUID hiddenLater = log.create(component, world.approvedStudent(), EntryKind.NOTE, true, "A hides", null, T0);
        UUID shown = log.create(component, world.approvedStudent(), EntryKind.NOTE, true, "A shows", null, T0);
        log.setVisibility(hiddenLater, false, T0.plusSeconds(1));
        UUID theirs = log.create(component, classmate, EntryKind.NOTE, true, "B", null, T0);

        assertThat(log.list(component, classmate)).extracting(LogEntry::id).containsExactly(theirs);
        assertThat(log.findOwn(hiddenLater, classmate)).isEmpty();
        assertThat(log.findOwn(shown, classmate)).isEmpty();
        assertThat(log.hiddenAt(component, classmate)).isEmpty();
        assertThat(log.visibleHistory(component, classmate)).containsOnlyKeys(theirs);
        assertThat(log.list(component, world.approvedStudent())).extracting(LogEntry::id).doesNotContain(theirs);
    }

    @Test
    void revisionsAppendAndMoveTheCurrentOne() {
        UUID entry = log.create(component, world.approvedStudent(), EntryKind.NOTE, true, "v1", null, T0);
        assertThat(log.addRevision(entry, "v2", null, T0.plusSeconds(3600))).isEqualTo(2);

        LogEntry current = log.findOwn(entry, world.approvedStudent()).orElseThrow();
        assertThat(current.body()).isEqualTo("v2");
        assertThat(current.revisionCount()).isEqualTo(2);
        assertThat(current.editedAt()).isEqualTo(T0.plusSeconds(3600));
        assertThat(current.createdAt()).isEqualTo(T0);
        assertThat(log.revisions(entry)).extracting(r -> r.body()).containsExactly("v2", "v1");
    }

    @Test
    void visibilityChangesAreRecordedOnlyWhenTheyChangeSomething() {
        UUID entry = log.create(component, world.approvedStudent(), EntryKind.NOTE, true, "x", null, T0);
        assertThat(log.setVisibility(entry, true, T0.plusSeconds(1))).isFalse();
        assertThat(log.setVisibility(entry, false, T0.plusSeconds(2))).isTrue();
        assertThat(log.hiddenAt(component, world.approvedStudent())).containsEntry(entry, T0.plusSeconds(2));
        assertThat(log.setVisibility(entry, true, T0.plusSeconds(3))).isTrue();
        assertThat(log.hiddenAt(component, world.approvedStudent())).isEmpty();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM log_visibility_change WHERE entry_id = ?", Integer.class, entry)).isEqualTo(2);
    }

    @Test
    void anEntryCreatedHiddenHasNoHiddenAt() {
        UUID entry = log.create(component, world.approvedStudent(), EntryKind.NOTE, false, "private", null, T0);
        assertThat(log.hiddenAt(component, world.approvedStudent())).doesNotContainKey(entry);
    }

    @Test
    void visibleHistoryLeavesHiddenEntriesOut() {
        AiUseFields ai = new AiUseFields("ChatGPT-4", "OpenAI", LocalDate.of(2025, 2, 14), "Brainstorming themes", null, null);
        UUID shown = log.create(component, world.approvedStudent(), EntryKind.AI_USE, true, null, ai, T0);
        UUID hidden = log.create(component, world.approvedStudent(), EntryKind.NOTE, false, "secret", null, T0);
        var history = log.visibleHistory(component, world.approvedStudent());
        assertThat(history).containsKey(shown).doesNotContainKey(hidden);
        assertThat(history.get(shown).getFirst().fields()).isEqualTo(ai);
    }
}
