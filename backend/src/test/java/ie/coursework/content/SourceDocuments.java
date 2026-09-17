package ie.coursework.content;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

/**
 * The SEC and NCCA documents content rows cite, read from docs/ (Maven runs tests from backend/).
 *
 * <p>Text is compared with all whitespace removed, because a PDF's line breaks and column layout aren't
 * part of what it says. Curly quotes, dashes, bullets and ligatures are normalised for the same reason.
 * Nothing else is: a changed word, comma or capital is a real difference.
 */
public final class SourceDocuments {

    private record Source(String file, int pageOffset) {}

    private static final Path DIR = Path.of("..", "docs", "newDevelopement", "subjectDocs");

    private static final Map<String, Source> SOURCES = Map.of(
            "NCCA-BIO", new Source("AAC_Guidelines_Biology_Final.pdf", 2),
            "NCCA-CHEM", new Source("AAC_Guidelines_Chemistry_Final.pdf", 3),
            "NCCA-PHYS", new Source("AAC_Guidelines_Physics_Final.pdf", 3),
            "NCCA-BUS", new Source("AAC_Guidelines_LCBusiness_November-2024_EN.pdf", 3),
            "SEC-2027L025C2EL", new Source("SEC-2027L025C2EL-Biology-brief.pdf", 0),
            "SEC-2027L022C2EL", new Source("SEC-2027L022C2EL-Chemistry-brief.pdf", 0),
            "SEC-2027L021C2EL", new Source("SEC-2027L021C2EL-Physics-brief.pdf", 0),
            "SEC-2027L033C2EL", new Source("SEC-2027L033C2EL-Business-brief.pdf", 0));

    private static final Map<String, List<String>> PAGES = new ConcurrentHashMap<>();

    private SourceDocuments() {}

    /** Whether {@code quote} appears on the ref's printed page, or starts there and runs onto the next. */
    public static boolean startsOnPage(SourceRef ref, String quote) {
        List<String> pages = pages(ref.key());
        int index = ref.page() + SOURCES.get(ref.key()).pageOffset() - 1;
        if (index < 0 || index >= pages.size()) {
            return false;
        }
        String text = pages.get(index) + (index + 1 < pages.size() ? pages.get(index + 1) : "");
        return text.contains(normalise(quote));
    }

    /** Printed page numbers where {@code quote} appears, for a helpful failure message. */
    public static List<Integer> printedPagesContaining(String key, String quote) {
        List<String> pages = pages(key);
        String wanted = normalise(quote);
        List<Integer> found = new ArrayList<>();
        for (int i = 0; i < pages.size(); i++) {
            if (pages.get(i).contains(wanted)) {
                found.add(i + 1 - SOURCES.get(key).pageOffset());
            }
        }
        return found;
    }

    public static String normalise(String text) {
        String n = Normalizer.normalize(text, Normalizer.Form.NFKC)
                .replace('‘', '\'').replace('’', '\'')
                .replace('“', '"').replace('”', '"')
                .replace('–', '-').replace('—', '-')
                .replace("•", "").replace("­", "");
        return n.replaceAll("\\s+", "");
    }

    private static List<String> pages(String key) {
        Source source = SOURCES.get(key);
        if (source == null) {
            throw new IllegalArgumentException("Unknown source document: " + key);
        }
        return PAGES.computeIfAbsent(key, k -> read(DIR.resolve(source.file())));
    }

    private static List<String> read(Path file) {
        try (PDDocument document = Loader.loadPDF(file.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            List<String> pages = new ArrayList<>();
            for (int page = 1; page <= document.getNumberOfPages(); page++) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                pages.add(normalise(stripper.getText(document)));
            }
            return List.copyOf(pages);
        } catch (IOException e) {
            throw new UncheckedIOException("Can't read " + file.toAbsolutePath(), e);
        }
    }
}
