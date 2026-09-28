package ie.coursework.log.domain;

import java.time.LocalDate;

/**
 * NCCA referencing guidance (NCCA-BIO p. 15-16; NCCA-BUS p. 21) and Business Appendix Three's prompts
 * (NCCA-BUS p. 19). LogFieldSourcesTest checks each field's phrase on its page.
 */
public record SourceFields(SourceType type, String title, String author, String publication, String datePublished,
        String url, LocalDate dateAccessed, String locator, String keyInformation, String relevance, String reflections)
        implements EntryFields {}
