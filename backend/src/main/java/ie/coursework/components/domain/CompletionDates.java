package ie.coursework.components.domain;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Design §6.4 (FR-49): no class date may be after the brief's completion date. */
public final class CompletionDates {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    private CompletionDates() {}

    public static boolean allows(LocalDate dueDate, LocalDate completionDate) {
        return !dueDate.isAfter(completionDate);
    }

    /** "Stage 6 is after the completion date, 26 Feb 2027. Choose a date on or before it." */
    public static String refusal(String what, LocalDate completionDate) {
        return "%s is after the completion date, %s. Choose a date on or before it.".formatted(what, DAY.format(completionDate));
    }

    public static String refusals(int count, LocalDate completionDate) {
        return "%d dates are after the completion date, %s. Choose dates on or before them.".formatted(count, DAY.format(completionDate));
    }
}
