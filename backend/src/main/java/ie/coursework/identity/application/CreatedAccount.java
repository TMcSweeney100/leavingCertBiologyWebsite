package ie.coursework.identity.application;

import java.util.UUID;

/** Returned once. The temporary password exists nowhere else in plain text. */
public record CreatedAccount(UUID userId, String username, String temporaryPassword) {}
