package ie.coursework.progress.domain;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.components.domain.CheckpointState;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class StandingTest {

    @Test
    void behindByCountsOnlyDueCheckpoints() {
        assertThat(Standing.behindBy(List.of(CheckpointState.DUE, CheckpointState.SIGNED_OFF, CheckpointState.NOT_DUE,
                CheckpointState.DUE))).isEqualTo(2);
        assertThat(Standing.behindBy(List.of())).isZero();
    }

    @Test
    void daysSinceIsCountedInDublinDaysAndNullWithoutActivity() {
        LocalDate today = LocalDate.of(2026, 10, 21);
        // 23:30 UTC on 20 Oct is 00:30 on 21 Oct in Dublin (summer time): today, not yesterday.
        assertThat(Standing.daysSince(Instant.parse("2026-10-20T23:30:00Z"), today)).isZero();
        assertThat(Standing.daysSince(Instant.parse("2026-10-20T22:30:00Z"), today)).isEqualTo(1);
        assertThat(Standing.daysSince(Instant.parse("2026-10-09T10:00:00Z"), today)).isEqualTo(12);
        assertThat(Standing.daysSince(null, today)).isNull();
    }

    @Test
    void furthestBehindFirstThenLongestSinceTheLastEntryWithNoEntriesLongestThenSurnameThenFirstName() {
        List<Standing> rows = new ArrayList<>(List.of(
                new Standing(1, 3, "Byrne", "Aoife"),
                new Standing(2, 1, "Walsh", "Cian"),
                new Standing(1, null, "Kelly", "Emma"),
                new Standing(1, 3, "Brennan", "Seán"),
                new Standing(0, 40, "Ahern", "Niamh"),
                new Standing(1, 3, "Brennan", "Aisling")));
        rows.sort(Standing.ORDER);
        assertThat(rows).extracting(Standing::firstName)
                .containsExactly("Cian", "Emma", "Aisling", "Seán", "Aoife", "Niamh");
    }

    @Test
    void surnamesCompareAsAnIrishReaderExpectsNotByCodePoint() {
        List<Standing> rows = new ArrayList<>(List.of(new Standing(0, 0, "Ó Briain", "A"), new Standing(0, 0, "Obama", "B"),
                new Standing(0, 0, "O'Brien", "C"),
                new Standing(0, 0, "Walsh", "D")));
        rows.sort(Standing.ORDER);
        // Code-point order would put "Ó Briain" after "Walsh" (Ó is U+00D3); the collator keeps it with the other O names.
        // The collator ignores the space, so "Ó Briain" reads as "Obriain" and follows "Obama".
        assertThat(rows.getLast().lastName()).isNotEqualTo("Ó Briain");
        assertThat(rows).extracting(Standing::lastName).containsExactly("O'Brien", "Obama", "Ó Briain", "Walsh");
    }
}
