package ie.coursework.security;

import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.stereotype.Component;

/**
 * Ends a user's sessions. Optional because an operator process has no web application and so no
 * session repository.
 */
@Component
public class OtherSessions {

    private final ObjectProvider<FindByIndexNameSessionRepository<?>> repository;

    public OtherSessions(ObjectProvider<FindByIndexNameSessionRepository<?>> repository) {
        this.repository = repository;
    }

    /** Ends every session for the user except {@code keepSessionId} (null ends all of them). */
    public void endAllExcept(UUID userId, String keepSessionId) {
        repository.ifAvailable(sessions -> sessions.findByPrincipalName(userId.toString()).keySet().stream()
                .filter(id -> !id.equals(keepSessionId))
                .forEach(sessions::deleteById));
    }
}
