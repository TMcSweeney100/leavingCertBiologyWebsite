package ie.coursework.components.application;

import ie.coursework.classes.adapter.persistence.ClassGroupRepository;
import ie.coursework.classes.adapter.persistence.SubjectRepository;
import ie.coursework.classes.application.ClassService;
import ie.coursework.classes.domain.ClassGroup;
import ie.coursework.components.adapter.persistence.BriefRepository;
import ie.coursework.components.adapter.persistence.ComponentRepository;
import ie.coursework.components.adapter.persistence.ItemTickRepository;
import ie.coursework.components.adapter.persistence.TeacherItemRepository;
import ie.coursework.components.adapter.persistence.TemplateRepository;
import ie.coursework.components.application.ComponentViews.BriefDetail;
import ie.coursework.components.application.ComponentViews.BriefSummary;
import ie.coursework.components.application.ComponentViews.CheckpointView;
import ie.coursework.components.application.ComponentViews.ComponentView;
import ie.coursework.components.application.ComponentViews.DateWarning;
import ie.coursework.components.application.ComponentViews.MarkBandView;
import ie.coursework.components.application.ComponentViews.MyComponent;
import ie.coursework.components.application.ComponentViews.PromptView;
import ie.coursework.components.application.ComponentViews.RuleView;
import ie.coursework.components.application.ComponentViews.SectionView;
import ie.coursework.components.application.ComponentViews.SetupStage;
import ie.coursework.components.application.ComponentViews.StudentComponent;
import ie.coursework.components.application.ComponentViews.StudentItem;
import ie.coursework.components.application.ComponentViews.StudentStage;
import ie.coursework.components.application.ComponentViews.TeacherComponent;
import ie.coursework.components.application.ComponentViews.TeacherItemView;
import ie.coursework.components.application.ComponentViews.WarningCode;
import ie.coursework.components.domain.Brief;
import ie.coursework.components.domain.BriefDetails;
import ie.coursework.components.domain.CompletionDates;
import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.components.domain.DatedStage;
import ie.coursework.components.domain.CheckpointState;
import ie.coursework.components.domain.DublinDate;
import ie.coursework.components.domain.StageOrder;
import ie.coursework.components.domain.TeacherItem;
import ie.coursework.components.domain.TemplateCheckpoint;
import ie.coursework.components.domain.TemplatePrompt;
import ie.coursework.components.domain.TemplateStage;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.Role;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import ie.coursework.shared.error.FieldError;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Setting up a class's component (design §8.2). Every method checks scope first and answers 404 otherwise. */
@Service
public class ComponentService {

    /** A component the acting teacher owns, with its class and brief. */
    record Owned(ComponentInstance component, ClassGroup group, Brief brief) {}

    private final ClassService classes;
    private final ClassGroupRepository classGroups;
    private final SubjectRepository subjects;
    private final BriefRepository briefs;
    private final TemplateRepository templates;
    private final ComponentRepository components;
    private final TeacherItemRepository items;
    private final ItemTickRepository ticks;
    private final Clock clock;

    public ComponentService(ClassService classes, ClassGroupRepository classGroups, SubjectRepository subjects,
            BriefRepository briefs, TemplateRepository templates, ComponentRepository components,
            TeacherItemRepository items, ItemTickRepository ticks, Clock clock) {
        this.classes = classes;
        this.classGroups = classGroups;
        this.subjects = subjects;
        this.briefs = briefs;
        this.templates = templates;
        this.components = components;
        this.items = items;
        this.ticks = ticks;
        this.clock = clock;
    }

    /** Briefs are published SEC content: any signed-in user may list them. */
    public List<BriefSummary> briefs(Actor actor, String subjectCode, Integer examYear) {
        return briefs.published(subjectCode, examYear).stream().map(ComponentService::summary).toList();
    }

    @Transactional
    public TeacherComponent create(Actor actor, UUID classId, UUID briefId) {
        ClassGroup group = classes.owned(actor, classId);
        Brief brief = briefs.findPublished(briefId)
                .filter(b -> b.subjectId().equals(group.subjectId()))
                .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "No such brief for this class's subject."));
        if (components.idForClass(classId).isPresent()) {
            throw alreadyExists();
        }
        UUID id;
        try {
            id = components.insert(classId, brief.id(), actor.userId());
        } catch (DuplicateKeyException e) {
            throw alreadyExists();
        }
        return teacherView(owned(actor, id));
    }

    /** Role-shaped (plan 2D P2-28): the class's teacher gets setup, an approved student their page, anyone else 404. */
    public ComponentView view(Actor actor, UUID componentId) {
        if (actor.holds(Role.TEACHER) && components.findOwned(componentId, actor.userId()).isPresent()) {
            return teacherView(owned(actor, componentId));
        }
        ComponentInstance component = components.findForApprovedStudent(componentId, actor.userId())
                .orElseThrow(ComponentService::notFound);
        return studentView(actor, component);
    }

    /** A student's actor holds no TEACHER role at the class's school, so {@code classes.owned} can't be used here;
     *  reading the class by id directly is safe only because {@code findForApprovedStudent} already scoped it. */
    StudentComponent studentView(Actor actor, ComponentInstance component) {
        Brief brief = briefs.findPublished(component.briefId()).orElseThrow(() -> new IllegalStateException("brief missing"));
        ClassGroup group = classGroups.findById(component.classId()).orElseThrow();
        LocalDate today = DublinDate.today(clock);
        Map<UUID, LocalDate> dates = components.stageDates(component.id());
        Map<UUID, String> checkpoints = templates.checkpoints(brief.versionId()).stream()
                .collect(Collectors.toMap(TemplateCheckpoint::stageId, TemplateCheckpoint::text, (first, later) -> first));
        Map<UUID, List<PromptView>> prompts = templates.prompts(brief.versionId()).stream()
                .collect(Collectors.groupingBy(TemplatePrompt::stageId, LinkedHashMap::new,
                        Collectors.mapping(p -> new PromptView(p.heading(), p.text()), Collectors.toList())));
        Set<UUID> done = ticks.doneItems(component.id(), actor.userId());
        Map<UUID, List<StudentItem>> items = this.items.active(component.id()).stream()
                .collect(Collectors.groupingBy(TeacherItem::stageId,
                        Collectors.mapping(i -> new StudentItem(i.id(), i.text(), i.dueDate(), done.contains(i.id())), Collectors.toList())));

        List<StudentStage> stages = templates.stages(brief.versionId()).stream().map(s -> {
            LocalDate due = dates.get(s.id());
            String checkpoint = checkpoints.get(s.id());
            return new StudentStage(s.id(), s.ordinal(), s.label(), s.name(), s.description(), s.hoursMin(), s.hoursMax(),
                    s.hoursGroup(), s.supervised(), due,
                    checkpoint == null ? null : new CheckpointView(checkpoint, CheckpointState.at(due, today)),
                    items.getOrDefault(s.id(), List.of()), prompts.getOrDefault(s.id(), List.of()));
        }).toList();

        BriefDetails details = briefs.details(brief.id());
        BriefDetail detail = new BriefDetail(brief.examYear(), brief.secCode(), brief.title(), brief.topicTitle(),
                details.topicBody(), brief.completionDate(), details.wordLimit(), details.wordsNotCounted(),
                details.imageLimit(), details.imageNote(),
                briefs.rules(brief.id()).stream().map(r -> new RuleView(r.key(), r.value())).toList());

        return new StudentComponent("STUDENT", component.id(), group.name(), brief.subjectCode(),
                subjects.findById(group.subjectId()).orElseThrow().name(), brief.weightingPercent(), brief.marksTotal(),
                detail, templates.processNote(brief.versionId()), today, stages,
                templates.sections(brief.versionId()).stream()
                        .map(x -> new SectionView(x.label(), x.name(), x.suggestedWords(), x.indicativeContent(), x.stageIds())).toList(),
                templates.bands(brief.versionId()).stream()
                        .map(b -> new MarkBandView(b.label(), b.name(), b.marks(), b.wholeReport(), b.criteria(), b.sectionLabels())).toList());
    }

    /** Replaces the class's stage dates (plan 2D P2-24, P2-25). */
    @Transactional
    public TeacherComponent setStageDates(Actor actor, UUID componentId, List<StageDateInput> input) {
        Owned owned = owned(actor, componentId);
        LocalDate completion = owned.brief().completionDate();
        Map<UUID, TemplateStage> stages = templates.stages(owned.brief().versionId()).stream()
                .collect(Collectors.toMap(TemplateStage::id, Function.identity()));

        Map<UUID, LocalDate> dates = new LinkedHashMap<>();
        List<FieldError> late = new ArrayList<>();
        for (StageDateInput in : input) {
            TemplateStage stage = stages.get(in.stageId());
            if (stage == null) {
                throw new DomainException(ErrorCode.VALIDATION_FAILED, "That stage isn't part of this component.",
                        List.of(new FieldError(String.valueOf(in.stageId()), "not a stage of this component")));
            }
            if (in.dueDate() == null) {
                continue;
            }
            if (!CompletionDates.allows(in.dueDate(), completion)) {
                late.add(new FieldError(stage.id().toString(), CompletionDates.refusal(stage.displayLabel(), completion)));
            }
            dates.put(stage.id(), in.dueDate());
        }
        if (!late.isEmpty()) {
            String detail = late.size() == 1 ? late.getFirst().message() : CompletionDates.refusals(late.size(), completion);
            throw new DomainException(ErrorCode.COMPLETION_DATE_EXCEEDED, detail, late);
        }
        components.replaceStageDates(componentId, dates, clock.instant());
        return teacherView(owned);
    }

    @Transactional
    public TeacherItemView addItem(Actor actor, UUID componentId, UUID stageId, String text, LocalDate dueDate) {
        Owned owned = owned(actor, componentId);
        boolean inVersion = templates.stages(owned.brief().versionId()).stream().anyMatch(s -> s.id().equals(stageId));
        if (!inVersion) {
            throw new DomainException(ErrorCode.VALIDATION_FAILED, "That stage isn't part of this component.",
                    List.of(new FieldError("stageId", "not a stage of this component")));
        }
        checkItemDate(dueDate, owned.brief().completionDate());
        TeacherItem item = items.add(componentId, stageId, text, dueDate, clock.instant());
        return new TeacherItemView(item.id(), item.text(), item.dueDate());
    }

    @Transactional
    public TeacherItemView editItem(Actor actor, UUID componentId, UUID itemId, String text, LocalDate dueDate) {
        Owned owned = owned(actor, componentId);
        items.findActive(itemId, componentId).orElseThrow(ComponentService::itemNotFound);
        checkItemDate(dueDate, owned.brief().completionDate());
        items.update(itemId, text, dueDate, clock.instant());
        return new TeacherItemView(itemId, text.strip(), dueDate);
    }

    /** Retired items disappear for students; the row stays (design §6.4). */
    @Transactional
    public void retireItem(Actor actor, UUID componentId, UUID itemId) {
        owned(actor, componentId);
        items.findActive(itemId, componentId).orElseThrow(ComponentService::itemNotFound);
        items.retire(itemId, clock.instant());
    }

    /** Self-reported (plan 2E P2-37). Only an approved student of the class, only on an active item. */
    @Transactional
    public StudentItem tick(Actor actor, UUID componentId, UUID itemId, boolean done) {
        ComponentInstance component = components.findForApprovedStudent(componentId, actor.userId())
                .orElseThrow(ComponentService::notFound);
        TeacherItem item = items.findActive(itemId, component.id()).orElseThrow(ComponentService::itemNotFound);
        ticks.set(component.id(), actor.userId(), item.id(), done, clock.instant());
        return new StudentItem(item.id(), item.text(), item.dueDate(), done);
    }

    public List<MyComponent> myComponents(Actor actor) {
        return components.forStudent(actor.userId()).stream()
                .map(c -> new MyComponent(c.componentId(), c.className(), c.subjectCode(), c.subjectName(), c.briefTitle(), c.completionDate()))
                .toList();
    }

    private static void checkItemDate(LocalDate dueDate, LocalDate completion) {
        if (dueDate != null && !CompletionDates.allows(dueDate, completion)) {
            String message = CompletionDates.refusal("That date", completion);
            throw new DomainException(ErrorCode.COMPLETION_DATE_EXCEEDED, message, List.of(new FieldError("dueDate", message)));
        }
    }

    private static DomainException itemNotFound() {
        return new DomainException(ErrorCode.NOT_FOUND, "No such item.");
    }

    Owned owned(Actor actor, UUID componentId) {
        if (!actor.holds(Role.TEACHER)) {
            throw notFound();
        }
        ComponentInstance component = components.findOwned(componentId, actor.userId()).orElseThrow(ComponentService::notFound);
        ClassGroup group = classes.owned(actor, component.classId());
        Brief brief = briefs.findPublished(component.briefId()).orElseThrow(() -> new IllegalStateException("brief missing"));
        return new Owned(component, group, brief);
    }

    TeacherComponent teacherView(Owned owned) {
        Brief brief = owned.brief();
        List<TemplateStage> stages = templates.stages(brief.versionId());
        Map<UUID, String> checkpoints = templates.checkpointTextByStage(brief.versionId());
        Map<UUID, LocalDate> dates = components.stageDates(owned.component().id());
        Map<UUID, List<TeacherItemView>> itemsByStage = items.active(owned.component().id()).stream()
                .collect(Collectors.groupingBy(TeacherItem::stageId,
                        Collectors.mapping(i -> new TeacherItemView(i.id(), i.text(), i.dueDate()), Collectors.toList())));

        List<SetupStage> setup = stages.stream().map(s -> new SetupStage(s.id(), s.ordinal(), s.label(), s.name(),
                s.hoursMin(), s.hoursMax(), s.hoursGroup(), s.supervised(), checkpoints.get(s.id()), dates.get(s.id()),
                itemsByStage.getOrDefault(s.id(), List.of()))).toList();

        return new TeacherComponent("TEACHER", owned.component().id(), owned.group().id(), owned.group().name(),
                brief.subjectCode(), subjects.findById(owned.group().subjectId()).orElseThrow().name(),
                summary(brief), setup, warnings(setup, brief.completionDate()));
    }

    private static List<DateWarning> warnings(List<SetupStage> stages, LocalDate completion) {
        Stream<DateWarning> outOfOrder = StageOrder.outOfOrder(
                        stages.stream().map(s -> new DatedStage(s.id(), s.ordinal(), s.dueDate())).toList())
                .stream().map(pair -> new DateWarning(WarningCode.OUT_OF_ORDER, pair, List.of()));

        List<UUID> lateStages = stages.stream()
                .filter(s -> s.dueDate() != null && !CompletionDates.allows(s.dueDate(), completion))
                .map(SetupStage::id).toList();
        List<UUID> lateItems = stages.stream().flatMap(s -> s.items().stream())
                .filter(i -> i.dueDate() != null && !CompletionDates.allows(i.dueDate(), completion))
                .map(TeacherItemView::id).toList();
        Stream<DateWarning> late = lateStages.isEmpty() && lateItems.isEmpty()
                ? Stream.empty()
                : Stream.of(new DateWarning(WarningCode.AFTER_COMPLETION_DATE, lateStages, lateItems));

        return Stream.concat(late, outOfOrder).toList();
    }

    static BriefSummary summary(Brief b) {
        return new BriefSummary(b.id(), b.subjectCode(), b.examYear(), b.secCode(), b.title(), b.topicTitle(), b.completionDate());
    }

    private static DomainException alreadyExists() {
        return new DomainException(ErrorCode.COMPONENT_ALREADY_EXISTS, "This class already has a component.");
    }

    static DomainException notFound() {
        return new DomainException(ErrorCode.NOT_FOUND, "No such component.");
    }
}
