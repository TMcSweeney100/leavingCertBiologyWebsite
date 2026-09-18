package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** A full edit: both fields are sent; a null date clears it. */
public record TeacherItemEdit(@NotBlank @Size(max = 200) String text, LocalDate dueDate) {}
