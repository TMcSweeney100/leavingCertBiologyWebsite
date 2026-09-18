package ie.coursework.components.domain;

import java.util.List;
import java.util.UUID;

public record TemplateSection(String label, String name, Integer suggestedWords, List<String> indicativeContent, List<UUID> stageIds) {}
