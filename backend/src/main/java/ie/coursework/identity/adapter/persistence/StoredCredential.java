package ie.coursework.identity.adapter.persistence;

import java.util.UUID;

/** A credential row. Holds a password hash, so it never leaves the identity package. */
public record StoredCredential(UUID userId, String username, String passwordHash, boolean mustChange, boolean disabled) {}
