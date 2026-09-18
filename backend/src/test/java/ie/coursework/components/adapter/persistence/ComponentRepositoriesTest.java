package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.components.domain.Brief;
import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.components.domain.TeacherItem;
import ie.coursework.components.domain.TemplateStage;
import ie.coursework.support.ClassFixtures;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ComponentRepositoriesTest extends PostgresIntegrationTest {

    @Autowired private ClassFixtures fixtures;
    @Autowired private BriefRepository briefs;
    @Autowired private TemplateRepository templates;
    @Autowired private ComponentRepository components;
    @Autowired private TeacherItemRepository items;

    private ClassFixtures.World world;
    private Brief biology;

    @BeforeEach
    void seed() {
        world = fixtures.world();
        biology = briefs.published("BIOLOGY", null).getFirst();
    }

    @Test
    void publishedBriefsAreFoundBySubjectAndYear() {
        assertThat(biology.secCode()).isEqualTo("2027L025C2EL");
        assertThat(biology.completionDate()).isEqualTo(LocalDate.of(2027, 2, 26));
        assertThat(briefs.published("BIOLOGY", 2028)).isEmpty();
        assertThat(briefs.findPublished(biology.id())).contains(biology);
    }

    @Test
    void aVersionsStagesComeInOrderWithTheirCheckpoints() {
        List<TemplateStage> stages = templates.stages(biology.versionId());
        Map<UUID, String> checkpoints = templates.checkpointTextByStage(biology.versionId());

        assertThat(stages).extracting(TemplateStage::displayLabel)
                .containsExactly("Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5", "Stage 6");
        assertThat(checkpoints.get(stages.get(1).id())).isEqualTo("Investigative log shared with the teacher");
    }

    @Test
    void aComponentIsFoundOnlyByItsClassesOwner() {
        UUID id = components.insert(world.class1(), biology.id(), world.teacher1());

        assertThat(components.idForClass(world.class1())).contains(id);
        assertThat(components.findOwned(id, world.teacher1())).contains(new ComponentInstance(id, world.class1(), biology.id()));
        assertThat(components.findOwned(id, world.teacher2())).isEmpty();
    }

    @Test
    void stageDatesAreReplacedAsASet() {
        UUID id = components.insert(world.class1(), biology.id(), world.teacher1());
        List<TemplateStage> stages = templates.stages(biology.versionId());
        UUID s3 = stages.get(2).id();
        UUID s4 = stages.get(3).id();

        components.replaceStageDates(id, Map.of(s3, LocalDate.of(2026, 9, 25), s4, LocalDate.of(2026, 10, 16)), Instant.now());
        components.replaceStageDates(id, Map.of(s4, LocalDate.of(2026, 10, 23)), Instant.now());

        assertThat(components.stageDates(id)).containsExactlyEntriesOf(Map.of(s4, LocalDate.of(2026, 10, 23)));
    }

    @Test
    void itemsAreNumberedWithinTheirStageAndRetiredItemsDisappear() {
        UUID id = components.insert(world.class1(), biology.id(), world.teacher1());
        UUID s6 = templates.stages(biology.versionId()).get(5).id();

        TeacherItem first = items.add(id, s6, "Full draft in for feedback", LocalDate.of(2026, 12, 4), Instant.now());
        TeacherItem second = items.add(id, s6, "Catch-up window closes", null, Instant.now());
        items.update(second.id(), "Catch-up window closes", LocalDate.of(2026, 11, 13), Instant.now());
        items.retire(first.id(), Instant.now());

        assertThat(second.ordinal()).isEqualTo(2);
        assertThat(items.active(id)).extracting(TeacherItem::text, TeacherItem::dueDate)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("Catch-up window closes", LocalDate.of(2026, 11, 13)));
        assertThat(items.findActive(first.id(), id)).isEmpty();
        assertThat(items.findActive(second.id(), UUID.randomUUID())).isEmpty();
    }
}
