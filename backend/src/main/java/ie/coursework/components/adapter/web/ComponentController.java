package ie.coursework.components.adapter.web;

import ie.coursework.components.application.ComponentService;
import ie.coursework.components.application.ComponentViews.BriefSummary;
import ie.coursework.components.application.ComponentViews.TeacherComponent;
import ie.coursework.identity.domain.Actor;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ComponentController {

    private final ComponentService components;

    public ComponentController(ComponentService components) {
        this.components = components;
    }

    @GetMapping("/briefs")
    List<BriefSummary> briefs(Actor actor, @RequestParam String subjectCode, @RequestParam(required = false) Integer examYear) {
        return components.briefs(actor, subjectCode, examYear);
    }

    @PostMapping("/classes/{classId}/components")
    @ResponseStatus(HttpStatus.CREATED)
    TeacherComponent create(Actor actor, @PathVariable UUID classId, @Valid @RequestBody CreateComponentRequest body) {
        return components.create(actor, classId, body.briefId());
    }

    /**
     * Role-shaped. Declared {@code Object} on purpose: with the interface as the declared type, Jackson would
     * write only the interface's properties instead of the runtime record's.
     */
    @GetMapping("/components/{componentId}")
    Object view(Actor actor, @PathVariable UUID componentId) {
        return components.view(actor, componentId);
    }

    @PutMapping("/components/{componentId}/stage-dates")
    TeacherComponent setStageDates(Actor actor, @PathVariable UUID componentId, @Valid @RequestBody StageDatesRequest body) {
        return components.setStageDates(actor, componentId, body.dates());
    }
}
