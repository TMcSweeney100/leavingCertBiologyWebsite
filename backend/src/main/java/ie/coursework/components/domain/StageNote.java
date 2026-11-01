package ie.coursework.components.domain;

import java.time.Instant;
import java.util.UUID;

/** A teacher's note on one stage of their component (plan stage-sheet S-8). */
public record StageNote(UUID stageId, String text, Instant updatedAt) {}
