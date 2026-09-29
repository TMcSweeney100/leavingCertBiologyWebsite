package ie.coursework.progress.domain;

import ie.coursework.components.domain.CheckpointState;
import ie.coursework.components.domain.DublinDate;
import java.text.Collator;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.Comparator;
import java.util.Locale;

/**
 * Where one student stands on the teacher's grid (design §8.4). The grid is sorted furthest behind first, then
 * longest since their last log entry (none at all counts as longest), then surname and first name as an Irish
 * reader sorts them (pack D-7). Log activity orders the rows but never feeds the behind-by number.
 */
public record Standing(int behindBy, Integer daysSinceLastLogActivity, String lastName, String firstName) {

    private static final Collator NAMES = Collator.getInstance(Locale.forLanguageTag("en-IE"));

    public static final Comparator<Standing> ORDER = Comparator
            .<Standing>comparingInt(s -> s.behindBy()).reversed()
            .thenComparing(Standing::daysSinceLastLogActivity, Comparator.nullsFirst(Comparator.<Integer>reverseOrder()))
            .thenComparing(Standing::lastName, NAMES)
            .thenComparing(Standing::firstName, NAMES);

    public static int behindBy(Collection<CheckpointState> states) {
        return (int) states.stream().filter(s -> s == CheckpointState.DUE).count();
    }

    /** Whole Dublin days from the student's latest log activity to today; null when they have none. */
    public static Integer daysSince(Instant lastActivity, LocalDate today) {
        return lastActivity == null ? null : (int) ChronoUnit.DAYS.between(DublinDate.of(lastActivity), today);
    }
}
