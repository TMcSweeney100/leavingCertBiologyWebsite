package ie.coursework.log.adapter.web;

import ie.coursework.log.domain.EntryKind;
import jakarta.validation.constraints.NotNull;
import tools.jackson.databind.JsonNode;

/** No createdAt: the server sets it (design §6.6). An unknown property sent by a client is ignored. */
public record LogEntryRequest(@NotNull EntryKind kind, String body, JsonNode fields, Boolean visibleToTeacher) {}
