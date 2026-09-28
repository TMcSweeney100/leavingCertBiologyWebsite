package ie.coursework.log.domain;

/**
 * A kind's own details, stored as one jsonb column (plan pilot-3-the-log P3-6). Sealed, so a switch over it
 * must handle every kind. A note has no fields: it stores null (P3-17).
 */
public sealed interface EntryFields permits SourceFields, AiUseFields {}
