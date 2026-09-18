package ie.coursework.classes.application;

import ie.coursework.audit.AuditEventType;
import ie.coursework.audit.AuditLog;
import ie.coursework.classes.adapter.persistence.ClassGroupRepository;
import ie.coursework.classes.adapter.persistence.EnrolmentRepository;
import ie.coursework.classes.adapter.persistence.SubjectRepository;
import ie.coursework.classes.application.ClassViews.ClassDetail;
import ie.coursework.classes.application.ClassViews.ClassSummary;
import ie.coursework.classes.application.ClassViews.JoinCodeView;
import ie.coursework.classes.application.ClassViews.MemberView;
import ie.coursework.classes.domain.ClassGroup;
import ie.coursework.classes.domain.JoinCode;
import ie.coursework.classes.domain.Level;
import ie.coursework.classes.domain.Subject;
import ie.coursework.components.adapter.persistence.ComponentRepository;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.Role;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** What a teacher can do to their own classes. Every method checks scope first and answers 404 otherwise. */
@Service
public class ClassService {

    private final ClassGroupRepository classes;
    private final EnrolmentRepository enrolments;
    private final SubjectRepository subjects;
    private final AuditLog auditLog;
    private final Clock clock;
    private final ComponentRepository components;
    private final SecureRandom random = new SecureRandom();

    public ClassService(ClassGroupRepository classes, EnrolmentRepository enrolments, SubjectRepository subjects,
            AuditLog auditLog, Clock clock, ComponentRepository components) {
        this.classes = classes;
        this.enrolments = enrolments;
        this.subjects = subjects;
        this.auditLog = auditLog;
        this.clock = clock;
        this.components = components;
    }

    @Transactional
    public ClassDetail create(Actor actor, UUID schoolId, String subjectCode, String name, int yearGroup,
            String academicYear, Level level) {
        if (!actor.holds(Role.TEACHER, schoolId)) {
            throw notFound("No such school.");
        }
        Subject subject = subjects.findByCode(subjectCode).orElseThrow(() -> notFound("No such subject."));
        Instant now = clock.instant();
        UUID classId = classes.insert(schoolId, subject.id(), name, yearGroup, academicYear, level, actor.userId(),
                JoinCode.generate(random).value(), JoinCode.expiryFrom(now));
        return detail(actor, classId);
    }

    public List<ClassSummary> listOwned(Actor actor) {
        requireTeacher(actor);
        return classes.listOwnedBy(actor.userId()).stream().map(group -> {
            Subject subject = subjectOf(group);
            return new ClassSummary(group.id(), group.name(), subject.code(), subject.name(), group.yearGroup(),
                    group.academicYear(), group.level(), enrolments.pendingCount(group.id()));
        }).toList();
    }

    public ClassDetail detail(Actor actor, UUID classId) {
        ClassGroup group = owned(actor, classId);
        Subject subject = subjectOf(group);
        JoinCodeView code = group.joiningOpenAt(clock.instant())
                ? new JoinCodeView(group.joinCode(), group.joinCodeExpiresAt())
                : null;
        List<MemberView> members = enrolments.membersOf(classId).stream()
                .map(m -> new MemberView(m.enrolmentId(), m.studentId(), m.firstName(), m.lastName(), m.username(),
                        m.status(), m.requestedAt()))
                .toList();
        return new ClassDetail(group.id(), group.name(), subject.code(), subject.name(), group.yearGroup(),
                group.academicYear(), group.level(), code, members, components.idForClass(classId).orElse(null));
    }

    @Transactional
    public JoinCodeView rotateJoinCode(Actor actor, UUID classId) {
        owned(actor, classId);
        Instant now = clock.instant();
        JoinCode code = JoinCode.generate(random);
        classes.setJoinCode(classId, code.value(), JoinCode.expiryFrom(now));
        auditLog.record(actor.userId(), AuditEventType.JOIN_CODE_ROTATED, "class", classId, Map.of());
        return new JoinCodeView(code.value(), JoinCode.expiryFrom(now));
    }

    @Transactional
    public void disableJoinCode(Actor actor, UUID classId) {
        owned(actor, classId);
        classes.setJoinCode(classId, null, null);
        auditLog.record(actor.userId(), AuditEventType.JOIN_CODE_DISABLED, "class", classId, Map.of());
    }

    /** The scope check shared by every class-scoped endpoint, including enrolment and reset-code ones. */
    public ClassGroup owned(Actor actor, UUID classId) {
        requireTeacher(actor);
        return classes.findOwned(classId, actor.userId()).orElseThrow(() -> notFound("No such class."));
    }

    private void requireTeacher(Actor actor) {
        if (!actor.holds(Role.TEACHER)) {
            throw notFound("No such resource.");
        }
    }

    private Subject subjectOf(ClassGroup group) {
        return subjects.findById(group.subjectId()).orElseThrow(() -> new IllegalStateException("subject missing"));
    }

    private static DomainException notFound(String detail) {
        return new DomainException(ErrorCode.NOT_FOUND, detail);
    }
}
