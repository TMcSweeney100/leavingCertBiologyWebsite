package ie.coursework.classes.adapter.web;

import ie.coursework.classes.domain.Level;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Plan decision P-2: the school is named explicitly. */
public record CreateClassRequest(
        @NotNull UUID schoolId,
        @NotBlank String subjectCode,
        @NotBlank @Size(max = 80) String name,
        @NotNull @Min(5) @Max(6) Integer yearGroup,
        @NotBlank @Pattern(regexp = "\\d{4}/\\d{2}", message = "must look like 2026/27") String academicYear,
        Level level) {}
