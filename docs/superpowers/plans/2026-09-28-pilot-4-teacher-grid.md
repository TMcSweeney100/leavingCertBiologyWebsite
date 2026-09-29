# Pilot 4 — The Teacher Grid and Sign-offs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher opens a class's Progress tab and sees who is behind, grouped into bands, furthest behind first; signs checkpoints off, undoes a stray click and revokes a mistake, from the grid and from one student's page; the student sees the sign-off on their component page (Gate P4).

**Architecture:** `V12` adds `checkpoint_signoff`, append-only by trigger, with a partial unique index allowing one live sign-off per student and checkpoint. Storage (`SignoffRepository`) lives in `components`, because the student view reads it. A new feature package `ie.coursework.progress` holds the "behind" ordering, `ProgressService` and `ProgressController`, and reads `components` and `log` without either reading it. Three endpoints, each starting with `ComponentService.requireOwned`. The frontend is built straight to design pack D-7 (direction 1b "Bands"). The grid is one client component that keeps its row order until the teacher presses Re-sort. A shared hook drives sign off, undo and revoke on both teacher pages, and a cookie makes Hide names right on first paint.

**Tech Stack:** Spring Boot 4.1, Jackson 3 (`tools.jackson`), `JdbcClient`, Postgres 18 (partial unique index, `ON CONFLICT … WHERE`, plpgsql trigger), `java.text.Collator`; Next.js 15.3.9 (server components, `cookies()`, `searchParams`), Zod 4, Vitest + Testing Library, `node:test`, Playwright + axe; Node `fetch` for the seed script.

**Spec:** `docs/superpowers/specs/2026-09-28-pilot-4-teacher-grid-design.md` (decisions P4-1 to P4-22). **Design pack:** `docs/design/pilot/D-7-progress-grid/` (`NOTES.md` has every string; frames in `design/`). **Roadmap:** §6.2, §7 Phase 4, §8.4 and Gate P4. **Design:** §6.5, §7.3, §8.4.

---

## Global Constraints

- **Test first, every task** (CLAUDE.md): write the test, run it, watch it fail for the reason you expect, then write the code. A test that passes first time is testing nothing.
- **404, never 403.** Every new endpoint starts with `ComponentService.requireOwned(actor, componentId)`; a student id is checked `APPROVED` *within the component's class*; a checkpoint id is looked up *within the brief's template version*. Any failure is `NOT_FOUND`.
- **Sign-offs are never deleted.** Undo and Revoke both set `revoked_by_user_id`/`revoked_at`; the database trigger refuses anything else.
- **Never invent or reword checkpoint text.** It comes from `template_checkpoint.text`. Short column headers are *cuts* of that text, and a test proves each one is a prefix of its checkpoint.
- **Specs query by role and accessible name.** The accessible names in P4-18 are the contract.
- **Tokens only.** No raw hex in components; D-7's values go into `globals.css` as `--app-*` (Task 13).
- **Bind timestamps with `Timestamps.utc(instant)`; read `OffsetDateTime`** (CLAUDE.md).
- **`make verify` green before every task commit.** One task, one commit; the message says the behaviour.
- **Branch:** `pilot/4-teacher-grid` from `pilotMain`. Don't push; Tim pushes and merges.
- **Never commit** `docs/newDevelopement/subjectDocs/Tim_Mc_Sweeney_CV_September_2026.pdf`.

## Decisions made

The spec's P4-1 to P4-22 hold; read its table first. These were decided while writing this plan:

| # | Question | Decision |
|---|---|---|
| P4-23 | How is a checkpoint's short column header made? | A map in `lib/app/progress.ts` from each checkpoint's full text to D-7's short form ("Plan discussed", "Experiment carried out"…). A `node:test` asserts every short form is a **prefix** of its full text: cut, never reworded. An unknown text (a future template) falls back to its first three words. |
| P4-24 | How is a stage keyed in `?stage=`? | By its ordinal, except a stage with no label (Business "Compilation of the final report"), which is `R` and is labelled "Report" (D-7, D-3). The grid response gains each stage's `ordinal` for this. |
| P4-25 | What does the one-student endpoint list? | Only stages that have a checkpoint (six for a science, six for Business). The student page draws one row per checkpoint, so a stage without one has nothing to show. |
| P4-26 | When does a cell say "Signed off today" with **Undo**? | Only for sign-offs **this page visit** made (D-7: "cell signed off in this session"). A sign-off made earlier today in another tab shows its date and **Revoke**. Re-sort or reload clears Undo (P4-17). |
| P4-27 | Two layouts in the DOM: how do specs tell them apart? | The laptop layout is the `table` (named by its caption); the phone layout is a `region` named "Students". Specs use `within(...)` on one of them. Playwright only sees the visible one. |
| P4-28 | Where does the blur rule live? | One rule in `globals.css` inside `@layer components`: `.app-hide-names [data-private] { filter: blur(var(--app-hide-blur)); }`. Components mark private text with `data-private`; the grid wrapper toggles the class. |
| P4-29 | A failed Undo or Revoke: what does the alert say? | D-7 only words a failed sign-off. The same sentence with the action's verb: "Couldn't undo the sign-off of …" / "Couldn't revoke the sign-off of …", then "Nothing changed. Check your connection and try again." |

## Concepts in play

| Concept | What it is | Why here | Already used in |
|---|---|---|---|
| Foreign key (`REFERENCES`) | The column's value must be an existing row's id in the other table | A sign-off can't point at a student, component or checkpoint that doesn't exist, and those rows can't be deleted from under it | `V9__item_ticks.sql` |
| Partial unique index | A unique index over only the rows matching a `WHERE` | "At most one *live* sign-off per student and checkpoint", while any number of revoked ones stay | New here (roadmap §8.4 names it) |
| `INSERT … ON CONFLICT … WHERE … DO NOTHING RETURNING id` | Postgres skips the insert when the partial index would be violated, and returns no row | A double-click or two tabs can't create two sign-offs or an error; an empty result means "already signed off, write no audit" | `EnrolmentRepository.request` |
| Append-only trigger | A `BEFORE UPDATE OR DELETE` trigger that raises `check_violation` | "Sign-offs are never deleted" becomes a database rule | `V11__log.sql` |
| Idempotent `PUT` | Sending the same request twice leaves the same state | Sign off / Undo / Revoke are one endpoint with `{signedOff}` | `PUT …/teacher-items/{itemId}/tick` |
| Fixed number of queries | Load each kind of row once, then join in Java | A 30 × 7 grid stays at five queries, not one per student (Gate P4's timing) | `LogService.teacherView` |
| `REPEATABLE_READ` read-only transaction | All queries in the method see one snapshot | The grid's five queries can't disagree mid-sign-off | `LogService.teacherView` |
| `Collator` | Locale-aware string comparison | Surnames sort as an Irish reader expects ("Ó Briain" near "O'Brien"), matching D-7's `localeCompare('en-IE')` | New here |
| Dublin dates on the server | `DublinDate.today(clock)`, `DublinDate.of(instant)` | "Due" flips at Irish midnight, not UTC; the page never uses the browser clock | `ComponentService.studentView` |
| Server-readable preference (cookie) | A setting the server reads on the request | Hide names must be right on the first paint, or a projector shows every name for a moment | New here (P4-15) |
| URL as state | `?stage=3` in the address | Back, refresh and sharing keep the view (UI-STANDARDS §9) | `?calendar=on|off` in `TimelineView` |
| Stable order with a manual re-sort | Client keeps the first-rendered order; refreshed data is laid out in it | Rows never move under the pointer (P4-11) | New here |
| Live region | An element with `aria-live="polite"` whose text changes | Screen readers hear "Signed off: … for Aoife Byrne." | `ItemTick`, `LogEntryForm` |
| Both layouts rendered, CSS chooses | Server renders phone and laptop markup; `lg:hidden` / `hidden lg:block` pick one | The default stage differs by width and the server can't know the width (no hydration mismatch) | `YearView` (pack D-5) |

## File structure

**Backend**

| File | Responsibility |
|---|---|
| `backend/src/main/resources/db/migration/V12__checkpoint_signoffs.sql` | Create: table, partial unique index, guard trigger |
| `backend/src/main/java/ie/coursework/audit/AuditEventType.java` | Modify: two events |
| `backend/src/main/java/ie/coursework/components/domain/CheckpointState.java` | Modify: `SIGNED_OFF`, three-argument `at` |
| `backend/src/main/java/ie/coursework/components/domain/TemplateCheckpoint.java` | Modify: add `id` |
| `backend/src/main/java/ie/coursework/components/domain/Signoff.java` | Create: one row of `checkpoint_signoff` |
| `backend/src/main/java/ie/coursework/components/adapter/persistence/TemplateRepository.java` | Modify: read `id`; `checkpointInVersion` |
| `backend/src/main/java/ie/coursework/components/adapter/persistence/SignoffRepository.java` | Create: live, forStudent, signOff, revoke |
| `backend/src/main/java/ie/coursework/components/application/ComponentViews.java` | Modify: `CheckpointView` gains `signedOffOn` |
| `backend/src/main/java/ie/coursework/components/application/ComponentService.java` | Modify: student view reads sign-offs |
| `backend/src/main/java/ie/coursework/log/adapter/persistence/LogRepository.java` | Modify: `lastActivity` |
| `backend/src/main/java/ie/coursework/progress/domain/Standing.java` | Create: the grid's sort order, `behindBy`, `daysSince` |
| `backend/src/main/java/ie/coursework/progress/application/ProgressViews.java` | Create: response records |
| `backend/src/main/java/ie/coursework/progress/application/ProgressService.java` | Create: grid, one student, set sign-off |
| `backend/src/main/java/ie/coursework/progress/adapter/web/ProgressController.java` | Create: three endpoints |
| `backend/src/main/java/ie/coursework/progress/adapter/web/SignoffRequest.java` | Create: `{ signedOff }` |
| Tests | `components/adapter/persistence/SignoffSchemaTest`, `…/SignoffRepositoryTest`, `components/domain/CheckpointStateTest` (modify), `progress/domain/StandingTest`, `progress/domain/DueBoundaryTest`, `log/adapter/persistence/LogLastActivityTest`, `progress/adapter/web/ProgressGridTest`, `…/StudentCheckpointsTest`, `…/SignoffTest`, `progress/authz/SignoffScopeTest`, `components/adapter/web/StudentComponentViewTest` (modify), `components/application/ComponentServiceOwnedTest` (modify), `support/ComponentFixtures` (modify) |

**Frontend**

| File | Responsibility |
|---|---|
| `frontend/app/globals.css` | Modify: D-7 tokens, `.app-hide-names` rule |
| `frontend/lib/api/schemas.ts` | Modify: `SIGNED_OFF`, `signedOffOn`; grid, cell and student-checkpoints schemas |
| `frontend/lib/app/progress.ts` (+ `.test.ts`) | Create: pure helpers (keys, labels, short headers, bands, copy, stable order) |
| `frontend/lib/app/log.ts` (+ test) | Modify: the honest visibility line (P4-2) |
| `frontend/components/app/log-entry-form.tsx` (+ spec) | Modify: pass the kind to the line |
| `frontend/components/app/class-header.tsx` (+ spec) | Modify: Progress is a live tab |
| `frontend/components/app/use-signoffs.ts` | Create: the client hook for sign off / undo / revoke |
| `frontend/components/app/signoff-parts.tsx` (+ spec) | Create: `CheckpointCell`, `RevokeStrip`, `SignoffAlert` |
| `frontend/components/app/stage-picker.tsx` (+ spec) | Create: the checkpoint-view links, laptop and phone |
| `frontend/components/app/progress-grid.tsx` (+ spec) | Create: summary, Hide names, Re-sort, table, phone list |
| `frontend/components/app/student-checkpoints.tsx` (+ spec) | Create: the student page's Checkpoints section |
| `frontend/components/app/stage-card.tsx` (+ spec) | Modify: the signed-off state |
| `frontend/app/(app)/teach/classes/[id]/progress/page.tsx` | Create: the Progress page |
| `frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx` | Modify: Checkpoints above the log, back links, honest subtitle |
| `frontend/e2e/phase4.e2e.ts` | Create: Gate P4's journey |
| `scripts/seed-grid.mjs` | Create: the 30-student timing fixture |

---

## Task 1: Branch, the design pack, and the roadmap's page rows

**Files:**
- Modify: `docs/PILOT-ROADMAP.md` (§6.2 Progress and student-view rows; §6.3 D-7 row)
- Add to git: `docs/design/pilot/D-7-progress-grid/`, `docs/design/prompts/D-7-progress-grid.md`, `docs/design/prompts/README.md`, `docs/design/prompts/D-6-log.md` (Tim's edit), the spec, this plan

Roadmap §6.3 rule 4: a design that changes behaviour updates §6.2 before it's built (P4-21).

- [ ] **Step 1: Branch.**

```bash
git checkout pilotMain
git checkout -b pilot/4-teacher-grid
```

- [ ] **Step 2: Rewrite the Progress row in `docs/PILOT-ROADMAP.md` §6.2** (the line starting `` | `/teach/classes/[id]/progress` | 4A ``) to:

```markdown
| `/teach/classes/[id]/progress` | 4A, pack D-7 | An answer line ("14 of 30 students are behind"); a stage picker (All stages, or one checkpoint, in the URL as `?stage=all\|1…6\|R`; default All at 1140, the latest due stage at 390); students grouped into bands by how many due checkpoints they're behind, furthest behind first, then longest since their last log entry, then surname; per student: behind by N, each checkpoint's state (Not due yet / Due / Signed off with its date) and last log entry. A table at 1140, a list per band at 390. | Sign off (one click) · Undo (a sign-off made this visit, until Re-sort or reload) · Revoke (confirmed in place) · Re-sort (N changes) · Hide names (blurs names, dates, log lines and counts; remembered per browser) | No component; no stage dates; nothing due yet; no approved students; everyone up to date; a failed sign-off (alert under the row, Try again) |
```

- [ ] **Step 3: Rewrite the student-view row** (`` | `/teach/classes/[id]/students/[studentId]` | 3C / 4B ``) to:

```markdown
| `/teach/classes/[id]/students/[studentId]` | 3C / 4B, packs D-6 and D-7 | Back links to the class's Progress and Students tabs; **Checkpoints** first (behind by N; each checkpoint's stage, date, state and full text; each revoked sign-off as "Signed off on …, revoked on … by …"); then their log in the teacher projection (hidden entries show kind and dates only) | Sign off · Undo · Revoke (confirmed in place) | Hidden entries; no entries; nothing signed off yet |
```

- [ ] **Step 4: Mark D-7 arrived in §6.3's pack table**: change the D-7 row's "Needed by" cell from `Phase 4` to `Phase 4 — arrived 28 Sep 2026, docs/design/pilot/D-7-progress-grid/ (direction 1b "Bands")`.

- [ ] **Step 5: Commit.**

```bash
git add docs/PILOT-ROADMAP.md docs/design/pilot/D-7-progress-grid docs/design/prompts/D-7-progress-grid.md \
  docs/design/prompts/README.md docs/design/prompts/D-6-log.md \
  docs/superpowers/specs/2026-09-28-pilot-4-teacher-grid-design.md docs/superpowers/plans/2026-09-28-pilot-4-teacher-grid.md
git commit -m "Add the D-7 progress grid pack, the Phase 4 spec and plan, and D-7's page rows in the roadmap"
```

---

## Task 2: Tell the student everything a teacher sees of a hidden entry (P4-2)

**Files:**
- Modify: `frontend/lib/app/log.ts:53-58`, `frontend/lib/app/log.test.ts:12-14`
- Modify: `frontend/components/app/log-entry-form.tsx:205`, `frontend/components/app/log-entry-form.spec.tsx:39-40`
- Modify: `frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx:47`

A hidden entry shows the teacher its kind, its date, how many times it was edited and when, and when it was hidden (`teacher-log.tsx`). The student's line promised only the date.

- [ ] **Step 1: Change the test** in `lib/app/log.test.ts` (replace the existing hidden-line assertion):

```ts
test("the visibility line says who can read the entry, in words (FR-24e)", () => {
  assert.equal(visibilityLine(true, "2027-03-03", "NOTE"), "Your teacher can read this.");
  assert.equal(
    visibilityLine(false, "2027-03-03", "NOTE"),
    "Only you can read this. Your teacher sees that you made a note on 3 March, how many times you edit it and when, and the date you hid it, but never what it says.",
  );
  assert.match(visibilityLine(false, "2027-03-03", "SOURCE"), /made a source on 3 March/);
  assert.match(visibilityLine(false, "2027-03-03", "AI_USE"), /made an AI use entry on 3 March/);
});
```

- [ ] **Step 2: Run** `cd frontend && node --test lib/app/log.test.ts` → FAIL (the old sentence).

- [ ] **Step 3: Implement** in `lib/app/log.ts`:

```ts
const HIDDEN_NOUN: Record<EntryKind, string> = { NOTE: "a note", SOURCE: "a source", AI_USE: "an AI use entry" };

/** FR-24e: said in words at the moment of writing, and everything the teacher sees of a hidden entry (plan P4-2). */
export function visibilityLine(visible: boolean, today: string, kind: EntryKind): string {
  return visible
    ? "Your teacher can read this."
    : `Only you can read this. Your teacher sees that you made ${HIDDEN_NOUN[kind]} on ${dayMonth(today)}, how many times you edit it and when, and the date you hid it, but never what it says.`;
}
```

- [ ] **Step 4: Update the caller** in `components/app/log-entry-form.tsx:205`: pass `kind` as the third argument to both `visibilityLine(...)` calls.

- [ ] **Step 5: Update the form spec** (`log-entry-form.spec.tsx:40`):

```ts
    expect(screen.getByText(/Your teacher sees that you made a note on 3 March, how many times you edit it and when, and the date you hid it, but never what it says\./)).toBeInTheDocument();
```

- [ ] **Step 6: Correct the teacher page's subtitle** (`students/[studentId]/page.tsx:47`) to what the page shows:

```tsx
          <p className="mt-1.5 text-app-base text-app-grey">{"You read the entries they share. Any they keep private show only the kind, the dates and how many times they were edited."}</p>
```

- [ ] **Step 7: Run** `node --test lib/app/log.test.ts && npx vitest run components/app/log-entry-form.spec.tsx && npx tsc --noEmit` → PASS. Then `grep -rn "sees that you made an entry" frontend/e2e` and update any e2e assertion to the new sentence.

- [ ] **Step 8: Commit.** `git commit -am "Tell the student everything a teacher sees of an entry they hide"`

---

## Task 3: `V12` — sign-offs that are never deleted

**Files:**
- Create: `backend/src/main/resources/db/migration/V12__checkpoint_signoffs.sql`
- Modify: `backend/src/test/java/ie/coursework/support/ComponentFixtures.java` (add `checkpointId`)
- Test: `backend/src/test/java/ie/coursework/components/adapter/persistence/SignoffSchemaTest.java`

- [ ] **Step 1: Add the fixture helper** to `ComponentFixtures` (after `stageId`):

```java
    /** The checkpoint in a brief's stage (each stage has at most one, design §7.3). */
    public UUID checkpointId(String secCode, int stageOrdinal) {
        return jdbc.queryForObject("""
                SELECT c.id FROM template_checkpoint c
                JOIN template_stage s ON s.id = c.stage_id
                JOIN annual_brief b ON b.template_version_id = s.version_id
                WHERE b.sec_code = ? AND s.ordinal = ?
                """, UUID.class, secCode, stageOrdinal);
    }
```

- [ ] **Step 2: Write the failing test** `SignoffSchemaTest.java`:

```java
package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;

/** Design §6.5: sign-offs are never deleted; undoing one records who revoked it and when. */
class SignoffSchemaTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private UUID component;
    private UUID checkpoint;
    private UUID signoff;

    @BeforeEach
    void oneLiveSignoff() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        checkpoint = components.checkpointId(BIO, 1);
        signoff = insert();
    }

    private UUID insert() {
        return jdbcTemplate.queryForObject("""
                INSERT INTO checkpoint_signoff (instance_id, student_user_id, checkpoint_id, signed_off_by_user_id, signed_off_at)
                VALUES (?, ?, ?, ?, now()) RETURNING id
                """, UUID.class, component, world.approvedStudent(), checkpoint, world.teacher1());
    }

    private void revoke(UUID id) {
        jdbcTemplate.update("UPDATE checkpoint_signoff SET revoked_by_user_id = ?, revoked_at = now() WHERE id = ?",
                world.teacher1(), id);
    }

    @Test
    void aSecondLiveSignoffForTheSameStudentAndCheckpointIsRefused() {
        assertThatThrownBy(this::insert).isInstanceOf(DuplicateKeyException.class)
                .hasMessageContaining("checkpoint_signoff_current");
    }

    @Test
    void aNewSignoffAfterARevokeIsAllowedAndBothRowsStay() {
        revoke(signoff);
        insert();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM checkpoint_signoff", Integer.class)).isEqualTo(2);
    }

    @Test
    void aSignoffIsNeverDeleted() {
        assertRefused("DELETE FROM checkpoint_signoff WHERE id = ?");
    }

    @Test
    void aSignoffIsRevokedOnceAndNeverUnrevoked() {
        revoke(signoff);
        assertRefused("UPDATE checkpoint_signoff SET revoked_at = now() WHERE id = ?");
        assertRefused("UPDATE checkpoint_signoff SET revoked_by_user_id = NULL, revoked_at = NULL WHERE id = ?");
    }

    @Test
    void nothingButTheRevokeColumnsMayChange() {
        assertRefused("UPDATE checkpoint_signoff SET signed_off_at = signed_off_at - interval '3 days' WHERE id = ?");
        assertRefused("UPDATE checkpoint_signoff SET student_user_id = signed_off_by_user_id WHERE id = ?");
    }

    @Test
    void revokedByAndRevokedAtAreSetTogether() {
        assertThatThrownBy(() -> jdbcTemplate.update("UPDATE checkpoint_signoff SET revoked_at = now() WHERE id = ?", signoff))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private void assertRefused(String sql) {
        assertThatThrownBy(() -> jdbcTemplate.update(sql, signoff))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("checkpoint_signoff");
    }
}
```

- [ ] **Step 3: Run** `cd backend && ./mvnw test -Dtest=SignoffSchemaTest` → FAIL (`relation "checkpoint_signoff" does not exist`).

- [ ] **Step 4: Write the migration** `V12__checkpoint_signoffs.sql`:

```sql
-- Phase 4 (design §6.5): the teacher's sign-off of a checkpoint for one student. Keyed on student and component,
-- not enrolment (review issue #3), like item_tick and log_entry. Never deleted: undoing or revoking one sets
-- revoked_by_user_id and revoked_at, once; signing off again adds a new row. Erasure goes through the school
-- (roadmap R8), whose procedure will need to lift this trigger deliberately, as for the log.

CREATE TABLE checkpoint_signoff (
    id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id           uuid        NOT NULL REFERENCES component_instance (id),
    student_user_id       uuid        NOT NULL REFERENCES app_user (id),
    checkpoint_id         uuid        NOT NULL REFERENCES template_checkpoint (id),
    signed_off_by_user_id uuid        NOT NULL REFERENCES app_user (id),
    signed_off_at         timestamptz NOT NULL,
    revoked_by_user_id    uuid        REFERENCES app_user (id),
    revoked_at            timestamptz,
    CONSTRAINT checkpoint_signoff_revoked_together CHECK ((revoked_by_user_id IS NULL) = (revoked_at IS NULL))
);

-- At most one live sign-off per student and checkpoint in a component; revoked rows are unlimited.
-- SignoffRepository.signOff's ON CONFLICT names exactly these columns and this predicate.
CREATE UNIQUE INDEX checkpoint_signoff_current
    ON checkpoint_signoff (instance_id, student_user_id, checkpoint_id) WHERE revoked_at IS NULL;

CREATE FUNCTION checkpoint_signoff_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE'
       OR OLD.revoked_at IS NOT NULL
       OR NEW.revoked_at IS NULL
       OR NEW.id <> OLD.id OR NEW.instance_id <> OLD.instance_id
       OR NEW.student_user_id <> OLD.student_user_id OR NEW.checkpoint_id <> OLD.checkpoint_id
       OR NEW.signed_off_by_user_id <> OLD.signed_off_by_user_id OR NEW.signed_off_at <> OLD.signed_off_at THEN
        RAISE EXCEPTION 'checkpoint_signoff is never deleted: only a live row''s revoked_by_user_id and revoked_at may be set, once'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER checkpoint_signoff_guard BEFORE UPDATE OR DELETE ON checkpoint_signoff
    FOR EACH ROW EXECUTE FUNCTION checkpoint_signoff_guard();
```

The `revoked_at = now()` without `revoked_by` case in `revokedByAndRevokedAtAreSetTogether` is refused by the `CHECK` constraint. The trigger passes it through, because `NEW.revoked_at` is set; the constraint then refuses it. Its message names `checkpoint_signoff_revoked_together`, which `DataIntegrityViolationException` carries.

- [ ] **Step 5: Run** `./mvnw test -Dtest='SignoffSchemaTest,ContentResetPolicyTest'` → PASS. `checkpoint_signoff` is an app table, so it's truncated before each test; it must **not** be added to `PRESERVED_TABLES`.

- [ ] **Step 6: Commit.** `git add -A backend && git commit -m "Store checkpoint sign-offs that are never deleted, one live per student and checkpoint"`

---

## Task 4: A signed-off checkpoint is never due

**Files:**
- Modify: `backend/src/main/java/ie/coursework/components/domain/CheckpointState.java`
- Modify: `backend/src/main/java/ie/coursework/components/application/ComponentService.java:150`
- Test: `backend/src/test/java/ie/coursework/components/domain/CheckpointStateTest.java`

- [ ] **Step 1: Rewrite the test** (`CheckpointStateTest.java`):

```java
package ie.coursework.components.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class CheckpointStateTest {

    private static final LocalDate STAGE_DATE = LocalDate.of(2026, 9, 25);

    @Test
    void notDueOnOrBeforeTheStagesDate() {
        assertThat(CheckpointState.at(STAGE_DATE, STAGE_DATE.minusDays(3), false)).isEqualTo(CheckpointState.NOT_DUE);
        assertThat(CheckpointState.at(STAGE_DATE, STAGE_DATE, false)).isEqualTo(CheckpointState.NOT_DUE);
    }

    @Test
    void dueFromTheDayAfter() {
        assertThat(CheckpointState.at(STAGE_DATE, STAGE_DATE.plusDays(1), false)).isEqualTo(CheckpointState.DUE);
    }

    @Test
    void neverDueWithoutADate() {
        assertThat(CheckpointState.at(null, LocalDate.of(2030, 1, 1), false)).isEqualTo(CheckpointState.NOT_DUE);
    }

    @Test
    void signedOffWheneverItWasSignedOffEarlyLateOrUndated() {
        assertThat(CheckpointState.at(STAGE_DATE, STAGE_DATE.minusDays(10), true)).isEqualTo(CheckpointState.SIGNED_OFF);
        assertThat(CheckpointState.at(STAGE_DATE, STAGE_DATE.plusDays(10), true)).isEqualTo(CheckpointState.SIGNED_OFF);
        assertThat(CheckpointState.at(null, STAGE_DATE, true)).isEqualTo(CheckpointState.SIGNED_OFF);
    }
}
```

- [ ] **Step 2: Run** `./mvnw test -Dtest=CheckpointStateTest` → FAIL to compile (no three-argument `at`, no `SIGNED_OFF`).

- [ ] **Step 3: Implement** `CheckpointState.java`:

```java
package ie.coursework.components.domain;

import java.time.LocalDate;

/**
 * Design §8.4: a checkpoint is due once its stage's date has passed. A sign-off settles it whenever it was
 * given, so a student signed off early is never counted as behind (plan P4-5).
 */
public enum CheckpointState {
    NOT_DUE,
    DUE,
    SIGNED_OFF;

    public static CheckpointState at(LocalDate stageDate, LocalDate today, boolean signedOff) {
        if (signedOff) {
            return SIGNED_OFF;
        }
        return stageDate != null && stageDate.isBefore(today) ? DUE : NOT_DUE;
    }
}
```

- [ ] **Step 4: Keep the student view compiling.** In `ComponentService.java:150` change `CheckpointState.at(due, today)` to `CheckpointState.at(due, today, false)`. Task 12 passes the real value.

- [ ] **Step 5: Run** `./mvnw test -Dtest='CheckpointStateTest,StudentComponentViewTest'` → PASS.

- [ ] **Step 6: Commit.** `git commit -am "Count a signed-off checkpoint as settled, whenever it was signed off"`

---

## Task 5: The grid's order, "behind by" and days since the last entry

**Files:**
- Create: `backend/src/main/java/ie/coursework/progress/domain/Standing.java`
- Test: `backend/src/test/java/ie/coursework/progress/domain/StandingTest.java`, `backend/src/test/java/ie/coursework/progress/domain/DueBoundaryTest.java`

- [ ] **Step 1: Write the failing tests.** `StandingTest.java`:

```java
package ie.coursework.progress.domain;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.components.domain.CheckpointState;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class StandingTest {

    @Test
    void behindByCountsOnlyDueCheckpoints() {
        assertThat(Standing.behindBy(List.of(CheckpointState.DUE, CheckpointState.SIGNED_OFF, CheckpointState.NOT_DUE,
                CheckpointState.DUE))).isEqualTo(2);
        assertThat(Standing.behindBy(List.of())).isZero();
    }

    @Test
    void daysSinceIsCountedInDublinDaysAndNullWithoutActivity() {
        LocalDate today = LocalDate.of(2026, 10, 21);
        // 23:30 UTC on 20 Oct is 00:30 on 21 Oct in Dublin (summer time): today, not yesterday.
        assertThat(Standing.daysSince(Instant.parse("2026-10-20T23:30:00Z"), today)).isZero();
        assertThat(Standing.daysSince(Instant.parse("2026-10-20T22:30:00Z"), today)).isEqualTo(1);
        assertThat(Standing.daysSince(Instant.parse("2026-10-09T10:00:00Z"), today)).isEqualTo(12);
        assertThat(Standing.daysSince(null, today)).isNull();
    }

    @Test
    void furthestBehindFirstThenLongestSinceTheLastEntryWithNoEntriesLongestThenSurnameThenFirstName() {
        List<Standing> rows = new ArrayList<>(List.of(
                new Standing(1, 3, "Byrne", "Aoife"),
                new Standing(2, 1, "Walsh", "Cian"),
                new Standing(1, null, "Kelly", "Emma"),
                new Standing(1, 3, "Brennan", "Seán"),
                new Standing(0, 40, "Ahern", "Niamh"),
                new Standing(1, 3, "Brennan", "Aisling")));
        rows.sort(Standing.ORDER);
        assertThat(rows).extracting(Standing::firstName)
                .containsExactly("Cian", "Emma", "Aisling", "Seán", "Aoife", "Niamh");
    }

    @Test
    void surnamesCompareAsAnIrishReaderExpectsNotByCodePoint() {
        List<Standing> rows = new ArrayList<>(List.of(new Standing(0, 0, "Ó Briain", "A"), new Standing(0, 0, "Obama", "B"),
                new Standing(0, 0, "O'Brien", "C")));
        rows.sort(Standing.ORDER);
        // Code-point order would put "Ó Briain" last (Ó is U+00D3); the collator keeps it with the other O names.
        assertThat(rows.getLast().lastName()).isNotEqualTo("Ó Briain");
        assertThat(rows).extracting(Standing::lastName).containsExactly("Ó Briain", "O'Brien", "Obama");
    }
}
```

`DueBoundaryTest.java`:

```java
package ie.coursework.progress.domain;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.components.domain.CheckpointState;
import ie.coursework.components.domain.DublinDate;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

/** Roadmap §8.4: "due" turns over at Irish midnight, not UTC midnight. */
class DueBoundaryTest {

    private static CheckpointState at(String utc, LocalDate stageDate) {
        LocalDate today = DublinDate.today(Clock.fixed(Instant.parse(utc), ZoneOffset.UTC));
        return CheckpointState.at(stageDate, today, false);
    }

    @Test
    void inSummerTimeAStageBecomesDueAtIrishMidnightAnHourBeforeUtc() {
        LocalDate stage = LocalDate.of(2026, 10, 20);
        assertThat(at("2026-10-20T22:59:00Z", stage)).isEqualTo(CheckpointState.NOT_DUE); // 23:59 Dublin, 20 Oct
        assertThat(at("2026-10-20T23:30:00Z", stage)).isEqualTo(CheckpointState.DUE);     // 00:30 Dublin, 21 Oct
    }

    @Test
    void inWinterTimeDublinIsUtc() {
        LocalDate stage = LocalDate.of(2026, 11, 20);
        assertThat(at("2026-11-20T23:30:00Z", stage)).isEqualTo(CheckpointState.NOT_DUE); // 23:30 Dublin, 20 Nov
        assertThat(at("2026-11-21T00:00:00Z", stage)).isEqualTo(CheckpointState.DUE);
    }
}
```

- [ ] **Step 2: Run** `./mvnw test -Dtest='StandingTest,DueBoundaryTest'` → FAIL to compile (no `Standing`). `DueBoundaryTest` alone would pass on today's code. That's expected: it pins the existing Dublin rule so this phase can't break it. Say so in the commit.

- [ ] **Step 3: Implement** `Standing.java`:

```java
package ie.coursework.progress.domain;

import ie.coursework.components.domain.CheckpointState;
import ie.coursework.components.domain.DublinDate;
import java.text.Collator;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.Comparator;
import java.util.Locale;

/**
 * Where one student stands on the teacher's grid (design §8.4). The grid is sorted furthest behind first, then
 * longest since their last log entry (none at all counts as longest), then surname and first name as an Irish
 * reader sorts them (pack D-7). Log activity orders the rows but never feeds the behind-by number.
 */
public record Standing(int behindBy, Integer daysSinceLastLogActivity, String lastName, String firstName) {

    private static final Collator NAMES = Collator.getInstance(Locale.forLanguageTag("en-IE"));

    public static final Comparator<Standing> ORDER = Comparator
            .comparingInt(Standing::behindBy).reversed()
            .thenComparing(Standing::daysSinceLastLogActivity, Comparator.nullsFirst(Comparator.<Integer>reverseOrder()))
            .thenComparing(Standing::lastName, NAMES)
            .thenComparing(Standing::firstName, NAMES);

    public static int behindBy(Collection<CheckpointState> states) {
        return (int) states.stream().filter(s -> s == CheckpointState.DUE).count();
    }

    /** Whole Dublin days from the student's latest log activity to today; null when they have none. */
    public static Integer daysSince(Instant lastActivity, LocalDate today) {
        return lastActivity == null ? null : (int) ChronoUnit.DAYS.between(DublinDate.of(lastActivity), today);
    }
}
```

- [ ] **Step 4: Run** `./mvnw test -Dtest='StandingTest,DueBoundaryTest'` → PASS. If the collator test fails on the `O'Brien`/`Ó Briain` pair's relative order, print the sorted list, check what `Collator` actually does with the apostrophe, and fix the *expectation* to that order, keeping the "not last" assertion. The point of the test is that `Ó` isn't sorted after `Z`.

- [ ] **Step 5: Commit.** `git add -A backend && git commit -m "Order the grid furthest behind first, then by log silence, then by name as an Irish reader sorts"`

---

## Task 6: Checkpoint ids, `SignoffRepository` and the audit events

**Files:**
- Modify: `backend/src/main/java/ie/coursework/components/domain/TemplateCheckpoint.java`
- Modify: `backend/src/main/java/ie/coursework/components/adapter/persistence/TemplateRepository.java:85-92`
- Create: `backend/src/main/java/ie/coursework/components/domain/Signoff.java`
- Create: `backend/src/main/java/ie/coursework/components/adapter/persistence/SignoffRepository.java`
- Modify: `backend/src/main/java/ie/coursework/audit/AuditEventType.java`
- Test: `backend/src/test/java/ie/coursework/components/adapter/persistence/SignoffRepositoryTest.java`

- [ ] **Step 1: Write the failing test** `SignoffRepositoryTest.java`:

```java
package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.components.domain.Signoff;
import ie.coursework.components.domain.TemplateCheckpoint;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class SignoffRepositoryTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;
    private static final Instant MONDAY = Instant.parse("2026-10-12T09:00:00Z");

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private SignoffRepository signoffs;
    @Autowired private TemplateRepository templates;

    private ClassFixtures.World world;
    private UUID component;
    private UUID checkpoint;

    @BeforeEach
    void aComponent() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        checkpoint = components.checkpointId(BIO, 1);
    }

    @Test
    void signingOffTwiceKeepsOneLiveRowAndSaysTheSecondChangedNothing() {
        Optional<UUID> first = signoffs.signOff(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY);
        Optional<UUID> second = signoffs.signOff(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY.plusSeconds(5));
        assertThat(first).isPresent();
        assertThat(second).isEmpty();
        assertThat(signoffs.live(component)).singleElement()
                .satisfies(s -> assertThat(s.signedOffAt()).isEqualTo(MONDAY));
    }

    @Test
    void revokingKeepsTheRowWithWhoAndWhenAndSaysWhenThereWasNothingToRevoke() {
        signoffs.signOff(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY);
        assertThat(signoffs.revoke(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY.plusSeconds(60))).isPresent();
        assertThat(signoffs.revoke(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY.plusSeconds(90))).isEmpty();
        assertThat(signoffs.live(component)).isEmpty();

        List<Signoff> history = signoffs.forStudent(component, world.approvedStudent());
        assertThat(history).singleElement().satisfies(s -> {
            assertThat(s.live()).isFalse();
            assertThat(s.revokedAt()).isEqualTo(MONDAY.plusSeconds(60));
            assertThat(s.revokedBy()).isEqualTo("Test " + ClassFixtures.TEACHER1);
        });
    }

    @Test
    void forStudentIsNewestFirstAndOnlyThatStudentsRows() {
        UUID classmate = fixtures.classmate(world);
        signoffs.signOff(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY);
        signoffs.revoke(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY.plusSeconds(60));
        signoffs.signOff(component, world.approvedStudent(), checkpoint, world.teacher1(), MONDAY.plusSeconds(120));
        signoffs.signOff(component, classmate, checkpoint, world.teacher1(), MONDAY);

        assertThat(signoffs.forStudent(component, world.approvedStudent()))
                .extracting(Signoff::signedOffAt).containsExactly(MONDAY.plusSeconds(120), MONDAY);
        assertThat(signoffs.live(component)).hasSize(2);
    }

    @Test
    void aCheckpointIsFoundOnlyInItsOwnTemplateVersion() {
        UUID bioVersion = jdbcTemplate.queryForObject("SELECT template_version_id FROM annual_brief WHERE sec_code = ?", UUID.class, BIO);
        UUID chemVersion = jdbcTemplate.queryForObject("SELECT template_version_id FROM annual_brief WHERE sec_code = ?", UUID.class,
                ComponentFixtures.CHEMISTRY_2027);
        assertThat(templates.checkpointInVersion(checkpoint, bioVersion)).map(TemplateCheckpoint::text)
                .contains("Initial ideas discussed with the teacher");
        assertThat(templates.checkpointInVersion(checkpoint, chemVersion)).isEmpty();
        assertThat(templates.checkpoints(bioVersion)).extracting(TemplateCheckpoint::id).contains(checkpoint);
    }
}
```

- [ ] **Step 2: Run** `./mvnw test -Dtest=SignoffRepositoryTest` → FAIL to compile (no `SignoffRepository`, `Signoff`, `checkpointInVersion`, `TemplateCheckpoint.id`).

- [ ] **Step 3: Give `TemplateCheckpoint` its id:**

```java
package ie.coursework.components.domain;

import java.util.UUID;

public record TemplateCheckpoint(UUID id, UUID stageId, String text) {}
```

In `TemplateRepository`, replace `checkpoints` and add `checkpointInVersion`:

```java
    public List<TemplateCheckpoint> checkpoints(UUID versionId) {
        return jdbc.sql("""
                SELECT c.id, c.stage_id, c.text FROM template_checkpoint c JOIN template_stage s ON s.id = c.stage_id
                WHERE c.version_id = :version ORDER BY s.ordinal, c.ordinal
                """).param("version", versionId).query(TemplateRepository::checkpoint).list();
    }

    /** A checkpoint only if it belongs to this template version: a sign-off can't name another subject's checkpoint. */
    public Optional<TemplateCheckpoint> checkpointInVersion(UUID checkpointId, UUID versionId) {
        return jdbc.sql("SELECT id, stage_id, text FROM template_checkpoint WHERE id = :id AND version_id = :version")
                .param("id", checkpointId).param("version", versionId).query(TemplateRepository::checkpoint).optional();
    }

    private static TemplateCheckpoint checkpoint(ResultSet rs, int row) throws SQLException {
        return new TemplateCheckpoint(rs.getObject("id", UUID.class), rs.getObject("stage_id", UUID.class), rs.getString("text"));
    }
```

(add `import java.util.Optional;`). Then run `grep -rn "new TemplateCheckpoint" backend/src` and fix any other constructor call.

- [ ] **Step 4: Create** `Signoff.java`:

```java
package ie.coursework.components.domain;

import java.time.Instant;
import java.util.UUID;

/** One row of checkpoint_signoff (design §6.5). {@code revokedBy} is the revoking teacher's name, null while live. */
public record Signoff(UUID id, UUID studentId, UUID checkpointId, Instant signedOffAt, Instant revokedAt, String revokedBy) {

    public boolean live() {
        return revokedAt == null;
    }
}
```

- [ ] **Step 5: Create** `SignoffRepository.java`:

```java
package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.Signoff;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Design §6.5. Called only after ProgressService (or ComponentService, for the student's own view) has scoped the
 * component, the student and the checkpoint; nothing here checks who is asking. Rows are never deleted (V12).
 */
@Repository
public class SignoffRepository {

    private static final String SELECT = """
            SELECT s.id, s.student_user_id, s.checkpoint_id, s.signed_off_at, s.revoked_at,
                   CASE WHEN s.revoked_at IS NULL THEN NULL ELSE u.first_name || ' ' || u.last_name END AS revoked_by
            FROM checkpoint_signoff s
            LEFT JOIN app_user u ON u.id = s.revoked_by_user_id
            """;

    private final JdbcClient jdbc;

    public SignoffRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Every live sign-off in a component: the grid's signed-off cells. */
    public List<Signoff> live(UUID componentId) {
        return jdbc.sql(SELECT + " WHERE s.instance_id = :component AND s.revoked_at IS NULL")
                .param("component", componentId).query(SignoffRepository::map).list();
    }

    /** One student's sign-offs in a component, live and revoked, newest first. */
    public List<Signoff> forStudent(UUID componentId, UUID studentId) {
        return jdbc.sql(SELECT + """
                 WHERE s.instance_id = :component AND s.student_user_id = :student
                ORDER BY s.signed_off_at DESC, s.id
                """).param("component", componentId).param("student", studentId).query(SignoffRepository::map).list();
    }

    /** The new row's id, or empty when a live sign-off already existed (V12's partial index; nothing changed). */
    public Optional<UUID> signOff(UUID componentId, UUID studentId, UUID checkpointId, UUID teacherId, Instant now) {
        return jdbc.sql("""
                INSERT INTO checkpoint_signoff (instance_id, student_user_id, checkpoint_id, signed_off_by_user_id, signed_off_at)
                VALUES (:component, :student, :checkpoint, :teacher, :now)
                ON CONFLICT (instance_id, student_user_id, checkpoint_id) WHERE revoked_at IS NULL DO NOTHING
                RETURNING id
                """).param("component", componentId).param("student", studentId).param("checkpoint", checkpointId)
                .param("teacher", teacherId).param("now", Timestamps.utc(now))
                .query(UUID.class).optional();
    }

    /** The revoked row's id, or empty when there was no live sign-off to revoke. Undo and Revoke both land here. */
    public Optional<UUID> revoke(UUID componentId, UUID studentId, UUID checkpointId, UUID teacherId, Instant now) {
        return jdbc.sql("""
                UPDATE checkpoint_signoff SET revoked_by_user_id = :teacher, revoked_at = :now
                WHERE instance_id = :component AND student_user_id = :student AND checkpoint_id = :checkpoint
                  AND revoked_at IS NULL
                RETURNING id
                """).param("component", componentId).param("student", studentId).param("checkpoint", checkpointId)
                .param("teacher", teacherId).param("now", Timestamps.utc(now))
                .query(UUID.class).optional();
    }

    private static Signoff map(ResultSet rs, int row) throws SQLException {
        OffsetDateTime revoked = rs.getObject("revoked_at", OffsetDateTime.class);
        return new Signoff(rs.getObject("id", UUID.class), rs.getObject("student_user_id", UUID.class),
                rs.getObject("checkpoint_id", UUID.class), rs.getObject("signed_off_at", OffsetDateTime.class).toInstant(),
                revoked == null ? null : revoked.toInstant(), rs.getString("revoked_by"));
    }
}
```

- [ ] **Step 6: Add the audit events** in `AuditEventType.java`: replace its comment with `/** Every event the app records. Sign-off events arrived in Phase 4 (Undo records a revoke). */` and append `CHECKPOINT_SIGNED_OFF,` and `CHECKPOINT_SIGNOFF_REVOKED` after `JOIN_CODE_DISABLED`.

- [ ] **Step 7: Run** `./mvnw test -Dtest='SignoffRepositoryTest,SignoffSchemaTest,StudentComponentViewTest,AuditLogTest'` → PASS.

- [ ] **Step 8: Commit.** `git add -A backend && git commit -m "Read and write sign-offs: one live row, revoked in place, a checkpoint only from its own template"`

---

## Task 7: Each student's latest log activity in a component

**Files:**
- Modify: `backend/src/main/java/ie/coursework/log/adapter/persistence/LogRepository.java`
- Test: `backend/src/test/java/ie/coursework/log/adapter/persistence/LogLastActivityTest.java`

- [ ] **Step 1: Write the failing test:**

```java
package ie.coursework.log.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.log.domain.EntryKind;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Plan P4-9: the newest entry or edit counts, hidden entries included; the teacher already sees their dates (Q3). */
class LogLastActivityTest extends PostgresIntegrationTest {

    private static final Instant T0 = Instant.parse("2026-10-01T09:00:00Z");

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private LogRepository log;

    @Test
    void theNewestRevisionOfAnyEntryVisibleOrHiddenPerStudent() {
        ClassFixtures.World world = fixtures.world();
        UUID classmate = fixtures.classmate(world);
        UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        UUID other = components.component(world.class2(), world.teacher2(), ComponentFixtures.BIOLOGY_2027);

        UUID first = log.create(component, world.approvedStudent(), EntryKind.NOTE, true, "one", null, T0);
        log.create(component, world.approvedStudent(), EntryKind.NOTE, false, "hidden", null, T0.plusSeconds(3_600));
        log.addRevision(first, "one, edited", null, T0.plusSeconds(7_200));
        log.create(other, world.approvedStudent(), EntryKind.NOTE, true, "elsewhere", null, T0.plusSeconds(99_999));

        assertThat(log.lastActivity(component))
                .containsEntry(world.approvedStudent(), T0.plusSeconds(7_200))
                .doesNotContainKey(classmate)
                .hasSize(1);
    }
}
```

- [ ] **Step 2: Run** `./mvnw test -Dtest=LogLastActivityTest` → FAIL to compile (no `lastActivity`).

- [ ] **Step 3: Implement** in `LogRepository` (after `visibleHistory`):

```java
    /**
     * Each student's newest log activity in a component: the latest revision of any entry, hidden ones included
     * (plan P4-9). Read by ProgressService, after ComponentService has proved the teacher owns the class.
     */
    public Map<UUID, Instant> lastActivity(UUID componentId) {
        Map<UUID, Instant> last = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT e.student_user_id, max(r.created_at) AS last_at
                FROM log_entry e JOIN log_entry_revision r ON r.entry_id = e.id
                WHERE e.instance_id = :component
                GROUP BY e.student_user_id
                """).param("component", componentId)
                .query(rs -> {
                    last.put(rs.getObject("student_user_id", UUID.class), rs.getObject("last_at", OffsetDateTime.class).toInstant());
                });
        return last;
    }
```

Extend the class Javadoc's last sentence to: "Only TeacherLogProjection's caller and ProgressService (`lastActivity`) read another student's rows, and only after ComponentService has proved the teacher owns the class."

- [ ] **Step 4: Run** `./mvnw test -Dtest='LogLastActivityTest,LogRepositoryTest'` → PASS.

- [ ] **Step 5: Commit.** `git commit -am "Read each student's latest log activity in a component, hidden entries included"`

---

## Task 8: `GET /components/{id}/progress` — the grid

**Files:**
- Create: `backend/src/main/java/ie/coursework/progress/application/ProgressViews.java`
- Create: `backend/src/main/java/ie/coursework/progress/application/ProgressService.java`
- Create: `backend/src/main/java/ie/coursework/progress/adapter/web/ProgressController.java`
- Test: `backend/src/test/java/ie/coursework/progress/adapter/web/ProgressGridTest.java`

- [ ] **Step 1: Write the failing test** `ProgressGridTest.java`:

```java
package ie.coursework.progress.adapter.web;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.MutableClock;
import ie.coursework.support.TestAccounts;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.web.servlet.MockMvc;

/** Design §8.4 and pack D-7: students × checkpoints, furthest behind first. */
@AutoConfigureMockMvc
class ProgressGridTest extends PostgresIntegrationTest {

    @TestConfiguration
    static class PinnedClock {
        @Bean
        @Primary
        Clock testClock() {
            return new MutableClock(Instant.parse("2026-10-12T08:00:00Z")); // Monday 12 Oct 2026, 09:00 Dublin
        }
    }

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;
    private static final String BUSINESS = "2027L033C2EL";

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private UUID component;

    @BeforeEach
    void aClassWithTwoApprovedStudents() throws Exception {
        world = fixtures.world();
        fixtures.classmate(world);
        component = components.component(world.class1(), world.teacher1(), BIO);
        components.stageDate(component, components.stageId(BIO, 1), LocalDate.of(2026, 9, 10));
        components.stageDate(component, components.stageId(BIO, 2), LocalDate.of(2026, 10, 1));
        components.stageDate(component, components.stageId(BIO, 3), LocalDate.of(2026, 11, 20));
        jdbcTemplate.update("""
                INSERT INTO checkpoint_signoff (instance_id, student_user_id, checkpoint_id, signed_off_by_user_id, signed_off_at)
                VALUES (?, ?, ?, ?, ?)
                """, component, world.approvedStudent(), components.checkpointId(BIO, 1), world.teacher1(),
                Timestamp.from(Instant.parse("2026-09-15T10:00:00Z")));
        as(ClassFixtures.APPROVED_STUDENT).post("/api/v1/components/" + component + "/log", "{\"kind\":\"NOTE\",\"body\":\"today\"}")
                .andExpect(status().isCreated());
    }

    @Test
    void approvedStudentsFurthestBehindFirstWithTheirCellsAndLogActivity() throws Exception {
        as(ClassFixtures.TEACHER1).get("/api/v1/components/" + component + "/progress")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.componentId").value(component.toString()))
                .andExpect(jsonPath("$.classId").value(world.class1().toString()))
                .andExpect(jsonPath("$.className").value(ClassFixtures.CLASS1_NAME))
                .andExpect(jsonPath("$.today").value("2026-10-12"))
                .andExpect(jsonPath("$.stages.length()").value(6))
                .andExpect(jsonPath("$.stages[0].ordinal").value(1))
                .andExpect(jsonPath("$.stages[0].label").value("Stage 1"))
                .andExpect(jsonPath("$.stages[0].dueDate").value("2026-09-10"))
                .andExpect(jsonPath("$.stages[0].checkpoint.text").value("Initial ideas discussed with the teacher"))
                .andExpect(jsonPath("$.students.length()").value(2)) // pending and removed students aren't on the grid
                .andExpect(jsonPath("$.students[0].lastName").value(ClassFixtures.CLASSMATE))
                .andExpect(jsonPath("$.students[0].behindBy").value(2))
                .andExpect(jsonPath("$.students[0].daysSinceLastLogActivity").value(nullValue()))
                .andExpect(jsonPath("$.students[0].lastLogActivityOn").value(nullValue()))
                .andExpect(jsonPath("$.students[1].lastName").value(ClassFixtures.APPROVED_STUDENT))
                .andExpect(jsonPath("$.students[1].behindBy").value(1))
                .andExpect(jsonPath("$.students[1].daysSinceLastLogActivity").value(0))
                .andExpect(jsonPath("$.students[1].lastLogActivityOn").value("2026-10-12"))
                .andExpect(jsonPath("$.students[1].cells.length()").value(6))
                .andExpect(jsonPath("$.students[1].cells[0].state").value("SIGNED_OFF"))
                .andExpect(jsonPath("$.students[1].cells[0].signedOffOn").value("2026-09-15"))
                .andExpect(jsonPath("$.students[1].cells[1].state").value("DUE"))
                .andExpect(jsonPath("$.students[1].cells[1].signedOffOn").value(nullValue()))
                .andExpect(jsonPath("$.students[1].cells[2].state").value("NOT_DUE"));
    }

    @Test
    void aStageWithoutACheckpointIsListedButHasNoCell() throws Exception {
        UUID business = components.component(world.class2(), world.teacher2(), BUSINESS);
        as(ClassFixtures.TEACHER2).get("/api/v1/components/" + business + "/progress")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages.length()").value(7))
                .andExpect(jsonPath("$.stages[5].checkpoint").value(nullValue()))
                .andExpect(jsonPath("$.stages[6].label").value(nullValue()))
                .andExpect(jsonPath("$.students.length()").value(0));
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }
}
```

The approved student's last name is `approved.student` and the classmate's `classmate.student` (`TestAccounts.user` sets first name "Test", last name the username).

- [ ] **Step 2: Run** `./mvnw test -Dtest=ProgressGridTest` → FAIL (404: no such endpoint).

- [ ] **Step 3: Create** `ProgressViews.java`:

```java
package ie.coursework.progress.application;

import ie.coursework.components.domain.CheckpointState;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** The teacher's progress views (design §8.4, pack D-7). Dates are Dublin calendar dates. */
public final class ProgressViews {

    private ProgressViews() {}

    public record CheckpointRef(UUID id, String text) {}

    /** Every stage in order; {@code checkpoint} is null where there's nothing to sign off (Business Stage 6). */
    public record GridStage(UUID stageId, int ordinal, String label, String name, LocalDate dueDate, CheckpointRef checkpoint) {}

    public record Cell(UUID checkpointId, CheckpointState state, LocalDate signedOffOn) {}

    /** One cell per checkpoint, in stage order. */
    public record GridStudent(UUID studentId, String firstName, String lastName, int behindBy, LocalDate lastLogActivityOn,
            Integer daysSinceLastLogActivity, List<Cell> cells) {}

    public record Grid(UUID componentId, UUID classId, String className, LocalDate today, List<GridStage> stages,
            List<GridStudent> students) {}

    public record PastSignoff(LocalDate signedOffOn, LocalDate revokedOn, String revokedBy) {}

    /** Only stages with a checkpoint (plan P4-25). {@code history} is revoked sign-offs, newest first. */
    public record StudentStage(UUID stageId, int ordinal, String label, String name, LocalDate dueDate, CheckpointRef checkpoint,
            CheckpointState state, LocalDate signedOffOn, List<PastSignoff> history) {}

    public record StudentCheckpoints(UUID studentId, String firstName, String lastName, LocalDate today, int behindBy,
            LocalDate lastLogActivityOn, Integer daysSinceLastLogActivity, List<StudentStage> stages) {}
}
```

- [ ] **Step 4: Create** `ProgressService.java`, with the grid only; Tasks 9 and 10 add to it:

```java
package ie.coursework.progress.application;

import ie.coursework.classes.adapter.persistence.ClassGroupRepository;
import ie.coursework.classes.adapter.persistence.EnrolmentRepository;
import ie.coursework.classes.adapter.persistence.EnrolmentRepository.Member;
import ie.coursework.classes.domain.EnrolmentStatus;
import ie.coursework.components.adapter.persistence.BriefRepository;
import ie.coursework.components.adapter.persistence.ComponentRepository;
import ie.coursework.components.adapter.persistence.SignoffRepository;
import ie.coursework.components.adapter.persistence.TemplateRepository;
import ie.coursework.components.application.ComponentService;
import ie.coursework.components.domain.Brief;
import ie.coursework.components.domain.CheckpointState;
import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.components.domain.DublinDate;
import ie.coursework.components.domain.Signoff;
import ie.coursework.components.domain.TemplateCheckpoint;
import ie.coursework.identity.domain.Actor;
import ie.coursework.log.adapter.persistence.LogRepository;
import ie.coursework.progress.application.ProgressViews.Cell;
import ie.coursework.progress.application.ProgressViews.CheckpointRef;
import ie.coursework.progress.application.ProgressViews.Grid;
import ie.coursework.progress.application.ProgressViews.GridStage;
import ie.coursework.progress.application.ProgressViews.GridStudent;
import ie.coursework.progress.domain.Standing;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * The teacher's progress grid and sign-offs (roadmap §8.4). Every call starts with ComponentService.requireOwned;
 * a student must be APPROVED in that class and a checkpoint must belong to the brief's template version. Anything
 * else is 404 (design §9). Built from a fixed number of queries whatever the class size (Gate P4's timing).
 */
@Service
public class ProgressService {

    private final ComponentService componentService;
    private final ComponentRepository components;
    private final BriefRepository briefs;
    private final TemplateRepository templates;
    private final ClassGroupRepository classGroups;
    private final EnrolmentRepository enrolments;
    private final SignoffRepository signoffs;
    private final LogRepository log;
    private final Clock clock;

    public ProgressService(ComponentService componentService, ComponentRepository components, BriefRepository briefs,
            TemplateRepository templates, ClassGroupRepository classGroups, EnrolmentRepository enrolments,
            SignoffRepository signoffs, LogRepository log, Clock clock) {
        this.componentService = componentService;
        this.components = components;
        this.briefs = briefs;
        this.templates = templates;
        this.classGroups = classGroups;
        this.enrolments = enrolments;
        this.signoffs = signoffs;
        this.log = log;
        this.clock = clock;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Grid grid(Actor actor, UUID componentId) {
        ComponentInstance component = componentService.requireOwned(actor, componentId);
        LocalDate today = DublinDate.today(clock);
        List<GridStage> stages = stages(component);
        Map<String, Instant> live = signoffs.live(component.id()).stream()
                .collect(Collectors.toMap(s -> key(s.studentId(), s.checkpointId()), Signoff::signedOffAt));
        Map<UUID, Instant> activity = log.lastActivity(component.id());

        List<GridStudent> students = approved(component).stream().map(m -> {
            List<Cell> cells = stages.stream().filter(s -> s.checkpoint() != null)
                    .map(s -> cell(s, live.get(key(m.studentId(), s.checkpoint().id())), today)).toList();
            Instant last = activity.get(m.studentId());
            return new GridStudent(m.studentId(), m.firstName(), m.lastName(),
                    Standing.behindBy(cells.stream().map(Cell::state).toList()),
                    last == null ? null : DublinDate.of(last), Standing.daysSince(last, today), cells);
        }).sorted(Comparator.comparing(ProgressService::standing, Standing.ORDER)).toList();

        return new Grid(component.id(), component.classId(), classGroups.findById(component.classId()).orElseThrow().name(),
                today, stages, students);
    }

    List<GridStage> stages(ComponentInstance component) {
        Brief brief = briefs.findPublished(component.briefId()).orElseThrow(() -> new IllegalStateException("brief missing"));
        Map<UUID, LocalDate> dates = components.stageDates(component.id());
        Map<UUID, TemplateCheckpoint> checkpoints = templates.checkpoints(brief.versionId()).stream()
                .collect(Collectors.toMap(TemplateCheckpoint::stageId, Function.identity(), (first, later) -> first));
        return templates.stages(brief.versionId()).stream().map(s -> {
            TemplateCheckpoint c = checkpoints.get(s.id());
            return new GridStage(s.id(), s.ordinal(), s.label(), s.name(), dates.get(s.id()),
                    c == null ? null : new CheckpointRef(c.id(), c.text()));
        }).toList();
    }

    List<Member> approved(ComponentInstance component) {
        return enrolments.membersOf(component.classId()).stream().filter(m -> m.status() == EnrolmentStatus.APPROVED).toList();
    }

    static Cell cell(GridStage stage, Instant signedOffAt, LocalDate today) {
        return new Cell(stage.checkpoint().id(), CheckpointState.at(stage.dueDate(), today, signedOffAt != null),
                signedOffAt == null ? null : DublinDate.of(signedOffAt));
    }

    private static Standing standing(GridStudent s) {
        return new Standing(s.behindBy(), s.daysSinceLastLogActivity(), s.lastName(), s.firstName());
    }

    private static String key(UUID studentId, UUID checkpointId) {
        return studentId + "/" + checkpointId;
    }

    static DomainException notFound() {
        return new DomainException(ErrorCode.NOT_FOUND, "No such student or checkpoint.");
    }
}
```

- [ ] **Step 5: Create** `ProgressController.java`:

```java
package ie.coursework.progress.adapter.web;

import ie.coursework.identity.domain.Actor;
import ie.coursework.progress.application.ProgressService;
import ie.coursework.progress.application.ProgressViews.Grid;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The teacher's progress grid and sign-offs (roadmap §7 Phase 4, plan P4-6 and P4-10). */
@RestController
@RequestMapping("/api/v1/components/{componentId}")
public class ProgressController {

    private final ProgressService progress;

    public ProgressController(ProgressService progress) {
        this.progress = progress;
    }

    @GetMapping("/progress")
    Grid grid(Actor actor, @PathVariable UUID componentId) {
        return progress.grid(actor, componentId);
    }
}
```

- [ ] **Step 6: Run** `./mvnw test -Dtest=ProgressGridTest` → PASS.

- [ ] **Step 7: Commit.** `git add -A backend && git commit -m "Show the teacher each approved student's checkpoints, furthest behind first"`

---

## Task 9: `GET /components/{id}/students/{studentId}/checkpoints` — one student, with history

**Files:**
- Modify: `ProgressService.java`, `ProgressController.java`
- Test: `backend/src/test/java/ie/coursework/progress/adapter/web/StudentCheckpointsTest.java`

- [ ] **Step 1: Write the failing test** (same `PinnedClock` and `as(...)` helper as `ProgressGridTest`; copy them in):

```java
@AutoConfigureMockMvc
class StudentCheckpointsTest extends PostgresIntegrationTest {

    // @TestConfiguration PinnedClock: identical to ProgressGridTest (2026-10-12T08:00:00Z).

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    @Test
    void theStudentsCheckpointsWithTheirStateAndEveryRevokedSignoff() throws Exception {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), BIO);
        components.stageDate(component, components.stageId(BIO, 1), LocalDate.of(2026, 9, 10));
        components.stageDate(component, components.stageId(BIO, 2), LocalDate.of(2026, 10, 1));
        UUID stage1 = components.checkpointId(BIO, 1);
        UUID revoked = jdbcTemplate.queryForObject("""
                INSERT INTO checkpoint_signoff (instance_id, student_user_id, checkpoint_id, signed_off_by_user_id, signed_off_at)
                VALUES (?, ?, ?, ?, ?) RETURNING id
                """, UUID.class, component, world.approvedStudent(), stage1, world.teacher1(),
                Timestamp.from(Instant.parse("2026-09-12T10:00:00Z")));
        jdbcTemplate.update("UPDATE checkpoint_signoff SET revoked_by_user_id = ?, revoked_at = ? WHERE id = ?",
                world.teacher1(), Timestamp.from(Instant.parse("2026-09-14T10:00:00Z")), revoked);
        jdbcTemplate.update("""
                INSERT INTO checkpoint_signoff (instance_id, student_user_id, checkpoint_id, signed_off_by_user_id, signed_off_at)
                VALUES (?, ?, ?, ?, ?)
                """, component, world.approvedStudent(), stage1, world.teacher1(), Timestamp.from(Instant.parse("2026-09-15T10:00:00Z")));

        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .get("/api/v1/components/" + component + "/students/" + world.approvedStudent() + "/checkpoints")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(world.approvedStudent().toString()))
                .andExpect(jsonPath("$.lastName").value(ClassFixtures.APPROVED_STUDENT))
                .andExpect(jsonPath("$.today").value("2026-10-12"))
                .andExpect(jsonPath("$.behindBy").value(1))
                .andExpect(jsonPath("$.daysSinceLastLogActivity").value(nullValue()))
                .andExpect(jsonPath("$.stages.length()").value(6))
                .andExpect(jsonPath("$.stages[0].checkpoint.id").value(stage1.toString()))
                .andExpect(jsonPath("$.stages[0].state").value("SIGNED_OFF"))
                .andExpect(jsonPath("$.stages[0].signedOffOn").value("2026-09-15"))
                .andExpect(jsonPath("$.stages[0].history.length()").value(1))
                .andExpect(jsonPath("$.stages[0].history[0].signedOffOn").value("2026-09-12"))
                .andExpect(jsonPath("$.stages[0].history[0].revokedOn").value("2026-09-14"))
                .andExpect(jsonPath("$.stages[0].history[0].revokedBy").value("Test " + ClassFixtures.TEACHER1))
                .andExpect(jsonPath("$.stages[1].state").value("DUE"))
                .andExpect(jsonPath("$.stages[1].history.length()").value(0));
    }
}
```

(imports as in `ProgressGridTest`, plus `java.sql.Timestamp`.)

- [ ] **Step 2: Run** `./mvnw test -Dtest=StudentCheckpointsTest` → FAIL (404).

- [ ] **Step 3: Implement** in `ProgressService` (imports: `ProgressViews.PastSignoff`, `ProgressViews.StudentCheckpoints`, `ProgressViews.StudentStage`, `java.util.Optional`):

```java
    /** One student's checkpoints with every revoked sign-off (pack D-7's student view). An unapproved student is 404. */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public StudentCheckpoints student(Actor actor, UUID componentId, UUID studentId) {
        ComponentInstance component = componentService.requireOwned(actor, componentId);
        Member member = approvedMember(component, studentId);
        LocalDate today = DublinDate.today(clock);
        Map<UUID, List<Signoff>> byCheckpoint = signoffs.forStudent(component.id(), studentId).stream()
                .collect(Collectors.groupingBy(Signoff::checkpointId));

        List<StudentStage> stages = stages(component).stream().filter(s -> s.checkpoint() != null).map(s -> {
            List<Signoff> rows = byCheckpoint.getOrDefault(s.checkpoint().id(), List.of());
            Instant live = rows.stream().filter(Signoff::live).map(Signoff::signedOffAt).findFirst().orElse(null);
            Cell cell = cell(s, live, today);
            List<PastSignoff> history = rows.stream().filter(r -> !r.live())
                    .map(r -> new PastSignoff(DublinDate.of(r.signedOffAt()), DublinDate.of(r.revokedAt()), r.revokedBy())).toList();
            return new StudentStage(s.stageId(), s.ordinal(), s.label(), s.name(), s.dueDate(), s.checkpoint(),
                    cell.state(), cell.signedOffOn(), history);
        }).toList();

        Instant last = log.lastActivity(component.id()).get(studentId);
        return new StudentCheckpoints(member.studentId(), member.firstName(), member.lastName(), today,
                Standing.behindBy(stages.stream().map(StudentStage::state).toList()),
                last == null ? null : DublinDate.of(last), Standing.daysSince(last, today), stages);
    }

    Member approvedMember(ComponentInstance component, UUID studentId) {
        return approved(component).stream().filter(m -> m.studentId().equals(studentId)).findFirst()
                .orElseThrow(ProgressService::notFound);
    }
```

In `ProgressController` add (import `StudentCheckpoints`):

```java
    @GetMapping("/students/{studentId}/checkpoints")
    StudentCheckpoints student(Actor actor, @PathVariable UUID componentId, @PathVariable UUID studentId) {
        return progress.student(actor, componentId, studentId);
    }
```

- [ ] **Step 4: Run** `./mvnw test -Dtest='StudentCheckpointsTest,ProgressGridTest'` → PASS.

- [ ] **Step 5: Commit.** `git add -A backend && git commit -m "Show one student's checkpoints with every revoked sign-off and who revoked it"`

---

## Task 10: `PUT …/checkpoints/{checkpointId}/signoff` — sign off, undo, revoke

**Files:**
- Create: `backend/src/main/java/ie/coursework/progress/adapter/web/SignoffRequest.java`
- Modify: `ProgressService.java`, `ProgressController.java`
- Test: `backend/src/test/java/ie/coursework/progress/adapter/web/SignoffTest.java`

- [ ] **Step 1: Write the failing test** (pinned clock as before):

```java
@AutoConfigureMockMvc
class SignoffTest extends PostgresIntegrationTest {

    // @TestConfiguration PinnedClock: identical to ProgressGridTest (2026-10-12T08:00:00Z).

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private String path;
    private ApiSession teacher;

    @BeforeEach
    void stageTwoIsDue() throws Exception {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), BIO);
        components.stageDate(component, components.stageId(BIO, 2), LocalDate.of(2026, 10, 1));
        path = "/api/v1/components/" + component + "/students/" + world.approvedStudent() + "/checkpoints/"
                + components.checkpointId(BIO, 2) + "/signoff";
        teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    private int events(String type) {
        return jdbcTemplate.queryForObject("SELECT count(*) FROM audit_event WHERE event_type = ?", Integer.class, type);
    }

    @Test
    void signingOffTwiceIsOneSignoffAndOneAuditEvent() throws Exception {
        for (int i = 0; i < 2; i++) {
            teacher.put(path, "{\"signedOff\":true}").andExpect(status().isOk())
                    .andExpect(jsonPath("$.state").value("SIGNED_OFF"))
                    .andExpect(jsonPath("$.signedOffOn").value("2026-10-12"));
        }
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM checkpoint_signoff", Integer.class)).isEqualTo(1);
        assertThat(events("CHECKPOINT_SIGNED_OFF")).isEqualTo(1);
    }

    @Test
    void undoingOrRevokingLeavesTheRowAndPutsTheCellBackToDueOnce() throws Exception {
        teacher.put(path, "{\"signedOff\":true}").andExpect(status().isOk());
        for (int i = 0; i < 2; i++) {
            teacher.put(path, "{\"signedOff\":false}").andExpect(status().isOk())
                    .andExpect(jsonPath("$.state").value("DUE"))
                    .andExpect(jsonPath("$.signedOffOn").value(nullValue()));
        }
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM checkpoint_signoff WHERE revoked_at IS NOT NULL", Integer.class)).isEqualTo(1);
        assertThat(events("CHECKPOINT_SIGNOFF_REVOKED")).isEqualTo(1);
    }

    @Test
    void aCheckpointCanBeSignedOffBeforeItsStageIsDueOrDated() throws Exception {
        String early = path.replace(components.checkpointId(BIO, 2).toString(), components.checkpointId(BIO, 4).toString());
        teacher.put(early, "{\"signedOff\":true}").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("SIGNED_OFF"));
    }

    @Test
    void theBodyMustSayWhichWay() throws Exception {
        teacher.put(path, "{}").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }
}
```

(imports as `ProgressGridTest`, plus `static org.assertj.core.api.Assertions.assertThat`.)

- [ ] **Step 2: Run** `./mvnw test -Dtest=SignoffTest` → FAIL (no PUT mapping: 405 or 404).

- [ ] **Step 3: Create** `SignoffRequest.java`:

```java
package ie.coursework.progress.adapter.web;

import jakarta.validation.constraints.NotNull;

/** true signs off; false undoes or revokes (plan P4-6, P4-17). */
public record SignoffRequest(@NotNull Boolean signedOff) {}
```

- [ ] **Step 4: Implement** in `ProgressService` (inject `ie.coursework.audit.AuditLog audit` as a new constructor parameter before `Clock`; imports `AuditEventType`, `java.util.Optional`):

```java
    /**
     * Idempotent (plan P4-6): signing off what's already signed off, or revoking what isn't, changes nothing and writes
     * no audit event. Undo and Revoke are the same call (P4-17).
     */
    @Transactional
    public Cell setSignoff(Actor actor, UUID componentId, UUID studentId, UUID checkpointId, boolean signedOff) {
        ComponentInstance component = componentService.requireOwned(actor, componentId);
        approvedMember(component, studentId);
        Brief brief = briefs.findPublished(component.briefId()).orElseThrow(() -> new IllegalStateException("brief missing"));
        TemplateCheckpoint checkpoint = templates.checkpointInVersion(checkpointId, brief.versionId())
                .orElseThrow(ProgressService::notFound);

        Instant now = clock.instant();
        Map<String, Object> details = Map.of("componentId", component.id(), "studentId", studentId, "checkpointId", checkpointId);
        Optional<UUID> changed = signedOff
                ? signoffs.signOff(component.id(), studentId, checkpointId, actor.userId(), now)
                : signoffs.revoke(component.id(), studentId, checkpointId, actor.userId(), now);
        changed.ifPresent(id -> audit.record(actor.userId(),
                signedOff ? AuditEventType.CHECKPOINT_SIGNED_OFF : AuditEventType.CHECKPOINT_SIGNOFF_REVOKED,
                "checkpoint_signoff", id, details));

        Instant live = signoffs.forStudent(component.id(), studentId).stream()
                .filter(s -> s.live() && s.checkpointId().equals(checkpointId)).map(Signoff::signedOffAt).findFirst().orElse(null);
        LocalDate due = components.stageDates(component.id()).get(checkpoint.stageId());
        LocalDate today = DublinDate.today(clock);
        return new Cell(checkpointId, CheckpointState.at(due, today, live != null), live == null ? null : DublinDate.of(live));
    }
```

In `ProgressController` add (imports `jakarta.validation.Valid`, `PutMapping`, `RequestBody`, `Cell`):

```java
    @PutMapping("/students/{studentId}/checkpoints/{checkpointId}/signoff")
    Cell signoff(Actor actor, @PathVariable UUID componentId, @PathVariable UUID studentId, @PathVariable UUID checkpointId,
            @Valid @RequestBody SignoffRequest body) {
        return progress.setSignoff(actor, componentId, studentId, checkpointId, body.signedOff());
    }
```

- [ ] **Step 5: Run** `./mvnw test -Dtest='SignoffTest,ProgressGridTest,StudentCheckpointsTest'` → PASS.

- [ ] **Step 6: Commit.** `git add -A backend && git commit -m "Let the class's teacher sign off, undo and revoke a checkpoint, audited once per change"`

---

## Task 11: `SignoffScopeTest` — everyone else gets 404

**Files:**
- Test: `backend/src/test/java/ie/coursework/progress/authz/SignoffScopeTest.java`

- [ ] **Step 1: Write the test:**

```java
package ie.coursework.progress.authz;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** Gate P4: only the class's teacher reaches the grid or a sign-off, and only for its approved students (design §9). */
@AutoConfigureMockMvc
class SignoffScopeTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;
    private static final String ON = "{\"signedOff\":true}";

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private ClassFixtures.World world;
    private UUID component;
    private UUID checkpoint;

    @BeforeEach
    void aComponent() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        checkpoint = components.checkpointId(BIO, 1);
    }

    private String grid() { return "/api/v1/components/" + component + "/progress"; }
    private String student(UUID s) { return "/api/v1/components/" + component + "/students/" + s + "/checkpoints"; }
    private String signoff(UUID s, UUID c) { return student(s) + "/" + c + "/signoff"; }

    @Test
    void anonymousIsUnauthenticated() throws Exception {
        ApiSession anonymous = new ApiSession(mockMvc);
        anonymous.get(grid()).andExpect(status().isUnauthorized());
        anonymous.get(student(world.approvedStudent())).andExpect(status().isUnauthorized());
        anonymous.put(signoff(world.approvedStudent(), checkpoint), ON).andExpect(status().isUnauthorized());
    }

    @Test
    void everyoneButTheClassesTeacherGetsNotFound() throws Exception {
        for (String user : new String[] {ClassFixtures.TEACHER2, ClassFixtures.TEACHER_B, ClassFixtures.LEADER_A,
                ClassFixtures.APPROVED_STUDENT, ClassFixtures.PENDING_STUDENT, ClassFixtures.OUTSIDER}) {
            ApiSession session = as(user);
            session.get(grid()).andExpect(status().isNotFound());
            session.get(student(world.approvedStudent())).andExpect(status().isNotFound());
            session.put(signoff(world.approvedStudent(), checkpoint), ON).andExpect(status().isNotFound());
        }
        as(ClassFixtures.TEACHER1).get(grid()).andExpect(status().isOk());
    }

    @Test
    void theTeacherCantReachAPendingRemovedOutsideOrMadeUpStudent() throws Exception {
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        for (UUID s : new UUID[] {world.pendingStudent(), world.removedStudent(), world.outsider(), UUID.randomUUID()}) {
            teacher.get(student(s)).andExpect(status().isNotFound());
            teacher.put(signoff(s, checkpoint), ON).andExpect(status().isNotFound());
        }
    }

    @Test
    void theTeacherCantSignOffAnotherSubjectsOrAMadeUpCheckpoint() throws Exception {
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        UUID chemistry = components.checkpointId(ComponentFixtures.CHEMISTRY_2027, 1);
        teacher.put(signoff(world.approvedStudent(), chemistry), ON).andExpect(status().isNotFound());
        teacher.put(signoff(world.approvedStudent(), UUID.randomUUID()), ON).andExpect(status().isNotFound());
        org.assertj.core.api.Assertions.assertThat(
                jdbcTemplate.queryForObject("SELECT count(*) FROM checkpoint_signoff", Integer.class)).isZero();
    }

    private ApiSession as(String username) throws Exception {
        return new ApiSession(mockMvc).login(username, TestAccounts.PASSWORD);
    }
}
```

- [ ] **Step 2: Run** `./mvnw test -Dtest=SignoffScopeTest` → PASS, because the checks already exist from Tasks 8–10. This task's proof is the bite test.

- [ ] **Step 3: Bite test, check 2.** In `ProgressService.setSignoff` comment out `approvedMember(component, studentId);`. Run `./mvnw test -Dtest=SignoffScopeTest#theTeacherCantReachAPendingRemovedOutsideOrMadeUpStudent` → **FAIL** (a pending student's sign-off returns 200, or the foreign key refuses the made-up id with a 500). Restore the line; run again → PASS.

- [ ] **Step 4: Bite test, check 3.** Replace `templates.checkpointInVersion(checkpointId, brief.versionId())` with `templates.checkpoints(brief.versionId()).stream().findFirst()` (a lookup that ignores the id). Run `./mvnw test -Dtest=SignoffScopeTest#theTeacherCantSignOffAnotherSubjectsOrAMadeUpCheckpoint` → **FAIL**. Restore; run again → PASS. Record both bite results in the commit message body.

- [ ] **Step 5: Commit.** `git add -A backend && git commit -m "Prove only the class's teacher reaches the grid and sign-offs, for approved students and their own checkpoints"` with a body: `Bite-tested: removing the approved-student check fails the pending/removed case; ignoring the checkpoint id fails the other-subject case.`

---

## Task 12: The student sees "Your teacher signed this off"

**Files:**
- Modify: `backend/src/main/java/ie/coursework/components/application/ComponentViews.java:40`
- Modify: `backend/src/main/java/ie/coursework/components/application/ComponentService.java` (constructor, `studentView`)
- Modify: `backend/src/test/java/ie/coursework/components/application/ComponentServiceOwnedTest.java:37-39`
- Modify: `backend/src/test/java/ie/coursework/components/adapter/web/StudentComponentViewTest.java`
- Modify: `frontend/lib/api/schemas.ts:132,144`, `frontend/components/app/stage-card.tsx`, `frontend/components/app/stage-card.spec.tsx`

- [ ] **Step 1: Write the failing backend test** (append to `StudentComponentViewTest`; its stage 3 is dated 25 Sep and today is 12 Oct):

```java
    @Test
    void aSignedOffCheckpointSaysSoWithItsDublinDate() throws Exception {
        UUID stage3 = components.checkpointId(BIO, 3);
        UUID studentId = jdbcTemplate.queryForObject("SELECT id FROM app_user WHERE last_name = ?", UUID.class, ClassFixtures.APPROVED_STUDENT);
        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .put("/api/v1/components/" + component + "/students/" + studentId + "/checkpoints/" + stage3 + "/signoff",
                        "{\"signedOff\":true}")
                .andExpect(status().isOk());
        student().get("/api/v1/components/" + component)
                .andExpect(jsonPath("$.stages[2].checkpoint.state").value("SIGNED_OFF"))
                .andExpect(jsonPath("$.stages[2].checkpoint.signedOffOn").value("2026-10-12"))
                .andExpect(jsonPath("$.stages[3].checkpoint.signedOffOn").value(nullValue()));
    }
```

- [ ] **Step 2: Run** `./mvnw test -Dtest=StudentComponentViewTest` → FAIL (`state` is `DUE`, no `signedOffOn`).

- [ ] **Step 3: Implement.** `ComponentViews.java:40`:

```java
    public record CheckpointView(String text, CheckpointState state, LocalDate signedOffOn) {}
```

`ComponentService`: add `SignoffRepository signoffs` as a constructor parameter after `ItemTickRepository ticks` (field, assignment). In `studentView`, replace the `checkpoints` map and the `StudentStage` checkpoint argument:

```java
        Map<UUID, TemplateCheckpoint> checkpoints = templates.checkpoints(brief.versionId()).stream()
                .collect(Collectors.toMap(TemplateCheckpoint::stageId, c -> c, (first, later) -> first));
        Map<UUID, Instant> signedOff = signoffs.forStudent(component.id(), actor.userId()).stream()
                .filter(Signoff::live).collect(Collectors.toMap(Signoff::checkpointId, Signoff::signedOffAt));
```

```java
            TemplateCheckpoint checkpoint = checkpoints.get(s.id());
            Instant at = checkpoint == null ? null : signedOff.get(checkpoint.id());
            ...
                    checkpoint == null ? null : new CheckpointView(checkpoint.text(), CheckpointState.at(due, today, at != null),
                            at == null ? null : DublinDate.of(at)),
```

(remove the old `String checkpoint = checkpoints.get(s.id());` line; import `SignoffRepository` and `Signoff`.) In `ComponentServiceOwnedTest.java:39` add `mock(SignoffRepository.class),` after `mock(ItemTickRepository.class),` and import it.

- [ ] **Step 4: Run** `./mvnw test -Dtest='StudentComponentViewTest,ComponentServiceOwnedTest,ComponentScopeTest'` → PASS.

- [ ] **Step 5: Write the failing frontend spec** (append to `stage-card.spec.tsx`):

```tsx
  it("says the teacher signed a checkpoint off, with the date, and drops the nudge", () => {
    const stage = { ...baseStage, checkpoint: { text: "Plan discussed with the teacher", state: "SIGNED_OFF" as const, signedOffOn: "2027-01-21" } };
    render(<StageCard componentId="k1" stage={stage} allStages={[stage]} state="current" open={true} onToggle={vi.fn()} />);
    expect(screen.getByText("Checkpoint · Signed off")).toBeInTheDocument();
    expect(screen.getByText("Your teacher signed this off on 21 Jan 2027.")).toBeInTheDocument();
    expect(screen.queryByText(/Bring it up in your next class/)).not.toBeInTheDocument();
  });
```

Add `signedOffOn: null` to the two existing checkpoint fixtures in this spec (lines 48, 58), and to `component-overview.spec.tsx:17,32`.

- [ ] **Step 6: Run** `cd frontend && npx vitest run components/app/stage-card.spec.tsx` → FAIL (type error or missing text).

- [ ] **Step 7: Implement.** `schemas.ts`:

```ts
export const checkpointStateSchema = z.enum(["NOT_DUE", "DUE", "SIGNED_OFF"]);
```

and in `studentStageSchema`: `checkpoint: z.object({ text: z.string(), state: checkpointStateSchema, signedOffOn: z.string().nullable() }).nullable(),`.

`stage-card.tsx`: `const CHECKPOINT_WORD = { NOT_DUE: "Not due yet", DUE: "Not signed off yet", SIGNED_OFF: "Signed off" } as const;`, add `const signedOff = s.checkpoint?.state === "SIGNED_OFF";`, and render the box per D-7 (done ground, 3px green edge, green label, the sentence):

```tsx
            {s.checkpoint && (
              <div className={`flex flex-col gap-0.5 rounded-app-inner p-3 ${checkpointDue ? "bg-app-attention-tint" : signedOff ? "border-l-[3px] border-l-app-signed bg-app-done-ground" : "bg-app-inset"}`}>
                <span className={`${eyebrow} ${signedOff ? "text-app-signed" : ""}`}>Checkpoint · {CHECKPOINT_WORD[s.checkpoint.state]}</span>
                <span className="text-app-base text-app-ink">{s.checkpoint.text}</span>
                {checkpointDue && (
                  <span className="text-app-small text-app-grey">{"Your teacher signs this off. Bring it up in your next class."}</span>
                )}
                {signedOff && s.checkpoint.signedOffOn ? (
                  <span className="text-app-small text-app-signed">{`Your teacher signed this off on ${formatCalendarDate(s.checkpoint.signedOffOn)}.`}</span>
                ) : (
                  <span className="text-app-small text-app-grey">Only your teacher can sign this off.</span>
                )}
              </div>
            )}
```

`--color-app-signed` arrives in Task 13; until then add it now to `globals.css`'s `@theme` block as `--color-app-signed: var(--app-signed);` and to `:root` as `--app-signed: var(--app-done);` (Task 13 adds the rest and its comment).

- [ ] **Step 8: Run** `npx vitest run components/app && npx tsc --noEmit && cd .. && make verify` → PASS.

- [ ] **Step 9: Commit.** `git add -A && git commit -m "Show the student when their teacher signed a checkpoint off"`

---

## Task 13: D-7's tokens and the Hide names rule

**Files:**
- Modify: `frontend/app/globals.css`

Tokens first, one commit (UI-STANDARDS §15 step 2). CSS has no unit test here; the specs and e2e in later tasks exercise it, and `make verify` builds it.

- [ ] **Step 1: Add to the `@theme` block** (beside the D-6 colours; `--color-app-signed` is already there from Task 12):

```css
  --color-app-due: var(--app-due);
  --color-app-due-tint: var(--app-due-tint);
  --color-app-due-row: var(--app-due-row);
  --color-app-signed-recent: var(--app-signed-recent);
  --text-app-behind:    36px; /* pack D-7 — band numeral, laptop */
  --text-app-behind-sm: 32px; /* pack D-7 — band numeral, phone */
```

- [ ] **Step 2: Add to `:root`** (after the D-6 block), from `docs/design/pilot/D-7-progress-grid/tokens.css`. Replace Task 12's one-line `--app-signed` with this block:

```css
  /* Pack D-7 — progress grid. "Due, not signed off" is pending work, so it is attention amber (aliases, named so
     the grid can change them without touching the pending badge). A signed-off checkpoint is a settled fact: done green. */
  --app-due: var(--app-attention);       /* 6.13:1 on white; 5.31:1 on --app-due-tint; 5.77:1 on --app-ground */
  --app-due-tint: var(--app-attention-tint); /* navy "Sign off" on it 9.62:1 */
  --app-due-row: #FCF8F5;                /* due row on the student view; ink 17.50:1, amber 5.81:1, muted 5.11:1 */
  --app-signed: var(--app-done);         /* 8.04:1 on white; 7.36:1 on --app-done-ground */
  --app-signed-recent: var(--app-done-ground); /* a cell signed off this visit (offers Undo); navy on it 10.18:1 */
  --app-hide-blur: 7px;                  /* Hide names: unreadable from the back of a room at 1140 on a projector */
```

- [ ] **Step 3: Add the blur rule** (P4-28) at the end of the file:

```css
/* Pack D-7, plan P4-16 and P4-28: Hide names blurs whatever a component marks data-private (names, dates, log
   lines, counts). Visual only: accessible names are untouched. In a layer so a utility can still override it. */
@layer components {
  .app-hide-names [data-private] {
    filter: blur(var(--app-hide-blur));
  }
}
```

- [ ] **Step 4: Run** `cd frontend && npx next build >/dev/null && echo ok` → `ok`.

- [ ] **Step 5: Commit.** `git commit -am "Add pack D-7's tokens and the Hide names blur"`

---

## Task 14: Schemas and the grid's pure helpers

**Files:**
- Modify: `frontend/lib/api/schemas.ts` (after the Phase 3 schemas)
- Create: `frontend/lib/app/progress.ts`, `frontend/lib/app/progress.test.ts`

- [ ] **Step 1: Add the schemas** (mirroring `ProgressViews` field for field):

```ts
// Phase 4 — mirrors progress/application/ProgressViews.
export const progressCellSchema = z.object({ checkpointId: z.string(), state: checkpointStateSchema, signedOffOn: z.string().nullable() });
export type ProgressCell = z.infer<typeof progressCellSchema>;

export const gridStageSchema = z.object({
  stageId: z.string(),
  ordinal: z.number(),
  label: z.string().nullable(),
  name: z.string(),
  dueDate: z.string().nullable(),
  checkpoint: z.object({ id: z.string(), text: z.string() }).nullable(),
});
export type GridStage = z.infer<typeof gridStageSchema>;

export const progressStudentSchema = z.object({
  studentId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  behindBy: z.number(),
  lastLogActivityOn: z.string().nullable(),
  daysSinceLastLogActivity: z.number().nullable(),
  cells: z.array(progressCellSchema),
});
export type ProgressStudent = z.infer<typeof progressStudentSchema>;

export const progressGridSchema = z.object({
  componentId: z.string(),
  classId: z.string(),
  className: z.string(),
  today: z.string(),
  stages: z.array(gridStageSchema),
  students: z.array(progressStudentSchema),
});
export type ProgressGrid = z.infer<typeof progressGridSchema>;

export const studentCheckpointsSchema = z.object({
  studentId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  today: z.string(),
  behindBy: z.number(),
  lastLogActivityOn: z.string().nullable(),
  daysSinceLastLogActivity: z.number().nullable(),
  stages: z.array(gridStageSchema.extend({
    checkpoint: z.object({ id: z.string(), text: z.string() }),
    state: checkpointStateSchema,
    signedOffOn: z.string().nullable(),
    history: z.array(z.object({ signedOffOn: z.string(), revokedOn: z.string(), revokedBy: z.string() })),
  })),
});
export type StudentCheckpoints = z.infer<typeof studentCheckpointsSchema>;
```

- [ ] **Step 2: Write the failing test** `lib/app/progress.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import type { GridStage, ProgressGrid, ProgressStudent } from "../api/schemas.ts";
import {
  bandHeading, bands, behindWords, CHECKPOINT_SHORT, doneSentence, failSentence, inOrder, isQuiet, lastEntryWords, latestDueKey,
  listStages, missingText, parseStage, pickName, revokeQuestion, shortCheckpoint, stageKey, stageLabel, studentCount, summary,
} from "./progress.ts";

const stage = (ordinal: number, dueDate: string | null, text: string | null, label: string | null = `Stage ${ordinal}`): GridStage => ({
  stageId: `s${ordinal}`, ordinal, label, name: `Name ${ordinal}`, dueDate, checkpoint: text ? { id: `c${ordinal}`, text } : null,
});
const student = (id: string, behindBy: number, states: ProgressStudent["cells"][number]["state"][], days: number | null = 3): ProgressStudent => ({
  studentId: id, firstName: "Aoife", lastName: id, behindBy, lastLogActivityOn: null, daysSinceLastLogActivity: days,
  cells: states.map((state, i) => ({ checkpointId: `c${i + 1}`, state, signedOffOn: state === "SIGNED_OFF" ? "2026-10-02" : null })),
});
const grid = (stages: GridStage[], students: ProgressStudent[], today = "2026-12-14"): ProgressGrid => ({
  componentId: "k", classId: "cl", className: "6A Biology", today, stages, students,
});
const BIO = [
  stage(1, "2026-10-02", "Initial ideas discussed with the teacher"),
  stage(2, "2026-11-06", "Investigative log shared with the teacher"),
  stage(3, "2026-12-11", "Plan discussed with the teacher (feasibility and safety)"),
  stage(4, "2027-02-12", "Experiment carried out under supervision, in line with the research and planning already shared"),
];

test("every short column header is a cut of its checkpoint, never a rewording (plan P4-23)", () => {
  for (const [full, short] of Object.entries(CHECKPOINT_SHORT)) assert.ok(full.startsWith(short), `${short} / ${full}`);
  assert.equal(shortCheckpoint("Plan discussed with the teacher (feasibility and safety)"), "Plan discussed");
  assert.equal(shortCheckpoint("A checkpoint nobody has seen before"), "A checkpoint nobody");
});

test("stages are keyed by ordinal, and the unlabelled compilation stage is R, 'Report' (plan P4-24)", () => {
  assert.equal(stageKey(stage(3, null, "x")), "3");
  assert.equal(stageKey(stage(7, null, "x", null)), "R");
  assert.equal(stageLabel(stage(7, null, "x", null)), "Report");
  assert.equal(listStages([BIO[0], BIO[1], BIO[2]]), "Stages 1, 2 and 3");
  assert.equal(listStages([BIO[1]]), "Stage 2");
  assert.equal(listStages([stage(5, null, "x"), stage(7, null, "x", null)]), "Stage 5 and Report");
});

test("the answer line: behind, up to date, nothing due, no dates (pack D-7)", () => {
  const behind = summary(grid(BIO, [student("a", 2, ["DUE", "DUE", "SIGNED_OFF", "NOT_DUE"]), student("b", 0, ["SIGNED_OFF", "SIGNED_OFF", "SIGNED_OFF", "NOT_DUE"])]));
  assert.deepEqual(behind, { kind: "behind", behind: 1, total: 2, due: "Stages 1, 2 and 3", dueCount: 3, noCheckpoint: [] });
  const upToDate = summary(grid(BIO, [student("b", 0, ["SIGNED_OFF", "SIGNED_OFF", "SIGNED_OFF", "NOT_DUE"])]));
  assert.deepEqual(upToDate, { kind: "upToDate", total: 1, due: "Stages 1, 2 and 3", next: { label: "Stage 4", date: "12 Feb 2027" } });
  assert.deepEqual(summary(grid(BIO, [], "2026-09-01")), { kind: "nothingDue", next: { label: "Stage 1", date: "2 Oct 2026" } });
  assert.deepEqual(summary(grid([stage(1, null, "x")], [])), { kind: "noDates" });
  const business = summary(grid([stage(5, "2026-12-01", "x"), stage(6, "2026-12-02", null)], [student("a", 1, ["DUE"])]));
  assert.equal(business.kind === "behind" && business.noCheckpoint[0], "Stage 6");
});

test("bands group consecutive rows by how far behind, and read in words (pack D-7)", () => {
  const rows = [student("a", 3, []), student("b", 3, []), student("c", 1, []), student("d", 0, [])];
  assert.deepEqual(bands(rows).map((b) => [b.behindBy, b.students.map((s) => s.studentId)]), [[3, ["a", "b"]], [1, ["c"]], [0, ["d"]]]);
  assert.deepEqual(bands(rows, (s) => (s.studentId === "b" ? 3 : s.behindBy)).length, 3);
  assert.deepEqual(bandHeading(3), { numeral: "3", label: "checkpoints behind" });
  assert.deepEqual(bandHeading(1), { numeral: "1", label: "checkpoint behind" });
  assert.deepEqual(bandHeading(0), { numeral: null, label: "Up to date" });
  assert.equal(studentCount(1), "1 student");
  assert.equal(behindWords(2), "Behind by 2");
  assert.equal(behindWords(0), "Up to date");
});

test("log activity reads in words and is quiet at 14 days or with none", () => {
  assert.equal(lastEntryWords(null), "No entries yet");
  assert.equal(lastEntryWords(0), "Last entry today");
  assert.equal(lastEntryWords(1), "Last entry yesterday");
  assert.equal(lastEntryWords(12), "Last entry 12 days ago");
  assert.equal(isQuiet(13), false);
  assert.equal(isQuiet(14), true);
  assert.equal(isQuiet(null), true);
});

test("a student's missing checkpoints, for the phone's All view", () => {
  const g = grid(BIO, []);
  assert.equal(missingText(student("a", 2, ["SIGNED_OFF", "DUE", "DUE", "NOT_DUE"]), g), "Not signed off: Stages 2 and 3");
  assert.equal(missingText(student("a", 0, ["SIGNED_OFF", "SIGNED_OFF", "SIGNED_OFF", "NOT_DUE"]), g), null);
});

test("stable order keeps the first-rendered order and puts newcomers last (plan P4-11)", () => {
  const rows = [student("b", 0, []), student("a", 1, []), student("new", 2, [])];
  assert.deepEqual(inOrder(rows, ["a", "b"]).map((s) => s.studentId), ["a", "b", "new"]);
});

test("the stage in the URL: valid keys only; the phone defaults to the latest due stage", () => {
  const g = grid(BIO, []);
  assert.equal(parseStage("3", g), "3");
  assert.equal(parseStage("all", g), "all");
  assert.equal(parseStage("9", g), null);
  assert.equal(parseStage(undefined, g), null);
  assert.equal(latestDueKey(g), "3");
  assert.equal(latestDueKey(grid(BIO, [], "2026-09-01")), "1");
  assert.equal(pickName(BIO[2], "2026-12-14"), "Stage 3, Plan discussed, 11 Dec 2026, due");
  assert.equal(pickName(BIO[3], "2026-12-14"), "Stage 4, Experiment carried out, 12 Feb 2027, not due");
});

test("the sentences a teacher hears and reads (pack D-7, plan P4-29)", () => {
  const plan = "Plan discussed with the teacher (feasibility and safety)";
  assert.equal(doneSentence("sign", plan, "Aoife Byrne"), `Signed off: ${plan}, for Aoife Byrne.`);
  assert.equal(doneSentence("undo", plan, "Aoife Byrne"), `Sign-off undone: ${plan}, for Aoife Byrne. It stays in the record.`);
  assert.equal(doneSentence("revoke", plan, "Aoife Byrne"), `Sign-off revoked: ${plan}, for Aoife Byrne. It stays in the record.`);
  assert.equal(failSentence("sign", plan, "Emma Nolan"), `Couldn’t sign off “${plan}” for Emma Nolan. Nothing changed. Check your connection and try again.`);
  assert.match(failSentence("revoke", plan, "Emma Nolan"), /^Couldn’t revoke the sign-off of “/);
  assert.equal(revokeQuestion(plan, "Aoife Byrne", "grid"), `Revoke the sign-off of “${plan}” for Aoife Byrne? It stays in the record as revoked by you.`);
  assert.equal(revokeQuestion(plan, "Cian Murphy", "student"), "Revoke this sign-off for Cian Murphy? It stays in the record as revoked by you.");
});
```

- [ ] **Step 3: Run** `cd frontend && node --test lib/app/progress.test.ts` → FAIL (no module).

- [ ] **Step 4: Implement** `lib/app/progress.ts`:

```ts
import type { GridStage, ProgressGrid, ProgressStudent } from "@/lib/api/schemas";

import { formatCalendarDate } from "./component-setup.ts";

/** The Hide names cookie (plan P4-15): read by the server so the first paint is already blurred. */
export const HIDE_NAMES_COOKIE = "app_hide_names";

type Staged = Pick<GridStage, "ordinal" | "label">;

/** `?stage=` key (plan P4-24). */
export function stageKey(stage: Staged): string {
  return stage.label === null ? "R" : String(stage.ordinal);
}

export function stageLabel(stage: Pick<GridStage, "label">): string {
  return stage.label ?? "Report";
}

/** Pack D-7's column headers: each a cut of its checkpoint's own words, never reworded (plan P4-23). */
export const CHECKPOINT_SHORT: Readonly<Record<string, string>> = {
  "Initial ideas discussed with the teacher": "Initial ideas",
  "Investigative log shared with the teacher": "Investigative log",
  "Plan discussed with the teacher (feasibility and safety)": "Plan discussed",
  "Experiment carried out under supervision, in line with the research and planning already shared": "Experiment carried out",
  "Data analysis shared with the teacher": "Data analysis",
  "Final report submitted to the teacher": "Final report",
  "Research question discussed with the teacher": "Research question",
  "Project plan shared with the teacher": "Project plan",
  "Research shared when the teacher asks": "Research shared",
  "Analysis and evaluation shared with the teacher": "Analysis and evaluation",
  "Final report submitted for review and authentication": "Final report",
};

export function shortCheckpoint(text: string): string {
  return CHECKPOINT_SHORT[text] ?? text.split(" ").slice(0, 3).join(" ");
}

type WithCheckpoint = GridStage & { checkpoint: NonNullable<GridStage["checkpoint"]> };

export function checkpointStages(grid: Pick<ProgressGrid, "stages">): WithCheckpoint[] {
  return grid.stages.filter((s): s is WithCheckpoint => s.checkpoint !== null);
}

const isDue = (stage: GridStage, today: string) => stage.dueDate !== null && stage.dueDate < today;

export function dueStages(grid: Pick<ProgressGrid, "stages" | "today">): WithCheckpoint[] {
  return checkpointStages(grid).filter((s) => isDue(s, grid.today));
}

function joinAnd(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "Stages 1, 2 and 3", "Stage 2", or labels joined when not all are numbered stages. */
export function listStages(stages: Pick<GridStage, "label">[]): string {
  const labels = stages.map(stageLabel);
  if (labels.length === 1) return labels[0];
  const numbers = labels.map((l) => /^Stage (\d+)$/.exec(l)?.[1]);
  return numbers.every(Boolean) ? `Stages ${joinAnd(numbers as string[])}` : joinAnd(labels);
}

type Next = { label: string; date: string } | null;
export type Summary =
  | { kind: "noDates" }
  | { kind: "nothingDue"; next: Next }
  | { kind: "upToDate"; total: number; due: string; next: Next }
  | { kind: "behind"; behind: number; total: number; due: string; dueCount: number; noCheckpoint: string[] };

/** The answer line (pack D-7): what the page is for, in one sentence. */
export function summary(grid: ProgressGrid): Summary {
  const stages = checkpointStages(grid);
  if (stages.every((s) => s.dueDate === null)) return { kind: "noDates" };
  const due = dueStages(grid);
  const upcoming = stages.filter((s) => s.dueDate !== null && !isDue(s, grid.today))
    .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))[0];
  const next = upcoming ? { label: stageLabel(upcoming), date: formatCalendarDate(upcoming.dueDate as string) } : null;
  if (due.length === 0) return { kind: "nothingDue", next };
  const behind = grid.students.filter((s) => s.behindBy > 0).length;
  if (behind === 0) return { kind: "upToDate", total: grid.students.length, due: listStages(due), next };
  return {
    kind: "behind", behind, total: grid.students.length, due: listStages(due), dueCount: due.length,
    noCheckpoint: grid.stages.filter((s) => s.checkpoint === null).map(stageLabel),
  };
}

export type Band = { behindBy: number; students: ProgressStudent[] };

/** Consecutive rows with the same band, in the order given. `bandOf` lets the grid keep the bands it loaded with. */
export function bands(students: ProgressStudent[], bandOf: (s: ProgressStudent) => number = (s) => s.behindBy): Band[] {
  const out: Band[] = [];
  for (const s of students) {
    const b = bandOf(s);
    if (out.length > 0 && out[out.length - 1].behindBy === b) out[out.length - 1].students.push(s);
    else out.push({ behindBy: b, students: [s] });
  }
  return out;
}

export function bandHeading(behindBy: number): { numeral: string | null; label: string } {
  if (behindBy === 0) return { numeral: null, label: "Up to date" };
  return { numeral: String(behindBy), label: behindBy === 1 ? "checkpoint behind" : "checkpoints behind" };
}

export const studentCount = (n: number) => `${n} ${n === 1 ? "student" : "students"}`;
export const behindWords = (n: number) => (n === 0 ? "Up to date" : `Behind by ${n}`);
export const fullName = (s: { firstName: string; lastName: string }) => `${s.firstName} ${s.lastName}`;

export function lastEntryWords(days: number | null): string {
  if (days === null) return "No entries yet";
  if (days === 0) return "Last entry today";
  if (days === 1) return "Last entry yesterday";
  return `Last entry ${days} days ago`;
}

/** Pack D-7: at 14 days or more, or with no entries, the log line goes ink and 600 weight. Never amber. */
export const isQuiet = (days: number | null) => days === null || days >= 14;

export function missingText(student: ProgressStudent, grid: Pick<ProgressGrid, "stages">): string | null {
  const missing = checkpointStages(grid).filter((_, i) => student.cells[i]?.state === "DUE");
  return missing.length === 0 ? null : `Not signed off: ${listStages(missing)}`;
}

/** Plan P4-11: lay rows out in the order first rendered; anyone new goes last, in server order. */
export function inOrder<T extends { studentId: string }>(students: T[], order: string[]): T[] {
  const at = new Map(order.map((id, i) => [id, i]));
  return [...students].sort((a, b) => (at.get(a.studentId) ?? order.length) - (at.get(b.studentId) ?? order.length));
}

export function parseStage(param: string | undefined, grid: Pick<ProgressGrid, "stages">): string | null {
  if (param === "all") return "all";
  return checkpointStages(grid).some((s) => stageKey(s) === param) ? (param as string) : null;
}

/** Pack D-7: the phone opens on the latest due stage, else the first stage with a checkpoint. */
export function latestDueKey(grid: Pick<ProgressGrid, "stages" | "today">): string {
  const due = dueStages(grid);
  const stage = due[due.length - 1] ?? checkpointStages(grid)[0];
  return stage ? stageKey(stage) : "all";
}

export function stageStateWord(stage: GridStage, today: string): "Due" | "Not due" | "No date" {
  if (stage.dueDate === null) return "No date";
  return isDue(stage, today) ? "Due" : "Not due";
}

export function pickName(stage: WithCheckpoint, today: string): string {
  const date = stage.dueDate ? formatCalendarDate(stage.dueDate) : "no date set";
  return `${stageLabel(stage)}, ${shortCheckpoint(stage.checkpoint.text)}, ${date}, ${stageStateWord(stage, today).toLowerCase()}`;
}

export type SignoffAction = "sign" | "undo" | "revoke";

export const signName = (text: string, name: string) => `Sign off ${text} for ${name}`;
export const undoName = (text: string, name: string) => `Undo sign-off of ${text} for ${name}`;
export const revokeName = (text: string, name: string) => `Revoke sign-off of ${text} for ${name}`;
export const keepName = (text: string, name: string) => `Keep sign-off of ${text} for ${name}`;

export function doneSentence(action: SignoffAction, text: string, name: string): string {
  if (action === "sign") return `Signed off: ${text}, for ${name}.`;
  return `Sign-off ${action === "undo" ? "undone" : "revoked"}: ${text}, for ${name}. It stays in the record.`;
}

export function failSentence(action: SignoffAction, text: string, name: string): string {
  const verb = action === "sign" ? "sign off" : action === "undo" ? "undo the sign-off of" : "revoke the sign-off of";
  return `Couldn’t ${verb} “${text}” for ${name}. Nothing changed. Check your connection and try again.`;
}

export function revokeQuestion(text: string, name: string, where: "grid" | "student"): string {
  return where === "grid"
    ? `Revoke the sign-off of “${text}” for ${name}? It stays in the record as revoked by you.`
    : `Revoke this sign-off for ${name}? It stays in the record as revoked by you.`;
}
```

- [ ] **Step 5: Run** `node --test lib/app/progress.test.ts && npx tsc --noEmit` → PASS. The test imports `../api/schemas.ts` for types only; if `node --test` can't load `schemas.ts` because of its `zod` import, change that import to `import type` (already so) and check it's erased. Other `lib/app/*.test.ts` files do the same.

- [ ] **Step 6: Commit.** `git add -A frontend && git commit -m "Add the progress schemas and the grid's words, bands, order and stage keys"`

---

## Task 15: The Progress tab is live

**Files:**
- Modify: `frontend/components/app/class-header.spec.tsx`, then `frontend/components/app/class-header.tsx`

Roadmap §6.3 rule 3: a design that changes a control changes its spec first, in its own commit.

- [ ] **Step 1: Change the spec** (replace the last two assertions of the first test, and add a test):

```tsx
    expect(tabs).toHaveTextContent("Progress");
    expect(screen.getByRole("link", { name: "Progress" })).toHaveAttribute("href", "/teach/classes/c1/progress");
  });

  it("marks Progress current on the Progress tab (pack D-7)", () => {
    render(<ClassHeader detail={detail} current="progress" />);
    expect(screen.getByRole("link", { name: "Progress" })).toHaveAttribute("aria-current", "page");
  });
```

- [ ] **Step 2: Run** `npx vitest run components/app/class-header.spec.tsx` → FAIL (Progress isn't a link). Commit the spec alone: `git commit -am "Pack D-7 makes Progress a live class tab: change its spec first"`.

- [ ] **Step 3: Implement** in `class-header.tsx`: `export type ClassTab = "students" | "component" | "progress";`, add `{ key: "progress", label: "Progress", href: `/teach/classes/${detail.id}/progress` }` to `tabs`, delete the disabled `<span aria-disabled="true">Progress</span>`, and change the doc comment's last sentence to "Progress arrived in Phase 4 (pack D-7)."

- [ ] **Step 4: Run** `npx vitest run components/app && npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit.** `git commit -am "Make Progress a live class tab"`

---

## Task 16: Sign off, undo and revoke: the hook and the cell

**Files:**
- Create: `frontend/components/app/use-signoffs.ts`
- Create: `frontend/components/app/signoff-parts.tsx`, `frontend/components/app/signoff-parts.spec.tsx`

The hook holds what's busy, which sign-offs this visit made (they offer Undo), which cell is asking to revoke, the last failure, the live-region sentence and the change count for Re-sort. Both teacher pages use it. The parts are presentational. The hook is exercised through `ProgressGrid`'s and `StudentCheckpoints`' specs.

- [ ] **Step 1: Write the failing spec** `signoff-parts.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CheckpointCell, RevokeStrip, SignoffAlert } from "./signoff-parts";

const PLAN = "Plan discussed with the teacher (feasibility and safety)";
const names = { sign: `Sign off ${PLAN} for Aoife Byrne`, undo: `Undo sign-off of ${PLAN} for Aoife Byrne`, revoke: `Revoke sign-off of ${PLAN} for Aoife Byrne` };
const cell = (state: "DUE" | "NOT_DUE" | "SIGNED_OFF") => ({ checkpointId: "c3", state, signedOffOn: state === "SIGNED_OFF" ? "2026-10-02" : null });
const base = { names, busy: null, recent: false, confirming: false, onSign: vi.fn(), onUndo: vi.fn(), onAsk: vi.fn() };

describe("CheckpointCell", () => {
  it("in the grid, a due cell says Due and signs off in one click", async () => {
    const onSign = vi.fn();
    render(<CheckpointCell {...base} layout="grid" cell={cell("DUE")} onSign={onSign} />);
    await userEvent.click(screen.getByRole("button", { name: names.sign }));
    expect(onSign).toHaveBeenCalled();
    expect(screen.getByText("Due")).toBeInTheDocument();
  });

  it("a signed-off cell shows its date and opens the revoke question", async () => {
    const onAsk = vi.fn();
    render(<CheckpointCell {...base} layout="grid" cell={cell("SIGNED_OFF")} onAsk={onAsk} />);
    expect(screen.getByText("2 Oct 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: names.revoke }));
    expect(onAsk).toHaveBeenCalled();
  });

  it("a sign-off from this visit offers Undo instead", () => {
    render(<CheckpointCell {...base} layout="one" cell={cell("SIGNED_OFF")} recent />);
    expect(screen.getByText("Signed off today")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: names.undo })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: names.revoke })).not.toBeInTheDocument();
  });

  it("while busy the control is disabled and says what it's doing", () => {
    render(<CheckpointCell {...base} layout="one" cell={cell("NOT_DUE")} busy="sign" />);
    expect(screen.getByRole("button", { name: names.sign })).toBeDisabled();
    expect(screen.getByText("Signing off…")).toBeInTheDocument();
  });

  it("in a one-stage view a due cell says so in full", () => {
    render(<CheckpointCell {...base} layout="one" cell={cell("DUE")} />);
    expect(screen.getByText("Due, not signed off")).toBeInTheDocument();
  });

  it("while its revoke question is open the cell isn't a second Revoke button", () => {
    render(<CheckpointCell {...base} layout="grid" cell={cell("SIGNED_OFF")} confirming />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Revoke?")).toBeInTheDocument();
  });
});

describe("RevokeStrip and SignoffAlert", () => {
  it("names both answers in full, with short visible labels", async () => {
    const onRevoke = vi.fn();
    render(<RevokeStrip question="Revoke?" text={PLAN} name="Aoife Byrne" busy={false} onRevoke={onRevoke} onKeep={vi.fn()} />);
    expect(screen.getByRole("button", { name: `Keep sign-off of ${PLAN} for Aoife Byrne` })).toHaveTextContent("Keep sign-off");
    await userEvent.click(screen.getByRole("button", { name: `Revoke sign-off of ${PLAN} for Aoife Byrne` }));
    expect(onRevoke).toHaveBeenCalled();
  });

  it("a failure is an alert with Try again", async () => {
    const onRetry = vi.fn();
    render(<SignoffAlert message="Couldn’t sign off." onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t sign off.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run components/app/signoff-parts.spec.tsx` → FAIL (no module).

- [ ] **Step 3: Implement** `use-signoffs.ts`:

```ts
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/api/client";
import { progressCellSchema } from "@/lib/api/schemas";
import { doneSentence, fullName, type SignoffAction } from "@/lib/app/progress";

export type SignoffTarget = {
  student: { studentId: string; firstName: string; lastName: string };
  checkpoint: { id: string; text: string };
};

export const targetKey = (t: SignoffTarget) => `${t.student.studentId}/${t.checkpoint.id}`;

/**
 * Sign off, undo and revoke for one component (pack D-7). Each is the same idempotent PUT (plan P4-6); the page
 * refreshes from the server afterwards. `recent` is this visit's sign-offs, which offer Undo until `resetVisit`
 * (Re-sort) or a reload (plan P4-26); `changes` counts for the Re-sort button.
 */
export function useSignoffs(componentId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<{ key: string; action: SignoffAction } | null>(null);
  const [recent, setRecent] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ target: SignoffTarget; action: SignoffAction } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [changes, setChanges] = useState(0);

  async function run(target: SignoffTarget, action: SignoffAction) {
    const key = targetKey(target);
    setBusy({ key, action });
    setFailed(null);
    setConfirming(null);
    setAnnouncement("");
    try {
      await api.send("PUT", `/components/${componentId}/students/${target.student.studentId}/checkpoints/${target.checkpoint.id}/signoff`,
        { signedOff: action === "sign" }, progressCellSchema);
      setRecent((prev) => {
        const next = new Set(prev);
        if (action === "sign") next.add(key);
        else next.delete(key);
        return next;
      });
      setChanges((n) => n + 1);
      setAnnouncement(doneSentence(action, target.checkpoint.text, fullName(target.student)));
      router.refresh();
    } catch {
      // The alert under the row (role="alert") announces the failure itself.
      setFailed({ target, action });
    } finally {
      setBusy(null);
    }
  }

  return {
    busy, recent, confirming, failed, announcement, changes,
    signOff: (t: SignoffTarget) => run(t, "sign"),
    undo: (t: SignoffTarget) => run(t, "undo"),
    revoke: (t: SignoffTarget) => run(t, "revoke"),
    askRevoke: (t: SignoffTarget) => { setFailed(null); setConfirming(targetKey(t)); },
    keep: () => setConfirming(null),
    retry: () => { if (failed) void run(failed.target, failed.action); },
    resetVisit: () => { setRecent(new Set()); setChanges(0); },
  };
}

export type Signoffs = ReturnType<typeof useSignoffs>;
```

`signoff-parts.tsx`:

```tsx
import type { ProgressCell } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { keepName, revokeName, type SignoffAction } from "@/lib/app/progress";

import { Button } from "@/components/ui/button";

const BUSY: Record<SignoffAction, string> = { sign: "Signing off…", undo: "Undoing…", revoke: "Revoking…" };
const GRID_BUTTON = "flex min-h-12 w-full flex-col items-start justify-center gap-0.5 rounded-app-control px-2.5 py-1.5 text-left touch-manipulation disabled:cursor-not-allowed";

type CellProps = {
  layout: "grid" | "one";
  cell: ProgressCell;
  names: { sign: string; undo: string; revoke: string };
  busy: SignoffAction | null;
  recent: boolean;
  confirming: boolean;
  onSign: () => void;
  onUndo: () => void;
  onAsk: () => void;
};

/**
 * One checkpoint for one student (pack D-7). In the grid a cell is one button carrying its state word; in a
 * one-stage view or on the student page the state is words beside a separate button. Every button's name says
 * the checkpoint and the student, because thirty buttons called "Sign off" would be useless to a screen reader.
 */
export function CheckpointCell({ layout, cell, names, busy, recent, confirming, onSign, onUndo, onAsk }: CellProps) {
  const date = cell.signedOffOn ? <span data-private>{formatCalendarDate(cell.signedOffOn)}</span> : null;

  if (confirming) {
    return layout === "grid"
      ? <div className="flex flex-col px-2.5 py-1.5 text-app-small"><span className="font-semibold text-app-error">Revoke?</span><span className="text-app-grey">Confirm below</span></div>
      : <p className="text-app-small font-semibold text-app-error">Revoke this sign-off?</p>;
  }

  if (cell.state === "SIGNED_OFF" && recent) {
    return (
      <div className={`flex flex-wrap items-center gap-2 bg-app-signed-recent ${layout === "grid" ? "min-h-12 px-2.5" : "rounded-app-inner px-3 py-2"}`}>
        <span className="text-app-small font-semibold text-app-signed">Signed off today</span>
        <Button type="button" variant="link" aria-label={names.undo} disabled={busy !== null} onClick={onUndo}
          className="min-h-11 px-1">{busy === "undo" ? BUSY.undo : "Undo"}</Button>
      </div>
    );
  }

  if (layout === "grid") {
    if (cell.state === "SIGNED_OFF") {
      return (
        <button type="button" aria-label={names.revoke} disabled={busy !== null} onClick={onAsk} className={`${GRID_BUTTON} hover:bg-app-inset`}>
          <span className="text-app-small font-semibold text-app-signed">{busy === "revoke" ? BUSY.revoke : "Signed off"}</span>
          <span className="font-mono text-app-label text-app-grey">{date}</span>
        </button>
      );
    }
    const due = cell.state === "DUE";
    return (
      <button type="button" aria-label={names.sign} disabled={busy !== null} onClick={onSign}
        className={`${GRID_BUTTON} ${due ? "bg-app-due-tint hover:bg-app-attention-tint" : "hover:bg-app-inset"}`}>
        <span className={`text-app-small font-semibold ${due ? "text-app-due" : "text-app-muted"}`}>{due ? "Due" : "Not due yet"}</span>
        <span className="text-app-small font-semibold text-app-accent">{busy === "sign" ? BUSY.sign : "Sign off"}</span>
      </button>
    );
  }

  const settled = cell.state === "SIGNED_OFF";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className={`text-app-small ${cell.state === "DUE" ? "font-semibold text-app-due" : settled ? "text-app-signed" : "text-app-muted"}`}>
        {settled ? <><strong>Signed off</strong> {date}</> : cell.state === "DUE" ? "Due, not signed off" : "Not due yet"}
      </span>
      <Button type="button" variant="outline" aria-label={settled ? names.revoke : names.sign} disabled={busy !== null}
        onClick={settled ? onAsk : onSign} className="min-h-11 text-app-accent">
        {busy ? BUSY[busy] : settled ? "Revoke" : "Sign off"}
      </Button>
    </div>
  );
}

/** Pack D-2's in-place confirmation. Short visible labels; full names so two open strips can't be confused. */
export function RevokeStrip({ question, text, name, busy, onRevoke, onKeep }:
  { question: string; text: string; name: string; busy: boolean; onRevoke: () => void; onKeep: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-app-inner border border-app-error/30 bg-app-error-tint px-4 py-3">
      <p className="min-w-0 flex-1 text-app-small text-app-copy">{question}</p>
      <Button type="button" variant="confirmDestructive" aria-label={revokeName(text, name)} disabled={busy} onClick={onRevoke}>
        {busy ? "Revoking…" : "Revoke"}
      </Button>
      <Button type="button" variant="outline" aria-label={keepName(text, name)} disabled={busy} onClick={onKeep}>Keep sign-off</Button>
    </div>
  );
}

/** Pack D-1's compact alert, under the row, with Try again. The cell is unchanged. */
export function SignoffAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-app-inner border border-app-error/30 border-l-4 border-l-app-error bg-app-error-tint px-4 py-3">
      <span aria-hidden className="flex size-5 flex-none items-center justify-center rounded-full bg-app-error text-app-label font-bold text-app-surface">!</span>
      <span className="min-w-0 flex-1 text-app-small text-app-copy">{message}</span>
      <Button type="button" variant="outline" onClick={onRetry}>Try again</Button>
    </div>
  );
}
```

`Button`'s variants are `default`, `outline`, `destructive`, `confirmDestructive` (solid red, D-7's Revoke), `onAccent` and `link`; there is no `ghost` and no `sm` size. The class names follow `styles.ts` and D-5/D-6 components. Compare with `Progress tab.dc.html`'s cell styles and adjust spacing, not tokens.

- [ ] **Step 4: Run** `npx vitest run components/app/signoff-parts.spec.tsx && npx tsc --noEmit && npm run lint` → PASS.

- [ ] **Step 5: Commit.** `git add -A frontend && git commit -m "Add the sign-off cell, the in-place revoke question and the retry alert"`

---

## Task 17: The stage picker

**Files:**
- Create: `frontend/components/app/stage-picker.tsx`, `frontend/components/app/stage-picker.spec.tsx`

- [ ] **Step 1: Write the failing spec:**

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StagePicker } from "./stage-picker";

const stages = [
  { stageId: "s3", ordinal: 3, label: "Stage 3", name: "Plan", dueDate: "2026-12-11", checkpoint: { id: "c3", text: "Plan discussed with the teacher (feasibility and safety)" } },
  { stageId: "s6", ordinal: 6, label: "Stage 6", name: "Applying learning", dueDate: null, checkpoint: null },
  { stageId: "s7", ordinal: 7, label: null, name: "Compilation of the final report", dueDate: "2027-05-21", checkpoint: { id: "c7", text: "Final report submitted for review and authentication" } },
];

describe("StagePicker", () => {
  it("links each checkpoint's view in the URL and marks the current one", () => {
    render(<StagePicker stages={stages} today="2026-12-14" current="3" basePath="/teach/classes/c1/progress" variant="laptop" />);
    const nav = screen.getByRole("navigation", { name: "Checkpoint view" });
    expect(within(nav).getByRole("link", { name: "All stages" })).toHaveAttribute("href", "/teach/classes/c1/progress?stage=all");
    const three = within(nav).getByRole("link", { name: "Stage 3, Plan discussed, 11 Dec 2026, due" });
    expect(three).toHaveAttribute("aria-current", "true");
    expect(within(nav).getByRole("link", { name: /^Report, Final report/ })).toHaveAttribute("href", "/teach/classes/c1/progress?stage=R");
  });

  it("shows a stage with nothing to sign off but doesn't link it (pack D-7, plan P4-22)", () => {
    render(<StagePicker stages={stages} today="2026-12-14" current="all" basePath="/p" variant="laptop" />);
    expect(screen.getByText("Nothing to sign off")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Stage 6/ })).not.toBeInTheDocument();
  });

  it("on a phone the links are numbers with the same names", () => {
    render(<StagePicker stages={stages} today="2026-12-14" current="3" basePath="/p" variant="phone" />);
    expect(screen.getByRole("link", { name: "Stage 3, Plan discussed, 11 Dec 2026, due" })).toHaveTextContent("3");
  });
});
```

- [ ] **Step 2: Run** → FAIL (no module).

- [ ] **Step 3: Implement** `stage-picker.tsx`:

```tsx
import Link from "next/link";

import type { GridStage } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { pickName, shortCheckpoint, stageKey, stageLabel, stageStateWord } from "@/lib/app/progress";

import { eyebrow } from "./styles";

/** Pack D-7's checkpoint view: All stages, or one checkpoint, as URLs (not tabs: each choice is a page state). */
export function StagePicker({ stages, today, current, basePath, variant }:
  { stages: GridStage[]; today: string; current: string; basePath: string; variant: "laptop" | "phone" }) {
  const href = (key: string) => `${basePath}?stage=${key}`;
  const laptop = variant === "laptop";
  const item = laptop
    ? "flex min-h-[72px] flex-1 flex-col gap-0.5 rounded-app-control border px-3 py-2 text-left"
    : "flex size-11 min-h-12 items-center justify-center rounded-app-control border font-mono text-app-base font-bold";
  const state = (on: boolean) => (on ? "border-app-accent bg-app-accent-tint text-app-accent" : "border-app-field-border bg-app-surface text-app-ink hover:bg-app-inset");

  return (
    <nav aria-label="Checkpoint view" className="mt-5">
      <ul className={`flex ${laptop ? "gap-2" : "flex-wrap gap-1.5"}`}>
        <li className={laptop ? "flex flex-[1.3]" : ""}>
          <Link href={href("all")} aria-label="All stages" aria-current={current === "all" ? "true" : undefined} className={`${item} ${state(current === "all")}`}>
            {laptop ? <><span className={eyebrow}>All</span><span className="text-app-small font-semibold">All stages</span><span className="text-app-label text-app-grey">Every checkpoint</span></> : "All"}
          </Link>
        </li>
        {stages.map((s) => {
          const key = stageKey(s);
          if (!s.checkpoint) {
            return (
              <li key={s.stageId} className={laptop ? "flex flex-1" : ""}>
                <span aria-label={`${stageLabel(s)}, no checkpoint`} className={`${item} border-dashed border-app-field-border text-app-muted`}>
                  {laptop ? <><span className={eyebrow}>{stageLabel(s)}</span><span className="text-app-small">No checkpoint</span><span className="text-app-label">Nothing to sign off</span></> : s.ordinal}
                </span>
              </li>
            );
          }
          const on = current === key;
          return (
            <li key={s.stageId} className={laptop ? "flex flex-1" : ""}>
              <Link href={href(key)} aria-label={pickName({ ...s, checkpoint: s.checkpoint }, today)} aria-current={on ? "true" : undefined}
                className={`${item} ${state(on)}`}>
                {laptop ? (
                  <>
                    <span className={eyebrow}>{stageLabel(s)}</span>
                    <span className="text-app-small font-semibold">{shortCheckpoint(s.checkpoint.text)}</span>
                    <span className="font-mono text-app-label text-app-grey">{s.dueDate ? formatCalendarDate(s.dueDate) : "No date set"}</span>
                    <span className={`text-app-label font-semibold ${stageStateWord(s, today) === "Due" ? "text-app-due" : "text-app-muted"}`}>{stageStateWord(s, today)}</span>
                  </>
                ) : key}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

The laptop picker only shows "Nothing to sign off" on a stage without a checkpoint; the phone picker shows its number, unlinked. In the laptop spec, "Nothing to sign off" appears once.

- [ ] **Step 4: Run** `npx vitest run components/app/stage-picker.spec.tsx && npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit.** `git add -A frontend && git commit -m "Add the checkpoint view picker, one URL per stage"`

---

## Task 18: `ProgressGrid` — bands, both layouts, Re-sort and Hide names

**Files:**
- Create: `frontend/components/app/progress-grid.tsx`, `frontend/components/app/progress-grid.spec.tsx`

- [ ] **Step 1: Write the failing spec** `progress-grid.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";
import type { ProgressGrid as Grid } from "@/lib/api/schemas";

import { ProgressGrid } from "./progress-grid";

const INITIAL = "Initial ideas discussed with the teacher";
const LOG = "Investigative log shared with the teacher";
const row = (id: string, first: string, last: string, behindBy: number, s1: "DUE" | "SIGNED_OFF", days: number | null) => ({
  studentId: id, firstName: first, lastName: last, behindBy, lastLogActivityOn: null, daysSinceLastLogActivity: days,
  cells: [
    { checkpointId: "c1", state: s1, signedOffOn: s1 === "SIGNED_OFF" ? "2026-10-02" : null },
    { checkpointId: "c2", state: "DUE" as const, signedOffOn: null },
  ],
});
const grid = (students: Grid["students"]): Grid => ({
  componentId: "k1", classId: "cl1", className: "6A Biology", today: "2026-12-14",
  stages: [
    { stageId: "s1", ordinal: 1, label: "Stage 1", name: "Initial", dueDate: "2026-10-02", checkpoint: { id: "c1", text: INITIAL } },
    { stageId: "s2", ordinal: 2, label: "Stage 2", name: "Research", dueDate: "2026-11-06", checkpoint: { id: "c2", text: LOG } },
  ],
  students,
});
const START = grid([row("a", "Aoife", "Byrne", 2, "DUE", 20), row("c", "Cian", "Murphy", 1, "SIGNED_OFF", 3)]);
const props = { basePath: "/teach/classes/cl1/progress", laptopStage: "all", phoneStage: "2", hideNames: false };
const table = () => within(screen.getByRole("table", { name: /Checkpoint sign-offs for 6A Biology/ }));

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  document.cookie = "app_hide_names=; max-age=0; path=/";
});

describe("ProgressGrid", () => {
  it("answers first, then groups students into bands, furthest behind first", () => {
    render(<ProgressGrid grid={START} {...props} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("2 of 2 students are behind");
    expect(screen.getByText("Stages 1 and 2 are due. Furthest behind first.")).toBeInTheDocument();
    expect(table().getAllByRole("link", { name: /^(Aoife Byrne|Cian Murphy)$/ }).map((l) => l.textContent)).toEqual(["Aoife Byrne", "Cian Murphy"]);
    expect(table().getByText("checkpoints behind")).toBeInTheDocument();
    expect(table().getByRole("link", { name: "Aoife Byrne" })).toHaveAttribute("href", "/teach/classes/cl1/students/a");
    expect(table().getByText("Last entry 20 days ago")).toBeInTheDocument();
    expect(table().getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` })).toBeInTheDocument();
  });

  it("signs off in one click, announces it, offers Undo, and keeps the row where it was until Re-sort", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "c1", state: "SIGNED_OFF", signedOffOn: "2026-12-14" });
    const { rerender } = render(<ProgressGrid grid={START} {...props} />);
    await userEvent.click(table().getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/students/a/checkpoints/c1/signoff", { signedOff: true }, expect.anything());
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByText(`Signed off: ${INITIAL}, for Aoife Byrne.`)).toBeInTheDocument();

    // The server now has Aoife behind by 1 and Cian by 1; the page keeps Aoife first until Re-sort.
    const after = grid([row("c", "Cian", "Murphy", 1, "SIGNED_OFF", 3), { ...row("a", "Aoife", "Byrne", 1, "SIGNED_OFF", 20) }]);
    rerender(<ProgressGrid grid={after} {...props} />);
    expect(table().getAllByRole("link", { name: /Aoife Byrne|Cian Murphy/ }).map((l) => l.textContent)).toEqual(["Aoife Byrne", "Cian Murphy"]);
    expect(table().getByRole("button", { name: `Undo sign-off of ${INITIAL} for Aoife Byrne` })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Re-sort (1 change)" }));
    expect(table().queryByRole("button", { name: /Undo sign-off/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Re-sort/ })).not.toBeInTheDocument();
  });

  it("revokes only after the in-place question, and the question names both answers", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "c1", state: "DUE", signedOffOn: null });
    render(<ProgressGrid grid={START} {...props} />);
    await userEvent.click(table().getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Cian Murphy` }));
    expect(api.send).not.toHaveBeenCalled();
    expect(table().getByText(`Revoke the sign-off of “${INITIAL}” for Cian Murphy? It stays in the record as revoked by you.`)).toBeInTheDocument();
    await userEvent.click(table().getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Cian Murphy` }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/students/c/checkpoints/c1/signoff", { signedOff: false }, expect.anything());
  });

  it("a failed sign-off leaves the cell and offers Try again", async () => {
    vi.mocked(api.send).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ checkpointId: "c2", state: "SIGNED_OFF", signedOffOn: "2026-12-14" });
    render(<ProgressGrid grid={START} {...props} />);
    await userEvent.click(table().getByRole("button", { name: `Sign off ${LOG} for Cian Murphy` }));
    expect(table().getByRole("alert")).toHaveTextContent(`Couldn’t sign off “${LOG}” for Cian Murphy. Nothing changed.`);
    await userEvent.click(table().getByRole("button", { name: "Try again" }));
    expect(api.send).toHaveBeenCalledTimes(2);
  });

  it("Hide names blurs names and counts and is remembered in a cookie", async () => {
    const { container } = render(<ProgressGrid grid={START} {...props} />);
    const hide = screen.getByRole("switch", { name: "Hide names" });
    expect(hide).toHaveAttribute("aria-checked", "false");
    await userEvent.click(hide);
    expect(hide).toHaveAttribute("aria-checked", "true");
    expect(container.firstElementChild).toHaveClass("app-hide-names");
    expect(document.cookie).toContain("app_hide_names=1");
    expect(table().getByRole("link", { name: "Aoife Byrne" })).toHaveAttribute("data-private");
  });

  it("a one-stage view shows the full checkpoint and a Sign off per student", () => {
    render(<ProgressGrid grid={START} {...props} laptopStage="2" />);
    expect(table().getByRole("columnheader", { name: new RegExp(LOG) })).toBeInTheDocument();
    expect(table().getAllByText("Due, not signed off")).toHaveLength(2);
  });

  it("the phone list opens on its stage and, in All, says what's missing", () => {
    const { unmount } = render(<ProgressGrid grid={START} {...props} phoneStage="all" />);
    expect(within(screen.getByRole("region", { name: "Students" })).getByText("Not signed off: Stages 1 and 2")).toBeInTheDocument();
    unmount();
    render(<ProgressGrid grid={START} {...props} />);
    expect(within(screen.getByRole("region", { name: "Students" })).getByRole("button", { name: `Sign off ${LOG} for Aoife Byrne` })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run components/app/progress-grid.spec.tsx` → FAIL (no module).

- [ ] **Step 3: Implement** `progress-grid.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Fragment, type ReactNode, useState } from "react";

import type { GridStage, ProgressGrid as Grid, ProgressStudent } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import {
  bandHeading, bands, behindWords, checkpointStages, failSentence, fullName, HIDE_NAMES_COOKIE, inOrder, isQuiet, lastEntryWords,
  missingText, revokeQuestion, revokeName, shortCheckpoint, signName, stageKey, stageLabel, stageStateWord, studentCount, summary, undoName,
} from "@/lib/app/progress";

import { Button, buttonVariants } from "@/components/ui/button";

import { CheckpointCell, RevokeStrip, SignoffAlert } from "./signoff-parts";
import { StagePicker } from "./stage-picker";
import { card, eyebrow, sectionTitle } from "./styles";
import { targetKey, useSignoffs, type SignoffTarget } from "./use-signoffs";

type Staged = GridStage & { checkpoint: NonNullable<GridStage["checkpoint"]> };

function freeze(students: ProgressStudent[]) {
  return { order: students.map((s) => s.studentId), band: new Map(students.map((s) => [s.studentId, s.behindBy])) };
}

/**
 * The Progress tab (pack D-7, direction 1b "Bands"). Rows and bands are fixed at load so nothing moves under the
 * pointer; Re-sort adopts the server's current order (plan P4-11). Both layouts are rendered and CSS shows one per
 * width, because the phone defaults to a different stage and the server can't know the width (plan P4-27).
 */
export function ProgressGrid({ grid, basePath, laptopStage, phoneStage, hideNames }:
  { grid: Grid; basePath: string; laptopStage: string; phoneStage: string; hideNames: boolean }) {
  const s = useSignoffs(grid.componentId);
  const [hidden, setHidden] = useState(hideNames);
  const [layout, setLayout] = useState(() => freeze(grid.students));
  const stages = checkpointStages(grid);
  const groups = bands(inOrder(grid.students, layout.order), (st) => layout.band.get(st.studentId) ?? st.behindBy);

  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    document.cookie = `${HIDE_NAMES_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  function resort() {
    setLayout(freeze(grid.students));
    s.resetVisit();
  }

  const target = (st: ProgressStudent, stage: Staged): SignoffTarget => ({ student: st, checkpoint: stage.checkpoint });

  function cell(st: ProgressStudent, stage: Staged, index: number, layoutKind: "grid" | "one") {
    const t = target(st, stage);
    const key = targetKey(t);
    const name = fullName(st);
    return (
      <CheckpointCell layout={layoutKind} cell={st.cells[index]}
        names={{ sign: signName(stage.checkpoint.text, name), undo: undoName(stage.checkpoint.text, name), revoke: revokeName(stage.checkpoint.text, name) }}
        busy={s.busy?.key === key ? s.busy.action : null} recent={s.recent.has(key)} confirming={s.confirming === key}
        onSign={() => s.signOff(t)} onUndo={() => s.undo(t)} onAsk={() => s.askRevoke(t)} />
    );
  }

  /** The revoke question or the failure for this student's row, if either belongs to it. */
  function aside(st: ProgressStudent) {
    const asking = stages.find((stage) => s.confirming === targetKey(target(st, stage)));
    const failed = s.failed && s.failed.target.student.studentId === st.studentId ? s.failed : null;
    if (asking) {
      const t = target(st, asking);
      return <RevokeStrip question={revokeQuestion(asking.checkpoint.text, fullName(st), "grid")} text={asking.checkpoint.text} name={fullName(st)}
        busy={s.busy?.key === targetKey(t)} onRevoke={() => s.revoke(t)} onKeep={s.keep} />;
    }
    if (failed) return <SignoffAlert message={failSentence(failed.action, failed.target.checkpoint.text, fullName(st))} onRetry={s.retry} />;
    return null;
  }

  const oneLaptop = stages.findIndex((stage) => stageKey(stage) === laptopStage);
  const onePhone = stages.findIndex((stage) => stageKey(stage) === phoneStage);

  return (
    <div className={hidden ? "app-hide-names" : undefined}>
      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <Answer grid={grid} />
        <div className="flex flex-wrap items-center gap-3">
          {s.changes > 0 && (
            <Button type="button" variant="outline" onClick={resort}>{`Re-sort (${s.changes} ${s.changes === 1 ? "change" : "changes"})`}</Button>
          )}
          <button type="button" role="switch" aria-checked={hidden} onClick={toggleHidden}
            className="inline-flex min-h-11 items-center gap-2.5 text-app-meta font-semibold text-app-ink touch-manipulation">
            <span aria-hidden className={`relative inline-flex h-7 w-12 flex-none rounded-full ${hidden ? "bg-app-accent" : "bg-app-switch-off"}`}>
              <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-app-surface transition-transform duration-[var(--app-duration)] motion-reduce:transition-none ${hidden ? "translate-x-5" : ""}`} />
            </span>
            Hide names
          </button>
        </div>
      </div>
      <Notice grid={grid} classId={grid.classId} />

      <div className="hidden lg:block">
        <StagePicker stages={grid.stages} today={grid.today} current={laptopStage} basePath={basePath} variant="laptop" />
        <div className="relative left-1/2 w-[min(1084px,calc(100vw-72px))] -translate-x-1/2">
          <div className={`${card} mt-4 overflow-x-auto`}>
            <table className="w-full table-fixed border-collapse text-left">
              <caption className="sr-only">{`Checkpoint sign-offs for ${grid.className}, grouped by how many due checkpoints each student is behind`}</caption>
              <thead>
                <tr className="border-b border-app-line">
                  <th scope="col" className="w-[196px] px-4 py-3 text-app-small font-semibold text-app-grey">Student</th>
                  {oneLaptop < 0 ? stages.map((stage) => (
                    <th scope="col" key={stage.stageId} className="px-2.5 py-3 align-top">
                      <span className={`block ${eyebrow} text-app-grey`}>{stageLabel(stage)}</span>
                      <Link href={`${basePath}?stage=${stageKey(stage)}`} className="block text-app-small font-semibold text-app-accent underline underline-offset-3">
                        {shortCheckpoint(stage.checkpoint.text)}
                      </Link>
                      <span className={`block text-app-label font-semibold ${stageStateWord(stage, grid.today) === "Due" ? "text-app-due" : "text-app-muted"}`}>
                        {stageStateWord(stage, grid.today)}
                      </span>
                    </th>
                  )) : (
                    <th scope="col" className="px-4 py-3 align-top">
                      <span className={`block ${eyebrow} text-app-grey`}>{`${stageLabel(stages[oneLaptop])}: ${stages[oneLaptop].name}`}</span>
                      <span className="block text-app-base font-semibold text-app-ink">{stages[oneLaptop].checkpoint.text}</span>
                      <span className="block font-mono text-app-label text-app-grey">
                        {stages[oneLaptop].dueDate ? formatCalendarDate(stages[oneLaptop].dueDate as string) : "No date set"} · {stageStateWord(stages[oneLaptop], grid.today)}
                      </span>
                    </th>
                  )}
                  <th scope="col" className="w-[134px] px-4 py-3 text-app-small font-semibold text-app-grey">Log</th>
                </tr>
              </thead>
              {groups.map((g) => {
                const columns = (oneLaptop < 0 ? stages.length : 1) + 2;
                return (
                  <tbody key={`${g.behindBy}-${g.students[0].studentId}`}>
                    <tr className="bg-app-ground">
                      <th scope="rowgroup" colSpan={columns} className="px-4 py-3 text-left"><BandHeading behindBy={g.behindBy} count={g.students.length} /></th>
                    </tr>
                    {g.students.map((st) => {
                      const extra = aside(st);
                      return (
                        <Fragment key={st.studentId}>
                          <tr className="border-t border-app-line">
                            <th scope="row" className="px-4 py-2 text-left align-top font-normal">
                              <Link href={`/teach/classes/${grid.classId}/students/${st.studentId}`} data-private
                                className="block font-semibold text-app-accent underline underline-offset-3 break-words">{fullName(st)}</Link>
                              <span className="block text-app-small text-app-grey">{behindWords(st.behindBy)}</span>
                            </th>
                            {oneLaptop < 0
                              ? stages.map((stage, i) => <td key={stage.stageId} className="p-1 align-top">{cell(st, stage, i, "grid")}</td>)
                              : <td className="px-4 py-2 align-top">{cell(st, stages[oneLaptop], oneLaptop, "one")}</td>}
                            <td className="px-4 py-2 align-top">
                              <span data-private className={`text-app-small ${isQuiet(st.daysSinceLastLogActivity) ? "font-semibold text-app-ink" : "text-app-grey"}`}>
                                {lastEntryWords(st.daysSinceLastLogActivity)}
                              </span>
                            </td>
                          </tr>
                          {extra && <tr><td colSpan={columns} className="px-4 pb-3">{extra}</td></tr>}
                        </Fragment>
                      );
                    })}
                  </tbody>
                );
              })}
            </table>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <StagePicker stages={grid.stages} today={grid.today} current={phoneStage} basePath={basePath} variant="phone" />
        {onePhone >= 0 ? (
          <div className={`${card} mt-3 flex flex-col gap-1 p-4`}>
            <p className="flex flex-wrap gap-x-3 text-app-small">
              <span className="font-semibold text-app-ink">{stageLabel(stages[onePhone])}</span>
              <span className="font-mono text-app-grey">{stages[onePhone].dueDate ? formatCalendarDate(stages[onePhone].dueDate as string) : "No date set"}</span>
              <span className="font-semibold">{stageStateWord(stages[onePhone], grid.today)}</span>
            </p>
            <p className="text-app-base text-app-ink">{stages[onePhone].checkpoint.text}</p>
          </div>
        ) : (
          <p className="mt-3 text-app-small text-app-grey">All checkpoints. Pick a stage number to sign off.</p>
        )}
        <section aria-label="Students" className="mt-4 flex flex-col gap-5">
          {groups.map((g) => (
            <div key={`${g.behindBy}-${g.students[0].studentId}`}>
              <h3><BandHeading behindBy={g.behindBy} count={g.students.length} /></h3>
              <ul className={`${card} mt-2 divide-y divide-app-line`}>
                {g.students.map((st) => (
                  <li key={st.studentId} className="flex flex-col gap-2 p-4">
                    <div className="flex flex-col gap-0.5">
                      <Link href={`/teach/classes/${grid.classId}/students/${st.studentId}`} data-private
                        className="font-semibold text-app-accent underline underline-offset-3 break-words">{fullName(st)}</Link>
                      <span className="text-app-small text-app-grey">{behindWords(st.behindBy)}</span>
                      <span data-private className={`text-app-small ${isQuiet(st.daysSinceLastLogActivity) ? "font-semibold text-app-ink" : "text-app-grey"}`}>
                        {lastEntryWords(st.daysSinceLastLogActivity)}
                      </span>
                      {onePhone < 0 && missingText(st, grid) && <span className="text-app-small text-app-due">{missingText(st, grid)}</span>}
                    </div>
                    {onePhone >= 0 && cell(st, stages[onePhone], onePhone, "one")}
                    {aside(st)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>

      <p aria-live="polite" className="sr-only">{s.announcement}</p>
    </div>
  );
}

function BandHeading({ behindBy, count }: { behindBy: number; count: number }) {
  const { numeral, label } = bandHeading(behindBy);
  return (
    <span className="flex flex-wrap items-baseline gap-x-2.5">
      {numeral && <span className="font-heading text-app-behind-sm font-bold leading-none tabular-nums text-app-due lg:text-app-behind">{numeral}</span>}
      <span className={`font-heading font-bold ${numeral ? "text-app-base text-app-ink" : "text-app-section text-app-ink"}`}>{label}</span>
      <span className="text-app-small text-app-grey">· <span data-private>{studentCount(count)}</span></span>
    </span>
  );
}

function Answer({ grid }: { grid: Grid }) {
  const sum = summary(grid);
  const n = (value: number) => <span data-private className="tabular-nums">{value}</span>;
  let head: ReactNode;
  let sub: string;
  switch (sum.kind) {
    case "noDates":
      head = "No stage dates yet";
      sub = "Nothing can be due until the stages have dates.";
      break;
    case "nothingDue":
      head = "Nothing is due yet";
      sub = sum.next ? `${sum.next.label}’s checkpoint is due on ${sum.next.date}.` : "";
      break;
    case "upToDate":
      head = <>All {n(sum.total)} {sum.total === 1 ? "student is" : "students are"} up to date</>;
      sub = `Every checkpoint due so far (${sum.due}) is signed off.${sum.next ? ` ${sum.next.label}’s is next, on ${sum.next.date}.` : ""}`;
      break;
    case "behind":
      head = <>{n(sum.behind)} of {n(sum.total)} students {sum.behind === 1 ? "is" : "are"} behind</>;
      sub = `${sum.due} ${sum.dueCount > 1 ? "are" : "is"} due. Furthest behind first.${sum.noCheckpoint.map((l) => ` ${l} has no checkpoint.`).join("")}`;
      break;
  }
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h2 className={sectionTitle}>{head}</h2>
      {sub && <p className="text-app-base text-app-grey">{sub}</p>}
    </div>
  );
}

function Notice({ grid, classId }: { grid: Grid; classId: string }) {
  const kind = summary(grid).kind;
  if (kind !== "noDates" && kind !== "nothingDue") return null;
  return (
    <div className={`${card} mt-4 flex flex-wrap items-center justify-between gap-4 p-5`}>
      <p className="max-w-[600px] text-app-base text-app-copy">
        {kind === "noDates"
          ? "Set the stage dates on the Component tab and each checkpoint becomes due once its date passes. You can still sign off early when a student shows you their work."
          : "You can sign off a checkpoint early when a student shows you their work. It counts once its date passes."}
      </p>
      {kind === "noDates" && (
        <Link href={`/teach/classes/${classId}/component`} className={buttonVariants({ variant: "outline" })}>Go to the Component tab</Link>
      )}
    </div>
  );
}
```

This task contains the design decisions a reviewer should know about:
- `freeze` keeps both order and band membership from load. A student signed off to zero still reads "Up to date" inside the "1 checkpoint behind" band until Re-sort. D-7 chose that: the band says where the row was sorted, the row says where it is now.
- The table's wrapper breaks out of the 880px column to at most 1084px (P4-14). The `100vw - 72px` leaves room for a desktop scrollbar so the page never scrolls sideways; Task 21 asserts it.
- `data-private` marks exactly what Hide names blurs (P4-16).

- [ ] **Step 4: Run** `npx vitest run components/app/progress-grid.spec.tsx && npx tsc --noEmit && npm run lint` → PASS.

- [ ] **Step 5: Commit.** `git add -A frontend && git commit -m "Add the progress grid: bands, a stable order with Re-sort, Undo, Hide names, table and phone list"`

---

## Task 19: The Progress page

**Files:**
- Create: `frontend/app/(app)/teach/classes/[id]/progress/page.tsx`

Server pages here are covered by e2e (Task 21), as the Component and Students pages are. The behaviour is in the tested component and helpers.

- [ ] **Step 1: Implement:**

```tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ClassHeader } from "@/components/app/class-header";
import { ErrorPanel } from "@/components/app/error-panel";
import { ProgressGrid } from "@/components/app/progress-grid";
import { card, sectionTitle } from "@/components/app/styles";
import { buttonVariants } from "@/components/ui/button";
import { classDetailSchema, progressGridSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { HIDE_NAMES_COOKIE, latestDueKey, parseStage } from "@/lib/app/progress";

export const dynamic = "force-dynamic";

function Empty({ head, body, href, action }: { head: string; body: string; href: string; action: string }) {
  return (
    <div className={`${card} mt-7 flex flex-wrap items-center justify-between gap-4 p-5`}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className={sectionTitle}>{head}</h2>
        <p className="max-w-[600px] text-app-base text-app-grey">{body}</p>
      </div>
      <Link href={href} className={buttonVariants({ variant: "outline" })}>{action}</Link>
    </div>
  );
}

export default async function ClassProgressPage({ params, searchParams }:
  { params: Promise<{ id: string }>; searchParams: Promise<{ stage?: string }> }) {
  const { id } = await params;
  const { stage } = await searchParams;
  const detail = await attempt(() => serverApi.get(`/classes/${encodeURIComponent(id)}`, classDetailSchema));
  if (!detail.ok && detail.error.code === "NOT_FOUND") notFound();
  if (!detail.ok) return <AppMain width="class"><ErrorPanel error={detail.error} /></AppMain>;

  const cls = detail.data;
  if (!cls.componentId) {
    return (
      <AppMain width="class">
        <ClassHeader detail={cls} current="progress" />
        <Empty head="Nothing to track yet." href={`/teach/classes/${cls.id}/component`} action="Go to the Component tab"
          body={`${cls.name} doesn't have a component set up, so there are no checkpoints to sign off. Set one up on the class's Component tab.`} />
      </AppMain>
    );
  }

  const grid = await attempt(() => serverApi.get(`/components/${cls.componentId}/progress`, progressGridSchema));
  if (!grid.ok && grid.error.code === "NOT_FOUND") notFound();
  // Read on the server so a projected page arrives already blurred (plan P4-15).
  const hideNames = (await cookies()).get(HIDE_NAMES_COOKIE)?.value === "1";

  return (
    <AppMain width="class">
      <ClassHeader detail={cls} current="progress" />
      {!grid.ok ? (
        <div className="mt-6"><ErrorPanel error={grid.error} /></div>
      ) : grid.data.students.length === 0 ? (
        <Empty head="No students yet." href={`/teach/classes/${cls.id}`} action="Go to the Students tab"
          body="Students appear here once you approve them. Share the join code from the Students tab, then approve their requests." />
      ) : (
        <ProgressGrid grid={grid.data} basePath={`/teach/classes/${cls.id}/progress`} hideNames={hideNames}
          laptopStage={parseStage(stage, grid.data) ?? "all"} phoneStage={parseStage(stage, grid.data) ?? latestDueKey(grid.data)} />
      )}
    </AppMain>
  );
}
```

- [ ] **Step 2: Run** `cd frontend && npx tsc --noEmit && npm run lint && APP_ENABLED=true npx next build >/dev/null && echo ok` → `ok`.

- [ ] **Step 3: Look at it.** `make db-up`, `make backend-run`, `make frontend-run`, then run the seed script from Task 22 if it exists yet; otherwise click through a class with a component. Open `/teach/classes/<id>/progress` at 1140 and 390 beside `docs/design/pilot/D-7-progress-grid/design/D-7 Progress grid.dc.html`. Note differences in HANDOFF rather than chasing pixels now; Task 23 does the checklist pass.

- [ ] **Step 4: Commit.** `git add -A frontend && git commit -m "Add the class's Progress page"`

---

## Task 20: The student page's Checkpoints section

**Files:**
- Create: `frontend/components/app/student-checkpoints.tsx`, `frontend/components/app/student-checkpoints.spec.tsx`
- Modify: `frontend/components/app/teacher-log.tsx` (optional `activity` line), `frontend/components/app/teacher-log.spec.tsx`
- Modify: `frontend/app/(app)/teach/classes/[id]/students/[studentId]/page.tsx`

- [ ] **Step 1: Write the failing spec** `student-checkpoints.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { StudentCheckpoints } from "./student-checkpoints";

const INITIAL = "Initial ideas discussed with the teacher";
const LOG = "Investigative log shared with the teacher";
const data = {
  studentId: "s1", firstName: "Cian", lastName: "Murphy", today: "2026-12-14", behindBy: 1,
  lastLogActivityOn: "2026-11-30", daysSinceLastLogActivity: 14,
  stages: [
    { stageId: "a", ordinal: 1, label: "Stage 1", name: "Initial Response", dueDate: "2026-10-02", checkpoint: { id: "c1", text: INITIAL },
      state: "SIGNED_OFF" as const, signedOffOn: "2026-10-06",
      history: [{ signedOffOn: "2026-10-03", revokedOn: "2026-10-04", revokedBy: "Katelyn Hanlon" }] },
    { stageId: "b", ordinal: 2, label: "Stage 2", name: "Background Research", dueDate: "2026-11-06", checkpoint: { id: "c2", text: LOG },
      state: "DUE" as const, signedOffOn: null, history: [] },
  ],
};

beforeEach(() => { refresh.mockReset(); vi.mocked(api.send).mockReset(); });

describe("StudentCheckpoints", () => {
  it("says how far behind, lists each checkpoint in full, and keeps revoked sign-offs visible", () => {
    render(<StudentCheckpoints componentId="k1" data={data} />);
    expect(screen.getByRole("heading", { level: 2, name: "Checkpoints" })).toBeInTheDocument();
    expect(screen.getByText("checkpoint behind")).toBeInTheDocument();
    expect(screen.getByText(LOG)).toBeInTheDocument();
    expect(screen.getByText("Signed off on 3 Oct 2026, revoked on 4 Oct 2026 by Katelyn Hanlon.")).toBeInTheDocument();
  });

  it("signs off a due checkpoint and revokes a signed-off one after asking", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "c2", state: "SIGNED_OFF", signedOffOn: "2026-12-14" });
    render(<StudentCheckpoints componentId="k1" data={data} />);
    await userEvent.click(screen.getByRole("button", { name: `Sign off ${LOG} for Cian Murphy` }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/students/s1/checkpoints/c2/signoff", { signedOff: true }, expect.anything());

    await userEvent.click(screen.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Cian Murphy` }));
    expect(screen.getByText("Revoke this sign-off for Cian Murphy? It stays in the record as revoked by you.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: `Keep sign-off of ${INITIAL} for Cian Murphy` }));
    expect(screen.queryByText(/Revoke this sign-off/)).not.toBeInTheDocument();
  });
});
```

and append to `teacher-log.spec.tsx` a test that `<TeacherLog log={…} activity="Last entry 14 days ago." />` shows that sentence before the entry count (reuse that spec's existing log fixture with at least one entry).

- [ ] **Step 2: Run** `npx vitest run components/app/student-checkpoints.spec.tsx components/app/teacher-log.spec.tsx` → FAIL.

- [ ] **Step 3: Implement** `student-checkpoints.tsx`:

```tsx
"use client";

import type { StudentCheckpoints as Data } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { bandHeading, failSentence, fullName, revokeName, revokeQuestion, signName, stageLabel, undoName } from "@/lib/app/progress";

import { CheckpointCell, RevokeStrip, SignoffAlert } from "./signoff-parts";
import { card, eyebrow, sectionTitle } from "./styles";
import { targetKey, useSignoffs } from "./use-signoffs";

/** Pack D-7: where this student stands, above the log that is the evidence for it. Same actions as the grid. */
export function StudentCheckpoints({ componentId, data }: { componentId: string; data: Data }) {
  const s = useSignoffs(componentId);
  const name = fullName(data);
  const { numeral, label } = bandHeading(data.behindBy);

  return (
    <section aria-labelledby="checkpoints-heading" className="mt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="checkpoints-heading" className={sectionTitle}>Checkpoints</h2>
        <p className="flex items-baseline gap-2">
          {numeral && <span className="font-heading text-app-behind-sm font-bold leading-none tabular-nums text-app-due">{numeral}</span>}
          <span className="text-app-base font-semibold text-app-ink">{label}</span>
        </p>
      </div>
      <ul className={`${card} mt-3 divide-y divide-app-line`}>
        {data.stages.map((st) => {
          const t = { student: data, checkpoint: st.checkpoint };
          const key = targetKey(t);
          const failed = s.failed && targetKey(s.failed.target) === key ? s.failed : null;
          return (
            <li key={st.stageId} className={`flex flex-col gap-3 p-4 ${st.state === "DUE" ? "bg-app-due-row" : ""}`}>
              <div className="grid gap-3 lg:grid-cols-[200px_1fr_auto] lg:items-start">
                <div className="flex flex-col gap-0.5">
                  <span className={`${eyebrow} text-app-grey`}>{stageLabel(st)}</span>
                  <span className="text-app-small text-app-ink">{st.name}</span>
                  <span className="font-mono text-app-label text-app-grey">{st.dueDate ? formatCalendarDate(st.dueDate) : "No date set"}</span>
                </div>
                <p className="text-app-base text-app-ink">{st.checkpoint.text}</p>
                <CheckpointCell layout="one" cell={{ checkpointId: st.checkpoint.id, state: st.state, signedOffOn: st.signedOffOn }}
                  names={{ sign: signName(st.checkpoint.text, name), undo: undoName(st.checkpoint.text, name), revoke: revokeName(st.checkpoint.text, name) }}
                  busy={s.busy?.key === key ? s.busy.action : null} recent={s.recent.has(key)} confirming={s.confirming === key}
                  onSign={() => s.signOff(t)} onUndo={() => s.undo(t)} onAsk={() => s.askRevoke(t)} />
              </div>
              {st.history.map((h, i) => (
                <p key={i} className="text-app-small text-app-grey">
                  {`Signed off on ${formatCalendarDate(h.signedOffOn)}, revoked on ${formatCalendarDate(h.revokedOn)} by ${h.revokedBy}.`}
                </p>
              ))}
              {s.confirming === key && (
                <RevokeStrip question={revokeQuestion(st.checkpoint.text, name, "student")} text={st.checkpoint.text} name={name}
                  busy={s.busy?.key === key} onRevoke={() => s.revoke(t)} onKeep={s.keep} />
              )}
              {failed && <SignoffAlert message={failSentence(failed.action, st.checkpoint.text, name)} onRetry={s.retry} />}
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="sr-only">{s.announcement}</p>
    </section>
  );
}
```

`teacher-log.tsx`: add an optional prop `activity?: string` and render it at the start of the count line:

```tsx
export function TeacherLog({ log, activity }: { log: TeacherStudentLog; activity?: string }) {
  ...
        <p className="text-app-small text-app-grey">{`${activity ? `${activity} ` : ""}${log.entries.length} ${log.entries.length === 1 ? "entry" : "entries"}. ${log.firstName} has shared ${shared} with you.`}</p>
```

- [ ] **Step 4: Update the page** (`students/[studentId]/page.tsx`). After the class detail loads and `cls.componentId` is set, load both views:

```tsx
  const [log, checkpoints] = await Promise.all([
    attempt(() => serverApi.get(`/components/${cls.componentId}/students/${encodeURIComponent(studentId)}/log`, teacherStudentLogSchema)),
    attempt(() => serverApi.get(`/components/${cls.componentId}/students/${encodeURIComponent(studentId)}/checkpoints`, studentCheckpointsSchema)),
  ]);
  if ((!log.ok && log.error.code === "NOT_FOUND") || (!checkpoints.ok && checkpoints.error.code === "NOT_FOUND")) notFound();
```

replace `back` with:

```tsx
  const back = (
    <nav aria-label="Back to class" className="flex flex-wrap gap-x-5 gap-y-1">
      <Link href={`/teach/classes/${cls.id}/progress`} className={backLink}>{`${cls.name}, Progress`}</Link>
      <Link href={`/teach/classes/${cls.id}`} className={backLink}>{`${cls.name}, Students`}</Link>
    </nav>
  );
```

and render, after the `h1` and subtitle:

```tsx
          {checkpoints.ok
            ? <StudentCheckpoints componentId={cls.componentId} data={checkpoints.data} />
            : <div className="mt-6"><ErrorPanel error={checkpoints.error} /></div>}
          <TeacherLog log={log.data} activity={checkpoints.ok ? `${lastEntryWords(checkpoints.data.daysSinceLastLogActivity)}.` : undefined} />
```

(imports: `StudentCheckpoints`, `studentCheckpointsSchema`, `lastEntryWords`.) D-7 shortens the back links at 390 to "Progress" and "Students". This build keeps the full names at both widths, so the accessible name doesn't change with the width. Record that in HANDOFF as a deliberate simplification.

- [ ] **Step 5: Run** `npx vitest run components/app && npx tsc --noEmit && npm run lint` → PASS. Then `grep -n "Students\"" frontend/e2e/phase3.e2e.ts`: if a journey clicks the old single back link by name, it still matches (`…, Students`).

- [ ] **Step 6: Commit.** `git add -A frontend && git commit -m "Show a student's checkpoints above their log, with sign off, undo and revoke"`

---

## Task 21: Gate P4's journey

**Files:**
- Create: `frontend/e2e/phase4.e2e.ts`

- [ ] **Step 1: Write the journey:**

```ts
import { expect, type Page, test } from "@playwright/test";

import { TEACHER, expectAccessible, phone, signInTeacher } from "./helpers";

/**
 * Gate P4 (roadmap §8.4): the teacher signs off a checkpoint and, after Re-sort, that student moves down the grid
 * (less behind; furthest behind is first); revoking puts them back; the student's page shows the sign-off; Hide
 * names survives a reload. Runs on laptop (table) and phone (list): the role queries find whichever is visible.
 */
const P4 = { className: "", progress: "", aoife: "", cian: "", password: "e2e-student-password" };
const INITIAL = "Initial ideas discussed with the teacher";

test.describe.configure({ mode: "serial" });

async function join(browser: import("@playwright/test").Browser, code: string, first: string, last: string, username: string) {
  const student = await phone(browser);
  await student.goto(`/join/${code}`);
  await student.getByRole("textbox", { name: "First name" }).fill(first);
  await student.getByRole("textbox", { name: "Surname" }).fill(last);
  await student.getByRole("textbox", { name: "Username" }).fill(username);
  await student.getByLabel("Password").fill(P4.password);
  await student.getByRole("button", { name: "Create account and join" }).click();
  await expect(student).toHaveURL(/\/home$/);
  await student.context().close();
}

async function students(page: Page) {
  return page.getByRole("link", { name: /^(Aoife Byrne|Cian Murphy)$/ }).allTextContents();
}

async function noSidewaysScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test("a class with Stage 1 due and two approved students", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set; run through scripts/e2e.sh");
  const tag = `${test.info().project.name}.${Date.now().toString(36)}`;
  P4.className = `6P Biology ${tag}`;
  P4.aoife = `e2e.p4.aoife.${tag}`;
  P4.cian = `e2e.p4.cian.${tag}`;
  await signInTeacher(teacher);
  await teacher.getByRole("link", { name: "Create class" }).click();
  await teacher.getByRole("textbox", { name: "Class name" }).fill(P4.className);
  await teacher.getByRole("button", { name: "Create" }).click();
  await teacher.getByRole("link", { name: "Component" }).click();
  await teacher.getByRole("button", { name: "Create component" }).click();
  await teacher.getByLabel("Stage 1 date").fill("2026-09-01");
  await Promise.all([
    teacher.waitForResponse((r) => r.url().includes("/stage-dates") && r.request().method() === "PUT"),
    teacher.getByRole("button", { name: "Save dates" }).click(),
  ]);
  await teacher.getByRole("link", { name: "Students" }).click();
  const code = (await teacher.getByRole("region", { name: "Join code" }).locator("strong").textContent())?.trim() ?? "";
  await join(browser, code, "Aoife", "Byrne", P4.aoife);
  await join(browser, code, "Cian", "Murphy", P4.cian);
  await teacher.reload();
  await teacher.getByRole("button", { name: "Approve Aoife Byrne" }).click();
  await teacher.getByRole("button", { name: "Approve Cian Murphy" }).click();
  await expect(teacher.getByRole("link", { name: "Cian Murphy" })).toBeVisible();
  await teacher.getByRole("link", { name: "Progress" }).click();
  P4.progress = new URL(teacher.url()).pathname;
});

test("signing off moves a student down the grid after Re-sort, and revoking puts them back", async ({ page: teacher }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await signInTeacher(teacher);
  await teacher.goto(`${P4.progress}?stage=1`);
  await expect(teacher.getByRole("heading", { level: 2 })).toHaveText("2 of 2 students are behind");
  await expectAccessible(teacher);
  await noSidewaysScroll(teacher);
  expect(await students(teacher)).toEqual(["Aoife Byrne", "Cian Murphy"]); // both behind by 1, no entries: surname

  await teacher.getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByRole("button", { name: `Undo sign-off of ${INITIAL} for Aoife Byrne` })).toBeVisible();
  expect(await students(teacher)).toEqual(["Aoife Byrne", "Cian Murphy"]); // nothing moves under the pointer
  await teacher.getByRole("button", { name: "Re-sort (1 change)" }).click();
  expect(await students(teacher)).toEqual(["Cian Murphy", "Aoife Byrne"]);

  await teacher.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByText(/It stays in the record as revoked by you/)).toBeVisible();
  await expectAccessible(teacher);
  await teacher.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` })).toBeVisible();
  await teacher.reload();
  expect(await students(teacher)).toEqual(["Aoife Byrne", "Cian Murphy"]);

  await teacher.goto(P4.progress);
  await expectAccessible(teacher);
  await noSidewaysScroll(teacher);
});

test("the student sees the sign-off, and the teacher's student page shows its history", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await signInTeacher(teacher);
  await teacher.goto(`${P4.progress}?stage=1`);
  await teacher.getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByRole("button", { name: `Undo sign-off of ${INITIAL} for Aoife Byrne` })).toBeVisible();

  await teacher.getByRole("link", { name: "Aoife Byrne" }).click();
  await expect(teacher.getByRole("heading", { level: 2, name: "Checkpoints" })).toBeVisible();
  await expect(teacher.getByText(/revoked on .* by E2E Teacher\./)).toBeVisible();
  await expectAccessible(teacher);

  const student = await phone(browser);
  await student.goto("/login");
  await student.getByRole("textbox", { name: "Username" }).fill(P4.aoife);
  await student.getByLabel("Password").fill(P4.password);
  await student.getByRole("button", { name: "Sign in" }).click();
  await student.getByRole("link", { name: /Biology/ }).click();
  const stage1 = student.getByRole("button", { name: /Initial Response/ });
  if ((await stage1.getAttribute("aria-expanded")) !== "true") await stage1.click(); // StagesSection opens the current stage itself
  await expect(student.getByText(/^Your teacher signed this off on /)).toBeVisible();
});

test("Hide names blurs the page and survives a reload", async ({ page: teacher }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await signInTeacher(teacher);
  await teacher.goto(P4.progress);
  await teacher.getByRole("switch", { name: "Hide names" }).click();
  await teacher.reload();
  await expect(teacher.getByRole("switch", { name: "Hide names" })).toHaveAttribute("aria-checked", "true");
  await expect(teacher.getByRole("link", { name: "Aoife Byrne" })).toHaveCSS("filter", /blur/);
  await teacher.getByRole("switch", { name: "Hide names" }).click(); // leave the shared e2e browser state as found
});
```

The student's stage-card button is named by its stage name ("Initial Response to the Investigation Brief"). The journey opens it only if `StagesSection` hasn't already opened it as the current stage. The operator seeds the teacher as first name "E2E", last name "Teacher" (`scripts/e2e.sh`), hence "by E2E Teacher".

- [ ] **Step 2: Run** `make e2e` → all green on `laptop` and `phone`. Earlier phases' files must stay green (Task 2 changed a Phase 3 sentence).

- [ ] **Step 3: Commit.** `git add frontend/e2e/phase4.e2e.ts && git commit -m "Add Gate P4's journey: sign off, re-sort, revoke, the student's view and Hide names"`

---

## Task 22: The 30-student seed script and timing (Gate P4 box 2)

**Files:**
- Create: `scripts/seed-grid.mjs`

The script goes through the public API only, so the same command works locally and against the deployed stack.

- [ ] **Step 1: Implement** `scripts/seed-grid.mjs`:

```js
#!/usr/bin/env node
// Gate P4: builds a 30-student Biology class through the public API, then times its Progress page.
// Usage: node scripts/seed-grid.mjs --base=https://<pilot host> --username=<teacher> --password=<teacher password> [--students=30]
// The teacher must exist (operator create-user + grant-role TEACHER) and have changed their temporary password.
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const base = (args.base ?? "http://localhost:3000").replace(/\/$/, "");
const count = Number(args.students ?? 30);
if (!args.username || !args.password) throw new Error("--username and --password are required");

const FIRST = ["Aoife", "Cian", "Niamh", "Oisín", "Saoirse", "Seán", "Ciara", "Darragh", "Éabha", "Fionn", "Grace", "Jack", "Róisín", "Liam", "Sadhbh"];
const LAST = ["Byrne", "Murphy", "Kelly", "O'Brien", "Walsh", "Ó Briain", "Nolan", "Doyle", "McCarthy", "Brennan", "Ní Bhriain", "Fitzgerald-Kavanagh"];

/** A cookie jar and the CSRF header, as the browser does it through the same-origin proxy. */
function session() {
  const jar = new Map();
  async function call(method, path, body) {
    const headers = { accept: "application/json", cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") };
    if (method !== "GET") {
      headers["content-type"] = "application/json";
      headers["x-xsrf-token"] = decodeURIComponent(jar.get("XSRF-TOKEN") ?? "");
    }
    const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [k, ...v] = pair.split("=");
      jar.set(k.trim(), v.join("="));
    }
    if (res.status >= 400) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
    const type = res.headers.get("content-type") ?? "";
    return type.includes("json") ? res.json() : res.text();
  }
  return { call, csrf: () => call("GET", "/api/v1/auth/csrf") };
}

const iso = (d) => d.toISOString().slice(0, 10);
const days = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d; };
const stamp = Date.now().toString(36);

const teacher = session();
await teacher.csrf();
const me = await teacher.call("POST", "/api/v1/auth/login", { username: args.username, password: args.password });
if (me.mustChangePassword) throw new Error("Sign in once and change the temporary password first");
const school = me.roles.find((r) => r.role === "TEACHER")?.schoolId;
await teacher.csrf();

const cls = await teacher.call("POST", "/api/v1/classes",
  { schoolId: school, subjectCode: "BIOLOGY", name: `Seed grid ${stamp}`, yearGroup: 6, academicYear: "2026/27" });
const [brief] = await teacher.call("GET", "/api/v1/briefs?subjectCode=BIOLOGY&examYear=2027");
const component = await teacher.call("POST", `/api/v1/classes/${cls.id}/components`, { briefId: brief.id });
const completion = brief.completionDate;
const clamp = (d) => (iso(d) > completion ? completion : iso(d));
const offsets = [-40, -20, -3, 30, 60, 90]; // Stages 1-3 due, 4-6 not yet
await teacher.call("PUT", `/api/v1/components/${component.id}/stage-dates`,
  { dates: component.stages.map((s, i) => ({ stageId: s.id, dueDate: clamp(days(offsets[i] ?? 90)) })) });

for (let i = 0; i < count; i++) {
  const student = session();
  await student.csrf();
  await student.call("POST", `/api/v1/join/${cls.joinCode.code}/accounts`, {
    firstName: FIRST[i % FIRST.length], lastName: LAST[(i * 7) % LAST.length], username: `seed.${stamp}.${i}`, password: "seed-student-password",
  });
}
const detail = await teacher.call("GET", `/api/v1/classes/${cls.id}`);
for (const e of detail.enrolments.filter((e) => e.status === "PENDING")) {
  await teacher.call("POST", `/api/v1/classes/${cls.id}/enrolments/${e.enrolmentId}/approve`);
}

// A realistic spread: most up to date on Stage 1, fewer on 2 and 3, a few signed off early on 4.
const grid = await teacher.call("GET", `/api/v1/components/${component.id}/progress`);
const checkpoints = grid.stages.filter((s) => s.checkpoint).map((s) => s.checkpoint.id);
for (const [i, s] of grid.students.entries()) {
  const want = [i % 6 !== 0, i % 3 !== 0, i % 4 === 0, i % 9 === 0];
  for (const [k, on] of want.entries()) {
    if (on) await teacher.call("PUT", `/api/v1/components/${component.id}/students/${s.studentId}/checkpoints/${checkpoints[k]}/signoff`, { signedOff: true });
  }
}

async function time(label, path) {
  const t = performance.now();
  await teacher.call("GET", path);
  console.log(`${label}: ${Math.round(performance.now() - t)} ms`);
}
const page = `/teach/classes/${cls.id}/progress`;
await time("Progress page, first load", page);
await time("Progress page, second load", page);
await time("Grid API", `/api/v1/components/${component.id}/progress`);
console.log(`Class: ${base}${page} (${grid.students.length} students × ${checkpoints.length} checkpoints)`);
```

- [ ] **Step 2: Run it locally.** Start the stack (`make db-up`, `make backend-run`, `make frontend-run`). Create a teacher with the operator (`scripts/operator.sh create-school …`, `create-user …`, `grant-role … --role=TEACHER`), sign in once in the browser and change the password, then run `node scripts/seed-grid.mjs --username=<teacher> --password=<new password>`. Expected: the three timings and a class URL. Open the URL: 30 students in bands. Paste the output into the task's commit message body and HANDOFF.

- [ ] **Step 3: Commit.** `git add scripts/seed-grid.mjs && git commit -m "Add a 30-student seed through the API that times the Progress page (Gate P4)"`

Tim runs the same command with `--base=<pilot Vercel URL>` for the gate. The script creates real accounts, so HANDOFF adds its class and `seed.*` users to the "delete before onboarding" list.

---

## Task 23: Docs, the UI checklist, the gate and hand-over

**Files:**
- Modify: `docs/ARCHITECTURE.md` §4, §5, §6, §10; `CLAUDE.md` backend conventions; `docs/PILOT-ROADMAP.md` §1, §3, §7, §8.3, §8.4; `docs/design/UI-STANDARDS.md` §6; `docs/HANDOFF.md`

- [ ] **Step 1: `docs/ARCHITECTURE.md`.**
  - **§4:** add the bullet "**A sign-off is reached only through `ProgressService`**, which calls `ComponentService.requireOwned`, then requires the student to be `APPROVED` in that class (`EnrolmentRepository.membersOf`), then looks the checkpoint up with `TemplateRepository.checkpointInVersion` against the brief's version; any failure is `NOT_FOUND`. `SignoffScopeTest` proves it with a bite test for each check."
  - **§5:** a `progress` feature and `V12__checkpoint_signoffs.sql` bullet: the table, the partial unique index, the append-only trigger, `SignoffRepository` in `components`, `LogRepository.lastActivity`, `Standing.ORDER`, the fixed five queries.
  - **§6:** the Progress page, the both-layouts pattern, the Hide names cookie, `useSignoffs`.
  - **§10:** "`ProgressGrid` shows a student reading 'Up to date' inside a '1 checkpoint behind' band: rows and bands are frozen at load until Re-sort (plan P4-11)."

- [ ] **Step 2: `CLAUDE.md` backend conventions.** Add: "A checkpoint sign-off goes through `ComponentService.requireOwned`, an approved-student check within the class, and `TemplateRepository.checkpointInVersion`; a checkpoint id is never used unscoped."

- [ ] **Step 3: `docs/PILOT-ROADMAP.md`.**
  - **§1:** add Phase 4's status.
  - **§3 and §8.3:** mark Phase 3 questions (a) (wording changed, P4-2) and (b) (kept, P4-3) answered, 28 Sep 2026.
  - **§7:** replace the Phase 4 endpoint row with the three built endpoints (P4-6, P4-10).
  - **§8.4:** a status line; Gate P4's "moves up the grid" becomes "moves down the grid (less behind; furthest behind is first)"; add under the table: "**Next, before Phase 5 (Tim, 28 Sep 2026): the student says a checkpoint is ready for sign-off**, shown on the grid as a fourth cell state (spec P4-7)."

- [ ] **Step 4: `docs/design/UI-STANDARDS.md` §6.** Add: "Exception (pack D-7): the Progress tab's phone stage picker has 6px gaps between its 44 × 48 buttons; eight across 358px leave no room for 8px."

- [ ] **Step 5: Walk `docs/design/UI-CHECKLIST.md`** for the Progress page and the student page. Take screenshots at 390 and 1140 (`npx playwright screenshot` against the running app, or a throwaway Playwright script) and compare them with `docs/design/pilot/D-7-progress-grid/design/D-7 Progress grid.dc.html`. Remove one decoration. Record exactly what was and wasn't checked by hand in HANDOFF: keyboard-only, 200% zoom, a 40-character surname, contrast.

- [ ] **Step 6: Run the gate:** `make verify && make e2e`. Paste the counts: backend tests, `node:test`, Vitest, e2e.

- [ ] **Step 7: Rewrite `docs/HANDOFF.md`.** Cover:
  - where Phase 4 stands;
  - the gate's checked boxes;
  - what Tim runs: the seed script against the deployed stack for box 2, and the readiness plan for box 3;
  - the seed data to delete before onboarding;
  - the deliberate simplifications (full back-link names at 390; anything found in step 5);
  - the app-wide button-border contrast follow-up (P4-20);
  - that `/self-review` and `docs/changes/pilot-4-teacher-grid.md` come next, in fresh sessions.

- [ ] **Step 8: Commit.** `git add -A docs CLAUDE.md && git commit -m "Record Phase 4 as built: architecture, conventions, roadmap and handoff"`

### Gate P4

- [ ] `make verify` and `make e2e` green; the journey signs off (the student moves down after Re-sort), revokes (back on top), shows the state on the student's page, and keeps Hide names across a reload
- [ ] `SignoffScopeTest` passes with its bite tests (Task 11)
- [ ] The seed script's class loads its Progress page in under a second on the deployed stack — **Tim runs it**
- [ ] Every "before go-live" readiness item is done or accepted by Tim — **the separate readiness plan**
- [ ] `/self-review` in a fresh session; `docs/changes/pilot-4-teacher-grid.md` committed on the branch

---

## Self-review notes (for the executor)

- Tasks 3–12 are backend and each ends with a green `./mvnw test` on the named classes. Run `make verify` before each commit anyway; a Spring context change (a new constructor parameter) breaks unrelated tests.
- The accessible names in P4-18 are the contract. If a name reads badly once built, change it in `lib/app/progress.ts` and in every spec and e2e line together, in its own commit.
- Where this plan and the D-7 frames disagree on spacing or a class name, the frame wins on the look and this plan wins on behaviour and names. Where they disagree on behaviour, stop and ask Tim.
