package ie.coursework.timeline.domain;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/** The Timeline view runs from this week to the end of the school year (plan timeline-redesign T-10); a year caps the union query. */
public final class TimelineRange {

    public static final int MAX_DAYS = 366;

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
