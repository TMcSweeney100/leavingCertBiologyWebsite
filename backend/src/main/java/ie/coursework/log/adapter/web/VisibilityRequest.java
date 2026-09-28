package ie.coursework.log.adapter.web;

import jakarta.validation.constraints.NotNull;

public record VisibilityRequest(@NotNull Boolean visible) {}
