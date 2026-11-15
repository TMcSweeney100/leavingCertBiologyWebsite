package ie.coursework.timeline.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class TimelineRangeTest {

    private static final LocalDate FROM = LocalDate.of(2026, 10, 1);

    @Test
    void aSingleDayAndAWholeYearAreFine() {
        assertThat(TimelineRange.problem(FROM, FROM)).isEmpty();
        assertThat(TimelineRange.problem(FROM, FROM.plusDays(365))).isEmpty();
    }

    @Test
    void endingBeforeItStartsIsRefused() {
        assertThat(TimelineRange.problem(FROM, FROM.minusDays(1))).contains("must be on or after from");
    }

    @Test
    void moreThanAYearIsRefused() {
        assertThat(TimelineRange.problem(FROM, FROM.plusDays(366))).contains("can be at most 366 days");
    }
}
