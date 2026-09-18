package ie.coursework.components.domain;

import java.util.UUID;

public record ComponentInstance(UUID id, UUID classId, UUID briefId) {}
