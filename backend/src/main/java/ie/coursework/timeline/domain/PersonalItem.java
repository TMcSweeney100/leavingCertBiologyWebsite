package ie.coursework.timeline.domain;

import java.time.LocalDate;
import java.util.UUID;

public record PersonalItem(UUID id, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId, String subjectName) {}
