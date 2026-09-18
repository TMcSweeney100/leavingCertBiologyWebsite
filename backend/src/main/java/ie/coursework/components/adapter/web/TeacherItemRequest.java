package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record TeacherItemRequest(@NotNull UUID stageId, @NotBlank @Size(max = 200) String text, LocalDate dueDate) {}
