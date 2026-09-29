package ie.coursework.components.domain;

import java.util.UUID;

public record TemplateCheckpoint(UUID id, UUID stageId, String text) {}
