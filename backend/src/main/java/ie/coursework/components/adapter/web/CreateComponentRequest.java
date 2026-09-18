package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateComponentRequest(@NotNull UUID briefId) {}
