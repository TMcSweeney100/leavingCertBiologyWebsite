package ie.coursework.progress.adapter.web;

import jakarta.validation.constraints.Size;

/** Ready-for-signoff R-17: an optional note, at most 280 characters. */
public record AskRequest(@Size(max = 280) String note) {}
