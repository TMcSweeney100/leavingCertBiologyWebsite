package ie.coursework.classes.adapter.web;

import ie.coursework.classes.application.ClassService;
import ie.coursework.classes.application.ClassViews.ClassDetail;
import ie.coursework.classes.application.ClassViews.ClassSummary;
import ie.coursework.classes.application.ClassViews.JoinCodeView;
import ie.coursework.identity.domain.Actor;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/classes")
public class ClassController {

    private final ClassService classes;

    public ClassController(ClassService classes) {
        this.classes = classes;
    }

    @GetMapping
    List<ClassSummary> list(Actor actor) {
        return classes.listOwned(actor);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ClassDetail create(Actor actor, @Valid @RequestBody CreateClassRequest body) {
        return classes.create(actor, body.schoolId(), body.subjectCode(), body.name(), body.yearGroup(),
                body.academicYear(), body.level());
    }

    @GetMapping("/{classId}")
    ClassDetail detail(Actor actor, @PathVariable UUID classId) {
        return classes.detail(actor, classId);
    }

    @PostMapping("/{classId}/join-code")
    JoinCodeView rotateJoinCode(Actor actor, @PathVariable UUID classId) {
        return classes.rotateJoinCode(actor, classId);
    }

    @DeleteMapping("/{classId}/join-code")
    ResponseEntity<Void> disableJoinCode(Actor actor, @PathVariable UUID classId) {
        classes.disableJoinCode(actor, classId);
        return ResponseEntity.noContent().build();
    }
}
