package ie.coursework.timeline.domain;

import java.time.LocalDate;
import java.util.UUID;

/** One row of the timeline. Coursework rows carry the component; personal rows carry the item. */
public record TimelineEntry(String kind, LocalDate date, String title, String stageLabel, String subjectCode,
        String subjectName, UUID classId, String className, UUID componentId, UUID personalItemId, String personalKind) {}
