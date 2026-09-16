package ie.coursework.shared.error;

import java.util.List;

/**
 * An expected failure the user can understand and act on. Its detail is sent to the client, so it
 * must never contain a secret, a stack detail or another user's data. Anything thrown that isn't a
 * DomainException is treated as a bug and returned as an opaque 500.
 */
public class DomainException extends RuntimeException {

    private final ErrorCode errorCode;
    private final transient List<FieldError> fieldErrors;

    public DomainException(ErrorCode errorCode, String detail) {
        this(errorCode, detail, List.of());
    }

    public DomainException(ErrorCode errorCode, String detail, List<FieldError> fieldErrors) {
        super(detail);
        this.errorCode = errorCode;
        this.fieldErrors = List.copyOf(fieldErrors);
    }

    public ErrorCode errorCode() {
        return errorCode;
    }

    public List<FieldError> fieldErrors() {
        return fieldErrors;
    }
}
