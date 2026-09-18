package ie.coursework.components.application;

import ie.coursework.components.domain.CheckpointState;
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

    public record RuleView(String key, String value) {}

    public record BriefDetail(int examYear, String secCode, String title, String topicTitle, String topicBody,
            LocalDate completionDate, int wordLimit, String wordsNotCounted, int imageLimit, String imageNote,
            List<RuleView> rules) {}

    public record CheckpointView(String text, CheckpointState state) {}

    public record StudentItem(UUID id, String text, LocalDate dueDate, boolean done) {}

    public record PromptView(String heading, String text) {}

    public record StudentStage(UUID id, int ordinal, String label, String name, String description, Integer hoursMin,
            Integer hoursMax, String hoursGroup, boolean supervised, LocalDate dueDate, CheckpointView checkpoint,
            List<StudentItem> items, List<PromptView> prompts) {}

    public record SectionView(String label, String name, Integer suggestedWords, List<String> indicativeContent, List<UUID> stageIds) {}

    public record MarkBandView(String label, String name, int marks, boolean wholeReport, List<String> criteria, List<String> sectionLabels) {}

    /** What an approved student sees (design §8.3). Nothing about other students, and no teacher warnings. */
    public record StudentComponent(String view, UUID id, String className, String subjectCode, String subjectName,
            int weightingPercent, int marksTotal, BriefDetail brief, String processNote, LocalDate today,
            List<StudentStage> stages, List<SectionView> sections, List<MarkBandView> markBands) implements ComponentView {}

    public record MyComponent(UUID componentId, String className, String subjectCode, String subjectName,
            String briefTitle, LocalDate completionDate) {}
}
