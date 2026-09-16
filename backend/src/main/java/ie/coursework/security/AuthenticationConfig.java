package ie.coursework.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Username-and-password authentication through Spring's DaoAuthenticationProvider, so bcrypt
 * comparison and user-enumeration timing protection come from Spring rather than hand-written code.
 *
 * <p>Separate from {@link SecurityConfig}, which is web-only: an operator process still
 * component-scans the controllers that need this bean, even though it never serves a request.
 */
@Configuration
public class AuthenticationConfig {

    @Bean
    AuthenticationManager authenticationManager(CredentialUserDetailsService credentials, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(credentials);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }
}
