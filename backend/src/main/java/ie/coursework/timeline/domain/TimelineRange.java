package ie.coursework.timeline.domain;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/** Plan 2F P2-47: the largest view is a month; 100 days leaves room and caps the union query. */
public final class TimelineRange {

    public static final int MAX_DAYS = 100;

    private TimelineRange() {}

    /** Why {@code from}..{@code to} (inclusive) isn't an acceptable range, or empty if it is. */
    public static Optional<String> problem(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            return Optional.of("must be on or after from");
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_DAYS) {
            return Optional.of("can be at most " + MAX_DAYS + " days");
        }
        return Optional.empty();
    }
}
