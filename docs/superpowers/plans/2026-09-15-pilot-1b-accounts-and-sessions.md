# Pilot 1B — Accounts and Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The operator can create a school and a teacher from the command line; the teacher signs in with a username and temporary password, is made to change it, and holds a session that survives a deploy, is rate-limited against guessing, and is protected by CSRF.

**Architecture:** Identity lives in `ie.coursework.identity` (domain rules with no Spring, `JdbcClient` repositories, services, controllers, a CLI adapter). Login is a JSON endpoint that authenticates through Spring Security's `AuthenticationManager` and stores a minimal principal (the user id) in a Spring Session JDBC session. Roles are loaded per request into an `Actor` that every controller receives as an argument (roadmap R10).

**Tech Stack:** As 1A, plus Spring Session JDBC and Spring Security's `DelegatingPasswordEncoder` (bcrypt).

**Roadmap:** `docs/PILOT-ROADMAP.md` §8.1 1B. **Design:** §5.2, §6.1, §8.1, §9.

---

## Before you start

- 1A is merged, or this branch is stacked on it: `git checkout -b pilot/1b-accounts-and-sessions` from the 1A branch or `main`.
- `make verify` is green.
- Read `backend/src/main/java/ie/coursework/security/SecurityConfig.java` and `shared/error/ErrorCode.java` from 1A. This plan extends both.

**Two JDBC traps this plan avoids, which later milestones must too:**
1. **Don't bind `java.time.Instant` as a query parameter.** The Postgres driver doesn't map it. Bind `OffsetDateTime.ofInstant(instant, ZoneOffset.UTC)` instead (`Timestamps.utc(instant)` below).
2. **Don't read `timestamptz` into an `Instant` record component with `DataClassRowMapper`.** Read it as `OffsetDateTime`, or select a boolean like `disabled_at IS NOT NULL AS disabled` when that's all you need.

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `db/migration/V2__identity.sql` | school, app_user, password_credential, user_role, password_reset_code, audit_event | 1 |
| `db/migration/V3__spring_session.sql` | Spring Session JDBC tables | 1 |
| `identity/domain/Username.java`, `PasswordPolicy.java`, `Role.java`, `RoleGrant.java`, `Actor.java`, `School.java`, `UserProfile.java` | Rules and value types, no Spring | 2 |
| `shared/config/TimeConfig.java`, `shared/persistence/Timestamps.java` | Injectable clock, safe timestamp binding | 3 |
| `identity/adapter/persistence/UserAccountRepository.java`, `SchoolRepository.java`, `RoleRepository.java`, `StoredCredential.java` | SQL | 3 |
| `audit/AuditEventType.java`, `audit/AuditLog.java` | Audit trail (design §9) | 4 |
| `identity/domain/TemporaryPasswordGenerator.java` | One-time passwords for new accounts | 5 |
| `identity/application/OperatorService.java`, `CreatedAccount.java` | Operator use cases | 5 |
| `identity/adapter/cli/OperatorCommands.java`, `OperatorCommandRunner.java`; `scripts/operator.sh`; `security/PasswordConfig.java` | Command-line entry; the password encoder outside the web chain | 5 |
| `security/AuthenticatedUser.java`, `CredentialUserDetailsService.java`, `SessionEstablisher.java`; `identity/application/AccountQueries.java`, `AccountView.java` | Principal, credential lookup, session start/end, account view | 6 |
| `identity/adapter/web/AuthController.java`, `LoginRequest.java`, `MeResponse.java` | Login, logout, me, password | 6, 9, 10 |
| `src/test/java/ie/coursework/support/ApiSession.java`, `TestAccounts.java` | MockMvc with a cookie jar and CSRF; test users and schools | 6 |
| `security/SessionFlowTest.java` (test) | Real cookies over real HTTP | 7 |
| `shared/InMemoryState.java`, `security/AttemptLimiter.java`, `LoginThrottle.java`, `ClientAddressResolver.java`, `LoginLimitsProperties.java`; test support `MutableClock.java` | Rate limiting, trusted client address | 8 |
| `identity/application/ActorResolver.java`, `security/CurrentActorArgumentResolver.java`, `shared/web/WebConfig.java` | Actor per request | 9 |
| `identity/application/PasswordService.java`, `security/OtherSessions.java`, `security/PasswordChangeRequiredFilter.java` | Change password, end other sessions, forced change | 10 |
| `classes/domain/Subject.java`, `classes/adapter/persistence/SubjectRepository.java`, `classes/adapter/web/SubjectController.java` | `GET /api/v1/subjects` | 10 |

All Java paths are under `backend/src/main/java/ie/coursework/` (or `src/test/java/ie/coursework/` for tests) unless shown otherwise. Migrations are under `backend/src/main/resources/`.

---

## Task 1: Identity and session schema

Design §6.1. Nothing about students beyond a name: no email, no date of birth.

**Files:**
- Create: `db/migration/V2__identity.sql`, `db/migration/V3__spring_session.sql`
- Test: `identity/adapter/persistence/IdentitySchemaTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.identity.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class IdentitySchemaTest extends PostgresIntegrationTest {

    @Test
    void identityAndSessionTablesExist() {
        List<String> tables = jdbcTemplate.queryForList(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'", String.class);

        assertThat(tables).contains(
                "school", "app_user", "password_credential", "user_role",
                "password_reset_code", "audit_event", "spring_session", "spring_session_attributes");
    }

    @Test
    void appUserHasNoEmailOrDateOfBirth() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'app_user'", String.class);

        assertThat(columns).containsExactlyInAnyOrder("id", "first_name", "last_name", "disabled_at", "created_at");
    }

    @Test
    void usernamesMustAlreadyBeNormalised() {
        UUID user = insertUser();

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO password_credential (user_id, username, password_hash) VALUES (?, 'Aoife.B', 'x')", user))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void usernamesAreUnique() {
        UUID first = insertUser();
        UUID second = insertUser();
        jdbcTemplate.update("INSERT INTO password_credential (user_id, username, password_hash) VALUES (?, 'aoife.b', 'x')", first);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO password_credential (user_id, username, password_hash) VALUES (?, 'aoife.b', 'x')", second))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aRoleIsOneOfThreeAndHeldOncePerSchool() {
        UUID user = insertUser();
        UUID school = jdbcTemplate.queryForObject(
                "INSERT INTO school (name, roll_number) VALUES ('Test School', '99999Z') RETURNING id", UUID.class);
        jdbcTemplate.update("INSERT INTO user_role (user_id, school_id, role) VALUES (?, ?, 'TEACHER')", user, school);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO user_role (user_id, school_id, role) VALUES (?, ?, 'TEACHER')", user, school))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO user_role (user_id, school_id, role) VALUES (?, ?, 'PRINCIPAL')", user, school))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private UUID insertUser() {
        return jdbcTemplate.queryForObject(
                "INSERT INTO app_user (first_name, last_name) VALUES ('Aoife', 'Byrne') RETURNING id", UUID.class);
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && ./mvnw test -Dtest=IdentitySchemaTest`
Expected: FAIL — `relation "app_user" does not exist`.

- [ ] **Step 3: Write the migrations**

`db/migration/V2__identity.sql`:

```sql
CREATE TABLE school (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL,
    roll_number text        NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Deliberately minimal: nothing is collected that the pilot doesn't use (design §6.1).
CREATE TABLE app_user (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name  text        NOT NULL CONSTRAINT app_user_first_name_present CHECK (btrim(first_name) <> ''),
    last_name   text        NOT NULL CONSTRAINT app_user_last_name_present CHECK (btrim(last_name) <> ''),
    disabled_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Separate from app_user so school sign-in can arrive later without restructuring accounts (design §5.2).
CREATE TABLE password_credential (
    user_id       uuid        PRIMARY KEY REFERENCES app_user (id),
    username      text        NOT NULL UNIQUE
                              CONSTRAINT password_credential_username_format CHECK (username ~ '^[a-z0-9._-]{3,32}$'),
    password_hash text        NOT NULL,
    must_change   boolean     NOT NULL DEFAULT false,
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- One person can hold several roles, e.g. a year head who also teaches. school_id is required in
-- the pilot and becomes nullable when individual subscribers arrive.
CREATE TABLE user_role (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES app_user (id),
    school_id  uuid        NOT NULL REFERENCES school (id),
    role       text        NOT NULL CONSTRAINT user_role_role_valid CHECK (role IN ('STUDENT', 'TEACHER', 'SCHOOL_LEADER')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_role_unique UNIQUE (user_id, school_id, role)
);
CREATE INDEX user_role_user_idx ON user_role (user_id);

CREATE TABLE password_reset_code (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid        NOT NULL REFERENCES app_user (id),
    code_hash         text        NOT NULL,
    issued_by_user_id uuid        NOT NULL REFERENCES app_user (id),
    expires_at        timestamptz NOT NULL,
    used_at           timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_reset_code_user_idx ON password_reset_code (user_id);

-- Role changes, enrolment decisions, reset codes, sign-offs, join code rotation (design §9).
-- details never holds a password, a code or student-written content.
CREATE TABLE audit_event (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at   timestamptz NOT NULL,
    actor_user_id uuid        REFERENCES app_user (id),
    event_type    text        NOT NULL,
    subject_type  text        NOT NULL,
    subject_id    uuid        NOT NULL,
    details       jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_event_subject_idx ON audit_event (subject_type, subject_id);
```

`db/migration/V3__spring_session.sql` — Spring Session JDBC's Postgres schema. Flyway owns the schema, so Spring Session's own initialiser stays off (Task 6).

```sql
CREATE TABLE spring_session (
    primary_id            char(36)     NOT NULL,
    session_id            char(36)     NOT NULL,
    creation_time         bigint       NOT NULL,
    last_access_time      bigint       NOT NULL,
    max_inactive_interval int          NOT NULL,
    expiry_time           bigint       NOT NULL,
    principal_name        varchar(100),
    CONSTRAINT spring_session_pk PRIMARY KEY (primary_id)
);
CREATE UNIQUE INDEX spring_session_ix1 ON spring_session (session_id);
CREATE INDEX spring_session_ix2 ON spring_session (expiry_time);
CREATE INDEX spring_session_ix3 ON spring_session (principal_name);

CREATE TABLE spring_session_attributes (
    session_primary_id char(36)     NOT NULL,
    attribute_name     varchar(200) NOT NULL,
    attribute_bytes    bytea        NOT NULL,
    CONSTRAINT spring_session_attributes_pk PRIMARY KEY (session_primary_id, attribute_name),
    CONSTRAINT spring_session_attributes_fk FOREIGN KEY (session_primary_id)
        REFERENCES spring_session (primary_id) ON DELETE CASCADE
);
```

After Task 6 adds the dependency, compare this with the jar's own file and fix any difference in a new migration (never by editing V3 once applied anywhere):

```bash
cd backend && ./mvnw -q dependency:copy -Dartifact=org.springframework.session:spring-session-jdbc:4.1.1 -DoutputDirectory=target/tmp
unzip -p target/tmp/spring-session-jdbc-4.1.1.jar org/springframework/session/jdbc/schema-postgresql.sql
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `./mvnw test -Dtest=IdentitySchemaTest`
Expected: 5 tests, 0 failures.

- [ ] **Step 5: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Add identity, audit and session tables

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Domain rules

Pure JUnit, no Spring. Roadmap R6 and R12.

**Files:**
- Modify: `shared/error/ErrorCode.java`
- Create: `identity/domain/Username.java`, `PasswordPolicy.java`, `Role.java`, `RoleGrant.java`, `Actor.java`, `School.java`, `UserProfile.java`
- Test: `identity/domain/UsernameTest.java`, `PasswordPolicyTest.java`, `ActorTest.java`

- [ ] **Step 1: Write the failing tests**

`UsernameTest.java`:

```java
package ie.coursework.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class UsernameTest {

    @Test
    void parsingTrimsAndLowercasesWhatAPhoneKeyboardProduces() {
        assertThat(Username.parse("  Aoife.Byrne ").value()).isEqualTo("aoife.byrne");
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "a_b-c.1", "abcdefghijklmnopqrstuvwxyz012345"})
    void acceptsThreeToThirtyTwoAllowedCharacters(String raw) {
        assertThat(Username.parse(raw).value()).isEqualTo(raw);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "ab", "abcdefghijklmnopqrstuvwxyz0123456", "aoife byrne", "aoife@school", "séan"})
    void rejectsAnythingElse(String raw) {
        assertThatThrownBy(() -> Username.parse(raw))
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).errorCode())
                .isEqualTo(ErrorCode.USERNAME_INVALID);
    }
}
```

`PasswordPolicyTest.java`:

```java
package ie.coursework.identity.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import org.junit.jupiter.api.Test;

class PasswordPolicyTest {

    @Test
    void tenCharactersIsEnoughAndNoCompositionRulesApply() {
        assertThatCode(() -> PasswordPolicy.check("aaaaaaaaaa")).doesNotThrowAnyException();
    }

    @Test
    void nineCharactersIsTooShort() {
        assertCode(() -> PasswordPolicy.check("aaaaaaaaa"), ErrorCode.PASSWORD_TOO_SHORT);
        assertCode(() -> PasswordPolicy.check(null), ErrorCode.PASSWORD_TOO_SHORT);
    }

    @Test
    void sixtyFourCharactersIsTheMaximum() {
        assertThatCode(() -> PasswordPolicy.check("a".repeat(64))).doesNotThrowAnyException();
        assertCode(() -> PasswordPolicy.check("a".repeat(65)), ErrorCode.PASSWORD_TOO_LONG);
    }

    @Test
    void neverMoreThanSeventyTwoBytesBecauseBcryptReadsNoFurther() {
        // 20 four-byte emoji: 20 characters, 80 bytes.
        assertCode(() -> PasswordPolicy.check("😀".repeat(20)), ErrorCode.PASSWORD_TOO_LONG);
    }

    private static void assertCode(Runnable action, ErrorCode expected) {
        assertThatThrownBy(action::run)
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).errorCode())
                .isEqualTo(expected);
    }
}
```

`ActorTest.java`:

```java
package ie.coursework.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ActorTest {

    private static final UUID SCHOOL_A = UUID.randomUUID();
    private static final UUID SCHOOL_B = UUID.randomUUID();

    private final Actor yearHead = new Actor(UUID.randomUUID(), List.of(
            new RoleGrant(SCHOOL_A, "School A", Role.TEACHER),
            new RoleGrant(SCHOOL_A, "School A", Role.SCHOOL_LEADER)));

    @Test
    void oneActorCanHoldSeveralRoles() {
        assertThat(yearHead.holds(Role.TEACHER)).isTrue();
        assertThat(yearHead.holds(Role.SCHOOL_LEADER)).isTrue();
        assertThat(yearHead.holds(Role.STUDENT)).isFalse();
    }

    @Test
    void aRoleIsHeldAtASpecificSchool() {
        assertThat(yearHead.holds(Role.TEACHER, SCHOOL_A)).isTrue();
        assertThat(yearHead.holds(Role.TEACHER, SCHOOL_B)).isFalse();
        assertThat(yearHead.schoolsWhere(Role.SCHOOL_LEADER)).containsExactly(SCHOOL_A);
    }

    @Test
    void grantsAreCopiedSoTheActorCantChangeUnderneathAService() {
        List<RoleGrant> grants = new java.util.ArrayList<>();
        Actor actor = new Actor(UUID.randomUUID(), grants);
        grants.add(new RoleGrant(SCHOOL_A, "School A", Role.TEACHER));

        assertThat(actor.holds(Role.TEACHER)).isFalse();
    }
}
```

`@ParameterizedTest` needs `junit-jupiter-params`, which `spring-boot-starter-test` already brings in.

- [ ] **Step 2: Run them and watch them fail**

Run: `cd backend && ./mvnw test -Dtest='UsernameTest,PasswordPolicyTest,ActorTest'`
Expected: FAIL — compilation errors.

- [ ] **Step 3: Add the error codes**

In `ErrorCode.java`, after `VALIDATION_FAILED`:

```java
    USERNAME_INVALID(HttpStatus.BAD_REQUEST, "Username not allowed"),
    PASSWORD_TOO_SHORT(HttpStatus.BAD_REQUEST, "Password too short"),
    PASSWORD_TOO_LONG(HttpStatus.BAD_REQUEST, "Password too long"),
```

- [ ] **Step 4: Write the domain types**

`Username.java`:

```java
package ie.coursework.identity.domain;

import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * A sign-in name. Students type these on phones, so they're case-insensitive and limited to
 * characters autocorrect leaves alone (roadmap R12). Stored in the normalised form.
 */
public record Username(String value) {

    private static final Pattern FORMAT = Pattern.compile("^[a-z0-9._-]{3,32}$");

    public Username {
        if (value == null || !FORMAT.matcher(value).matches()) {
            throw new DomainException(ErrorCode.USERNAME_INVALID,
                    "Usernames are 3 to 32 characters: letters, numbers, dots, dashes and underscores.");
        }
    }

    public static Username parse(String raw) {
        return new Username(normalise(raw));
    }

    /** The lookup form of whatever was typed, without validating it. Used at sign-in. */
    public static String normalise(String raw) {
        return raw == null ? "" : raw.strip().toLowerCase(Locale.ROOT);
    }
}
```

`PasswordPolicy.java`:

```java
package ie.coursework.identity.domain;

import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.nio.charset.StandardCharsets;

/**
 * Length only, no composition rules (design §5.2). The upper bound exists because bcrypt reads only
 * the first 72 bytes and Spring Security rejects longer input rather than truncating it.
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 10;
    public static final int MAX_LENGTH = 64;
    private static final int MAX_BYTES = 72;

    private PasswordPolicy() {}

    public static void check(String password) {
        int length = password == null ? 0 : password.codePointCount(0, password.length());
        if (length < MIN_LENGTH) {
            throw new DomainException(ErrorCode.PASSWORD_TOO_SHORT,
                    "Passwords need at least " + MIN_LENGTH + " characters.");
        }
        if (length > MAX_LENGTH || password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new DomainException(ErrorCode.PASSWORD_TOO_LONG,
                    "Passwords can be at most " + MAX_LENGTH + " characters.");
        }
    }
}
```

`Role.java`:

```java
package ie.coursework.identity.domain;

public enum Role {
    STUDENT,
    TEACHER,
    SCHOOL_LEADER
}
```

`RoleGrant.java`:

```java
package ie.coursework.identity.domain;

import java.util.UUID;

public record RoleGrant(UUID schoolId, String schoolName, Role role) {}
```

`Actor.java`:

```java
package ie.coursework.identity.domain;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Who is making this request, and what they hold. Every service method takes one (design §9), so a
 * scope check is never more than one argument away. Resolved fresh on every request (roadmap R10).
 */
public record Actor(UUID userId, List<RoleGrant> grants) {

    public Actor {
        grants = List.copyOf(grants);
    }

    public boolean holds(Role role) {
        return grants.stream().anyMatch(grant -> grant.role() == role);
    }

    public boolean holds(Role role, UUID schoolId) {
        return grants.stream().anyMatch(grant -> grant.role() == role && grant.schoolId().equals(schoolId));
    }

    public Set<UUID> schoolsWhere(Role role) {
        return grants.stream()
                .filter(grant -> grant.role() == role)
                .map(RoleGrant::schoolId)
                .collect(Collectors.toUnmodifiableSet());
    }
}
```

`School.java`:

```java
package ie.coursework.identity.domain;

import java.util.UUID;

public record School(UUID id, String name, String rollNumber) {}
```

`UserProfile.java`:

```java
package ie.coursework.identity.domain;

import java.util.UUID;

public record UserProfile(
        UUID userId, String username, String firstName, String lastName, boolean mustChange, boolean disabled) {}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `./mvnw test -Dtest='UsernameTest,PasswordPolicyTest,ActorTest'`
Expected: all pass (18 including parameterised cases).

- [ ] **Step 6: Commit**

```bash
cd .. && git add backend
git commit -m "Add username, password policy and actor rules

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Repositories and the clock

**Files:**
- Create: `shared/config/TimeConfig.java`, `shared/persistence/Timestamps.java`
- Create: `identity/adapter/persistence/UserAccountRepository.java`, `StoredCredential.java`, `SchoolRepository.java`, `RoleRepository.java`
- Test: `identity/adapter/persistence/IdentityRepositoriesTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.identity.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.identity.domain.Role;
import ie.coursework.identity.domain.RoleGrant;
import ie.coursework.identity.domain.Username;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;

class IdentityRepositoriesTest extends PostgresIntegrationTest {

    @Autowired private UserAccountRepository users;
    @Autowired private SchoolRepository schools;
    @Autowired private RoleRepository roles;

    @Test
    void storesAndFindsACredentialByNormalisedUsername() {
        UUID userId = users.insertUser("Aoife", "Byrne");
        users.insertCredential(userId, Username.parse("aoife.b"), "{bcrypt}hash", true);

        StoredCredential credential = users.findCredential(Username.parse("AOIFE.B")).orElseThrow();

        assertThat(credential.userId()).isEqualTo(userId);
        assertThat(credential.passwordHash()).isEqualTo("{bcrypt}hash");
        assertThat(credential.mustChange()).isTrue();
        assertThat(credential.disabled()).isFalse();
    }

    @Test
    void aTakenUsernameIsADuplicateKey() {
        users.insertCredential(users.insertUser("A", "B"), Username.parse("aoife.b"), "x", false);

        assertThatThrownBy(() -> users.insertCredential(users.insertUser("C", "D"), Username.parse("aoife.b"), "x", false))
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void updatingAPasswordClearsOrSetsMustChange() {
        UUID userId = users.insertUser("Aoife", "Byrne");
        users.insertCredential(userId, Username.parse("aoife.b"), "old", true);

        users.updatePassword(userId, "new", false, Instant.parse("2026-10-01T09:00:00Z"));

        StoredCredential credential = users.findCredential(userId).orElseThrow();
        assertThat(credential.passwordHash()).isEqualTo("new");
        assertThat(credential.mustChange()).isFalse();
    }

    @Test
    void profileCarriesNameUsernameAndFlags() {
        UUID userId = users.insertUser("Aoife", "Byrne");
        users.insertCredential(userId, Username.parse("aoife.b"), "x", true);

        assertThat(users.findProfile(userId)).hasValueSatisfying(profile -> {
            assertThat(profile.firstName()).isEqualTo("Aoife");
            assertThat(profile.username()).isEqualTo("aoife.b");
            assertThat(profile.mustChange()).isTrue();
            assertThat(profile.disabled()).isFalse();
        });
    }

    @Test
    void grantingARoleTwiceIsANoOp() {
        UUID userId = users.insertUser("Ms", "Hanlon");
        UUID schoolId = schools.insert("North Wicklow ETSS", "76543A");

        assertThat(roles.grant(userId, schoolId, Role.TEACHER)).isTrue();
        assertThat(roles.grant(userId, schoolId, Role.TEACHER)).isFalse();
        assertThat(roles.grantsFor(userId))
                .containsExactly(new RoleGrant(schoolId, "North Wicklow ETSS", Role.TEACHER));
    }

    @Test
    void findsASchoolByRollNumber() {
        UUID schoolId = schools.insert("North Wicklow ETSS", "76543A");

        assertThat(schools.findByRollNumber("76543A")).hasValueSatisfying(s -> assertThat(s.id()).isEqualTo(schoolId));
        assertThat(schools.findByRollNumber("00000X")).isEmpty();
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && ./mvnw test -Dtest=IdentityRepositoriesTest`
Expected: FAIL — compilation errors.

- [ ] **Step 3: Write the implementation**

`shared/config/TimeConfig.java`:

```java
package ie.coursework.shared.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The one clock. Anything time-dependent takes it, so tests can pin "now". */
@Configuration
public class TimeConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
```

`shared/persistence/Timestamps.java`:

```java
package ie.coursework.shared.persistence;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/** The Postgres driver binds OffsetDateTime to timestamptz but has no mapping for Instant. */
public final class Timestamps {

    private Timestamps() {}

    public static OffsetDateTime utc(Instant instant) {
        return instant == null ? null : OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }
}
```

`identity/adapter/persistence/StoredCredential.java`:

```java
package ie.coursework.identity.adapter.persistence;

import java.util.UUID;

/** A credential row. Holds a password hash, so it never leaves the identity package. */
public record StoredCredential(UUID userId, String username, String passwordHash, boolean mustChange, boolean disabled) {}
```

`UserAccountRepository.java`:

```java
package ie.coursework.identity.adapter.persistence;

import ie.coursework.identity.domain.UserProfile;
import ie.coursework.identity.domain.Username;
import ie.coursework.shared.persistence.Timestamps;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserAccountRepository {

    private static final String CREDENTIAL_COLUMNS = """
            SELECT c.user_id, c.username, c.password_hash, c.must_change, u.disabled_at IS NOT NULL AS disabled
            FROM password_credential c JOIN app_user u ON u.id = c.user_id
            """;

    private final JdbcClient jdbc;

    public UserAccountRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID insertUser(String firstName, String lastName) {
        return jdbc.sql("INSERT INTO app_user (first_name, last_name) VALUES (:first, :last) RETURNING id")
                .param("first", firstName.strip())
                .param("last", lastName.strip())
                .query(UUID.class)
                .single();
    }

    /** Throws DuplicateKeyException when the username is taken; the caller names the problem. */
    public void insertCredential(UUID userId, Username username, String passwordHash, boolean mustChange) {
        jdbc.sql("""
                INSERT INTO password_credential (user_id, username, password_hash, must_change)
                VALUES (:userId, :username, :hash, :mustChange)
                """)
                .param("userId", userId)
                .param("username", username.value())
                .param("hash", passwordHash)
                .param("mustChange", mustChange)
                .update();
    }

    public Optional<StoredCredential> findCredential(Username username) {
        return jdbc.sql(CREDENTIAL_COLUMNS + " WHERE c.username = :username")
                .param("username", username.value())
                .query(StoredCredential.class)
                .optional();
    }

    public Optional<StoredCredential> findCredential(UUID userId) {
        return jdbc.sql(CREDENTIAL_COLUMNS + " WHERE c.user_id = :userId")
                .param("userId", userId)
                .query(StoredCredential.class)
                .optional();
    }

    public void updatePassword(UUID userId, String passwordHash, boolean mustChange, Instant now) {
        jdbc.sql("""
                UPDATE password_credential
                SET password_hash = :hash, must_change = :mustChange, updated_at = :now
                WHERE user_id = :userId
                """)
                .param("hash", passwordHash)
                .param("mustChange", mustChange)
                .param("now", Timestamps.utc(now))
                .param("userId", userId)
                .update();
    }

    public Optional<UserProfile> findProfile(UUID userId) {
        return jdbc.sql("""
                SELECT u.id AS user_id, c.username, u.first_name, u.last_name, c.must_change,
                       u.disabled_at IS NOT NULL AS disabled
                FROM app_user u JOIN password_credential c ON c.user_id = u.id
                WHERE u.id = :userId
                """)
                .param("userId", userId)
                .query(UserProfile.class)
                .optional();
    }
}
```

`SchoolRepository.java`:

```java
package ie.coursework.identity.adapter.persistence;

import ie.coursework.identity.domain.School;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class SchoolRepository {

    private final JdbcClient jdbc;

    public SchoolRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID insert(String name, String rollNumber) {
        return jdbc.sql("INSERT INTO school (name, roll_number) VALUES (:name, :roll) RETURNING id")
                .param("name", name.strip())
                .param("roll", rollNumber.strip())
                .query(UUID.class)
                .single();
    }

    public Optional<School> findByRollNumber(String rollNumber) {
        return jdbc.sql("SELECT id, name, roll_number FROM school WHERE roll_number = :roll")
                .param("roll", rollNumber.strip())
                .query(School.class)
                .optional();
    }
}
```

`RoleRepository.java`:

```java
package ie.coursework.identity.adapter.persistence;

import ie.coursework.identity.domain.Role;
import ie.coursework.identity.domain.RoleGrant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class RoleRepository {

    private final JdbcClient jdbc;

    public RoleRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** True if the grant is new, false if the user already held it. */
    public boolean grant(UUID userId, UUID schoolId, Role role) {
        return jdbc.sql("""
                INSERT INTO user_role (user_id, school_id, role) VALUES (:userId, :schoolId, :role)
                ON CONFLICT ON CONSTRAINT user_role_unique DO NOTHING
                """)
                .param("userId", userId)
                .param("schoolId", schoolId)
                .param("role", role.name())
                .update() == 1;
    }

    public List<RoleGrant> grantsFor(UUID userId) {
        return jdbc.sql("""
                SELECT r.school_id, s.name AS school_name, r.role
                FROM user_role r JOIN school s ON s.id = r.school_id
                WHERE r.user_id = :userId
                ORDER BY s.name, r.role
                """)
                .param("userId", userId)
                .query((rs, row) -> new RoleGrant(
                        rs.getObject("school_id", UUID.class),
                        rs.getString("school_name"),
                        Role.valueOf(rs.getString("role"))))
                .list();
    }
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `./mvnw test -Dtest=IdentityRepositoriesTest`
Expected: 6 tests, 0 failures.

If `query(UUID.class)` fails with "no suitable constructor", this Spring version isn't treating `UUID` as a simple type. Replace those calls with `.query((rs, row) -> rs.getObject(1, UUID.class)).single()`.

- [ ] **Step 5: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Add user, school and role repositories and the shared clock

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Audit log

Design §9. Written before anything that needs auditing.

**Files:**
- Create: `audit/AuditEventType.java`, `audit/AuditLog.java`
- Test: `audit/AuditLogTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.audit;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class AuditLogTest extends PostgresIntegrationTest {

    @Autowired private AuditLog auditLog;

    @Test
    void recordsWhoDidWhatToWhichSubject() {
        UUID actor = jdbcTemplate.queryForObject(
                "INSERT INTO app_user (first_name, last_name) VALUES ('Ms', 'Hanlon') RETURNING id", UUID.class);
        UUID subject = UUID.randomUUID();

        auditLog.record(actor, AuditEventType.ROLE_GRANTED, "user", subject, Map.of("role", "TEACHER"));

        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT actor_user_id, event_type, subject_type, subject_id, details->>'role' AS role, occurred_at"
                        + " FROM audit_event");
        assertThat(row.get("actor_user_id")).isEqualTo(actor);
        assertThat(row.get("event_type")).isEqualTo("ROLE_GRANTED");
        assertThat(row.get("subject_type")).isEqualTo("user");
        assertThat(row.get("subject_id")).isEqualTo(subject);
        assertThat(row.get("role")).isEqualTo("TEACHER");
        assertThat(row.get("occurred_at")).isNotNull();
    }

    @Test
    void theOperatorHasNoUserSoTheActorCanBeEmpty() {
        auditLog.record(null, AuditEventType.SCHOOL_CREATED, "school", UUID.randomUUID(), Map.of());

        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM audit_event WHERE actor_user_id IS NULL", Integer.class))
                .isEqualTo(1);
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && ./mvnw test -Dtest=AuditLogTest`
Expected: FAIL — compilation errors.

- [ ] **Step 3: Write the implementation**

`audit/AuditEventType.java`:

```java
package ie.coursework.audit;

/** Later phases add sign-off and revocation events here. */
public enum AuditEventType {
    SCHOOL_CREATED,
    USER_CREATED,
    ROLE_GRANTED,
    PASSWORD_CHANGED,
    RESET_CODE_ISSUED,
    RESET_CODE_REDEEMED,
    ENROLMENT_APPROVED,
    ENROLMENT_REMOVED,
    JOIN_CODE_ROTATED,
    JOIN_CODE_DISABLED
}
```

`audit/AuditLog.java`:

```java
package ie.coursework.audit;

import ie.coursework.shared.persistence.Timestamps;
import java.time.Clock;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Appends to the audit trail. Call it inside the same transaction as the change it records, so a
 * rolled-back change leaves no event behind.
 *
 * <p>{@code details} is for ids and enum names. Never put a password, a reset code, a join code or
 * anything a student wrote in it.
 */
@Component
public class AuditLog {

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public AuditLog(JdbcClient jdbc, ObjectMapper objectMapper, Clock clock) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public void record(UUID actorUserId, AuditEventType type, String subjectType, UUID subjectId, Map<String, ?> details) {
        jdbc.sql("""
                INSERT INTO audit_event (occurred_at, actor_user_id, event_type, subject_type, subject_id, details)
                VALUES (:occurredAt, :actor, :type, :subjectType, :subjectId, CAST(:details AS jsonb))
                """)
                .param("occurredAt", Timestamps.utc(clock.instant()))
                .param("actor", actorUserId)
                .param("type", type.name())
                .param("subjectType", subjectType)
                .param("subjectId", subjectId)
                .param("details", objectMapper.writeValueAsString(details))
                .update();
    }
}
```

If binding a `null` `actor` fails with "could not determine data type", pass it with an explicit SQL type: `.param("actor", actorUserId, java.sql.Types.OTHER)`.

- [ ] **Step 4: Run the test and watch it pass**

Run: `./mvnw test -Dtest=AuditLogTest`
Expected: 2 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
cd .. && git add backend
git commit -m "Record audit events

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Operator commands

Roadmap R3; design §8.1 step 1. The operator runs the same jar with `operator …` as its first arguments. The web server doesn't start, the command runs in one transaction, and the process exits.

```bash
scripts/operator.sh create-school --name="North Wicklow Educate Together Secondary School" --roll=76543A
scripts/operator.sh create-user --first-name=Katelyn --last-name=Hanlon --username=k.hanlon
scripts/operator.sh grant-role --username=k.hanlon --roll=76543A --role=TEACHER
```

**Files:**
- Modify: `ErrorCode.java`, `CourseworkApplication.java`, `security/SecurityConfig.java`, `Makefile`
- Create: `identity/domain/TemporaryPasswordGenerator.java`, `identity/application/OperatorService.java`, `identity/application/CreatedAccount.java`, `identity/adapter/cli/OperatorCommands.java`, `identity/adapter/cli/OperatorCommandRunner.java`, `scripts/operator.sh`
- Test: `identity/domain/TemporaryPasswordGeneratorTest.java`, `identity/adapter/cli/OperatorCommandsTest.java`, `identity/adapter/cli/OperatorProcessTest.java`

- [ ] **Step 1: Write the failing tests**

`TemporaryPasswordGeneratorTest.java`:

```java
package ie.coursework.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.security.SecureRandom;
import org.junit.jupiter.api.Test;

class TemporaryPasswordGeneratorTest {

    private final TemporaryPasswordGenerator generator = new TemporaryPasswordGenerator(new SecureRandom());

    @Test
    void sixteenCharactersWithNothingThatReadsAsSomethingElse() {
        String password = generator.next();

        assertThat(password).hasSize(16).doesNotContainPattern("[0O1lI]").matches("[A-Za-z2-9]+");
    }

    @Test
    void passesThePasswordPolicy() {
        PasswordPolicy.check(generator.next());
    }

    @Test
    void differsEachTime() {
        assertThat(generator.next()).isNotEqualTo(generator.next());
    }
}
```

`OperatorCommandsTest.java`:

```java
package ie.coursework.identity.adapter.cli;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

class OperatorCommandsTest extends PostgresIntegrationTest {

    @Autowired private OperatorCommands commands;
    @Autowired private PasswordEncoder passwordEncoder;

    private final ByteArrayOutputStream output = new ByteArrayOutputStream();

    private int run(String... args) {
        return commands.run(new DefaultApplicationArguments(args), new PrintStream(output, true, StandardCharsets.UTF_8));
    }

    private String printed() {
        return output.toString(StandardCharsets.UTF_8);
    }

    @Test
    void createsASchool() {
        assertThat(run("operator", "create-school", "--name=North Wicklow ETSS", "--roll=76543A")).isZero();

        assertThat(jdbcTemplate.queryForObject("SELECT name FROM school WHERE roll_number = '76543A'", String.class))
                .isEqualTo("North Wicklow ETSS");
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM audit_event WHERE event_type = 'SCHOOL_CREATED'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void createsAUserWhoMustChangeTheirTemporaryPassword() {
        assertThat(run("operator", "create-user", "--first-name=Katelyn", "--last-name=Hanlon", "--username=K.Hanlon")).isZero();

        String temporary = printed().replaceAll("(?s).*Temporary password \\(shown once\\): (\\S+).*", "$1");
        String hash = jdbcTemplate.queryForObject(
                "SELECT password_hash FROM password_credential WHERE username = 'k.hanlon'", String.class);
        assertThat(passwordEncoder.matches(temporary, hash)).isTrue();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT must_change FROM password_credential WHERE username = 'k.hanlon'", Boolean.class)).isTrue();
    }

    @Test
    void grantsARoleAtASchool() {
        run("operator", "create-school", "--name=North Wicklow ETSS", "--roll=76543A");
        run("operator", "create-user", "--first-name=Katelyn", "--last-name=Hanlon", "--username=k.hanlon");

        assertThat(run("operator", "grant-role", "--username=k.hanlon", "--roll=76543A", "--role=TEACHER")).isZero();

        assertThat(jdbcTemplate.queryForObject("SELECT role FROM user_role", String.class)).isEqualTo("TEACHER");
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM audit_event WHERE event_type = 'ROLE_GRANTED'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void aTakenUsernameIsReportedAndExitsNonZero() {
        run("operator", "create-user", "--first-name=A", "--last-name=B", "--username=k.hanlon");

        assertThat(run("operator", "create-user", "--first-name=C", "--last-name=D", "--username=k.hanlon")).isEqualTo(1);
        assertThat(printed()).contains("error: That username is taken.");
    }

    @Test
    void anUnknownCommandOrMissingOptionPrintsUsage() {
        assertThat(run("operator", "delete-everything")).isEqualTo(2);
        assertThat(run("operator", "create-school", "--name=No roll")).isEqualTo(2);
        assertThat(printed()).contains("usage:");
    }
}
```

`OperatorProcessTest.java` — proves the real entry point starts without a web server and exits:

```java
package ie.coursework.identity.adapter.cli;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.CourseworkApplication;
import ie.coursework.PostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

class OperatorProcessTest extends PostgresIntegrationTest {

    @Test
    void anOperatorInvocationRunsWithoutAWebServerAndReportsItsExitCode() {
        ConfigurableApplicationContext context = CourseworkApplication.start(new String[] {
                "operator", "create-school", "--name=Process School", "--roll=11111B",
                "--spring.datasource.url=" + POSTGRES.getJdbcUrl(),
                "--spring.datasource.username=" + POSTGRES.getUsername(),
                "--spring.datasource.password=" + POSTGRES.getPassword()});

        try {
            assertThat(context.containsBean("apiFilterChain")).isFalse();
            assertThat(SpringApplication.exit(context)).isZero();
        } finally {
            context.close();
        }
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM school WHERE roll_number = '11111B'", Integer.class))
                .isEqualTo(1);
    }
}
```

In `PostgresIntegrationTest`, change `static final PostgreSQLContainer POSTGRES` to `protected static final PostgreSQLContainer POSTGRES` so this test can read it.

- [ ] **Step 2: Run them and watch them fail**

Run: `cd backend && ./mvnw test -Dtest='TemporaryPasswordGeneratorTest,OperatorCommandsTest,OperatorProcessTest'`
Expected: FAIL — compilation errors.

- [ ] **Step 3: Add error codes and a password encoder**

In `ErrorCode.java`, in a new block after `METHOD_NOT_ALLOWED`:

```java
    USERNAME_TAKEN(HttpStatus.CONFLICT, "Username taken"),
    ROLL_NUMBER_TAKEN(HttpStatus.CONFLICT, "Roll number already registered"),
```

In `SecurityConfig.java`, add the class annotation and a bean. The annotation stops the filter chain being built in an operator process, which has no web server:

```java
@Configuration
@ConditionalOnWebApplication
public class SecurityConfig {
```

Move the password encoder into its own configuration, because operator commands need it without a web application. Create `security/PasswordConfig.java`:

```java
package ie.coursework.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Bcrypt behind a delegating encoder, so the algorithm can change later without a reset (roadmap R6). */
@Configuration
public class PasswordConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}
```

Import for the annotation: `org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication`.

- [ ] **Step 4: Write the generator and service**

`identity/domain/TemporaryPasswordGenerator.java`:

```java
package ie.coursework.identity.domain;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

/**
 * Temporary passwords for accounts the operator creates. Read aloud or written down once, so no
 * characters that look like others (0/O, 1/l/I).
 */
@Component
public class TemporaryPasswordGenerator {

    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final int LENGTH = 16;

    private final SecureRandom random;

    public TemporaryPasswordGenerator() {
        this(new SecureRandom());
    }

    TemporaryPasswordGenerator(SecureRandom random) {
        this.random = random;
    }

    public String next() {
        StringBuilder password = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            password.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return password.toString();
    }
}
```

The domain package is meant to be Spring-free; `@Component` here is the one pragmatic exception, so the service can inject it. If a reviewer objects, register it as a `@Bean` in `TimeConfig`'s neighbour instead — behaviour doesn't change.

`identity/application/CreatedAccount.java`:

```java
package ie.coursework.identity.application;

import java.util.UUID;

/** Returned once. The temporary password exists nowhere else in plain text. */
public record CreatedAccount(UUID userId, String username, String temporaryPassword) {}
```

`identity/application/OperatorService.java`:

```java
package ie.coursework.identity.application;

import ie.coursework.audit.AuditEventType;
import ie.coursework.audit.AuditLog;
import ie.coursework.identity.adapter.persistence.RoleRepository;
import ie.coursework.identity.adapter.persistence.SchoolRepository;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Role;
import ie.coursework.identity.domain.School;
import ie.coursework.identity.domain.TemporaryPasswordGenerator;
import ie.coursework.identity.domain.Username;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** What the operator can do (design §8.1 step 1). There's no endpoint for any of it. */
@Service
public class OperatorService {

    private final SchoolRepository schools;
    private final UserAccountRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final TemporaryPasswordGenerator temporaryPasswords;
    private final AuditLog auditLog;

    public OperatorService(SchoolRepository schools, UserAccountRepository users, RoleRepository roles,
            PasswordEncoder passwordEncoder, TemporaryPasswordGenerator temporaryPasswords, AuditLog auditLog) {
        this.schools = schools;
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.temporaryPasswords = temporaryPasswords;
        this.auditLog = auditLog;
    }

    @Transactional
    public UUID createSchool(String name, String rollNumber) {
        try {
            UUID schoolId = schools.insert(name, rollNumber);
            auditLog.record(null, AuditEventType.SCHOOL_CREATED, "school", schoolId, Map.of());
            return schoolId;
        } catch (DuplicateKeyException e) {
            throw new DomainException(ErrorCode.ROLL_NUMBER_TAKEN, "A school with that roll number already exists.");
        }
    }

    @Transactional
    public CreatedAccount createUser(String firstName, String lastName, String rawUsername) {
        Username username = Username.parse(rawUsername);
        String temporaryPassword = temporaryPasswords.next();
        UUID userId = users.insertUser(firstName, lastName);
        try {
            users.insertCredential(userId, username, passwordEncoder.encode(temporaryPassword), true);
        } catch (DuplicateKeyException e) {
            throw new DomainException(ErrorCode.USERNAME_TAKEN, "That username is taken.");
        }
        auditLog.record(null, AuditEventType.USER_CREATED, "user", userId, Map.of());
        return new CreatedAccount(userId, username.value(), temporaryPassword);
    }

    /** True if the role is new. */
    @Transactional
    public boolean grantRole(String rawUsername, String rollNumber, Role role) {
        UUID userId = users.findCredential(Username.parse(rawUsername))
                .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "No user with that username."))
                .userId();
        School school = schools.findByRollNumber(rollNumber)
                .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "No school with that roll number."));

        boolean granted = roles.grant(userId, school.id(), role);
        if (granted) {
            auditLog.record(null, AuditEventType.ROLE_GRANTED, "user", userId,
                    Map.of("schoolId", school.id().toString(), "role", role.name()));
        }
        return granted;
    }
}
```

`DuplicateKeyException` inside a `@Transactional` method: the insert failed, so Postgres has marked the transaction aborted. Throwing the `DomainException` rolls it back, which is what's wanted — nothing (not even the orphan `app_user` row) is committed.

- [ ] **Step 5: Write the command adapter and runner**

`identity/adapter/cli/OperatorCommands.java`:

```java
package ie.coursework.identity.adapter.cli;

import ie.coursework.identity.application.CreatedAccount;
import ie.coursework.identity.application.OperatorService;
import ie.coursework.identity.domain.Role;
import ie.coursework.shared.error.DomainException;
import java.io.PrintStream;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.stereotype.Component;

/** Parses {@code operator <command> --option=value …} and calls OperatorService. */
@Component
public class OperatorCommands {

    static final int OK = 0;
    static final int FAILED = 1;
    static final int USAGE = 2;

    private static final String USAGE_TEXT = """
            usage:
              operator create-school --name=<name> --roll=<roll number>
              operator create-user   --first-name=<name> --last-name=<name> --username=<username>
              operator grant-role    --username=<username> --roll=<roll number> --role=STUDENT|TEACHER|SCHOOL_LEADER
            """;

    private final OperatorService operator;

    public OperatorCommands(OperatorService operator) {
        this.operator = operator;
    }

    public int run(ApplicationArguments args, PrintStream out) {
        List<String> words = args.getNonOptionArgs();
        String command = words.size() > 1 ? words.get(1) : "";
        try {
            return switch (command) {
                case "create-school" -> createSchool(args, out);
                case "create-user" -> createUser(args, out);
                case "grant-role" -> grantRole(args, out);
                default -> usage(out);
            };
        } catch (MissingOption e) {
            out.println("missing --" + e.getMessage());
            return usage(out);
        } catch (DomainException e) {
            out.println("error: " + e.getMessage());
            return FAILED;
        }
    }

    private int createSchool(ApplicationArguments args, PrintStream out) {
        String name = required(args, "name");
        String roll = required(args, "roll");
        out.println("Created school " + name + " (" + roll + ") id=" + operator.createSchool(name, roll));
        return OK;
    }

    private int createUser(ApplicationArguments args, PrintStream out) {
        CreatedAccount account = operator.createUser(
                required(args, "first-name"), required(args, "last-name"), required(args, "username"));
        out.println("Created " + account.username() + ".");
        out.println("Temporary password (shown once): " + account.temporaryPassword());
        return OK;
    }

    private int grantRole(ApplicationArguments args, PrintStream out) {
        String username = required(args, "username");
        String roll = required(args, "roll");
        Role role;
        try {
            role = Role.valueOf(required(args, "role"));
        } catch (IllegalArgumentException e) {
            return usage(out);
        }
        boolean granted = operator.grantRole(username, roll, role);
        out.println((granted ? "Granted " : "Already held: ") + role + " at " + roll + " for " + username);
        return OK;
    }

    private int usage(PrintStream out) {
        out.print(USAGE_TEXT);
        return USAGE;
    }

    private static String required(ApplicationArguments args, String name) {
        List<String> values = args.getOptionValues(name);
        if (values == null || values.isEmpty() || values.getFirst().isBlank()) {
            throw new MissingOption(name);
        }
        return values.getFirst();
    }

    private static final class MissingOption extends RuntimeException {
        MissingOption(String name) {
            super(name);
        }
    }
}
```

`identity/adapter/cli/OperatorCommandRunner.java`:

```java
package ie.coursework.identity.adapter.cli;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.stereotype.Component;

/** Runs an operator command when the process was started with {@code operator} as its first argument. */
@Component
public class OperatorCommandRunner implements ApplicationRunner, ExitCodeGenerator {

    public static final String KEYWORD = "operator";

    private final OperatorCommands commands;
    private int exitCode = 0;

    public OperatorCommandRunner(OperatorCommands commands) {
        this.commands = commands;
    }

    public static boolean isOperatorInvocation(String[] args) {
        return args.length > 0 && KEYWORD.equals(args[0]);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (isOperatorInvocation(args.getSourceArgs())) {
            exitCode = commands.run(args, System.out);
        }
    }

    @Override
    public int getExitCode() {
        return exitCode;
    }
}
```

Replace `CourseworkApplication.java`:

```java
package ie.coursework;

import ie.coursework.identity.adapter.cli.OperatorCommandRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;

@SpringBootApplication
public class CourseworkApplication {

    public static void main(String[] args) {
        ConfigurableApplicationContext context = start(args);
        if (OperatorCommandRunner.isOperatorInvocation(args)) {
            System.exit(SpringApplication.exit(context));
        }
    }

    /** Separate from main so a test can start an operator process without System.exit. */
    public static ConfigurableApplicationContext start(String[] args) {
        SpringApplication application = new SpringApplication(CourseworkApplication.class);
        if (OperatorCommandRunner.isOperatorInvocation(args)) {
            application.setWebApplicationType(WebApplicationType.NONE);
        }
        return application.run(args);
    }
}
```

- [ ] **Step 6: Write the wrapper script and Makefile target**

`scripts/operator.sh`:

```bash
#!/usr/bin/env bash
# Runs an operator command against the database in DATABASE_URL (default: local compose database).
#
#   scripts/operator.sh create-school --name="…" --roll=76543A
#
# Against a deployed database, run the same image the host runs with `operator …` as its arguments
# instead, so the command uses the production secrets and never leaves the host's network.
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backend"

jar="$(ls target/coursework-backend-*.jar 2>/dev/null | head -1 || true)"
if [ -z "$jar" ] || [ -n "$(find src pom.xml -newer "$jar" -print -quit)" ]; then
  ./mvnw --quiet -DskipTests package
  jar="$(ls target/coursework-backend-*.jar | head -1)"
fi

exec java -jar "$jar" operator "$@"
```

```bash
chmod +x scripts/operator.sh
```

- [ ] **Step 7: Run the tests and watch them pass**

Run: `./mvnw test -Dtest='TemporaryPasswordGeneratorTest,OperatorCommandsTest,OperatorProcessTest'`
Expected: 9 tests, 0 failures.

- [ ] **Step 8: Try it for real**

```bash
make db-up
scripts/operator.sh create-school --name="Demo School" --roll=00001A
scripts/operator.sh create-user --first-name=Demo --last-name=Teacher --username=demo.teacher
scripts/operator.sh grant-role --username=demo.teacher --roll=00001A --role=TEACHER
scripts/operator.sh create-school --name="Demo School" --roll=00001A; echo "exit $?"   # error…, exit 1
```

- [ ] **Step 9: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend scripts/operator.sh
git commit -m "Add operator commands to create schools, users and roles

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: JSON login and logout on Spring Session JDBC

Design §5.2. Login is an ordinary JSON endpoint that authenticates through Spring Security's `AuthenticationManager`, so bcrypt comparison and user-enumeration timing protection come from Spring rather than from hand-written code. The session stores only an `AuthenticatedUser(userId)` (roadmap R10).

**Files:**
- Modify: `backend/pom.xml`, `application.yaml`, `backend/.env.example`, `ErrorCode.java`, `security/SecurityConfig.java`
- Create: `security/AuthenticatedUser.java`, `security/CredentialUserDetailsService.java`, `security/SessionEstablisher.java`
- Create: `identity/application/AccountQueries.java`, `identity/application/AccountView.java`
- Create: `identity/adapter/web/AuthController.java`, `LoginRequest.java`, `MeResponse.java`
- Create (test support): `src/test/java/ie/coursework/support/ApiSession.java`, `src/test/java/ie/coursework/support/TestAccounts.java`
- Test: `identity/adapter/web/LoginTest.java`

- [ ] **Step 1: Add Spring Session JDBC**

`pom.xml`, with the main dependencies:

```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-session-jdbc</artifactId>
        </dependency>
```

and with the test dependencies:

```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-session-jdbc-test</artifactId>
            <scope>test</scope>
        </dependency>
```

`application.yaml` — merge into the existing top-level `spring:` and `server:` keys (don't create second copies of them):

```yaml
spring:
  session:
    # Stored in Postgres so a deploy doesn't sign everyone out (design §5.2).
    timeout: 7d
    jdbc:
      # Flyway owns the schema (V3__spring_session.sql).
      initialize-schema: never

server:
  servlet:
    session:
      timeout: 7d
      cookie:
        http-only: true
        # true everywhere except a local backend served over plain http (backend/.env).
        secure: ${APP_COOKIE_SECURE:true}
        same-site: lax
        path: /
```

And in the `test` profile document at the bottom:

```yaml
server:
  servlet:
    session:
      cookie:
        # Pinned so a developer's backend/.env can't change what the cookie tests assert.
        secure: true
```

Append to `backend/.env.example`:

```bash
# Local http only. Safari won't store a Secure cookie from http://localhost.
APP_COOKIE_SECURE=false
```

- [ ] **Step 2: Write the test support**

`src/test/java/ie/coursework/support/TestAccounts.java`:

```java
package ie.coursework.support;

import ie.coursework.identity.adapter.persistence.RoleRepository;
import ie.coursework.identity.adapter.persistence.SchoolRepository;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Role;
import ie.coursework.identity.domain.Username;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates schools and users with known passwords, straight through the repositories. */
@Component
public class TestAccounts {

    public static final String PASSWORD = "correct-horse-battery";

    private final UserAccountRepository users;
    private final SchoolRepository schools;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;

    public TestAccounts(UserAccountRepository users, SchoolRepository schools, RoleRepository roles,
            PasswordEncoder passwordEncoder) {
        this.users = users;
        this.schools = schools;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
    }

    public UUID school(String name, String rollNumber) {
        return schools.insert(name, rollNumber);
    }

    public UUID user(String username) {
        return user(username, PASSWORD, false);
    }

    public UUID user(String username, String password, boolean mustChange) {
        UUID userId = users.insertUser("Test", username);
        users.insertCredential(userId, Username.parse(username), passwordEncoder.encode(password), mustChange);
        return userId;
    }

    public UUID userWithRole(String username, UUID schoolId, Role role) {
        UUID userId = user(username);
        roles.grant(userId, schoolId, role);
        return userId;
    }

    public void disable(UUID userId, org.springframework.jdbc.core.JdbcTemplate jdbc) {
        jdbc.update("UPDATE app_user SET disabled_at = ? WHERE id = ?",
                java.sql.Timestamp.from(Instant.now()), userId);
    }
}
```

`src/test/java/ie/coursework/support/ApiSession.java`:

```java
package ie.coursework.support;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

/**
 * One browser, as far as MockMvc can be one: a cookie jar that updates from every response, and the
 * CSRF header on every unsafe request, fetched from /auth/csrf the first time it's needed.
 *
 * <p>This goes through the real filter chain — Spring Session, CSRF, the security context — rather
 * than MockMvc's {@code csrf()} and {@code with(user(...))} shortcuts, which skip exactly the parts
 * most likely to be misconfigured. Each session gets its own client address so login throttling in
 * one test can't leak into another.
 */
public final class ApiSession {

    private final MockMvc mockMvc;
    private final Map<String, Cookie> jar = new LinkedHashMap<>();
    private final String address = "10.%d.%d.%d".formatted(
            ThreadLocalRandom.current().nextInt(256), ThreadLocalRandom.current().nextInt(256),
            ThreadLocalRandom.current().nextInt(1, 255));

    public ApiSession(MockMvc mockMvc) {
        this.mockMvc = mockMvc;
    }

    public ApiSession login(String username, String password) throws Exception {
        post("/api/v1/auth/login", "{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password))
                .andExpect(status().isOk());
        return this;
    }

    public ResultActions get(String path) throws Exception {
        return perform(MockMvcRequestBuilders.get(path));
    }

    public ResultActions post(String path, String json) throws Exception {
        return perform(withCsrf(MockMvcRequestBuilders.post(path).contentType(MediaType.APPLICATION_JSON).content(json)));
    }

    public ResultActions post(String path) throws Exception {
        return perform(withCsrf(MockMvcRequestBuilders.post(path)));
    }

    public ResultActions put(String path, String json) throws Exception {
        return perform(withCsrf(MockMvcRequestBuilders.put(path).contentType(MediaType.APPLICATION_JSON).content(json)));
    }

    public ResultActions patch(String path, String json) throws Exception {
        return perform(withCsrf(MockMvcRequestBuilders.patch(path).contentType(MediaType.APPLICATION_JSON).content(json)));
    }

    public ResultActions delete(String path) throws Exception {
        return perform(withCsrf(MockMvcRequestBuilders.delete(path)));
    }

    public Optional<String> cookie(String name) {
        return Optional.ofNullable(jar.get(name)).map(Cookie::getValue);
    }

    private MockHttpServletRequestBuilder withCsrf(MockHttpServletRequestBuilder builder) throws Exception {
        if (!jar.containsKey("XSRF-TOKEN")) {
            perform(MockMvcRequestBuilders.get("/api/v1/auth/csrf")).andExpect(status().isNoContent());
        }
        return builder.header("X-XSRF-TOKEN", jar.get("XSRF-TOKEN").getValue());
    }

    private ResultActions perform(MockHttpServletRequestBuilder builder) throws Exception {
        if (!jar.isEmpty()) {
            builder.cookie(jar.values().toArray(Cookie[]::new));
        }
        builder.with(request -> {
            request.setRemoteAddr(address);
            return request;
        });
        ResultActions result = mockMvc.perform(builder);
        for (Cookie cookie : result.andReturn().getResponse().getCookies()) {
            if (cookie.getMaxAge() == 0) {
                jar.remove(cookie.getName());
            } else {
                jar.put(cookie.getName(), cookie);
            }
        }
        return result;
    }
}
```

- [ ] **Step 3: Write the failing test**

`identity/adapter/web/LoginTest.java`:

```java
package ie.coursework.identity.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.TestAccounts;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class LoginTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestAccounts accounts;

    private String loginBody(String username, String password) {
        return "{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password);
    }

    @Test
    void correctCredentialsStartASessionAndReturnTheAccount() throws Exception {
        UUID userId = accounts.user("aoife.b");
        ApiSession browser = new ApiSession(mockMvc);

        browser.post("/api/v1/auth/login", loginBody("aoife.b", TestAccounts.PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(userId.toString()))
                .andExpect(jsonPath("$.username").value("aoife.b"))
                .andExpect(jsonPath("$.mustChangePassword").value(false));

        assertThat(browser.cookie("SESSION")).isPresent();
        browser.get("/api/v1/auth/me").andExpect(status().isOk());
    }

    @Test
    void theUsernameIsCaseInsensitive() throws Exception {
        accounts.user("aoife.b");

        new ApiSession(mockMvc).post("/api/v1/auth/login", loginBody("  Aoife.B ", TestAccounts.PASSWORD))
                .andExpect(status().isOk());
    }

    @Test
    void wrongPasswordUnknownUserAndDisabledUserAllGetTheSameAnswer() throws Exception {
        UUID disabled = accounts.user("disabled.user");
        accounts.disable(disabled, jdbcTemplate);
        accounts.user("aoife.b");

        String wrongPassword = new ApiSession(mockMvc).post("/api/v1/auth/login", loginBody("aoife.b", "not-the-password"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andReturn().getResponse().getContentAsString();
        String unknownUser = new ApiSession(mockMvc).post("/api/v1/auth/login", loginBody("nobody.here", "whatever-it-is"))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        String disabledUser = new ApiSession(mockMvc).post("/api/v1/auth/login", loginBody("disabled.user", TestAccounts.PASSWORD))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(unknownUser).isEqualTo(wrongPassword);
        assertThat(disabledUser).isEqualTo(wrongPassword);
    }

    @Test
    void aFailedLoginStartsNoSession() throws Exception {
        accounts.user("aoife.b");
        ApiSession browser = new ApiSession(mockMvc);

        browser.post("/api/v1/auth/login", loginBody("aoife.b", "not-the-password"));

        assertThat(browser.cookie("SESSION")).isEmpty();
    }

    @Test
    void anOverlongPasswordIsJustWrongNotAServerError() throws Exception {
        accounts.user("aoife.b");

        new ApiSession(mockMvc).post("/api/v1/auth/login", loginBody("aoife.b", "x".repeat(100)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void signingInAgainRotatesTheSessionId() throws Exception {
        accounts.user("first.user");
        accounts.user("second.user");
        ApiSession browser = new ApiSession(mockMvc).login("first.user", TestAccounts.PASSWORD);
        String before = browser.cookie("SESSION").orElseThrow();

        browser.login("second.user", TestAccounts.PASSWORD);

        assertThat(browser.cookie("SESSION")).isPresent().get().isNotEqualTo(before);
    }

    @Test
    void logoutEndsTheSession() throws Exception {
        accounts.user("aoife.b");
        ApiSession browser = new ApiSession(mockMvc).login("aoife.b", TestAccounts.PASSWORD);

        browser.post("/api/v1/auth/logout").andExpect(status().isNoContent());

        browser.get("/api/v1/auth/me").andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithoutTheCsrfHeaderIsRefused() throws Exception {
        accounts.user("aoife.b");

        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("aoife.b", TestAccounts.PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
    }
}
```

- [ ] **Step 4: Run it and watch it fail**

Run: `cd backend && ./mvnw test -Dtest=LoginTest`
Expected: FAIL — compilation errors (no `AuthController`, no `INVALID_CREDENTIALS`).

- [ ] **Step 5: Write the security pieces**

In `ErrorCode.java`, after `UNAUTHENTICATED`:

```java
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Wrong username or password"),
```

`security/AuthenticatedUser.java`:

```java
package ie.coursework.security;

import java.io.Serializable;
import java.security.Principal;
import java.util.UUID;

/**
 * What the session remembers about who's signed in: the user id and nothing else (roadmap R10).
 * Roles are loaded per request. As a {@link Principal} its name is the user id, which is what
 * Spring Session indexes, so every session for a user can be found and ended.
 */
public record AuthenticatedUser(UUID userId) implements Principal, Serializable {

    @Override
    public String getName() {
        return userId.toString();
    }
}
```

`security/CredentialUserDetailsService.java`:

```java
package ie.coursework.security;

import ie.coursework.identity.adapter.persistence.StoredCredential;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Username;
import ie.coursework.shared.error.DomainException;
import java.util.List;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Looks up a credential for Spring's DaoAuthenticationProvider. The UserDetails "username" is the
 * user id, so the authenticated result names the account without a second lookup.
 */
@Service
public class CredentialUserDetailsService implements UserDetailsService {

    private final UserAccountRepository users;

    public CredentialUserDetailsService(UserAccountRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String typed) {
        StoredCredential credential;
        try {
            credential = users.findCredential(Username.parse(typed))
                    .orElseThrow(() -> new UsernameNotFoundException("unknown"));
        } catch (DomainException invalidFormat) {
            throw new UsernameNotFoundException("unknown");
        }
        return User.withUsername(credential.userId().toString())
                .password(credential.passwordHash())
                .disabled(credential.disabled())
                .authorities(List.of())
                .build();
    }
}
```

`security/SessionEstablisher.java`:

```java
package ie.coursework.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

/**
 * Starts and ends sessions for the JSON endpoints. Spring's form login would do this for us, but
 * this API has no form login, so the steps it performs are here explicitly: rotate the session id
 * (session fixation), put a minimal principal in a fresh security context, and save it to the
 * session the filter chain reads from.
 */
@Component
public class SessionEstablisher {

    private final SecurityContextRepository repository = new HttpSessionSecurityContextRepository();
    private final SessionAuthenticationStrategy sessionFixation = new ChangeSessionIdAuthenticationStrategy();
    private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

    public void signIn(UUID userId, HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication =
                UsernamePasswordAuthenticationToken.authenticated(new AuthenticatedUser(userId), null, List.of());
        sessionFixation.onAuthentication(authentication, request, response);
        SecurityContext context = holder.createEmptyContext();
        context.setAuthentication(authentication);
        holder.setContext(context);
        repository.saveContext(context, request, response);
    }

    public void signOut(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        holder.clearContext();
    }
}
```

In `SecurityConfig.java`, add the authentication manager bean:

```java
    @Bean
    AuthenticationManager authenticationManager(CredentialUserDetailsService credentials, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(credentials);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }
```

(imports: `org.springframework.security.authentication.AuthenticationManager`, `…authentication.ProviderManager`, `…authentication.dao.DaoAuthenticationProvider`, `org.springframework.security.crypto.password.PasswordEncoder`)

And open the login endpoint in `authorizeHttpRequests`, after the existing `GET` line:

```java
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
```

- [ ] **Step 6: Write the application and web pieces**

`identity/application/AccountView.java`:

```java
package ie.coursework.identity.application;

import ie.coursework.identity.domain.RoleGrant;
import ie.coursework.identity.domain.UserProfile;
import java.util.List;

public record AccountView(UserProfile profile, List<RoleGrant> grants) {}
```

`identity/application/AccountQueries.java`:

```java
package ie.coursework.identity.application;

import ie.coursework.identity.adapter.persistence.RoleRepository;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AccountQueries {

    private final UserAccountRepository users;
    private final RoleRepository roles;

    public AccountQueries(UserAccountRepository users, RoleRepository roles) {
        this.users = users;
        this.roles = roles;
    }

    public AccountView account(UUID userId) {
        return users.findProfile(userId)
                .map(profile -> new AccountView(profile, roles.grantsFor(userId)))
                .orElseThrow(() -> new DomainException(ErrorCode.UNAUTHENTICATED, "Sign in to continue."));
    }
}
```

`identity/adapter/web/LoginRequest.java`:

```java
package ie.coursework.identity.adapter.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(@NotBlank @Size(max = 64) String username, @NotBlank @Size(max = 256) String password) {}
```

`identity/adapter/web/MeResponse.java`:

```java
package ie.coursework.identity.adapter.web;

import ie.coursework.identity.application.AccountView;
import ie.coursework.identity.domain.Role;
import java.util.List;
import java.util.UUID;

/** The signed-in account, as `GET /auth/me` and `POST /auth/login` return it (roadmap §7). */
public record MeResponse(
        UUID userId, String username, String firstName, String lastName, boolean mustChangePassword, List<RoleView> roles) {

    public record RoleView(UUID schoolId, String schoolName, Role role) {}

    static MeResponse from(AccountView account) {
        return new MeResponse(
                account.profile().userId(),
                account.profile().username(),
                account.profile().firstName(),
                account.profile().lastName(),
                account.profile().mustChange(),
                account.grants().stream()
                        .map(grant -> new RoleView(grant.schoolId(), grant.schoolName(), grant.role()))
                        .toList());
    }
}
```

`identity/adapter/web/AuthController.java`:

```java
package ie.coursework.identity.adapter.web;

import ie.coursework.identity.application.AccountQueries;
import ie.coursework.security.AuthenticatedUser;
import ie.coursework.security.SessionEstablisher;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    /** Bcrypt reads no further, and Spring Security refuses longer input with an exception. */
    private static final int BCRYPT_MAX_BYTES = 72;

    private final AuthenticationManager authenticationManager;
    private final SessionEstablisher sessions;
    private final AccountQueries accounts;

    public AuthController(AuthenticationManager authenticationManager, SessionEstablisher sessions, AccountQueries accounts) {
        this.authenticationManager = authenticationManager;
        this.sessions = sessions;
        this.accounts = accounts;
    }

    @PostMapping("/login")
    MeResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        UUID userId = authenticate(body.username(), body.password());
        sessions.signIn(userId, request, response);
        return MeResponse.from(accounts.account(userId));
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(HttpServletRequest request) {
        sessions.signOut(request);
        return ResponseEntity.noContent().build();
    }

    /** Replaced in Task 9 by a version that takes the resolved Actor. */
    @GetMapping("/me")
    MeResponse me(@AuthenticationPrincipal AuthenticatedUser user) {
        return MeResponse.from(accounts.account(user.userId()));
    }

    private UUID authenticate(String username, String password) {
        // One message for every failure, so the response never says which part was wrong (design §10).
        DomainException wrong = new DomainException(ErrorCode.INVALID_CREDENTIALS, "Wrong username or password.");
        if (password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES) {
            throw wrong;
        }
        try {
            Authentication result = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(username, password));
            return UUID.fromString(result.getName());
        } catch (AuthenticationException e) {
            throw wrong;
        }
    }
}
```

- [ ] **Step 7: Run the test and watch it pass**

Run: `./mvnw test -Dtest=LoginTest`
Expected: 8 tests, 0 failures.

If `signingInAgainRotatesTheSessionId` fails because the value is equal, the session id wasn't changed: check `ChangeSessionIdAuthenticationStrategy` ran (it does nothing when no session exists yet, which is correct for a first sign-in but not the second).

If every authenticated request after login returns 401, the security context was saved somewhere the filter chain doesn't read. The default chain reads `HttpSessionSecurityContextRepository`'s attribute; check nothing in `SecurityConfig` replaced `securityContext(...)`.

- [ ] **Step 8: Verify the session schema matches the jar**

Run the comparison from Task 1 Step 3. If the jar's file differs from `V3__spring_session.sql` in anything but case and whitespace, stop and report the difference.

- [ ] **Step 9: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Sign in and out over JSON with sessions stored in Postgres

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Session flow over real HTTP

MockMvc parses cookies but isn't a browser. This test runs the servlet container on a real port and passes cookies by hand, so each assertion names exactly which credential was sent (the pattern developerJournal's `AuthFlowTests` uses).

**Files:**
- Test: `security/SessionFlowTest.java`

- [ ] **Step 1: Write the test**

```java
package ie.coursework.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.TestAccounts;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

@SpringBootTest(webEnvironment = RANDOM_PORT)
class SessionFlowTest extends PostgresIntegrationTest {

    @LocalServerPort private int port;
    @Autowired private TestAccounts accounts;

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void signInUseTheCookieAndSignOut() throws Exception {
        UUID userId = accounts.user("aoife.b");

        HttpResponse<String> csrf = send(HttpRequest.newBuilder(uri("/api/v1/auth/csrf")).GET(), List.of());
        String xsrfCookie = cookie(csrf, "XSRF-TOKEN");
        String token = xsrfCookie.substring("XSRF-TOKEN=".length());

        String body = "{\"username\":\"aoife.b\",\"password\":\"%s\"}".formatted(TestAccounts.PASSWORD);

        HttpResponse<String> withoutHeader = send(HttpRequest.newBuilder(uri("/api/v1/auth/login"))
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)), List.of(xsrfCookie));
        assertThat(withoutHeader.statusCode()).isEqualTo(403);

        HttpResponse<String> login = send(HttpRequest.newBuilder(uri("/api/v1/auth/login"))
                .header("content-type", "application/json")
                .header("x-xsrf-token", token)
                .POST(HttpRequest.BodyPublishers.ofString(body)), List.of(xsrfCookie));
        assertThat(login.statusCode()).isEqualTo(200);

        String setCookie = login.headers().allValues("set-cookie").stream()
                .filter(value -> value.startsWith("SESSION=")).findFirst().orElseThrow();
        assertThat(setCookie).contains("HttpOnly").contains("SameSite=Lax").contains("Secure").contains("Path=/");
        String session = setCookie.split(";", 2)[0];

        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM spring_session WHERE principal_name = ?", Integer.class, userId.toString()))
                .as("the session is in Postgres, indexed by user id").isEqualTo(1);

        assertThat(send(HttpRequest.newBuilder(uri("/api/v1/auth/me")).GET(), List.of()).statusCode()).isEqualTo(401);
        assertThat(send(HttpRequest.newBuilder(uri("/api/v1/auth/me")).GET(), List.of(session)).statusCode()).isEqualTo(200);

        HttpResponse<String> logout = send(HttpRequest.newBuilder(uri("/api/v1/auth/logout"))
                .header("x-xsrf-token", token)
                .POST(HttpRequest.BodyPublishers.noBody()), List.of(session, xsrfCookie));
        assertThat(logout.statusCode()).isEqualTo(204);

        assertThat(send(HttpRequest.newBuilder(uri("/api/v1/auth/me")).GET(), List.of(session)).statusCode())
                .as("the same cookie is worth nothing after logout").isEqualTo(401);
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private HttpResponse<String> send(HttpRequest.Builder request, List<String> cookies) throws Exception {
        if (!cookies.isEmpty()) {
            request.header("cookie", String.join("; ", cookies));
        }
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String cookie(HttpResponse<?> response, String name) {
        return response.headers().allValues("set-cookie").stream()
                .filter(value -> value.startsWith(name + "="))
                .map(value -> value.split(";", 2)[0])
                .findFirst().orElseThrow();
    }
}
```

- [ ] **Step 2: Run it**

Run: `cd backend && ./mvnw test -Dtest=SessionFlowTest`
Expected: PASS. Task 6 already built the behaviour, so this test is a check on it rather than a driver, and it may pass first time. **Prove it can fail:** temporarily change `same-site: lax` to `strict` in `application.yaml`, run it, watch the `SameSite=Lax` assertion fail, and put `lax` back.

If the JDK client refuses to send a `cookie` header ("restricted header name"), set the system property in the test class: `static { System.setProperty("jdk.httpclient.allowRestrictedHeaders", "cookie"); }`.

- [ ] **Step 3: Commit**

```bash
cd .. && git add backend
git commit -m "Prove session cookies, CSRF and logout over real HTTP

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Login rate limiting and the trusted client address

Roadmap R7 and R8; design §5.2. In memory, which is right for a single API instance. **If the host ever runs more than one instance, this must move to the database first** — note it in `CLAUDE.md` in Task 11.

**Files:**
- Modify: `ErrorCode.java`, `CourseworkApplication.java`, `application.yaml`, `AuthController.java`, `PostgresIntegrationTest.java`
- Create: `shared/InMemoryState.java`, `security/AttemptLimiter.java`, `security/LoginThrottle.java`, `security/LoginLimitsProperties.java`, `security/ClientAddressResolver.java`
- Create (test support): `src/test/java/ie/coursework/support/MutableClock.java`
- Test: `security/AttemptLimiterTest.java`, `security/ClientAddressResolverTest.java`, `security/LoginThrottleTest.java`

- [ ] **Step 1: Write the failing tests**

`support/MutableClock.java`:

```java
package ie.coursework.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

public final class MutableClock extends Clock {

    private Instant now;

    public MutableClock(Instant start) {
        this.now = start;
    }

    public void advance(Duration duration) {
        now = now.plus(duration);
    }

    @Override
    public Instant instant() {
        return now;
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return this;
    }
}
```

`security/AttemptLimiterTest.java`:

```java
package ie.coursework.security;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class AttemptLimiterTest {

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-05T09:00:00Z"));
    private final AttemptLimiter limiter = new AttemptLimiter(3, Duration.ofMinutes(15), clock);

    @Test
    void allowsUntilTheLimitIsReached() {
        limiter.recordFailure("k");
        limiter.recordFailure("k");
        assertThat(limiter.blockedFor("k")).isEmpty();

        limiter.recordFailure("k");
        assertThat(limiter.blockedFor("k")).contains(Duration.ofMinutes(15));
    }

    @Test
    void theWaitIsUntilTheOldestFailureLeavesTheWindow() {
        limiter.recordFailure("k");
        clock.advance(Duration.ofMinutes(5));
        limiter.recordFailure("k");
        limiter.recordFailure("k");

        assertThat(limiter.blockedFor("k")).contains(Duration.ofMinutes(10));

        clock.advance(Duration.ofMinutes(10));
        assertThat(limiter.blockedFor("k")).isEmpty();
    }

    @Test
    void keysAreIndependentAndClearingOneResetsIt() {
        for (int i = 0; i < 3; i++) limiter.recordFailure("a");

        assertThat(limiter.blockedFor("b")).isEmpty();
        limiter.clear("a");
        assertThat(limiter.blockedFor("a")).isEmpty();
    }
}
```

`security/ClientAddressResolverTest.java`:

```java
package ie.coursework.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientAddressResolverTest {

    private final ClientAddressResolver resolver = new ClientAddressResolver("s3cret");

    private MockHttpServletRequest request(String forwardedFor, String secret) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("76.76.21.21");
        if (forwardedFor != null) request.addHeader("X-Forwarded-For", forwardedFor);
        if (secret != null) request.addHeader("X-Proxy-Secret", secret);
        return request;
    }

    @Test
    void trustsTheForwardedAddressWhenTheProxySecretMatches() {
        assertThat(resolver.resolve(request("203.0.113.7", "s3cret"))).isEqualTo("203.0.113.7");
    }

    @Test
    void ignoresAForwardedAddressWithoutTheSecret() {
        assertThat(resolver.resolve(request("203.0.113.7", null))).isEqualTo("76.76.21.21");
        assertThat(resolver.resolve(request("203.0.113.7", "guess"))).isEqualTo("76.76.21.21");
    }

    @Test
    void takesOnlyTheFirstEntry() {
        assertThat(resolver.resolve(request("203.0.113.7, 10.0.0.1", "s3cret"))).isEqualTo("203.0.113.7");
    }

    @Test
    void trustsNothingWhenNoSecretIsConfigured() {
        assertThat(new ClientAddressResolver("").resolve(request("203.0.113.7", ""))).isEqualTo("76.76.21.21");
    }
}
```

`security/LoginThrottleTest.java`:

```java
package ie.coursework.security;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class LoginThrottleTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestAccounts accounts;

    private static String body(String username, String password) {
        return "{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password);
    }

    @Test
    void theSixthAttemptOnOneUsernameIsRefusedEvenWithTheRightPassword() throws Exception {
        accounts.user("aoife.b");
        ApiSession attacker = new ApiSession(mockMvc);
        for (int i = 0; i < 5; i++) {
            attacker.post("/api/v1/auth/login", body("aoife.b", "wrong-guess-" + i)).andExpect(status().isUnauthorized());
        }

        new ApiSession(mockMvc).post("/api/v1/auth/login", body("aoife.b", TestAccounts.PASSWORD))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("TOO_MANY_ATTEMPTS"));
    }

    @Test
    void anotherUsernameIsUnaffected() throws Exception {
        accounts.user("aoife.b");
        accounts.user("cian.m");
        ApiSession attacker = new ApiSession(mockMvc);
        for (int i = 0; i < 5; i++) {
            attacker.post("/api/v1/auth/login", body("aoife.b", "wrong-guess-" + i));
        }

        new ApiSession(mockMvc).login("cian.m", TestAccounts.PASSWORD);
    }

    @Test
    void aSuccessfulLoginClearsTheUsernameCount() throws Exception {
        accounts.user("aoife.b");
        ApiSession student = new ApiSession(mockMvc);
        for (int i = 0; i < 4; i++) {
            student.post("/api/v1/auth/login", body("aoife.b", "typo-" + i));
        }
        student.login("aoife.b", TestAccounts.PASSWORD);

        for (int i = 0; i < 4; i++) {
            student.post("/api/v1/auth/login", body("aoife.b", "typo-again-" + i)).andExpect(status().isUnauthorized());
        }
    }
}
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd backend && ./mvnw test -Dtest='AttemptLimiterTest,ClientAddressResolverTest,LoginThrottleTest'`
Expected: FAIL — compilation errors.

- [ ] **Step 3: Write the implementation**

In `ErrorCode.java`, after `METHOD_NOT_ALLOWED`:

```java
    TOO_MANY_ATTEMPTS(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts"),
```

`shared/InMemoryState.java`:

```java
package ie.coursework.shared;

/**
 * A bean that holds state in memory rather than in Postgres. Tests clear every such bean before
 * each test (PostgresIntegrationTest), the same way they truncate tables.
 */
public interface InMemoryState {
    void clear();
}
```

`security/AttemptLimiter.java`:

```java
package ie.coursework.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/** Counts failures per key within a sliding window. Synchronized: the volumes here are tiny. */
public final class AttemptLimiter {

    private final int limit;
    private final Duration window;
    private final Clock clock;
    private final Map<String, Deque<Instant>> failures = new HashMap<>();

    public AttemptLimiter(int limit, Duration window, Clock clock) {
        this.limit = limit;
        this.window = window;
        this.clock = clock;
    }

    /** How long until the next attempt is allowed, or empty if it's allowed now. */
    public synchronized Optional<Duration> blockedFor(String key) {
        Deque<Instant> recent = pruned(key);
        if (recent.size() < limit) {
            return Optional.empty();
        }
        return Optional.of(Duration.between(clock.instant(), recent.peekFirst().plus(window)));
    }

    public synchronized void recordFailure(String key) {
        pruned(key).addLast(clock.instant());
    }

    public synchronized void clear(String key) {
        failures.remove(key);
    }

    public synchronized void clearAll() {
        failures.clear();
    }

    private Deque<Instant> pruned(String key) {
        Deque<Instant> recent = failures.computeIfAbsent(key, k -> new ArrayDeque<>());
        Instant cutoff = clock.instant().minus(window);
        while (!recent.isEmpty() && !recent.peekFirst().isAfter(cutoff)) {
            recent.removeFirst();
        }
        return recent;
    }
}
```

`security/LoginLimitsProperties.java`:

```java
package ie.coursework.security;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.login-limits")
public record LoginLimitsProperties(int perUsername, int perAddress, Duration window) {}
```

`security/LoginThrottle.java`:

```java
package ie.coursework.security;

import ie.coursework.shared.InMemoryState;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

/**
 * Failures only, per username and per client address (roadmap R7). The per-address limit is high
 * because a whole school shares one address.
 */
@Component
public class LoginThrottle implements InMemoryState {

    private final AttemptLimiter byUsername;
    private final AttemptLimiter byAddress;

    public LoginThrottle(LoginLimitsProperties limits, Clock clock) {
        this.byUsername = new AttemptLimiter(limits.perUsername(), limits.window(), clock);
        this.byAddress = new AttemptLimiter(limits.perAddress(), limits.window(), clock);
    }

    public void checkAllowed(String username, String address) {
        Optional<Duration> wait = Stream.of(byUsername.blockedFor(username), byAddress.blockedFor(address))
                .flatMap(Optional::stream)
                .max(Duration::compareTo);
        if (wait.isPresent()) {
            long minutes = Math.max(1, (wait.get().toSeconds() + 59) / 60);
            throw new DomainException(ErrorCode.TOO_MANY_ATTEMPTS,
                    "Too many attempts. Try again in " + minutes + (minutes == 1 ? " minute." : " minutes."));
        }
    }

    public void recordFailure(String username, String address) {
        byUsername.recordFailure(username);
        byAddress.recordFailure(address);
    }

    public void recordSuccess(String username) {
        byUsername.clear(username);
    }

    @Override
    public void clear() {
        byUsername.clearAll();
        byAddress.clearAll();
    }
}
```

`security/ClientAddressResolver.java`:

```java
package ie.coursework.security;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The address a request really came from. Behind the Next.js proxy the socket address is Vercel's,
 * so the proxy forwards the client's address — which Spring believes only when the shared secret
 * comes with it (roadmap R8). Anyone else can put anything in X-Forwarded-For.
 */
@Component
public class ClientAddressResolver {

    private final byte[] secret;

    public ClientAddressResolver(@Value("${app.proxy-secret:}") String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String resolve(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String presented = request.getHeader("X-Proxy-Secret");
        boolean trusted = secret.length > 0 && presented != null
                && MessageDigest.isEqual(secret, presented.getBytes(StandardCharsets.UTF_8));
        if (trusted && forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].strip();
        }
        return request.getRemoteAddr();
    }
}
```

`application.yaml`, a new top-level block:

```yaml
app:
  proxy-secret: ${PROXY_SHARED_SECRET:}
  login-limits:
    per-username: 5
    per-address: 100
    window: 15m
```

`CourseworkApplication.java`: add `@ConfigurationPropertiesScan` beside `@SpringBootApplication` (import `org.springframework.boot.context.properties.ConfigurationPropertiesScan`).

`PostgresIntegrationTest.java`: clear in-memory state alongside the tables. Add the field and extend the reset method:

```java
    @Autowired private org.springframework.context.ApplicationContext applicationContext;

    @BeforeEach
    void resetApplicationData() {
        // …existing truncation…
        applicationContext.getBeansOfType(ie.coursework.shared.InMemoryState.class).values()
                .forEach(ie.coursework.shared.InMemoryState::clear);
    }
```

Wire the throttle into `AuthController`. Add constructor parameters `LoginThrottle throttle, ClientAddressResolver clientAddress`, store them, and replace `login`:

```java
    @PostMapping("/login")
    MeResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        String username = Username.normalise(body.username());
        String address = clientAddress.resolve(request);
        throttle.checkAllowed(username, address);

        UUID userId;
        try {
            userId = authenticate(body.username(), body.password());
        } catch (DomainException wrong) {
            throttle.recordFailure(username, address);
            throw wrong;
        }
        throttle.recordSuccess(username);
        sessions.signIn(userId, request, response);
        return MeResponse.from(accounts.account(userId));
    }
```

(import `ie.coursework.identity.domain.Username`)

- [ ] **Step 4: Run the tests and watch them pass**

Run: `./mvnw test -Dtest='AttemptLimiterTest,ClientAddressResolverTest,LoginThrottleTest'`
Expected: 10 tests, 0 failures.

- [ ] **Step 5: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Throttle failed logins per username and per trusted client address

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: The actor and `GET /auth/me`

Design §9: every request resolves to roles and scopes, and every service method takes the acting user. From here on, **controllers take an `Actor` parameter**; nothing reads the security context directly.

**Files:**
- Create: `identity/application/ActorResolver.java`, `security/CurrentActorArgumentResolver.java`, `shared/web/WebConfig.java`
- Modify: `identity/adapter/web/AuthController.java`
- Test: `identity/adapter/web/MeEndpointTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.identity.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.identity.adapter.persistence.RoleRepository;
import ie.coursework.identity.domain.Role;
import ie.coursework.support.ApiSession;
import ie.coursework.support.TestAccounts;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class MeEndpointTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestAccounts accounts;
    @Autowired private RoleRepository roles;

    @Test
    void listsEveryRoleTheUserHolds() throws Exception {
        UUID school = accounts.school("North Wicklow ETSS", "76543A");
        UUID yearHead = accounts.userWithRole("year.head", school, Role.TEACHER);
        roles.grant(yearHead, school, Role.SCHOOL_LEADER);

        new ApiSession(mockMvc).login("year.head", TestAccounts.PASSWORD)
                .get("/api/v1/auth/me")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles.length()").value(2))
                .andExpect(jsonPath("$.roles[*].role").value(org.hamcrest.Matchers.containsInAnyOrder("TEACHER", "SCHOOL_LEADER")))
                .andExpect(jsonPath("$.roles[0].schoolName").value("North Wicklow ETSS"));
    }

    @Test
    void aRoleGrantedMidSessionShowsUpOnTheNextRequest() throws Exception {
        UUID school = accounts.school("North Wicklow ETSS", "76543A");
        UUID userId = accounts.user("new.teacher");
        ApiSession browser = new ApiSession(mockMvc).login("new.teacher", TestAccounts.PASSWORD);
        browser.get("/api/v1/auth/me").andExpect(jsonPath("$.roles.length()").value(0));

        roles.grant(userId, school, Role.TEACHER);

        browser.get("/api/v1/auth/me").andExpect(jsonPath("$.roles[0].role").value("TEACHER"));
    }

    @Test
    void aUserDisabledMidSessionIsSignedOutOnTheNextRequest() throws Exception {
        UUID userId = accounts.user("leaver");
        ApiSession browser = new ApiSession(mockMvc).login("leaver", TestAccounts.PASSWORD);

        accounts.disable(userId, jdbcTemplate);

        browser.get("/api/v1/auth/me")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && ./mvnw test -Dtest=MeEndpointTest`
Expected: FAIL on `aUserDisabledMidSessionIsSignedOutOnTheNextRequest` — Task 6's `/me` still returns 200 for a disabled user. (The first two may already pass; that's fine.)

- [ ] **Step 3: Write the implementation**

`identity/application/ActorResolver.java`:

```java
package ie.coursework.identity.application;

import ie.coursework.identity.adapter.persistence.RoleRepository;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Actor;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Loads the actor for a signed-in user id, fresh on every request (roadmap R10). */
@Service
public class ActorResolver {

    private final UserAccountRepository users;
    private final RoleRepository roles;

    public ActorResolver(UserAccountRepository users, RoleRepository roles) {
        this.users = users;
        this.roles = roles;
    }

    public Actor resolve(UUID userId) {
        boolean active = users.findProfile(userId).map(profile -> !profile.disabled()).orElse(false);
        if (!active) {
            throw new DomainException(ErrorCode.UNAUTHENTICATED, "Sign in to continue.");
        }
        return new Actor(userId, roles.grantsFor(userId));
    }
}
```

`security/CurrentActorArgumentResolver.java`:

```java
package ie.coursework.security;

import ie.coursework.identity.application.ActorResolver;
import ie.coursework.identity.domain.Actor;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/** Supplies an {@link Actor} to any controller method that declares one. */
@Component
public class CurrentActorArgumentResolver implements HandlerMethodArgumentResolver {

    private final ActorResolver actors;

    public CurrentActorArgumentResolver(ActorResolver actors) {
        this.actors = actors;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return Actor.class.equals(parameter.getParameterType());
    }

    @Override
    public Actor resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return actors.resolve(user.userId());
        }
        throw new DomainException(ErrorCode.UNAUTHENTICATED, "Sign in to continue.");
    }
}
```

`shared/web/WebConfig.java`:

```java
package ie.coursework.shared.web;

import ie.coursework.security.CurrentActorArgumentResolver;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final CurrentActorArgumentResolver currentActor;

    public WebConfig(CurrentActorArgumentResolver currentActor) {
        this.currentActor = currentActor;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentActor);
    }
}
```

In `AuthController.java`, replace the `me` method (and drop the now-unused `AuthenticationPrincipal` and `AuthenticatedUser` imports):

```java
    @GetMapping("/me")
    MeResponse me(Actor actor) {
        return MeResponse.from(accounts.account(actor.userId()));
    }
```

(import `ie.coursework.identity.domain.Actor`)

- [ ] **Step 4: Run the test and watch it pass**

Run: `./mvnw test -Dtest=MeEndpointTest`
Expected: 3 tests, 0 failures.

- [ ] **Step 5: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Resolve the acting user and their roles on every request

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Change password, forced change, and `GET /subjects`

Design §8.1 step 1 (teachers change their temporary password at first sign-in); roadmap R11. `GET /subjects` arrives here because enforcing a forced password change needs an ordinary endpoint to refuse.

**Files:**
- Modify: `ErrorCode.java`, `security/SecurityConfig.java`, `identity/adapter/web/AuthController.java`
- Create: `identity/application/PasswordService.java`, `security/OtherSessions.java`, `security/PasswordChangeRequiredFilter.java`, `identity/adapter/web/ChangePasswordRequest.java`
- Create: `classes/adapter/persistence/SubjectRepository.java`, `classes/domain/Subject.java`, `classes/adapter/web/SubjectController.java`
- Test: `identity/adapter/web/PasswordChangeTest.java`, `classes/adapter/web/SubjectControllerTest.java`

- [ ] **Step 1: Write the failing tests**

`identity/adapter/web/PasswordChangeTest.java`:

```java
package ie.coursework.identity.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.TestAccounts;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class PasswordChangeTest extends PostgresIntegrationTest {

    private static final String TEMPORARY = "Temporary-Pass-1";
    private static final String CHOSEN = "my-own-password";

    @Autowired private MockMvc mockMvc;
    @Autowired private TestAccounts accounts;

    private ApiSession signedInWithTemporaryPassword() throws Exception {
        accounts.user("k.hanlon", TEMPORARY, true);
        return new ApiSession(mockMvc).login("k.hanlon", TEMPORARY);
    }

    private static String change(String current, String next) {
        return "{\"currentPassword\":\"%s\",\"newPassword\":\"%s\"}".formatted(current, next);
    }

    @Test
    void untilThePasswordIsChangedOrdinaryEndpointsAreRefused() throws Exception {
        ApiSession teacher = signedInWithTemporaryPassword();

        teacher.get("/api/v1/subjects")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
        teacher.get("/api/v1/auth/me")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true));
    }

    @Test
    void theCurrentPasswordMustBeRight() throws Exception {
        signedInWithTemporaryPassword().post("/api/v1/auth/password", change("not-it-at-all", CHOSEN))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void theNewPasswordMustMeetThePolicy() throws Exception {
        signedInWithTemporaryPassword().post("/api/v1/auth/password", change(TEMPORARY, "short"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PASSWORD_TOO_SHORT"));
    }

    @Test
    void changingItUnlocksTheAccountAndReplacesTheOldPassword() throws Exception {
        ApiSession teacher = signedInWithTemporaryPassword();

        teacher.post("/api/v1/auth/password", change(TEMPORARY, CHOSEN)).andExpect(status().isNoContent());

        teacher.get("/api/v1/subjects").andExpect(status().isOk());
        teacher.get("/api/v1/auth/me").andExpect(jsonPath("$.mustChangePassword").value(false));
        new ApiSession(mockMvc).post("/api/v1/auth/login", "{\"username\":\"k.hanlon\",\"password\":\"%s\"}".formatted(TEMPORARY))
                .andExpect(status().isUnauthorized());
        new ApiSession(mockMvc).login("k.hanlon", CHOSEN);
        Assertions.assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_event WHERE event_type = 'PASSWORD_CHANGED'", Integer.class)).isEqualTo(1);
    }

    @Test
    void changingItSignsOutEveryOtherSession() throws Exception {
        accounts.user("k.hanlon", CHOSEN, false);
        ApiSession laptop = new ApiSession(mockMvc).login("k.hanlon", CHOSEN);
        ApiSession staffroomPc = new ApiSession(mockMvc).login("k.hanlon", CHOSEN);

        laptop.post("/api/v1/auth/password", change(CHOSEN, "a-brand-new-one")).andExpect(status().isNoContent());

        laptop.get("/api/v1/auth/me").andExpect(status().isOk());
        staffroomPc.get("/api/v1/auth/me").andExpect(status().isUnauthorized());
    }
}
```

`classes/adapter/web/SubjectControllerTest.java`:

```java
package ie.coursework.classes.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class SubjectControllerTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestAccounts accounts;

    @Test
    void listsThePilotSubjectsByName() throws Exception {
        accounts.user("k.hanlon");

        new ApiSession(mockMvc).login("k.hanlon", TestAccounts.PASSWORD)
                .get("/api/v1/subjects")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Biology", "Business", "Chemistry", "Physics")))
                .andExpect(jsonPath("$[0].code").value("BIOLOGY"));
    }

    @Test
    void needsASession() throws Exception {
        new ApiSession(mockMvc).get("/api/v1/subjects").andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd backend && ./mvnw test -Dtest='PasswordChangeTest,SubjectControllerTest'`
Expected: FAIL — `/api/v1/subjects` and `/api/v1/auth/password` don't exist (404 problems), and no `PASSWORD_CHANGE_REQUIRED`.

- [ ] **Step 3: Write subjects**

`classes/domain/Subject.java`:

```java
package ie.coursework.classes.domain;

import java.util.UUID;

public record Subject(UUID id, String code, String name) {}
```

`classes/adapter/persistence/SubjectRepository.java`:

```java
package ie.coursework.classes.adapter.persistence;

import ie.coursework.classes.domain.Subject;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class SubjectRepository {

    private final JdbcClient jdbc;

    public SubjectRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Subject> all() {
        return jdbc.sql("SELECT id, code, name FROM subject ORDER BY name").query(Subject.class).list();
    }

    public Optional<Subject> findByCode(String code) {
        return jdbc.sql("SELECT id, code, name FROM subject WHERE code = :code")
                .param("code", code)
                .query(Subject.class)
                .optional();
    }
}
```

`classes/adapter/web/SubjectController.java`:

```java
package ie.coursework.classes.adapter.web;

import ie.coursework.classes.adapter.persistence.SubjectRepository;
import ie.coursework.identity.domain.Actor;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SubjectController {

    record SubjectView(String code, String name) {}

    private final SubjectRepository subjects;

    public SubjectController(SubjectRepository subjects) {
        this.subjects = subjects;
    }

    /** Reference data. Any signed-in user may read it; the Actor parameter is what requires one. */
    @GetMapping("/api/v1/subjects")
    List<SubjectView> subjects(Actor actor) {
        return subjects.all().stream().map(s -> new SubjectView(s.code(), s.name())).toList();
    }
}
```

- [ ] **Step 4: Write the password change**

In `ErrorCode.java`, after `CSRF_TOKEN_INVALID`:

```java
    PASSWORD_CHANGE_REQUIRED(HttpStatus.FORBIDDEN, "Password change required"),
```

`security/OtherSessions.java`:

```java
package ie.coursework.security;

import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.stereotype.Component;

/**
 * Ends a user's sessions. Optional because an operator process has no web application and so no
 * session repository.
 */
@Component
public class OtherSessions {

    private final ObjectProvider<FindByIndexNameSessionRepository<?>> repository;

    public OtherSessions(ObjectProvider<FindByIndexNameSessionRepository<?>> repository) {
        this.repository = repository;
    }

    /** Ends every session for the user except {@code keepSessionId} (null ends all of them). */
    public void endAllExcept(UUID userId, String keepSessionId) {
        repository.ifAvailable(sessions -> sessions.findByPrincipalName(userId.toString()).keySet().stream()
                .filter(id -> !id.equals(keepSessionId))
                .forEach(sessions::deleteById));
    }
}
```

`identity/application/PasswordService.java`:

```java
package ie.coursework.identity.application;

import ie.coursework.audit.AuditEventType;
import ie.coursework.audit.AuditLog;
import ie.coursework.identity.adapter.persistence.StoredCredential;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.PasswordPolicy;
import ie.coursework.security.OtherSessions;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordService {

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final OtherSessions otherSessions;
    private final AuditLog auditLog;
    private final Clock clock;

    public PasswordService(UserAccountRepository users, PasswordEncoder passwordEncoder, OtherSessions otherSessions,
            AuditLog auditLog, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.otherSessions = otherSessions;
        this.auditLog = auditLog;
        this.clock = clock;
    }

    @Transactional
    public void change(Actor actor, String currentPassword, String newPassword, String currentSessionId) {
        StoredCredential credential = users.findCredential(actor.userId())
                .orElseThrow(() -> new DomainException(ErrorCode.UNAUTHENTICATED, "Sign in to continue."));
        boolean currentIsRight = currentPassword != null
                && currentPassword.getBytes(StandardCharsets.UTF_8).length <= 72
                && passwordEncoder.matches(currentPassword, credential.passwordHash());
        if (!currentIsRight) {
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS, "Your current password isn't right.");
        }
        PasswordPolicy.check(newPassword);

        users.updatePassword(actor.userId(), passwordEncoder.encode(newPassword), false, clock.instant());
        otherSessions.endAllExcept(actor.userId(), currentSessionId);
        auditLog.record(actor.userId(), AuditEventType.PASSWORD_CHANGED, "user", actor.userId(), Map.of());
    }
}
```

`identity/adapter/web/ChangePasswordRequest.java`:

```java
package ie.coursework.identity.adapter.web;

import jakarta.validation.constraints.NotNull;

public record ChangePasswordRequest(@NotNull String currentPassword, @NotNull String newPassword) {}
```

In `AuthController.java`, add `PasswordService passwords` to the constructor and this method:

```java
    @PostMapping("/password")
    ResponseEntity<Void> changePassword(Actor actor, @Valid @RequestBody ChangePasswordRequest body, HttpServletRequest request) {
        passwords.change(actor, body.currentPassword(), body.newPassword(), request.getSession().getId());
        return ResponseEntity.noContent().build();
    }
```

`security/PasswordChangeRequiredFilter.java`:

```java
package ie.coursework.security;

import ie.coursework.identity.adapter.persistence.StoredCredential;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.shared.error.ErrorCode;
import ie.coursework.shared.error.ProblemResponses;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Until a temporary password is changed, only the endpoints needed to change it answer (roadmap R11).
 *
 * <p>Deliberately not a {@code @Component}: Spring Boot registers every Filter bean as a servlet
 * filter too, which would run it a second time outside the security chain, before the session is
 * read. SecurityConfig constructs it and adds it to the chain.
 */
public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED = Set.of(
            "GET /api/v1/auth/me",
            "GET /api/v1/auth/csrf",
            "POST /api/v1/auth/password",
            "POST /api/v1/auth/logout");

    private final UserAccountRepository users;
    private final ProblemResponses problems;

    public PasswordChangeRequiredFilter(UserAccountRepository users, ProblemResponses problems) {
        this.users = users;
        this.problems = problems;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof AuthenticatedUser user
                && !ALLOWED.contains(request.getMethod() + " " + request.getRequestURI())
                && users.findCredential(user.userId()).map(StoredCredential::mustChange).orElse(false)) {
            problems.write(request, response, ErrorCode.PASSWORD_CHANGE_REQUIRED, "Change your password to continue.");
            return;
        }
        chain.doFilter(request, response);
    }
}
```

In `SecurityConfig.java`, give `apiFilterChain` a `UserAccountRepository users` parameter and add, before `return http.build();`:

```java
        http.addFilterAfter(new PasswordChangeRequiredFilter(users, problems), AuthorizationFilter.class);
```

(import `org.springframework.security.web.access.intercept.AuthorizationFilter`)

- [ ] **Step 5: Run the tests and watch them pass**

Run: `./mvnw test -Dtest='PasswordChangeTest,SubjectControllerTest'`
Expected: 7 tests, 0 failures.

- [ ] **Step 6: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Require a temporary password to be changed, and list subjects

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Gate 1B

- [ ] **Step 1: Run every check**

```bash
make verify
```

- [ ] **Step 2: Deploy and exercise it through the preview proxy**

Push the branch. On the host, redeploy the backend. Then run the operator commands **on the host**, using the same image with arguments. Every host offers a "one-off job", "run command" or "console" feature; use it rather than connecting to the production database from a laptop:

```bash
operator create-school --name="Gate Check School" --roll=00009Z
operator create-user --first-name=Gate --last-name=Teacher --username=gate.teacher
operator grant-role --username=gate.teacher --roll=00009Z --role=TEACHER
```

Then from a terminal, through the Vercel preview (add the protection-bypass header from 1A Task 11 if needed):

```bash
BASE=https://<preview-url>
TEMP='<temporary password printed above>'
rm -f jar

curl -s -c jar -b jar "$BASE/api/v1/auth/csrf" -o /dev/null
TOKEN=$(awk '$6=="XSRF-TOKEN"{print $7}' jar)

curl -s -c jar -b jar -H "x-xsrf-token: $TOKEN" -H 'content-type: application/json' \
  -d "{\"username\":\"gate.teacher\",\"password\":\"$TEMP\"}" "$BASE/api/v1/auth/login"
# → the account, "mustChangePassword":true

curl -s -b jar "$BASE/api/v1/subjects"
# → "code":"PASSWORD_CHANGE_REQUIRED"

curl -s -c jar -b jar -H "x-xsrf-token: $TOKEN" -H 'content-type: application/json' \
  -d "{\"currentPassword\":\"$TEMP\",\"newPassword\":\"gate-check-password\"}" \
  -o /dev/null -w '%{http_code}\n' "$BASE/api/v1/auth/password"
# → 204

curl -s -b jar "$BASE/api/v1/subjects"
# → the four subjects
```

Now **redeploy the backend** (any trivial redeploy from the host's dashboard), wait for it to be healthy, and:

```bash
curl -s -b jar "$BASE/api/v1/auth/me"
# → still the account: the session survived the deploy
```

Rate limit, with a fresh cookie jar:

```bash
rm -f jar2; curl -s -c jar2 -b jar2 "$BASE/api/v1/auth/csrf" -o /dev/null
T2=$(awk '$6=="XSRF-TOKEN"{print $7}' jar2)
for i in 1 2 3 4 5 6; do
  curl -s -b jar2 -H "x-xsrf-token: $T2" -H 'content-type: application/json' \
    -d '{"username":"gate.teacher","password":"definitely-wrong"}' "$BASE/api/v1/auth/login" | grep -o '"code":"[A-Z_]*"'
done
# → five INVALID_CREDENTIALS, then TOO_MANY_ATTEMPTS
```

- [ ] **Step 3: Walk the gate** (roadmap §8.1)

- [ ] `make verify` green
- [ ] Operator created a school and teacher on the deployed backend; the teacher signed in through the preview proxy, was forced to change password, then reached `/auth/me` and `/subjects`
- [ ] Redeploying the backend didn't sign that session out
- [ ] The sixth wrong password for one username returned `TOO_MANY_ATTEMPTS`

- [ ] **Step 4: Update the docs**

- Root `CLAUDE.md`, under backend conventions, add:
  - Controllers take an `Actor` parameter; nothing else reads the security context.
  - Bind timestamps with `Timestamps.utc(instant)`; don't map `timestamptz` to `Instant` record components.
  - In-memory state (throttles) implements `InMemoryState`. **It assumes one API instance** — move it to Postgres before scaling out.
  - Test with `ApiSession` (real filter chain, cookies, CSRF), not MockMvc's `csrf()`/`user()` shortcuts. Create data with `TestAccounts`.
  - Operator commands: `scripts/operator.sh` locally; the image with `operator …` arguments on the host.
- `docs/PILOT-ROADMAP.md` §1: 1B done.
- `docs/HANDOFF.md`: current milestone 1C, how long 1B took, anything half-done. **The 1C plan doesn't exist yet:** the next session writes it first (`superpowers:writing-plans`), from the roadmap's §8.1 outline and the code 1A and 1B actually produced.

- [ ] **Step 5: Commit and open the PR**

```bash
git add docs CLAUDE.md
git commit -m "Record Gate 1B

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push
gh pr create --title "Pilot 1B: accounts and sessions" --body "$(cat <<'EOF'
Operator commands, JSON sign-in on Spring Session JDBC, CSRF, login throttling, the per-request actor, and forced password change.

Gate 1B (docs/PILOT-ROADMAP.md §8.1) walked on the preview deployment; results in docs/HANDOFF.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Don't merge.** Tim reviews and merges.
