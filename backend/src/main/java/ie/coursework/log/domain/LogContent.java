package ie.coursework.log.domain;

import ie.coursework.shared.error.FieldError;
import java.util.ArrayList;
import java.util.List;

/** What makes an entry's body and fields acceptable. Field keys match the request's JSON paths. */
public final class LogContent {

    public static final int BODY_MAX = 4000;
    public static final int SHORT_MAX = 500;
    public static final int LONG_MAX = 4000;

    private LogContent() {}

    public static List<FieldError> problems(EntryKind kind, String body, EntryFields fields) {
        List<FieldError> problems = new ArrayList<>();
        if (body != null && body.length() > BODY_MAX) {
            problems.add(new FieldError("body", "must be at most " + BODY_MAX + " characters"));
        }
        switch (kind) {
            case NOTE -> {
                if (blank(body)) problems.add(new FieldError("body", "write something"));
                if (fields != null) problems.add(new FieldError("fields", "a note has no fields"));
            }
            case SOURCE -> {
                if (fields instanceof SourceFields source) source(source, problems);
                else problems.add(new FieldError("fields", "a source needs its details"));
            }
            case AI_USE -> {
                if (fields instanceof AiUseFields ai) aiUse(ai, problems);
                else problems.add(new FieldError("fields", "an AI use needs its details"));
            }
        }
        return problems;
    }

    private static void source(SourceFields s, List<FieldError> problems) {
        if (s.type() == null) problems.add(new FieldError("fields.type", "choose a type"));
        required("fields.title", s.title(), SHORT_MAX, problems);
        if (s.type() != null && s.type().online()) {
            if (blank(s.url())) problems.add(new FieldError("fields.url", "required"));
            if (s.dateAccessed() == null) problems.add(new FieldError("fields.dateAccessed", "required for an online source"));
        }
        link("fields.url", s.url(), problems);
        capped("fields.author", s.author(), SHORT_MAX, problems);
        capped("fields.publication", s.publication(), SHORT_MAX, problems);
        capped("fields.datePublished", s.datePublished(), SHORT_MAX, problems);
        capped("fields.locator", s.locator(), SHORT_MAX, problems);
        capped("fields.keyInformation", s.keyInformation(), LONG_MAX, problems);
        capped("fields.relevance", s.relevance(), LONG_MAX, problems);
        capped("fields.reflections", s.reflections(), LONG_MAX, problems);
    }

    private static void aiUse(AiUseFields a, List<FieldError> problems) {
        required("fields.toolNameAndVersion", a.toolNameAndVersion(), SHORT_MAX, problems);
        required("fields.developer", a.developer(), SHORT_MAX, problems);
        if (a.dateGenerated() == null) problems.add(new FieldError("fields.dateGenerated", "required"));
        required("fields.howUsed", a.howUsed(), LONG_MAX, problems);
        capped("fields.prompts", a.prompts(), LONG_MAX, problems);
        link("fields.shareUrl", a.shareUrl(), problems);
    }

    /** Required and, when present, within {@code max}. */
    private static void required(String field, String value, int max, List<FieldError> problems) {
        if (blank(value)) {
            problems.add(new FieldError(field, "required"));
        } else {
            capped(field, value, max, problems);
        }
    }

    private static void capped(String field, String value, int max, List<FieldError> problems) {
        if (value != null && value.length() > max) {
            problems.add(new FieldError(field, "must be at most " + max + " characters"));
        }
    }

    private static void link(String field, String value, List<FieldError> problems) {
        if (blank(value)) {
            return;
        }
        if (value.length() > SHORT_MAX) {
            capped(field, value, SHORT_MAX, problems);
        } else if (!HttpsLink.valid(value)) {
            problems.add(new FieldError(field, "must be a full https:// link"));
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
