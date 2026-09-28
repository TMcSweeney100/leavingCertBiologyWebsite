package ie.coursework.log.domain;

import java.time.LocalDate;

/** SEC Coursework Rules and Procedures 2025-2026, Appendix 2 §4 "Minimum acknowledgment requirements", p. 34. */
public record AiUseFields(String toolNameAndVersion, String developer, LocalDate dateGenerated, String howUsed,
        String prompts, String shareUrl) implements EntryFields {}
