package ie.coursework.progress.application;

import ie.coursework.classes.adapter.persistence.ClassGroupRepository;
import ie.coursework.classes.adapter.persistence.EnrolmentRepository;
import ie.coursework.classes.adapter.persistence.EnrolmentRepository.Member;
import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.components.adapter.persistence.BriefRepository;
import ie.coursework.components.adapter.persistence.ComponentRepository;
import ie.coursework.components.adapter.persistence.SignoffRepository;
import ie.coursework.components.adapter.persistence.TemplateRepository;
import ie.coursework.components.application.ComponentService;
import ie.coursework.components.domain.Brief;
import ie.coursework.components.domain.CheckpointState;
import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.components.domain.DublinDate;
import ie.coursework.components.domain.Signoff;
import ie.coursework.components.domain.TemplateCheckpoint;
import ie.coursework.identity.domain.Actor;
import ie.coursework.log.adapter.persistence.LogRepository;
import ie.coursework.progress.application.ProgressViews.Cell;
import ie.coursework.progress.application.ProgressViews.CheckpointRef;
import ie.coursework.progress.application.ProgressViews.Grid;
import ie.coursework.progress.application.ProgressViews.GridStage;
import ie.coursework.progress.application.ProgressViews.GridStudent;
import ie.coursework.progress.domain.Standing;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * The teacher's progress grid and sign-offs (roadmap §8.4). Every call starts with ComponentService.requireOwned;
 * a student must be APPROVED in that class and a checkpoint must belong to the brief's template version. Anything
 * else is 404 (design §9). Built from a fixed number of queries whatever the class size (Gate P4's timing).
 */
@Service
public class ProgressService {

    private final ComponentService componentService;
    private final ComponentRepository components;
    private final BriefRepository briefs;
    private final TemplateRepository templates;
    private final ClassGroupRepository classGroups;
    private final EnrolmentRepository enrolments;
    private final SignoffRepository signoffs;
    private final LogRepository log;
    private final Clock clock;

    public ProgressService(ComponentService componentService, ComponentRepository components, BriefRepository briefs,
            TemplateRepository templates, ClassGroupRepository classGroups, EnrolmentRepository enrolments,
            SignoffRepository signoffs, LogRepository log, Clock clock) {
        this.componentService = componentService;
        this.components = components;
        this.briefs = briefs;
        this.templates = templates;
        this.classGroups = classGroups;
        this.enrolments = enrolments;
        this.signoffs = signoffs;
        this.log = log;
        this.clock = clock;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Grid grid(Actor actor, UUID componentId) {
        ComponentInstance component = componentService.requireOwned(actor, componentId);
        LocalDate today = DublinDate.today(clock);
        List<GridStage> stages = stages(component);
        Map<String, Instant> live = signoffs.live(component.id()).stream()
                .collect(Collectors.toMap(s -> key(s.studentId(), s.checkpointId()), Signoff::signedOffAt));
        Map<UUID, Instant> activity = log.lastActivity(component.id());

        List<GridStudent> students = approved(component).stream().map(m -> {
            List<Cell> cells = stages.stream().filter(s -> s.checkpoint() != null)
                    .map(s -> cell(s, live.get(key(m.studentId(), s.checkpoint().id())), today)).toList();
            Instant last = activity.get(m.studentId());
            return new GridStudent(m.studentId(), m.firstName(), m.lastName(),
                    Standing.behindBy(cells.stream().map(Cell::state).toList()),
                    last == null ? null : DublinDate.of(last), Standing.daysSince(last, today), cells);
        }).sorted(Comparator.comparing(ProgressService::standing, Standing.ORDER)).toList();

        return new Grid(component.id(), component.classId(), classGroups.findById(component.classId()).orElseThrow().name(),
                today, stages, students);
    }

    List<GridStage> stages(ComponentInstance component) {
        Brief brief = briefs.findPublished(component.briefId()).orElseThrow(() -> new IllegalStateException("brief missing"));
        Map<UUID, LocalDate> dates = components.stageDates(component.id());
        Map<UUID, TemplateCheckpoint> checkpoints = templates.checkpoints(brief.versionId()).stream()
                .collect(Collectors.toMap(TemplateCheckpoint::stageId, Function.identity(), (first, later) -> first));
        return templates.stages(brief.versionId()).stream().map(s -> {
            TemplateCheckpoint c = checkpoints.get(s.id());
            return new GridStage(s.id(), s.ordinal(), s.label(), s.name(), dates.get(s.id()),
                    c == null ? null : new CheckpointRef(c.id(), c.text()));
        }).toList();
    }

    List<Member> approved(ComponentInstance component) {
        return enrolments.membersOf(component.classId()).stream().filter(m -> m.status() == EnrolmentStatus.APPROVED).toList();
    }

    static Cell cell(GridStage stage, Instant signedOffAt, LocalDate today) {
        return new Cell(stage.checkpoint().id(), CheckpointState.at(stage.dueDate(), today, signedOffAt != null),
                signedOffAt == null ? null : DublinDate.of(signedOffAt));
    }

    private static Standing standing(GridStudent s) {
        return new Standing(s.behindBy(), s.daysSinceLastLogActivity(), s.lastName(), s.firstName());
    }

    private static String key(UUID studentId, UUID checkpointId) {
        return studentId + "/" + checkpointId;
    }

    static DomainException notFound() {
        return new DomainException(ErrorCode.NOT_FOUND, "No such student or checkpoint.");
    }
}
