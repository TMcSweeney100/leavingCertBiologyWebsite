package ie.coursework.log.adapter.web;

import tools.jackson.databind.JsonNode;

public record RevisionRequest(String body, JsonNode fields) {}
