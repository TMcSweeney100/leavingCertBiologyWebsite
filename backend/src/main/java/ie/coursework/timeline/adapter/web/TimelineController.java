package ie.coursework.timeline.adapter.web;

import ie.coursework.identity.domain.Actor;
import ie.coursework.timeline.application.TimelineService;
import ie.coursework.timeline.application.TimelineViews.Timeline;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TimelineController {

    private final TimelineService timeline;

    public TimelineController(TimelineService timeline) {
        this.timeline = timeline;
    }

    @GetMapping("/api/v1/me/timeline")
    Timeline timeline(Actor actor,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return timeline.timeline(actor, from, to);
    }
}
