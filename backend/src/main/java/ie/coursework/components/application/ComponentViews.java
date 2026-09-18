package ie.coursework.components.application;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** What the component API returns. Mirrored field for field by frontend/lib/api/schemas.ts. */
public final class ComponentViews {

    private ComponentViews() {}

    public record BriefSummary(UUID id, String subjectCode, int examYear, String secCode, String title,
            String topicTitle, LocalDate completionDate) {}

    public record TeacherItemView(UUID id, String text, LocalDate dueDate) {}

    public record SetupStage(UUID id, int ordinal, String label, String name, Integer hoursMin, Integer hoursMax,
            String hoursGroup, boolean supervised, String checkpoint, LocalDate dueDate, List<TeacherItemView> items) {}

    public enum WarningCode { OUT_OF_ORDER, AFTER_COMPLETION_DATE }

    public record DateWarning(WarningCode code, List<UUID> stageIds, List<UUID> itemIds) {}

    /** {@code GET /components/{id}} is role-shaped (plan 2D P2-28); {@code view} says which shape this is. */
    public interface ComponentView {
        String view();
    }

    public record TeacherComponent(String view, UUID id, UUID classId, String className, String subjectCode,
            String subjectName, BriefSummary brief, List<SetupStage> stages, List<DateWarning> warnings)
            implements ComponentView {}
}
