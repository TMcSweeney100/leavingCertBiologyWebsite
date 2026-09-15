package ie.coursework.security;

import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Hands the browser a CSRF token cookie before its first unsafe request. Reading the token is what
 * makes the cookie repository write it; the response body carries nothing.
 */
@RestController
public class CsrfController {

    @GetMapping("/api/v1/auth/csrf")
    ResponseEntity<Void> csrf(CsrfToken token) {
        token.getToken();
        return ResponseEntity.noContent().build();
    }
}
