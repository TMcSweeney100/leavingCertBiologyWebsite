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
