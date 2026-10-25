package ie.coursework.progress.adapter.web;

import ie.coursework.components.application.ComponentViews.OpenRequestView;
import ie.coursework.identity.domain.Actor;
import ie.coursework.progress.application.SignoffRequestService;
import jakarta.validation.Valid;
import ie.coursework.progress.application.ProgressViews.WaitingCount;
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

/** Ready-for-signoff: the student's request for a checkpoint (roadmap §7, backlog section). */
@RestController
@RequestMapping("/api/v1")
public class SignoffRequestController {

    private final SignoffRequestService requests;

    public SignoffRequestController(SignoffRequestService requests) {
        this.requests = requests;
    }

    @PostMapping("/components/{componentId}/checkpoints/{checkpointId}/request")
    @ResponseStatus(HttpStatus.CREATED)
    OpenRequestView ask(Actor actor, @PathVariable UUID componentId, @PathVariable UUID checkpointId,
            @Valid @RequestBody AskRequest body) {
        return requests.ask(actor, componentId, checkpointId, body.note());
    }

    /** Withdraws the open request. The row stays (V13); DELETE names the resource "my open request". */
    @DeleteMapping("/components/{componentId}/checkpoints/{checkpointId}/request")
    ResponseEntity<Void> withdraw(Actor actor, @PathVariable UUID componentId, @PathVariable UUID checkpointId) {
        requests.withdraw(actor, componentId, checkpointId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/signoff-requests/waiting")
    List<WaitingCount> waiting(Actor actor) {
        return requests.waiting(actor);
    }
}
