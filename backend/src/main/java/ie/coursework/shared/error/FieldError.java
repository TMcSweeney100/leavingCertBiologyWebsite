package ie.coursework.shared.error;

/** One invalid field, as returned in {@code fieldErrors}. */
public record FieldError(String field, String message) {}
