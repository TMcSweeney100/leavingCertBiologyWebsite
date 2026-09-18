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
        List<Quoted> quoted = new ArrayList<>(jdbcTemplate.query("""
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
                SELECT 'stage name', 'SEC-' || b.sec_code || ' p. 5', s.name
                FROM template_stage s JOIN annual_brief b ON b.template_version_id = s.version_id
                UNION ALL SELECT 'brief topic title', 'SEC-' || sec_code || ' p. 6', topic_title FROM annual_brief WHERE topic_title IS NOT NULL
                UNION ALL SELECT 'brief topic line', 'SEC-' || sec_code || ' p. 6', line
                          FROM annual_brief, unnest(string_to_array(topic_body, E'\\n')) AS line WHERE btrim(line) <> ''
                UNION ALL SELECT 'brief words not counted', 'SEC-' || sec_code || ' p. ' || CASE WHEN sec_code = '2027L033C2EL' THEN 5 ELSE 7 END, words_not_counted FROM annual_brief
                UNION ALL SELECT 'brief image note', 'SEC-' || sec_code || ' p. ' || CASE WHEN sec_code = '2027L033C2EL' THEN 5 ELSE 7 END, image_note FROM annual_brief WHERE image_note IS NOT NULL
                UNION ALL SELECT 'brief rule key', source_ref, key FROM brief_rule
                """, (rs, i) -> new Quoted(rs.getString("what"), rs.getString("source_ref"), rs.getString("text"))));
        // A rule's value can join table cells ("Left margin 20 mm. Right margin 20 mm."), so each sentence is
        // checked on its own, without its closing full stop.
        quoted.addAll(jdbcTemplate.query("""
                SELECT 'brief rule value' AS what, r.source_ref, rtrim(part, '.') AS text
                FROM brief_rule r, unnest(regexp_split_to_array(r.value, '(?<=\\.) ')) AS part
                """, (rs, i) -> new Quoted(rs.getString("what"), rs.getString("source_ref"), rs.getString("text"))));
        return quoted;
    }
}
