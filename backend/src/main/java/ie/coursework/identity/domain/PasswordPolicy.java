package ie.coursework.identity.domain;

import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.nio.charset.StandardCharsets;

/**
 * Length only, no composition rules (design §5.2). The upper bound exists because bcrypt reads only
 * the first 72 bytes and Spring Security rejects longer input rather than truncating it.
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 10;
    public static final int MAX_LENGTH = 64;
    private static final int MAX_BYTES = 72;

    private PasswordPolicy() {}

    public static void check(String password) {
        int length = password == null ? 0 : password.codePointCount(0, password.length());
        if (length < MIN_LENGTH) {
            throw new DomainException(ErrorCode.PASSWORD_TOO_SHORT,
                    "Passwords need at least " + MIN_LENGTH + " characters.");
        }
        if (length > MAX_LENGTH || password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new DomainException(ErrorCode.PASSWORD_TOO_LONG,
                    "Passwords can be at most " + MAX_LENGTH + " characters.");
        }
    }
}
