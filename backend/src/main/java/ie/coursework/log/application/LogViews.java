package ie.coursework.log.application;

import ie.coursework.log.domain.EntryFields;
import ie.coursework.log.domain.EntryKind;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** What the student's log API returns. Mirrored field for field by frontend/lib/api/schemas.ts. */
public final class LogViews {

    private LogViews() {}

    public record StudentEntry(UUID id, UUID componentId, EntryKind kind, Instant createdAt, Instant editedAt,
            int revisionCount, boolean visibleToTeacher, String body, EntryFields fields) {}

    public record RevisionView(int number, String body, EntryFields fields, Instant createdAt) {}

    public record StudentEntryDetail(StudentEntry entry, List<RevisionView> history) {}
}
