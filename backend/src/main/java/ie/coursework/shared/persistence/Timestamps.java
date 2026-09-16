package ie.coursework.shared.persistence;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/** The Postgres driver binds OffsetDateTime to timestamptz but has no mapping for Instant. */
public final class Timestamps {

    private Timestamps() {}

    public static OffsetDateTime utc(Instant instant) {
        return instant == null ? null : OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }
}
