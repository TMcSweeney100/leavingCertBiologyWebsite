package ie.coursework.timeline.adapter.web;

import jakarta.validation.constraints.NotNull;

/** The same shape as the teacher-item tick's request. */
public record DoneRequest(@NotNull Boolean done) {}
