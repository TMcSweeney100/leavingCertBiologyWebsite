# Operator reset-password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** when a teacher forgets their password, Tim runs one operator command and reads them a new temporary password; they sign in with it and are made to choose their own.

**Architecture:** backend only, no schema change and no endpoint. A fifth operator command, `reset-password --username=…`, calls a new `OperatorService.resetPassword`. That method reuses three things that already exist: `TemporaryPasswordGenerator` (the 16-character password `create-user` prints), `UserAccountRepository.updatePassword` with `mustChange = true` (so `PasswordChangeRequiredFilter` forces the change on first sign-in), and `AuditLog`. The one new piece of SQL deletes the user's rows from `spring_session`, because an operator process has no session repository to ask.

**Tech Stack:** Java 25, Spring Boot, `JdbcClient`, Postgres 18, Spring Session JDBC. Tests: JUnit 5 with Testcontainers (`PostgresIntegrationTest`), `ApiSession` for the HTTP check.

**Intent:** none written. The ask fits in a paragraph and Tim agreed it in conversation (12 Nov 2026); the decisions are below.

**Branch:** `pilot/operator-reset-password`, from `pilotMain`. Diff base `pilotMain`.

## Global Constraints

- Test first: watch each test fail, then make it pass (root `CLAUDE.md`). `make verify` green before every commit. Docker must be running, or `PostgresIntegrationTest` fails with dozens of errors that have nothing to do with the code.
- The temporary password is printed once and stored only as a hash. It never goes in the audit log, a log line, or a doc.
- Lean tests: three cases that prove the changed behaviour.
- Keep `docs/ARCHITECTURE.md` true in the same commit as the change it describes.
- Never `git add` `draft-list.md`. Add files by path, never `git add -A`: the checkout may hold another session's uncommitted work.

---

## Decisions made

| # | Question | Answer |
|---|---|---|
| O-1 | How does a teacher who forgot their password get back in? | An operator command, run by Tim. No email reset: the app stores no email by design, and adding one means a new personal-data field, a mail provider and reset links to secure. Agreed by Tim, 12 Nov 2026. |
| O-2 | Can teachers create their own accounts? | No. Teacher accounts stay operator-only (roadmap R3). Agreed by Tim, 12 Nov 2026. |
| O-3 | Which accounts can the command reset? | Any account, by username. It is not limited to teachers. The operator is already trusted to create users and grant roles, and a school leader will need the same way back in. Students normally use their teacher's reset code, but this works for them too. **Made while writing the plan; Tim to confirm.** |
| O-4 | What does the teacher get? | A fresh temporary password, with `must_change` on. Same generator and same first-sign-in screen as a new account, so there is nothing new to learn or build. |
| O-5 | What happens to sessions that are already signed in? | They are ended, by deleting the user's rows from `spring_session`. `OtherSessions` can't do it here: it asks Spring's session repository, and an operator process starts without one, so it would silently do nothing on Render while passing in tests. **Made while writing the plan; Tim to confirm.** The alternative was to leave sessions alone and rely on `must_change` locking them out of everything but `me`, `csrf`, `password` and `logout`. That is zero code, but a reset is also what Tim would run if a password leaked, and then "signed out everywhere" should be true the moment the command returns. |
| O-6 | Does it refuse a disabled account? | No. A disabled account can't sign in whatever its password is, so there is nothing to protect and one less rule to test. |
| O-7 | Does it clear the "Too many attempts" lock? | No. The login throttle lives in the web process's memory; a separate operator process can't reach it. The lock lifts by itself after 15 minutes, and the setup guide says so. |
| O-8 | What goes in the audit log? | A new event, `PASSWORD_RESET_BY_OPERATOR`, subject the user, no actor (the operator has no account), no details. `audit_event.event_type` is plain text with no check constraint, so no migration is needed. |

## Concepts in play

| Concept | What it is | Why it fits here | Already used in |
|---|---|---|---|
| Operator command | The app's jar started with `operator` as its first argument runs one command against the database and exits, with no web server. | No network-facing admin surface to secure (roadmap R3). | `identity/adapter/cli/OperatorCommands.java`, `create-user` |
| Forced password change (`must_change`) | A flag on the credential. While it is set, Spring answers `PASSWORD_CHANGE_REQUIRED` to everything except `me`, `csrf`, `password` and `logout`. | The temporary password is read out or pasted in a message, so it must not stay the real one. | `security/PasswordChangeRequiredFilter.java`; `OperatorService.createUser` |
| Server-side sessions in Postgres | Signing in creates a row in `spring_session` whose `principal_name` is the user id. The browser's cookie only names that row. | Deleting the rows signs the user out everywhere at once. With signed tokens instead, there would be nothing to delete. | `db/migration/V3__spring_session.sql`; `security/OtherSessions.java` finds sessions by the same `principal_name` |
| `ObjectProvider` | Spring's way to ask for a bean that may not exist in this process. | It explains O-5: `OtherSessions` uses it, finds no session repository in an operator process, and does nothing. | `security/OtherSessions.java` |
| Audit event in the same transaction | `AuditLog.record` inserts inside the caller's `@Transactional`, so a change and its record commit or roll back together. | A password reset with no trace would be the worst kind of silent change. | `OperatorService.grantRole` |

## File structure

| File | Change | Job |
|---|---|---|
| `backend/src/main/java/ie/coursework/audit/AuditEventType.java` | modify | add `PASSWORD_RESET_BY_OPERATOR` |
| `backend/src/main/java/ie/coursework/identity/adapter/persistence/UserAccountRepository.java` | modify | add `endSessions(UUID userId)` |
| `backend/src/main/java/ie/coursework/identity/application/OperatorService.java` | modify | add `resetPassword(String rawUsername)`; take a `Clock` |
| `backend/src/main/java/ie/coursework/identity/adapter/cli/OperatorCommands.java` | modify | add the `reset-password` command and its usage line |
| `backend/src/test/java/ie/coursework/identity/adapter/cli/OperatorCommandsTest.java` | modify | three new cases |
| `docs/ARCHITECTURE.md` | modify | the command list (§8) and the passwords paragraph (§3) |
| `docs/TEACHER-AND-CLASS-SETUP.md` | modify | drop the "not built yet" note from the forgotten-password section |
| `docs/BACKLOG.md`, `docs/HANDOFF.md` | modify | record it |

---

### Task 0: The branch

- [ ] **Step 1: Branch from `pilotMain`**

The plan and the rewritten setup guide were written on `pilot/student-page-redesign` and are uncommitted. Check the tree first; if another session's work is in it, wait or use a worktree rather than carrying that work across.

```bash
git status --short
git switch -c pilot/operator-reset-password pilotMain
```

- [ ] **Step 2: Commit the planning docs**

```bash
git add docs/superpowers/plans/2026-11-12-operator-reset-password.md docs/TEACHER-AND-CLASS-SETUP.md CLAUDE.md
git commit -m "Plan the operator reset-password command and rewrite the setup guide"
```

### Task 1: The `reset-password` command

**Files:**
- Modify: `backend/src/main/java/ie/coursework/audit/AuditEventType.java`
- Modify: `backend/src/main/java/ie/coursework/identity/adapter/persistence/UserAccountRepository.java`
- Modify: `backend/src/main/java/ie/coursework/identity/application/OperatorService.java`
- Modify: `backend/src/main/java/ie/coursework/identity/adapter/cli/OperatorCommands.java`
- Test: `backend/src/test/java/ie/coursework/identity/adapter/cli/OperatorCommandsTest.java`

- [ ] **Step 1: Write the failing tests**

In `OperatorCommandsTest.java`, add `@AutoConfigureMockMvc` to the class and these imports and fields:

```java
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.support.ApiSession;
import ie.coursework.support.TestAccounts;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
```

```java
@AutoConfigureMockMvc
class OperatorCommandsTest extends PostgresIntegrationTest {

    @Autowired private OperatorCommands commands;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private MockMvc mockMvc;
    @Autowired private TestAccounts accounts;
```

Then add the three cases at the end of the class:

```java
    @Test
    void resettingAPasswordGivesANewTemporaryOneThatMustBeChanged() {
        accounts.user("k.hanlon");

        assertThat(run("operator", "reset-password", "--username=K.Hanlon")).isZero();

        String temporary = printed().replaceAll("(?s).*Temporary password \\(shown once\\): (\\S+).*", "$1");
        String hash = jdbcTemplate.queryForObject(
                "SELECT password_hash FROM password_credential WHERE username = 'k.hanlon'", String.class);
        assertThat(passwordEncoder.matches(temporary, hash)).isTrue();
        assertThat(passwordEncoder.matches(TestAccounts.PASSWORD, hash)).isFalse();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT must_change FROM password_credential WHERE username = 'k.hanlon'", Boolean.class)).isTrue();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_event WHERE event_type = 'PASSWORD_RESET_BY_OPERATOR'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void resettingAPasswordSignsTheUserOutEverywhere() throws Exception {
        accounts.user("k.hanlon");
        ApiSession signedIn = new ApiSession(mockMvc).login("k.hanlon", TestAccounts.PASSWORD);

        run("operator", "reset-password", "--username=k.hanlon");

        signedIn.get("/api/v1/auth/me")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void resettingAnUnknownUsernameFails() {
        assertThat(run("operator", "reset-password", "--username=nobody")).isEqualTo(1);
        assertThat(printed()).contains("error: No user with that username.");
    }
```

- [ ] **Step 2: Run them and watch them fail**

```bash
cd backend && ./mvnw -q test -Dtest=OperatorCommandsTest
```

Expected: the three new tests fail. The first and third get exit code 2 (the unknown command prints usage); the second gets 200 where it expects 401. The eight existing tests pass.

- [ ] **Step 3: Add the audit event**

In `AuditEventType.java`, after `RESET_CODE_REDEEMED,`:

```java
    PASSWORD_RESET_BY_OPERATOR,
```

- [ ] **Step 4: Add `endSessions` to the repository**

In `UserAccountRepository.java`, after `updatePassword`:

```java
    /**
     * Signs the user out everywhere by deleting their Spring Session rows (attributes cascade).
     * For the operator process, which has no session repository; web code uses OtherSessions.
     */
    public void endSessions(UUID userId) {
        jdbc.sql("DELETE FROM spring_session WHERE principal_name = :userId")
                .param("userId", userId.toString())
                .update();
    }
```

- [ ] **Step 5: Add `resetPassword` to the service**

In `OperatorService.java`, add `import java.time.Clock;`, a `private final Clock clock;` field, and `Clock clock` as the last constructor parameter (assign it). A `Clock` bean already exists; `PasswordService` injects the same one. Then add after `createUser`:

```java
    /** For someone who can't sign in. Works for any account; the new password must be changed at first sign-in. */
    @Transactional
    public CreatedAccount resetPassword(String rawUsername) {
        Username username = Username.parse(rawUsername);
        UUID userId = users.findCredential(username)
                .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "No user with that username."))
                .userId();
        String temporaryPassword = temporaryPasswords.next();
        users.updatePassword(userId, passwordEncoder.encode(temporaryPassword), true, clock.instant());
        users.endSessions(userId);
        auditLog.record(null, AuditEventType.PASSWORD_RESET_BY_OPERATOR, "user", userId, Map.of());
        return new CreatedAccount(userId, username.value(), temporaryPassword);
    }
```

`CreatedAccount(userId, username, temporaryPassword)` is reused as it stands: it is exactly "an account and the temporary password to print once".

- [ ] **Step 6: Add the command**

In `OperatorCommands.java`, add a usage line after `create-user`:

```
              operator reset-password --username=<username>
```

a case in the `switch`, after `create-user`:

```java
                case "reset-password" -> resetPassword(args, out);
```

and the method, after `createUser`:

```java
    private int resetPassword(ApplicationArguments args, PrintStream out) {
        CreatedAccount account = operator.resetPassword(required(args, "username"));
        out.println("Reset the password of " + account.username() + ". They are signed out everywhere.");
        out.println("Temporary password (shown once): " + account.temporaryPassword());
        return OK;
    }
```

- [ ] **Step 7: Run the tests and watch them pass**

```bash
cd backend && ./mvnw -q test -Dtest=OperatorCommandsTest
```

Expected: 11 tests, 0 failures.

- [ ] **Step 8: Try it for real, locally**

`OperatorCommandsTest` runs inside a web context, so it can't prove O-5's point that the reset works *without* a session repository. This does. With `make db-up` and `make backend-run` going:

```bash
scripts/operator.sh create-user --first-name=Reset --last-name=Check --username=reset.check
```

Sign in at `http://localhost:3000/login` as `reset.check` with the printed password and stay on the change-password page. Then:

```bash
scripts/operator.sh reset-password --username=reset.check
```

Expected output ends with:

```
Reset the password of reset.check. They are signed out everywhere.
Temporary password (shown once): <16 characters>
```

Reload the browser tab: it goes to `/login`. The first password no longer works; the second does, and the change-password page appears.

- [ ] **Step 9: Update `docs/ARCHITECTURE.md`**

In §3, on the "Temporary passwords" bullet, append: `` `operator reset-password` issues a new one for an existing account, sets `must_change` again and deletes the user's `spring_session` rows directly (`UserAccountRepository.endSessions`), because the operator process has no session repository for `OtherSessions` to use. ``

In §8's operator command block, after the `create-user` line:

```
scripts/operator.sh reset-password --username=…                               # new temporary password; signs them out everywhere
```

- [ ] **Step 10: Verify and commit**

```bash
make verify
```

Expected: green.

```bash
git add backend/src/main/java/ie/coursework/audit/AuditEventType.java backend/src/main/java/ie/coursework/identity/adapter/persistence/UserAccountRepository.java backend/src/main/java/ie/coursework/identity/application/OperatorService.java backend/src/main/java/ie/coursework/identity/adapter/cli/OperatorCommands.java backend/src/test/java/ie/coursework/identity/adapter/cli/OperatorCommandsTest.java docs/ARCHITECTURE.md
git commit -m "Add operator reset-password: a new temporary password that signs the user out everywhere"
```

### Task 2: The docs

**Files:**
- Modify: `docs/TEACHER-AND-CLASS-SETUP.md`
- Modify: `docs/BACKLOG.md`
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1: Take the "not built yet" note out of the setup guide**

In `docs/TEACHER-AND-CLASS-SETUP.md`, under **A teacher forgot their password**, delete the whole blockquote that starts `> **Not built yet.**`. Check the sample output in that section against what Step 8 of Task 1 really printed, and correct it if it differs.

- [ ] **Step 2: Record it in the backlog**

In `docs/BACKLOG.md`, add a row to **Up next**:

```
| — | _operator-reset-password_ | `operator reset-password --username=…`: a new temporary password for a teacher who forgot theirs, which must be changed at first sign-in and signs them out everywhere | built on `pilot/operator-reset-password`, not merged (<date>). Still to do: `/self-review` in a fresh session, `docs/changes/operator-reset-password.md`, and the PR into `pilotMain`. After the merge and the Render deploy, the command works on the live site. Plan: `docs/superpowers/plans/2026-11-12-operator-reset-password.md` |
```

Replace `<date>` with the day the branch was finished.

- [ ] **Step 3: Record it in the handoff**

At the top of `docs/HANDOFF.md`, under the standing rule, add a section `## Operator reset-password (<date>, branch pilot/operator-reset-password)` with: what was built (one sentence), the `make verify` result with its real test counts, the result of Task 1 Step 8, what is still to do (self-review, changes doc, PR, then run it once on Render after the deploy), and whether Tim confirmed O-3 and O-5.

- [ ] **Step 4: Commit**

```bash
git add docs/TEACHER-AND-CLASS-SETUP.md docs/BACKLOG.md docs/HANDOFF.md
git commit -m "Record the operator reset-password command in the setup guide, the backlog and the handoff"
```

## Built differently from the plan (12 Nov 2026)

- **Task 1 Step 8 is a test, not a hand check.** `OperatorProcessTest.aPasswordResetEndsSessionsWithoutAWebServer` starts a real operator process (no web server, no session repository), with a `spring_session` row for the user already in place, and checks the row is gone and `must_change` is set. It fails when `users.endSessions(userId)` is taken out. So there are four new tests, not three. The browser walk-through in Step 8 was not done.
- **Built in a worktree**, `.worktrees/pilot-operator-reset-password`, because another session had uncommitted Progress work in the main checkout.

## Not in this plan

- **Email or self-service reset for teachers** (O-1).
- **A school leader issuing reset codes to teachers.** The next step if Tim stops being the only operator.
- **`disable-user` and `delete-user` commands.** `app_user.disabled_at` exists and sign-in honours it, but nothing sets it outside tests.
- **Clearing the login throttle from the operator** (O-7).
- **The Render upgrades** (a paid web service for Shell, a paid database that doesn't expire). Tim does those in the dashboard; the setup guide's "Before the first real user" list covers them.
