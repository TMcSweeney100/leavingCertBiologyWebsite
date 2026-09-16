package ie.coursework.classes.adapter.web;

import ie.coursework.classes.application.ClassViews.EnrolmentView;
import ie.coursework.classes.application.ClassViews.JoinPreview;
import ie.coursework.classes.application.EnrolmentService;
import ie.coursework.identity.domain.Actor;
import ie.coursework.security.SessionEstablisher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/join")
public class JoinController {

    private final EnrolmentService enrolments;
    private final SessionEstablisher sessions;

    public JoinController(EnrolmentService enrolments, SessionEstablisher sessions) {
        this.enrolments = enrolments;
        this.sessions = sessions;
    }

    /** Public: what a code is for, before anyone commits to an account. */
    @GetMapping("/{code}")
    JoinPreview preview(@PathVariable String code) {
        return enrolments.preview(code);
    }

    /** Public: create a student account, sign it in, and ask to join. */
    @PostMapping("/{code}/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    EnrolmentView signUp(@PathVariable String code, @Valid @RequestBody SignUpRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        EnrolmentService.SignedUp result = enrolments.signUp(code, body.firstName(), body.lastName(),
                body.username(), body.password());
        sessions.signIn(result.userId(), request, response);
        return result.enrolment();
    }

    /** Signed in: ask to join with this account. */
    @PostMapping("/{code}/enrolments")
    EnrolmentView join(Actor actor, @PathVariable String code) {
        return enrolments.join(actor, code);
    }
}
