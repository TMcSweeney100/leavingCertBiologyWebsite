package ie.coursework.security;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class AttemptLimiterTest {

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-05T09:00:00Z"));
    private final AttemptLimiter limiter = new AttemptLimiter(3, Duration.ofMinutes(15), clock);

    @Test
    void allowsUntilTheLimitIsReached() {
        limiter.recordFailure("k");
        limiter.recordFailure("k");
        assertThat(limiter.blockedFor("k")).isEmpty();

        limiter.recordFailure("k");
        assertThat(limiter.blockedFor("k")).contains(Duration.ofMinutes(15));
    }

    @Test
    void theWaitIsUntilTheOldestFailureLeavesTheWindow() {
        limiter.recordFailure("k");
        clock.advance(Duration.ofMinutes(5));
        limiter.recordFailure("k");
        limiter.recordFailure("k");

        assertThat(limiter.blockedFor("k")).contains(Duration.ofMinutes(10));

        clock.advance(Duration.ofMinutes(10));
        assertThat(limiter.blockedFor("k")).isEmpty();
    }

    @Test
    void keysAreIndependentAndClearingOneResetsIt() {
        for (int i = 0; i < 3; i++) limiter.recordFailure("a");

        assertThat(limiter.blockedFor("b")).isEmpty();
        limiter.clear("a");
        assertThat(limiter.blockedFor("a")).isEmpty();
    }
}
