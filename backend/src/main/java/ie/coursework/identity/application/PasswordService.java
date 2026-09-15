package ie.coursework.identity.application;

import ie.coursework.audit.AuditEventType;
import ie.coursework.audit.AuditLog;
import ie.coursework.identity.adapter.persistence.StoredCredential;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.PasswordPolicy;
import ie.coursework.security.OtherSessions;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordService {

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final OtherSessions otherSessions;
    private final AuditLog auditLog;
    private final Clock clock;

    public PasswordService(UserAccountRepository users, PasswordEncoder passwordEncoder, OtherSessions otherSessions,
            AuditLog auditLog, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.otherSessions = otherSessions;
        this.auditLog = auditLog;
        this.clock = clock;
    }

    @Transactional
    public void change(Actor actor, String currentPassword, String newPassword, String currentSessionId) {
        StoredCredential credential = users.findCredential(actor.userId())
                .orElseThrow(() -> new DomainException(ErrorCode.UNAUTHENTICATED, "Sign in to continue."));
        boolean currentIsRight = currentPassword != null
                && currentPassword.getBytes(StandardCharsets.UTF_8).length <= 72
                && passwordEncoder.matches(currentPassword, credential.passwordHash());
        if (!currentIsRight) {
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS, "Your current password isn't right.");
        }
        PasswordPolicy.check(newPassword);

        users.updatePassword(actor.userId(), passwordEncoder.encode(newPassword), false, clock.instant());
        otherSessions.endAllExcept(actor.userId(), currentSessionId);
        auditLog.record(actor.userId(), AuditEventType.PASSWORD_CHANGED, "user", actor.userId(), Map.of());
    }
}
