package ie.coursework.components.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class CheckpointStateTest {

    private static final LocalDate TODAY = LocalDate.of(2027, 3, 3);

    @Test
    void aSignOffSettlesItWhateverTheDateOrRequest() {
        assertThat(CheckpointState.at(TODAY.minusDays(9), TODAY, true, true)).isEqualTo(CheckpointState.SIGNED_OFF);
        assertThat(CheckpointState.at(null, TODAY, true, false)).isEqualTo(CheckpointState.SIGNED_OFF);
    }

    @Test
    void anOpenRequestIsReadyBeforeOrAfterTheDate() {
        assertThat(CheckpointState.at(TODAY.minusDays(1), TODAY, false, true)).isEqualTo(CheckpointState.READY);
        assertThat(CheckpointState.at(TODAY.plusDays(5), TODAY, false, true)).isEqualTo(CheckpointState.READY);
        assertThat(CheckpointState.at(null, TODAY, false, true)).isEqualTo(CheckpointState.READY);
    }

    @Test
    void withoutEitherItIsDueOnceTheDateHasPassed() {
        assertThat(CheckpointState.at(TODAY.minusDays(1), TODAY, false, false)).isEqualTo(CheckpointState.DUE);
        assertThat(CheckpointState.at(TODAY, TODAY, false, false)).isEqualTo(CheckpointState.NOT_DUE);
        assertThat(CheckpointState.at(null, TODAY, false, false)).isEqualTo(CheckpointState.NOT_DUE);
    }
}
