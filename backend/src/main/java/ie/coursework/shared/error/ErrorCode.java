package ie.coursework.shared.error;

import java.util.Locale;
import org.springframework.http.HttpStatus;

/**
 * Stable, machine-readable error identifiers, returned as {@code code} in every problem response.
 *
 * <p>The frontend branches on these names, so each one is API contract: renaming is a breaking
 * change. Later milestones add their own codes here.
 */
public enum ErrorCode {
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Validation failed"),
    USERNAME_INVALID(HttpStatus.BAD_REQUEST, "Username not allowed"),
    PASSWORD_TOO_SHORT(HttpStatus.BAD_REQUEST, "Password too short"),
    PASSWORD_TOO_LONG(HttpStatus.BAD_REQUEST, "Password too long"),
    MALFORMED_REQUEST(HttpStatus.BAD_REQUEST, "Malformed request"),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Not signed in"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Forbidden"),
    CSRF_TOKEN_INVALID(HttpStatus.FORBIDDEN, "Security token missing or invalid"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Not found"),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed"),
    USERNAME_TAKEN(HttpStatus.CONFLICT, "Username taken"),
    ROLL_NUMBER_TAKEN(HttpStatus.CONFLICT, "Roll number already registered"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Internal error");

    private static final String TYPE_PREFIX = "urn:coursework:problem:";

    private final HttpStatus status;
    private final String title;

    ErrorCode(HttpStatus status, String title) {
        this.status = status;
        this.title = title;
    }

    public HttpStatus status() {
        return status;
    }

    public String title() {
        return title;
    }

    public String type() {
        return TYPE_PREFIX + name().toLowerCase(Locale.ROOT).replace('_', '-');
    }
}
