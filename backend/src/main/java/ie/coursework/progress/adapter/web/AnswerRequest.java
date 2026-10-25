package ie.coursework.progress.adapter.web;

import ie.coursework.components.domain.RequestOutcome;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** R-1, R-17: Accepted or Not yet, with an optional note of at most 500 characters. */
public record AnswerRequest(@NotNull RequestOutcome outcome, @Size(max = 500) String note) {}
