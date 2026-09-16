# Pilot 1A — Walking Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A request from a browser reaches Spring Boot through the Next.js same-origin proxy and comes back, with Postgres, problem details, CSRF, content migrations and the app feature flag all in place, deployed to EU hosting.

**Architecture:** `backend/` is a new Spring Boot 4.1.1 / Java 21 app following contentCreater's layout (feature packages, RFC 9457 problem details, one shared Testcontainers Postgres 18). The browser only ever calls `frontend/app/api/v1/[...path]/route.ts`, which forwards an allowlist of headers (cookies and the CSRF header in, `Set-Cookie` out) to Spring. App routes are hidden unless `APP_ENABLED=true` (roadmap R1), so the live BiPi site on `main` is unaffected.

**Tech Stack:** Spring Boot 4.1.1 (Spring Security 7.1, Flyway 12, Jackson 3), Maven wrapper, Postgres 18, Testcontainers 2, JUnit 5, AssertJ, MockMvc; Next.js 15.3.9, React 19, Vitest, jsdom, React Testing Library, Zod 4.

**Roadmap:** `docs/PILOT-ROADMAP.md` §8.1 1A. **Design:** `docs/PILOT-DESIGN.md` §5.

---

## Before you start

1. **Docker Desktop must be running.** Testcontainers and `make db-up` both need it. Check with `docker info` — if it hangs rather than failing, the usual cause is a full disk.
2. **Confirm roadmap §2 decisions R1–R17 with Tim**, or note which changed. This plan assumes all of them.
3. Baseline, from `frontend/`, which must be true before you touch anything:

```bash
npm test          # 74 passing
npx tsc --noEmit  # clean
npm run lint      # clean
```

4. Create the branch:

```bash
git checkout main && git pull
git checkout -b pilot/1a-walking-skeleton
```

**API names in this plan were checked against Spring Boot 4.1.1's BOM and Spring Security 7.0.5's jar.** Boot 4.1.1 manages Security 7.1.1. If a class or method named here doesn't compile, check the resolved jar (`javap -cp <jar> <class>`) before changing approach. Don't guess from Boot 3 memory: Boot 4 moved packages (for example `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc`) and Jackson 3 lives in `tools.jackson.*`.

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `CLAUDE.md` (root, new) | Monorepo conventions for every session | 1 |
| `docs/HANDOFF.md` (replaced) | Pilot status snapshot | 1, 12 |
| `docs/archive/bipi-site/` (new) | The finished site's planning docs | 1 |
| `frontend/BIPI-SITE-NOTES.md` (moved from `docs/CLAUDE.md`) | Live-site conventions, scope rules corrected | 1 |
| `.gitignore` (root, new) | Secrets and OS files | 1 |
| `backend/pom.xml`, `mvnw`, `.mvn/` | Build | 2, 6 |
| `backend/src/main/java/ie/coursework/CourseworkApplication.java` | Entry point | 2 |
| `backend/src/main/resources/application.yaml` | Configuration | 2, 6 |
| `backend/src/test/java/ie/coursework/PostgresIntegrationTest.java` | Shared container, per-test data reset | 2 |
| `compose.yaml`, `Makefile` | Local database and commands | 3 |
| `backend/src/main/java/ie/coursework/shared/error/*` | `ErrorCode`, `DomainException`, `FieldError`, `ProblemDetailsAdvice`, `ProblemResponses` | 4 |
| `backend/src/main/java/ie/coursework/shared/config/ContentMigrationsConfig.java` | Second Flyway instance for `db/content` | 5 |
| `backend/src/main/resources/db/migration/V1__subject_table.sql` | Schema | 5 |
| `backend/src/main/resources/db/content/V1__subjects.sql` | Content | 5 |
| `backend/src/main/java/ie/coursework/security/SecurityConfig.java`, `CsrfController.java` | Filter chain, CSRF cookie endpoint | 6 |
| `backend/src/main/java/ie/coursework/shared/web/HealthController.java` | `GET /api/v1/health` | 6 |
| `frontend/vitest.config.ts`, `frontend/test/setup.ts` | Spec runner | 7 |
| `frontend/app/api/v1/[...path]/route.ts` + `route.spec.ts` | Same-origin proxy | 9 |
| `frontend/lib/api/problem.ts`, `client.ts`, `server.ts` + specs | Typed API client | 10 |
| `frontend/lib/app/routes.ts` + `routes.test.ts` | Reserved route names, app flag | 8 |
| `frontend/app/(auth)/layout.tsx`, `frontend/app/(app)/layout.tsx`, `frontend/app/(auth)/login/page.tsx` + specs | Flag gate, placeholder login | 8 |
| `backend/Dockerfile`, `backend/.dockerignore`, `frontend/vercel.json` | Deploy | 11 |

---

## Task 1: Housekeeping

No tests: documents only. Roadmap R14, design §12.

**Files:**
- Create: `CLAUDE.md`, `.gitignore`, `docs/HANDOFF.md` (after moving the old one)
- Move: see Step 2
- Modify: `frontend/BIPI-SITE-NOTES.md` (after the move)

- [x] **Step 1: Commit the design document where Tim put it**

```bash
git add docs/PILOT-DESIGN.md docs/PILOT-ROADMAP.md docs/superpowers/plans/2026-09-15-pilot-1*.md
git rm --cached docs/superpowers/specs/2026-09-14-coursework-pilot-design.md
git commit -m "Pilot design, roadmap and Phase 1 plans

Moves the pilot design to docs/PILOT-DESIGN.md and adds the phase roadmap
and the detailed plans for milestones 1A and 1B.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Expected: `git status` no longer lists either design path.

- [x] **Step 2: Archive the live site's finished planning documents**

```bash
mkdir -p docs/archive/bipi-site/plans docs/archive/bipi-site/specs
git mv docs/IMPLEMENTATION_PLAN.md docs/archive/bipi-site/IMPLEMENTATION_PLAN.md
git mv docs/HANDOFF.md docs/archive/bipi-site/HANDOFF.md
git mv docs/bipi-schedule-design-brief.md docs/archive/bipi-site/bipi-schedule-design-brief.md
git mv docs/bipi-schedule-website-spec.md docs/archive/bipi-site/bipi-schedule-website-spec.md
git mv docs/design_handoff_bipi_schedule docs/archive/bipi-site/design_handoff_bipi_schedule
git mv docs/superpowers/plans/2026-09-01-phase-a-make-it-correct.md docs/archive/bipi-site/plans/
git mv docs/superpowers/specs/2026-09-01-bipi-multi-class-design.md docs/archive/bipi-site/specs/
git mv frontend/docs/superpowers/plans/2026-09-02-phase-b-one-config-many-classes.md docs/archive/bipi-site/plans/
git mv docs/CLAUDE.md frontend/BIPI-SITE-NOTES.md
```

`docs/Biology in Practice Investigation Brief 2027.pdf` stays where it is: it's a source document, and design §4.1 cites that path.

- [x] **Step 3: Repoint references inside the moved notes**

```bash
cd frontend
sed -i '' \
  -e 's#docs/IMPLEMENTATION_PLAN.md#docs/archive/bipi-site/IMPLEMENTATION_PLAN.md#g' \
  -e 's#docs/superpowers/plans/2026-09-02-phase-b-one-config-many-classes.md#docs/archive/bipi-site/plans/2026-09-02-phase-b-one-config-many-classes.md#g' \
  -e 's#docs/design_handoff_bipi_schedule/#docs/archive/bipi-site/design_handoff_bipi_schedule/#g' \
  -e 's#Next.js 16.3.3#Next.js 15.3.9 (pinned: Next 16 broke Vercel deploys, commit 8b077e8)#' \
  BIPI-SITE-NOTES.md
grep -n 'IMPLEMENTATION_PLAN\|16.3.3\|design_handoff' BIPI-SITE-NOTES.md | head
cd ..
```

Expected: every hit now shows an `archive/bipi-site` path, and no `16.3.3` remains.

- [x] **Step 4: Correct the scope rules (design §12)**

In `frontend/BIPI-SITE-NOTES.md`, use the Edit tool.

Replace the line:

```
Do not add a backend, database, authentication, tracking, forms, accounts, or content management system unless the requirements explicitly change.
```

with:

```
**This file covers the live public schedule only** (`app/[class]/`, `components/bipi/`, `lib/schedule*`, `lib/briefs/`, `lib/classes/`). That part of the site stays read-only: no accounts, tracking or forms on those pages. The coursework pilot app — which does have a backend, accounts and a database — follows the root `CLAUDE.md` and `docs/PILOT-ROADMAP.md`.
```

Replace the whole `## Scope boundaries for version 1` section (heading through the line ending `should not delay the core timeline experience.`) with:

```
## Scope boundaries for the public schedule

The public schedule pages remain a read-only view of a class's dates. Student accounts, progress tracking, logs and multi-class dashboards belong to the pilot app, not to these pages. Don't add them here.
```

Replace the opening line of `# CLAUDE.md` with `# BiPi public schedule — site notes`.

- [x] **Step 5: Write the root `CLAUDE.md`**

```markdown
# CLAUDE.md

This is a living file. Keep it short and true: add a convention when a task confirms one, and delete anything that stops being true.

## What this repository is

Two things that share a Next.js app:

1. **The live BiPi public schedule** at `/[class]` — read-only, deployed from `main` to Vercel. Before touching `app/[class]/`, `components/bipi/`, `lib/schedule*`, `lib/briefs/` or `lib/classes/`, read `frontend/BIPI-SITE-NOTES.md`.
2. **The Leaving Cert coursework pilot** — a Spring Boot API in `backend/` behind a same-origin Next.js proxy, plus app pages in `frontend/app/(app)` and `frontend/app/(auth)`.

## Read before planning or building pilot work

1. `docs/PILOT-ROADMAP.md` — status board, decisions, pages, API, gates. Start at its §0.
2. `docs/HANDOFF.md` — where the last session stopped.
3. The current milestone plan in `docs/superpowers/plans/`.
4. `docs/PILOT-DESIGN.md` — the sections the plan cites. It wins over the roadmap; the roadmap wins over the specs in `docs/newDevelopement/`.

## Commands (repo root)

- `make db-up` / `make db-down` — Postgres 18 in Docker
- `make backend-run` — Spring Boot on :8080
- `make frontend-run` — Next.js on :3000 (needs `APP_ENABLED=true` in `frontend/.env.local` for app pages)
- `make verify` — backend tests, frontend lint, types, tests, build. Green before every task commit.
- `make e2e` — Playwright journey against a throwaway database

## Rules that don't bend

- **Test first.** Watch the test fail, then make it pass. No production code without a failing test.
- **Never invent SEC or NCCA content.** Every checkpoint and prompt carries a `source_ref`. If a source is missing, stop and ask.
- **All authorisation happens in Spring.** Every service method takes the acting user. Anything outside the actor's scope is a 404, never a 403.
- **The browser only talks to `/api/v1/*` on its own origin.** `BACKEND_INTERNAL_URL` is never exposed to client code.
- **No file or blob columns, no upload endpoints, no server-side fetching of student links.**
- **Next.js stays on 15.3.9** until Vercel supports Next 16's Adapter API.
- **App routes stay behind `APP_ENABLED`** until the go-live gate.

## Backend conventions

- Base package `ie.coursework`. Feature packages: `domain` (no Spring), `application` (services), `adapter.persistence` (`JdbcClient` + SQL), `adapter.web` (controllers, request/response records).
- Errors: throw `DomainException(ErrorCode, detail)`. `ErrorCode` names are API contract.
- Schema migrations in `db/migration`; content in `db/content` (own history table). Never edit an applied migration.
- Tests needing Postgres extend `PostgresIntegrationTest`. It truncates every table except migration history and content tables before each test.

## Frontend conventions (pilot app)

- Tests: `lib/**/*.test.ts` run under `node --test` (existing convention); `**/*.spec.ts(x)` run under Vitest; `e2e/*.e2e.ts` under Playwright.
- Component specs query by role and accessible name. Restyles from design handoffs must keep them passing (`docs/PILOT-ROADMAP.md` §6.3).
- Server components call Spring through `lib/api/server.ts`; client components through `lib/api/client.ts`. Mutations happen from client components only.
```

- [x] **Step 6: Write the root `.gitignore`**

```gitignore
.DS_Store
.env
.env.*
!.env.example
backend/.env
```

And make the example files committable in `frontend/.gitignore` — append:

```gitignore
!.env.example
```

- [x] **Step 7: Write the new `docs/HANDOFF.md`**

```markdown
# Handoff — coursework pilot

Rewritten at the end of every session. The live BiPi site's final handoff is archived at `docs/archive/bipi-site/HANDOFF.md`; its open items (Katelyn's copy sign-offs, print page count) still stand.

## Where things are

- **Current milestone:** 1A Walking skeleton — `docs/superpowers/plans/2026-09-15-pilot-1a-walking-skeleton.md`
- **Branch:** `pilot/1a-walking-skeleton`
- **Last completed task:** Task 1 (housekeeping)

## Half-done

Nothing.

## Waiting on a human

- Roadmap §3 H1 (hosting vendor) — needed by Task 11
- Roadmap §9 R3, R4, R5 — calendar-bound, start now
```

- [x] **Step 8: Verify nothing in the live site broke, then commit**

```bash
cd frontend && npm test && npx tsc --noEmit && npm run lint && cd ..
git add -A
git commit -m "Archive BiPi site plans and add pilot CLAUDE.md and handoff

The site's planning documents move to docs/archive/bipi-site/. docs/CLAUDE.md
becomes frontend/BIPI-SITE-NOTES.md with its scope rules narrowed to the
public schedule and its Next.js version corrected to 15.3.9.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Expected: 74 tests passing, types and lint clean.

---

## Task 2: Backend scaffold

**Files:**
- Create: `backend/pom.xml`, `backend/.gitignore`, `backend/src/main/java/ie/coursework/CourseworkApplication.java`, `backend/src/main/resources/application.yaml`
- Copy: `backend/mvnw`, `backend/mvnw.cmd`, `backend/.mvn/wrapper/maven-wrapper.properties` from contentCreater
- Test: `backend/src/test/java/ie/coursework/PostgresIntegrationTest.java`, `backend/src/test/java/ie/coursework/CourseworkApplicationTests.java`

- [x] **Step 1: Copy the Maven wrapper**

```bash
mkdir -p backend/.mvn/wrapper
cp ../contentCreater/backend/mvnw ../contentCreater/backend/mvnw.cmd backend/
cp ../contentCreater/backend/.mvn/wrapper/maven-wrapper.properties backend/.mvn/wrapper/
chmod +x backend/mvnw
```

The wrapper uses `distributionType=only-script`, so no jar is committed.

- [x] **Step 2: Write `backend/pom.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.1.1</version>
        <relativePath/>
    </parent>
    <groupId>ie.coursework</groupId>
    <artifactId>coursework-backend</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>coursework-backend</name>
    <description>Leaving Cert coursework pilot API</description>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webmvc</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-jdbc</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-flyway</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webmvc-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-jdbc-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-flyway-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-testcontainers</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>testcontainers-postgresql</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>testcontainers-junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

- [x] **Step 3: Write `backend/.gitignore`**

```gitignore
target/
.env
.idea/
*.iml
.vscode/
```

- [x] **Step 4: Write the shared integration-test base**

`backend/src/test/java/ie/coursework/PostgresIntegrationTest.java`:

```java
package ie.coursework;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base class for tests that need a real PostgreSQL 18.
 *
 * <p>Singleton container: started once in a static initializer and never stopped, so every
 * subclass in the JVM shares one database. Don't switch this to {@code @Testcontainers} /
 * {@code @Container}: that extension stops the container after the first class, and every later
 * class fails with "Failed to obtain JDBC Connection" — but only in a full build.
 *
 * <p>Before each test, every table is truncated except migration history and migrated content.
 * The reset is by exclusion rather than by a list of app tables on purpose: a new app table is
 * reset without anyone remembering to add it, and a content table someone forgets to preserve
 * fails its content tests loudly instead of leaking rows between tests quietly.
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class PostgresIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18");

    static {
        POSTGRES.start();
    }

    /** Migration history and content tables. Phase 2 adds the template and brief tables here. */
    private static final Set<String> PRESERVED_TABLES =
            Set.of("flyway_schema_history", "flyway_content_history", "subject");

    @Autowired protected JdbcTemplate jdbcTemplate;

    @BeforeEach
    void resetApplicationData() {
        List<String> tables = jdbcTemplate
                .queryForList("SELECT tablename FROM pg_tables WHERE schemaname = 'public'", String.class)
                .stream()
                .filter(table -> !PRESERVED_TABLES.contains(table))
                .toList();

        if (!tables.isEmpty()) {
            jdbcTemplate.execute("TRUNCATE TABLE " + String.join(", ", tables) + " CASCADE");
        }
    }
}
```

- [x] **Step 5: Write the failing test**

`backend/src/test/java/ie/coursework/CourseworkApplicationTests.java`:

```java
package ie.coursework;

import org.junit.jupiter.api.Test;

class CourseworkApplicationTests extends PostgresIntegrationTest {

    @Test
    void contextLoadsAgainstPostgres() {
        // Starting the context runs Flyway against the container, so this fails if the app can't
        // reach Postgres 18 or a migration doesn't apply.
    }
}
```

- [x] **Step 6: Run it and watch it fail**

Run: `cd backend && ./mvnw test`
Expected: FAIL — compilation or "Unable to find a @SpringBootConfiguration", because no application class exists.

- [x] **Step 7: Write the application class and configuration**

`backend/src/main/java/ie/coursework/CourseworkApplication.java`:

```java
package ie.coursework;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CourseworkApplication {

    public static void main(String[] args) {
        SpringApplication.run(CourseworkApplication.class, args);
    }
}
```

`backend/src/main/resources/application.yaml`:

```yaml
spring:
  application:
    name: coursework

  config:
    # Local overrides from backend/.env (git-ignored). Containers have no such file; the host
    # injects environment variables instead.
    import: optional:file:.env[.properties]

  datasource:
    # JDBC form, not the postgres:// URL most hosts print. See Task 11.
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/coursework}
    username: ${DATABASE_USERNAME:coursework}
    password: ${DATABASE_PASSWORD:coursework}

  flyway:
    enabled: true
    locations: classpath:db/migration
    # Applied migrations are never edited. Changes get a new migration.
    validate-on-migrate: true

server:
  # Loopback locally. The container image sets SERVER_ADDRESS=0.0.0.0.
  address: ${SERVER_ADDRESS:127.0.0.1}
  port: ${SERVER_PORT:8080}
  shutdown: graceful

management:
  endpoints:
    web:
      exposure:
        include: health
  endpoint:
    health:
      show-details: never

---
spring:
  config:
    activate:
      on-profile: test
# Testcontainers supplies the datasource through @ServiceConnection.
```

Also create the (empty for now) migration directory so Flyway's location exists:

```bash
mkdir -p backend/src/main/resources/db/migration backend/src/main/resources/db/content
touch backend/src/main/resources/db/migration/.gitkeep backend/src/main/resources/db/content/.gitkeep
```

- [x] **Step 8: Run the test and watch it pass**

Run: `cd backend && ./mvnw test`
Expected: `Tests run: 1, Failures: 0, Errors: 0` and `BUILD SUCCESS`. The first run downloads Maven, dependencies and the `postgres:18` image, so it's slow.

- [x] **Step 9: Commit**

```bash
git add backend
git commit -m "Scaffold Spring Boot 4.1 backend against Postgres 18

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `compose.yaml` and `Makefile`

Infrastructure only; verified by running it.

**Files:**
- Create: `compose.yaml`, `Makefile`, `backend/.env.example`

- [x] **Step 1: Write `compose.yaml`**

```yaml
services:
  postgres:
    image: postgres:18
    container_name: coursework-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DATABASE_NAME:-coursework}
      POSTGRES_USER: ${DATABASE_USERNAME:-coursework}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD:-coursework}
    ports:
      - "5432:5432"
    volumes:
      # Mounted at /var/lib/postgresql, not .../data. From Postgres 18 the official image keeps
      # data in a version-specific subdirectory, and a volume at the old path is never written.
      - postgres-data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USERNAME:-coursework} -d ${DATABASE_NAME:-coursework}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  # Disposable database for `make e2e` only. No volume, unusual port, own profile.
  postgres-e2e:
    image: postgres:18
    container_name: coursework-postgres-e2e
    profiles:
      - e2e
    environment:
      POSTGRES_DB: coursework_e2e
      POSTGRES_USER: coursework
      POSTGRES_PASSWORD: coursework
    ports:
      - "55433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U coursework -d coursework_e2e"]
      interval: 2s
      timeout: 5s
      retries: 15
      start_period: 5s

volumes:
  postgres-data:
```

If port 5432 is already taken by another project's Postgres (contentCreater uses it too), stop that one first: `docker stop content-engine-postgres`.

- [x] **Step 2: Write the `Makefile`**

Recipe lines must start with a tab, not spaces.

```makefile
.PHONY: help verify e2e db-up db-down db-logs backend-test backend-verify backend-run \
        frontend-install frontend-lint frontend-typecheck frontend-test frontend-build frontend-run clean

help:
	@echo "Coursework pilot"
	@echo ""
	@echo "  make db-up               Start PostgreSQL 18"
	@echo "  make db-down             Stop PostgreSQL"
	@echo "  make backend-test        Backend tests (needs Docker)"
	@echo "  make backend-run         Spring Boot on :8080"
	@echo "  make frontend-run        Next.js on :3000"
	@echo "  make verify              Backend tests, frontend lint, types, tests, build"
	@echo "  make e2e                 Playwright journey (needs Docker; slow)"

# The frontend build runs last: it's the slowest, and a type or test failure should show first.
verify: backend-verify frontend-lint frontend-typecheck frontend-test frontend-build
	@echo ""
	@echo "verify: all checks passed"

e2e:
	./scripts/e2e.sh

db-up:
	docker compose up -d postgres
	@until [ "$$(docker inspect -f '{{.State.Health.Status}}' coursework-postgres 2>/dev/null)" = "healthy" ]; do sleep 1; done
	@echo "PostgreSQL is ready on localhost:5432"

db-down:
	docker compose down

db-logs:
	docker compose logs -f postgres

backend-test:
	cd backend && ./mvnw test

backend-verify:
	cd backend && ./mvnw verify

backend-run:
	cd backend && ./mvnw spring-boot:run

frontend-install:
	cd frontend && npm ci

frontend-lint:
	cd frontend && npm run lint

frontend-typecheck:
	cd frontend && npm run typecheck

frontend-test:
	cd frontend && npm test

frontend-build:
	cd frontend && npm run build

frontend-run:
	cd frontend && npm run dev

clean:
	cd backend && ./mvnw clean
	rm -rf frontend/.next frontend/test-results frontend/playwright-report
```

`scripts/e2e.sh` arrives in 1D, and `npm run typecheck` in Task 7. Until then `make verify` fails at `frontend-typecheck`; that's expected.

- [x] **Step 3: Write `backend/.env.example`**

```bash
# Copy to backend/.env for local overrides. Never commit backend/.env.
DATABASE_URL=jdbc:postgresql://localhost:5432/coursework
DATABASE_USERNAME=coursework
DATABASE_PASSWORD=coursework
PROXY_SHARED_SECRET=local-dev-proxy-secret
```

- [x] **Step 4: Verify**

```bash
make db-up
make backend-run
```

In a second terminal: `curl -s http://127.0.0.1:8080/actuator/health`
Expected: `{"status":"UP"}`. Stop the backend with Ctrl-C.

- [x] **Step 5: Commit**

```bash
git add compose.yaml Makefile backend/.env.example
git commit -m "Add compose database and Makefile targets

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Problem details

**Files:**
- Create: `backend/src/main/java/ie/coursework/shared/error/ErrorCode.java`, `DomainException.java`, `FieldError.java`, `ProblemDetailsAdvice.java`, `ProblemResponses.java`
- Test: `backend/src/test/java/ie/coursework/shared/error/ProblemDetailsAdviceTest.java`, `ErrorCodeTest.java`

- [x] **Step 1: Write the failing tests**

`ErrorCodeTest.java`:

```java
package ie.coursework.shared.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ErrorCodeTest {

    @Test
    void typeIsAStableUrnDerivedFromTheName() {
        assertThat(ErrorCode.CSRF_TOKEN_INVALID.type()).isEqualTo("urn:coursework:problem:csrf-token-invalid");
    }

    @Test
    void everyCodeHasATitleAndAnErrorStatus() {
        for (ErrorCode code : ErrorCode.values()) {
            assertThat(code.title()).as(code.name()).isNotBlank();
            assertThat(code.status().isError()).as(code.name()).isTrue();
        }
    }
}
```

`ProblemDetailsAdviceTest.java`:

```java
package ie.coursework.shared.error;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Pins the response shape the frontend's ApiError parses. Filters are off so this stays a test of
 * the advice alone once Spring Security is on the classpath (Task 6).
 */
@WebMvcTest(controllers = ProblemDetailsAdviceTest.TestController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({ProblemDetailsAdvice.class, ProblemDetailsAdviceTest.TestController.class})
class ProblemDetailsAdviceTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void domainExceptionBecomesProblemDetailsWithACode() throws Exception {
        mockMvc.perform(get("/test/domain"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.title").value("Not found"))
                .andExpect(jsonPath("$.detail").value("No class with that id."))
                .andExpect(jsonPath("$.instance").value("/test/domain"))
                .andExpect(jsonPath("$.type").value("urn:coursework:problem:not-found"))
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    void beanValidationListsEachField() throws Exception {
        mockMvc.perform(post("/test/validated").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("name"))
                .andExpect(jsonPath("$.fieldErrors[0].message").isNotEmpty());
    }

    @Test
    void unreadableJsonIsAMalformedRequestNotA500() throws Exception {
        mockMvc.perform(post("/test/validated").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    }

    @Test
    void unknownPathIsANotFoundProblem() throws Exception {
        mockMvc.perform(get("/test/nothing-here"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void wrongMethodIsMethodNotAllowed() throws Exception {
        mockMvc.perform(post("/test/domain"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
    }

    @Test
    void unexpectedExceptionHidesItsMessage() throws Exception {
        String body = mockMvc.perform(get("/test/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("jdbc:postgresql://secret");
    }

    record NamedRequest(@NotBlank String name) {}

    @RestController
    static class TestController {
        @GetMapping("/test/domain")
        String domain() {
            throw new DomainException(ErrorCode.NOT_FOUND, "No class with that id.");
        }

        @PostMapping("/test/validated")
        String validated(@Valid @RequestBody NamedRequest request) {
            return request.name();
        }

        @GetMapping("/test/boom")
        String boom() {
            throw new IllegalStateException("could not connect to jdbc:postgresql://secret");
        }
    }
}
```

- [x] **Step 2: Run them and watch them fail**

Run: `cd backend && ./mvnw test -Dtest='ErrorCodeTest,ProblemDetailsAdviceTest'`
Expected: FAIL — compilation errors, `ErrorCode` and friends don't exist.

- [x] **Step 3: Write the implementation**

`ErrorCode.java`:

```java
package ie.coursework.shared.error;

import java.util.Locale;
import org.springframework.http.HttpStatus;

/**
 * Stable, machine-readable error identifiers, returned as {@code code} in every problem response.
 *
 * <p>The frontend branches on these names, so each one is API contract: renaming is a breaking
 * change. Later milestones add their own codes here.
 */
public enum ErrorCode {
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Validation failed"),
    MALFORMED_REQUEST(HttpStatus.BAD_REQUEST, "Malformed request"),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Not signed in"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Forbidden"),
    CSRF_TOKEN_INVALID(HttpStatus.FORBIDDEN, "Security token missing or invalid"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Not found"),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Internal error");

    private static final String TYPE_PREFIX = "urn:coursework:problem:";

    private final HttpStatus status;
    private final String title;

    ErrorCode(HttpStatus status, String title) {
        this.status = status;
        this.title = title;
    }

    public HttpStatus status() {
        return status;
    }

    public String title() {
        return title;
    }

    public String type() {
        return TYPE_PREFIX + name().toLowerCase(Locale.ROOT).replace('_', '-');
    }
}
```

`FieldError.java`:

```java
package ie.coursework.shared.error;

/** One invalid field, as returned in {@code fieldErrors}. */
public record FieldError(String field, String message) {}
```

`DomainException.java`:

```java
package ie.coursework.shared.error;

import java.util.List;

/**
 * An expected failure the user can understand and act on. Its detail is sent to the client, so it
 * must never contain a secret, a stack detail or another user's data. Anything thrown that isn't a
 * DomainException is treated as a bug and returned as an opaque 500.
 */
public class DomainException extends RuntimeException {

    private final ErrorCode errorCode;
    private final transient List<FieldError> fieldErrors;

    public DomainException(ErrorCode errorCode, String detail) {
        this(errorCode, detail, List.of());
    }

    public DomainException(ErrorCode errorCode, String detail, List<FieldError> fieldErrors) {
        super(detail);
        this.errorCode = errorCode;
        this.fieldErrors = List.copyOf(fieldErrors);
    }

    public ErrorCode errorCode() {
        return errorCode;
    }

    public List<FieldError> fieldErrors() {
        return fieldErrors;
    }
}
```

`ProblemDetailsAdvice.java`:

```java
package ie.coursework.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Turns exceptions into RFC 9457 problem details, each with a stable {@code code}. */
@RestControllerAdvice
public class ProblemDetailsAdvice {

    private static final Logger log = LoggerFactory.getLogger(ProblemDetailsAdvice.class);

    @ExceptionHandler(DomainException.class)
    ResponseEntity<ProblemDetail> domain(DomainException exception, HttpServletRequest request) {
        log.debug("{} at {}: {}", exception.errorCode(), request.getRequestURI(), exception.getMessage());
        return respond(exception.errorCode(), exception.getMessage(), request, exception.fieldErrors());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> validation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        List<FieldError> fields = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldError(error.getField(),
                        error.getDefaultMessage() == null ? "is invalid" : error.getDefaultMessage()))
                .toList();
        return respond(ErrorCode.VALIDATION_FAILED, "One or more fields are invalid.", request, fields);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ProblemDetail> unreadable(HttpServletRequest request) {
        return respond(ErrorCode.MALFORMED_REQUEST, "The request body could not be read.", request, List.of());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ProblemDetail> noResource(HttpServletRequest request) {
        return respond(ErrorCode.NOT_FOUND, "No such resource.", request, List.of());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ProblemDetail> methodNotAllowed(HttpServletRequest request) {
        return respond(ErrorCode.METHOD_NOT_ALLOWED, "That method isn't supported here.", request, List.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unexpected(Exception exception, HttpServletRequest request) {
        // Full detail stays in the server log. The message could hold a connection string.
        log.error("Unhandled exception at {}", request.getRequestURI(), exception);
        return respond(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred.", request, List.of());
    }

    private ResponseEntity<ProblemDetail> respond(
            ErrorCode code, String detail, HttpServletRequest request, List<FieldError> fieldErrors) {
        ProblemDetail problem = ProblemDetail.forStatus(code.status());
        problem.setType(URI.create(code.type()));
        problem.setTitle(code.title());
        problem.setDetail(detail);
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", code.name());
        problem.setProperty("fieldErrors", fieldErrors);
        return ResponseEntity.of(problem).build();
    }
}
```

`ProblemResponses.java` — for filters, which run before the advice can:

```java
package ie.coursework.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Writes a problem response directly, for security filters that reject a request before it
 * reaches a controller. Same shape as {@link ProblemDetailsAdvice}.
 */
@Component
public class ProblemResponses {

    private final ObjectMapper objectMapper;

    public ProblemResponses(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void write(HttpServletRequest request, HttpServletResponse response, ErrorCode code, String detail)
            throws IOException {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", code.type());
        body.put("title", code.title());
        body.put("status", code.status().value());
        body.put("detail", detail);
        body.put("instance", request.getRequestURI());
        body.put("code", code.name());
        body.put("fieldErrors", List.of());

        response.setStatus(code.status().value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
```

- [x] **Step 4: Run the tests and watch them pass**

Run: `cd backend && ./mvnw test -Dtest='ErrorCodeTest,ProblemDetailsAdviceTest'`
Expected: 8 tests, 0 failures.

If `unknownPathIsANotFoundProblem` returns a plain 404 with no body, check that `spring.web.resources.add-mappings` hasn't been set to `false`: Spring throws `NoResourceFoundException` for an unmapped path only while static resource handling is on.

- [x] **Step 5: Run the whole suite, then commit**

```bash
cd backend && ./mvnw test && cd ..
git add backend
git commit -m "Return RFC 9457 problem details with stable codes

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Content migrations and subjects

Design §7.1, tech spec §6, roadmap R15.

**Files:**
- Create: `backend/src/main/java/ie/coursework/shared/config/ContentMigrationsConfig.java`
- Create: `backend/src/main/resources/db/migration/V1__subject_table.sql`, `backend/src/main/resources/db/content/V1__subjects.sql`
- Delete: the two `.gitkeep` files from Task 2
- Test: `backend/src/test/java/ie/coursework/shared/config/ContentMigrationsTest.java`

- [x] **Step 1: Write the failing test**

```java
package ie.coursework.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Content (templates, briefs, reference data) migrates through its own Flyway instance and history
 * table, after the schema. Every test here runs after PostgresIntegrationTest's reset, so the
 * subjects being present also proves the reset preserves content.
 */
class ContentMigrationsTest extends PostgresIntegrationTest {

    @Test
    void theFourPilotSubjectsAreLoaded() {
        List<String> codes = jdbcTemplate.queryForList("SELECT code FROM subject ORDER BY code", String.class);

        assertThat(codes).containsExactly("BIOLOGY", "BUSINESS", "CHEMISTRY", "PHYSICS");
    }

    @Test
    void contentHasItsOwnHistoryTable() {
        Integer applied = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM flyway_content_history WHERE success AND description = 'subjects'",
                Integer.class);

        assertThat(applied).isEqualTo(1);
    }

    @Test
    void schemaHistoryHoldsOnlySchemaMigrations() {
        List<String> descriptions = jdbcTemplate.queryForList(
                "SELECT description FROM flyway_schema_history WHERE version IS NOT NULL", String.class);

        assertThat(descriptions).contains("subject table").doesNotContain("subjects");
    }

    @Test
    void noMigrationInEitherHistoryFailed() {
        Integer failed = jdbcTemplate.queryForObject(
                "SELECT (SELECT count(*) FROM flyway_schema_history WHERE NOT success)"
                        + " + (SELECT count(*) FROM flyway_content_history WHERE NOT success)",
                Integer.class);

        assertThat(failed).isZero();
    }
}
```

- [x] **Step 2: Run it and watch it fail**

Run: `cd backend && ./mvnw test -Dtest=ContentMigrationsTest`
Expected: FAIL — `relation "subject" does not exist`.

- [x] **Step 3: Write the schema and content migrations**

`db/migration/V1__subject_table.sql`:

```sql
-- Reference table. Its rows are content (db/content), so they can change with review
-- and without a schema migration.
CREATE TABLE subject (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    code        text        NOT NULL UNIQUE CONSTRAINT subject_code_format CHECK (code ~ '^[A-Z_]+$'),
    name        text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
```

`db/content/V1__subjects.sql`:

```sql
-- The four pilot subjects (design D4).
INSERT INTO subject (code, name) VALUES
    ('BIOLOGY',   'Biology'),
    ('CHEMISTRY', 'Chemistry'),
    ('PHYSICS',   'Physics'),
    ('BUSINESS',  'Business');
```

```bash
rm backend/src/main/resources/db/migration/.gitkeep backend/src/main/resources/db/content/.gitkeep
```

- [x] **Step 4: Write the second Flyway instance**

`ContentMigrationsConfig.java`:

```java
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
```

- [x] **Step 5: Run the test and watch it pass**

Run: `cd backend && ./mvnw test -Dtest=ContentMigrationsTest`
Expected: 4 tests, 0 failures.

- [x] **Step 6: Run the whole suite, then commit**

```bash
cd backend && ./mvnw test && cd ..
git add backend
git commit -m "Migrate content separately from schema, starting with subjects

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Security baseline, health and the CSRF cookie

Design §5.1–5.2. Everything under `/api/v1` needs a session except health and the CSRF endpoint. CSRF protection is on from the first commit (developerJournal turned it off; this project doesn't).

**Files:**
- Modify: `backend/pom.xml`
- Create: `backend/src/main/java/ie/coursework/security/SecurityConfig.java`, `CsrfController.java`
- Create: `backend/src/main/java/ie/coursework/shared/web/HealthController.java`
- Test: `backend/src/test/java/ie/coursework/security/SecurityBaselineTest.java`

- [x] **Step 1: Add Spring Security to `pom.xml`**

Inside `<dependencies>`, after `spring-boot-starter-actuator`:

```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
```

and with the test dependencies:

```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security-test</artifactId>
            <scope>test</scope>
        </dependency>
```

- [x] **Step 2: Write the failing test**

```java
package ie.coursework.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class SecurityBaselineTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void actuatorHealthIsPublicForTheHost() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void anythingElseWithoutASessionIsAnUnauthenticatedProblem() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void csrfEndpointIssuesTheTokenCookie() throws Exception {
        mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isNoContent())
                .andExpect(cookie().exists("XSRF-TOKEN"))
                .andExpect(cookie().httpOnly("XSRF-TOKEN", false));
    }

    @Test
    void anUnsafeRequestWithoutTheCsrfHeaderIsRejectedWithItsOwnCode() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
    }

    @Test
    void noBrowserLoginFormOrBasicAuthChallengeExists() throws Exception {
        mockMvc.perform(get("/login")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(result -> org.assertj.core.api.Assertions
                        .assertThat(result.getResponse().getHeader("WWW-Authenticate")).isNull());
    }
}
```

- [x] **Step 3: Run it and watch it fail**

Run: `cd backend && ./mvnw test -Dtest=SecurityBaselineTest`
Expected: FAIL — `/api/v1/health` returns 401 (Boot's default security), `code` missing, no CSRF endpoint.

- [x] **Step 4: Write the implementation**

`shared/web/HealthController.java`:

```java
package ie.coursework.shared.web;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Health as seen through the proxy. Shallow on purpose: it answers "is the API process reachable
 * from Next.js". The host's own check uses /actuator/health, which includes the database.
 */
@RestController
public class HealthController {

    @GetMapping("/api/v1/health")
    Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
```

`security/CsrfController.java`:

```java
package ie.coursework.security;

import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Hands the browser a CSRF token cookie before its first unsafe request. Reading the token is what
 * makes the cookie repository write it; the response body carries nothing.
 */
@RestController
public class CsrfController {

    @GetMapping("/api/v1/auth/csrf")
    ResponseEntity<Void> csrf(CsrfToken token) {
        token.getToken();
        return ResponseEntity.noContent().build();
    }
}
```

`security/SecurityConfig.java`:

```java
package ie.coursework.security;

import ie.coursework.shared.error.ErrorCode;
import ie.coursework.shared.error.ProblemResponses;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfException;

/**
 * The API's filter chain.
 *
 * <p>CSRF: {@code csrf.spa()} uses a readable {@code XSRF-TOKEN} cookie and expects the token back
 * in {@code X-XSRF-TOKEN}. Browser and API share one origin through the Next.js proxy, so there is
 * no CORS configuration and no {@code @CrossOrigin} anywhere.
 *
 * <p>Every rejection is a problem response, never an HTML page, a redirect or a Basic challenge.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiFilterChain(HttpSecurity http, ProblemResponses problems) throws Exception {
        http
                .csrf(csrf -> csrf.spa())
                .authorizeHttpRequests(auth -> auth
                        // Spring Boot forwards errors to /error, which re-enters this chain.
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/health", "/api/v1/auth/csrf").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) ->
                                problems.write(request, response, ErrorCode.UNAUTHENTICATED, "Sign in to continue."))
                        .accessDeniedHandler((request, response, exception) -> {
                            if (exception instanceof CsrfException) {
                                problems.write(request, response, ErrorCode.CSRF_TOKEN_INVALID,
                                        "Refresh the page and try again.");
                            } else {
                                problems.write(request, response, ErrorCode.FORBIDDEN, "Not allowed.");
                            }
                        }))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .requestCache(cache -> cache.disable());
        return http.build();
    }
}
```

- [x] **Step 5: Run the test and watch it pass**

Run: `cd backend && ./mvnw test -Dtest=SecurityBaselineTest`
Expected: 6 tests, 0 failures.

If `anUnsafeRequestWithoutTheCsrfHeaderIsRejectedWithItsOwnCode` returns 401 instead of 403, the authorisation filter ran before CSRF. Check that nothing reordered the chain; in the default order `CsrfFilter` runs before `AuthorizationFilter`.

- [x] **Step 6: Run the whole suite, then commit**

```bash
cd backend && ./mvnw test && cd ..
git add backend
git commit -m "Require a session for the API, with CSRF on and problem responses

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Frontend spec tooling

Roadmap R5. The 74 existing `node --test` tests stay exactly as they are. Vitest picks up only `*.spec.ts(x)`.

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`, `frontend/test/setup.ts`, `frontend/test/tooling.spec.tsx`, `frontend/.env.example`

- [x] **Step 1: Install**

```bash
cd frontend
npm install zod@^4.4.3
npm install -D vitest@^3.2.7 jsdom@^27.0.1 @testing-library/react@^16.3.2 @testing-library/dom@^10.4.1 @testing-library/jest-dom@^7.0.1 @testing-library/user-event@^14.6.6
```

These are the versions contentCreater runs with React 19.2.8. If npm reports a peer conflict with React 19.2.8 or Next 15.3.9, stop and report it rather than using `--force`.

- [x] **Step 2: Write the canary spec**

`frontend/test/tooling.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Proves the spec runner, jsdom, React Testing Library and jest-dom matchers are wired together.
// If this fails, every component spec's failure is a tooling problem, not a product one.
describe("spec tooling", () => {
  it("renders into jsdom and queries by role", () => {
    render(<button type="button">Continue</button>);
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });
});
```

- [x] **Step 3: Run it and watch it fail**

Run: `npx vitest run`
Expected: FAIL — `document is not defined` or `toBeInTheDocument is not a function`, because there's no config or setup yet.

- [x] **Step 4: Write the config, setup and scripts**

`frontend/vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Specs only. `lib/**/*.test.ts` belongs to `node --test` (see BIPI-SITE-NOTES.md) and
 * `e2e/` to Playwright; the `.spec` suffix is what keeps the three runners apart.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.spec.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
```

`frontend/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Without globals, RTL doesn't unmount between tests, and a left-over tree makes the next
// test's queries ambiguous.
afterEach(() => {
  cleanup();
});
```

In `frontend/package.json`, replace the `"test"` script and add three more:

```json
    "test": "npm run test:node && npm run test:spec",
    "test:node": "node --test \"lib/**/*.test.ts\"",
    "test:spec": "vitest run",
    "typecheck": "tsc --noEmit"
```

`frontend/.env.example`:

```bash
# Copy to .env.local. Never commit .env.local.
APP_ENABLED=true
BACKEND_INTERNAL_URL=http://localhost:8080
PROXY_SHARED_SECRET=local-dev-proxy-secret
```

- [x] **Step 5: Run everything and watch it pass**

```bash
npm test          # 74 node tests, then 1 spec
npm run typecheck # clean
npm run lint      # clean
```

- [x] **Step 6: Commit**

```bash
cd ..
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/test frontend/.env.example frontend/.gitignore
git commit -m "Add Vitest spec runner beside the node:test suite

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: App flag and reserved route names

Roadmap R1 and §6.4; design §5.3. This comes before the proxy so the proxy can use the same flag check.

**Files:**
- Create: `frontend/lib/app/routes.ts`, `frontend/lib/app/routes.test.ts`
- Create: `frontend/app/(auth)/layout.tsx`, `frontend/app/(auth)/layout.spec.tsx`, `frontend/app/(auth)/login/page.tsx`

- [x] **Step 1: Write the failing tests**

`frontend/lib/app/routes.test.ts` (node:test, so imports carry `.ts`):

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_ROUTE_NAMES, isAppEnabled } from './routes.ts';
import { CLASS_SLUGS } from '../classes/index.ts';

describe('APP_ROUTE_NAMES', () => {
  test('no public class slug collides with an app route', () => {
    const reserved = new Set<string>(APP_ROUTE_NAMES);
    const collisions = CLASS_SLUGS.filter((slug) => reserved.has(slug));
    assert.deepEqual(collisions, []);
  });

  test('names are unique, lowercase path segments', () => {
    assert.equal(new Set(APP_ROUTE_NAMES).size, APP_ROUTE_NAMES.length);
    for (const name of APP_ROUTE_NAMES) assert.match(name, /^[a-z]+$/);
  });

  test('claims every top-level name the roadmap page inventory uses', () => {
    for (const name of ['api', 'login', 'join', 'reset', 'account', 'home', 'components', 'teach', 'school']) {
      assert.ok((APP_ROUTE_NAMES as readonly string[]).includes(name), name);
    }
  });
});

describe('isAppEnabled', () => {
  test('only the exact string "true" enables the app', () => {
    assert.equal(isAppEnabled({ APP_ENABLED: 'true' }), true);
    for (const value of [undefined, '', 'false', 'TRUE', '1', 'yes']) {
      assert.equal(isAppEnabled({ APP_ENABLED: value }), false, String(value));
    }
  });
});
```

`frontend/app/(auth)/layout.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import AuthLayout from "./layout";

describe("auth pages behind the app flag", () => {
  it("are a 404 while the app is switched off", () => {
    vi.stubEnv("APP_ENABLED", "");
    expect(() => AuthLayout({ children: <p>Sign in form</p> })).toThrow("NEXT_NOT_FOUND");
  });

  it("render their page once it's on", () => {
    vi.stubEnv("APP_ENABLED", "true");
    render(AuthLayout({ children: <p>Sign in form</p> }));
    expect(screen.getByText("Sign in form")).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run them and watch them fail**

Run: `cd frontend && npm test`
Expected: FAIL — `Cannot find module './routes.ts'` and `Failed to resolve import "./layout"`.

- [x] **Step 3: Write the implementation**

`frontend/lib/app/routes.ts`:

```ts
/**
 * Top-level route names the pilot app claims. The public schedule lives at `/[class]`, so a class
 * slug equal to one of these would be shadowed by an app page (design §5.3). `routes.test.ts`
 * fails if one ever is.
 */
export const APP_ROUTE_NAMES = [
  'api',
  'login',
  'join',
  'reset',
  'account',
  'home',
  'components',
  'teach',
  'school',
] as const;

/**
 * Whether the pilot app's pages and proxy are switched on (roadmap R1). Exactly "true" and nothing
 * looser, so a typo in a Vercel environment variable leaves the app off rather than on.
 */
export function isAppEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.APP_ENABLED === 'true';
}
```

`frontend/app/(auth)/layout.tsx`:

```tsx
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { isAppEnabled } from "@/lib/app/routes";

// Sign-in, joining and reset pages. No app header: the user isn't signed in yet.
export default function AuthLayout({ children }: { children: ReactNode }) {
  if (!isAppEnabled()) notFound();
  return <>{children}</>;
}
```

`frontend/app/(auth)/login/page.tsx` (placeholder; 1D replaces it):

```tsx
export default function LoginPage() {
  return (
    <main>
      <h1>Sign in</h1>
      <p>Sign-in arrives in milestone 1D.</p>
    </main>
  );
}
```

- [x] **Step 4: Run the tests and watch them pass**

Run: `npm test`
Expected: 78 node tests (74 + 4), 3 specs, all passing.

- [x] **Step 5: Check both flag states in a real build**

```bash
npm run build && npx next start -p 3100 &
sleep 5; curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3100/login        # 404
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3100/nwetss-hanlon          # 200
kill %1

APP_ENABLED=true npm run build && APP_ENABLED=true npx next start -p 3100 &
sleep 5; curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3100/login        # 200
kill %1
```

Expected: the codes in the comments. If `/login` is 200 with the flag unset, the page was prerendered with a stale environment — delete `.next/` and rebuild.

- [x] **Step 6: Commit**

```bash
cd ..
git add frontend/lib/app frontend/app/\(auth\)
git commit -m "Gate app routes behind APP_ENABLED and reserve their names

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: The same-origin proxy

Design §5.1 and §10; roadmap R8. Adapted from contentCreater's proxy, which forwards no cookies because that app has no login. This one does.

**What crosses the proxy, and nothing else:**
- **In:** method, path, query, body bytes, `accept`, `content-type`, `cookie`, `x-xsrf-token`. It also adds `x-forwarded-for` (the client's own address) and `x-proxy-secret`.
- **Out:** status, body, `content-type`, every `set-cookie`. It also adds `cache-control: no-store`.

**Files:**
- Create: `frontend/app/api/v1/[...path]/route.ts`
- Test: `frontend/app/api/v1/[...path]/route.spec.ts`

- [x] **Step 1: Write the failing spec**

```ts
// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, POST } from "./route";

/**
 * Component specs mock the API client, so a proxy that mangled a cookie would leave all of them
 * green. These pin what crosses the proxy in each direction.
 */
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("APP_ENABLED", "true");
  vi.stubEnv("BACKEND_INTERNAL_URL", "http://backend.test");
  vi.stubEnv("PROXY_SHARED_SECRET", "s3cret");
});

function context(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

function forwarded() {
  const [url, init] = fetchMock.mock.calls[0];
  const requestInit = init as RequestInit;
  return { url: String(url), init: requestInit, headers: new Headers(requestInit.headers) };
}

describe("the proxy", () => {
  it("is a 404 while the app is switched off, and never reaches the backend", async () => {
    vi.stubEnv("APP_ENABLED", "");
    const response = await GET(new NextRequest("http://localhost/api/v1/health"), context(["health"]));
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards method, path and query to the backend", async () => {
    await GET(new NextRequest("http://localhost/api/v1/classes/abc?view=full"), context(["classes", "abc"]));
    expect(forwarded().url).toBe("http://backend.test/api/v1/classes/abc?view=full");
    expect(forwarded().init.method).toBe("GET");
  });

  it("encodes each path segment", async () => {
    await GET(new NextRequest("http://localhost/api/v1/join/x"), context(["join", "A B/C"]));
    expect(forwarded().url).toBe("http://backend.test/api/v1/join/A%20B%2FC");
  });

  it("forwards the session cookie and CSRF header, and drops other browser headers", async () => {
    const request = new NextRequest("http://localhost/api/v1/auth/me", {
      headers: {
        cookie: "SESSION=abc; XSRF-TOKEN=def",
        "x-xsrf-token": "def",
        authorization: "Bearer stolen",
        "x-proxy-secret": "forged",
      },
    });
    await GET(request, context(["auth", "me"]));

    const { headers } = forwarded();
    expect(headers.get("cookie")).toBe("SESSION=abc; XSRF-TOKEN=def");
    expect(headers.get("x-xsrf-token")).toBe("def");
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("x-proxy-secret")).toBe("s3cret");
  });

  it("sends only the first forwarded address, which is the client's", async () => {
    const request = new NextRequest("http://localhost/api/v1/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    await GET(request, context(["auth", "login"]));
    expect(forwarded().headers.get("x-forwarded-for")).toBe("203.0.113.7");
  });

  it("sends no secret header when none is configured", async () => {
    vi.stubEnv("PROXY_SHARED_SECRET", "");
    await GET(new NextRequest("http://localhost/api/v1/health"), context(["health"]));
    expect(forwarded().headers.has("x-proxy-secret")).toBe(false);
  });

  it("forwards a JSON body byte for byte, with its content type", async () => {
    const request = new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"username":"aoife.b","password":"correct horse"}',
    });
    await POST(request, context(["auth", "login"]));

    const { init, headers } = forwarded();
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe(
      '{"username":"aoife.b","password":"correct horse"}',
    );
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("passes every Set-Cookie back to the browser", async () => {
    const backendHeaders = new Headers({ "content-type": "application/json" });
    backendHeaders.append("set-cookie", "SESSION=new; Path=/; HttpOnly; SameSite=Lax");
    backendHeaders.append("set-cookie", "XSRF-TOKEN=tok; Path=/");
    fetchMock.mockResolvedValue(new Response("{}", { status: 200, headers: backendHeaders }));

    const response = await POST(
      new NextRequest("http://localhost/api/v1/auth/login", { method: "POST", body: "{}" }),
      context(["auth", "login"]),
    );

    expect(response.headers.getSetCookie()).toEqual([
      "SESSION=new; Path=/; HttpOnly; SameSite=Lax",
      "XSRF-TOKEN=tok; Path=/",
    ]);
  });

  it("passes a problem response through untouched", async () => {
    const problem = '{"code":"USERNAME_TAKEN","status":409,"detail":"That username is taken."}';
    fetchMock.mockResolvedValue(
      new Response(problem, { status: 409, headers: { "content-type": "application/problem+json" } }),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/v1/join/ABCD2345/accounts", { method: "POST", body: "{}" }),
      context(["join", "ABCD2345", "accounts"]),
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(await response.text()).toBe(problem);
  });

  it("passes a 204 through with no body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const response = await DELETE(
      new NextRequest("http://localhost/api/v1/classes/abc/join-code", { method: "DELETE" }),
      context(["classes", "abc", "join-code"]),
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("never follows a backend redirect", async () => {
    await GET(new NextRequest("http://localhost/api/v1/health"), context(["health"]));
    expect(forwarded().init.redirect).toBe("manual");
  });

  it("is never cached", async () => {
    const response = await GET(new NextRequest("http://localhost/api/v1/health"), context(["health"]));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers with its own problem when the backend is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const response = await GET(new NextRequest("http://localhost/api/v1/health"), context(["health"]));

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(await response.json()).toMatchObject({ code: "BACKEND_UNREACHABLE", status: 502 });
  });
});
```

- [x] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run app/api`
Expected: FAIL — `Failed to resolve import "./route"`.

- [x] **Step 3: Write the implementation**

`frontend/app/api/v1/[...path]/route.ts`:

```ts
import { type NextRequest, NextResponse } from "next/server";

import { isAppEnabled } from "@/lib/app/routes";

/**
 * Same-origin proxy to the Spring Boot API (design §5.1).
 *
 * The browser never learns where the API lives and never makes a cross-origin call, so there's no
 * CORS to configure and the session cookie is first-party. Headers cross on an allowlist: the
 * session cookie and CSRF token in, every Set-Cookie out. Problem details pass through untouched,
 * so the user sees Spring's explanation rather than this file's opinion.
 */
export const dynamic = "force-dynamic";

const FORWARDED_REQUEST_HEADERS = ["accept", "content-type", "cookie", "x-xsrf-token"] as const;

function problem(status: number, code: string, title: string, detail: string) {
  return NextResponse.json(
    {
      type: `urn:coursework:problem:${code.toLowerCase().replaceAll("_", "-")}`,
      title,
      status,
      detail,
      code,
      fieldErrors: [],
    },
    { status, headers: { "content-type": "application/problem+json", "cache-control": "no-store" } },
  );
}

/**
 * The client's own address. On Vercel the first `x-forwarded-for` entry is the client. Spring
 * trusts what arrives only alongside the shared secret (roadmap R8), because this header is
 * trivially forgeable by anyone calling the API directly.
 */
function clientAddress(request: NextRequest): string | undefined {
  const first = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || undefined;
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!isAppEnabled()) {
    return problem(404, "NOT_FOUND", "Not found", "No such resource.");
  }

  const { path } = await context.params;
  const backend = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8080";
  const target = `${backend}/api/v1/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const address = clientAddress(request);
  if (address) headers.set("x-forwarded-for", address);
  const secret = process.env.PROXY_SHARED_SECRET;
  if (secret) headers.set("x-proxy-secret", secret);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      // Bytes, not text: re-encoding a body as a string can corrupt anything that isn't UTF-8.
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return problem(502, "BACKEND_UNREACHABLE", "The service could not be reached", "Please try again in a moment.");
  }

  const responseHeaders = new Headers({ "cache-control": "no-store" });
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new NextResponse(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
```

- [x] **Step 4: Run the spec and watch it pass**

Run: `npx vitest run app/api`
Expected: 13 tests, 0 failures.

- [x] **Step 5: Check it against the real backend**

```bash
cp .env.example .env.local        # if not already present
cd .. && make db-up && (make backend-run &) && sleep 25
cd frontend && (npm run dev &) && sleep 8
curl -s http://localhost:3000/api/v1/health                        # {"status":"UP"}
curl -si http://localhost:3000/api/v1/auth/csrf | grep -i set-cookie  # XSRF-TOKEN=...
curl -s http://localhost:3000/api/v1/auth/me                        # {"...","code":"UNAUTHENTICATED",...}
```

Stop both servers afterwards (`kill %1 %2`, or Ctrl-C in their terminals).

- [x] **Step 6: Run the whole frontend suite, then commit**

```bash
npm test && npm run typecheck && npm run lint
cd ..
git add "frontend/app/api"
git commit -m "Proxy /api/v1 to Spring with cookies, CSRF header and client address

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Typed API client

Adapted from contentCreater's `lib/api/`. Two differences: the browser client sends the CSRF token (fetching one first if there's no cookie, and retrying once if Spring says it's stale), and the server client forwards the viewer's own cookie header.

**Files:**
- Create: `frontend/lib/api/problem.ts`, `frontend/lib/api/client.ts`, `frontend/lib/api/server.ts`
- Test: `frontend/lib/api/problem.spec.ts`, `frontend/lib/api/client.spec.ts`, `frontend/lib/api/server.spec.ts`

- [x] **Step 1: Write the failing specs**

`frontend/lib/api/problem.spec.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ApiError, ApiErrorCode } from "./problem";

describe("ApiError.fromResponseBody", () => {
  it("reads a problem body", () => {
    const error = ApiError.fromResponseBody(400, {
      code: "VALIDATION_FAILED",
      title: "Validation failed",
      detail: "One or more fields are invalid.",
      status: 400,
      fieldErrors: [{ field: "username", message: "is taken" }],
    });

    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.status).toBe(400);
    expect(error.detail).toBe("One or more fields are invalid.");
    expect(error.fieldErrors).toEqual([{ field: "username", message: "is taken" }]);
  });

  it("tolerates members it doesn't know", () => {
    expect(ApiError.fromResponseBody(409, { code: "X", extra: 1 }).code).toBe("X");
  });

  it("falls back when the body isn't a problem", () => {
    const error = ApiError.fromResponseBody(502, "<html>Bad gateway</html>");
    expect(error.code).toBe(ApiErrorCode.UNEXPECTED_RESPONSE);
    expect(error.status).toBe(502);
    expect(error.fieldErrors).toEqual([]);
  });
});
```

`frontend/lib/api/client.spec.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ApiError, ApiErrorCode, createApiClient, readCsrfCookie } from "./client";

const meSchema = z.object({ userId: z.string(), username: z.string() });

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function problem(code: string, status: number) {
  return new Response(JSON.stringify({ code, status, detail: code }), {
    status,
    headers: { "content-type": "application/problem+json" },
  });
}

function clearCsrfCookie() {
  document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

const browser = () => createApiClient({ baseUrl: () => "", extraHeaders: async () => ({}), csrf: true });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  clearCsrfCookie();
});

afterEach(clearCsrfCookie);

describe("get", () => {
  it("returns the validated body from the same-origin API path", async () => {
    fetchMock.mockResolvedValue(json({ userId: "u1", username: "aoife.b" }));

    await expect(browser().get("/auth/me", meSchema)).resolves.toEqual({ userId: "u1", username: "aoife.b" });
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/v1/auth/me");
    expect((fetchMock.mock.calls[0][1] as RequestInit).cache).toBe("no-store");
  });

  it("turns a problem response into an ApiError carrying its code", async () => {
    fetchMock.mockResolvedValue(problem("UNAUTHENTICATED", 401));

    const error = await browser().get("/auth/me", meSchema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("UNAUTHENTICATED");
    expect((error as ApiError).status).toBe(401);
  });

  it("rejects a body that doesn't match the schema", async () => {
    fetchMock.mockResolvedValue(json({ userId: "u1" }));

    const error = await browser().get("/auth/me", meSchema).catch((e: unknown) => e);
    expect((error as ApiError).code).toBe(ApiErrorCode.RESPONSE_SHAPE_UNEXPECTED);
  });

  it("reports an unreachable network as one error code", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await browser().get("/auth/me", meSchema).catch((e: unknown) => e);
    expect((error as ApiError).code).toBe(ApiErrorCode.BACKEND_UNREACHABLE);
  });

  it("sends no CSRF header on a GET", async () => {
    document.cookie = "XSRF-TOKEN=tok; path=/";
    fetchMock.mockResolvedValue(json({ userId: "u1", username: "a" }));

    await browser().get("/auth/me", meSchema);
    expect(new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).has("x-xsrf-token")).toBe(false);
  });
});

describe("send", () => {
  it("sends JSON with the CSRF token from the cookie", async () => {
    document.cookie = "XSRF-TOKEN=tok%3D1; path=/";
    fetchMock.mockResolvedValue(json({ userId: "u1", username: "aoife.b" }));

    await browser().send("POST", "/auth/login", { username: "aoife.b", password: "x" }, meSchema);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(init.method).toBe("POST");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-xsrf-token")).toBe("tok=1");
    expect(init.body).toBe('{"username":"aoife.b","password":"x"}');
  });

  it("fetches a CSRF token first when there's no cookie", async () => {
    fetchMock.mockImplementation(async (input) => {
      if (String(input) === "/api/v1/auth/csrf") {
        document.cookie = "XSRF-TOKEN=fresh; path=/";
        return new Response(null, { status: 204 });
      }
      return json({ userId: "u1", username: "a" });
    });

    await browser().send("POST", "/auth/login", {}, meSchema);

    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual(["/api/v1/auth/csrf", "/api/v1/auth/login"]);
    expect(new Headers((fetchMock.mock.calls[1][1] as RequestInit).headers).get("x-xsrf-token")).toBe("fresh");
  });

  it("refreshes a stale token and retries once", async () => {
    document.cookie = "XSRF-TOKEN=stale; path=/";
    let loginAttempts = 0;
    fetchMock.mockImplementation(async (input) => {
      if (String(input) === "/api/v1/auth/csrf") {
        document.cookie = "XSRF-TOKEN=fresh; path=/";
        return new Response(null, { status: 204 });
      }
      loginAttempts += 1;
      return loginAttempts === 1 ? problem("CSRF_TOKEN_INVALID", 403) : json({ userId: "u1", username: "a" });
    });

    await expect(browser().send("POST", "/auth/login", {}, meSchema)).resolves.toMatchObject({ userId: "u1" });
    expect(loginAttempts).toBe(2);
  });

  it("gives up after one retry", async () => {
    document.cookie = "XSRF-TOKEN=stale; path=/";
    fetchMock.mockImplementation(async (input) =>
      String(input) === "/api/v1/auth/csrf" ? new Response(null, { status: 204 }) : problem("CSRF_TOKEN_INVALID", 403),
    );

    const error = await browser().send("POST", "/auth/login", {}, meSchema).catch((e: unknown) => e);
    expect((error as ApiError).code).toBe("CSRF_TOKEN_INVALID");
    expect(fetchMock.mock.calls.filter((call) => String(call[0]) === "/api/v1/auth/login")).toHaveLength(2);
  });
});

describe("sendNoContent", () => {
  it("resolves to nothing on a 204", async () => {
    document.cookie = "XSRF-TOKEN=tok; path=/";
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(browser().sendNoContent("POST", "/auth/logout")).resolves.toBeUndefined();
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBeUndefined();
  });
});

describe("readCsrfCookie", () => {
  it("finds and decodes the token among other cookies", () => {
    expect(readCsrfCookie("a=1; XSRF-TOKEN=ab%3D%3D; b=2")).toBe("ab==");
    expect(readCsrfCookie("a=1")).toBeUndefined();
  });
});
```

`frontend/lib/api/server.spec.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: "SESSION=abc123==; XSRF-TOKEN=t" }),
}));

import { serverApi } from "./server";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response('{"status":"UP"}', { status: 200, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("BACKEND_INTERNAL_URL", "http://backend.test");
});

describe("serverApi", () => {
  it("calls Spring directly and forwards the viewer's raw cookie header", async () => {
    await serverApi.get("/health", z.object({ status: z.string() }));

    expect(String(fetchMock.mock.calls[0][0])).toBe("http://backend.test/api/v1/health");
    // Raw, not re-serialised: re-encoding would turn a base64 session id's "=" into "%3D".
    expect(new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).get("cookie")).toBe(
      "SESSION=abc123==; XSRF-TOKEN=t",
    );
  });

  it("offers no way to mutate", () => {
    expect(Object.keys(serverApi)).toEqual(["get"]);
  });
});
```

- [x] **Step 2: Run them and watch them fail**

Run: `cd frontend && npx vitest run lib/api`
Expected: FAIL — `Failed to resolve import "./problem"`, `"./client"`, `"./server"`.

- [x] **Step 3: Write `problem.ts`**

```ts
import { z } from "zod";

/** One invalid field, matching the backend's `fieldErrors` entries. */
export interface FieldProblem {
  field: string;
  message: string;
}

/**
 * The RFC 9457 body Spring returns. Strict about `code` only: rejecting a response over an extra
 * member would turn a readable error into an unreadable one at the worst moment.
 */
const problemSchema = z.object({
  code: z.string(),
  title: z.string().optional(),
  detail: z.string().optional(),
  status: z.number().optional(),
  fieldErrors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
});

/**
 * Codes the frontend branches on. Only codes that change behaviour belong here; the full list is
 * the backend's `ErrorCode` enum, and anything unlisted still arrives on `ApiError.code`.
 */
export const ApiErrorCode = {
  RESPONSE_SHAPE_UNEXPECTED: "RESPONSE_SHAPE_UNEXPECTED",
  BACKEND_UNREACHABLE: "BACKEND_UNREACHABLE",
  UNEXPECTED_RESPONSE: "UNEXPECTED_RESPONSE",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  CSRF_TOKEN_INVALID: "CSRF_TOKEN_INVALID",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
} as const;

/** Every failure the API client raises, whatever caused it. Components catch one type. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly fieldErrors: FieldProblem[];

  constructor(init: {
    code: string;
    status: number;
    title?: string;
    detail?: string;
    fieldErrors?: FieldProblem[];
    cause?: unknown;
  }) {
    super(init.detail ?? init.title ?? init.code, { cause: init.cause });
    this.name = "ApiError";
    this.code = init.code;
    this.status = init.status;
    this.title = init.title ?? init.code;
    this.detail = init.detail ?? "";
    this.fieldErrors = init.fieldErrors ?? [];
  }

  static fromResponseBody(status: number, body: unknown): ApiError {
    const parsed = problemSchema.safeParse(body);
    if (!parsed.success) {
      return new ApiError({
        code: ApiErrorCode.UNEXPECTED_RESPONSE,
        status,
        title: "Unexpected response",
        detail: "Something went wrong. Please try again.",
      });
    }
    return new ApiError({ ...parsed.data, status: parsed.data.status ?? status });
  }

  static unreachable(cause: unknown): ApiError {
    return new ApiError({
      code: ApiErrorCode.BACKEND_UNREACHABLE,
      status: 0,
      title: "Can't reach the service",
      detail: "Check your connection and try again.",
      cause,
    });
  }

  static badShape(path: string, cause: unknown): ApiError {
    return new ApiError({
      code: ApiErrorCode.RESPONSE_SHAPE_UNEXPECTED,
      status: 0,
      title: "Unexpected response",
      detail: `The response from ${path} wasn't what this version of the app expects.`,
      cause,
    });
  }
}
```

- [x] **Step 4: Write `client.ts`**

```ts
import type { ZodType } from "zod";

import { ApiError, ApiErrorCode } from "./problem";

export { ApiError, ApiErrorCode } from "./problem";
export type { FieldProblem } from "./problem";

const API_PREFIX = "/api/v1";
const CSRF_COOKIE = "XSRF-TOKEN";

export type Mutation = "POST" | "PUT" | "PATCH" | "DELETE";

/** Where requests go and what they carry. The browser and server clients differ only here. */
export interface ApiTransport {
  baseUrl(): string;
  extraHeaders(): Promise<Record<string, string>>;
  /** Whether to send Spring's CSRF token. Only the browser has one. */
  csrf: boolean;
}

export interface ApiClient {
  get<T>(path: string, schema: ZodType<T>, init?: { signal?: AbortSignal }): Promise<T>;
  send<T>(method: Mutation, path: string, body: unknown, schema: ZodType<T>): Promise<T>;
  sendNoContent(method: Mutation, path: string, body?: unknown): Promise<void>;
}

/** The CSRF token from a `document.cookie`-style string, decoded. */
export function readCsrfCookie(cookies: string): string | undefined {
  for (const part of cookies.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === CSRF_COOKIE) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export function createApiClient(transport: ApiTransport): ApiClient {
  async function call(
    method: string,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${transport.baseUrl()}${API_PREFIX}${path}`, {
        method,
        headers: {
          accept: "application/json",
          ...(await transport.extraHeaders()),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal,
      });
    } catch (cause) {
      throw ApiError.unreachable(cause);
    }
    if (!response.ok) {
      throw ApiError.fromResponseBody(response.status, await readJson(response));
    }
    return response;
  }

  async function csrfHeader(refresh: boolean): Promise<Record<string, string>> {
    if (!transport.csrf) return {};
    let token = refresh ? undefined : readCsrfCookie(document.cookie);
    if (!token) {
      await call("GET", "/auth/csrf", undefined, {});
      token = readCsrfCookie(document.cookie);
    }
    return token ? { "x-xsrf-token": token } : {};
  }

  async function mutate(method: Mutation, path: string, body: unknown): Promise<Response> {
    try {
      return await call(method, path, body, await csrfHeader(false));
    } catch (error) {
      // A token can go stale (cookie cleared, server restarted with a new key). One refresh and
      // retry covers that; a second failure is real and surfaces.
      if (transport.csrf && error instanceof ApiError && error.code === ApiErrorCode.CSRF_TOKEN_INVALID) {
        return call(method, path, body, await csrfHeader(true));
      }
      throw error;
    }
  }

  async function parse<T>(response: Response, schema: ZodType<T>, path: string): Promise<T> {
    const parsed = schema.safeParse(await readJson(response));
    if (!parsed.success) throw ApiError.badShape(path, parsed.error);
    return parsed.data;
  }

  return {
    async get<T>(path: string, schema: ZodType<T>, init?: { signal?: AbortSignal }): Promise<T> {
      return parse(await call("GET", path, undefined, {}, init?.signal), schema, path);
    },
    async send<T>(method: Mutation, path: string, body: unknown, schema: ZodType<T>): Promise<T> {
      return parse(await mutate(method, path, body), schema, path);
    },
    async sendNoContent(method: Mutation, path: string, body?: unknown): Promise<void> {
      await mutate(method, path, body);
    },
  };
}

/** For client components. Same origin, through the proxy. */
export const api = createApiClient({ baseUrl: () => "", extraHeaders: async () => ({}), csrf: true });
```

- [x] **Step 5: Write `server.ts`**

```ts
import { headers } from "next/headers";

import { type ApiClient, createApiClient } from "./client";

/**
 * For server components. Calls Spring directly and forwards the viewer's own raw `cookie` header,
 * so the request carries their session.
 *
 * Read-only by design: it has no `send`. Mutations happen in client components through the proxy,
 * because that's where the CSRF token is (root CLAUDE.md).
 */
const client = createApiClient({
  baseUrl: () => process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8080",
  extraHeaders: async () => {
    const cookie = (await headers()).get("cookie");
    return cookie ? { cookie } : {};
  },
  csrf: false,
});

export const serverApi: Pick<ApiClient, "get"> = { get: client.get };
```

- [x] **Step 6: Run the specs and watch them pass**

Run: `npx vitest run lib/api`
Expected: 16 tests, 0 failures.

- [x] **Step 7: Run the whole frontend suite, then commit**

```bash
npm test && npm run typecheck && npm run lint
cd ..
git add frontend/lib/api
git commit -m "Add typed API client with CSRF handling and a read-only server client

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Deploy to EU hosting

Design §5.4; roadmap R16, H1, H3. **This task has a human decision in it.** Don't pick a vendor without Tim.

**Files:**
- Create: `backend/Dockerfile`, `backend/.dockerignore`, `frontend/vercel.json`

- [x] **Step 1: Write the Dockerfile**

`backend/Dockerfile`:

```dockerfile
# Build stage. Tests don't run here: they need Docker for Testcontainers, and `make verify` runs
# them before anything is pushed.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw --quiet dependency:go-offline
COPY src src
RUN ./mvnw --quiet -DskipTests package && cp target/coursework-backend-*.jar app.jar

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 coursework
WORKDIR /app
COPY --from=build /workspace/app.jar app.jar
USER coursework
ENV SERVER_ADDRESS=0.0.0.0 \
    SERVER_PORT=8080 \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

`backend/.dockerignore`:

```
target
.idea
.vscode
.env
```

- [x] **Step 2: Build and run the image locally**

```bash
docker build -t coursework-backend backend
docker run --rm -p 8080:8080 \
  -e DATABASE_URL=jdbc:postgresql://host.docker.internal:5432/coursework \
  coursework-backend &
sleep 20
curl -s http://localhost:8080/actuator/health   # {"status":"UP"}
docker stop $(docker ps -q --filter ancestor=coursework-backend)
```

Expected: `{"status":"UP"}`. If the build fails downloading Maven inside the image, the wrapper script found neither `curl` nor `wget`; add `RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*` to the build stage.

- [x] **Step 3: Decide hosting with Tim (H1)**

Present this to Tim and wait for the answer. Don't treat the shortlist as verified: **check each claim on the vendor's current pages at the time of the decision**, since offerings and prices change.

Criteria, in order:
1. API **and** database in an EU region (Ireland, Frankfurt, Amsterdam or Paris)
2. Managed Postgres **18** (if only 17 is offered, the Testcontainers image in `PostgresIntegrationTest` and `compose.yaml` must pin to the same major version — change both in one commit)
3. Point-in-time recovery on the database
4. Deploys the `backend/Dockerfile` from the repo, with a secrets store for environment variables
5. A health-check path setting (`/actuator/health`)
6. Cost for one small instance and a small database

Shortlist to check:

| Option | API | Database |
|---|---|---|
| Render | Web service, Frankfurt | Render Postgres, Frankfurt |
| Fly.io | Machines, Frankfurt or Amsterdam | Fly Managed Postgres, or Neon in Frankfurt |
| Scaleway (EU company) | Serverless Containers, Paris | Managed Database for PostgreSQL, Paris |
| Railway | EU West | Railway Postgres |

If nothing else decides it, prefer the option where API and database are one vendor in one region, because it's one bill, one secrets store and no cross-provider latency.

Record the decision and the reason in `docs/HANDOFF.md`, and mark H1 answered in `docs/PILOT-ROADMAP.md` §3.

- [x] **Step 4: Stand up the backend and database**

On the chosen host:
- Create the Postgres database in the EU region and **turn on point-in-time recovery**.
- Create the API service from `backend/Dockerfile`, same region, health check `/actuator/health`.
- Set environment variables in the host's secret store:

```bash
DATABASE_URL=jdbc:postgresql://<host>:<port>/<db>?sslmode=require   # JDBC form, not postgres://
DATABASE_USERNAME=<user>
DATABASE_PASSWORD=<password>
PROXY_SHARED_SECRET=<output of: openssl rand -base64 32>
```

Verify: `curl -s https://<backend-host>/actuator/health` returns `{"status":"UP"}`.

- [x] **Step 5: Pin the Vercel function region**

`frontend/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["dub1"]
}
```

In the Vercel project settings (H3):
- **Preview** environment: `APP_ENABLED=true`, `BACKEND_INTERNAL_URL=https://<backend-host>`, `PROXY_SHARED_SECRET=<same value>`
- **Production** environment: none of these three. The app stays off (R1).

- [ ] **Step 6: Commit and push for a preview deploy**

```bash
git add backend/Dockerfile backend/.dockerignore frontend/vercel.json
git commit -m "Containerise the API and run Vercel functions in Dublin

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push -u origin pilot/1a-walking-skeleton
```

- [ ] **Step 7: Verify the preview**

```bash
curl -si https://<preview-url>/api/v1/health
```

Expected: `200`, body `{"status":"UP"}`, and an `x-vercel-id` header whose second segment is `dub1` (for example `dub1::dub1::…`). The live site currently shows `dub1::iad1::…`, meaning its function ran in Washington.

If the preview answers 401 with a Vercel login page, Deployment Protection is on for previews. Check in a signed-in browser, or use a Protection Bypass for Automation secret: `curl -si -H "x-vercel-protection-bypass: <secret>" …`.

---

## Task 12: Gate 1A

- [x] **Step 1: Run every check**

```bash
make verify
```

Expected: `verify: all checks passed`.

- [ ] **Step 2: Walk the gate** (roadmap §8.1)

- [x] `make verify` green
- [ ] Preview `GET /api/v1/health` returns `{"status":"UP"}` through the proxy from the EU backend
- [ ] `x-vercel-id` shows the function ran in `dub1`
- [ ] Point-in-time recovery is on (note the setting, or paste CLI output, in `docs/HANDOFF.md`)
- [ ] After merge only: Production `/login` and `/api/v1/health` return 404, and `/nwetss-hanlon` returns 200

- [ ] **Step 3: Update the docs**

- `docs/PILOT-ROADMAP.md` §1: 1A → done (or "awaiting merge").
- `docs/HANDOFF.md`: current milestone 1B; the hosting decision; **how long 1A actually took** (roadmap §10 estimates from this).
- Root `CLAUDE.md`: add anything this milestone confirmed that isn't there yet.

- [ ] **Step 4: Open the PR**

```bash
git add docs CLAUDE.md
git commit -m "Record Gate 1A

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push
gh pr create --title "Pilot 1A: walking skeleton" --body "$(cat <<'EOF'
Spring Boot API, Postgres 18, content migrations, problem details, CSRF, the same-origin proxy, the typed API client and the APP_ENABLED gate, deployed to EU hosting.

Gate 1A (docs/PILOT-ROADMAP.md §8.1): see the checklist in docs/HANDOFF.md.

App routes stay off in Production until go-live, so merging this doesn't change the live site.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Don't merge.** Tim reviews and merges. Then do the post-merge Production check from Step 2.
