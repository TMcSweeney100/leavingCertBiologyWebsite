package ie.coursework.log.application;

import ie.coursework.log.application.LogViews.RevisionView;
import ie.coursework.log.domain.EntryFields;
import ie.coursework.log.domain.EntryKind;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** What a teacher gets for one student's log. Mirrored by teacherStudentLogSchema in frontend/lib/api/schemas.ts. */
public final class TeacherLogViews {

    private TeacherLogViews() {}

    public sealed interface TeacherEntry permits VisibleEntry, HiddenEntry {
        String visibility();
    }

    public record VisibleEntry(String visibility, UUID id, EntryKind kind, Instant createdAt, Instant editedAt,
            int revisionCount, String body, EntryFields fields, List<RevisionView> history) implements TeacherEntry {}

    /** No body, fields or history: not null, absent. Nothing added to a mapper can put them in the JSON. */
    public record HiddenEntry(String visibility, UUID id, EntryKind kind, Instant createdAt, Instant editedAt,
            int revisionCount, Instant hiddenAt) implements TeacherEntry {}

    public record TeacherStudentLog(UUID studentId, String firstName, String lastName, UUID componentId,
            List<TeacherEntry> entries) {}
}
