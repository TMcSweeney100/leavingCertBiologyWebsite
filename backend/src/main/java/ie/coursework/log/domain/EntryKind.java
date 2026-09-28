package ie.coursework.log.domain;

/** Design §6.6: one trail, three kinds. The kind is fixed when an entry is created. */
public enum EntryKind {
    NOTE(null),
    SOURCE(SourceFields.class),
    AI_USE(AiUseFields.class);

    private final Class<? extends EntryFields> fieldsType;

    EntryKind(Class<? extends EntryFields> fieldsType) {
        this.fieldsType = fieldsType;
    }

    /** The record this kind's {@code fields} must be; null for a note, which has none. */
    public Class<? extends EntryFields> fieldsType() {
        return fieldsType;
    }
}
