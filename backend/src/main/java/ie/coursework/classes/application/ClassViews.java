package ie.coursework.classes.application;

import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.classes.domain.Level;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** What the API returns. Never the owner id, never a student's data outside their own class. */
public final class ClassViews {

    private ClassViews() {}

    public record JoinCodeView(String code, Instant expiresAt) {}

    public record ClassSummary(UUID id, String name, String subjectCode, String subjectName, int yearGroup,
            String academicYear, Level level, int pendingCount) {}

    public record MemberView(UUID enrolmentId, UUID studentId, String firstName, String lastName, String username,
            EnrolmentStatus status, Instant requestedAt) {}

    public record ClassDetail(UUID id, String name, String subjectCode, String subjectName, int yearGroup,
            String academicYear, Level level, JoinCodeView joinCode, List<MemberView> enrolments) {}

    public record JoinPreview(String className, String subjectName, String schoolName) {}

    public record EnrolmentView(UUID enrolmentId, UUID classId, String className, String subjectName,
            String schoolName, EnrolmentStatus status) {}

    public record ResetCodeIssued(String code, Instant expiresAt) {}
}
