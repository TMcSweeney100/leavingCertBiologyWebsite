package ie.coursework.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/** Counts failures per key within a sliding window. Synchronized: the volumes here are tiny. */
public final class AttemptLimiter {

    private final int limit;
    private final Duration window;
    private final Clock clock;
    private final Map<String, Deque<Instant>> failures = new HashMap<>();

    public AttemptLimiter(int limit, Duration window, Clock clock) {
        this.limit = limit;
        this.window = window;
        this.clock = clock;
    }

    /** How long until the next attempt is allowed, or empty if it's allowed now. */
    public synchronized Optional<Duration> blockedFor(String key) {
        Deque<Instant> recent = pruned(key);
        if (recent.size() < limit) {
            return Optional.empty();
        }
        return Optional.of(Duration.between(clock.instant(), recent.peekFirst().plus(window)));
    }

    public synchronized void recordFailure(String key) {
        pruned(key).addLast(clock.instant());
    }

    public synchronized void clear(String key) {
        failures.remove(key);
    }

    public synchronized void clearAll() {
        failures.clear();
    }

    private Deque<Instant> pruned(String key) {
        Deque<Instant> recent = failures.computeIfAbsent(key, k -> new ArrayDeque<>());
        Instant cutoff = clock.instant().minus(window);
        while (!recent.isEmpty() && !recent.peekFirst().isAfter(cutoff)) {
            recent.removeFirst();
        }
        return recent;
    }
}
