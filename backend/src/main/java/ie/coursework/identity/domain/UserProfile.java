package ie.coursework.identity.domain;

import java.util.UUID;

public record UserProfile(
        UUID userId, String username, String firstName, String lastName, boolean mustChange, boolean disabled) {}
