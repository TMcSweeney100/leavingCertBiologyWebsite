package ie.coursework.classes.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.classes.domain.ClassGroup;
import ie.coursework.classes.domain.Enrolment;
import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.classes.domain.Level;
import ie.coursework.support.ClassFixtures;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ClassRepositoriesTest extends PostgresIntegrationTest {

    @Autowired private ClassGroupRepository classes;
    @Autowired private EnrolmentRepository enrolments;
    @Autowired private ClassFixtures fixtures;

    @Test
    void storesAndReadsAClassWithItsJoinCode() {
        ClassFixtures.World world = fixtures.world();

        ClassGroup class1 = classes.findById(world.class1()).orElseThrow();

        assertThat(class1.name()).isEqualTo(ClassFixtures.CLASS1_NAME);
        assertThat(class1.level()).isEqualTo(Level.HIGHER);
        assertThat(class1.joinCode()).isEqualTo(world.class1Code());
        assertThat(class1.joinCodeExpiresAt()).isAfter(Instant.now());
        assertThat(classes.findById(world.classB()).orElseThrow().joinCode()).isNull();
    }

    @Test
    void findsOnlyTheOwnersClasses() {
        ClassFixtures.World world = fixtures.world();

        assertThat(classes.findOwned(world.class1(), world.teacher1())).isPresent();
        assertThat(classes.findOwned(world.class1(), world.teacher2())).isEmpty();
        assertThat(classes.listOwnedBy(world.teacher1())).extracting(ClassGroup::id).containsExactly(world.class1());
    }

    @Test
    void findsAClassByLiveJoinCodeOnly() {
        ClassFixtures.World world = fixtures.world();
        Instant now = Instant.now();

        assertThat(classes.findByJoinCode(world.class1Code())).isPresent();
        classes.setJoinCode(world.class1(), world.class1Code(), now.minusSeconds(1));
        assertThat(classes.findByJoinCode(world.class1Code()).orElseThrow().joiningOpenAt(now)).isFalse();
        classes.setJoinCode(world.class1(), null, null);
        assertThat(classes.findByJoinCode(world.class1Code())).isEmpty();
    }

    @Test
    void enrolmentsMoveThroughTheirStatuses() {
        ClassFixtures.World world = fixtures.world();
        Instant now = Instant.parse("2026-10-01T09:00:00Z");

        Enrolment pending = enrolments.findInClass(world.pendingEnrolment(), world.class1()).orElseThrow();
        assertThat(pending.status()).isEqualTo(EnrolmentStatus.PENDING);
        assertThat(pending.decidedAt()).isNull();

        enrolments.decide(world.pendingEnrolment(), EnrolmentStatus.APPROVED, world.teacher1(), now);
        Enrolment approved = enrolments.findInClass(world.pendingEnrolment(), world.class1()).orElseThrow();
        assertThat(approved.status()).isEqualTo(EnrolmentStatus.APPROVED);
        assertThat(approved.decidedAt()).isEqualTo(now);
        assertThat(approved.decidedByUserId()).isEqualTo(world.teacher1());
    }

    @Test
    void anEnrolmentIdIsOnlyFoundWithinItsOwnClass() {
        ClassFixtures.World world = fixtures.world();

        assertThat(enrolments.findInClass(world.pendingEnrolment(), world.class2())).isEmpty();
    }

    @Test
    void aRemovedStudentAskingAgainReusesTheRow() {
        ClassFixtures.World world = fixtures.world();
        Instant now = Instant.parse("2026-10-01T09:00:00Z");

        UUID again = enrolments.request(world.class1(), world.removedStudent(), now);

        assertThat(again).isEqualTo(world.removedEnrolment());
        Enrolment row = enrolments.findByStudent(world.class1(), world.removedStudent()).orElseThrow();
        assertThat(row.status()).isEqualTo(EnrolmentStatus.PENDING);
        assertThat(row.requestedAt()).isEqualTo(now);
        assertThat(row.decidedAt()).isNull();
    }

    @Test
    void listsAClassMembersAndAStudentsClasses() {
        ClassFixtures.World world = fixtures.world();

        List<EnrolmentRepository.Member> members = enrolments.membersOf(world.class1());
        assertThat(members).extracting(EnrolmentRepository.Member::username)
                .containsExactly(ClassFixtures.PENDING_STUDENT, ClassFixtures.APPROVED_STUDENT);
        assertThat(enrolments.pendingCount(world.class1())).isEqualTo(1);

        List<EnrolmentRepository.StudentClass> mine = enrolments.classesOf(world.approvedStudent());
        assertThat(mine).hasSize(1);
        assertThat(mine.getFirst().className()).isEqualTo(ClassFixtures.CLASS1_NAME);
        assertThat(mine.getFirst().subjectName()).isEqualTo("Biology");
        assertThat(mine.getFirst().schoolName()).isEqualTo(ClassFixtures.SCHOOL_A_NAME);
        assertThat(mine.getFirst().status()).isEqualTo(EnrolmentStatus.APPROVED);
        assertThat(enrolments.classesOf(world.removedStudent())).isEmpty();
    }
}
