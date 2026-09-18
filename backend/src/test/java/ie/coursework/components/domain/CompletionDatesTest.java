package ie.coursework.components.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class CompletionDatesTest {

    private static final LocalDate COMPLETION = LocalDate.of(2027, 2, 26);

    @Test
    void theCompletionDateItselfIsAllowed() {
        assertThat(CompletionDates.allows(COMPLETION, COMPLETION)).isTrue();
        assertThat(CompletionDates.allows(COMPLETION.minusDays(90), COMPLETION)).isTrue();
    }

    @Test
    void theDayAfterIsNot() {
        assertThat(CompletionDates.allows(COMPLETION.plusDays(1), COMPLETION)).isFalse();
    }

    @Test
    void theRefusalNamesWhatAndTheDate() {
        assertThat(CompletionDates.refusal("Stage 6", COMPLETION))
                .isEqualTo("Stage 6 is after the completion date, 26 Feb 2027. Choose a date on or before it.");
    }

    @Test
    void severalRefusalsAreCounted() {
        assertThat(CompletionDates.refusals(2, COMPLETION))
                .isEqualTo("2 dates are after the completion date, 26 Feb 2027. Choose dates on or before them.");
    }
}
