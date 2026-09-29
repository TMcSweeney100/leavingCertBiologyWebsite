package ie.coursework.progress.domain;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.components.domain.CheckpointState;
import ie.coursework.components.domain.DublinDate;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

/** Roadmap §8.4: "due" turns over at Irish midnight, not UTC midnight. */
class DueBoundaryTest {

    private static CheckpointState at(String utc, LocalDate stageDate) {
        LocalDate today = DublinDate.today(Clock.fixed(Instant.parse(utc), ZoneOffset.UTC));
        return CheckpointState.at(stageDate, today, false);
    }

    @Test
    void inSummerTimeAStageBecomesDueAtIrishMidnightAnHourBeforeUtc() {
        LocalDate stage = LocalDate.of(2026, 10, 20);
        assertThat(at("2026-10-20T22:59:00Z", stage)).isEqualTo(CheckpointState.NOT_DUE); // 23:59 Dublin, 20 Oct
        assertThat(at("2026-10-20T23:30:00Z", stage)).isEqualTo(CheckpointState.DUE);     // 00:30 Dublin, 21 Oct
    }

    @Test
    void inWinterTimeDublinIsUtc() {
        LocalDate stage = LocalDate.of(2026, 11, 20);
        assertThat(at("2026-11-20T23:30:00Z", stage)).isEqualTo(CheckpointState.NOT_DUE); // 23:30 Dublin, 20 Nov
        assertThat(at("2026-11-21T00:00:00Z", stage)).isEqualTo(CheckpointState.DUE);
    }
}
