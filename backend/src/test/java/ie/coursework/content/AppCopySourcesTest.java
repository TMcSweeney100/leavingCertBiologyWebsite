package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Words the app quotes from SEC or NCCA documents in frontend code, where SourceTextTest can't see them. Each must
 * be on its cited page. The same literals are BACKUP_ADVICE in frontend/lib/app/ready.ts and NO_FORMAL_STYLE in frontend/lib/app/citation.ts and APPENDIX_RULE in frontend/lib/app/ai-appendix.ts: change both or neither.
 */
class AppCopySourcesTest {

    static final String BACKUP_ADVICE = "It is strongly recommended that you make and regularly update a backup copy of your "
            + "digital report, which can be used in the event of loss or corruption.";

    @ParameterizedTest
    @ValueSource(strings = {"SEC-2027L025C2EL p. 3", "SEC-2027L022C2EL p. 3", "SEC-2027L021C2EL p. 3", "SEC-2027L033C2EL p. 3"})
    void theBackupAdviceIsOnPage3OfEveryBrief(String ref) { // FR-40, decision R-22
        SourceRef source = SourceRef.parse(ref);
        assertThat(SourceDocuments.startsOnPage(source, BACKUP_ADVICE))
                .as("not on %s; found on %s", ref, SourceDocuments.printedPagesContaining(source.key(), BACKUP_ADVICE)).isTrue();
    }

    static final String NO_FORMAL_STYLE = "No particular, formal style of referencing is required.";

    @ParameterizedTest
    @ValueSource(strings = {"NCCA-BIO p. 15", "NCCA-BUS p. 20"})
    void theNoFormalStyleSentenceIsOnItsPage(String ref) { // decision S-15; NO_FORMAL_STYLE in frontend/lib/app/citation.ts
        SourceRef source = SourceRef.parse(ref);
        assertThat(SourceDocuments.startsOnPage(source, NO_FORMAL_STYLE))
                .as("not on %s; found on %s", ref, SourceDocuments.printedPagesContaining(source.key(), NO_FORMAL_STYLE)).isTrue();
    }

    static final String APPENDIX_RULE =
            "The use of all AI tools must be documented in a dedicated section of the coursework, such as an appendix section.";

    @Test
    void theAppendixSentenceIsOnItsPage() { // decision A-16; APPENDIX_RULE in frontend/lib/app/ai-appendix.ts
        SourceRef source = SourceRef.parse("SEC-RULES p. 34");
        assertThat(SourceDocuments.startsOnPage(source, APPENDIX_RULE))
                .as("not on %s; found on %s", source, SourceDocuments.printedPagesContaining(source.key(), APPENDIX_RULE)).isTrue();
    }
}
