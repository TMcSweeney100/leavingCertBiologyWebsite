package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Words the app quotes from SEC or NCCA documents in frontend code, where SourceTextTest can't see them. Each must
 * be on its cited page. The same literal is BACKUP_ADVICE in frontend/lib/app/ready.ts: change both or neither.
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
}
