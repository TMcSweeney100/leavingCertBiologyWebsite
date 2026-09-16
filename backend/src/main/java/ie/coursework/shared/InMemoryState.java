package ie.coursework.shared;

/**
 * A bean that holds state in memory rather than in Postgres. Tests clear every such bean before
 * each test (PostgresIntegrationTest), the same way they truncate tables.
 */
public interface InMemoryState {
    void clear();
}
