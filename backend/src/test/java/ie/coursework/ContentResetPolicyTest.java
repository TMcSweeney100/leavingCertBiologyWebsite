package ie.coursework;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Content tables survive the per-test reset. A content table missing from the preserved list would be
 * emptied by the first test in the JVM and every content test after it would fail far from the cause.
 */
class ContentResetPolicyTest extends PostgresIntegrationTest {

    @Test
    void everyTemplateAndBriefTableIsPreserved() {
        List<String> content = jdbcTemplate.queryForList("""
                SELECT tablename FROM pg_tables
                WHERE schemaname = 'public'
                  AND (tablename LIKE 'template\\_%' OR tablename IN ('component_template', 'annual_brief', 'brief_rule'))
                """, String.class);

        assertThat(content).isNotEmpty();
        assertThat(PRESERVED_TABLES).containsAll(content);
    }
}
