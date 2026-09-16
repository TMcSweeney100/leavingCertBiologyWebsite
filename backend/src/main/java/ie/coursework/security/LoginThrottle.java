package ie.coursework.security;

import ie.coursework.shared.InMemoryState;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

/**
 * Failures only, per username and per client address (roadmap R7). The per-address limit is high
 * because a whole school shares one address.
 *
 * <p>In memory, which assumes one API instance. Move it to Postgres before scaling out.
 */
@Component
public class LoginThrottle implements InMemoryState {

    private final AttemptLimiter byUsername;
    private final AttemptLimiter byAddress;

    public LoginThrottle(LoginLimitsProperties limits, Clock clock) {
        this.byUsername = new AttemptLimiter(limits.perUsername(), limits.window(), clock);
        this.byAddress = new AttemptLimiter(limits.perAddress(), limits.window(), clock);
    }

    public void checkAllowed(String username, String address) {
        Optional<Duration> wait = Stream.of(byUsername.blockedFor(username), byAddress.blockedFor(address))
                .flatMap(Optional::stream)
                .max(Duration::compareTo);
        if (wait.isPresent()) {
            long minutes = Math.max(1, (wait.get().toSeconds() + 59) / 60);
            throw new DomainException(ErrorCode.TOO_MANY_ATTEMPTS,
                    "Too many attempts. Try again in " + minutes + (minutes == 1 ? " minute." : " minutes."));
        }
    }

    public void recordFailure(String username, String address) {
        byUsername.recordFailure(username);
        byAddress.recordFailure(address);
    }

    public void recordSuccess(String username) {
        byUsername.clear(username);
    }

    @Override
    public void clear() {
        byUsername.clearAll();
        byAddress.clearAll();
    }
}
