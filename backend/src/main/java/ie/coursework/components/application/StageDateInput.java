package ie.coursework.components.application;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

/** One stage's date in a batch save. A null date means the stage has no date. */
public record StageDateInput(@NotNull UUID stageId, LocalDate dueDate) {}
