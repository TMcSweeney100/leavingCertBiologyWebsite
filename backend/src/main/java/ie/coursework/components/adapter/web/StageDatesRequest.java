package ie.coursework.components.adapter.web;

import ie.coursework.components.application.StageDateInput;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record StageDatesRequest(@NotNull List<@Valid StageDateInput> dates) {}
