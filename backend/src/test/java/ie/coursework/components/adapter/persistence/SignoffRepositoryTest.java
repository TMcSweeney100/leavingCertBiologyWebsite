package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.components.domain.Signoff;
import ie.coursework.components.domain.TemplateCheckpoint;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class SignoffRepositoryTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;
    private static final Instant MONDAY = Instant.parse("2026-10-12T09:00:00Z");

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private SignoffRepository signoffs;
    @Autowired private TemplateRepository templates;

    private ClassFixtures.World world;
    private UUID component;
    private UUID checkpoint;

    @BeforeEach
    void aComponent() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        checkpoint = components.checkpointId(BIO, 1);
    }

    @Test
    void signingOffTwiceKeepsOneLiveRowAndSaysTheSecondChangedNothing() {
        Optional<UUID> first = signoffs.signOff(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY);
        Optional<UUID> second = signoffs.signOff(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY.plusSeconds(5));
        assertThat(first).isPresent();
        assertThat(second).isEmpty();
        assertThat(signoffs.live(component)).singleElement()
                .satisfies(s -> assertThat(s.signedOffAt()).isEqualTo(MONDAY));
    }

    @Test
    void revokingKeepsTheRowWithWhoAndWhenAndSaysWhenThereWasNothingToRevoke() {
        signoffs.signOff(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY);
        assertThat(signoffs.revoke(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY.plusSeconds(60))).isPresent();
        assertThat(signoffs.revoke(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY.plusSeconds(90))).isEmpty();
        assertThat(signoffs.live(component)).isEmpty();

        List<Signoff> history = signoffs.forStudent(component, world.approvedStudent());
        assertThat(history).singleElement().satisfies(s -> {
            assertThat(s.live()).isFalse();
            assertThat(s.revokedAt()).isEqualTo(MONDAY.plusSeconds(60));
            assertThat(s.revokedBy()).isEqualTo("Test " + ClassFixtures.TEACHER1);
        });
    }

    @Test
    void forStudentIsNewestFirstAndOnlyThatStudentsRows() {
        UUID classmate = fixtures.classmate(world);
        signoffs.signOff(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY);
        signoffs.revoke(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY.plusSeconds(60));
        signoffs.signOff(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY.plusSeconds(120));
        signoffs.signOff(component, classmate, checkpoint, world.teacher1(), MONDAY);

        assertThat(signoffs.forStudent(component, world.approvedStudent()))
                .extracting(Signoff::signedOffAt).containsExactly(MONDAY.plusSeconds(120), MONDAY);
        assertThat(signoffs.live(component)).hasSize(2);
    }

    @Test
    void aCheckpointIsFoundOnlyInItsOwnTemplateVersion() {
        UUID bioVersion = jdbcTemplate.queryForObject("SELECT template_version_id FROM annual_brief WHERE sec_code = ?", UUID.class, BIO);
        UUID chemVersion = jdbcTemplate.queryForObject("SELECT template_version_id FROM annual_brief WHERE sec_code = ?", UUID.class,
                ComponentFixtures.CHEMISTRY_2027);
        assertThat(templates.checkpointInVersion(checkpoint, bioVersion)).map(TemplateCheckpoint::text)
                .contains("Initial ideas discussed with the teacher");
        assertThat(templates.checkpointInVersion(checkpoint, chemVersion)).isEmpty();
        assertThat(templates.checkpoints(bioVersion)).extracting(TemplateCheckpoint::id).contains(checkpoint);
    }
}
