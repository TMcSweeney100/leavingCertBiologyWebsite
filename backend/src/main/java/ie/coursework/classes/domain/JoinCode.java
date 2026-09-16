package ie.coursework.classes.domain;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * An 8-character code a teacher reads out and a student types on a phone (design §6.1). No 0, O, 1,
 * I or L, so nothing can be misheard or misread. Parsing is forgiving about case, spaces and dashes.
 */
public record JoinCode(String value) {

    static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final Pattern FORMAT = Pattern.compile("^[A-HJKMNP-Z2-9]{8}$");
    private static final int LENGTH = 8;

    /** Plan decision P-1. */
    public static final Duration LIFETIME = Duration.ofDays(30);

    public JoinCode {
        if (value == null || !FORMAT.matcher(value).matches()) {
            throw new IllegalArgumentException("not a join code");
        }
    }

    public static JoinCode generate(SecureRandom random) {
        StringBuilder code = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return new JoinCode(code.toString());
    }

    /** What a student typed, normalised; empty if it can't be a code. Never throws. */
    public static Optional<JoinCode> parse(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        String normalised = raw.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
        return FORMAT.matcher(normalised).matches() ? Optional.of(new JoinCode(normalised)) : Optional.empty();
    }

    public static Instant expiryFrom(Instant issuedAt) {
        return issuedAt.plus(LIFETIME);
    }
}
