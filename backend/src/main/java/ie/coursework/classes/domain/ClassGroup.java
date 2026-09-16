package ie.coursework.classes.domain;

import java.time.Instant;
import java.util.UUID;

/** A class as stored. {@code joinCode} and {@code joinCodeExpiresAt} are both null when joining is off. */
public record ClassGroup(
        UUID id,
        UUID schoolId,
        UUID subjectId,
        String name,
        int yearGroup,
        String academicYear,
        Level level,
        UUID ownerUserId,
        String joinCode,
        Instant joinCodeExpiresAt) {

    public boolean joiningOpenAt(Instant now) {
        return joinCode != null && joinCodeExpiresAt != null && now.isBefore(joinCodeExpiresAt);
    }
}
