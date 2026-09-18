package ie.coursework.timeline.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.timeline.domain.PersonalItem;
import ie.coursework.timeline.domain.PersonalItemKind;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class PersonalItemRepositoryTest extends PostgresIntegrationTest {

    @Autowired private ClassFixtures fixtures;
    @Autowired private PersonalItemRepository items;

    @Test
    void everyOperationIsScopedToTheOwner() {
        ClassFixtures.World world = fixtures.world();
        UUID mine = items.insert(world.approvedStudent(), "Biology class test", LocalDate.of(2026, 10, 23),
                PersonalItemKind.TEST, world.class1(), Instant.now());
        items.insert(world.approvedStudent(), "Driving test", LocalDate.of(2026, 11, 19), PersonalItemKind.OTHER, null, Instant.now());

        assertThat(items.list(world.approvedStudent())).extracting(PersonalItem::title, PersonalItem::subjectName)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("Biology class test", "Biology"),
                        org.assertj.core.groups.Tuple.tuple("Driving test", null));
        assertThat(items.list(world.pendingStudent())).isEmpty();
        assertThat(items.find(mine, world.pendingStudent())).isEmpty();
        assertThat(items.update(mine, world.pendingStudent(), "Taken", LocalDate.of(2026, 10, 24), PersonalItemKind.ESSAY, null, Instant.now())).isFalse();
        assertThat(items.delete(mine, world.teacher1())).isFalse();

        assertThat(items.update(mine, world.approvedStudent(), "Biology test", LocalDate.of(2026, 10, 24), PersonalItemKind.TEST, null, Instant.now())).isTrue();
        assertThat(items.find(mine, world.approvedStudent())).get().extracting(PersonalItem::title).isEqualTo("Biology test");
        assertThat(items.delete(mine, world.approvedStudent())).isTrue();
        assertThat(items.find(mine, world.approvedStudent())).isEmpty();
    }
}
