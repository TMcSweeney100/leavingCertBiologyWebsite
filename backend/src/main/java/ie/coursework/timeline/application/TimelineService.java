package ie.coursework.timeline.application;

import ie.coursework.classes.adapter.persistence.EnrolmentRepository;
import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.identity.domain.Actor;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import ie.coursework.shared.error.FieldError;
import ie.coursework.timeline.adapter.persistence.PersonalItemRepository;
import ie.coursework.timeline.adapter.persistence.TimelineRepository;
import ie.coursework.timeline.application.TimelineViews.PersonalItemView;
import ie.coursework.timeline.application.TimelineViews.Timeline;
import ie.coursework.timeline.application.TimelineViews.TimelineItem;
import ie.coursework.timeline.domain.PersonalItem;
import ie.coursework.timeline.domain.PersonalItemKind;
import ie.coursework.timeline.domain.TimelineRange;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Everything here acts on the signed-in user's own rows. There is no user id parameter to get wrong. */
@Service
public class TimelineService {

    private final TimelineRepository timeline;
    private final PersonalItemRepository personal;
    private final EnrolmentRepository enrolments;
    private final Clock clock;

    public TimelineService(TimelineRepository timeline, PersonalItemRepository personal, EnrolmentRepository enrolments, Clock clock) {
        this.timeline = timeline;
        this.personal = personal;
        this.enrolments = enrolments;
        this.clock = clock;
    }

    public Timeline timeline(Actor actor, LocalDate from, LocalDate to) {
        TimelineRange.problem(from, to).ifPresent(message -> {
            throw new DomainException(ErrorCode.VALIDATION_FAILED, "That date range isn't allowed.", List.of(new FieldError("to", message)));
        });
        return new Timeline(from, to, timeline.between(actor.userId(), from, to).stream()
                .map(e -> new TimelineItem(e.kind(), e.date(), e.title(), e.stageLabel(), e.subjectCode(), e.subjectName(),
                        e.classId(), e.className(), e.componentId(), e.personalItemId(), e.personalKind()))
                .toList());
    }

    public List<PersonalItemView> items(Actor actor) {
        return personal.list(actor.userId()).stream().map(TimelineService::view).toList();
    }

    @Transactional
    public PersonalItemView add(Actor actor, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId) {
        checkClass(actor, classId);
        UUID id = personal.insert(actor.userId(), title, dueDate, kind, classId, clock.instant());
        return view(personal.find(id, actor.userId()).orElseThrow());
    }

    /**
     * checkClass only re-runs when classId actually changes: an item labelled before the student left that
     * class (P2-43) must stay editable, not be re-gated by enrolment status on every unrelated edit.
     */
    @Transactional
    public PersonalItemView edit(Actor actor, UUID itemId, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId) {
        PersonalItem existing = personal.find(itemId, actor.userId()).orElseThrow(TimelineService::notFound);
        if (!Objects.equals(existing.classId(), classId)) {
            checkClass(actor, classId);
        }
        if (!personal.update(itemId, actor.userId(), title, dueDate, kind, classId, clock.instant())) {
            throw notFound();
        }
        return view(personal.find(itemId, actor.userId()).orElseThrow());
    }

    @Transactional
    public void delete(Actor actor, UUID itemId) {
        if (!personal.delete(itemId, actor.userId())) {
            throw notFound();
        }
    }

    /** Plan 2F P2-43: a label, so only a class the student has joined; anything else is 404. */
    private void checkClass(Actor actor, UUID classId) {
        if (classId == null) {
            return;
        }
        boolean joined = enrolments.findByStudent(classId, actor.userId())
                .filter(e -> e.status() != EnrolmentStatus.REMOVED)
                .isPresent();
        if (!joined) {
            throw new DomainException(ErrorCode.NOT_FOUND, "No such class.");
        }
    }

    private static PersonalItemView view(PersonalItem item) {
        return new PersonalItemView(item.id(), item.title(), item.dueDate(), item.kind(), item.classId(), item.subjectName());
    }

    private static DomainException notFound() {
        return new DomainException(ErrorCode.NOT_FOUND, "No such item.");
    }
}
