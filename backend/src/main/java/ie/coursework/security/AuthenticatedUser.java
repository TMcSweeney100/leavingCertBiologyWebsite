package ie.coursework.security;

import java.io.Serializable;
import java.security.Principal;
import java.util.UUID;

/**
 * What the session remembers about who's signed in: the user id and nothing else (roadmap R10).
 * Roles are loaded per request. As a {@link Principal} its name is the user id, which is what
 * Spring Session indexes, so every session for a user can be found and ended.
 */
public record AuthenticatedUser(UUID userId) implements Principal, Serializable {

    @Override
    public String getName() {
        return userId.toString();
    }
}
