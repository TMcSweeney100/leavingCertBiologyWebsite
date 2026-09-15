package ie.coursework.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Turns exceptions into RFC 9457 problem details, each with a stable {@code code}. */
@RestControllerAdvice
public class ProblemDetailsAdvice {

    private static final Logger log = LoggerFactory.getLogger(ProblemDetailsAdvice.class);

    @ExceptionHandler(DomainException.class)
    ResponseEntity<ProblemDetail> domain(DomainException exception, HttpServletRequest request) {
        log.debug("{} at {}: {}", exception.errorCode(), request.getRequestURI(), exception.getMessage());
        return respond(exception.errorCode(), exception.getMessage(), request, exception.fieldErrors());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> validation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        List<FieldError> fields = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldError(error.getField(),
                        error.getDefaultMessage() == null ? "is invalid" : error.getDefaultMessage()))
                .toList();
        return respond(ErrorCode.VALIDATION_FAILED, "One or more fields are invalid.", request, fields);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ProblemDetail> unreadable(HttpServletRequest request) {
        return respond(ErrorCode.MALFORMED_REQUEST, "The request body could not be read.", request, List.of());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ProblemDetail> noResource(HttpServletRequest request) {
        return respond(ErrorCode.NOT_FOUND, "No such resource.", request, List.of());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ProblemDetail> methodNotAllowed(HttpServletRequest request) {
        return respond(ErrorCode.METHOD_NOT_ALLOWED, "That method isn't supported here.", request, List.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unexpected(Exception exception, HttpServletRequest request) {
        // Full detail stays in the server log. The message could hold a connection string.
        log.error("Unhandled exception at {}", request.getRequestURI(), exception);
        return respond(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred.", request, List.of());
    }

    private ResponseEntity<ProblemDetail> respond(
            ErrorCode code, String detail, HttpServletRequest request, List<FieldError> fieldErrors) {
        ProblemDetail problem = ProblemDetail.forStatus(code.status());
        problem.setType(URI.create(code.type()));
        problem.setTitle(code.title());
        problem.setDetail(detail);
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", code.name());
        problem.setProperty("fieldErrors", fieldErrors);
        return ResponseEntity.of(problem).build();
    }
}
