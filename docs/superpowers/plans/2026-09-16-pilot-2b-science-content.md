# Pilot 2B — Science Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Biology, Chemistry and Physics templates are loaded as published content, every row traceable to a page of an SEC or NCCA PDF, and a test proves each quoted string is really on that page.

**Architecture:** One content migration, `db/content/V2__science_templates.sql`, loads all three science templates from one source: shared structure written once, and wording each document phrases differently listed per subject. A test-only `SourceDocuments` helper reads the PDFs in `docs/newDevelopement/subjectDocs/` with Apache PDFBox and normalises their text; `SourceTextTest` checks every stage description, process note, checkpoint quote, prompt, section, band criterion and stage name against the page its `source_ref` names. `ScienceTemplateContentTest` checks the shape against design §7.2 and §7.3.

**Tech Stack:** Flyway content migrations (second history table), Postgres 18, JUnit 5 + Testcontainers, Apache PDFBox 3 (test scope only).

**Roadmap:** `docs/PILOT-ROADMAP.md` §8.2 2B, §4.4 (content discipline). **Design:** §4.1, §4.2, §4.6, §6.2, §7.1–§7.3.

---

## Before you start

- 2A is merged into `pilotMain` (or branch from `pilot/2a-template-schema`): `git checkout -b pilot/2b-science-content`.
- `make verify` is green.
- Read: `docs/PILOT-DESIGN.md` §7.2 and §7.3 (what each template holds); `backend/src/main/resources/db/migration/V6__templates_and_briefs.sql` and `V7__template_guards.sql` (2A); `backend/src/main/resources/db/content/V1__subjects.sql`.
- **The content in this plan was checked before the plan was written** (16 Sep 2026): the SQL below was applied to a Postgres 18 database on top of 2A's migrations, and every quoted string was found on the page its `source_ref` names (pypdf extraction, whitespace ignored). `SourceTextTest` repeats that check with PDFBox inside the build. If it reports a miss, **don't reword the content to make the test pass.** Open the PDF, find what it really says, and fix whichever of the quote, the page or the extraction is wrong. If the PDF and this plan disagree, the PDF wins; if you can't tell, stop and ask Tim (roadmap §0).

**Decisions this plan takes** (proposed; status in roadmap §3 "Phase 2 questions"):

| # | Decision | Where |
|---|---|---|
| P2-9 | **Wording is quoted per subject, structure is shared.** The three science guidelines aren't identical: they differ in punctuation throughout, Chemistry and Physics say "school laboratory" where Biology says "relevant setting (school laboratory and/or field setting…)", and their Stage 4 authentication sentence adds "to give an undertaking". Design §4.2's "only differences are in wording" holds for structure, not for quotes. | `V2__science_templates.sql` |
| P2-10 | **Stage names come from the 2027 briefs (p. 5), not the guidelines.** They agree except that the Physics guideline heads Stage 1 "Initial Response to the Brief"; the brief is the later, examinable document. | `template_stage.name` |
| P2-11 | **A stage's description is one sentence quoted from its guideline section**, chosen as the sentence that says what the stage is. Where the only such sentence also states the hours (Stage 6), it's quoted whole, grammar included. **Pending Tim (Q-P2-A).** | `template_stage.description` |
| P2-12 | **Science report sections have no indicative content.** The science briefs point at the mark allocation instead (p. 7: "Indicative content … is detailed below along with mark allocation in Section 7"), so the criteria live on the bands. | `template_section` |
| P2-13 | **No section-to-stage links yet.** Neither document says which stage a section is written during; the BiPi site's mapping was Katelyn's. `template_section_stage` stays empty. **Confirmed by Tim, 16 Sep 2026 (Q-P2-B): no mapping for now.** | — |
| P2-14 | **Checkpoint wording is design §7.3's working wording**, loaded now so teachers review it in the app (Q1). The `DESCRIBED` rows (Stages 1 and 3) are included; reviewers decide whether they stay, and removing one later means a new template version. | `template_checkpoint` |
| P2-15 | **The PDFs are renamed to their SEC codes** and the duplicate Biology brief at `docs/` is removed (it's byte-identical to the copy in `subjectDocs/`). Source keys in `source_ref` name documents, never file names, so renaming a file only touches `SourceDocuments`. | Task 1 |

**Source keys** used in `source_ref` (`"<key> p. <printed page>"`, where the text starts on that page and may run onto the next):

| Key | File (after Task 1) | Printed page = PDF page − |
|---|---|---|
| `NCCA-BIO` | `AAC_Guidelines_Biology_Final.pdf` | 2 |
| `NCCA-CHEM` | `AAC_Guidelines_Chemistry_Final.pdf` | 3 |
| `NCCA-PHYS` | `AAC_Guidelines_Physics_Final.pdf` | 3 |
| `NCCA-BUS` | `AAC_Guidelines_LCBusiness_November-2024_EN.pdf` | 3 |
| `SEC-2027L025C2EL` | `SEC-2027L025C2EL-Biology-brief.pdf` | 0 |
| `SEC-2027L022C2EL` | `SEC-2027L022C2EL-Chemistry-brief.pdf` | 0 |
| `SEC-2027L021C2EL` | `SEC-2027L021C2EL-Physics-brief.pdf` | 0 |
| `SEC-2027L033C2EL` | `SEC-2027L033C2EL-Business-brief.pdf` | 0 |

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `docs/newDevelopement/subjectDocs/SEC-2027L0*-*-brief.pdf` | The four final 2027 briefs, named by SEC code | 1 |
| `docs/PILOT-DESIGN.md` §4.1 | Points at the renamed files | 1 |
| `backend/pom.xml` | PDFBox, test scope | 2 |
| `backend/src/test/java/ie/coursework/content/SourceDocuments.java` | Source key → PDF, page text, normalisation | 2 |
| `backend/src/test/java/ie/coursework/content/SourceDocumentsTest.java` | The helper finds known sentences on known pages | 2 |
| `backend/src/main/resources/db/content/V2__science_templates.sql` | The three science templates | 3 |
| `backend/src/test/java/ie/coursework/content/ScienceTemplateContentTest.java` | Shape against design §7.2–§7.3 | 3 |
| `backend/src/test/java/ie/coursework/content/SourceTextTest.java` | Every quoted string is on its page | 4 |
| `docs/HANDOFF.md`, `docs/PILOT-ROADMAP.md`, `docs/ARCHITECTURE.md` | Review record and docs | 5 |

---

## Task 1: Put the briefs under their SEC codes

**Files:**
- Move: the four 2027 brief PDFs in `docs/newDevelopement/subjectDocs/`
- Delete: `docs/Biology in Practice Investigation Brief 2027.pdf`
- Modify: `docs/PILOT-DESIGN.md` §4.1

- [ ] **Step 1: Confirm the duplicate really is a duplicate**

Run: `cmp "docs/Biology in Practice Investigation Brief 2027.pdf" "docs/newDevelopement/subjectDocs/Biology in Practice Investigation Brief 2027 (1).pdf" && echo identical`
Expected: `identical`. If not, stop and ask Tim which is current.

- [ ] **Step 2: Rename and remove**

```bash
cd docs/newDevelopement/subjectDocs
mv "Biology in Practice Investigation Brief 2027 (1).pdf" SEC-2027L025C2EL-Biology-brief.pdf
mv "Chemistry in Practice Investigation Brief 2027.pdf" SEC-2027L022C2EL-Chemistry-brief.pdf
mv "Physics in Practice Investigation Brief 2027.pdf" SEC-2027L021C2EL-Physics-brief.pdf
mv Business-Alive-Investigative-Study-Brief-2027.pdf SEC-2027L033C2EL-Business-brief.pdf
cd ../../..
git rm "docs/Biology in Practice Investigation Brief 2027.pdf"
```

- [ ] **Step 3: Check each file is the brief its name says**

Open each PDF's first page (or run `strings -n 12 <file> | head` if no viewer) and confirm the code in its top-left corner matches the file name: `2027L025C2EL` Biology, `2027L022C2EL` Chemistry, `2027L021C2EL` Physics, `2027L033C2EL` Business.

- [ ] **Step 4: Update design §4.1**

In `docs/PILOT-DESIGN.md` §4.1, replace the row
`| SEC **final** 2027 briefs: Physics \`2027L021C2EL\`, … Biology is also at \`docs/Biology in Practice Investigation Brief 2027.pdf\`. |`
with:

```markdown
| SEC **final** 2027 briefs: Physics `2027L021C2EL`, Chemistry `2027L022C2EL`, Biology `2027L025C2EL`, Business `2027L033C2EL` | `subjectDocs/SEC-<code>-<Subject>-brief.pdf` |
```

and replace the line `**Action:** add the four final 2027 briefs and the current Coursework Rules and Procedures to \`subjectDocs/\`.` with:

```markdown
**Action:** the four final 2027 briefs are in `subjectDocs/` (added 16 Sep 2026). The Coursework Rules and Procedures is still to add; Phase 6 needs it (Q6).
```

- [ ] **Step 5: Commit**

```bash
git add docs/newDevelopement/subjectDocs/SEC-2027L0*-brief.pdf docs/PILOT-DESIGN.md
git commit -m "Add the four final 2027 SEC briefs, named by SEC code"
```

---

## Task 2: Read source PDFs in tests

**Files:**
- Modify: `backend/pom.xml`
- Create: `backend/src/test/java/ie/coursework/content/SourceDocuments.java`
- Create: `backend/src/test/java/ie/coursework/content/SourceDocumentsTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/** No Spring, no database: just the PDFs under docs/. */
class SourceDocumentsTest {

    @Test
    void findsAGuidelineSentenceOnItsPrintedPage() {
        String quote = "What do I already know about the topic and/or issue in the Investigation Brief?";

        assertThat(SourceDocuments.startsOnPage(SourceRef.parse("NCCA-BIO p. 6"), quote)).isTrue();
        assertThat(SourceDocuments.startsOnPage(SourceRef.parse("NCCA-BIO p. 4"), quote)).isFalse();
    }

    @Test
    void appliesEachDocumentsPageOffset() {
        assertThat(SourceDocuments.startsOnPage(SourceRef.parse("NCCA-CHEM p. 8"),
                "Once the experiment is complete, students are ready to critically analyse their data")).isTrue();
        assertThat(SourceDocuments.startsOnPage(SourceRef.parse("NCCA-BUS p. 16"),
                "Is my question linked to the theme in the brief?")).isTrue();
    }

    @Test
    void textMayRunOntoTheNextPage() {
        // The first three Stage 1 prompts are on p. 4, the last two on p. 5.
        assertThat(SourceDocuments.startsOnPage(SourceRef.parse("NCCA-BUS p. 4"),
                "Where will I store my background research? How might I do this?")).isTrue();
    }

    @Test
    void readsTheBriefsByCode() {
        assertThat(SourceDocuments.startsOnPage(SourceRef.parse("SEC-2027L021C2EL p. 2"),
                "submitted to the class teacher by Friday, 11 December 2026")).isTrue();
    }

    @Test
    void ignoresLayoutWhitespaceCurlyQuotesDashesAndLigatures() {
        assertThat(SourceDocuments.normalise("students’ \n investigative – logs ﬁgure"))
                .isEqualTo(SourceDocuments.normalise("students' investigative - logs figure"));
    }

    @Test
    void refusesAnUnknownDocumentOrAMalformedRef() {
        assertThatThrownBy(() -> SourceRef.parse("NCCA-BIO page 6")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceDocuments.startsOnPage(SourceRef.parse("NCCA-GEO p. 1"), "x"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw test -Dtest=SourceDocumentsTest`
Expected: FAIL to compile (`SourceDocuments`, `SourceRef` don't exist).

- [ ] **Step 3: Add PDFBox**

In `backend/pom.xml`, inside `<dependencies>`, after the Testcontainers dependencies:

```xml
        <!-- Reads the SEC and NCCA PDFs so content tests can check every quote (plan 2B). Tests only. -->
        <dependency>
            <groupId>org.apache.pdfbox</groupId>
            <artifactId>pdfbox</artifactId>
            <version>3.0.5</version>
            <scope>test</scope>
        </dependency>
```

If Maven Central has a later `3.0.x`, use it. The Docker image builds with `-DskipTests`, so it never downloads this.

- [ ] **Step 4: Write the helper**

`backend/src/test/java/ie/coursework/content/SourceRef.java`:

```java
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
```

`backend/src/test/java/ie/coursework/content/SourceDocuments.java`:

```java
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
```

- [ ] **Step 5: Run the test to see it pass**

Run: `cd backend && ./mvnw test -Dtest=SourceDocumentsTest`
Expected: PASS, 6 tests.

If `textMayRunOntoTheNextPage` or a brief test fails, print the page (`System.out.println` of `pages(key).get(i)` in a scratch test) and compare with the PDF. PDFBox reads table cells in content-stream order; if a table's text comes out interleaved, set `stripper.setSortByPosition(true)` for that document only (add a `boolean sortByPosition` to `Source`) and say so in a comment. Don't loosen `normalise`.

- [ ] **Step 6: Commit**

```bash
git add backend/pom.xml backend/src/test/java/ie/coursework/content/SourceRef.java \
        backend/src/test/java/ie/coursework/content/SourceDocuments.java \
        backend/src/test/java/ie/coursework/content/SourceDocumentsTest.java
git commit -m "Read the SEC and NCCA PDFs in tests so content can be checked against its source page"
```

---

## Task 3: Load the three science templates

**Files:**
- Create: `backend/src/main/resources/db/content/V2__science_templates.sql`
- Create: `backend/src/test/java/ie/coursework/content/ScienceTemplateContentTest.java`
- Modify: `backend/src/test/java/ie/coursework/shared/config/ContentMigrationsTest.java`

- [ ] **Step 1: Write the failing tests**

`backend/src/test/java/ie/coursework/content/ScienceTemplateContentTest.java`:

```java
package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Design §7.2 and §7.3, for each of the three science templates. Reads only: nothing to roll back. */
class ScienceTemplateContentTest extends PostgresIntegrationTest {

    private static final String VERSION = """
            SELECT v.id FROM template_version v JOIN component_template t ON t.id = v.template_id
            WHERE t.slug = ? AND v.version_no = 1
            """;

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void isPublishedAtFortyPercentOfTwoHundredMarks(String slug) {
        Map<String, Object> row = jdbcTemplate.queryForMap("""
                SELECT t.weighting_percent, t.marks_total, t.deliverable_type, v.status, s.code
                FROM component_template t JOIN template_version v ON v.template_id = t.id
                JOIN subject s ON s.id = t.subject_id WHERE t.slug = ? AND v.version_no = 1
                """, slug);

        assertThat(row).containsEntry("weighting_percent", 40).containsEntry("marks_total", 200)
                .containsEntry("deliverable_type", "REPORT").containsEntry("status", "PUBLISHED")
                .containsEntry("code", slug.substring(0, slug.indexOf('-')).toUpperCase());
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void hasSixStagesWithTheDesignsHoursAndOnlyStageFourSupervised(String slug) {
        List<String> stages = jdbcTemplate.queryForList("""
                SELECT label || '|' || coalesce(hours_min::text, '-') || '-' || hours_max || '|' || supervised
                FROM template_stage WHERE version_id = (%s) ORDER BY ordinal
                """.formatted(VERSION), String.class, slug);

        assertThat(stages).containsExactly(
                "Stage 1|1-2|false", "Stage 2|2-3|false", "Stage 3|2-3|false",
                "Stage 4|1-2|true", "Stage 5|1-2|false", "Stage 6|--4|false");
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void usesTheBriefsStageNames(String slug) {
        String subject = slug.substring(0, 1).toUpperCase() + slug.substring(1, slug.indexOf('-'));
        List<String> names = jdbcTemplate.queryForList(
                "SELECT name FROM template_stage WHERE version_id = (%s) ORDER BY ordinal".formatted(VERSION),
                String.class, slug);

        assertThat(names).containsExactly("Initial Response to the Investigation Brief", "Background Research",
                "Designing and Planning the Experiment", "Conducting the Experiment", "Data Analysis and Conclusions",
                "Finalising the " + subject + " in Practice Investigation Report");
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void hasTheSevenReportSections(String slug) {
        List<String> sections = jdbcTemplate.queryForList(
                "SELECT label || ' ' || name FROM template_section WHERE version_id = (%s) ORDER BY ordinal".formatted(VERSION),
                String.class, slug);

        assertThat(sections).containsExactly("1 Title and Introduction", "2 Background Research",
                "3 Designing and Planning", "4 Conducting the Experiment", "5 Data and Data Analysis",
                "6 Conclusions", "7 References");
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void markBandsAddUpToTheTotalAndBandDCoversTheWholeReport(String slug) {
        List<String> bands = jdbcTemplate.queryForList("""
                SELECT b.label || ' ' || b.marks || ' ' || b.whole_report || ' ' ||
                       coalesce((SELECT string_agg(s.label, ',' ORDER BY s.ordinal) FROM template_mark_band_section l
                                 JOIN template_section s ON s.id = l.section_id WHERE l.band_id = b.id), '-')
                FROM template_mark_band b WHERE b.version_id = (%s) ORDER BY b.ordinal
                """.formatted(VERSION), String.class, slug);
        Integer total = jdbcTemplate.queryForObject(
                "SELECT sum(marks) FROM template_mark_band WHERE version_id = (%s)".formatted(VERSION), Integer.class, slug);

        assertThat(bands).containsExactly("A 50 false 1,2,7", "B 50 false 3,4", "C 50 false 5,6", "D 50 true -");
        assertThat(total).isEqualTo(200);
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void hasTheDesignsSixCheckpointsWithTheirBasis(String slug) {
        List<String> checkpoints = jdbcTemplate.queryForList("""
                SELECT s.ordinal || ' ' || c.basis || ' ' || c.text FROM template_checkpoint c
                JOIN template_stage s ON s.id = c.stage_id WHERE c.version_id = (%s) ORDER BY s.ordinal
                """.formatted(VERSION), String.class, slug);

        assertThat(checkpoints).containsExactly(
                "1 DESCRIBED Initial ideas discussed with the teacher",
                "2 EXPLICIT Investigative log shared with the teacher",
                "3 DESCRIBED Plan discussed with the teacher (feasibility and safety)",
                "4 EXPLICIT Experiment carried out under supervision, in line with the research and planning already shared",
                "5 EXPLICIT Data analysis shared with the teacher",
                "6 EXPLICIT Final report submitted to the teacher");
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void hasPromptsForStagesOneAndFiveOnly(String slug) {
        List<String> counts = jdbcTemplate.queryForList("""
                SELECT s.ordinal || ':' || count(p.id) FROM template_stage s LEFT JOIN template_prompt p ON p.stage_id = s.id
                WHERE s.version_id = (%s) GROUP BY s.ordinal ORDER BY s.ordinal
                """.formatted(VERSION), String.class, slug);

        assertThat(counts).containsExactly("1:5", "2:0", "3:0", "4:0", "5:4", "6:0");
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void sectionsAreNotYetLinkedToStages(String slug) {
        // Plan 2B P2-13, confirmed 16 Sep 2026: no section-to-stage mapping. Delete this test if one is ever loaded.
        Integer links = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM template_section_stage WHERE version_id = (%s)".formatted(VERSION), Integer.class, slug);

        assertThat(links).isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = {"template_stage", "template_section", "template_mark_band", "template_checkpoint", "template_prompt"})
    void everyRowNamesADocumentAndAPage(String table) {
        List<String> refs = jdbcTemplate.queryForList("SELECT source_ref FROM " + table, String.class);

        assertThat(refs).isNotEmpty().allSatisfy(ref -> assertThat(ref).matches(SourceRef.FORMAT));
    }

    @ParameterizedTest
    @ValueSource(strings = {"biology-in-practice-investigation", "chemistry-in-practice-investigation", "physics-in-practice-investigation"})
    void theProcessNoteSaysTheStagesArentLinear(String slug) {
        String note = jdbcTemplate.queryForObject(
                "SELECT process_note FROM template_version WHERE id = (%s)".formatted(VERSION), String.class, slug);

        assertThat(Arrays.asList(note.split(" "))).contains("linear");
        assertThat(note).contains("move backwards and forwards between the stages");
    }
}
```

In `backend/src/test/java/ie/coursework/shared/config/ContentMigrationsTest.java`, add:

```java
    @Test
    void theScienceTemplatesMigrationApplied() {
        Integer applied = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM flyway_content_history WHERE success AND description = 'science templates'",
                Integer.class);

        assertThat(applied).isEqualTo(1);
    }
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `cd backend && ./mvnw test -Dtest='ScienceTemplateContentTest,ContentMigrationsTest'`
Expected: FAIL. `isPublished…` errors with `EmptyResultDataAccessException`; the others find empty lists; `theScienceTemplatesMigrationApplied` finds 0.

- [ ] **Step 3: Write the content migration**

`backend/src/main/resources/db/content/V2__science_templates.sql`, exactly as follows. **Copy it; don't retype it.** Every string was checked against the PDFs.

```sql
-- Biology, Chemistry and Physics templates, version 1 (design §4.2, §7.2, §7.3).
--
-- One content source for three subjects. What the documents share (stage order, hours, supervision,
-- report sections, mark bands, checkpoint wording) is written once. What they phrase differently is
-- listed per subject, word for word from that subject's own document: the three NCCA guidelines differ
-- in punctuation and in some sentences (Chemistry and Physics say "school laboratory").
--
-- Source keys (resolved to files by SourceDocuments in the tests):
--   NCCA-BIO, NCCA-CHEM, NCCA-PHYS   NCCA guidelines, November 2024, printed page numbers
--   SEC-2027L025C2EL (Biology), SEC-2027L022C2EL (Chemistry), SEC-2027L021C2EL (Physics)   final 2027 briefs
--
-- Every row is checked against those PDFs by SourceTextTest, and read by Tim against the PDFs before merge.

CREATE TEMP TABLE science (
    subject_code text PRIMARY KEY,
    slug         text NOT NULL,
    name         text NOT NULL,
    subject_word text NOT NULL,   -- as the guidelines write it mid-sentence: "activities in biology"
    ncca         text NOT NULL,
    sec          text NOT NULL
);

INSERT INTO science VALUES
    ('BIOLOGY',   'biology-in-practice-investigation',   'Biology in Practice Investigation',   'biology',   'NCCA-BIO',  'SEC-2027L025C2EL'),
    ('CHEMISTRY', 'chemistry-in-practice-investigation', 'Chemistry in Practice Investigation', 'chemistry', 'NCCA-CHEM', 'SEC-2027L022C2EL'),
    ('PHYSICS',   'physics-in-practice-investigation',   'Physics in Practice Investigation',   'physics',   'NCCA-PHYS', 'SEC-2027L021C2EL');

-- 200 marks, 40% of the subject (each brief, p. 2).
INSERT INTO component_template (subject_id, slug, name, deliverable_type, weighting_percent, marks_total)
SELECT subject.id, science.slug, science.name, 'REPORT', 40, 200
FROM science JOIN subject ON subject.code = science.subject_code;

-- Process note: the stages aren't linear (each guideline, p. 5). Two sentences, as each document words them.
INSERT INTO template_version (template_id, version_no, process_note, process_note_source_ref)
SELECT t.id, 1, note.text, science.ncca || ' p. 5'
FROM (VALUES
    ('BIOLOGY',   'Nor is it intended to present the stages as a rigid or linear process. Mistakes, errors and improvements are expected components of the investigative process and students should be prepared to iterate; that is move backwards and forwards between the stages and revisit investigative activities at different times, reflecting on and refining their work as they complete the investigation.'),
    ('CHEMISTRY', 'Nor is it intended that the stages are a rigid or linear process. Mistakes, errors and improvements are expected components of the investigative process and students should be prepared to iterate, that is move backwards and forwards between the stages and revisit investigative activities at different times, reflecting on and refining their work as they complete the investigation.'),
    ('PHYSICS',   'Nor is it intended to present the stages as a rigid and linear process. Mistakes, errors and improvements are expected components of the investigative process and students should be prepared to iterate; that is move backwards and forwards between the stages and revisit investigative activities at different times, reflecting on and refining their work as they complete the investigation.')
) AS note (subject_code, text)
JOIN science USING (subject_code)
JOIN component_template t ON t.slug = science.slug;

CREATE TEMP VIEW science_version AS
SELECT science.*, v.id AS version_id
FROM science
JOIN component_template t ON t.slug = science.slug
JOIN template_version v ON v.template_id = t.id AND v.version_no = 1;

-- Stages. Names from each 2027 brief (p. 5); hours and descriptions from the guidelines. Hours are the
-- same in all three (design §7.2): 1-2, 2-3, 2-3, 1-2, 1-2, up to 4. Stage 4 is supervised: "must be fully
-- completed under the direct supervision of your … teacher" (each brief, p. 5).
INSERT INTO template_stage (version_id, ordinal, label, name, description, hours_min, hours_max, supervised, source_ref)
SELECT sv.version_id, shape.ordinal, 'Stage ' || shape.ordinal, words.name, words.description,
       shape.hours_min, shape.hours_max, shape.supervised, sv.ncca || ' p. ' || words.page
FROM (VALUES
    (1, 1,           2, false),
    (2, 2,           3, false),
    (3, 2,           3, false),
    (4, 1,           2, true),
    (5, 1,           2, false),
    (6, NULL::int,   4, false)
) AS shape (ordinal, hours_min, hours_max, supervised)
JOIN (VALUES
    ('BIOLOGY',   1, 'Initial Response to the Investigation Brief', 'This part of the investigation involves students engaging with an Investigation Brief which provides information about a context involving some biological phenomenon related to the learning in the specification.', 5),
    ('BIOLOGY',   2, 'Background Research', 'During this stage of the process, students develop a research question on a particular issue in response to the Investigation Brief and informed by their background research into the topic.', 7),
    ('BIOLOGY',   3, 'Designing and Planning the Experiment', 'Whatever approach students decide, this stage will involve students using insights from their background research to pose a testable hypothesis and develop experimental strategies for investigating it.', 7),
    ('BIOLOGY',   4, 'Conducting the Experiment', 'During this stage, under the supervision of the teacher in a relevant setting (school laboratory and/or field setting as appropriate to the investigation), each student carries out the experiment they designed.', 8),
    ('BIOLOGY',   5, 'Data Analysis and Conclusions', 'Once the experiment is complete, students are ready to critically analyse their data and draw justifiable conclusions.', 9),
    ('BIOLOGY',   6, 'Finalising the Biology in Practice Investigation Report', 'During this final stage, which, is envisaged should take up to 4 hours to complete, students draw upon their investigative log, which outlines all the stages of their investigation, to compile their final report.', 9),

    ('CHEMISTRY', 1, 'Initial Response to the Investigation Brief', 'This part of the investigation involves students engaging with an Investigation Brief which provides information about a context involving some chemical phenomenon related to the learning in the specification.', 5),
    ('CHEMISTRY', 2, 'Background Research', 'During this stage of the process, students develop a research question on a particular issue in response to the Investigation Brief and informed by their background research into the topic.', 7),
    ('CHEMISTRY', 3, 'Designing and Planning the Experiment', 'Whatever approach students decide, this stage will involve students using insights from their background research to pose a testable hypothesis and develop experimental strategies for investigating it.', 7),
    ('CHEMISTRY', 4, 'Conducting the Experiment', 'During this stage, under the supervision of the teacher in a school laboratory, each student carries out the experiment they designed.', 8),
    ('CHEMISTRY', 5, 'Data Analysis and Conclusions', 'Once the experiment is complete, students are ready to critically analyse their data and draw justifiable conclusions.', 8),
    ('CHEMISTRY', 6, 'Finalising the Chemistry in Practice Investigation Report', 'During this final stage, which, it is envisaged to take up to 4 hours to complete, students draw upon their investigative log, which outlines all the stages of their investigation, to compile their final report.', 9),

    ('PHYSICS',   1, 'Initial Response to the Investigation Brief', 'This part of the investigation involves students engaging with an Investigation Brief which provides information about a context involving some physical phenomenon related to the learning in the specification.', 5),
    ('PHYSICS',   2, 'Background Research', 'During this stage of the process, students develop a research question on a particular issue in response to the Investigation Brief and informed by their background research into the topic.', 7),
    ('PHYSICS',   3, 'Designing and Planning the Experiment', 'Whatever approach students decide, this stage will involve students using insights from their background research to pose a testable hypothesis and develop experimental strategies for investigating it.', 7),
    ('PHYSICS',   4, 'Conducting the Experiment', 'During this stage, under the supervision of the teacher in a school laboratory, each student carries out the experiment they designed.', 8),
    ('PHYSICS',   5, 'Data Analysis and Conclusions', 'Once the experiment is complete, students are ready to critically analyse their data and to draw justifiable conclusions.', 9),
    ('PHYSICS',   6, 'Finalising the Physics in Practice Investigation Report', 'During this final stage, which, it is envisaged should take up to 4 hours to complete, students draw upon their investigative log, which outlines all the stages of their investigation, to compile their final report.', 9)
) AS words (subject_code, ordinal, name, description, page) USING (ordinal)
JOIN science_version sv USING (subject_code);

-- Report sections: the same seven headings in all three briefs (p. 7). The science briefs give no
-- per-section indicative content or word counts; the mark allocation (p. 8) lists the criteria instead.
INSERT INTO template_section (version_id, ordinal, label, name, source_ref)
SELECT sv.version_id, heading.ordinal, heading.ordinal::text, heading.name, sv.sec || ' p. 7'
FROM science_version sv
CROSS JOIN (VALUES
    (1, 'Title and Introduction'),
    (2, 'Background Research'),
    (3, 'Designing and Planning'),
    (4, 'Conducting the Experiment'),
    (5, 'Data and Data Analysis'),
    (6, 'Conclusions'),
    (7, 'References')
) AS heading (ordinal, name);

-- Mark allocation (each brief, p. 8): four bands of 50. Band D is assessed across the whole report.
INSERT INTO template_mark_band (version_id, ordinal, label, name, marks, whole_report, criteria, source_ref)
SELECT sv.version_id, band.ordinal, band.label, band.name, 50, band.whole_report, band.criteria, sv.sec || ' p. 8'
FROM science_version sv
CROSS JOIN (VALUES
    (1, 'A', NULL::text, false, ARRAY['Title / Introduction / Research Question', 'Hypothesis', 'Background Research (Secondary Data)', 'Evaluation of Secondary Data', 'Referencing']),
    (2, 'B', NULL::text, false, ARRAY['Experimental Design', 'Experimental Method', 'Safety', 'Fairness', 'Accuracy', 'Selection of Equipment']),
    (3, 'C', NULL::text, false, ARRAY['Experimental Observations (Primary Data)', 'Data Presentation', 'Data Analysis', 'Conclusions']),
    (4, 'D', 'Scientific Literacy', true, ARRAY['Communication', 'Coherence', 'Relevance', 'Reflective Approach'])
) AS band (ordinal, label, name, whole_report, criteria);

-- Which sections each band covers (p. 8): A = 1, 2, 7; B = 3, 4; C = 5, 6; D = none (whole report).
INSERT INTO template_mark_band_section (version_id, band_id, section_id)
SELECT b.version_id, b.id, s.id
FROM science_version sv
JOIN template_mark_band b ON b.version_id = sv.version_id
JOIN template_section s ON s.version_id = sv.version_id
JOIN (VALUES ('A', 1), ('A', 2), ('A', 7), ('B', 3), ('B', 4), ('C', 5), ('C', 6)) AS covers (band, section)
  ON covers.band = b.label AND covers.section = s.ordinal;

-- Checkpoints (design §7.3). The wording is shared and is what teachers review (roadmap Q1); the quote is
-- each document's own sentence. Stage 6 rests on submission step 3 of each brief (p. 4).
INSERT INTO template_checkpoint (version_id, stage_id, ordinal, text, basis, source_quote, source_ref)
SELECT sv.version_id, stage.id, 1, point.text, point.basis, quote.text,
       CASE WHEN point.ordinal = 6 THEN sv.sec ELSE sv.ncca END || ' p. ' || quote.page
FROM (VALUES
    (1, 'Initial ideas discussed with the teacher', 'DESCRIBED'),
    (2, 'Investigative log shared with the teacher', 'EXPLICIT'),
    (3, 'Plan discussed with the teacher (feasibility and safety)', 'DESCRIBED'),
    (4, 'Experiment carried out under supervision, in line with the research and planning already shared', 'EXPLICIT'),
    (5, 'Data analysis shared with the teacher', 'EXPLICIT'),
    (6, 'Final report submitted to the teacher', 'EXPLICIT')
) AS point (ordinal, text, basis)
JOIN (VALUES
    ('BIOLOGY',   1, 'Interacting with the students at this stage provides an opportunity to familiarise themselves with their initial idea and to identify any gaps in understanding, or in some cases misunderstanding.', 6),
    ('BIOLOGY',   2, 'It is advisable that the students’ investigative logs are shared with the teacher to facilitate regular check-ins with the students’ work, supporting the teacher in the ongoing process of authentication.', 7),
    ('BIOLOGY',   3, 'Discussions between the teacher and student on the feasibility and manageability of their proposed plan supports an understanding of limitations such as safety, lack of equipment or time.', 7),
    ('BIOLOGY',   4, 'An important part of the ongoing authentication process is that the teacher is satisfied that the experiment conducted by the student is in line with their research and planning, which has been shared with them during the stages of the process.', 8),
    ('BIOLOGY',   5, 'Again, sharing the data analysis with the teacher is an important step in the ongoing authentication process.', 9),
    ('BIOLOGY',   6, 'Once you are satisfied that the PDF copy of the report you have printed is complete, you should submit the digital version of the report to your class teacher.', 4),

    ('CHEMISTRY', 1, 'Interacting with the students at this stage provides an opportunity to familiarise themselves with their initial idea and to identify any gaps in understanding, or in some cases misunderstanding.', 6),
    ('CHEMISTRY', 2, 'It is advisable that the students’ investigative logs are shared with the teacher, to facilitate regular check-ins with the students’ work, supporting the teacher in the ongoing process of authentication.', 7),
    ('CHEMISTRY', 3, 'Discussions between the teacher and student on the feasibility and manageability of their proposed plan supports an understanding of limitations such as safety, lack of equipment or time.', 7),
    ('CHEMISTRY', 4, 'An important part of the ongoing authentication process is that the teacher is satisfied to give an undertaking that the experiment conducted by a student is in line with their research and planning, which has been shared with them during the stages of the process.', 8),
    ('CHEMISTRY', 5, 'Again, sharing the data analysis with the teacher is an important step in the ongoing authentication process.', 9),
    ('CHEMISTRY', 6, 'Once you are satisfied that the PDF copy of the report you have printed is complete, you should submit the digital version of the report to your class teacher.', 4),

    ('PHYSICS',   1, 'Interacting with the students at this stage provides an opportunity to familiarise themselves with their initial idea, and to identify any gaps in understanding or in some cases misunderstanding.', 6),
    ('PHYSICS',   2, 'It is advisable that the students’ investigative logs are shared with the teacher to facilitate regular check-ins with the students’ work, supporting the teacher in the ongoing process of authentication.', 7),
    ('PHYSICS',   3, 'Discussions between the teacher and student on the feasibility and manageability of their proposed plan supports an understanding of limitations such as safety, lack of equipment or time.', 7),
    ('PHYSICS',   4, 'An important part of the ongoing authentication process is that the teacher is satisfied to give an undertaking that the experiment conducted by a student is in line with their research and planning, which has been shared with them during the stages of the process.', 8),
    ('PHYSICS',   5, 'Again, sharing the data analysis with the teacher is an important step in the ongoing authentication process.', 9),
    ('PHYSICS',   6, 'Once you are satisfied that the PDF copy of the report you have printed is complete, you should submit the digital version of the report to your class teacher.', 4)
) AS quote (subject_code, ordinal, text, page) ON quote.ordinal = point.ordinal
JOIN science_version sv USING (subject_code)
JOIN template_stage stage ON stage.version_id = sv.version_id AND stage.ordinal = point.ordinal;

-- Prompts, Stage 1 (each guideline, p. 6): identical apart from the subject's name.
INSERT INTO template_prompt (version_id, stage_id, ordinal, heading, text, source_ref)
SELECT sv.version_id, stage.id, prompt.ordinal,
       'Guiding or prompt questions that may support students in this process include',
       replace(prompt.text, '{subject}', sv.subject_word), sv.ncca || ' p. 6'
FROM science_version sv
JOIN template_stage stage ON stage.version_id = sv.version_id AND stage.ordinal = 1
CROSS JOIN (VALUES
    (1, 'What do I already know about the topic and/or issue in the Investigation Brief?'),
    (2, 'Do I need to understand more about the topic and/or issue and how will I do this?'),
    (3, 'What research and experimental activities in {subject} connect to the topic and/or issue in the Investigation Brief?'),
    (4, 'What area of the topic and/or issue am I interested in researching? What sources of information will be useful and how will I maintain a record of the research?'),
    (5, 'What experiment am I interested in completing? Could I extend or adapt an experiment I have already completed in {subject} or could I develop an original approach to an experiment?')
) AS prompt (ordinal, text);

-- Prompts, Stage 5: the data-analysis list (Biology p. 9, Chemistry p. 8, Physics p. 9). Physics writes
-- "calculations and graphs" where the others write "calculations and/or graphs".
INSERT INTO template_prompt (version_id, stage_id, ordinal, heading, text, source_ref)
SELECT sv.version_id, stage.id, item.ordinal, 'Data analysis may include', item.text, sv.ncca || ' p. ' || item.page
FROM (VALUES
    ('BIOLOGY',   1, 'evaluating data in terms of accuracy, precision, repeatability and reproducibility', 9),
    ('BIOLOGY',   2, 'calculations and/or graphs to facilitate the identification of patterns and relationships', 9),
    ('BIOLOGY',   3, 'justifications for any iterations of the process', 9),
    ('BIOLOGY',   4, 'the identification of and explanation for any initial anomalous results or observations', 9),
    ('CHEMISTRY', 1, 'evaluating data in terms of accuracy, precision, repeatability and reproducibility', 8),
    ('CHEMISTRY', 2, 'calculations and/or graphs to facilitate the identification of patterns and relationships', 8),
    ('CHEMISTRY', 3, 'justifications for any iterations of the process', 8),
    ('CHEMISTRY', 4, 'the identification of and explanation for any initial anomalous results or observations', 8),
    ('PHYSICS',   1, 'evaluating data in terms of accuracy, precision, repeatability and reproducibility', 9),
    ('PHYSICS',   2, 'calculations and graphs to facilitate the identification of patterns and relationships', 9),
    ('PHYSICS',   3, 'justifications for any iterations of the process', 9),
    ('PHYSICS',   4, 'the identification of and explanation for any initial anomalous results or observations', 9)
) AS item (subject_code, ordinal, text, page)
JOIN science_version sv USING (subject_code)
JOIN template_stage stage ON stage.version_id = sv.version_id AND stage.ordinal = 5;

-- Publish last: the V7 triggers freeze the structure from here on.
UPDATE template_version v SET status = 'PUBLISHED', published_at = now()
FROM science_version sv WHERE v.id = sv.version_id;

DROP VIEW science_version;
DROP TABLE science;
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd backend && ./mvnw test -Dtest='ScienceTemplateContentTest,ContentMigrationsTest,TemplateStructureGuardTest,BriefGuardTest'`
Expected: PASS. The 2A guard tests still pass: their `test-science` rows roll back and don't collide with the real slugs.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/content/V2__science_templates.sql \
        backend/src/test/java/ie/coursework/content/ScienceTemplateContentTest.java \
        backend/src/test/java/ie/coursework/shared/config/ContentMigrationsTest.java
git commit -m "Load the Biology, Chemistry and Physics templates from one content source"
```

---

## Task 4: Every quote is on its page

**Files:**
- Create: `backend/src/test/java/ie/coursework/content/SourceTextTest.java`

- [ ] **Step 1: Write the test**

```java
package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Roadmap §4.4: never invent SEC or NCCA content. Every string the app shows as the documents' own words is
 * looked up on the page its source_ref names. All misses are reported together, each with where the text
 * really is (if anywhere), so one run shows every problem.
 *
 * <p>Checkpoint {@code text} and {@code basis} aren't here: they're working wording for teachers to review
 * (design §7.3), and their quote is. 2C extends {@link #quotedContent()} with the brief's fields.
 */
class SourceTextTest extends PostgresIntegrationTest {

    record Quoted(String what, String sourceRef, String text) {}

    @Test
    void everyQuotedStringIsOnThePageItsSourceRefNames() {
        List<Quoted> quoted = quotedContent();
        List<String> misses = new ArrayList<>();
        for (Quoted q : quoted) {
            SourceRef ref = SourceRef.parse(q.sourceRef());
            if (!SourceDocuments.startsOnPage(ref, q.text())) {
                misses.add("%s (%s) not on that page; found on printed pages %s: \"%s\"".formatted(
                        q.what(), q.sourceRef(), SourceDocuments.printedPagesContaining(ref.key(), q.text()), q.text()));
            }
        }

        assertThat(quoted).hasSizeGreaterThan(150);
        assertThat(misses).as(String.join("\n", misses)).isEmpty();
    }

    private List<Quoted> quotedContent() {
        return jdbcTemplate.query("""
                SELECT 'stage description' AS what, source_ref, description AS text FROM template_stage
                UNION ALL SELECT 'process note', process_note_source_ref, process_note FROM template_version
                UNION ALL SELECT 'checkpoint quote', source_ref, source_quote FROM template_checkpoint
                UNION ALL SELECT 'prompt', source_ref, text FROM template_prompt
                UNION ALL SELECT 'prompt heading', source_ref, heading FROM template_prompt WHERE heading IS NOT NULL
                UNION ALL SELECT 'section name', source_ref, name FROM template_section
                UNION ALL SELECT 'section indicative content', source_ref, unnest(indicative_content) FROM template_section
                UNION ALL SELECT 'band name', source_ref, name FROM template_mark_band WHERE name IS NOT NULL
                UNION ALL SELECT 'band criterion', source_ref, unnest(criteria) FROM template_mark_band
                UNION ALL
                SELECT 'stage name', brief_doc.key || ' p. 5', s.name
                FROM template_stage s
                JOIN template_version v ON v.id = s.version_id
                JOIN component_template t ON t.id = v.template_id
                JOIN (VALUES ('biology-in-practice-investigation', 'SEC-2027L025C2EL'),
                             ('chemistry-in-practice-investigation', 'SEC-2027L022C2EL'),
                             ('physics-in-practice-investigation', 'SEC-2027L021C2EL'),
                             ('business-alive-investigative-study', 'SEC-2027L033C2EL')) AS brief_doc (slug, key)
                  ON brief_doc.slug = t.slug
                """, (rs, i) -> new Quoted(rs.getString("what"), rs.getString("source_ref"), rs.getString("text")));
    }
}
```

The stage-name part maps slugs to the 2027 brief by hand because the briefs aren't loaded until 2C. 2C replaces that join with `annual_brief`.

- [ ] **Step 2: Run it**

Run: `cd backend && ./mvnw test -Dtest=SourceTextTest`
Expected: PASS (192 strings). This test would have failed before Task 3 only by finding too few rows, so check it bites: temporarily change one word of a Chemistry prompt in your **local, uncommitted** copy of `V2__science_templates.sql`, run the test, and confirm it names that prompt with the page where the real text is. Then `git checkout backend/src/main/resources/db/content/V2__science_templates.sql`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/ie/coursework/content/SourceTextTest.java
git commit -m "Check every quoted template string against the page its source names"
```

---

## Task 5: Review and docs

- [ ] **Step 1: `make verify`**

Run: `make verify`
Expected: `verify: all checks passed`.

- [ ] **Step 2: Docs**

- `docs/ARCHITECTURE.md` §5: add a bullet: "Content migrations so far: `V1__subjects.sql`, `V2__science_templates.sql` (Biology, Chemistry, Physics v1). Every quoted string carries `source_ref` = `'<doc key> p. <printed page>'`; `content/SourceDocuments` maps keys to the PDFs in `docs/newDevelopement/subjectDocs/` and `SourceTextTest` checks each string is on its page. A content change that fails it is wrong until the PDF says otherwise."
- `CLAUDE.md` "Rules that don't bend", after the `source_ref` rule, append: "`SourceTextTest` checks each quoted string against its PDF page; never reword content to make it pass."
- `docs/PILOT-ROADMAP.md` §1: 2B built; §8.2 2B row: plan path.

- [ ] **Step 3: Ask Tim for the content review (Gate P2 item)**

The PR description lists, for Tim to tick against the PDFs:

```markdown
### Content review: science templates v1
Read `backend/src/main/resources/db/content/V2__science_templates.sql` beside the PDFs.
- [ ] Biology: stages, hours, descriptions (NCCA-BIO p. 5-9), sections and bands (SEC brief p. 7-8), checkpoints and quotes, prompts
- [ ] Chemistry: the same against NCCA-CHEM and 2027L022C2EL
- [ ] Physics: the same against NCCA-PHYS and 2027L021C2EL
- [ ] The checkpoint wording is fit to show teachers for review (Q1)
```

When Tim has ticked them, record it in `docs/HANDOFF.md` under "Gate P2 — content review" with the date and what was checked. **Katelyn's review of the Biology checkpoints** is a separate Gate P2 item; record it the same way when it happens.

- [ ] **Step 4: Commit**

```bash
git add docs/ARCHITECTURE.md CLAUDE.md docs/PILOT-ROADMAP.md docs/HANDOFF.md
git commit -m "Record the science content, its source check and the review it needs"
```

---

## Gate 2B

- [ ] `make verify` green, including `SourceTextTest` and `ScienceTemplateContentTest`
- [ ] Changing a published template's structure in a migration fails the suite (2A's guard tests, and applying such a migration raises `check_violation`)
- [ ] Tim has read V2 against the PDFs (recorded in `docs/HANDOFF.md`)
- [ ] PR `pilot/2b-science-content` → `pilotMain`
