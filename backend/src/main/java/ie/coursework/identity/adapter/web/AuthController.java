package ie.coursework.identity.adapter.web;

import ie.coursework.identity.application.AccountQueries;
import ie.coursework.security.AuthenticatedUser;
import ie.coursework.security.SessionEstablisher;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    /** Bcrypt reads no further, and Spring Security refuses longer input with an exception. */
    private static final int BCRYPT_MAX_BYTES = 72;

    private final AuthenticationManager authenticationManager;
    private final SessionEstablisher sessions;
    private final AccountQueries accounts;

    public AuthController(AuthenticationManager authenticationManager, SessionEstablisher sessions, AccountQueries accounts) {
        this.authenticationManager = authenticationManager;
        this.sessions = sessions;
        this.accounts = accounts;
    }

    @PostMapping("/login")
    MeResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        UUID userId = authenticate(body.username(), body.password());
        sessions.signIn(userId, request, response);
        return MeResponse.from(accounts.account(userId));
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(HttpServletRequest request) {
        sessions.signOut(request);
        return ResponseEntity.noContent().build();
    }

    /** Replaced in Task 9 by a version that takes the resolved Actor. */
    @GetMapping("/me")
    MeResponse me(@AuthenticationPrincipal AuthenticatedUser user) {
        return MeResponse.from(accounts.account(user.userId()));
    }

    private UUID authenticate(String username, String password) {
        // One message for every failure, so the response never says which part was wrong (design §10).
        DomainException wrong = new DomainException(ErrorCode.INVALID_CREDENTIALS, "Wrong username or password.");
        if (password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES) {
            throw wrong;
        }
        try {
            Authentication result = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(username, password));
            return UUID.fromString(result.getName());
        } catch (AuthenticationException e) {
            throw wrong;
        }
    }
}
