package ie.coursework.timeline.application;

import ie.coursework.timeline.domain.PersonalItemKind;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Mirrored field for field by frontend/lib/api/schemas.ts. */
public final class TimelineViews {

    private TimelineViews() {}

    public record TimelineItem(String kind, LocalDate date, String title, String stageLabel, String subjectCode,
            String subjectName, UUID classId, String className, UUID componentId, UUID personalItemId, String personalKind) {}

    public record Timeline(LocalDate from, LocalDate to, List<TimelineItem> items) {}

    public record PersonalItemView(UUID id, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId, String subjectName) {}
}
