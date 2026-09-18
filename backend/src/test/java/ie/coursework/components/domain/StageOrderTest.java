package ie.coursework.components.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class StageOrderTest {

    private final UUID s3 = UUID.randomUUID();
    private final UUID s4 = UUID.randomUUID();
    private final UUID s5 = UUID.randomUUID();

    @Test
    void datesInStageOrderGiveNoWarning() {
        assertThat(StageOrder.outOfOrder(List.of(
                new DatedStage(s3, 3, LocalDate.of(2026, 9, 25)),
                new DatedStage(s4, 4, LocalDate.of(2026, 10, 16)),
                new DatedStage(s5, 5, LocalDate.of(2026, 10, 16))))).isEmpty();
    }

    @Test
    void aLaterStageDueBeforeTheOneBeforeItIsFlaggedAsAPair() {
        assertThat(StageOrder.outOfOrder(List.of(
                new DatedStage(s5, 5, LocalDate.of(2026, 10, 9)),
                new DatedStage(s4, 4, LocalDate.of(2026, 10, 16)))))
                .containsExactly(List.of(s4, s5));
    }

    @Test
    void undatedStagesAreSkipped() {
        assertThat(StageOrder.outOfOrder(List.of(
                new DatedStage(s3, 3, LocalDate.of(2026, 10, 10)),
                new DatedStage(s4, 4, null),
                new DatedStage(s5, 5, LocalDate.of(2026, 10, 1)))))
                .containsExactly(List.of(s3, s5));
    }
}
