package ie.coursework.log.application;

import ie.coursework.components.adapter.persistence.ComponentRepository;
import ie.coursework.identity.domain.Actor;
import ie.coursework.log.adapter.persistence.LogRepository;
import ie.coursework.log.application.LogViews.RevisionView;
import ie.coursework.log.application.LogViews.StudentEntry;
import ie.coursework.log.application.LogViews.StudentEntryDetail;
import ie.coursework.log.domain.EntryFields;
import ie.coursework.log.domain.AiUseFields;
import ie.coursework.log.domain.EntryKind;
import ie.coursework.log.domain.SourceFields;
import ie.coursework.log.domain.LogContent;
import ie.coursework.log.domain.LogEntry;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import ie.coursework.shared.error.FieldError;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * The student's own log (design §6.6, §8.5). Every call is scoped to an approved student of the component's
 * class; an entry id is only looked up with its owner (LogRepository.findOwn). Anything else is 404.
 */
@Service
public class LogService {

    private final LogRepository log;
    private final ComponentRepository components;
    private final ObjectMapper json;
    private final Clock clock;

    public LogService(LogRepository log, ComponentRepository components, ObjectMapper json, Clock clock) {
        this.log = log;
        this.components = components;
        this.json = json;
        this.clock = clock;
    }

    public List<StudentEntry> list(Actor actor, UUID componentId) {
        approved(actor, componentId);
        return log.list(componentId, actor.userId()).stream().map(LogService::view).toList();
    }

    /** New entries are visible unless the student chose otherwise (FR-24b, plan P3-13). */
    @Transactional
    public StudentEntryDetail create(Actor actor, UUID componentId, EntryKind kind, String body, JsonNode fieldsJson, Boolean visible) {
        approved(actor, componentId);
        EntryFields fields = fields(kind, fieldsJson);
        check(kind, body, fields);
        UUID id = log.create(componentId, actor.userId(), kind, visible == null || visible, clean(body), fields, clock.instant());
        return detail(actor, id);
    }

    public StudentEntryDetail detail(Actor actor, UUID entryId) {
        LogEntry entry = own(actor, entryId);
        return new StudentEntryDetail(view(entry), log.revisions(entryId).stream()
                .map(r -> new RevisionView(r.number(), r.body(), r.fields(), r.createdAt())).toList());
    }

    /** An edit is a new revision; the kind never changes (design §6.6). */
    @Transactional
    public StudentEntryDetail revise(Actor actor, UUID entryId, String body, JsonNode fieldsJson) {
        LogEntry entry = own(actor, entryId);
        EntryFields fields = fields(entry.kind(), fieldsJson);
        check(entry.kind(), body, fields);
        log.addRevision(entryId, clean(body), fields, clock.instant());
        return detail(actor, entryId);
    }

    /** One tap (FR-24c). Recorded in log_visibility_change only when it changes something. */
    @Transactional
    public StudentEntry setVisibility(Actor actor, UUID entryId, boolean visible) {
        own(actor, entryId);
        log.setVisibility(entryId, visible, clock.instant());
        return view(own(actor, entryId));
    }

    private void approved(Actor actor, UUID componentId) {
        components.findForApprovedStudent(componentId, actor.userId()).orElseThrow(LogService::notFound);
    }

    private LogEntry own(Actor actor, UUID entryId) {
        return log.findOwn(entryId, actor.userId()).orElseThrow(LogService::notFound);
    }

    private EntryFields fields(EntryKind kind, JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (kind.fieldsType() == null) {
            throw invalid(List.of(new FieldError("fields", "a note has no fields")));
        }
        try {
            return stripLinks(json.treeToValue(node, kind.fieldsType()));
        } catch (JacksonException e) {
            throw invalid(List.of(new FieldError("fields", "these details aren't in the right shape")));
        }
    }

    /** LogContent validates the stripped link, so the stripped link is what gets stored (blank becomes null). */
    private static EntryFields stripLinks(EntryFields fields) {
        return switch (fields) {
            case SourceFields s -> new SourceFields(s.type(), s.title(), s.author(), s.publication(), s.datePublished(),
                    link(s.url()), s.dateAccessed(), s.locator(), s.keyInformation(), s.relevance(), s.reflections());
            case AiUseFields a -> new AiUseFields(a.toolNameAndVersion(), a.developer(), a.dateGenerated(), a.howUsed(),
                    a.prompts(), link(a.shareUrl()));
            default -> fields;
        };
    }

    private static String link(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static void check(EntryKind kind, String body, EntryFields fields) {
        List<FieldError> problems = LogContent.problems(kind, body, fields);
        if (!problems.isEmpty()) {
            throw invalid(problems);
        }
    }

    private static String clean(String body) {
        return body == null || body.isBlank() ? null : body;
    }

    static StudentEntry view(LogEntry e) {
        return new StudentEntry(e.id(), e.componentId(), e.kind(), e.createdAt(), e.editedAt(), e.revisionCount(),
                e.visibleToTeacher(), e.body(), e.fields());
    }

    private static DomainException invalid(List<FieldError> problems) {
        return new DomainException(ErrorCode.VALIDATION_FAILED, "Check the highlighted details.", problems);
    }

    static DomainException notFound() {
        return new DomainException(ErrorCode.NOT_FOUND, "No such log entry.");
    }
}
