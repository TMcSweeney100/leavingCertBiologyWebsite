package ie.coursework.identity.adapter.web;

import jakarta.validation.constraints.NotNull;

public record ChangePasswordRequest(@NotNull String currentPassword, @NotNull String newPassword) {}
