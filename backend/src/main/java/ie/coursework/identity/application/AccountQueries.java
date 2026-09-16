package ie.coursework.identity.application;

import ie.coursework.identity.adapter.persistence.RoleRepository;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AccountQueries {

    private final UserAccountRepository users;
    private final RoleRepository roles;

    public AccountQueries(UserAccountRepository users, RoleRepository roles) {
        this.users = users;
        this.roles = roles;
    }

    public AccountView account(UUID userId) {
        return users.findProfile(userId)
                .map(profile -> new AccountView(profile, roles.grantsFor(userId)))
                .orElseThrow(() -> new DomainException(ErrorCode.UNAUTHENTICATED, "Sign in to continue."));
    }
}
