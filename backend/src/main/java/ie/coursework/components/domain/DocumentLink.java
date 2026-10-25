package ie.coursework.components.domain;

import java.time.Instant;

/** A student's current link to their work in one component (FR-38). */
public record DocumentLink(String url, Instant setAt) {}
