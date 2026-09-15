package ie.coursework.classes.adapter.web;

import ie.coursework.classes.adapter.persistence.SubjectRepository;
import ie.coursework.identity.domain.Actor;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SubjectController {

    record SubjectView(String code, String name) {}

    private final SubjectRepository subjects;

    public SubjectController(SubjectRepository subjects) {
        this.subjects = subjects;
    }

    /** Reference data. Any signed-in user may read it; the Actor parameter is what requires one. */
    @GetMapping("/api/v1/subjects")
    List<SubjectView> subjects(Actor actor) {
        return subjects.all().stream().map(s -> new SubjectView(s.code(), s.name())).toList();
    }
}
