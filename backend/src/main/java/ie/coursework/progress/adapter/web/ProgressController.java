package ie.coursework.progress.adapter.web;

import ie.coursework.identity.domain.Actor;
import ie.coursework.progress.application.ProgressService;
import ie.coursework.progress.application.ProgressViews.Grid;
import ie.coursework.progress.application.ProgressViews.StudentCheckpoints;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The teacher's progress grid and sign-offs (roadmap §7 Phase 4, plan P4-6 and P4-10). */
@RestController
@RequestMapping("/api/v1/components/{componentId}")
public class ProgressController {

    private final ProgressService progress;

    public ProgressController(ProgressService progress) {
        this.progress = progress;
    }

    @GetMapping("/progress")
    Grid grid(Actor actor, @PathVariable UUID componentId) {
        return progress.grid(actor, componentId);
    }

    @GetMapping("/students/{studentId}/checkpoints")
    StudentCheckpoints student(Actor actor, @PathVariable UUID componentId, @PathVariable UUID studentId) {
        return progress.student(actor, componentId, studentId);
    }
}
