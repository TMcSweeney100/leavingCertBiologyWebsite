package ie.coursework.audit;

/** Later phases add sign-off and revocation events here. */
public enum AuditEventType {
    SCHOOL_CREATED,
    USER_CREATED,
    ROLE_GRANTED,
    PASSWORD_CHANGED,
    RESET_CODE_ISSUED,
    RESET_CODE_REDEEMED,
    ENROLMENT_APPROVED,
    ENROLMENT_REMOVED,
    JOIN_CODE_ROTATED,
    JOIN_CODE_DISABLED
}
