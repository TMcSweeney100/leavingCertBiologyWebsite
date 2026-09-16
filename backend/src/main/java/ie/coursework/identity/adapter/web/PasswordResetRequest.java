package ie.coursework.identity.adapter.web;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PasswordResetRequest(
        @NotNull @Size(max = 64) String username,
        @NotNull @Size(max = 16) String code,
        @NotNull @Size(max = 256) String newPassword) {}
