package ie.coursework.log.domain;

/** The NCCA's example headings (NCCA-BIO p. 15-16), plus OTHER for journals, reports and organisations. */
public enum SourceType {
    BOOK, NEWSPAPER_OR_MAGAZINE, ONLINE_TEXT_OR_IMAGE, ONLINE_AUDIO, ONLINE_VIDEO, OTHER;

    /** "Where students wish to refer to an internet site or online source … the hyperlink and date read or downloaded." */
    public boolean online() {
        return name().startsWith("ONLINE_");
    }
}
