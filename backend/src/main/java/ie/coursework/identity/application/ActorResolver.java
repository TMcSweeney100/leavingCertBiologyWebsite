package ie.coursework.identity.application;

import ie.coursework.identity.adapter.persistence.RoleRepository;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Actor;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Loads the actor for a signed-in user id, fresh on every request (roadmap R10). */
@Service
public class ActorResolver {

    private final UserAccountRepository users;
    private final RoleRepository roles;

    public ActorResolver(UserAccountRepository users, RoleRepository roles) {
        this.users = users;
        this.roles = roles;
    }

    public Actor resolve(UUID userId) {
        boolean active = users.findProfile(userId).map(profile -> !profile.disabled()).orElse(false);
        if (!active) {
            throw new DomainException(ErrorCode.UNAUTHENTICATED, "Sign in to continue.");
        }
        return new Actor(userId, roles.grantsFor(userId));
    }
}
