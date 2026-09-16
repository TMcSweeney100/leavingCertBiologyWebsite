package ie.coursework.identity.domain;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

/**
 * A one-time password reset code a teacher reads out (design §8.1 step 5). Same alphabet as join
 * codes. Stored only as a SHA-256 digest: the code is high-entropy and short-lived, so a fast hash
 * is right and bcrypt would be needless work.
 */
public record ResetCode(String value) {

    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int LENGTH = 8;
    public static final Duration LIFETIME = Duration.ofHours(24);

    public static ResetCode generate(SecureRandom random) {
        StringBuilder code = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return new ResetCode(code.toString());
    }

    public Instant expiryFrom(Instant issuedAt) {
        return issuedAt.plus(LIFETIME);
    }

    public String hash() {
        return hashOf(value);
    }

    /** Digest of the normalised form, so what a student types matches what was issued. */
    public static String hashOf(String typed) {
        String normalised = typed == null ? "" : typed.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(normalised.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 missing", e);
        }
    }
}
