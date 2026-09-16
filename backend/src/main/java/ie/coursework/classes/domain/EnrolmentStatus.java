package ie.coursework.classes.domain;

/** PENDING → APPROVED (approve), PENDING → REMOVED (decline), APPROVED → REMOVED (remove), REMOVED → PENDING (asks again). */
public enum EnrolmentStatus {
    PENDING,
    APPROVED,
    REMOVED;

    public boolean canApprove() {
        return this == PENDING;
    }

    public boolean canRemove() {
        return this != REMOVED;
    }

    public boolean canRequestAgain() {
        return this == REMOVED;
    }
}
