package ie.coursework.classes.domain;

import java.time.Instant;
import java.util.UUID;

public record Enrolment(
        UUID id,
        UUID classGroupId,
        UUID studentUserId,
        EnrolmentStatus status,
        Instant requestedAt,
        Instant decidedAt,
        UUID decidedByUserId) {}
