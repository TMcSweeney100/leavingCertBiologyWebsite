package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StageNoteRequest(@NotBlank @Size(max = 1000) String text) {}
