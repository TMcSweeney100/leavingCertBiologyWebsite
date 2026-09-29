package ie.coursework.progress.adapter.web;

import jakarta.validation.constraints.NotNull;

/** true signs off; false undoes or revokes (plan P4-6, P4-17). */
public record SignoffRequest(@NotNull Boolean signedOff) {}
