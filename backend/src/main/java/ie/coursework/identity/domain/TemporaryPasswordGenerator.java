package ie.coursework.identity.domain;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

/**
 * Temporary passwords for accounts the operator creates. Read aloud or written down once, so no
 * characters that look like others (0/O, 1/l/I).
 *
 * <p>The domain package is otherwise Spring-free; {@code @Component} here is the one pragmatic
 * exception so the service can inject it.
 */
@Component
public class TemporaryPasswordGenerator {

    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final int LENGTH = 16;

    private final SecureRandom random;

    public TemporaryPasswordGenerator() {
        this(new SecureRandom());
    }

    TemporaryPasswordGenerator(SecureRandom random) {
        this.random = random;
    }

    public String next() {
        StringBuilder password = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            password.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return password.toString();
    }
}
