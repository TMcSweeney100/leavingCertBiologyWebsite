package ie.coursework.timeline.adapter.web;

import ie.coursework.identity.domain.Actor;
import ie.coursework.timeline.application.TimelineService;
import ie.coursework.timeline.application.TimelineViews.PersonalItemView;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user's own items (design §6.8). There's no user id in any path. */
@RestController
@RequestMapping("/api/v1/me/personal-items")
public class PersonalItemController {

    private final TimelineService timeline;

    public PersonalItemController(TimelineService timeline) {
        this.timeline = timeline;
    }

    @GetMapping
    List<PersonalItemView> list(Actor actor) {
        return timeline.items(actor);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    PersonalItemView add(Actor actor, @Valid @RequestBody PersonalItemRequest body) {
        return timeline.add(actor, body.title(), body.dueDate(), body.kind(), body.classId());
    }

    @PatchMapping("/{itemId}")
    PersonalItemView edit(Actor actor, @PathVariable UUID itemId, @Valid @RequestBody PersonalItemRequest body) {
        return timeline.edit(actor, itemId, body.title(), body.dueDate(), body.kind(), body.classId());
    }

    @DeleteMapping("/{itemId}")
    ResponseEntity<Void> delete(Actor actor, @PathVariable UUID itemId) {
        timeline.delete(actor, itemId);
        return ResponseEntity.noContent().build();
    }
}
