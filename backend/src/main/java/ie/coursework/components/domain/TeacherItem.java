package ie.coursework.components.domain;

import java.time.LocalDate;
import java.util.UUID;

public record TeacherItem(UUID id, UUID componentId, UUID stageId, int ordinal, String text, LocalDate dueDate) {}
