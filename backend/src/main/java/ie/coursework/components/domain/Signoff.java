package ie.coursework.components.domain;

import java.time.Instant;
import java.util.UUID;

/** One row of checkpoint_signoff (design §6.5). {@code revokedBy} is the revoking teacher's name, null while live. */
public record Signoff(UUID id, UUID studentId, UUID checkpointId, Instant signedOffAt, Instant revokedAt, String revokedBy) {

    public boolean live() {
        return revokedAt == null;
    }
}
