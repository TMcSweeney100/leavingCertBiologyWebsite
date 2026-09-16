package ie.coursework.classes.adapter.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Design §8.1: first name, surname, username, password. Nothing else is collected. */
public record SignUpRequest(
        @NotBlank @Size(max = 80) String firstName,
        @NotBlank @Size(max = 80) String lastName,
        @NotNull @Size(max = 64) String username,
        @NotNull @Size(max = 256) String password) {}
