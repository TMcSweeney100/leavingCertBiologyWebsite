package ie.coursework.timeline.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class TimelineRangeTest {

    private static final LocalDate FROM = LocalDate.of(2026, 10, 1);

    @Test
    void aSingleDayAndAHundredDaysAreFine() {
        assertThat(TimelineRange.problem(FROM, FROM)).isEmpty();
        assertThat(TimelineRange.problem(FROM, FROM.plusDays(99))).isEmpty();
    }

    @Test
    void endingBeforeItStartsIsRefused() {
        assertThat(TimelineRange.problem(FROM, FROM.minusDays(1))).contains("must be on or after from");
    }

    @Test
    void moreThanAHundredDaysIsRefused() {
        assertThat(TimelineRange.problem(FROM, FROM.plusDays(100))).contains("can be at most 100 days");
    }
}
