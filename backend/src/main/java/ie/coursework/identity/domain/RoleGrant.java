package ie.coursework.identity.domain;

import java.util.UUID;

/** {@code schoolShortName} is null when the operator hasn't set one. */
public record RoleGrant(UUID schoolId, String schoolName, String schoolShortName, Role role) {}
