package ie.coursework.log.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.log.domain.EntryKind;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Plan P4-9: the newest entry or edit counts, hidden entries included; the teacher already sees their dates (Q3). */
class LogLastActivityTest extends PostgresIntegrationTest {

    private static final Instant T0 = Instant.parse("2026-10-01T09:00:00Z");

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private LogRepository log;

    @Test
    void theNewestRevisionOfAnyEntryVisibleOrHiddenPerStudent() {
        ClassFixtures.World world = fixtures.world();
        UUID classmate = fixtures.classmate(world);
        UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        UUID other = components.component(world.class2(), world.teacher2(), ComponentFixtures.BIOLOGY_2027);

        UUID first = log.create(component, world.approvedStudent(), EntryKind.NOTE, true, "one", null, T0);
        log.create(component, world.approvedStudent(), EntryKind.NOTE, false, "hidden", null, T0.plusSeconds(3_600));
        log.addRevision(first, "one, edited", null, T0.plusSeconds(7_200));
        log.create(other, world.approvedStudent(), EntryKind.NOTE, true, "elsewhere", null, T0.plusSeconds(99_999));

        assertThat(log.lastActivity(component))
                .containsEntry(world.approvedStudent(), T0.plusSeconds(7_200))
                .doesNotContainKey(classmate)
                .hasSize(1);
    }
}
