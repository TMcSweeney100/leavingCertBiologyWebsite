package ie.coursework.log.application;

import ie.coursework.log.application.LogViews.RevisionView;
import ie.coursework.log.application.TeacherLogViews.HiddenEntry;
import ie.coursework.log.application.TeacherLogViews.TeacherEntry;
import ie.coursework.log.application.TeacherLogViews.VisibleEntry;
import ie.coursework.log.domain.LogEntry;
import ie.coursework.log.domain.LogRevision;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Design §6.6: the teacher's view is enforced in one projection, and this is it. Metadata for every entry;
 * body, fields and history only where visible_to_teacher is true. Nothing else builds a teacher's log view.
 */
public final class TeacherLogProjection {

    private TeacherLogProjection() {}

    public static List<TeacherEntry> project(List<LogEntry> entries, Map<UUID, Instant> hiddenAt,
            Map<UUID, List<LogRevision>> visibleHistory) {
        return entries.stream().map(e -> e.visibleToTeacher()
                ? (TeacherEntry) new VisibleEntry("VISIBLE", e.id(), e.kind(), e.createdAt(), e.editedAt(), e.revisionCount(),
                        e.body(), e.fields(), visibleHistory.getOrDefault(e.id(), List.of()).stream()
                                .map(r -> new RevisionView(r.number(), r.body(), r.fields(), r.createdAt())).toList())
                : new HiddenEntry("HIDDEN", e.id(), e.kind(), e.createdAt(), e.editedAt(), e.revisionCount(), hiddenAt.get(e.id())))
                .toList();
    }
}
