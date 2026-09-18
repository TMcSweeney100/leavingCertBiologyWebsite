package ie.coursework.components.domain;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.support.MutableClock;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class DublinDateTest {

    @Test
    void halfPastMidnightInDublinSummerTimeIsAlreadyTomorrow() {
        // 23:30 UTC on 15 Oct is 00:30 IST on 16 Oct.
        assertThat(DublinDate.today(new MutableClock(Instant.parse("2026-10-15T23:30:00Z")))).isEqualTo(LocalDate.of(2026, 10, 16));
    }

    @Test
    void inWinterDublinIsUtc() {
        assertThat(DublinDate.today(new MutableClock(Instant.parse("2026-12-15T23:30:00Z")))).isEqualTo(LocalDate.of(2026, 12, 15));
    }
}
