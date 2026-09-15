package ie.coursework.identity.adapter.web;

import ie.coursework.identity.application.AccountQueries;
import ie.coursework.identity.application.PasswordService;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.Username;
import ie.coursework.security.ClientAddressResolver;
import ie.coursework.security.LoginThrottle;
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
    private final LoginThrottle throttle;
    private final ClientAddressResolver clientAddress;
    private final PasswordService passwords;

    public AuthController(AuthenticationManager authenticationManager, SessionEstablisher sessions,
            AccountQueries accounts, LoginThrottle throttle, ClientAddressResolver clientAddress,
            PasswordService passwords) {
        this.authenticationManager = authenticationManager;
        this.sessions = sessions;
        this.accounts = accounts;
        this.throttle = throttle;
        this.clientAddress = clientAddress;
        this.passwords = passwords;
    }

    @PostMapping("/login")
    MeResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        String username = Username.normalise(body.username());
        String address = clientAddress.resolve(request);
        throttle.checkAllowed(username, address);

        UUID userId;
        try {
            userId = authenticate(body.username(), body.password());
        } catch (DomainException wrong) {
            throttle.recordFailure(username, address);
            throw wrong;
        }
        throttle.recordSuccess(username);
        sessions.signIn(userId, request, response);
        return MeResponse.from(accounts.account(userId));
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(HttpServletRequest request) {
        sessions.signOut(request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    MeResponse me(Actor actor) {
        return MeResponse.from(accounts.account(actor.userId()));
    }

    @PostMapping("/password")
    ResponseEntity<Void> changePassword(Actor actor, @Valid @RequestBody ChangePasswordRequest body, HttpServletRequest request) {
        passwords.change(actor, body.currentPassword(), body.newPassword(), request.getSession().getId());
        return ResponseEntity.noContent().build();
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
