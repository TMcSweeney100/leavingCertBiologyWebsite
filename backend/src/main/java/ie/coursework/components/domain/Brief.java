package ie.coursework.components.domain;

import java.time.LocalDate;
import java.util.UUID;

/** A published annual brief, with what setting up and showing a component needs. */
public record Brief(UUID id, UUID templateId, UUID versionId, UUID subjectId, String subjectCode, int examYear,
        String secCode, String title, String topicTitle, LocalDate completionDate) {}
