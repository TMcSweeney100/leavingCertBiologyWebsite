package ie.coursework.classes.application;

import ie.coursework.audit.AuditEventType;
import ie.coursework.audit.AuditLog;
import ie.coursework.classes.adapter.persistence.ClassGroupRepository;
import ie.coursework.classes.adapter.persistence.EnrolmentRepository;
import ie.coursework.classes.adapter.persistence.SubjectRepository;
import ie.coursework.classes.application.ClassViews.EnrolmentView;
import ie.coursework.classes.application.ClassViews.JoinPreview;
import ie.coursework.classes.domain.ClassGroup;
import ie.coursework.classes.domain.Enrolment;
import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.classes.domain.JoinCode;
import ie.coursework.identity.adapter.persistence.RoleRepository;
import ie.coursework.identity.adapter.persistence.SchoolRepository;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.PasswordPolicy;
import ie.coursework.identity.domain.Role;
import ie.coursework.identity.domain.School;
import ie.coursework.identity.domain.Username;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Joining a class (design §8.1 steps 3–4) and the teacher's decisions about who's in it. */
@Service
public class EnrolmentService {

    /** A student account created by sign-up, with the enrolment it requested. */
    public record SignedUp(UUID userId, EnrolmentView enrolment) {}

    private final ClassGroupRepository classes;
    private final EnrolmentRepository enrolments;
    private final SubjectRepository subjects;
    private final SchoolRepository schools;
    private final UserAccountRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final ClassService classService;
    private final AuditLog auditLog;
    private final Clock clock;

    public EnrolmentService(ClassGroupRepository classes, EnrolmentRepository enrolments, SubjectRepository subjects,
            SchoolRepository schools, UserAccountRepository users, RoleRepository roles,
            PasswordEncoder passwordEncoder, ClassService classService, AuditLog auditLog, Clock clock) {
        this.classes = classes;
        this.enrolments = enrolments;
        this.subjects = subjects;
        this.schools = schools;
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.classService = classService;
        this.auditLog = auditLog;
        this.clock = clock;
    }

    public JoinPreview preview(String typedCode) {
        ClassGroup group = openClass(typedCode);
        return new JoinPreview(group.name(), subjectName(group), schoolName(group));
    }

    /** Sign-up: account, STUDENT role at the class's school, and a PENDING request, in one transaction. */
    @Transactional
    public SignedUp signUp(String typedCode, String firstName, String lastName, String rawUsername, String password) {
        ClassGroup group = openClass(typedCode);
        Username username = Username.parse(rawUsername);
        PasswordPolicy.check(password);
        UUID userId = users.insertUser(firstName, lastName);
        try {
            users.insertCredential(userId, username, passwordEncoder.encode(password), false);
        } catch (DuplicateKeyException e) {
            throw new DomainException(ErrorCode.USERNAME_TAKEN, "That username is taken.");
        }
        auditLog.record(userId, AuditEventType.USER_CREATED, "user", userId, Map.of());
        Actor actor = new Actor(userId, List.of());
        return new SignedUp(userId, join(actor, group));
    }

    /** Join with the signed-in account. Idempotent: an existing PENDING or APPROVED row is returned as is. */
    @Transactional
    public EnrolmentView join(Actor actor, String typedCode) {
        return join(actor, openClass(typedCode));
    }

    public List<EnrolmentView> myClasses(Actor actor) {
        return enrolments.classesOf(actor.userId()).stream()
                .map(c -> new EnrolmentView(c.enrolmentId(), c.classId(), c.className(), c.subjectName(),
                        c.schoolName(), c.status()))
                .toList();
    }

    @Transactional
    public EnrolmentView approve(Actor teacher, UUID classId, UUID enrolmentId) {
        ClassGroup group = classService.owned(teacher, classId);
        Enrolment enrolment = inClass(enrolmentId, classId);
        if (!enrolment.status().canApprove()) {
            throw new DomainException(ErrorCode.ENROLMENT_NOT_PENDING, "That request has already been decided.");
        }
        enrolments.decide(enrolmentId, EnrolmentStatus.APPROVED, teacher.userId(), clock.instant());
        auditLog.record(teacher.userId(), AuditEventType.ENROLMENT_APPROVED, "enrolment", enrolmentId,
                Map.of("classId", classId.toString(), "studentId", enrolment.studentUserId().toString()));
        return view(group, enrolmentId, enrolment.studentUserId());
    }

    /** Declines a pending request or removes an approved student; both end as REMOVED. */
    @Transactional
    public EnrolmentView remove(Actor teacher, UUID classId, UUID enrolmentId) {
        ClassGroup group = classService.owned(teacher, classId);
        Enrolment enrolment = inClass(enrolmentId, classId);
        if (!enrolment.status().canRemove()) {
            throw new DomainException(ErrorCode.ENROLMENT_ALREADY_REMOVED, "That student has already been removed.");
        }
        enrolments.decide(enrolmentId, EnrolmentStatus.REMOVED, teacher.userId(), clock.instant());
        auditLog.record(teacher.userId(), AuditEventType.ENROLMENT_REMOVED, "enrolment", enrolmentId,
                Map.of("classId", classId.toString(), "studentId", enrolment.studentUserId().toString(),
                        "was", enrolment.status().name()));
        return view(group, enrolmentId, enrolment.studentUserId());
    }

    private EnrolmentView join(Actor actor, ClassGroup group) {
        if (roles.grant(actor.userId(), group.schoolId(), Role.STUDENT)) {
            auditLog.record(actor.userId(), AuditEventType.ROLE_GRANTED, "user", actor.userId(),
                    Map.of("schoolId", group.schoolId().toString(), "role", Role.STUDENT.name()));
        }
        UUID enrolmentId = enrolments.request(group.id(), actor.userId(), clock.instant());
        return view(group, enrolmentId, actor.userId());
    }

    private ClassGroup openClass(String typedCode) {
        DomainException invalid = new DomainException(ErrorCode.JOIN_CODE_INVALID,
                "That join code isn't right, or it has expired. Ask your teacher for a new one.");
        JoinCode code = JoinCode.parse(typedCode).orElseThrow(() -> invalid);
        ClassGroup group = classes.findByJoinCode(code.value()).orElseThrow(() -> invalid);
        if (!group.joiningOpenAt(clock.instant())) {
            throw invalid;
        }
        return group;
    }

    private Enrolment inClass(UUID enrolmentId, UUID classId) {
        return enrolments.findInClass(enrolmentId, classId)
                .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "No such enrolment."));
    }

    private EnrolmentView view(ClassGroup group, UUID enrolmentId, UUID studentId) {
        Enrolment current = enrolments.findByStudent(group.id(), studentId).orElseThrow();
        return new EnrolmentView(enrolmentId, group.id(), group.name(), subjectName(group), schoolName(group),
                current.status());
    }

    private String subjectName(ClassGroup group) {
        return subjects.findById(group.subjectId()).orElseThrow().name();
    }

    private String schoolName(ClassGroup group) {
        return schools.findById(group.schoolId()).map(School::name).orElseThrow();
    }
}
