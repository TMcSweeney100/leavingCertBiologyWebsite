package ie.coursework.content;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** A {@code source_ref} value: "NCCA-BIO p. 6" is document NCCA-BIO, printed page 6. */
public record SourceRef(String key, int page) {

    public static final Pattern FORMAT = Pattern.compile("^((?:NCCA|SEC)-[A-Z0-9]+) p\\. (\\d+)$");

    public static SourceRef parse(String value) {
        Matcher m = FORMAT.matcher(value);
        if (!m.matches()) {
            throw new IllegalArgumentException("source_ref must look like 'NCCA-BIO p. 6': " + value);
        }
        return new SourceRef(m.group(1), Integer.parseInt(m.group(2)));
    }
}
