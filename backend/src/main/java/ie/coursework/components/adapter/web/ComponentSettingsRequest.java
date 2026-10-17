package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotNull;

/** The class's one setting so far (ready-for-signoff R-7). A Settings tab arrives with the second. */
public record ComponentSettingsRequest(@NotNull Boolean requireLink) {}
