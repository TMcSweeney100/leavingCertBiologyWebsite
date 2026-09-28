package ie.coursework.log.adapter.web;

import ie.coursework.identity.domain.Actor;
import ie.coursework.log.application.LogService;
import ie.coursework.log.application.TeacherLogViews.TeacherStudentLog;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The teacher's reading view of one student's log (design §6.6, roadmap §8.3 3C). */
@RestController
@RequestMapping("/api/v1/components/{componentId}/students/{studentId}/log")
public class TeacherLogController {

    private final LogService log;

    public TeacherLogController(LogService log) {
        this.log = log;
    }

    /** Declared as the concrete record: each entry then serialises by its own runtime type (ARCHITECTURE §10). */
    @GetMapping
    TeacherStudentLog read(Actor actor, @PathVariable UUID componentId, @PathVariable UUID studentId) {
        return log.teacherView(actor, componentId, studentId);
    }
}
