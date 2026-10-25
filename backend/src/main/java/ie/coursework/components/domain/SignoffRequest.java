package ie.coursework.components.domain;

import java.time.Instant;
import java.util.UUID;

/** One row of signoff_request, never a withdrawn one (decision R-16). Open until {@code answeredAt} is set. */
public record SignoffRequest(UUID id, UUID studentId, UUID checkpointId, Instant askedAt, String studentNote,
        Instant answeredAt, RequestOutcome outcome, String teacherNote) {

    public boolean open() {
        return answeredAt == null;
    }
}
