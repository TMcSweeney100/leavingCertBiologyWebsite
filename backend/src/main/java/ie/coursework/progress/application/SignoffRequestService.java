package ie.coursework.progress.application;

import ie.coursework.audit.AuditEventType;
import ie.coursework.audit.AuditLog;
import ie.coursework.components.adapter.persistence.BriefRepository;
import ie.coursework.components.adapter.persistence.ComponentRepository;
import ie.coursework.components.adapter.persistence.DocumentLinkRepository;
import ie.coursework.components.adapter.persistence.SignoffRepository;
import ie.coursework.components.adapter.persistence.SignoffRequestRepository;
import ie.coursework.components.adapter.persistence.TemplateRepository;
import ie.coursework.components.application.ComponentViews.OpenRequestView;
import ie.coursework.components.domain.Brief;
import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.components.domain.DublinDate;
import ie.coursework.components.domain.SignoffRequest;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.Role;
import ie.coursework.progress.application.ProgressViews.WaitingCount;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The student's side of ready-for-signoff. Every call starts with findForApprovedStudent; the checkpoint must be in
 * the brief's template version. Anything else is 404 (design §9). The teacher's answer is ProgressService.answer.
 */
@Service
public class SignoffRequestService {

    private final ComponentRepository components;
    private final BriefRepository briefs;
    private final TemplateRepository templates;
    private final SignoffRepository signoffs;
    private final SignoffRequestRepository requests;
    private final DocumentLinkRepository links;
    private final AuditLog audit;
    private final Clock clock;

    public SignoffRequestService(ComponentRepository components, BriefRepository briefs, TemplateRepository templates,
            SignoffRepository signoffs, SignoffRequestRepository requests, DocumentLinkRepository links, AuditLog audit, Clock clock) {
        this.components = components;
        this.briefs = briefs;
        this.templates = templates;
        this.signoffs = signoffs;
        this.requests = requests;
        this.links = links;
        this.audit = audit;
        this.clock = clock;
    }

    /** Idempotent (R-13): an open request is returned as it is, with no new row and no audit event. */
    @Transactional
    public OpenRequestView ask(Actor actor, UUID componentId, UUID checkpointId, String note) {
        ComponentInstance component = scoped(actor, componentId, checkpointId);
        UUID student = actor.userId();
        boolean signedOff = signoffs.forStudent(component.id(), student).stream()
                .anyMatch(s -> s.live() && s.checkpointId().equals(checkpointId));
        if (signedOff) {
            throw new DomainException(ErrorCode.CHECKPOINT_ALREADY_SIGNED_OFF, "Your teacher has already signed this off.");
        }
        if (components.requiresLink(component.id()) && links.current(component.id(), student).isEmpty()) {
            throw new DomainException(ErrorCode.DOCUMENT_LINK_REQUIRED, "Your teacher asks for a link to your work first.");
        }
        Instant now = clock.instant();
        requests.ask(component.id(), student, checkpointId, blankToNull(note), now)
                .ifPresent(id -> audit.record(student, AuditEventType.SIGNOFF_REQUESTED, "signoff_request", id,
                        Map.of("componentId", component.id(), "checkpointId", checkpointId)));
        SignoffRequest open = requests.forStudent(component.id(), student).stream()
                .filter(r -> r.open() && r.checkpointId().equals(checkpointId)).findFirst().orElseThrow();
        return new OpenRequestView(DublinDate.of(open.askedAt()), open.studentNote());
    }

    @Transactional
    public void withdraw(Actor actor, UUID componentId, UUID checkpointId) {
        ComponentInstance component = scoped(actor, componentId, checkpointId);
        UUID id = requests.withdraw(component.id(), actor.userId(), checkpointId, clock.instant())
                .orElseThrow(() -> new DomainException(ErrorCode.SIGNOFF_REQUEST_NOT_OPEN, "Your teacher has already answered this."));
        audit.record(actor.userId(), AuditEventType.SIGNOFF_REQUEST_WITHDRAWN, "signoff_request", id,
                Map.of("componentId", component.id(), "checkpointId", checkpointId));
    }

    /** R-21: the badge on each class card at /teach. Only a teacher has classes; anyone else is 404, as for /classes. */
    @Transactional(readOnly = true)
    public List<WaitingCount> waiting(Actor actor) {
        if (!actor.holds(Role.TEACHER)) {
            throw ProgressService.notFound();
        }
        return requests.waitingByClass(actor.userId()).entrySet().stream()
                .map(e -> new WaitingCount(e.getKey(), e.getValue())).toList();
    }

    private ComponentInstance scoped(Actor actor, UUID componentId, UUID checkpointId) {
        ComponentInstance component = components.findForApprovedStudent(componentId, actor.userId())
                .orElseThrow(ProgressService::notFound);
        Brief brief = briefs.findPublished(component.briefId()).orElseThrow(() -> new IllegalStateException("brief missing"));
        templates.checkpointInVersion(checkpointId, brief.versionId()).orElseThrow(ProgressService::notFound);
        return component;
    }

    static String blankToNull(String note) {
        return note == null || note.isBlank() ? null : note.strip();
    }
}
