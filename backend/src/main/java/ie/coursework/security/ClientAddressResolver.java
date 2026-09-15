package ie.coursework.security;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The address a request really came from. Behind the Next.js proxy the socket address is Vercel's,
 * so the proxy forwards the client's address — which Spring believes only when the shared secret
 * comes with it (roadmap R8). Anyone else can put anything in X-Forwarded-For.
 */
@Component
public class ClientAddressResolver {

    private final byte[] secret;

    public ClientAddressResolver(@Value("${app.proxy-secret:}") String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String resolve(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String presented = request.getHeader("X-Proxy-Secret");
        boolean trusted = secret.length > 0 && presented != null
                && MessageDigest.isEqual(secret, presented.getBytes(StandardCharsets.UTF_8));
        if (trusted && forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].strip();
        }
        return request.getRemoteAddr();
    }
}
