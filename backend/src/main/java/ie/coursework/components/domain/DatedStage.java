package ie.coursework.components.domain;

import java.time.LocalDate;
import java.util.UUID;

/** A stage's position and the class's date for it, or null when none is set. */
public record DatedStage(UUID stageId, int ordinal, LocalDate dueDate) {}
