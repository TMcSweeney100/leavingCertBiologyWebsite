package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.components.domain.RequestOutcome;
import ie.coursework.components.domain.SignoffRequest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class SignoffRequestRepositoryTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;
    private static final Instant T0 = Instant.parse("2027-03-03T09:00:00Z");

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private SignoffRequestRepository requests;

    private ClassFixtures.World world;
    private UUID component;
    private UUID cp1;
    private UUID cp2;
    private UUID student;

    @BeforeEach
    void aComponent() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        cp1 = components.checkpointId(BIO, 1);
        cp2 = components.checkpointId(BIO, 2);
        student = world.approvedStudent();
    }

    @Test
    void askingTwiceMakesOneRequest() {
        assertThat(requests.ask(component, student, cp1, "page 2", T0)).isPresent();
        assertThat(requests.ask(component, student, cp1, "again", T0.plusSeconds(1))).isEmpty();
        assertThat(requests.open(component)).singleElement().extracting(SignoffRequest::studentNote).isEqualTo("page 2");
    }

    @Test
    void theQueueIsOldestFirst() {
        requests.ask(component, student, cp2, null, T0.plusSeconds(60));
        requests.ask(component, student, cp1, null, T0);
        assertThat(requests.open(component)).extracting(SignoffRequest::checkpointId).containsExactly(cp1, cp2);
    }

    @Test
    void aWithdrawnRequestLeavesTheQueueAndTheHistory() {
        requests.ask(component, student, cp1, null, T0);
        assertThat(requests.withdraw(component, student, cp1, T0.plusSeconds(5))).isPresent();
        assertThat(requests.withdraw(component, student, cp1, T0.plusSeconds(6))).isEmpty();
        assertThat(requests.open(component)).isEmpty();
        assertThat(requests.forStudent(component, student)).isEmpty();
    }

    @Test
    void anAnswerClosesTheRequestOnceAndStaysInTheHistory() {
        requests.ask(component, student, cp1, "page 2", T0);
        assertThat(requests.answer(component, student, cp1, world.teacher1(), RequestOutcome.NOT_YET, "add a hypothesis", T0.plusSeconds(9)))
                .isPresent();
        assertThat(requests.answer(component, student, cp1, world.teacher1(), RequestOutcome.ACCEPTED, null, T0.plusSeconds(10)))
                .isEmpty();
        assertThat(requests.forStudent(component, student)).singleElement().satisfies(r -> {
            assertThat(r.open()).isFalse();
            assertThat(r.outcome()).isEqualTo(RequestOutcome.NOT_YET);
            assertThat(r.teacherNote()).isEqualTo("add a hypothesis");
        });
    }

    @Test
    void waitingCountsOnlyOpenRequestsFromApprovedStudentsInTheTeachersClasses() {
        requests.ask(component, student, cp1, null, T0);
        requests.ask(component, student, cp2, null, T0);
        requests.answer(component, student, cp2, world.teacher1(), RequestOutcome.ACCEPTED, null, T0);
        requests.ask(component, world.removedStudent(), cp1, null, T0); // removed after asking
        assertThat(requests.waitingByClass(world.teacher1())).containsExactlyEntriesOf(java.util.Map.of(world.class1(), 1));
        assertThat(requests.waitingByClass(world.teacher2())).isEmpty();
    }
}
