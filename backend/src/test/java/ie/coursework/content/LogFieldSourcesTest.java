package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The log's SOURCE and AI_USE fields are code, not content rows, so SourceTextTest can't see them. Each field
 * is paired here with the phrase it comes from; the phrase must be on the cited page. Never reword a phrase
 * to make this pass: fix the field instead.
 */
class LogFieldSourcesTest {

    record FieldSource(String field, String sourceRef, String phrase) {}

    static List<FieldSource> fields() {
        return List.of(
                new FieldSource("SourceType.BOOK", "NCCA-BIO p. 15", "Book:"),
                new FieldSource("SourceType.NEWSPAPER_OR_MAGAZINE", "NCCA-BIO p. 15", "Newspaper/magazine article:"),
                new FieldSource("SourceType.ONLINE_TEXT_OR_IMAGE", "NCCA-BIO p. 15", "Text/image accessed online:"),
                new FieldSource("SourceType.ONLINE_AUDIO", "NCCA-BIO p. 15", "Audio accessed online:"),
                new FieldSource("SourceType.ONLINE_VIDEO", "NCCA-BIO p. 15", "Video accessed online:"),
                new FieldSource("SourceFields.author", "NCCA-BIO p. 15", "they should give the author's name"),
                new FieldSource("SourceFields.title", "NCCA-BIO p. 15", "the title of the publication"),
                new FieldSource("SourceFields.datePublished", "NCCA-BIO p. 15", "year of publication"),
                new FieldSource("SourceFields.locator", "NCCA-BIO p. 15", "the page number or chapter/section of the publication"),
                new FieldSource("SourceFields.publication", "NCCA-BIO p. 16", "Irish Examiner"),
                new FieldSource("SourceFields.url", "NCCA-BIO p. 15", "including the hyperlink and date read or downloaded"),
                new FieldSource("SourceFields.url (Business)", "NCCA-BUS p. 21", "including the hyperlink and date read or downloaded"),
                new FieldSource("SourceFields.dateAccessed", "NCCA-BUS p. 19", "Date accessed:"),
                new FieldSource("SourceFields.keyInformation", "NCCA-BUS p. 19", "Key information"),
                new FieldSource("SourceFields.relevance", "NCCA-BUS p. 19", "How and why this is relevant to my question"),
                new FieldSource("SourceFields.reflections", "NCCA-BUS p. 19", "My reflections/thoughts on this"),
                new FieldSource("AiUseFields.toolNameAndVersion", "SEC-RULES p. 34", "The name and version of the AI tool used"),
                new FieldSource("AiUseFields.developer", "SEC-RULES p. 34", "The developer or publisher of the AI tool"),
                new FieldSource("AiUseFields.dateGenerated", "SEC-RULES p. 34", "The date the AI output was generated"),
                new FieldSource("AiUseFields.howUsed", "SEC-RULES p. 34", "A brief description of how the AI tool was used"),
                new FieldSource("AiUseFields.prompts", "SEC-RULES p. 34", "Where applicable, candidates must include the prompt(s) used to generate the output from the AI tool"),
                new FieldSource("AiUseFields.shareUrl", "SEC-RULES p. 34", "If the tool generates a shareable URL or session link, this should also be included in the appendix"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("fields")
    void eachFieldsPhraseIsOnItsPage(FieldSource f) {
        SourceRef ref = SourceRef.parse(f.sourceRef());
        assertThat(SourceDocuments.startsOnPage(ref, f.phrase()))
                .as("%s: \"%s\" not on %s; found on printed pages %s", f.field(), f.phrase(), f.sourceRef(),
                        SourceDocuments.printedPagesContaining(ref.key(), f.phrase()))
                .isTrue();
    }
}
