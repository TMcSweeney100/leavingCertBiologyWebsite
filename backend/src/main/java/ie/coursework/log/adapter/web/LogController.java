package ie.coursework.log.adapter.web;

import ie.coursework.identity.domain.Actor;
import ie.coursework.log.application.LogService;
import ie.coursework.log.application.LogViews.StudentEntry;
import ie.coursework.log.application.LogViews.StudentEntryDetail;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The student's own log (roadmap §7 Phase 3). The acting user is always the owner; no user id is in any path. */
@RestController
@RequestMapping("/api/v1")
public class LogController {

    private final LogService log;

    public LogController(LogService log) {
        this.log = log;
    }

    @GetMapping("/components/{componentId}/log")
    List<StudentEntry> list(Actor actor, @PathVariable UUID componentId) {
        return log.list(actor, componentId);
    }

    @PostMapping("/components/{componentId}/log")
    @ResponseStatus(HttpStatus.CREATED)
    StudentEntryDetail create(Actor actor, @PathVariable UUID componentId, @Valid @RequestBody LogEntryRequest body) {
        return log.create(actor, componentId, body.kind(), body.body(), body.fields(), body.visibleToTeacher());
    }

    @GetMapping("/log/{entryId}")
    StudentEntryDetail detail(Actor actor, @PathVariable UUID entryId) {
        return log.detail(actor, entryId);
    }

    @PostMapping("/log/{entryId}/revisions")
    @ResponseStatus(HttpStatus.CREATED)
    StudentEntryDetail revise(Actor actor, @PathVariable UUID entryId, @Valid @RequestBody RevisionRequest body) {
        return log.revise(actor, entryId, body.body(), body.fields());
    }

    @PutMapping("/log/{entryId}/visibility")
    StudentEntry visibility(Actor actor, @PathVariable UUID entryId, @Valid @RequestBody VisibilityRequest body) {
        return log.setVisibility(actor, entryId, body.visible());
    }
}
