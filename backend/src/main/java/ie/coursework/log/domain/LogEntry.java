package ie.coursework.log.domain;

import java.time.Instant;
import java.util.UUID;

/** An entry with its current revision's content. {@code editedAt} is null until there's a second revision. */
public record LogEntry(UUID id, UUID componentId, EntryKind kind, Instant createdAt, boolean visibleToTeacher,
        int revisionCount, Instant editedAt, String body, EntryFields fields) {}
