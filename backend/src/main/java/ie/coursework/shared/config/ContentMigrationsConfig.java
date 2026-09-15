package ie.coursework.shared.config;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Runs content migrations (db/content) straight after schema migrations (db/migration), with their
 * own history table.
 *
 * <p>Content changes every year and far more often than the schema; mixing the two makes "what
 * changed in the Biology template for 2028" unanswerable from the history (tech spec §6).
 *
 * <p>{@code baselineOnMigrate} is needed because the schema migration has already created tables
 * by the time this instance first looks, and Flyway refuses a non-empty schema with no history
 * table of its own. Baselining at version 0 means content V1 still applies.
 */
@Configuration
public class ContentMigrationsConfig {

    @Bean
    FlywayMigrationStrategy schemaThenContent(DataSource dataSource) {
        return schemaFlyway -> {
            schemaFlyway.migrate();
            Flyway.configure()
                    .dataSource(dataSource)
                    .locations("classpath:db/content")
                    .table("flyway_content_history")
                    .baselineOnMigrate(true)
                    .baselineVersion("0")
                    .validateOnMigrate(true)
                    .load()
                    .migrate();
        };
    }
}
