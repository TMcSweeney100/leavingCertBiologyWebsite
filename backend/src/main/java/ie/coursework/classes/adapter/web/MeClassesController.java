package ie.coursework.classes.adapter.web;

import ie.coursework.classes.application.ClassViews.EnrolmentView;
import ie.coursework.classes.application.EnrolmentService;
import ie.coursework.identity.domain.Actor;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeClassesController {

    private final EnrolmentService enrolments;

    public MeClassesController(EnrolmentService enrolments) {
        this.enrolments = enrolments;
    }

    /** The signed-in user's own PENDING and APPROVED classes. Empty for anyone who is nobody's student. */
    @GetMapping("/api/v1/me/classes")
    List<EnrolmentView> myClasses(Actor actor) {
        return enrolments.myClasses(actor);
    }
}
