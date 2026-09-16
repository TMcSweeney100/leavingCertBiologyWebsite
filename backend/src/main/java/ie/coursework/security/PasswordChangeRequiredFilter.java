package ie.coursework.security;

import ie.coursework.identity.adapter.persistence.StoredCredential;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.shared.error.ErrorCode;
import ie.coursework.shared.error.ProblemResponses;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Until a temporary password is changed, only the endpoints needed to change it answer (roadmap R11).
 *
 * <p>Deliberately not a {@code @Component}: Spring Boot registers every Filter bean as a servlet
 * filter too, which would run it a second time outside the security chain, before the session is
 * read. SecurityConfig constructs it and adds it to the chain.
 */
public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED = Set.of(
            "GET /api/v1/auth/me",
            "GET /api/v1/auth/csrf",
            "POST /api/v1/auth/password",
            "POST /api/v1/auth/logout");

    private final UserAccountRepository users;
    private final ProblemResponses problems;

    public PasswordChangeRequiredFilter(UserAccountRepository users, ProblemResponses problems) {
        this.users = users;
        this.problems = problems;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof AuthenticatedUser user
                && !ALLOWED.contains(request.getMethod() + " " + request.getRequestURI())
                && users.findCredential(user.userId()).map(StoredCredential::mustChange).orElse(false)) {
            problems.write(request, response, ErrorCode.PASSWORD_CHANGE_REQUIRED, "Change your password to continue.");
            return;
        }
        chain.doFilter(request, response);
    }
}
