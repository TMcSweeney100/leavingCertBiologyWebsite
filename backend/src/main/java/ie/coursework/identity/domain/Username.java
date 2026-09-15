package ie.coursework.identity.domain;

import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * A sign-in name. Students type these on phones, so they're case-insensitive and limited to
 * characters autocorrect leaves alone (roadmap R12). Stored in the normalised form.
 */
public record Username(String value) {

    private static final Pattern FORMAT = Pattern.compile("^[a-z0-9._-]{3,32}$");

    public Username {
        if (value == null || !FORMAT.matcher(value).matches()) {
            throw new DomainException(ErrorCode.USERNAME_INVALID,
                    "Usernames are 3 to 32 characters: letters, numbers, dots, dashes and underscores.");
        }
    }

    public static Username parse(String raw) {
        return new Username(normalise(raw));
    }

    /** The lookup form of whatever was typed, without validating it. Used at sign-in. */
    public static String normalise(String raw) {
        return raw == null ? "" : raw.strip().toLowerCase(Locale.ROOT);
    }
}
