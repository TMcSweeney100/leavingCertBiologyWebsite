package ie.coursework.identity.application;

import ie.coursework.audit.AuditEventType;
import ie.coursework.audit.AuditLog;
import ie.coursework.classes.adapter.persistence.EnrolmentRepository;
import ie.coursework.classes.application.ClassService;
import ie.coursework.classes.application.ClassViews.ResetCodeIssued;
import ie.coursework.classes.domain.Enrolment;
import ie.coursework.identity.adapter.persistence.ResetCodeRepository;
import ie.coursework.identity.adapter.persistence.StoredCredential;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.PasswordPolicy;
import ie.coursework.identity.domain.ResetCode;
import ie.coursework.identity.domain.Username;
import ie.coursework.security.LoginThrottle;
import ie.coursework.security.OtherSessions;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Design §8.1 step 5: the teacher issues a one-time code, the student redeems it. No email anywhere. */
@Service
public class PasswordResetService {

    private final ResetCodeRepository codes;
    private final UserAccountRepository users;
    private final EnrolmentRepository enrolments;
    private final ClassService classService;
    private final PasswordEncoder passwordEncoder;
    private final OtherSessions otherSessions;
    private final LoginThrottle throttle;
    private final AuditLog auditLog;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(ResetCodeRepository codes, UserAccountRepository users, EnrolmentRepository enrolments,
            ClassService classService, PasswordEncoder passwordEncoder, OtherSessions otherSessions,
            LoginThrottle throttle, AuditLog auditLog, Clock clock) {
        this.codes = codes;
        this.users = users;
        this.enrolments = enrolments;
        this.classService = classService;
        this.passwordEncoder = passwordEncoder;
        this.otherSessions = otherSessions;
        this.throttle = throttle;
        this.auditLog = auditLog;
        this.clock = clock;
    }

    /** Only for a PENDING or APPROVED student of a class the teacher owns; anything else is 404. */
    @Transactional
    public ResetCodeIssued issue(Actor teacher, UUID classId, UUID studentId) {
        classService.owned(teacher, classId);
        boolean member = enrolments.findByStudent(classId, studentId).map(Enrolment::status)
                .map(status -> status.canRemove()) // PENDING or APPROVED
                .orElse(false);
        if (!member) {
            throw new DomainException(ErrorCode.NOT_FOUND, "No such student in this class.");
        }
        Instant now = clock.instant();
        ResetCode code = ResetCode.generate(random);
        codes.issue(studentId, code.hash(), teacher.userId(), now, code.expiryFrom(now));
        auditLog.record(teacher.userId(), AuditEventType.RESET_CODE_ISSUED, "user", studentId,
                Map.of("classId", classId.toString()));
        return new ResetCodeIssued(code.value(), code.expiryFrom(now));
    }

    /**
     * One answer for every failure, and the username throttle counts each one, so a code can't be
     * guessed any faster than a password. Plan decision P-3: this does not sign the student in.
     */
    @Transactional
    public void redeem(String rawUsername, String typedCode, String newPassword, String clientAddress) {
        String username = Username.normalise(rawUsername);
        throttle.checkAllowed(username, clientAddress);
        DomainException invalid = new DomainException(ErrorCode.RESET_CODE_INVALID,
                "That code isn't right, or it has expired. Ask your teacher for a new one.");

        Instant now = clock.instant();
        Optional<StoredCredential> credential = safeParse(rawUsername).flatMap(users::findCredential);
        Optional<UUID> live = credential.flatMap(c -> codes.findLive(c.userId(), ResetCode.hashOf(typedCode), now));
        if (credential.isEmpty() || live.isEmpty() || credential.get().disabled()) {
            throttle.recordFailure(username, clientAddress);
            throw invalid;
        }
        PasswordPolicy.check(newPassword);

        UUID userId = credential.get().userId();
        users.updatePassword(userId, passwordEncoder.encode(newPassword), false, now);
        codes.markUsed(live.get(), now);
        otherSessions.endAllExcept(userId, null);
        throttle.recordSuccess(username);
        auditLog.record(userId, AuditEventType.RESET_CODE_REDEEMED, "user", userId, Map.of());
    }

    private static Optional<Username> safeParse(String raw) {
        try {
            return Optional.of(Username.parse(raw));
        } catch (DomainException e) {
            return Optional.empty();
        }
    }
}
