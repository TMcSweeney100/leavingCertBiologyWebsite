package ie.coursework.identity.application;

import ie.coursework.audit.AuditEventType;
import ie.coursework.audit.AuditLog;
import ie.coursework.identity.adapter.persistence.RoleRepository;
import ie.coursework.identity.adapter.persistence.SchoolRepository;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Role;
import ie.coursework.identity.domain.School;
import ie.coursework.identity.domain.TemporaryPasswordGenerator;
import ie.coursework.identity.domain.Username;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** What the operator can do (design §8.1 step 1). There's no endpoint for any of it. */
@Service
public class OperatorService {

    private final SchoolRepository schools;
    private final UserAccountRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final TemporaryPasswordGenerator temporaryPasswords;
    private final AuditLog auditLog;

    public OperatorService(SchoolRepository schools, UserAccountRepository users, RoleRepository roles,
            PasswordEncoder passwordEncoder, TemporaryPasswordGenerator temporaryPasswords, AuditLog auditLog) {
        this.schools = schools;
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.temporaryPasswords = temporaryPasswords;
        this.auditLog = auditLog;
    }

    @Transactional
    public UUID createSchool(String name, String rollNumber) {
        try {
            UUID schoolId = schools.insert(name, rollNumber);
            auditLog.record(null, AuditEventType.SCHOOL_CREATED, "school", schoolId, Map.of());
            return schoolId;
        } catch (DuplicateKeyException e) {
            throw new DomainException(ErrorCode.ROLL_NUMBER_TAKEN, "A school with that roll number already exists.");
        }
    }

    @Transactional
    public CreatedAccount createUser(String firstName, String lastName, String rawUsername) {
        Username username = Username.parse(rawUsername);
        String temporaryPassword = temporaryPasswords.next();
        UUID userId = users.insertUser(firstName, lastName);
        try {
            users.insertCredential(userId, username, passwordEncoder.encode(temporaryPassword), true);
        } catch (DuplicateKeyException e) {
            // The transaction is already aborted; throwing rolls it back, orphan app_user row included.
            throw new DomainException(ErrorCode.USERNAME_TAKEN, "That username is taken.");
        }
        auditLog.record(null, AuditEventType.USER_CREATED, "user", userId, Map.of());
        return new CreatedAccount(userId, username.value(), temporaryPassword);
    }

    /** True if the role is new. */
    @Transactional
    public boolean grantRole(String rawUsername, String rollNumber, Role role) {
        UUID userId = users.findCredential(Username.parse(rawUsername))
                .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "No user with that username."))
                .userId();
        School school = schools.findByRollNumber(rollNumber)
                .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "No school with that roll number."));

        boolean granted = roles.grant(userId, school.id(), role);
        if (granted) {
            auditLog.record(null, AuditEventType.ROLE_GRANTED, "user", userId,
                    Map.of("schoolId", school.id().toString(), "role", role.name()));
        }
        return granted;
    }
}
