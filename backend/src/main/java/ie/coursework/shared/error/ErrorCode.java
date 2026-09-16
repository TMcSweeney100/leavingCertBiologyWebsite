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
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Wrong username or password"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Forbidden"),
    CSRF_TOKEN_INVALID(HttpStatus.FORBIDDEN, "Security token missing or invalid"),
    PASSWORD_CHANGE_REQUIRED(HttpStatus.FORBIDDEN, "Password change required"),
    JOIN_CODE_INVALID(HttpStatus.NOT_FOUND, "Join code unknown or expired"),
    ENROLMENT_NOT_PENDING(HttpStatus.CONFLICT, "That request has already been decided"),
    ENROLMENT_ALREADY_REMOVED(HttpStatus.CONFLICT, "That student has already been removed"),
    RESET_CODE_INVALID(HttpStatus.BAD_REQUEST, "Reset code wrong or expired"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Not found"),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed"),
    TOO_MANY_ATTEMPTS(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts"),
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
