package ie.coursework.security;

import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.shared.error.ErrorCode;
import ie.coursework.shared.error.ProblemResponses;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.csrf.CsrfException;

/**
 * The API's filter chain.
 *
 * <p>CSRF: {@code csrf.spa()} uses a readable {@code XSRF-TOKEN} cookie and expects the token back
 * in {@code X-XSRF-TOKEN}. Browser and API share one origin through the Next.js proxy, so there is
 * no CORS configuration and no {@code @CrossOrigin} anywhere.
 *
 * <p>Every rejection is a problem response, never an HTML page, a redirect or a Basic challenge.
 *
 * <p>Web-only: an operator process has no web server, so no filter chain is built for it.
 */
@Configuration
@ConditionalOnWebApplication
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiFilterChain(HttpSecurity http, ProblemResponses problems, UserAccountRepository users)
            throws Exception {
        http
                .csrf(csrf -> csrf.spa())
                .authorizeHttpRequests(auth -> auth
                        // Spring Boot forwards errors to /error, which re-enters this chain.
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/health", "/api/v1/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) ->
                                problems.write(request, response, ErrorCode.UNAUTHENTICATED, "Sign in to continue."))
                        .accessDeniedHandler((request, response, exception) -> {
                            if (exception instanceof CsrfException) {
                                problems.write(request, response, ErrorCode.CSRF_TOKEN_INVALID,
                                        "Refresh the page and try again.");
                            } else {
                                problems.write(request, response, ErrorCode.FORBIDDEN, "Not allowed.");
                            }
                        }))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .requestCache(cache -> cache.disable());
        http.addFilterAfter(new PasswordChangeRequiredFilter(users, problems), AuthorizationFilter.class);
        return http.build();
    }
}
