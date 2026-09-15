package ie.coursework.identity.domain;

import java.util.UUID;

public record RoleGrant(UUID schoolId, String schoolName, Role role) {}
