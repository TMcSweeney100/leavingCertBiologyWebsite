package ie.coursework.progress.application;

import ie.coursework.components.domain.CheckpointState;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** The teacher's progress views (design §8.4, pack D-7). Dates are Dublin calendar dates. */
public final class ProgressViews {

    private ProgressViews() {}

    public record CheckpointRef(UUID id, String text) {}

    /** Every stage in order; {@code checkpoint} is null where there's nothing to sign off (Business Stage 6). */
    public record GridStage(UUID stageId, int ordinal, String label, String name, LocalDate dueDate, CheckpointRef checkpoint) {}

    public record Cell(UUID checkpointId, CheckpointState state, LocalDate signedOffOn) {}

    /** One cell per checkpoint, in stage order. */
    public record GridStudent(UUID studentId, String firstName, String lastName, int behindBy, LocalDate lastLogActivityOn,
            Integer daysSinceLastLogActivity, List<Cell> cells) {}

    public record Grid(UUID componentId, UUID classId, String className, LocalDate today, List<GridStage> stages,
            List<GridStudent> students) {}

    public record PastSignoff(LocalDate signedOffOn, LocalDate revokedOn, String revokedBy) {}

    /** Only stages with a checkpoint (plan P4-25). {@code history} is revoked sign-offs, newest first. */
    public record StudentStage(UUID stageId, int ordinal, String label, String name, LocalDate dueDate, CheckpointRef checkpoint,
            CheckpointState state, LocalDate signedOffOn, List<PastSignoff> history) {}

    public record StudentCheckpoints(UUID studentId, String firstName, String lastName, LocalDate today, int behindBy,
            LocalDate lastLogActivityOn, Integer daysSinceLastLogActivity, List<StudentStage> stages) {}
}
