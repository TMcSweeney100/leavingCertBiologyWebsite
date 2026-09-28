package ie.coursework.log.domain;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.shared.error.FieldError;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class LogContentTest {

    private static SourceFields book(String title) {
        return new SourceFields(SourceType.BOOK, title, "McLeskey, J.", null, "2013", null, null, "p. 57", null, null, null);
    }

    private static SourceFields online(String url, LocalDate accessed) {
        return new SourceFields(SourceType.ONLINE_VIDEO, "Zig & Zag – Christmas crises", "ApintTurtle", null, "20/12/2008",
                url, accessed, "3:20 to 5:45", null, null, null);
    }

    private static AiUseFields ai(String tool, String developer, LocalDate date, String howUsed, String shareUrl) {
        return new AiUseFields(tool, developer, date, howUsed, null, shareUrl);
    }

    @Test
    void aNoteNeedsABodyAndNoFields() {
        assertThat(LogContent.problems(EntryKind.NOTE, "Ran the pilot titration today.", null)).isEmpty();
        assertThat(LogContent.problems(EntryKind.NOTE, "  ", null)).extracting(FieldError::field).containsExactly("body");
        assertThat(LogContent.problems(EntryKind.NOTE, "x", book("A book"))).extracting(FieldError::field).containsExactly("fields");
    }

    @Test
    void theBodyIsCappedAt4000Characters() {
        assertThat(LogContent.problems(EntryKind.NOTE, "a".repeat(4000), null)).isEmpty();
        assertThat(LogContent.problems(EntryKind.NOTE, "a".repeat(4001), null)).extracting(FieldError::field).containsExactly("body");
    }

    @Test
    void aSourceNeedsItsTypeAndTitle() {
        assertThat(LogContent.problems(EntryKind.SOURCE, null, book("Inclusion: effective practice for all students?"))).isEmpty();
        assertThat(LogContent.problems(EntryKind.SOURCE, null, book(" "))).extracting(FieldError::field).containsExactly("fields.title");
        assertThat(LogContent.problems(EntryKind.SOURCE, null, null)).extracting(FieldError::field).containsExactly("fields");
    }

    @Test
    void anOnlineSourceNeedsAnHttpsLinkAndTheDateAccessed() {
        assertThat(LogContent.problems(EntryKind.SOURCE, null, online("https://youtu.be/yCv4iyPqZKQ", LocalDate.of(2024, 12, 12)))).isEmpty();
        assertThat(LogContent.problems(EntryKind.SOURCE, null, online(null, null)))
                .extracting(FieldError::field).containsExactly("fields.url", "fields.dateAccessed");
        assertThat(LogContent.problems(EntryKind.SOURCE, null, online("http://youtu.be/yCv4iyPqZKQ", LocalDate.of(2024, 12, 12))))
                .extracting(FieldError::message).containsExactly("must be a full https:// link");
    }

    @Test
    void anOfflineSourceMayStillCarryALinkButOnlyAnHttpsOne() {
        SourceFields withBadLink = new SourceFields(SourceType.BOOK, "A book", null, null, null, "ftp://x", null, null, null, null, null);
        assertThat(LogContent.problems(EntryKind.SOURCE, null, withBadLink)).extracting(FieldError::field).containsExactly("fields.url");
    }

    @Test
    void anAiUseNeedsTheFourMinimumDetails() {
        // SEC Coursework Rules and Procedures 2025-2026, Appendix 2 §4, p. 34.
        assertThat(LogContent.problems(EntryKind.AI_USE, null,
                ai("ChatGPT-4", "OpenAI", LocalDate.of(2025, 2, 14), "Used to suggest possible project themes.", null))).isEmpty();
        assertThat(LogContent.problems(EntryKind.AI_USE, null, ai(null, "", null, " ", null)))
                .extracting(FieldError::field)
                .containsExactly("fields.toolNameAndVersion", "fields.developer", "fields.dateGenerated", "fields.howUsed");
        assertThat(LogContent.problems(EntryKind.AI_USE, null,
                ai("ChatGPT-4", "OpenAI", LocalDate.of(2025, 2, 14), "Brainstorming", "chat.openai.com/share/x")))
                .extracting(FieldError::field).containsExactly("fields.shareUrl");
    }

    @Test
    void shortFieldsAreCappedAt500AndPromptsAt4000() {
        AiUseFields longTool = new AiUseFields("t".repeat(501), "OpenAI", LocalDate.of(2025, 2, 14), "x", "p".repeat(4000), null);
        assertThat(LogContent.problems(EntryKind.AI_USE, null, longTool)).extracting(FieldError::field)
                .containsExactly("fields.toolNameAndVersion");
        AiUseFields longPrompts = new AiUseFields("ChatGPT-4", "OpenAI", LocalDate.of(2025, 2, 14), "x", "p".repeat(4001), null);
        assertThat(LogContent.problems(EntryKind.AI_USE, null, longPrompts)).extracting(FieldError::field)
                .containsExactly("fields.prompts");
    }

    @Test
    void fieldsMustMatchTheKind() {
        assertThat(LogContent.problems(EntryKind.AI_USE, null, book("A book"))).extracting(FieldError::field).containsExactly("fields");
    }
}
