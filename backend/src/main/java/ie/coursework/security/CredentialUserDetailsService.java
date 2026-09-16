package ie.coursework.security;

import ie.coursework.identity.adapter.persistence.StoredCredential;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Username;
import ie.coursework.shared.error.DomainException;
import java.util.List;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Looks up a credential for Spring's DaoAuthenticationProvider. The UserDetails "username" is the
 * user id, so the authenticated result names the account without a second lookup.
 */
@Service
public class CredentialUserDetailsService implements UserDetailsService {

    private final UserAccountRepository users;

    public CredentialUserDetailsService(UserAccountRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String typed) {
        StoredCredential credential;
        try {
            credential = users.findCredential(Username.parse(typed))
                    .orElseThrow(() -> new UsernameNotFoundException("unknown"));
        } catch (DomainException invalidFormat) {
            throw new UsernameNotFoundException("unknown");
        }
        return User.withUsername(credential.userId().toString())
                .password(credential.passwordHash())
                .disabled(credential.disabled())
                .authorities(List.of())
                .build();
    }
}
