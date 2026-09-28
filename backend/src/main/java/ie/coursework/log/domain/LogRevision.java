package ie.coursework.log.domain;

import java.time.Instant;

public record LogRevision(int number, String body, EntryFields fields, Instant createdAt) {}
