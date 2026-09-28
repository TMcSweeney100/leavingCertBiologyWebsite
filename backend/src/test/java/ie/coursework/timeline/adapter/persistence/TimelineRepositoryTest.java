package ie.coursework.timeline.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.timeline.domain.PersonalItemKind;
import ie.coursework.timeline.domain.TimelineEntry;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class TimelineRepositoryTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;
    private static final LocalDate FROM = LocalDate.of(2026, 9, 1);
    private static final LocalDate TO = LocalDate.of(2026, 12, 9);

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private PersonalItemRepository personal;
    @Autowired private TimelineRepository timeline;

    private ClassFixtures.World world;

    @BeforeEach
    void seed() {
        world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), BIO);
        components.stageDate(component, components.stageId(BIO, 4), LocalDate.of(2026, 10, 16));
        components.item(component, components.stageId(BIO, 6), "Full draft in for feedback", LocalDate.of(2026, 12, 4));
        components.item(component, components.stageId(BIO, 4), "Book a re-run slot", null);
        UUID retired = components.item(component, components.stageId(BIO, 4), "Retired", LocalDate.of(2026, 10, 20));
        jdbcTemplate.update("UPDATE teacher_item SET retired_at = now() WHERE id = ?", retired);
        personal.insert(world.approvedStudent(), "Biology class test", LocalDate.of(2026, 10, 16), PersonalItemKind.TEST, world.class1(), Instant.now());
        personal.insert(world.approvedStudent(), "Driving test", LocalDate.of(2026, 11, 19), PersonalItemKind.OTHER, null, Instant.now());
    }

    @Test
    void mergesStageDatesDatedTeacherItemsAndOwnItemsInDateOrder() {
        List<TimelineEntry> entries = timeline.between(world.approvedStudent(), FROM, TO);

        assertThat(entries).extracting(e -> e.kind() + " " + e.date() + " " + e.title() + " " + e.subjectName())
                .containsExactly(
                        "STAGE 2026-10-16 Conducting the Experiment Biology",
                        "PERSONAL 2026-10-16 Biology class test Biology",
                        "PERSONAL 2026-11-19 Driving test null",
                        "TEACHER_ITEM 2026-12-04 Full draft in for feedback Biology");
        assertThat(entries.getFirst().stageLabel()).isEqualTo("Stage 4");
        assertThat(entries.getFirst().componentId()).isNotNull();
    }

    @Test
    void theRangeIsInclusiveAndFilters() {
        assertThat(timeline.between(world.approvedStudent(), LocalDate.of(2026, 12, 4), LocalDate.of(2026, 12, 4)))
                .extracting(TimelineEntry::title).containsExactly("Full draft in for feedback");
    }

    @Test
    void pendingAndRemovedStudentsGetNoCoursework() {
        assertThat(timeline.between(world.pendingStudent(), FROM, TO)).isEmpty();
        assertThat(timeline.between(world.removedStudent(), FROM, TO)).isEmpty();
    }

    @Test
    void theTeacherGetsNoneOfTheStudentsItems() {
        assertThat(timeline.between(world.teacher1(), FROM, TO)).isEmpty();
    }

    // Note: unlike the plan's snippet, these two reuse the class-level `world` (and the component
    // `seed()` already created on world.class1()) instead of calling fixtures.world() again —
    // that fixture isn't repeatable within one test (fixed school roll numbers), and class1 already
    // has a component (component_instance.class_group_id is unique), so a second fixtures.world()
    // call collides on both counts.
    @Test
    void theBriefsCompletionDateIsItsOwnItemAndComesFirstOnItsDay() {
        UUID component = jdbcTemplate.queryForObject(
                "SELECT id FROM component_instance WHERE class_group_id = ?", UUID.class, world.class1());
        LocalDate completion = LocalDate.of(2027, 2, 26); // the 2027 Biology brief (plan 2C, BriefContentTest)
        components.stageDate(component, components.stageId(BIO, 6), completion);

        List<TimelineEntry> day = timeline.between(world.approvedStudent(), completion, completion);

        assertThat(day).extracting(TimelineEntry::kind).containsExactly("COMPLETION", "STAGE");
        TimelineEntry item = day.getFirst();
        assertThat(item.title()).isEqualTo(jdbcTemplate.queryForObject(
                "SELECT title FROM annual_brief WHERE sec_code = ?", String.class, BIO));
        assertThat(item.subjectName()).isEqualTo("Biology");
        assertThat(item.componentId()).isEqualTo(component);
        assertThat(item.stageLabel()).isNull();
    }

    @Test
    void completionDatesOnlyForApprovedClassesAndOnlyInRange() {
        LocalDate completion = LocalDate.of(2027, 2, 26);

        assertThat(timeline.between(world.pendingStudent(), completion, completion)).isEmpty();
        assertThat(timeline.between(world.removedStudent(), completion, completion)).isEmpty();
        assertThat(timeline.between(world.approvedStudent(), completion.minusDays(1), completion.minusDays(1))).isEmpty();
    }
}
