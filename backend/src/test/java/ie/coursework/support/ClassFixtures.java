package ie.coursework.support;

import ie.coursework.classes.adapter.persistence.ClassGroupRepository;
import ie.coursework.classes.adapter.persistence.EnrolmentRepository;
import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.classes.domain.Level;
import ie.coursework.identity.domain.Role;
import java.time.Clock;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Known ids for scope tests. Every password is {@link TestAccounts#PASSWORD}. */
@Component
public class ClassFixtures {

    public record World(
            UUID schoolA, UUID schoolB,
            UUID teacher1, UUID teacher2, UUID teacherB, UUID leaderA,
            UUID approvedStudent, UUID pendingStudent, UUID removedStudent, UUID outsider,
            UUID class1, UUID class2, UUID classB,
            UUID approvedEnrolment, UUID pendingEnrolment, UUID removedEnrolment,
            String class1Code) {}

    public static final String TEACHER1 = "teacher.one";
    public static final String TEACHER2 = "teacher.two";
    public static final String TEACHER_B = "teacher.b";
    public static final String LEADER_A = "leader.a";
    public static final String APPROVED_STUDENT = "approved.student";
    public static final String PENDING_STUDENT = "pending.student";
    public static final String REMOVED_STUDENT = "removed.student";
    public static final String OUTSIDER = "outsider.student";

    private final TestAccounts accounts;
    private final ClassGroupRepository classes;
    private final EnrolmentRepository enrolments;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public ClassFixtures(TestAccounts accounts, ClassGroupRepository classes, EnrolmentRepository enrolments,
            JdbcTemplate jdbc, Clock clock) {
        this.accounts = accounts;
        this.classes = classes;
        this.enrolments = enrolments;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public World world() {
        UUID schoolA = accounts.school("School A", "11111A");
        UUID schoolB = accounts.school("School B", "22222B");
        UUID biology = subject("BIOLOGY");

        UUID teacher1 = accounts.userWithRole(TEACHER1, schoolA, Role.TEACHER);
        UUID teacher2 = accounts.userWithRole(TEACHER2, schoolA, Role.TEACHER);
        UUID teacherB = accounts.userWithRole(TEACHER_B, schoolB, Role.TEACHER);
        UUID leaderA = accounts.userWithRole(LEADER_A, schoolA, Role.SCHOOL_LEADER);
        UUID approved = accounts.userWithRole(APPROVED_STUDENT, schoolA, Role.STUDENT);
        UUID pending = accounts.userWithRole(PENDING_STUDENT, schoolA, Role.STUDENT);
        UUID removed = accounts.userWithRole(REMOVED_STUDENT, schoolA, Role.STUDENT);
        UUID outsider = accounts.userWithRole(OUTSIDER, schoolB, Role.STUDENT);

        // The join-code alphabet excludes 0/O/1/I/L (JoinCode.ALPHABET), so "CLASSONE"/"CLASSTWO"
        // need both their O and their L swapped out to stay in the allowed character class.
        String class1Code = "CLASSONE".replace('O', 'P').replace('L', 'K'); // "CKASSPNE"
        UUID class1 = classes.insert(schoolA, biology, "6A Biology", 6, "2026/27", Level.HIGHER, teacher1,
                class1Code, clock.instant().plusSeconds(86_400));
        UUID class2 = classes.insert(schoolA, biology, "6B Biology", 6, "2026/27", null, teacher2,
                "CKASSTWP", clock.instant().plusSeconds(86_400));
        UUID classB = classes.insert(schoolB, biology, "5th Biology", 5, "2026/27", Level.MIXED, teacherB,
                null, null);

        UUID approvedEnrolment = enrolments.request(class1, approved, clock.instant());
        enrolments.decide(approvedEnrolment, EnrolmentStatus.APPROVED, teacher1, clock.instant());
        UUID pendingEnrolment = enrolments.request(class1, pending, clock.instant());
        UUID removedEnrolment = enrolments.request(class1, removed, clock.instant());
        enrolments.decide(removedEnrolment, EnrolmentStatus.REMOVED, teacher1, clock.instant());

        return new World(schoolA, schoolB, teacher1, teacher2, teacherB, leaderA,
                approved, pending, removed, outsider, class1, class2, classB,
                approvedEnrolment, pendingEnrolment, removedEnrolment, class1Code);
    }

    public UUID subject(String code) {
        return jdbc.queryForObject("SELECT id FROM subject WHERE code = ?", UUID.class, code);
    }
}
