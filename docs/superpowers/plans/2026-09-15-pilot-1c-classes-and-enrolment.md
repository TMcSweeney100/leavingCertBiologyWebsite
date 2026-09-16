# Pilot 1C — Classes and Enrolment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher creates a class and reads out its join code; a student signs up with the code (or joins with an existing account), waits, is approved, and can list their classes; a teacher can rotate or switch off the code, decline or remove students, and issue a one-time password reset code that the student redeems.

**Architecture:** A new `ie.coursework.classes` feature package next to `identity`, laid out the same way (domain with no Spring, `JdbcClient` repositories, services that take the `Actor`, thin controllers). Every service method that takes an id checks scope first and answers `NOT_FOUND` for anything outside it (design §9). Reset codes live in `identity`, because they change a credential. All of it is backend; 1D builds the pages.

**Tech Stack:** As 1B. Nothing new is added to `pom.xml`.

**Roadmap:** `docs/PILOT-ROADMAP.md` §7 (Phase 1 endpoints) and §8.1 1C. **Design:** §6.1, §8.1, §9, §10.

---

## Before you start

- 1B is built (its branch or `main`): `git checkout -b pilot/1c-classes-and-enrolment` from `pilot/1b-accounts-and-sessions` or from `main` if 1B is merged.
- `make verify` is green.
- Read from 1B: `identity/domain/Actor.java`, `support/ApiSession.java`, `support/TestAccounts.java`, `security/SecurityConfig.java`, `shared/error/ErrorCode.java`, `audit/AuditLog.java`, `identity/application/PasswordService.java`. This plan extends all of them and follows their patterns.
- The JDBC traps from the 1B plan still apply: bind `Timestamps.utc(instant)`, never an `Instant`; read `timestamptz` as `OffsetDateTime` in a row mapper.

**Three decisions this plan takes** (the design leaves them open). **All confirmed by Tim on 16 Sep 2026**; P-1 was changed from 14 days to 30, P-2 and P-3 stand as written.

| # | Decision | Where |
|---|---|---|
| P-1 | **A join code lives 30 days** from creation or rotation (Tim, 16 Sep 2026; the plan originally proposed 14). Rotating replaces it and restarts the clock; "turn joining off" clears it. | `JoinCode.LIFETIME` |
| P-2 | **`POST /classes` names the school by id** (`schoolId`), and the teacher must hold TEACHER there. In the pilot every teacher has one school, so the frontend fills it from `/auth/me`. | `CreateClassRequest` |
| P-3 | **Redeeming a reset code does not sign the student in.** It sets the password, ends every session of that user, and returns 204; the page then sends them to `/login`. Simpler than 1D's `/reset` page carrying a session across, and the roadmap's §6.2 row for `/reset` doesn't require sign-in. | `AuthController.passwordReset` |

**Rules this plan follows without exception**

- **Scope test in the same task as the endpoint** (roadmap §4.1): every endpoint that takes an id gets "outside my scope returns 404" tests before it turns green.
- **Codes and passwords never appear in `audit_event.details`.**
- **Status transitions:** `PENDING → APPROVED` (approve), `PENDING → REMOVED` (decline), `APPROVED → REMOVED` (remove). A `REMOVED` student who joins again goes back to `PENDING` on the same row (the unique constraint means there is exactly one row per student and class).

---

## File structure

All Java paths are under `backend/src/main/java/ie/coursework/` (tests under `backend/src/test/java/ie/coursework/`).

| File | Responsibility | Task |
|---|---|---|
| `db/migration/V4__classes.sql` | `class_group`, `enrolment` | 1 |
| `classes/domain/JoinCode.java`, `Level.java`, `EnrolmentStatus.java`, `ClassGroup.java`, `Enrolment.java` | Rules and value types, no Spring | 2 |
| `classes/adapter/persistence/ClassGroupRepository.java`, `EnrolmentRepository.java` | SQL | 3 |
| `support/ClassFixtures.java` (test) | Two schools, teachers, students, classes, enrolments with known ids | 3 |
| `classes/authz/TeacherScopeTest.java`, `StudentScopeTest.java`, `LeaderScopeTest.java`, `AnonymousScopeTest.java` (test) | One class per role, filled in task by task | 4 → 10 |
| `classes/application/ClassService.java`, `ClassViews.java` | Create, list, detail, rotate, disable | 5, 6 |
| `classes/adapter/web/ClassController.java`, `CreateClassRequest.java` | `/api/v1/classes…` | 5, 6, 8, 9 |
| `classes/application/EnrolmentService.java` | Preview, join, sign-up, approve, remove, my classes | 7, 8 |
| `classes/adapter/web/JoinController.java`, `SignUpRequest.java`, `MeClassesController.java` | `/api/v1/join…`, `/api/v1/me/classes` | 7, 8 |
| `identity/adapter/persistence/ResetCodeRepository.java`, `identity/domain/ResetCode.java`, `identity/application/PasswordResetService.java`, `identity/adapter/web/PasswordResetRequest.java` | One-time reset codes | 9 |
| `shared/error/ErrorCode.java`, `security/SecurityConfig.java` | New codes; public join and reset endpoints | 2, 7, 9 |

---

## Task 1: Class and enrolment schema

Design §6.1.

**Files:**
- Create: `db/migration/V4__classes.sql`
- Test: `classes/adapter/persistence/ClassSchemaTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.classes.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class ClassSchemaTest extends PostgresIntegrationTest {

    @Test
    void classAndEnrolmentTablesExist() {
        List<String> tables = jdbcTemplate.queryForList(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'", String.class);

        assertThat(tables).contains("class_group", "enrolment");
    }

    @Test
    void aJoinCodeMustUseTheUnambiguousAlphabet() {
        assertThatThrownBy(() -> insertClass("ABCD01IL", "2026-12-01T00:00:00Z"))
                .isInstanceOf(DataIntegrityViolationException.class);
        insertClass("ABCDEFGH", "2026-12-01T00:00:00Z");
    }

    @Test
    void aJoinCodeAndItsExpiryAreSetTogetherOrNotAtAll() {
        assertThatThrownBy(() -> insertClass("ABCDEFGH", null)).isInstanceOf(DataIntegrityViolationException.class);
        insertClass(null, null);
    }

    @Test
    void joinCodesAreUniqueAcrossSchools() {
        insertClass("ABCDEFGH", "2026-12-01T00:00:00Z");

        assertThatThrownBy(() -> insertClass("ABCDEFGH", "2026-12-01T00:00:00Z"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void levelAndYearGroupAndStatusAreConstrained() {
        UUID classId = insertClass(null, null);
        UUID student = insertUser();

        assertThatThrownBy(() -> jdbcTemplate.update(
                "UPDATE class_group SET level = 'FOUNDATION' WHERE id = ?", classId))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "UPDATE class_group SET year_group = 4 WHERE id = ?", classId))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO enrolment (class_group_id, student_user_id, status, requested_at) VALUES (?, ?, 'WAITING', now())",
                classId, student))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aStudentHasOneEnrolmentRowPerClass() {
        UUID classId = insertClass(null, null);
        UUID student = insertUser();
        jdbcTemplate.update(
                "INSERT INTO enrolment (class_group_id, student_user_id, status, requested_at) VALUES (?, ?, 'PENDING', now())",
                classId, student);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO enrolment (class_group_id, student_user_id, status, requested_at) VALUES (?, ?, 'PENDING', now())",
                classId, student))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private UUID insertClass(String joinCode, String expiresAt) {
        UUID school = jdbcTemplate.queryForObject(
                "INSERT INTO school (name, roll_number) VALUES ('S', ?) RETURNING id", UUID.class,
                UUID.randomUUID().toString().substring(0, 6));
        UUID subject = jdbcTemplate.queryForObject("SELECT id FROM subject WHERE code = 'BIOLOGY'", UUID.class);
        UUID owner = insertUser();
        return jdbcTemplate.queryForObject("""
                INSERT INTO class_group (school_id, subject_id, name, year_group, academic_year, owner_user_id,
                                         join_code, join_code_expires_at)
                VALUES (?, ?, '6A', 6, '2026/27', ?, ?, CAST(? AS timestamptz)) RETURNING id
                """, UUID.class, school, subject, owner, joinCode, expiresAt);
    }

    private UUID insertUser() {
        return jdbcTemplate.queryForObject(
                "INSERT INTO app_user (first_name, last_name) VALUES ('A', 'B') RETURNING id", UUID.class);
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && ./mvnw test -Dtest=ClassSchemaTest`
Expected: FAIL — `relation "class_group" does not exist`.

- [ ] **Step 3: Write the migration**

`db/migration/V4__classes.sql`:

```sql
-- A teacher's class for one subject in one academic year (design §6.1).
CREATE TABLE class_group (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id            uuid        NOT NULL REFERENCES school (id),
    subject_id           uuid        NOT NULL REFERENCES subject (id),
    name                 text        NOT NULL CONSTRAINT class_group_name_present CHECK (btrim(name) <> ''),
    year_group           int         NOT NULL CONSTRAINT class_group_year_group_valid CHECK (year_group IN (5, 6)),
    academic_year        text        NOT NULL CONSTRAINT class_group_academic_year_format CHECK (academic_year ~ '^[0-9]{4}/[0-9]{2}$'),
    -- Optional: 5th year classes are often mixed.
    level                text        CONSTRAINT class_group_level_valid CHECK (level IN ('HIGHER', 'ORDINARY', 'MIXED')),
    owner_user_id        uuid        NOT NULL REFERENCES app_user (id),
    -- 8 characters, no 0/O/1/I/L. NULL means joining is off.
    join_code            text        UNIQUE CONSTRAINT class_group_join_code_format CHECK (join_code ~ '^[A-HJKMNP-Z2-9]{8}$'),
    join_code_expires_at timestamptz,
    created_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT class_group_join_code_expiry CHECK ((join_code IS NULL) = (join_code_expires_at IS NULL))
);
CREATE INDEX class_group_owner_idx ON class_group (owner_user_id);
CREATE INDEX class_group_school_idx ON class_group (school_id);

CREATE TABLE enrolment (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id     uuid        NOT NULL REFERENCES class_group (id),
    student_user_id    uuid        NOT NULL REFERENCES app_user (id),
    status             text        NOT NULL CONSTRAINT enrolment_status_valid CHECK (status IN ('PENDING', 'APPROVED', 'REMOVED')),
    requested_at       timestamptz NOT NULL,
    decided_at         timestamptz,
    decided_by_user_id uuid        REFERENCES app_user (id),
    created_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT enrolment_unique UNIQUE (class_group_id, student_user_id)
);
CREATE INDEX enrolment_student_idx ON enrolment (student_user_id);
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `./mvnw test -Dtest=ClassSchemaTest`
Expected: 6 tests, 0 failures.

- [ ] **Step 5: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Add class and enrolment tables

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 2: Domain rules and error codes

Pure JUnit. Design §6.1 (join code alphabet), roadmap §7 (error codes).

**Files:**
- Modify: `shared/error/ErrorCode.java`
- Create: `classes/domain/JoinCode.java`, `Level.java`, `EnrolmentStatus.java`, `ClassGroup.java`, `Enrolment.java`
- Test: `classes/domain/JoinCodeTest.java`, `classes/domain/EnrolmentStatusTest.java`

- [ ] **Step 1: Write the failing tests**

`JoinCodeTest.java`:

```java
package ie.coursework.classes.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.security.SecureRandom;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class JoinCodeTest {

    private final SecureRandom random = new SecureRandom();

    @Test
    void generatesEightCharactersFromTheUnambiguousAlphabet() {
        for (int i = 0; i < 50; i++) {
            assertThat(JoinCode.generate(random).value()).hasSize(8).matches("[A-HJKMNP-Z2-9]{8}");
        }
    }

    @Test
    void differsEachTime() {
        assertThat(JoinCode.generate(random)).isNotEqualTo(JoinCode.generate(random));
    }

    @Test
    void parsingAcceptsWhatAStudentTypesOnAPhone() {
        assertThat(JoinCode.parse(" abcd efgh ")).contains(new JoinCode("ABCDEFGH"));
        assertThat(JoinCode.parse("ABCD-EFGH")).contains(new JoinCode("ABCDEFGH"));
    }

    @Test
    void parsingRejectsTheWrongLengthOrAlphabet() {
        assertThat(JoinCode.parse("ABCDEFG")).isEmpty();
        assertThat(JoinCode.parse("ABCD0EFG")).isEmpty();
        assertThat(JoinCode.parse("")).isEmpty();
        assertThat(JoinCode.parse(null)).isEmpty();
    }

    @Test
    void expiryIsFourteenDaysFromIssue() {
        Instant issued = Instant.parse("2026-10-01T09:00:00Z");
        assertThat(JoinCode.expiryFrom(issued)).isEqualTo(Instant.parse("2026-10-15T09:00:00Z"));
    }
}
```

`EnrolmentStatusTest.java`:

```java
package ie.coursework.classes.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EnrolmentStatusTest {

    @Test
    void onlyAPendingRequestCanBeApproved() {
        assertThat(EnrolmentStatus.PENDING.canApprove()).isTrue();
        assertThat(EnrolmentStatus.APPROVED.canApprove()).isFalse();
        assertThat(EnrolmentStatus.REMOVED.canApprove()).isFalse();
    }

    @Test
    void pendingAndApprovedCanBeRemoved() {
        assertThat(EnrolmentStatus.PENDING.canRemove()).isTrue();
        assertThat(EnrolmentStatus.APPROVED.canRemove()).isTrue();
        assertThat(EnrolmentStatus.REMOVED.canRemove()).isFalse();
    }

    @Test
    void onlyARemovedStudentCanAskAgain() {
        assertThat(EnrolmentStatus.REMOVED.canRequestAgain()).isTrue();
        assertThat(EnrolmentStatus.PENDING.canRequestAgain()).isFalse();
        assertThat(EnrolmentStatus.APPROVED.canRequestAgain()).isFalse();
    }
}
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd backend && ./mvnw test -Dtest='JoinCodeTest,EnrolmentStatusTest'`
Expected: FAIL — compilation errors.

- [ ] **Step 3: Add the error codes**

In `ErrorCode.java`, after `PASSWORD_CHANGE_REQUIRED`:

```java
    JOIN_CODE_INVALID(HttpStatus.NOT_FOUND, "Join code unknown or expired"),
    ENROLMENT_NOT_PENDING(HttpStatus.CONFLICT, "That request has already been decided"),
    ENROLMENT_ALREADY_REMOVED(HttpStatus.CONFLICT, "That student has already been removed"),
    RESET_CODE_INVALID(HttpStatus.BAD_REQUEST, "Reset code wrong or expired"),
```

- [ ] **Step 4: Write the domain types**

`Level.java`:

```java
package ie.coursework.classes.domain;

public enum Level {
    HIGHER,
    ORDINARY,
    MIXED
}
```

`EnrolmentStatus.java`:

```java
package ie.coursework.classes.domain;

/** PENDING → APPROVED (approve), PENDING → REMOVED (decline), APPROVED → REMOVED (remove), REMOVED → PENDING (asks again). */
public enum EnrolmentStatus {
    PENDING,
    APPROVED,
    REMOVED;

    public boolean canApprove() {
        return this == PENDING;
    }

    public boolean canRemove() {
        return this != REMOVED;
    }

    public boolean canRequestAgain() {
        return this == REMOVED;
    }
}
```

`JoinCode.java`:

```java
package ie.coursework.classes.domain;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * An 8-character code a teacher reads out and a student types on a phone (design §6.1). No 0, O, 1,
 * I or L, so nothing can be misheard or misread. Parsing is forgiving about case, spaces and dashes.
 */
public record JoinCode(String value) {

    static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final Pattern FORMAT = Pattern.compile("^[A-HJKMNP-Z2-9]{8}$");
    private static final int LENGTH = 8;

    /** Plan decision P-1. */
    public static final Duration LIFETIME = Duration.ofDays(30);

    public JoinCode {
        if (value == null || !FORMAT.matcher(value).matches()) {
            throw new IllegalArgumentException("not a join code");
        }
    }

    public static JoinCode generate(SecureRandom random) {
        StringBuilder code = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return new JoinCode(code.toString());
    }

    /** What a student typed, normalised; empty if it can't be a code. Never throws. */
    public static Optional<JoinCode> parse(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        String normalised = raw.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
        return FORMAT.matcher(normalised).matches() ? Optional.of(new JoinCode(normalised)) : Optional.empty();
    }

    public static Instant expiryFrom(Instant issuedAt) {
        return issuedAt.plus(LIFETIME);
    }
}
```

`ClassGroup.java`:

```java
package ie.coursework.classes.domain;

import java.time.Instant;
import java.util.UUID;

/** A class as stored. {@code joinCode} and {@code joinCodeExpiresAt} are both null when joining is off. */
public record ClassGroup(
        UUID id,
        UUID schoolId,
        UUID subjectId,
        String name,
        int yearGroup,
        String academicYear,
        Level level,
        UUID ownerUserId,
        String joinCode,
        Instant joinCodeExpiresAt) {

    public boolean joiningOpenAt(Instant now) {
        return joinCode != null && joinCodeExpiresAt != null && now.isBefore(joinCodeExpiresAt);
    }
}
```

`Enrolment.java`:

```java
package ie.coursework.classes.domain;

import java.time.Instant;
import java.util.UUID;

public record Enrolment(
        UUID id,
        UUID classGroupId,
        UUID studentUserId,
        EnrolmentStatus status,
        Instant requestedAt,
        Instant decidedAt,
        UUID decidedByUserId) {}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `./mvnw test -Dtest='JoinCodeTest,EnrolmentStatusTest'`
Expected: 8 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
cd .. && git add backend
git commit -m "Add join code and enrolment status rules

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 3: Repositories and fixtures

**Files:**
- Create: `classes/adapter/persistence/ClassGroupRepository.java`, `EnrolmentRepository.java`
- Create (test support): `support/ClassFixtures.java`
- Test: `classes/adapter/persistence/ClassRepositoriesTest.java`

- [ ] **Step 1: Write the test support**

`support/ClassFixtures.java` — the world every authorisation test uses. Two schools; at school A, two teachers each owning a class, an approved and a pending student in teacher 1's class, and a school leader; at school B, one teacher with one class.

```java
package ie.coursework.support;

import ie.coursework.classes.adapter.persistence.ClassGroupRepository;
import ie.coursework.classes.adapter.persistence.EnrolmentRepository;
import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.classes.domain.Level;
import ie.coursework.identity.domain.Role;
import java.time.Clock;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Known ids for scope tests. Every password is {@link TestAccounts#PASSWORD}. */
@Component
public class ClassFixtures {

    public record World(
            UUID schoolA, UUID schoolB,
            UUID teacher1, UUID teacher2, UUID teacherB, UUID leaderA,
            UUID approvedStudent, UUID pendingStudent, UUID removedStudent, UUID outsider,
            UUID class1, UUID class2, UUID classB,
            UUID approvedEnrolment, UUID pendingEnrolment, UUID removedEnrolment,
            String class1Code) {}

    public static final String TEACHER1 = "teacher.one";
    public static final String TEACHER2 = "teacher.two";
    public static final String TEACHER_B = "teacher.b";
    public static final String LEADER_A = "leader.a";
    public static final String APPROVED_STUDENT = "approved.student";
    public static final String PENDING_STUDENT = "pending.student";
    public static final String REMOVED_STUDENT = "removed.student";
    public static final String OUTSIDER = "outsider.student";

    private final TestAccounts accounts;
    private final ClassGroupRepository classes;
    private final EnrolmentRepository enrolments;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public ClassFixtures(TestAccounts accounts, ClassGroupRepository classes, EnrolmentRepository enrolments,
            JdbcTemplate jdbc, Clock clock) {
        this.accounts = accounts;
        this.classes = classes;
        this.enrolments = enrolments;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public World world() {
        UUID schoolA = accounts.school("School A", "11111A");
        UUID schoolB = accounts.school("School B", "22222B");
        UUID biology = subject("BIOLOGY");

        UUID teacher1 = accounts.userWithRole(TEACHER1, schoolA, Role.TEACHER);
        UUID teacher2 = accounts.userWithRole(TEACHER2, schoolA, Role.TEACHER);
        UUID teacherB = accounts.userWithRole(TEACHER_B, schoolB, Role.TEACHER);
        UUID leaderA = accounts.userWithRole(LEADER_A, schoolA, Role.SCHOOL_LEADER);
        UUID approved = accounts.userWithRole(APPROVED_STUDENT, schoolA, Role.STUDENT);
        UUID pending = accounts.userWithRole(PENDING_STUDENT, schoolA, Role.STUDENT);
        UUID removed = accounts.userWithRole(REMOVED_STUDENT, schoolA, Role.STUDENT);
        UUID outsider = accounts.userWithRole(OUTSIDER, schoolB, Role.STUDENT);

        String class1Code = "CLASSONE".replace('O', 'P').replace('I', 'J'); // "CLASSPNE" → keep alphabet-safe
        UUID class1 = classes.insert(schoolA, biology, "6A Biology", 6, "2026/27", Level.HIGHER, teacher1,
                class1Code, clock.instant().plusSeconds(86_400));
        UUID class2 = classes.insert(schoolA, biology, "6B Biology", 6, "2026/27", null, teacher2,
                "CLASSTWP", clock.instant().plusSeconds(86_400));
        UUID classB = classes.insert(schoolB, biology, "5th Biology", 5, "2026/27", Level.MIXED, teacherB,
                null, null);

        UUID approvedEnrolment = enrolments.request(class1, approved, clock.instant());
        enrolments.decide(approvedEnrolment, EnrolmentStatus.APPROVED, teacher1, clock.instant());
        UUID pendingEnrolment = enrolments.request(class1, pending, clock.instant());
        UUID removedEnrolment = enrolments.request(class1, removed, clock.instant());
        enrolments.decide(removedEnrolment, EnrolmentStatus.REMOVED, teacher1, clock.instant());

        return new World(schoolA, schoolB, teacher1, teacher2, teacherB, leaderA,
                approved, pending, removed, outsider, class1, class2, classB,
                approvedEnrolment, pendingEnrolment, removedEnrolment, class1Code);
    }

    public UUID subject(String code) {
        return jdbc.queryForObject("SELECT id FROM subject WHERE code = ?", UUID.class, code);
    }
}
```

The two literal codes are `CLASSPNE` and `CLASSTWP`: both eight characters from the allowed alphabet. Don't "fix" them to `CLASSONE`/`CLASSTWO`, which contain `O`.

- [ ] **Step 2: Write the failing test**

`ClassRepositoriesTest.java`:

```java
package ie.coursework.classes.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.classes.domain.ClassGroup;
import ie.coursework.classes.domain.Enrolment;
import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.classes.domain.Level;
import ie.coursework.support.ClassFixtures;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ClassRepositoriesTest extends PostgresIntegrationTest {

    @Autowired private ClassGroupRepository classes;
    @Autowired private EnrolmentRepository enrolments;
    @Autowired private ClassFixtures fixtures;

    @Test
    void storesAndReadsAClassWithItsJoinCode() {
        ClassFixtures.World world = fixtures.world();

        ClassGroup class1 = classes.findById(world.class1()).orElseThrow();

        assertThat(class1.name()).isEqualTo("6A Biology");
        assertThat(class1.level()).isEqualTo(Level.HIGHER);
        assertThat(class1.joinCode()).isEqualTo(world.class1Code());
        assertThat(class1.joinCodeExpiresAt()).isAfter(Instant.now());
        assertThat(classes.findById(world.classB()).orElseThrow().joinCode()).isNull();
    }

    @Test
    void findsOnlyTheOwnersClasses() {
        ClassFixtures.World world = fixtures.world();

        assertThat(classes.findOwned(world.class1(), world.teacher1())).isPresent();
        assertThat(classes.findOwned(world.class1(), world.teacher2())).isEmpty();
        assertThat(classes.listOwnedBy(world.teacher1())).extracting(ClassGroup::id).containsExactly(world.class1());
    }

    @Test
    void findsAClassByLiveJoinCodeOnly() {
        ClassFixtures.World world = fixtures.world();
        Instant now = Instant.now();

        assertThat(classes.findByJoinCode(world.class1Code())).isPresent();
        classes.setJoinCode(world.class1(), world.class1Code(), now.minusSeconds(1));
        assertThat(classes.findByJoinCode(world.class1Code()).orElseThrow().joiningOpenAt(now)).isFalse();
        classes.setJoinCode(world.class1(), null, null);
        assertThat(classes.findByJoinCode(world.class1Code())).isEmpty();
    }

    @Test
    void enrolmentsMoveThroughTheirStatuses() {
        ClassFixtures.World world = fixtures.world();
        Instant now = Instant.parse("2026-10-01T09:00:00Z");

        Enrolment pending = enrolments.findInClass(world.pendingEnrolment(), world.class1()).orElseThrow();
        assertThat(pending.status()).isEqualTo(EnrolmentStatus.PENDING);
        assertThat(pending.decidedAt()).isNull();

        enrolments.decide(world.pendingEnrolment(), EnrolmentStatus.APPROVED, world.teacher1(), now);
        Enrolment approved = enrolments.findInClass(world.pendingEnrolment(), world.class1()).orElseThrow();
        assertThat(approved.status()).isEqualTo(EnrolmentStatus.APPROVED);
        assertThat(approved.decidedAt()).isEqualTo(now);
        assertThat(approved.decidedByUserId()).isEqualTo(world.teacher1());
    }

    @Test
    void anEnrolmentIdIsOnlyFoundWithinItsOwnClass() {
        ClassFixtures.World world = fixtures.world();

        assertThat(enrolments.findInClass(world.pendingEnrolment(), world.class2())).isEmpty();
    }

    @Test
    void aRemovedStudentAskingAgainReusesTheRow() {
        ClassFixtures.World world = fixtures.world();
        Instant now = Instant.parse("2026-10-01T09:00:00Z");

        UUID again = enrolments.request(world.class1(), world.removedStudent(), now);

        assertThat(again).isEqualTo(world.removedEnrolment());
        Enrolment row = enrolments.findByStudent(world.class1(), world.removedStudent()).orElseThrow();
        assertThat(row.status()).isEqualTo(EnrolmentStatus.PENDING);
        assertThat(row.requestedAt()).isEqualTo(now);
        assertThat(row.decidedAt()).isNull();
    }

    @Test
    void listsAClassMembersAndAStudentsClasses() {
        ClassFixtures.World world = fixtures.world();

        List<EnrolmentRepository.Member> members = enrolments.membersOf(world.class1());
        assertThat(members).extracting(EnrolmentRepository.Member::username)
                .containsExactly(ClassFixtures.APPROVED_STUDENT, ClassFixtures.PENDING_STUDENT);
        assertThat(enrolments.pendingCount(world.class1())).isEqualTo(1);

        List<EnrolmentRepository.StudentClass> mine = enrolments.classesOf(world.approvedStudent());
        assertThat(mine).hasSize(1);
        assertThat(mine.getFirst().className()).isEqualTo("6A Biology");
        assertThat(mine.getFirst().subjectName()).isEqualTo("Biology");
        assertThat(mine.getFirst().schoolName()).isEqualTo("School A");
        assertThat(mine.getFirst().status()).isEqualTo(EnrolmentStatus.APPROVED);
        assertThat(enrolments.classesOf(world.removedStudent())).isEmpty();
    }
}
```

- [ ] **Step 3: Run it and watch it fail**

Run: `./mvnw test -Dtest=ClassRepositoriesTest`
Expected: FAIL — compilation errors.

- [ ] **Step 4: Write the repositories**

`ClassGroupRepository.java`:

```java
package ie.coursework.classes.adapter.persistence;

import ie.coursework.classes.domain.ClassGroup;
import ie.coursework.classes.domain.Level;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ClassGroupRepository {

    private static final String COLUMNS = """
            SELECT id, school_id, subject_id, name, year_group, academic_year, level, owner_user_id,
                   join_code, join_code_expires_at
            FROM class_group
            """;

    private static final RowMapper<ClassGroup> MAPPER = ClassGroupRepository::map;

    private final JdbcClient jdbc;

    public ClassGroupRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID insert(UUID schoolId, UUID subjectId, String name, int yearGroup, String academicYear, Level level,
            UUID ownerUserId, String joinCode, Instant joinCodeExpiresAt) {
        return jdbc.sql("""
                INSERT INTO class_group (school_id, subject_id, name, year_group, academic_year, level, owner_user_id,
                                         join_code, join_code_expires_at)
                VALUES (:school, :subject, :name, :year, :academicYear, :level, :owner, :code, :expires)
                RETURNING id
                """)
                .param("school", schoolId)
                .param("subject", subjectId)
                .param("name", name.strip())
                .param("year", yearGroup)
                .param("academicYear", academicYear)
                .param("level", level == null ? null : level.name())
                .param("owner", ownerUserId)
                .param("code", joinCode)
                .param("expires", Timestamps.utc(joinCodeExpiresAt))
                .query(UUID.class)
                .single();
    }

    public Optional<ClassGroup> findById(UUID id) {
        return jdbc.sql(COLUMNS + " WHERE id = :id").param("id", id).query(MAPPER).optional();
    }

    /** The scope check for every teacher endpoint: the class exists and this teacher owns it. */
    public Optional<ClassGroup> findOwned(UUID id, UUID ownerUserId) {
        return jdbc.sql(COLUMNS + " WHERE id = :id AND owner_user_id = :owner")
                .param("id", id)
                .param("owner", ownerUserId)
                .query(MAPPER)
                .optional();
    }

    public List<ClassGroup> listOwnedBy(UUID ownerUserId) {
        return jdbc.sql(COLUMNS + " WHERE owner_user_id = :owner ORDER BY academic_year DESC, name")
                .param("owner", ownerUserId)
                .query(MAPPER)
                .list();
    }

    /** By code, whether or not it has expired; the caller checks {@link ClassGroup#joiningOpenAt}. */
    public Optional<ClassGroup> findByJoinCode(String joinCode) {
        return jdbc.sql(COLUMNS + " WHERE join_code = :code").param("code", joinCode).query(MAPPER).optional();
    }

    /** Both null turns joining off. */
    public void setJoinCode(UUID id, String joinCode, Instant expiresAt) {
        jdbc.sql("UPDATE class_group SET join_code = :code, join_code_expires_at = :expires WHERE id = :id")
                .param("code", joinCode)
                .param("expires", Timestamps.utc(expiresAt))
                .param("id", id)
                .update();
    }

    private static ClassGroup map(ResultSet rs, int row) throws SQLException {
        String level = rs.getString("level");
        OffsetDateTime expires = rs.getObject("join_code_expires_at", OffsetDateTime.class);
        return new ClassGroup(
                rs.getObject("id", UUID.class),
                rs.getObject("school_id", UUID.class),
                rs.getObject("subject_id", UUID.class),
                rs.getString("name"),
                rs.getInt("year_group"),
                rs.getString("academic_year"),
                level == null ? null : Level.valueOf(level),
                rs.getObject("owner_user_id", UUID.class),
                rs.getString("join_code"),
                expires == null ? null : expires.toInstant());
    }
}
```

`EnrolmentRepository.java`:

```java
package ie.coursework.classes.adapter.persistence;

import ie.coursework.classes.domain.Enrolment;
import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class EnrolmentRepository {

    /** A row in the teacher's class list. */
    public record Member(UUID enrolmentId, UUID studentId, String firstName, String lastName, String username,
            EnrolmentStatus status, Instant requestedAt) {}

    /** A row in the student's own class list. */
    public record StudentClass(UUID enrolmentId, UUID classId, String className, String subjectName, String schoolName,
            EnrolmentStatus status) {}

    private static final String COLUMNS = """
            SELECT id, class_group_id, student_user_id, status, requested_at, decided_at, decided_by_user_id
            FROM enrolment
            """;

    private static final RowMapper<Enrolment> MAPPER = EnrolmentRepository::map;

    private final JdbcClient jdbc;

    public EnrolmentRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Creates a PENDING request, or reopens a REMOVED one. A PENDING or APPROVED row is left alone
     * (the caller has already checked the status). Returns the row id either way.
     */
    public UUID request(UUID classGroupId, UUID studentUserId, Instant now) {
        return jdbc.sql("""
                INSERT INTO enrolment (class_group_id, student_user_id, status, requested_at)
                VALUES (:class, :student, 'PENDING', :now)
                ON CONFLICT ON CONSTRAINT enrolment_unique DO UPDATE
                    SET status = 'PENDING', requested_at = EXCLUDED.requested_at,
                        decided_at = NULL, decided_by_user_id = NULL
                    WHERE enrolment.status = 'REMOVED'
                RETURNING id
                """)
                .param("class", classGroupId)
                .param("student", studentUserId)
                .param("now", Timestamps.utc(now))
                .query(UUID.class)
                .optional()
                .orElseGet(() -> findByStudent(classGroupId, studentUserId).orElseThrow().id());
    }

    public void decide(UUID enrolmentId, EnrolmentStatus status, UUID decidedByUserId, Instant now) {
        jdbc.sql("""
                UPDATE enrolment SET status = :status, decided_at = :now, decided_by_user_id = :by WHERE id = :id
                """)
                .param("status", status.name())
                .param("now", Timestamps.utc(now))
                .param("by", decidedByUserId)
                .param("id", enrolmentId)
                .update();
    }

    /** Scoped: an enrolment id from another class is not found. */
    public Optional<Enrolment> findInClass(UUID enrolmentId, UUID classGroupId) {
        return jdbc.sql(COLUMNS + " WHERE id = :id AND class_group_id = :class")
                .param("id", enrolmentId)
                .param("class", classGroupId)
                .query(MAPPER)
                .optional();
    }

    public Optional<Enrolment> findByStudent(UUID classGroupId, UUID studentUserId) {
        return jdbc.sql(COLUMNS + " WHERE class_group_id = :class AND student_user_id = :student")
                .param("class", classGroupId)
                .param("student", studentUserId)
                .query(MAPPER)
                .optional();
    }

    /** PENDING and APPROVED members, pending first, then by surname. */
    public List<Member> membersOf(UUID classGroupId) {
        return jdbc.sql("""
                SELECT e.id AS enrolment_id, u.id AS student_id, u.first_name, u.last_name, c.username,
                       e.status, e.requested_at
                FROM enrolment e
                JOIN app_user u ON u.id = e.student_user_id
                JOIN password_credential c ON c.user_id = u.id
                WHERE e.class_group_id = :class AND e.status <> 'REMOVED'
                ORDER BY (e.status = 'PENDING') DESC, u.last_name, u.first_name
                """)
                .param("class", classGroupId)
                .query((rs, row) -> new Member(
                        rs.getObject("enrolment_id", UUID.class),
                        rs.getObject("student_id", UUID.class),
                        rs.getString("first_name"),
                        rs.getString("last_name"),
                        rs.getString("username"),
                        EnrolmentStatus.valueOf(rs.getString("status")),
                        rs.getObject("requested_at", OffsetDateTime.class).toInstant()))
                .list();
    }

    public int pendingCount(UUID classGroupId) {
        return jdbc.sql("SELECT count(*) FROM enrolment WHERE class_group_id = :class AND status = 'PENDING'")
                .param("class", classGroupId)
                .query(Integer.class)
                .single();
    }

    /** The student's PENDING and APPROVED classes. */
    public List<StudentClass> classesOf(UUID studentUserId) {
        return jdbc.sql("""
                SELECT e.id AS enrolment_id, g.id AS class_id, g.name AS class_name, s.name AS subject_name,
                       sc.name AS school_name, e.status
                FROM enrolment e
                JOIN class_group g ON g.id = e.class_group_id
                JOIN subject s ON s.id = g.subject_id
                JOIN school sc ON sc.id = g.school_id
                WHERE e.student_user_id = :student AND e.status <> 'REMOVED'
                ORDER BY s.name, g.name
                """)
                .param("student", studentUserId)
                .query((rs, row) -> new StudentClass(
                        rs.getObject("enrolment_id", UUID.class),
                        rs.getObject("class_id", UUID.class),
                        rs.getString("class_name"),
                        rs.getString("subject_name"),
                        rs.getString("school_name"),
                        EnrolmentStatus.valueOf(rs.getString("status"))))
                .list();
    }

    private static Enrolment map(ResultSet rs, int row) throws SQLException {
        OffsetDateTime decided = rs.getObject("decided_at", OffsetDateTime.class);
        return new Enrolment(
                rs.getObject("id", UUID.class),
                rs.getObject("class_group_id", UUID.class),
                rs.getObject("student_user_id", UUID.class),
                EnrolmentStatus.valueOf(rs.getString("status")),
                rs.getObject("requested_at", OffsetDateTime.class).toInstant(),
                decided == null ? null : decided.toInstant(),
                rs.getObject("decided_by_user_id", UUID.class));
    }
}
```

`ON CONFLICT … DO UPDATE … WHERE` returns no row when the `WHERE` is false (a PENDING or APPROVED row), which is why `request` falls back to `findByStudent`.

- [ ] **Step 5: Run the test and watch it pass**

Run: `./mvnw test -Dtest=ClassRepositoriesTest`
Expected: 7 tests, 0 failures.

- [ ] **Step 6: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Add class and enrolment repositories with test fixtures

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 4: Authorisation suites, written first

Design §10: one test class per role, written before the endpoints. Each suite starts with the requests below and later tasks add to it. They fail now because the endpoints don't exist (404 from `NoResourceFoundException` looks like a pass for some, which is why each suite also asserts a positive case that must be 200).

**Files:**
- Test: `classes/authz/AuthzSuite.java` (shared base), `TeacherScopeTest.java`, `StudentScopeTest.java`, `LeaderScopeTest.java`, `AnonymousScopeTest.java`

- [ ] **Step 1: Write the base and the four suites**

`AuthzSuite.java`:

```java
package ie.coursework.classes.authz;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** Every scope test starts from the same world and signs one user in. */
@AutoConfigureMockMvc
abstract class AuthzSuite extends PostgresIntegrationTest {

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ClassFixtures fixtures;
    protected ClassFixtures.World world;

    @BeforeEach
    void seed() {
        world = fixtures.world();
    }

    protected ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }

    protected ApiSession anonymous() {
        return new ApiSession(mockMvc);
    }
}
```

`TeacherScopeTest.java`:

```java
package ie.coursework.classes.authz;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import org.junit.jupiter.api.Test;

/** Teacher 1 owns class 1. Teacher 2 (same school) and teacher B (other school) own others. */
class TeacherScopeTest extends AuthzSuite {

    @Test
    void ownClassIsVisible() throws Exception {
        as(ClassFixtures.TEACHER1).get("/api/v1/classes/" + world.class1()).andExpect(status().isOk());
    }

    @Test
    void anotherTeachersClassIsNotFoundEvenAtTheSameSchool() throws Exception {
        ApiSession teacher2 = as(ClassFixtures.TEACHER2);
        String class1 = "/api/v1/classes/" + world.class1();

        teacher2.get(class1).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        teacher2.post(class1 + "/join-code").andExpect(status().isNotFound());
        teacher2.delete(class1 + "/join-code").andExpect(status().isNotFound());
        teacher2.post(class1 + "/enrolments/" + world.pendingEnrolment() + "/approve").andExpect(status().isNotFound());
        teacher2.post(class1 + "/enrolments/" + world.approvedEnrolment() + "/remove").andExpect(status().isNotFound());
        teacher2.post(class1 + "/students/" + world.approvedStudent() + "/reset-codes").andExpect(status().isNotFound());
    }

    @Test
    void aClassAtAnotherSchoolIsNotFound() throws Exception {
        as(ClassFixtures.TEACHER_B).get("/api/v1/classes/" + world.class1()).andExpect(status().isNotFound());
    }

    @Test
    void anEnrolmentIdFromAnotherClassIsNotFoundUnderMine() throws Exception {
        // Teacher 2 owns class 2; the enrolment belongs to class 1.
        as(ClassFixtures.TEACHER2)
                .post("/api/v1/classes/" + world.class2() + "/enrolments/" + world.pendingEnrolment() + "/approve")
                .andExpect(status().isNotFound());
    }

    @Test
    void aStudentNotInMyClassCannotBeIssuedAResetCode() throws Exception {
        as(ClassFixtures.TEACHER1)
                .post("/api/v1/classes/" + world.class1() + "/students/" + world.outsider() + "/reset-codes")
                .andExpect(status().isNotFound());
    }

    @Test
    void cannotCreateAClassAtASchoolWhereTheyDontTeach() throws Exception {
        as(ClassFixtures.TEACHER_B).post("/api/v1/classes", """
                {"schoolId":"%s","subjectCode":"BIOLOGY","name":"6C","yearGroup":6,"academicYear":"2026/27"}
                """.formatted(world.schoolA()))
                .andExpect(status().isNotFound());
    }
}
```

`StudentScopeTest.java`:

```java
package ie.coursework.classes.authz;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import org.junit.jupiter.api.Test;

class StudentScopeTest extends AuthzSuite {

    @Test
    void canListTheirOwnClasses() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).get("/api/v1/me/classes")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].className").value("6A Biology"));
    }

    @Test
    void teacherEndpointsAreNotFoundForAStudent() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        String class1 = "/api/v1/classes/" + world.class1();

        student.get("/api/v1/classes").andExpect(status().isNotFound());
        student.post("/api/v1/classes", """
                {"schoolId":"%s","subjectCode":"BIOLOGY","name":"6C","yearGroup":6,"academicYear":"2026/27"}
                """.formatted(world.schoolA())).andExpect(status().isNotFound());
        student.get(class1).andExpect(status().isNotFound());
        student.post(class1 + "/join-code").andExpect(status().isNotFound());
        student.post(class1 + "/enrolments/" + world.pendingEnrolment() + "/approve").andExpect(status().isNotFound());
        student.post(class1 + "/students/" + world.pendingStudent() + "/reset-codes").andExpect(status().isNotFound());
    }
}
```

`LeaderScopeTest.java`:

```java
package ie.coursework.classes.authz;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import org.junit.jupiter.api.Test;

/** The leader's own view arrives in Phase 5. Until then a leader can reach nothing class-shaped. */
class LeaderScopeTest extends AuthzSuite {

    @Test
    void aLeaderReachesNoClassOrEnrolment() throws Exception {
        ApiSession leader = as(ClassFixtures.LEADER_A);
        String class1 = "/api/v1/classes/" + world.class1();

        leader.get("/api/v1/classes").andExpect(status().isNotFound());
        leader.get(class1).andExpect(status().isNotFound());
        leader.post(class1 + "/enrolments/" + world.pendingEnrolment() + "/approve").andExpect(status().isNotFound());
        leader.get("/api/v1/me/classes").andExpect(status().isOk()); // empty list: a leader is nobody's student
    }
}
```

`AnonymousScopeTest.java`:

```java
package ie.coursework.classes.authz;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.support.ApiSession;
import org.junit.jupiter.api.Test;

class AnonymousScopeTest extends AuthzSuite {

    @Test
    void joinPreviewAndSignUpArePublicButEverythingElseNeedsASession() throws Exception {
        ApiSession nobody = anonymous();

        nobody.get("/api/v1/join/" + world.class1Code()).andExpect(status().isOk());

        nobody.get("/api/v1/classes").andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        nobody.get("/api/v1/classes/" + world.class1()).andExpect(status().isUnauthorized());
        nobody.get("/api/v1/me/classes").andExpect(status().isUnauthorized());
        nobody.post("/api/v1/join/" + world.class1Code() + "/enrolments").andExpect(status().isUnauthorized());
        nobody.post("/api/v1/classes/" + world.class1() + "/enrolments/" + world.pendingEnrolment() + "/approve")
                .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd backend && ./mvnw test -Dtest='TeacherScopeTest,StudentScopeTest,LeaderScopeTest,AnonymousScopeTest'`
Expected: FAIL — the positive cases (`ownClassIsVisible`, `canListTheirOwnClasses`, join preview) get 404 or 401 because nothing is mapped yet. Some negative cases pass by accident; that's expected and is why the positives exist.

- [ ] **Step 3: Commit the suites as they are**

```bash
cd .. && git add backend
git commit -m "Write the class authorisation suites before the endpoints

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

The suite stays red until Task 10. From here, run it after every task and watch the count of failures go down.

---

## Task 5: Create and list classes

Roadmap §7: `GET /classes`, `POST /classes`.

**Files:**
- Create: `classes/application/ClassViews.java`, `classes/application/ClassService.java`, `classes/adapter/web/CreateClassRequest.java`, `classes/adapter/web/ClassController.java`
- Test: `classes/adapter/web/ClassListTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.classes.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class ClassListTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    private String create(String schoolId, String level) {
        return """
                {"schoolId":"%s","subjectCode":"CHEMISTRY","name":"5th Chem","yearGroup":5,"academicYear":"2026/27"%s}
                """.formatted(schoolId, level == null ? "" : ",\"level\":\"" + level + "\"");
    }

    @Test
    void aTeacherCreatesAClassAndGetsAJoinCode() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);

        String body = teacher.post("/api/v1/classes", create(world.schoolA().toString(), "MIXED"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("5th Chem"))
                .andExpect(jsonPath("$.subjectCode").value("CHEMISTRY"))
                .andExpect(jsonPath("$.subjectName").value("Chemistry"))
                .andExpect(jsonPath("$.level").value("MIXED"))
                .andExpect(jsonPath("$.joinCode.code").value(org.hamcrest.Matchers.matchesPattern("[A-HJKMNP-Z2-9]{8}")))
                .andExpect(jsonPath("$.joinCode.expiresAt").isNotEmpty())
                .andExpect(jsonPath("$.enrolments").isEmpty())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("ownerUserId");
    }

    @Test
    void levelIsOptionalAndTheRestIsValidated() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);

        teacher.post("/api/v1/classes", create(world.schoolA().toString(), null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.level").value(org.hamcrest.Matchers.nullValue()));
        teacher.post("/api/v1/classes", """
                {"schoolId":"%s","subjectCode":"CHEMISTRY","name":" ","yearGroup":4,"academicYear":"2026-27"}
                """.formatted(world.schoolA()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[*].field").value(
                        org.hamcrest.Matchers.containsInAnyOrder("name", "yearGroup", "academicYear")));
        teacher.post("/api/v1/classes", create(world.schoolA().toString(), null).replace("CHEMISTRY", "LATIN"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void listsOnlyMyClassesWithPendingCounts() throws Exception {
        ClassFixtures.World world = fixtures.world();

        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD).get("/api/v1/classes")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(world.class1().toString()))
                .andExpect(jsonPath("$[0].subjectName").value("Biology"))
                .andExpect(jsonPath("$[0].yearGroup").value(6))
                .andExpect(jsonPath("$[0].academicYear").value("2026/27"))
                .andExpect(jsonPath("$[0].pendingCount").value(1));
    }

    @Test
    void theRoleIsCheckedAtTheSchoolNamedInTheRequest() throws Exception {
        ClassFixtures.World world = fixtures.world();

        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .post("/api/v1/classes", create(world.schoolB().toString(), null))
                .andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && ./mvnw test -Dtest=ClassListTest`
Expected: FAIL — 404 `NOT_FOUND` on every request (no controller).

- [ ] **Step 3: Write the views and service**

`classes/application/ClassViews.java`:

```java
package ie.coursework.classes.application;

import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.classes.domain.Level;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** What the API returns. Never the owner id, never a student's data outside their own class. */
public final class ClassViews {

    private ClassViews() {}

    public record JoinCodeView(String code, Instant expiresAt) {}

    public record ClassSummary(UUID id, String name, String subjectCode, String subjectName, int yearGroup,
            String academicYear, Level level, int pendingCount) {}

    public record MemberView(UUID enrolmentId, UUID studentId, String firstName, String lastName, String username,
            EnrolmentStatus status, Instant requestedAt) {}

    public record ClassDetail(UUID id, String name, String subjectCode, String subjectName, int yearGroup,
            String academicYear, Level level, JoinCodeView joinCode, List<MemberView> enrolments) {}

    public record JoinPreview(String className, String subjectName, String schoolName) {}

    public record EnrolmentView(UUID enrolmentId, UUID classId, String className, String subjectName,
            String schoolName, EnrolmentStatus status) {}

    public record ResetCodeIssued(String code, Instant expiresAt) {}
}
```

`classes/application/ClassService.java`:

```java
package ie.coursework.classes.application;

import ie.coursework.audit.AuditEventType;
import ie.coursework.audit.AuditLog;
import ie.coursework.classes.adapter.persistence.ClassGroupRepository;
import ie.coursework.classes.adapter.persistence.EnrolmentRepository;
import ie.coursework.classes.adapter.persistence.SubjectRepository;
import ie.coursework.classes.application.ClassViews.ClassDetail;
import ie.coursework.classes.application.ClassViews.ClassSummary;
import ie.coursework.classes.application.ClassViews.JoinCodeView;
import ie.coursework.classes.application.ClassViews.MemberView;
import ie.coursework.classes.domain.ClassGroup;
import ie.coursework.classes.domain.JoinCode;
import ie.coursework.classes.domain.Level;
import ie.coursework.classes.domain.Subject;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.Role;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** What a teacher can do to their own classes. Every method checks scope first and answers 404 otherwise. */
@Service
public class ClassService {

    private final ClassGroupRepository classes;
    private final EnrolmentRepository enrolments;
    private final SubjectRepository subjects;
    private final AuditLog auditLog;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public ClassService(ClassGroupRepository classes, EnrolmentRepository enrolments, SubjectRepository subjects,
            AuditLog auditLog, Clock clock) {
        this.classes = classes;
        this.enrolments = enrolments;
        this.subjects = subjects;
        this.auditLog = auditLog;
        this.clock = clock;
    }

    @Transactional
    public ClassDetail create(Actor actor, UUID schoolId, String subjectCode, String name, int yearGroup,
            String academicYear, Level level) {
        if (!actor.holds(Role.TEACHER, schoolId)) {
            throw notFound("No such school.");
        }
        Subject subject = subjects.findByCode(subjectCode).orElseThrow(() -> notFound("No such subject."));
        Instant now = clock.instant();
        UUID classId = classes.insert(schoolId, subject.id(), name, yearGroup, academicYear, level, actor.userId(),
                JoinCode.generate(random).value(), JoinCode.expiryFrom(now));
        return detail(actor, classId);
    }

    public List<ClassSummary> listOwned(Actor actor) {
        requireTeacher(actor);
        return classes.listOwnedBy(actor.userId()).stream().map(group -> {
            Subject subject = subjectOf(group);
            return new ClassSummary(group.id(), group.name(), subject.code(), subject.name(), group.yearGroup(),
                    group.academicYear(), group.level(), enrolments.pendingCount(group.id()));
        }).toList();
    }

    public ClassDetail detail(Actor actor, UUID classId) {
        ClassGroup group = owned(actor, classId);
        Subject subject = subjectOf(group);
        JoinCodeView code = group.joiningOpenAt(clock.instant())
                ? new JoinCodeView(group.joinCode(), group.joinCodeExpiresAt())
                : null;
        List<MemberView> members = enrolments.membersOf(classId).stream()
                .map(m -> new MemberView(m.enrolmentId(), m.studentId(), m.firstName(), m.lastName(), m.username(),
                        m.status(), m.requestedAt()))
                .toList();
        return new ClassDetail(group.id(), group.name(), subject.code(), subject.name(), group.yearGroup(),
                group.academicYear(), group.level(), code, members);
    }

    @Transactional
    public JoinCodeView rotateJoinCode(Actor actor, UUID classId) {
        owned(actor, classId);
        Instant now = clock.instant();
        JoinCode code = JoinCode.generate(random);
        classes.setJoinCode(classId, code.value(), JoinCode.expiryFrom(now));
        auditLog.record(actor.userId(), AuditEventType.JOIN_CODE_ROTATED, "class", classId, Map.of());
        return new JoinCodeView(code.value(), JoinCode.expiryFrom(now));
    }

    @Transactional
    public void disableJoinCode(Actor actor, UUID classId) {
        owned(actor, classId);
        classes.setJoinCode(classId, null, null);
        auditLog.record(actor.userId(), AuditEventType.JOIN_CODE_DISABLED, "class", classId, Map.of());
    }

    /** The scope check shared by every class-scoped endpoint, including enrolment and reset-code ones. */
    public ClassGroup owned(Actor actor, UUID classId) {
        requireTeacher(actor);
        return classes.findOwned(classId, actor.userId()).orElseThrow(() -> notFound("No such class."));
    }

    private void requireTeacher(Actor actor) {
        if (!actor.holds(Role.TEACHER)) {
            throw notFound("No such resource.");
        }
    }

    private Subject subjectOf(ClassGroup group) {
        return subjects.findById(group.subjectId()).orElseThrow(() -> new IllegalStateException("subject missing"));
    }

    private static DomainException notFound(String detail) {
        return new DomainException(ErrorCode.NOT_FOUND, detail);
    }
}
```

`SubjectRepository` (from 1B) needs one more method. Add to `classes/adapter/persistence/SubjectRepository.java`:

```java
    public Optional<Subject> findById(UUID id) {
        return jdbc.sql("SELECT id, code, name FROM subject WHERE id = :id")
                .param("id", id)
                .query(Subject.class)
                .optional();
    }
```

(import `java.util.UUID`)

- [ ] **Step 4: Write the request and controller**

`classes/adapter/web/CreateClassRequest.java`:

```java
package ie.coursework.classes.adapter.web;

import ie.coursework.classes.domain.Level;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Plan decision P-2: the school is named explicitly. */
public record CreateClassRequest(
        @NotNull UUID schoolId,
        @NotBlank String subjectCode,
        @NotBlank @Size(max = 80) String name,
        @NotNull @Min(5) @Max(6) Integer yearGroup,
        @NotBlank @Pattern(regexp = "\\d{4}/\\d{2}", message = "must look like 2026/27") String academicYear,
        Level level) {}
```

`classes/adapter/web/ClassController.java`:

```java
package ie.coursework.classes.adapter.web;

import ie.coursework.classes.application.ClassService;
import ie.coursework.classes.application.ClassViews.ClassDetail;
import ie.coursework.classes.application.ClassViews.ClassSummary;
import ie.coursework.identity.domain.Actor;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/classes")
public class ClassController {

    private final ClassService classes;

    public ClassController(ClassService classes) {
        this.classes = classes;
    }

    @GetMapping
    List<ClassSummary> list(Actor actor) {
        return classes.listOwned(actor);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ClassDetail create(Actor actor, @Valid @RequestBody CreateClassRequest body) {
        return classes.create(actor, body.schoolId(), body.subjectCode(), body.name(), body.yearGroup(),
                body.academicYear(), body.level());
    }

    @GetMapping("/{classId}")
    ClassDetail detail(Actor actor, @PathVariable UUID classId) {
        return classes.detail(actor, classId);
    }
}
```

`GET /{classId}` is included here because `create` returns the same view; Task 6 tests it.

- [ ] **Step 5: Run the test and watch it pass**

Run: `./mvnw test -Dtest=ClassListTest`
Expected: 4 tests, 0 failures.

If `$.joinCode.expiresAt` serialises as a number, Jackson 3 is writing `Instant` as epoch seconds. Add to `application.yaml` under `spring:`: `jackson: { serialization: { write-dates-as-timestamps: false } }` (Spring Boot 4 property `spring.jackson.serialization.write-dates-as-timestamps: false`). The frontend's Zod schemas in 1D expect ISO strings.

- [ ] **Step 6: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Teachers create and list their classes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

The authorisation suites are still partly red; note which cases now pass.

---

## Task 6: Class detail, rotate the code, turn joining off

Roadmap §7: `GET /classes/{id}`, `POST /classes/{id}/join-code`, `DELETE /classes/{id}/join-code`.

**Files:**
- Modify: `classes/adapter/web/ClassController.java`
- Test: `classes/adapter/web/ClassDetailTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.classes.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class ClassDetailTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    private ApiSession teacher1() throws Exception {
        return new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    @Test
    void showsTheCodeAndThePendingAndApprovedStudentsButNotRemovedOnes() throws Exception {
        ClassFixtures.World world = fixtures.world();

        teacher1().get("/api/v1/classes/" + world.class1())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.joinCode.code").value(world.class1Code()))
                .andExpect(jsonPath("$.enrolments.length()").value(2))
                .andExpect(jsonPath("$.enrolments[0].status").value("PENDING"))
                .andExpect(jsonPath("$.enrolments[0].username").value(ClassFixtures.PENDING_STUDENT))
                .andExpect(jsonPath("$.enrolments[1].status").value("APPROVED"))
                .andExpect(jsonPath("$.enrolments[*].username").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem(ClassFixtures.REMOVED_STUDENT))));
    }

    @Test
    void rotatingReplacesTheCodeAndIsAudited() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession teacher = teacher1();

        String newCode = teacher.post("/api/v1/classes/" + world.class1() + "/join-code")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.not(world.class1Code())))
                .andReturn().getResponse().getContentAsString();

        teacher.get("/api/v1/classes/" + world.class1()).andExpect(jsonPath("$.joinCode.code").value(
                org.hamcrest.Matchers.not(world.class1Code())));
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_event WHERE event_type = 'JOIN_CODE_ROTATED' AND subject_id = ?",
                Integer.class, world.class1())).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_event WHERE details::text LIKE '%' || ? || '%'", Integer.class,
                newCode.replaceAll(".*\"code\":\"([A-Z0-9]+)\".*", "$1")))
                .as("the code itself is never written to the audit log").isZero();
    }

    @Test
    void turningJoiningOffClearsTheCode() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession teacher = teacher1();

        teacher.delete("/api/v1/classes/" + world.class1() + "/join-code").andExpect(status().isNoContent());

        teacher.get("/api/v1/classes/" + world.class1())
                .andExpect(jsonPath("$.joinCode").value(org.hamcrest.Matchers.nullValue()));
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_event WHERE event_type = 'JOIN_CODE_DISABLED'", Integer.class)).isEqualTo(1);
    }

    @Test
    void anExpiredCodeIsShownAsNoCode() throws Exception {
        ClassFixtures.World world = fixtures.world();
        jdbcTemplate.update("UPDATE class_group SET join_code_expires_at = now() - interval '1 minute' WHERE id = ?",
                world.class1());

        teacher1().get("/api/v1/classes/" + world.class1())
                .andExpect(jsonPath("$.joinCode").value(org.hamcrest.Matchers.nullValue()));
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && ./mvnw test -Dtest=ClassDetailTest`
Expected: FAIL — the first test passes (Task 5 mapped `GET /{classId}`); the rotate and disable tests get 404.

- [ ] **Step 3: Add the two endpoints**

In `ClassController.java`, add:

```java
    @PostMapping("/{classId}/join-code")
    JoinCodeView rotateJoinCode(Actor actor, @PathVariable UUID classId) {
        return classes.rotateJoinCode(actor, classId);
    }

    @DeleteMapping("/{classId}/join-code")
    ResponseEntity<Void> disableJoinCode(Actor actor, @PathVariable UUID classId) {
        classes.disableJoinCode(actor, classId);
        return ResponseEntity.noContent().build();
    }
```

(imports: `ie.coursework.classes.application.ClassViews.JoinCodeView`, `org.springframework.http.ResponseEntity`, `org.springframework.web.bind.annotation.DeleteMapping`)

- [ ] **Step 4: Run the test and watch it pass**

Run: `./mvnw test -Dtest=ClassDetailTest`
Expected: 4 tests, 0 failures.

- [ ] **Step 5: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Show a class with its join code; rotate or switch the code off

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 7: Join preview, join with an existing account, and sign-up

Design §8.1 steps 3–4; roadmap §7: `GET /join/{code}`, `POST /join/{code}/accounts`, `POST /join/{code}/enrolments`.

**Files:**
- Modify: `security/SecurityConfig.java`
- Create: `classes/application/EnrolmentService.java`, `classes/adapter/web/JoinController.java`, `classes/adapter/web/SignUpRequest.java`
- Test: `classes/adapter/web/JoinTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.classes.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class JoinTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    private static String signUp(String username, String password) {
        return """
                {"firstName":"Aoife","lastName":"Byrne","username":"%s","password":"%s"}
                """.formatted(username, password);
    }

    @Test
    void previewNamesTheClassSubjectAndSchoolAndIsForgivingAboutTyping() throws Exception {
        ClassFixtures.World world = fixtures.world();
        String typed = world.class1Code().toLowerCase().replaceFirst("(....)(....)", "$1-$2");

        new ApiSession(mockMvc).get("/api/v1/join/" + typed)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.className").value("6A Biology"))
                .andExpect(jsonPath("$.subjectName").value("Biology"))
                .andExpect(jsonPath("$.schoolName").value("School A"));
    }

    @Test
    void unknownExpiredAndDisabledCodesGetOneAnswer() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession nobody = new ApiSession(mockMvc);

        nobody.get("/api/v1/join/ZZZZZZZZ").andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("JOIN_CODE_INVALID"));
        nobody.get("/api/v1/join/not-a-code").andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("JOIN_CODE_INVALID"));

        jdbcTemplate.update("UPDATE class_group SET join_code_expires_at = now() - interval '1 minute' WHERE id = ?", world.class1());
        nobody.get("/api/v1/join/" + world.class1Code()).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("JOIN_CODE_INVALID"));
    }

    @Test
    void signUpCreatesAStudentSignsThemInAndRequestsToJoin() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession phone = new ApiSession(mockMvc);

        phone.post("/api/v1/join/" + world.class1Code() + "/accounts", signUp("Aoife.Byrne", "aoife-loves-cells"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.className").value("6A Biology"));

        assertThat(phone.cookie("SESSION")).isPresent();
        phone.get("/api/v1/auth/me")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("aoife.byrne"))
                .andExpect(jsonPath("$.mustChangePassword").value(false))
                .andExpect(jsonPath("$.roles[0].role").value("STUDENT"))
                .andExpect(jsonPath("$.roles[0].schoolId").value(world.schoolA().toString()));
        phone.get("/api/v1/me/classes").andExpect(jsonPath("$[0].status").value("PENDING"));
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_event WHERE event_type IN ('USER_CREATED', 'ROLE_GRANTED')", Integer.class))
                .isEqualTo(2);
    }

    @Test
    void signUpValidatesTheUsernameAndPasswordAndReportsATakenName() throws Exception {
        ClassFixtures.World world = fixtures.world();
        String path = "/api/v1/join/" + world.class1Code() + "/accounts";

        new ApiSession(mockMvc).post(path, signUp("ab", "aoife-loves-cells"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("USERNAME_INVALID"));
        new ApiSession(mockMvc).post(path, signUp("aoife.b", "short"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PASSWORD_TOO_SHORT"));
        new ApiSession(mockMvc).post(path, signUp(ClassFixtures.APPROVED_STUDENT, "aoife-loves-cells"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("USERNAME_TAKEN"));
        new ApiSession(mockMvc).post("/api/v1/join/ZZZZZZZZ/accounts", signUp("aoife.b", "aoife-loves-cells"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("JOIN_CODE_INVALID"));
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM password_credential WHERE username = 'aoife.b'", Integer.class))
                .as("a refused sign-up leaves no account behind").isZero();
    }

    @Test
    void anExistingAccountJoinsASecondClassAndSeesItsStatus() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession student = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);

        student.post("/api/v1/join/CLASSTWP/enrolments")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.className").value("6B Biology"));
        student.get("/api/v1/me/classes").andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void joiningAgainIsHarmlessAndShowsTheCurrentStatus() throws Exception {
        ClassFixtures.World world = fixtures.world();

        new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD)
                .post("/api/v1/join/" + world.class1Code() + "/enrolments")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.enrolmentId").value(world.approvedEnrolment().toString()));
        new ApiSession(mockMvc).login(ClassFixtures.REMOVED_STUDENT, TestAccounts.PASSWORD)
                .post("/api/v1/join/" + world.class1Code() + "/enrolments")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void aTeacherJoiningTheirOwnCodeGetsAStudentRoleTooBecauseTheDesignAllowsSeveralRoles() throws Exception {
        ClassFixtures.World world = fixtures.world();

        new ApiSession(mockMvc).login(ClassFixtures.TEACHER2, TestAccounts.PASSWORD)
                .post("/api/v1/join/" + world.class1Code() + "/enrolments")
                .andExpect(status().isOk());
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_role WHERE user_id = ? AND role = 'STUDENT'", Integer.class, world.teacher2()))
                .isEqualTo(1);
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && ./mvnw test -Dtest=JoinTest`
Expected: FAIL — 404 `NOT_FOUND` from the preview (no controller) and 401 from the sign-up (not yet public).

- [ ] **Step 3: Open the public join endpoints**

In `SecurityConfig.java`, after the `POST /api/v1/auth/login` line:

```java
                        .requestMatchers(HttpMethod.GET, "/api/v1/join/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/join/*/accounts").permitAll()
```

- [ ] **Step 4: Write the service**

`classes/application/EnrolmentService.java`:

```java
package ie.coursework.classes.application;

import ie.coursework.audit.AuditEventType;
import ie.coursework.audit.AuditLog;
import ie.coursework.classes.adapter.persistence.ClassGroupRepository;
import ie.coursework.classes.adapter.persistence.EnrolmentRepository;
import ie.coursework.classes.adapter.persistence.SubjectRepository;
import ie.coursework.classes.application.ClassViews.EnrolmentView;
import ie.coursework.classes.application.ClassViews.JoinPreview;
import ie.coursework.classes.domain.ClassGroup;
import ie.coursework.classes.domain.Enrolment;
import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.classes.domain.JoinCode;
import ie.coursework.identity.adapter.persistence.RoleRepository;
import ie.coursework.identity.adapter.persistence.SchoolRepository;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.PasswordPolicy;
import ie.coursework.identity.domain.Role;
import ie.coursework.identity.domain.School;
import ie.coursework.identity.domain.Username;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Joining a class (design §8.1 steps 3–4) and the teacher's decisions about who's in it. */
@Service
public class EnrolmentService {

    /** A student account created by sign-up, with the enrolment it requested. */
    public record SignedUp(UUID userId, EnrolmentView enrolment) {}

    private final ClassGroupRepository classes;
    private final EnrolmentRepository enrolments;
    private final SubjectRepository subjects;
    private final SchoolRepository schools;
    private final UserAccountRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final ClassService classService;
    private final AuditLog auditLog;
    private final Clock clock;

    public EnrolmentService(ClassGroupRepository classes, EnrolmentRepository enrolments, SubjectRepository subjects,
            SchoolRepository schools, UserAccountRepository users, RoleRepository roles,
            PasswordEncoder passwordEncoder, ClassService classService, AuditLog auditLog, Clock clock) {
        this.classes = classes;
        this.enrolments = enrolments;
        this.subjects = subjects;
        this.schools = schools;
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.classService = classService;
        this.auditLog = auditLog;
        this.clock = clock;
    }

    public JoinPreview preview(String typedCode) {
        ClassGroup group = openClass(typedCode);
        return new JoinPreview(group.name(), subjectName(group), schoolName(group));
    }

    /** Sign-up: account, STUDENT role at the class's school, and a PENDING request, in one transaction. */
    @Transactional
    public SignedUp signUp(String typedCode, String firstName, String lastName, String rawUsername, String password) {
        ClassGroup group = openClass(typedCode);
        Username username = Username.parse(rawUsername);
        PasswordPolicy.check(password);
        UUID userId = users.insertUser(firstName, lastName);
        try {
            users.insertCredential(userId, username, passwordEncoder.encode(password), false);
        } catch (DuplicateKeyException e) {
            throw new DomainException(ErrorCode.USERNAME_TAKEN, "That username is taken.");
        }
        auditLog.record(userId, AuditEventType.USER_CREATED, "user", userId, Map.of());
        Actor actor = new Actor(userId, List.of());
        return new SignedUp(userId, join(actor, group));
    }

    /** Join with the signed-in account. Idempotent: an existing PENDING or APPROVED row is returned as is. */
    @Transactional
    public EnrolmentView join(Actor actor, String typedCode) {
        return join(actor, openClass(typedCode));
    }

    public List<EnrolmentView> myClasses(Actor actor) {
        return enrolments.classesOf(actor.userId()).stream()
                .map(c -> new EnrolmentView(c.enrolmentId(), c.classId(), c.className(), c.subjectName(),
                        c.schoolName(), c.status()))
                .toList();
    }

    @Transactional
    public EnrolmentView approve(Actor teacher, UUID classId, UUID enrolmentId) {
        ClassGroup group = classService.owned(teacher, classId);
        Enrolment enrolment = inClass(enrolmentId, classId);
        if (!enrolment.status().canApprove()) {
            throw new DomainException(ErrorCode.ENROLMENT_NOT_PENDING, "That request has already been decided.");
        }
        enrolments.decide(enrolmentId, EnrolmentStatus.APPROVED, teacher.userId(), clock.instant());
        auditLog.record(teacher.userId(), AuditEventType.ENROLMENT_APPROVED, "enrolment", enrolmentId,
                Map.of("classId", classId.toString(), "studentId", enrolment.studentUserId().toString()));
        return view(group, enrolmentId, enrolment.studentUserId());
    }

    /** Declines a pending request or removes an approved student; both end as REMOVED. */
    @Transactional
    public EnrolmentView remove(Actor teacher, UUID classId, UUID enrolmentId) {
        ClassGroup group = classService.owned(teacher, classId);
        Enrolment enrolment = inClass(enrolmentId, classId);
        if (!enrolment.status().canRemove()) {
            throw new DomainException(ErrorCode.ENROLMENT_ALREADY_REMOVED, "That student has already been removed.");
        }
        enrolments.decide(enrolmentId, EnrolmentStatus.REMOVED, teacher.userId(), clock.instant());
        auditLog.record(teacher.userId(), AuditEventType.ENROLMENT_REMOVED, "enrolment", enrolmentId,
                Map.of("classId", classId.toString(), "studentId", enrolment.studentUserId().toString(),
                        "was", enrolment.status().name()));
        return view(group, enrolmentId, enrolment.studentUserId());
    }

    private EnrolmentView join(Actor actor, ClassGroup group) {
        if (roles.grant(actor.userId(), group.schoolId(), Role.STUDENT)) {
            auditLog.record(actor.userId(), AuditEventType.ROLE_GRANTED, "user", actor.userId(),
                    Map.of("schoolId", group.schoolId().toString(), "role", Role.STUDENT.name()));
        }
        UUID enrolmentId = enrolments.request(group.id(), actor.userId(), clock.instant());
        return view(group, enrolmentId, actor.userId());
    }

    private ClassGroup openClass(String typedCode) {
        DomainException invalid = new DomainException(ErrorCode.JOIN_CODE_INVALID,
                "That join code isn't right, or it has expired. Ask your teacher for a new one.");
        JoinCode code = JoinCode.parse(typedCode).orElseThrow(() -> invalid);
        ClassGroup group = classes.findByJoinCode(code.value()).orElseThrow(() -> invalid);
        if (!group.joiningOpenAt(clock.instant())) {
            throw invalid;
        }
        return group;
    }

    private Enrolment inClass(UUID enrolmentId, UUID classId) {
        return enrolments.findInClass(enrolmentId, classId)
                .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "No such enrolment."));
    }

    private EnrolmentView view(ClassGroup group, UUID enrolmentId, UUID studentId) {
        Enrolment current = enrolments.findByStudent(group.id(), studentId).orElseThrow();
        return new EnrolmentView(enrolmentId, group.id(), group.name(), subjectName(group), schoolName(group),
                current.status());
    }

    private String subjectName(ClassGroup group) {
        return subjects.findById(group.subjectId()).orElseThrow().name();
    }

    private String schoolName(ClassGroup group) {
        return schools.findById(group.schoolId()).map(School::name).orElseThrow();
    }
}
```

`SchoolRepository` (from 1B) needs `findById`. Add to `identity/adapter/persistence/SchoolRepository.java`:

```java
    public Optional<School> findById(UUID id) {
        return jdbc.sql("SELECT id, name, roll_number FROM school WHERE id = :id")
                .param("id", id)
                .query(School.class)
                .optional();
    }
```

- [ ] **Step 5: Write the request and controller**

`classes/adapter/web/SignUpRequest.java`:

```java
package ie.coursework.classes.adapter.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Design §8.1: first name, surname, username, password. Nothing else is collected. */
public record SignUpRequest(
        @NotBlank @Size(max = 80) String firstName,
        @NotBlank @Size(max = 80) String lastName,
        @NotNull @Size(max = 64) String username,
        @NotNull @Size(max = 256) String password) {}
```

`classes/adapter/web/JoinController.java`:

```java
package ie.coursework.classes.adapter.web;

import ie.coursework.classes.application.ClassViews.EnrolmentView;
import ie.coursework.classes.application.ClassViews.JoinPreview;
import ie.coursework.classes.application.EnrolmentService;
import ie.coursework.identity.domain.Actor;
import ie.coursework.security.SessionEstablisher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/join")
public class JoinController {

    private final EnrolmentService enrolments;
    private final SessionEstablisher sessions;

    public JoinController(EnrolmentService enrolments, SessionEstablisher sessions) {
        this.enrolments = enrolments;
        this.sessions = sessions;
    }

    /** Public: what a code is for, before anyone commits to an account. */
    @GetMapping("/{code}")
    JoinPreview preview(@PathVariable String code) {
        return enrolments.preview(code);
    }

    /** Public: create a student account, sign it in, and ask to join. */
    @PostMapping("/{code}/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    EnrolmentView signUp(@PathVariable String code, @Valid @RequestBody SignUpRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        EnrolmentService.SignedUp result = enrolments.signUp(code, body.firstName(), body.lastName(),
                body.username(), body.password());
        sessions.signIn(result.userId(), request, response);
        return result.enrolment();
    }

    /** Signed in: ask to join with this account. */
    @PostMapping("/{code}/enrolments")
    EnrolmentView join(Actor actor, @PathVariable String code) {
        return enrolments.join(actor, code);
    }
}
```

Also create `classes/adapter/web/MeClassesController.java` now, because the tests above call `/me/classes`:

```java
package ie.coursework.classes.adapter.web;

import ie.coursework.classes.application.ClassViews.EnrolmentView;
import ie.coursework.classes.application.EnrolmentService;
import ie.coursework.identity.domain.Actor;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeClassesController {

    private final EnrolmentService enrolments;

    public MeClassesController(EnrolmentService enrolments) {
        this.enrolments = enrolments;
    }

    /** The signed-in user's own PENDING and APPROVED classes. Empty for anyone who is nobody's student. */
    @GetMapping("/api/v1/me/classes")
    List<EnrolmentView> myClasses(Actor actor) {
        return enrolments.myClasses(actor);
    }
}
```

- [ ] **Step 6: Run the test and watch it pass**

Run: `./mvnw test -Dtest=JoinTest`
Expected: 7 tests, 0 failures.

If `signUpValidatesTheUsernameAndPasswordAndReportsATakenName` finds a leftover `aoife.b` credential, the `DomainException` for `USERNAME_INVALID` was thrown *after* `insertUser`; check the order in `signUp` (parse and policy checks come before any insert).

If the sign-up response has no `SESSION` cookie, `SessionEstablisher.signIn` ran but the response was already committed; make sure `signUp` returns the body rather than writing it before `signIn`.

- [ ] **Step 7: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Students join a class by code, with a new or existing account

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 8: Approve, decline, remove

Roadmap §7: `POST /classes/{id}/enrolments/{enrolmentId}/approve`, `…/remove`.

**Files:**
- Modify: `classes/adapter/web/ClassController.java`
- Test: `classes/adapter/web/EnrolmentDecisionTest.java`

- [ ] **Step 1: Write the failing test**

```java
package ie.coursework.classes.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class EnrolmentDecisionTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    private ApiSession teacher1() throws Exception {
        return new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    private static String path(ClassFixtures.World world, java.util.UUID enrolment, String action) {
        return "/api/v1/classes/" + world.class1() + "/enrolments/" + enrolment + "/" + action;
    }

    @Test
    void approvingAPendingRequestIsAuditedAndVisibleToTheStudent() throws Exception {
        ClassFixtures.World world = fixtures.world();

        teacher1().post(path(world, world.pendingEnrolment(), "approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.enrolmentId").value(world.pendingEnrolment().toString()));

        new ApiSession(mockMvc).login(ClassFixtures.PENDING_STUDENT, TestAccounts.PASSWORD).get("/api/v1/me/classes")
                .andExpect(jsonPath("$[0].status").value("APPROVED"));
        assertThat(jdbcTemplate.queryForMap(
                "SELECT actor_user_id, details->>'studentId' AS student FROM audit_event WHERE event_type = 'ENROLMENT_APPROVED'"))
                .containsEntry("actor_user_id", world.teacher1())
                .containsEntry("student", world.pendingStudent().toString());
    }

    @Test
    void approvingTwiceIsRefused() throws Exception {
        ClassFixtures.World world = fixtures.world();

        teacher1().post(path(world, world.approvedEnrolment(), "approve"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ENROLMENT_NOT_PENDING"));
    }

    @Test
    void decliningAPendingRequestAndRemovingAnApprovedStudentBothEndAsRemoved() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession teacher = teacher1();

        teacher.post(path(world, world.pendingEnrolment(), "remove")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REMOVED"));
        teacher.post(path(world, world.approvedEnrolment(), "remove")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REMOVED"));

        teacher.get("/api/v1/classes/" + world.class1()).andExpect(jsonPath("$.enrolments").isEmpty());
        new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD).get("/api/v1/me/classes")
                .andExpect(jsonPath("$").isEmpty());
        assertThat(jdbcTemplate.queryForList(
                "SELECT details->>'was' FROM audit_event WHERE event_type = 'ENROLMENT_REMOVED' ORDER BY occurred_at", String.class))
                .containsExactly("PENDING", "APPROVED");
    }

    @Test
    void removingTwiceIsRefused() throws Exception {
        ClassFixtures.World world = fixtures.world();

        teacher1().post(path(world, world.removedEnrolment(), "remove"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ENROLMENT_ALREADY_REMOVED"));
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && ./mvnw test -Dtest=EnrolmentDecisionTest`
Expected: FAIL — 404 on approve and remove.

- [ ] **Step 3: Add the endpoints**

In `ClassController.java`, add the field and constructor parameter `EnrolmentService enrolments`, and:

```java
    @PostMapping("/{classId}/enrolments/{enrolmentId}/approve")
    EnrolmentView approve(Actor actor, @PathVariable UUID classId, @PathVariable UUID enrolmentId) {
        return enrolments.approve(actor, classId, enrolmentId);
    }

    @PostMapping("/{classId}/enrolments/{enrolmentId}/remove")
    EnrolmentView remove(Actor actor, @PathVariable UUID classId, @PathVariable UUID enrolmentId) {
        return enrolments.remove(actor, classId, enrolmentId);
    }
```

(imports: `ie.coursework.classes.application.EnrolmentService`, `ie.coursework.classes.application.ClassViews.EnrolmentView`)

- [ ] **Step 4: Run the test and watch it pass**

Run: `./mvnw test -Dtest=EnrolmentDecisionTest`
Expected: 4 tests, 0 failures.

- [ ] **Step 5: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Teachers approve, decline and remove students

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 9: Password reset codes

Design §8.1 step 5; roadmap §7: `POST /classes/{id}/students/{studentId}/reset-codes`, `POST /auth/password-reset`. The code is 8 characters from the join-code alphabet, stored as a SHA-256 hex digest, valid 24 hours, usable once. Redeeming sets the password, ends every session of that user, and (plan decision P-3) does not sign them in.

**Files:**
- Modify: `security/SecurityConfig.java`, `identity/adapter/web/AuthController.java`, `classes/adapter/web/ClassController.java`
- Create: `identity/domain/ResetCode.java`, `identity/adapter/persistence/ResetCodeRepository.java`, `identity/application/PasswordResetService.java`, `identity/adapter/web/PasswordResetRequest.java`
- Test: `identity/domain/ResetCodeTest.java`, `identity/adapter/web/PasswordResetTest.java`

- [ ] **Step 1: Write the failing tests**

`identity/domain/ResetCodeTest.java`:

```java
package ie.coursework.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class ResetCodeTest {

    @Test
    void eightUnambiguousCharactersValidForADay() {
        ResetCode code = ResetCode.generate(new SecureRandom());

        assertThat(code.value()).hasSize(8).matches("[A-HJKMNP-Z2-9]{8}");
        assertThat(ResetCode.LIFETIME).isEqualTo(Duration.ofHours(24));
        assertThat(code.expiryFrom(Instant.parse("2026-10-01T09:00:00Z"))).isEqualTo(Instant.parse("2026-10-02T09:00:00Z"));
    }

    @Test
    void theHashIsStableAndForgivingAboutTyping() {
        ResetCode code = new ResetCode("ABCDEFGH");

        assertThat(code.hash()).isEqualTo(ResetCode.hashOf(" abcd-efgh "));
        assertThat(code.hash()).hasSize(64).doesNotContain("ABCDEFGH");
        assertThat(ResetCode.hashOf("ABCDEFGJ")).isNotEqualTo(code.hash());
    }
}
```

`identity/adapter/web/PasswordResetTest.java`:

```java
package ie.coursework.identity.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class PasswordResetTest extends PostgresIntegrationTest {

    private static final String NEW_PASSWORD = "a-fresh-start-2026";

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;

    private String issue(ClassFixtures.World world, java.util.UUID studentId) throws Exception {
        String body = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .post("/api/v1/classes/" + world.class1() + "/students/" + studentId + "/reset-codes")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.matchesPattern("[A-HJKMNP-Z2-9]{8}")))
                .andExpect(jsonPath("$.expiresAt").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        return body.replaceAll(".*\"code\":\"([A-Z0-9]+)\".*", "$1");
    }

    private static String redeem(String username, String code, String password) {
        return "{\"username\":\"%s\",\"code\":\"%s\",\"newPassword\":\"%s\"}".formatted(username, code, password);
    }

    @Test
    void aTeacherIssuesACodeAndTheStudentRedeemsItOnce() throws Exception {
        ClassFixtures.World world = fixtures.world();
        String code = issue(world, world.approvedStudent());
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM password_reset_code WHERE code_hash = ?", Integer.class, code))
                .as("the code is stored hashed").isZero();

        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, code.toLowerCase(), NEW_PASSWORD))
                .andExpect(status().isNoContent());

        new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, NEW_PASSWORD);
        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, code, "another-new-one-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("RESET_CODE_INVALID"));
        assertThat(jdbcTemplate.queryForList("SELECT event_type FROM audit_event WHERE event_type LIKE 'RESET_CODE_%' ORDER BY occurred_at", String.class))
                .containsExactly("RESET_CODE_ISSUED", "RESET_CODE_REDEEMED");
    }

    @Test
    void redeemingEndsEveryExistingSessionOfThatStudent() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession oldPhone = new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD);
        String code = issue(world, world.approvedStudent());

        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, code, NEW_PASSWORD))
                .andExpect(status().isNoContent());

        oldPhone.get("/api/v1/auth/me").andExpect(status().isUnauthorized());
    }

    @Test
    void wrongCodeWrongUserExpiredCodeAndWeakPasswordAreRefused() throws Exception {
        ClassFixtures.World world = fixtures.world();
        String code = issue(world, world.approvedStudent());

        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, "ZZZZZZZZ", NEW_PASSWORD))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("RESET_CODE_INVALID"));
        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.PENDING_STUDENT, code, NEW_PASSWORD))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("RESET_CODE_INVALID"));
        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem("nobody.here", code, NEW_PASSWORD))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("RESET_CODE_INVALID"));
        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, code, "short"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PASSWORD_TOO_SHORT"));

        jdbcTemplate.update("UPDATE password_reset_code SET expires_at = now() - interval '1 minute'");
        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, code, NEW_PASSWORD))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("RESET_CODE_INVALID"));
    }

    @Test
    void issuingAgainInvalidatesTheEarlierCode() throws Exception {
        ClassFixtures.World world = fixtures.world();
        String first = issue(world, world.approvedStudent());
        String second = issue(world, world.approvedStudent());

        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, first, NEW_PASSWORD))
                .andExpect(status().isBadRequest());
        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, second, NEW_PASSWORD))
                .andExpect(status().isNoContent());
    }

    @Test
    void guessingIsThrottledLikeLogin() throws Exception {
        fixtures.world();
        ApiSession attacker = new ApiSession(mockMvc);
        for (int i = 0; i < 5; i++) {
            attacker.post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, "ZZZZZZZ" + (i + 2), NEW_PASSWORD))
                    .andExpect(status().isBadRequest());
        }

        new ApiSession(mockMvc).post("/api/v1/auth/password-reset", redeem(ClassFixtures.APPROVED_STUDENT, "ZZZZZZZ9", NEW_PASSWORD))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("TOO_MANY_ATTEMPTS"));
    }

    @Test
    void aCodeCanOnlyBeIssuedForAStudentInMyClass() throws Exception {
        ClassFixtures.World world = fixtures.world();
        ApiSession teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);

        teacher.post("/api/v1/classes/" + world.class1() + "/students/" + world.removedStudent() + "/reset-codes")
                .andExpect(status().isNotFound());
        teacher.post("/api/v1/classes/" + world.class1() + "/students/" + world.pendingStudent() + "/reset-codes")
                .andExpect(status().isCreated());
    }
}
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd backend && ./mvnw test -Dtest='ResetCodeTest,PasswordResetTest'`
Expected: FAIL — compilation errors (`ResetCode`), then 404s.

- [ ] **Step 3: Write the domain type and repository**

`identity/domain/ResetCode.java`:

```java
package ie.coursework.identity.domain;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

/**
 * A one-time password reset code a teacher reads out (design §8.1 step 5). Same alphabet as join
 * codes. Stored only as a SHA-256 digest: the code is high-entropy and short-lived, so a fast hash
 * is right and bcrypt would be needless work.
 */
public record ResetCode(String value) {

    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int LENGTH = 8;
    public static final Duration LIFETIME = Duration.ofHours(24);

    public static ResetCode generate(SecureRandom random) {
        StringBuilder code = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return new ResetCode(code.toString());
    }

    public Instant expiryFrom(Instant issuedAt) {
        return issuedAt.plus(LIFETIME);
    }

    public String hash() {
        return hashOf(value);
    }

    /** Digest of the normalised form, so what a student types matches what was issued. */
    public static String hashOf(String typed) {
        String normalised = typed == null ? "" : typed.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(normalised.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 missing", e);
        }
    }
}
```

`identity/adapter/persistence/ResetCodeRepository.java`:

```java
package ie.coursework.identity.adapter.persistence;

import ie.coursework.shared.persistence.Timestamps;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ResetCodeRepository {

    private final JdbcClient jdbc;

    public ResetCodeRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Issuing a new code marks any earlier live code for the user as used, so only one is ever live. */
    public UUID issue(UUID userId, String codeHash, UUID issuedByUserId, Instant now, Instant expiresAt) {
        jdbc.sql("UPDATE password_reset_code SET used_at = :now WHERE user_id = :user AND used_at IS NULL")
                .param("now", Timestamps.utc(now))
                .param("user", userId)
                .update();
        return jdbc.sql("""
                INSERT INTO password_reset_code (user_id, code_hash, issued_by_user_id, expires_at)
                VALUES (:user, :hash, :by, :expires) RETURNING id
                """)
                .param("user", userId)
                .param("hash", codeHash)
                .param("by", issuedByUserId)
                .param("expires", Timestamps.utc(expiresAt))
                .query(UUID.class)
                .single();
    }

    /** The id of the live, matching code for this user, if there is one. */
    public Optional<UUID> findLive(UUID userId, String codeHash, Instant now) {
        return jdbc.sql("""
                SELECT id FROM password_reset_code
                WHERE user_id = :user AND code_hash = :hash AND used_at IS NULL AND expires_at > :now
                """)
                .param("user", userId)
                .param("hash", codeHash)
                .param("now", Timestamps.utc(now))
                .query(UUID.class)
                .optional();
    }

    public void markUsed(UUID id, Instant now) {
        jdbc.sql("UPDATE password_reset_code SET used_at = :now WHERE id = :id")
                .param("now", Timestamps.utc(now))
                .param("id", id)
                .update();
    }
}
```

- [ ] **Step 4: Write the service**

`identity/application/PasswordResetService.java`:

```java
package ie.coursework.identity.application;

import ie.coursework.audit.AuditEventType;
import ie.coursework.audit.AuditLog;
import ie.coursework.classes.adapter.persistence.EnrolmentRepository;
import ie.coursework.classes.application.ClassService;
import ie.coursework.classes.application.ClassViews.ResetCodeIssued;
import ie.coursework.classes.domain.Enrolment;
import ie.coursework.identity.adapter.persistence.ResetCodeRepository;
import ie.coursework.identity.adapter.persistence.StoredCredential;
import ie.coursework.identity.adapter.persistence.UserAccountRepository;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.PasswordPolicy;
import ie.coursework.identity.domain.ResetCode;
import ie.coursework.identity.domain.Username;
import ie.coursework.security.LoginThrottle;
import ie.coursework.security.OtherSessions;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Design §8.1 step 5: the teacher issues a one-time code, the student redeems it. No email anywhere. */
@Service
public class PasswordResetService {

    private final ResetCodeRepository codes;
    private final UserAccountRepository users;
    private final EnrolmentRepository enrolments;
    private final ClassService classService;
    private final PasswordEncoder passwordEncoder;
    private final OtherSessions otherSessions;
    private final LoginThrottle throttle;
    private final AuditLog auditLog;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(ResetCodeRepository codes, UserAccountRepository users, EnrolmentRepository enrolments,
            ClassService classService, PasswordEncoder passwordEncoder, OtherSessions otherSessions,
            LoginThrottle throttle, AuditLog auditLog, Clock clock) {
        this.codes = codes;
        this.users = users;
        this.enrolments = enrolments;
        this.classService = classService;
        this.passwordEncoder = passwordEncoder;
        this.otherSessions = otherSessions;
        this.throttle = throttle;
        this.auditLog = auditLog;
        this.clock = clock;
    }

    /** Only for a PENDING or APPROVED student of a class the teacher owns; anything else is 404. */
    @Transactional
    public ResetCodeIssued issue(Actor teacher, UUID classId, UUID studentId) {
        classService.owned(teacher, classId);
        boolean member = enrolments.findByStudent(classId, studentId).map(Enrolment::status)
                .map(status -> status.canRemove()) // PENDING or APPROVED
                .orElse(false);
        if (!member) {
            throw new DomainException(ErrorCode.NOT_FOUND, "No such student in this class.");
        }
        Instant now = clock.instant();
        ResetCode code = ResetCode.generate(random);
        codes.issue(studentId, code.hash(), teacher.userId(), now, code.expiryFrom(now));
        auditLog.record(teacher.userId(), AuditEventType.RESET_CODE_ISSUED, "user", studentId,
                Map.of("classId", classId.toString()));
        return new ResetCodeIssued(code.value(), code.expiryFrom(now));
    }

    /**
     * One answer for every failure, and the username throttle counts each one, so a code can't be
     * guessed any faster than a password. Plan decision P-3: this does not sign the student in.
     */
    @Transactional
    public void redeem(String rawUsername, String typedCode, String newPassword, String clientAddress) {
        String username = Username.normalise(rawUsername);
        throttle.checkAllowed(username, clientAddress);
        DomainException invalid = new DomainException(ErrorCode.RESET_CODE_INVALID,
                "That code isn't right, or it has expired. Ask your teacher for a new one.");

        Instant now = clock.instant();
        Optional<StoredCredential> credential = safeParse(rawUsername).flatMap(users::findCredential);
        Optional<UUID> live = credential.flatMap(c -> codes.findLive(c.userId(), ResetCode.hashOf(typedCode), now));
        if (credential.isEmpty() || live.isEmpty() || credential.get().disabled()) {
            throttle.recordFailure(username, clientAddress);
            throw invalid;
        }
        PasswordPolicy.check(newPassword);

        UUID userId = credential.get().userId();
        users.updatePassword(userId, passwordEncoder.encode(newPassword), false, now);
        codes.markUsed(live.get(), now);
        otherSessions.endAllExcept(userId, null);
        throttle.recordSuccess(username);
        auditLog.record(userId, AuditEventType.RESET_CODE_REDEEMED, "user", userId, Map.of());
    }

    private static Optional<Username> safeParse(String raw) {
        try {
            return Optional.of(Username.parse(raw));
        } catch (DomainException e) {
            return Optional.empty();
        }
    }
}
```

- [ ] **Step 5: Write the request and the two endpoints, and open the public one**

`identity/adapter/web/PasswordResetRequest.java`:

```java
package ie.coursework.identity.adapter.web;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PasswordResetRequest(
        @NotNull @Size(max = 64) String username,
        @NotNull @Size(max = 16) String code,
        @NotNull @Size(max = 256) String newPassword) {}
```

In `AuthController.java`, add `PasswordResetService passwordResets` to the constructor and:

```java
    @PostMapping("/password-reset")
    ResponseEntity<Void> passwordReset(@Valid @RequestBody PasswordResetRequest body, HttpServletRequest request) {
        passwordResets.redeem(body.username(), body.code(), body.newPassword(), clientAddress.resolve(request));
        return ResponseEntity.noContent().build();
    }
```

(import `ie.coursework.identity.application.PasswordResetService`)

In `ClassController.java`, add `PasswordResetService passwordResets` to the constructor and:

```java
    @PostMapping("/{classId}/students/{studentId}/reset-codes")
    @ResponseStatus(HttpStatus.CREATED)
    ResetCodeIssued issueResetCode(Actor actor, @PathVariable UUID classId, @PathVariable UUID studentId) {
        return passwordResets.issue(actor, classId, studentId);
    }
```

(imports: `ie.coursework.identity.application.PasswordResetService`, `ie.coursework.classes.application.ClassViews.ResetCodeIssued`)

In `SecurityConfig.java`, after the join lines:

```java
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/password-reset").permitAll()
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `./mvnw test -Dtest='ResetCodeTest,PasswordResetTest'`
Expected: 8 tests, 0 failures.

If `guessingIsThrottledLikeLogin` sees six 400s, the throttle keys differ between attempts: `Username.normalise` must be applied to the key, and `ApiSession` gives each session its own address, so the per-username counter is the one that trips. Check `recordFailure` runs on every refused path before the exception.

- [ ] **Step 7: Run the whole suite, then commit**

```bash
./mvnw test && cd ..
git add backend
git commit -m "Teachers issue one-time reset codes that students redeem

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 10: Authorisation suites, complete

By now every endpoint exists. Make the four suites from Task 4 green, and add the last cases the roadmap's Gate 1C asks for.

**Files:**
- Modify: `classes/authz/TeacherScopeTest.java`, `StudentScopeTest.java`

- [ ] **Step 1: Run the suites**

Run: `cd backend && ./mvnw test -Dtest='TeacherScopeTest,StudentScopeTest,LeaderScopeTest,AnonymousScopeTest'`
Expected: all pass. If a case fails, the endpoint has a scope gap: fix the service, not the test.

- [ ] **Step 2: Add the remaining cross-scope cases**

To `TeacherScopeTest.java`:

```java
    @Test
    void anotherSchoolsTeacherCannotTouchMyEnrolmentsThroughTheirOwnClassId() throws Exception {
        as(ClassFixtures.TEACHER_B)
                .post("/api/v1/classes/" + world.classB() + "/enrolments/" + world.pendingEnrolment() + "/approve")
                .andExpect(status().isNotFound());
        as(ClassFixtures.TEACHER_B)
                .post("/api/v1/classes/" + world.classB() + "/students/" + world.approvedStudent() + "/reset-codes")
                .andExpect(status().isNotFound());
    }

    @Test
    void aTeacherCannotJoinPreviewLessThanAnyoneElseButCannotListStudentsClasses() throws Exception {
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        teacher.get("/api/v1/join/" + world.class1Code()).andExpect(status().isOk());
        teacher.get("/api/v1/me/classes").andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    }
```

To `StudentScopeTest.java`:

```java
    @Test
    void aStudentCannotSeeAnotherStudentsEnrolmentOrDecideTheirOwn() throws Exception {
        ApiSession student = as(ClassFixtures.PENDING_STUDENT);
        String own = "/api/v1/classes/" + world.class1() + "/enrolments/" + world.pendingEnrolment();

        student.post(own + "/approve").andExpect(status().isNotFound());
        student.post(own + "/remove").andExpect(status().isNotFound());
        student.delete("/api/v1/classes/" + world.class1() + "/join-code").andExpect(status().isNotFound());
    }

    @Test
    void aStudentAtAnotherSchoolSeesOnlyTheirOwnClasses() throws Exception {
        as(ClassFixtures.OUTSIDER).get("/api/v1/me/classes").andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    }
```

- [ ] **Step 3: Run the suites and the whole build**

```bash
./mvnw test -Dtest='TeacherScopeTest,StudentScopeTest,LeaderScopeTest,AnonymousScopeTest'
./mvnw test
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
cd .. && git add backend
git commit -m "Complete the class authorisation suites for every role

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 11: Gate 1C

- [ ] **Step 1: Run every check**

```bash
make verify
```

Expected: `verify: all checks passed`.

- [ ] **Step 2: Walk the journey by hand against the local stack**

```bash
make db-up
cd backend && ./mvnw -q -DskipTests package && cd ..
scripts/operator.sh create-school --name="Gate Check School" --roll=00010C
scripts/operator.sh create-user --first-name=Gate --last-name=Teacher --username=gate.teacher.c   # note the temporary password
scripts/operator.sh grant-role --username=gate.teacher.c --roll=00010C --role=TEACHER
(cd backend && APP_COOKIE_SECURE=false java -jar target/coursework-backend-*.jar &)
sleep 30
BASE=http://127.0.0.1:8080
T=/tmp/teacher.jar; rm -f $T
curl -s -c $T -b $T "$BASE/api/v1/auth/csrf" -o /dev/null; TT=$(awk '$6=="XSRF-TOKEN"{print $7}' $T)
curl -s -c $T -b $T -H "x-xsrf-token: $TT" -H 'content-type: application/json' \
  -d '{"username":"gate.teacher.c","password":"<temporary>"}' "$BASE/api/v1/auth/login" | grep -o '"schoolId":"[^"]*"'
curl -s -c $T -b $T -H "x-xsrf-token: $TT" -H 'content-type: application/json' \
  -d '{"currentPassword":"<temporary>","newPassword":"gate-check-password"}' -o /dev/null -w '%{http_code}\n' "$BASE/api/v1/auth/password"
curl -s -c $T -b $T -H "x-xsrf-token: $TT" -H 'content-type: application/json' \
  -d '{"schoolId":"<schoolId from above>","subjectCode":"BIOLOGY","name":"6A","yearGroup":6,"academicYear":"2026/27"}' \
  "$BASE/api/v1/classes"
# → 201 with "joinCode":{"code":"XXXXXXXX",...}; note the class id and code

S=/tmp/student.jar; rm -f $S
curl -s "$BASE/api/v1/join/<code>"                               # → className, subjectName, schoolName
curl -s -c $S -b $S "$BASE/api/v1/auth/csrf" -o /dev/null; ST=$(awk '$6=="XSRF-TOKEN"{print $7}' $S)
curl -s -c $S -b $S -H "x-xsrf-token: $ST" -H 'content-type: application/json' \
  -d '{"firstName":"Gate","lastName":"Student","username":"gate.student.c","password":"student-password-1"}' \
  "$BASE/api/v1/join/<code>/accounts"                            # → 201, "status":"PENDING"
curl -s -b $S "$BASE/api/v1/me/classes"                          # → PENDING

curl -s -b $T "$BASE/api/v1/classes/<classId>" | grep -o '"enrolmentId":"[^"]*"'
curl -s -b $T -H "x-xsrf-token: $TT" -X POST "$BASE/api/v1/classes/<classId>/enrolments/<enrolmentId>/approve"   # → APPROVED
curl -s -b $S "$BASE/api/v1/me/classes"                          # → APPROVED

curl -s -b $T -H "x-xsrf-token: $TT" -X POST "$BASE/api/v1/classes/<classId>/students/<studentId>/reset-codes"  # → code
curl -s -H 'content-type: application/json' -H "x-xsrf-token: $ST" -b $S \
  -d '{"username":"gate.student.c","code":"<reset code>","newPassword":"student-password-2"}' \
  -o /dev/null -w '%{http_code}\n' "$BASE/api/v1/auth/password-reset"   # → 204
curl -s -b $S -o /dev/null -w '%{http_code}\n' "$BASE/api/v1/auth/me"   # → 401: the old session ended
pkill -f coursework-backend
```

- [ ] **Step 3: Walk the gate** (roadmap §8.1)

- [ ] `make verify` green
- [ ] Every endpoint in §7 Phase 1 has a scope test: another teacher's class → 404; a student calling teacher endpoints → 404; an enrolment id from another class → 404 (Tasks 4 and 10)
- [ ] Audit rows exist for role grants (sign-up and join), enrolment decisions, reset codes and code rotation (asserted in Tasks 6, 7, 8, 9)

- [ ] **Step 4: Update the docs**

- Root `CLAUDE.md`, backend conventions: "Class-scoped endpoints go through `ClassService.owned(actor, classId)` first; an enrolment id is looked up with `EnrolmentRepository.findInClass`, never by id alone."
- `docs/PILOT-ROADMAP.md` §1: 1C done. §2: add P-1, P-2, P-3 as R18–R20 if Tim confirmed them.
- `docs/HANDOFF.md`: current milestone 1D, how long 1C took, anything half-done. **The 1D plan doesn't exist yet:** write it first (`superpowers:writing-plans`) from roadmap §8.1 1D and §6, against the endpoints this milestone actually produced (`ClassViews` is the response contract the Zod schemas will mirror).

- [ ] **Step 5: Commit and open the PR**

```bash
git add docs CLAUDE.md
git commit -m "Record Gate 1C

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin pilot/1c-classes-and-enrolment
```

Open the PR at `https://github.com/TMcSweeney100/leavingCertBiologyWebsite/compare/<base>...pilot/1c-classes-and-enrolment` (base is `main` once 1A and 1B are merged, else `pilot/1b-accounts-and-sessions`), titled "Pilot 1C: classes and enrolment", body:

```
Classes with join codes, student sign-up and joining, teacher approval and removal, and one-time password reset codes. Every id-taking endpoint has a scope test per role.

Gate 1C (docs/PILOT-ROADMAP.md §8.1) walked locally; results in docs/HANDOFF.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**Don't merge.** Tim reviews and merges.
