package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ItemTickRepositoryTest extends PostgresIntegrationTest {

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private ItemTickRepository ticks;

    @Test
    void tickingAndUntickingIsPerStudentAndKeepsTheRow() {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        UUID item = components.item(component, components.stageId(ComponentFixtures.BIOLOGY_2027, 6), "Full draft in", null);

        ticks.set(component, world.approvedStudent(), item, true, Instant.parse("2026-11-01T10:00:00Z"));
        assertThat(ticks.doneItems(component, world.approvedStudent())).containsExactly(item);
        assertThat(ticks.doneItems(component, world.pendingStudent())).isEmpty();

        ticks.set(component, world.approvedStudent(), item, false, Instant.parse("2026-11-02T10:00:00Z"));
        ticks.set(component, world.approvedStudent(), item, false, Instant.parse("2026-11-02T10:05:00Z"));
        assertThat(ticks.doneItems(component, world.approvedStudent())).isEmpty();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM item_tick", Integer.class)).isEqualTo(1);
    }
}
