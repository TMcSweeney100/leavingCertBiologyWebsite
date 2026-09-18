package ie.coursework.timeline.adapter.web;

import ie.coursework.timeline.domain.PersonalItemKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

/** Used for create and for a full edit. */
public record PersonalItemRequest(
        @NotBlank @Size(max = 120) String title,
        @NotNull LocalDate dueDate,
        @NotNull PersonalItemKind kind,
        UUID classId) {}
