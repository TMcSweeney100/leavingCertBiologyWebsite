package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class DocumentLinkRepositoryTest extends PostgresIntegrationTest {

    private static final Instant T0 = Instant.parse("2027-03-03T09:00:00Z");

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private DocumentLinkRepository links;
    @Autowired private ComponentRepository componentRepository;

    private ClassFixtures.World world;
    private UUID component;

    @BeforeEach
    void aComponent() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
    }

    @Test
    void theNewestLinkIsCurrentAndTheOldOnesStay() {
        links.add(component, world.approvedStudent(), "https://docs.google.com/d/old", T0);
        links.add(component, world.approvedStudent(), "https://docs.google.com/d/new", T0.plusSeconds(60));
        assertThat(links.current(component, world.approvedStudent())).hasValueSatisfying(l -> assertThat(l.url()).endsWith("/new"));
        assertThat(links.currentFor(component)).containsOnlyKeys(world.approvedStudent())
                .hasEntrySatisfying(world.approvedStudent(), l -> assertThat(l.url()).endsWith("/new"));
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM document_link", Integer.class)).isEqualTo(2);
    }

    @Test
    void noLinkIsEmpty() {
        assertThat(links.current(component, world.approvedStudent())).isEmpty();
    }

    @Test
    void theSettingRoundTrips() {
        assertThat(componentRepository.requiresLink(component)).isFalse();
        componentRepository.setRequireLink(component, true);
        assertThat(componentRepository.requiresLink(component)).isTrue();
    }
}
