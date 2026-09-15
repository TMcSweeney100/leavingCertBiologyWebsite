package ie.coursework.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

/**
 * Starts and ends sessions for the JSON endpoints. Spring's form login would do this for us, but
 * this API has no form login, so the steps it performs are here explicitly: rotate the session id
 * (session fixation), put a minimal principal in a fresh security context, and save it to the
 * session the filter chain reads from.
 */
@Component
public class SessionEstablisher {

    private final SecurityContextRepository repository = new HttpSessionSecurityContextRepository();
    private final SessionAuthenticationStrategy sessionFixation = new ChangeSessionIdAuthenticationStrategy();
    private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

    public void signIn(UUID userId, HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication =
                UsernamePasswordAuthenticationToken.authenticated(new AuthenticatedUser(userId), null, List.of());
        sessionFixation.onAuthentication(authentication, request, response);
        SecurityContext context = holder.createEmptyContext();
        context.setAuthentication(authentication);
        holder.setContext(context);
        repository.saveContext(context, request, response);
    }

    public void signOut(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        holder.clearContext();
    }
}
