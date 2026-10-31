package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The NCCA's referencing examples, sources and AI tools, quoted in frontend/lib/app/citation.test.ts as the formatter's fixtures. The two
 * guidelines carry the same examples, so each is checked in both. Same literals as the test file: change both or neither.
 */
class CitationExamplesSourcesTest {

    static final List<String> IN_TEXT = List.of(
            "(p. 57, McLeskey, 2013)",
            "(Hearne, J., 30/08/2024)",
            "(thelatinlibrary.com/101/RhetoricalDevices)",
            "(Ep. 10, rte.ie/radio/podcasts/22093250)",
            "(3:20 to 5:45, youtu.be/yCv4iyPqZKQ)",
            "(chat.openai.com/share/f45a1e23-2217-4443-a244-d56ab26ae940)",
            "(OpenAI (2023) ChatGPT, 20/10/2023)");

    static final List<String> REFERENCES = List.of(
            "McLeskey, J. (2013) Inclusion: effective practice for all students? 2nd edn.",
            "Hearne, J. (30/08/2024) ‘How bad driving habits cost Irish motorists hundreds every year’, Irish Examiner",
            "Latin Library, Principal Rhetorical and Literary Devices, (date written not available), "
                    + "http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf, Date accessed: 17/6/24",
            "Philip Boucher Hayes, RTE, Hot Mess – Megawatts and Megabytes, Podcast, date created: 30/5/24, "
                    + "https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/, Date accessed: 10/11/23",
            "ApintTurtle, Zig & Zag – Christmas crises, Film, date created 20/12/2008, http://youtu.be/yCv4iyPqZKQ, "
                    + "12/12/14, from 3 minutes 20 seconds to 5 minutes 45 seconds.",
            "OpenAI (2023) ChatGPT (Oct. 20 version) [Large language model], accessed 20 October 2023.",
            "https://chat.openai.com/share/f45a1e23-2217-4443-a244-d56ab26ae940",
            "Prompt used and text generated.");

    static Stream<Arguments> examples() {
        return Stream.of(
                        IN_TEXT.stream().flatMap(q -> Stream.of(Arguments.of("NCCA-BIO p. 15", q), Arguments.of("NCCA-BUS p. 22", q))),
                        REFERENCES.stream().flatMap(q -> Stream.of(Arguments.of("NCCA-BIO p. 16", q), Arguments.of("NCCA-BUS p. 23", q))))
                .flatMap(s -> s);
    }

    @ParameterizedTest(name = "{0}: {1}")
    @MethodSource("examples")
    void eachExampleIsOnItsPage(String ref, String quote) {
        SourceRef source = SourceRef.parse(ref);
        assertThat(SourceDocuments.startsOnPage(source, quote))
                .as("not on %s; found on %s", ref, SourceDocuments.printedPagesContaining(source.key(), quote)).isTrue();
    }

    static final String NO_LINK_RULE =
            "Where an AI tool does not generate a sharable URL, student should include the name of the tool and the prompt used.";

    @Test
    void theNoShareLinkRuleIsOnItsPage() { // decision A-9
        SourceRef source = SourceRef.parse("NCCA-BIO p. 15");
        assertThat(SourceDocuments.startsOnPage(source, NO_LINK_RULE))
                .as("not on %s; found on %s", source, SourceDocuments.printedPagesContaining(source.key(), NO_LINK_RULE)).isTrue();
    }
}
