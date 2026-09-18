package ie.coursework.components.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class CheckpointStateTest {

    private static final LocalDate STAGE_DATE = LocalDate.of(2026, 9, 25);

    @Test
    void notDueOnOrBeforeTheStagesDate() {
        assertThat(CheckpointState.at(STAGE_DATE, STAGE_DATE.minusDays(3))).isEqualTo(CheckpointState.NOT_DUE);
        assertThat(CheckpointState.at(STAGE_DATE, STAGE_DATE)).isEqualTo(CheckpointState.NOT_DUE);
    }

    @Test
    void dueFromTheDayAfter() {
        assertThat(CheckpointState.at(STAGE_DATE, STAGE_DATE.plusDays(1))).isEqualTo(CheckpointState.DUE);
    }

    @Test
    void neverDueWithoutADate() {
        assertThat(CheckpointState.at(null, LocalDate.of(2030, 1, 1))).isEqualTo(CheckpointState.NOT_DUE);
    }
}
