package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/** No Spring, no database: just the PDFs under docs/. */
class SourceDocumentsTest {

    @Test
    void findsAGuidelineSentenceOnItsPrintedPage() {
        String quote = "What do I already know about the topic and/or issue in the Investigation Brief?";

        assertThat(SourceDocuments.startsOnPage(SourceRef.parse("NCCA-BIO p. 6"), quote)).isTrue();
        assertThat(SourceDocuments.startsOnPage(SourceRef.parse("NCCA-BIO p. 4"), quote)).isFalse();
    }

    @Test
    void appliesEachDocumentsPageOffset() {
        assertThat(SourceDocuments.startsOnPage(SourceRef.parse("NCCA-CHEM p. 8"),
                "Once the experiment is complete, students are ready to critically analyse their data")).isTrue();
        assertThat(SourceDocuments.startsOnPage(SourceRef.parse("NCCA-BUS p. 16"),
                "Is my question linked to the theme in the brief?")).isTrue();
    }

    @Test
    void textMayRunOntoTheNextPage() {
        // The first three Stage 1 prompts are on p. 4, the last two on p. 5.
        assertThat(SourceDocuments.startsOnPage(SourceRef.parse("NCCA-BUS p. 4"),
                "Where will I store my background research? How might I do this?")).isTrue();
    }

    @Test
    void readsTheBriefsByCode() {
        assertThat(SourceDocuments.startsOnPage(SourceRef.parse("SEC-2027L021C2EL p. 2"),
                "submitted to the class teacher by Friday, 11 December 2026")).isTrue();
    }

    @Test
    void ignoresLayoutWhitespaceCurlyQuotesDashesAndLigatures() {
        assertThat(SourceDocuments.normalise("students’ \n investigative – logs ﬁgure"))
                .isEqualTo(SourceDocuments.normalise("students' investigative - logs figure"));
    }

    @Test
    void refusesAnUnknownDocumentOrAMalformedRef() {
        assertThatThrownBy(() -> SourceRef.parse("NCCA-BIO page 6")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceDocuments.startsOnPage(SourceRef.parse("NCCA-GEO p. 1"), "x"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
