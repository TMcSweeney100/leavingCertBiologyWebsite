package ie.coursework.audit;

/** Every event the app records. Sign-off events arrived in Phase 4 (Undo records a revoke). Ready-for-signoff events arrived with the backlog's first feature. */
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
    JOIN_CODE_DISABLED,
    CHECKPOINT_SIGNED_OFF,
    CHECKPOINT_SIGNOFF_REVOKED,
    DOCUMENT_LINK_SET
}
