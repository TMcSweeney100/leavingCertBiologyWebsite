package ie.coursework.components.domain;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

/** Schools run on Irish dates. The server runs in UTC, and Ireland is UTC+1 for much of the school year. */
public final class DublinDate {

    private static final ZoneId DUBLIN = ZoneId.of("Europe/Dublin");

    private DublinDate() {}

    public static LocalDate today(Clock clock) {
        return LocalDate.ofInstant(clock.instant(), DUBLIN);
    }
}
