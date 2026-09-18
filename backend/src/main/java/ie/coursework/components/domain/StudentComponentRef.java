package ie.coursework.components.domain;

import java.time.LocalDate;
import java.util.UUID;

/** A component as a student's navigation lists it. */
public record StudentComponentRef(UUID componentId, UUID classId, String className, String subjectCode, String subjectName,
        String briefTitle, LocalDate completionDate) {}
