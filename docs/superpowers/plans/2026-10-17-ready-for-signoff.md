# Ready for Sign-off (with the Document Link) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A student sets one link to their work, marks a checkpoint **Ready for sign-off** with an optional note, and the teacher works through a queue of those requests. On the student's page the teacher answers each with **Accept** or **Not yet**, plus an optional note, and both sides keep the history.

**Architecture:** `V13` adds `document_link` (append-only: every link a student has set; the newest is current), `signoff_request` (append-only except for closing a request once, by withdrawing or answering, with a partial unique index allowing one open request per student and checkpoint), and `component_instance.require_link_for_signoff`. Storage lives in `components`, next to `SignoffRepository`, because the student's page reads it. The student's ask/withdraw and the teacher's waiting counts are a new `SignoffRequestService` in `progress`; the teacher's answer goes in `ProgressService`, because accepting is a sign-off. `CheckpointState` gains `READY`, which is never counted as behind. The frontend is built working-first in the app's existing Navy style. Pack D-10 is prompted in Task 1, and Task 23 restyles to it once it arrives.

**Tech Stack:** Spring Boot 4.1, `JdbcClient`, Postgres 18 (partial unique index, `ON CONFLICT … WHERE`, plpgsql guard triggers, `DISTINCT ON`), Jakarta Bean Validation; Next.js 15.3.9 server components, Zod 4, Vitest + Testing Library, `node:test`, Playwright + axe.

**Spec:** `docs/intent/ready-for-signoff.md` (the confirmed statement of intent). It folds backlog #2 (`document-link`) into #1. **Backlog:** `docs/BACKLOG.md` §1 and §2. **Requirements:** `docs/newDevelopement/FUNCTIONAL-SPEC.md` FR-38–40 (§6.8). **Builds on:** Phase 4, `docs/superpowers/plans/2026-09-28-pilot-4-teacher-grid.md` and `docs/ARCHITECTURE.md` §4–§6.

---

## Global Constraints

- **Test first, every task** (CLAUDE.md). Write the test, run it, and watch it fail for the reason you expect before writing the code.
- **404, never 403.** Student endpoints start with `ComponentRepository.findForApprovedStudent(componentId, actor.userId())`. Teacher endpoints start with `ComponentService.requireOwned(actor, componentId)`, then an approved-member check. Any checkpoint id is looked up with `TemplateRepository.checkpointInVersion` against the brief's version. Any failure is `NOT_FOUND`.
- **Nothing is deleted.** `document_link` rows are never updated or deleted. A `signoff_request` row is closed once (withdrawn or answered) and never changed again. Triggers enforce both.
- **Links are `https`, stored, and never fetched** (FR-39, CLAUDE.md, design §9). Render them with `target="_blank" rel="noopener noreferrer"`.
- **Never invent SEC or NCCA content.** The backup line (FR-40) is quoted from the 2027 briefs, p. 3, and a test proves it's on that page (Task 14).
- **Teacher notes are prompted as general and nondirective.** Teachers "should not engage in corrections of the report for redrafting" (design §4, Biology guidelines p. 9).
- **Nothing written into the student's log.** Requests and answers live only in `signoff_request`.
- **Specs query by role and accessible name.** The names in Task 14's `lib/app/ready.ts` are the contract that D-10's restyle must keep.
- **Tokens only.** No raw hex in components. New colours go into `globals.css` as `--app-*`.
- **Bind timestamps with `Timestamps.utc(instant)`; read `OffsetDateTime`** (CLAUDE.md).
- **Zod schemas mirror the backend records field for field** (CLAUDE.md), in the same commit.
- **`make verify` green before every task commit.** One task, one commit. The message says the behaviour.
- **Branch:** `pilot/ready-for-signoff` from `pilotMain`. Don't push; Tim pushes and merges.
- **Never commit** `docs/newDevelopement/subjectDocs/Tim_Mc_Sweeney_CV_September_2026.pdf` or `.idea/`.

## Decisions made

From the interview (`docs/intent/ready-for-signoff.md`, 17 Oct 2026):

| # | Question | Decision |
|---|---|---|
| R-1 | Where does the teacher's accept/decline note live? | On the request, as a per-checkpoint history both sides see. Never in the student's log. |
| R-2 | What does the grid show after a decline? | Back to Due / Not due yet. No "declined" grid state. |
| R-3 | Where does the teacher answer? | On the student's page, opened at that checkpoint. Not in the queue. |
| R-4 | Fold in `document-link`? | Yes. A request is only useful with a link to the work. This pulls FR-38–40 forward from design §2's "not in the pilot" table; Task 22 records that. |
| R-5 | Link per component or per request? | Per component. Every request shows the component's **current** link. |
| R-6 | Is a link required to ask? | The teacher chooses per class (one class has exactly one component: `component_instance.class_group_id` is `UNIQUE`). Off by default. |
| R-7 | Settings page or one switch? | One switch on the Component tab. A Settings tab comes once a second setting appears. |
| R-8 | Can a student withdraw? | Yes, until it's answered. |

Decided while writing this plan (Tim: check these):

| # | Question | Decision |
|---|---|---|
| R-9 | Does a Ready checkpoint count as "behind"? | **No.** `READY` is its own `CheckpointState`. `Standing.behindBy` counts only `DUE`, so a student who has asked moves out of the behind bands until the teacher answers. A Not yet puts them straight back. The alternative (keep counting it) would put students waiting on the teacher among the ones the teacher has to chase. |
| R-10 | What does a Ready cell on the grid do? | It's a **link** to the student's page at that checkpoint ("Ready · Review"), not a Sign off button. That follows R-3: look at the work before accepting. Due and Not due yet cells keep their one-click Sign off. |
| R-11 | The teacher signs off from the grid while a request is open (e.g. a Due cell signed in class). | The sign-off **answers the open request as Accepted**, with no note, in the same transaction. Backlog §1: "Signing off clears the request." |
| R-12 | Undo or revoke a sign-off that came from an Accept. | The request stays Accepted in the history. The revoked sign-off shows in the sign-off history as before, and the student can ask again. Nothing rewrites history. |
| R-13 | Asking when one is already open (double-click, two tabs). | Idempotent: `ON CONFLICT … DO NOTHING`. The response is the existing open request, and no audit event is written. |
| R-14 | Asking for a checkpoint that's already signed off. | `409 CHECKPOINT_ALREADY_SIGNED_OFF`. |
| R-15 | Withdrawing or answering when nothing is open (the other side got there first). | `409 SIGNOFF_REQUEST_NOT_OPEN`. The page refreshes and shows what happened. |
| R-16 | What the history shows. | Answered requests, newest first, each with: asked on, the student's note, Accepted / Not yet, answered on, the teacher's note. Withdrawn requests stay in the table and the audit log but aren't shown: they're noise to both readers. |
| R-17 | Note limits. | Student note ≤ 280 characters, teacher note ≤ 500. Both optional. Blank becomes null. A `CHECK` in the table and `@Size` on the request. |
| R-18 | Can a student remove their link? | Not in this plan. They can replace it, which keeps history. Removing it would need a "no link" row and a rule for when the class requires one. |
| R-19 | Setting the same link again. | No new row. The service returns the current link unchanged. |
| R-20 | The pack's name. | **D-10.** D-8 (School overview) and D-9 (Writing tools) are already reserved in `docs/design/prompts/README.md`. The intent doc said D-8 and is corrected in Task 1. |
| R-21 | Where the waiting count for `/teach` comes from. | A separate endpoint, `GET /api/v1/signoff-requests/waiting`, in `progress`. The page merges it by `classId`. `ClassSummary` can't carry it: `classes` would have to read a `components` table, and `components` already depends on `classes`. |
| R-22 | FR-40's backup reminder. | Quoted, not paraphrased: "It is strongly recommended that you make and regularly update a backup copy of your digital report, which can be used in the event of loss or corruption." It's on p. 3 of all four 2027 briefs (`SEC-2027L025C2EL`, `…022…`, `…021…`, `…033…`). `AppCopySourcesTest` proves it. |

## Concepts in play

| Concept | What it is | Why here | Already used in |
|---|---|---|---|
| Partial unique index | A unique index over only the rows matching a `WHERE` | "At most one *open* request per student and checkpoint", while any number of closed ones stay | `V12__checkpoint_signoffs.sql` (`checkpoint_signoff_current`) |
| `INSERT … ON CONFLICT … WHERE … DO NOTHING RETURNING id` | Postgres skips the insert when the partial index would be violated, and returns no row | A double-click on Ready makes one request and one audit event (R-13) | `SignoffRepository.signOff` |
| `UPDATE … WHERE <open> RETURNING id` | The update only matches a row that's still open; empty means someone closed it first | Withdraw and answer can race. The loser gets `SIGNOFF_REQUEST_NOT_OPEN` (R-15) | `SignoffRepository.revoke` |
| Append-only guard trigger | `BEFORE UPDATE OR DELETE` raises `check_violation` for anything but the allowed change | Link history and request history can't be rewritten | `V11__log.sql`, `V12__checkpoint_signoffs.sql` |
| `DISTINCT ON` | Postgres keeps the first row per group in the `ORDER BY` | "Each student's newest link" in one query for the grid | New here |
| History table, current = newest | Every change is a new row, and readers take the latest | Old links are kept (backlog §2's guess), with no "current" flag to keep in sync | `log_entry_revision` |
| Fixed number of queries | Load each kind of row once, then join in Java | The grid grows by two queries (open requests, current links), not two per student | `ProgressService.grid` |
| Package dependency direction | `progress → components → classes`, never back | Why the waiting count is its own endpoint (R-21) | `ARCHITECTURE.md` §5, the `progress` bullet |
| Idempotent writes | The same request twice leaves the same state | Ask (R-13), set link (R-19) | `PUT …/signoff` |
| `role="switch"` checkbox | A native checkbox announced as an on/off switch | The require-link setting | `LogEntryForm` visibility |
| Live region | `aria-live="polite"` text a screen reader announces | "Sent to your teacher", "Accepted …" | `ItemTick`, `useSignoffs` |
| Fragment link to a section | `…/students/{id}#checkpoint-{cid}` scrolls to the element with that id | The queue opens the student page at the right checkpoint (R-3) | New here |
| `rel="noopener noreferrer"` | The opened tab can't reach `window.opener`, and no `Referer` is sent | Student links go to third-party hosts (design §9) | Log `SOURCE` links |

## File structure

**Backend**

| File | Responsibility |
|---|---|
| `backend/src/main/resources/db/migration/V13__ready_for_signoff.sql` | Create: `document_link`, `signoff_request`, the setting column, indexes, guards |
| `backend/src/main/java/ie/coursework/shared/link/HttpsLink.java` | Move from `log/domain` (components can't import `log`) |
| `backend/src/main/java/ie/coursework/components/domain/{RequestOutcome,SignoffRequest,DocumentLink}.java` | Create |
| `backend/src/main/java/ie/coursework/components/domain/CheckpointState.java` | Modify: `READY`, four-argument `at` |
| `backend/src/main/java/ie/coursework/components/adapter/persistence/{SignoffRequestRepository,DocumentLinkRepository}.java` | Create |
| `backend/src/main/java/ie/coursework/components/adapter/persistence/ComponentRepository.java` | Modify: `requiresLink`, `setRequireLink` |
| `backend/src/main/java/ie/coursework/components/application/ComponentViews.java` | Modify: link, request and answer views; `CheckpointView`, `StudentComponent`, `TeacherComponent` |
| `backend/src/main/java/ie/coursework/components/application/RequestViews.java` | Create: rows → views, shared with `progress` |
| `backend/src/main/java/ie/coursework/components/application/ComponentService.java` | Modify: `setDocumentLink`, `setSettings`, student view |
| `backend/src/main/java/ie/coursework/components/adapter/web/{DocumentLinkRequest,ComponentSettingsRequest}.java`, `ComponentController.java` | Create / modify: two endpoints |
| `backend/src/main/java/ie/coursework/progress/application/SignoffRequestService.java` | Create: ask, withdraw, waiting counts |
| `backend/src/main/java/ie/coursework/progress/application/{ProgressService,ProgressViews}.java` | Modify: answer; sign-off closes a request; Ready, queue and links in the views |
| `backend/src/main/java/ie/coursework/progress/adapter/web/{SignoffRequestController,AskRequest,AnswerRequest}.java`, `ProgressController.java` | Create / modify |
| `backend/src/main/java/ie/coursework/{audit/AuditEventType,shared/error/ErrorCode}.java` | Modify: four events, three codes |
| Tests | `components/adapter/persistence/{ReadySchemaTest,SignoffRequestRepositoryTest,DocumentLinkRepositoryTest}`, `components/domain/CheckpointStateTest` (modify), `shared/link/HttpsLinkTest` (moved), `components/adapter/web/{DocumentLinkTest,ComponentSettingsTest}`, `components/adapter/web/StudentComponentViewTest` (modify), `progress/adapter/web/{SignoffRequestTest,AnswerTest,WaitingCountsTest}`, `progress/adapter/web/{ProgressGridTest,StudentCheckpointsTest}` (modify), `progress/domain/StandingTest` (modify), `progress/authz/SignoffRequestScopeTest`, `content/AppCopySourcesTest` |

**Frontend**

| File | Responsibility |
|---|---|
| `frontend/lib/api/schemas.ts` | Modify: mirror every changed record |
| `frontend/lib/app/ready.ts` (+ `.test.ts`) | Create: limits, the backup quote, copy, accessible names, dates |
| `frontend/components/app/work-link.tsx` | Create: the one way a student's link is rendered |
| `frontend/components/app/document-link-card.tsx` (+ spec) | Create: the student's "Your work" card |
| `frontend/components/app/request-history.tsx` (+ spec) | Create: answered requests, both sides |
| `frontend/components/app/ready-control.tsx` (+ spec) | Create: Ready / Withdraw / Ask again in the stage card |
| `frontend/components/app/{stage-card,stages-section,component-overview}.tsx` (+ specs) | Modify: pass link and setting down, show the control |
| `frontend/components/app/require-link-switch.tsx` (+ spec) | Create: the Component tab setting |
| `frontend/components/app/signoff-parts.tsx` (+ spec) | Modify: the Ready cell |
| `frontend/components/app/waiting-queue.tsx` (+ spec) | Create: the queue on Progress |
| `frontend/components/app/progress-grid.tsx` (+ spec) | Modify: work link on each row, Ready cells link to review |
| `frontend/components/app/request-review.tsx` (+ spec) | Create: Accept / Not yet on the student page |
| `frontend/components/app/student-checkpoints.tsx` (+ spec) | Modify: anchors, review panel, history |
| `frontend/components/app/class-list.tsx` (+ spec) | Modify: waiting badge |
| `frontend/app/(app)/teach/page.tsx`, `…/classes/[id]/component/page.tsx`, `…/progress/page.tsx`, `…/students/[studentId]/page.tsx` | Modify |
| `frontend/app/globals.css` | Modify: `--app-ready*` tokens |
| `frontend/e2e/ready-for-signoff.e2e.ts` | Create: the journey |

---

## Task 1: Branch, the intent, the D-10 prompt and the roadmap's rows

**Files:**
- Create: `docs/design/prompts/D-10-ready-for-signoff.md`
- Modify: `docs/design/prompts/README.md` (pack table), `docs/intent/ready-for-signoff.md` (D-8 → D-10), `docs/PILOT-ROADMAP.md` (§6.2 rows, §6.3 pack row, §7 endpoint rows), `docs/BACKLOG.md` (status column)
- Add to git: `docs/BACKLOG.md`, `docs/intent/ready-for-signoff.md`, this plan

Roadmap §6.3 rule 4: a design that changes behaviour updates §6.2 before it's built. The roadmap is frozen for new work, but its page inventory "still holds" (BACKLOG.md), so keep it true.

- [ ] **Step 1: Branch.** The working tree has Tim's uncommitted `CLAUDE.md`, `docs/PILOT-ROADMAP.md` and the deleted `.claude/skills/migrate-radix-to-base`. Ask Tim whether to commit those on `pilotMain` first. Don't stash or discard them.

```bash
git checkout pilotMain
git checkout -b pilot/ready-for-signoff
```

- [ ] **Step 2: Check the intent doc** names the pack D-10 (corrected while this plan was written; R-20).

- [ ] **Step 3: Write `docs/design/prompts/D-10-ready-for-signoff.md`.** Follow `D-7-progress-grid.md`'s structure. Read it first and reuse its opening paragraphs on the Navy direction and `tokens.css`. The prompt must cover:
  1. **What exists:** the D-3 stage card's checkpoint box (paste `stage-card.tsx`'s current strings), D-7's grid cell (word plus tint), D-7's student-page Checkpoints rows, and D-2's class card with its amber pending badge.
  2. **Frames to draw, at 390px and 1140px:**
     - Student, "Your work" card: no link (with required and not-required variants), link set, editing.
     - Student, checkpoint box in five states: not asked, the Ready form open (note field, the link it will send or the missing-link nudge), waiting (with Withdraw), Not yet with the teacher's note and Ask again, and signed off with the teacher's accept note.
     - Teacher, the Progress tab's queue above the grid: zero, one, and several waiting (in order of asking). Also the grid's **Ready · Review** cell and the row's work link.
     - Teacher, the student page's review panel: the student's note, the link (or "No link yet"), the note field with its nondirective help line, Accept and Not yet, busy and failed states, and the answered history.
     - Teacher, the Component tab's require-link switch.
     - Teacher, `/teach` class card with "N waiting for sign-off" beside the pending badge.
  3. **Rules the pack must keep:** every accessible name in Task 14's `ready.ts` (paste the list); the backup quote verbatim with its attribution; links open in a new tab and say so; no colour-only state; 44px targets; 8px gaps (or name the exception, as D-7 did).
  4. **Copy:** the strings in `ready.ts`, marked "draft, the pack may change visible copy, never accessible names".

- [ ] **Step 4: Add the pack row** to `docs/design/prompts/README.md`'s pack table, after D-9:

```markdown
| D-10 | Ready for sign-off: the student's work link and Ready control, the teacher's queue, review panel and require-link switch | `D-10-ready-for-signoff.md` |
```

- [ ] **Step 5: Update `docs/PILOT-ROADMAP.md` §6.2.** Append to each row's existing text; keep what's there.
  - `/components/[id]` (student): shows "a **Your work** card: the current link to the report, Change, and the SEC brief's backup line (FR-38–40)". Each checkpoint shows "Ready for sign-off (optional note) · Waiting, with Withdraw · Not yet with the teacher's note and Ask again · the answered history".
  - `/teach/classes/[id]/progress`: "a queue above the grid, *N students waiting for you*, oldest request first, each opening the student page at that checkpoint; a fourth cell state, **Ready**, that links to the review; each row's work link".
  - `/teach/classes/[id]/students/[studentId]`: "the student's work link; on a checkpoint with an open request, the student's note and Accept / Not yet with an optional note; the answered history per checkpoint".
  - `/teach/classes/[id]/component`: "a switch: Require a link to their work before students ask for sign-off (off by default)".
  - `/teach`: "a **N waiting for sign-off** badge per class".
- [ ] **Step 6: Add §6.3's D-10 row**, "Needed by: ready-for-signoff (backlog #1), restyle in Task 23".
- [ ] **Step 7: Add §7's endpoint rows** under a new heading "Backlog: ready-for-signoff":

```markdown
| PUT | `/api/v1/components/{id}/document-link` | Student (approved) | `{url}` → `{url, setOn}` |
| PUT | `/api/v1/components/{id}/settings` | Class teacher | `{requireLink}` → teacher component view |
| POST | `/api/v1/components/{id}/checkpoints/{checkpointId}/request` | Student (approved) | `{note?}` → `{askedOn, note}` (201) |
| DELETE | `/api/v1/components/{id}/checkpoints/{checkpointId}/request` | Student (approved) | withdraw → 204 |
| POST | `/api/v1/components/{id}/students/{studentId}/checkpoints/{checkpointId}/request/answer` | Class teacher | `{outcome: ACCEPTED|NOT_YET, note?}` → cell |
| GET | `/api/v1/signoff-requests/waiting` | Teacher | `[{classId, waiting}]` |
```

- [ ] **Step 8: Backlog.** Set row 1's status to `planned: docs/superpowers/plans/2026-10-17-ready-for-signoff.md` and row 2's to `folded into ready-for-signoff`.
- [ ] **Step 9: Commit.**

```bash
git add docs/BACKLOG.md docs/intent/ready-for-signoff.md docs/superpowers/plans/2026-10-17-ready-for-signoff.md \
  docs/design/prompts/D-10-ready-for-signoff.md docs/design/prompts/README.md docs/PILOT-ROADMAP.md
git commit -m "Plan ready-for-signoff with the document link folded in, and prompt the D-10 pack"
```

---

## Task 2: `V13`: links and requests that are never rewritten

**Files:**
- Create: `backend/src/main/resources/db/migration/V13__ready_for_signoff.sql`
- Test: `backend/src/test/java/ie/coursework/components/adapter/persistence/ReadySchemaTest.java`

- [ ] **Step 1: Write the failing test.**

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

/** Backlog ready-for-signoff: links and requests are history; a request closes once and is never changed again. */
class ReadySchemaTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;

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

    private UUID ask() {
        return jdbcTemplate.queryForObject("""
                INSERT INTO signoff_request (instance_id, student_user_id, checkpoint_id, asked_at, student_note)
                VALUES (?, ?, ?, now(), 'plan on page 2') RETURNING id
                """, UUID.class, component, world.approvedStudent(), checkpoint);
    }

    private void answer(UUID id) {
        jdbcTemplate.update("""
                UPDATE signoff_request SET answered_by_user_id = ?, answered_at = now(), outcome = 'NOT_YET', teacher_note = 'add a hypothesis'
                WHERE id = ?
                """, world.teacher1(), id);
    }

    @Test
    void theSettingIsOffByDefault() {
        assertThat(jdbcTemplate.queryForObject("SELECT require_link_for_signoff FROM component_instance WHERE id = ?",
                Boolean.class, component)).isFalse();
    }

    @Test
    void aLinkIsNeverChangedOrDeleted() {
        UUID link = jdbcTemplate.queryForObject("""
                INSERT INTO document_link (instance_id, student_user_id, url, set_at) VALUES (?, ?, 'https://docs.google.com/d/1', now())
                RETURNING id
                """, UUID.class, component, world.approvedStudent());
        assertRefused("UPDATE document_link SET url = 'https://evil.example' WHERE id = ?", link, "document_link");
        assertRefused("DELETE FROM document_link WHERE id = ?", link, "document_link");
    }

    @Test
    void aSecondOpenRequestForTheSameCheckpointIsRefused() {
        ask();
        assertThatThrownBy(this::ask).isInstanceOf(DuplicateKeyException.class).hasMessageContaining("signoff_request_open");
    }

    @Test
    void anAnsweredRequestLetsTheStudentAskAgainAndBothRowsStay() {
        answer(ask());
        ask();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM signoff_request", Integer.class)).isEqualTo(2);
    }

    @Test
    void aClosedRequestIsNeverChangedAgain() {
        UUID id = ask();
        answer(id);
        assertRefused("UPDATE signoff_request SET teacher_note = 'changed my mind' WHERE id = ?", id, "signoff_request");
        assertRefused("UPDATE signoff_request SET withdrawn_at = now() WHERE id = ?", id, "signoff_request");
        assertRefused("DELETE FROM signoff_request WHERE id = ?", id, "signoff_request");
    }

    @Test
    void anOpenRequestsQuestionIsNeverRewritten() {
        UUID id = ask();
        assertRefused("UPDATE signoff_request SET student_note = 'something else' WHERE id = ?", id, "signoff_request");
        assertRefused("UPDATE signoff_request SET asked_at = asked_at - interval '3 days' WHERE id = ?", id, "signoff_request");
    }

    @Test
    void anAnswerHasItsTeacherDateAndOutcomeTogether() {
        UUID id = ask();
        assertThatThrownBy(() -> jdbcTemplate.update("UPDATE signoff_request SET answered_at = now() WHERE id = ?", id))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("signoff_request_answered_together");
    }

    @Test
    void notesHaveLimits() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO signoff_request (instance_id, student_user_id, checkpoint_id, asked_at, student_note)
                VALUES (?, ?, ?, now(), repeat('x', 281))
                """, component, world.approvedStudent(), checkpoint)).isInstanceOf(DataIntegrityViolationException.class);
    }

    private void assertRefused(String sql, UUID id, String table) {
        assertThatThrownBy(() -> jdbcTemplate.update(sql, id))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining(table);
    }
}
```

- [ ] **Step 2: Run** `cd backend && ./mvnw test -Dtest=ReadySchemaTest` → FAIL (`column "require_link_for_signoff" does not exist`).

- [ ] **Step 3: Write the migration.**

```sql
-- Backlog ready-for-signoff (docs/intent/ready-for-signoff.md). A student's link to their work, their requests for a
-- checkpoint's sign-off and the teacher's answers. Keyed on student and component, like checkpoint_signoff. Never
-- deleted; erasure goes through the school (roadmap R8), whose procedure will need to lift these triggers.

-- One class has one component, so this is the per-class setting (decision R-6).
ALTER TABLE component_instance ADD COLUMN require_link_for_signoff boolean NOT NULL DEFAULT false;

-- Every link a student has set for a component; the newest is current (FR-38). Stored, never fetched (FR-39).
CREATE TABLE document_link (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     uuid        NOT NULL REFERENCES component_instance (id),
    student_user_id uuid        NOT NULL REFERENCES app_user (id),
    url             text        NOT NULL CHECK (char_length(url) <= 2000),
    set_at          timestamptz NOT NULL
);
CREATE INDEX document_link_current_idx ON document_link (instance_id, student_user_id, set_at DESC);

CREATE FUNCTION document_link_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'document_link is history: a new link is a new row' USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER document_link_guard BEFORE UPDATE OR DELETE ON document_link
    FOR EACH ROW EXECUTE FUNCTION document_link_guard();

-- A request is open until the student withdraws it or the teacher answers it, once.
CREATE TABLE signoff_request (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id         uuid        NOT NULL REFERENCES component_instance (id),
    student_user_id     uuid        NOT NULL REFERENCES app_user (id),
    checkpoint_id       uuid        NOT NULL REFERENCES template_checkpoint (id),
    asked_at            timestamptz NOT NULL,
    student_note        text        CHECK (char_length(student_note) <= 280),
    withdrawn_at        timestamptz,
    answered_by_user_id uuid        REFERENCES app_user (id),
    answered_at         timestamptz,
    outcome             text        CHECK (outcome IN ('ACCEPTED', 'NOT_YET')),
    teacher_note        text        CHECK (char_length(teacher_note) <= 500),
    CONSTRAINT signoff_request_answered_together
        CHECK ((answered_by_user_id IS NULL) = (answered_at IS NULL) AND (answered_at IS NULL) = (outcome IS NULL)),
    CONSTRAINT signoff_request_note_needs_answer CHECK (teacher_note IS NULL OR answered_at IS NOT NULL),
    CONSTRAINT signoff_request_closed_once CHECK (withdrawn_at IS NULL OR answered_at IS NULL)
);

-- At most one open request per student and checkpoint in a component. SignoffRequestRepository.ask's ON CONFLICT
-- names exactly these columns and this predicate.
CREATE UNIQUE INDEX signoff_request_open
    ON signoff_request (instance_id, student_user_id, checkpoint_id) WHERE withdrawn_at IS NULL AND answered_at IS NULL;
CREATE INDEX signoff_request_component_idx ON signoff_request (instance_id, asked_at);

CREATE FUNCTION signoff_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE'
       OR OLD.withdrawn_at IS NOT NULL OR OLD.answered_at IS NOT NULL
       OR (NEW.withdrawn_at IS NULL AND NEW.answered_at IS NULL)
       OR NEW.id <> OLD.id OR NEW.instance_id <> OLD.instance_id
       OR NEW.student_user_id <> OLD.student_user_id OR NEW.checkpoint_id <> OLD.checkpoint_id
       OR NEW.asked_at <> OLD.asked_at OR NEW.student_note IS DISTINCT FROM OLD.student_note THEN
        RAISE EXCEPTION 'signoff_request is never deleted: an open row may be withdrawn or answered, once'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER signoff_request_guard BEFORE UPDATE OR DELETE ON signoff_request
    FOR EACH ROW EXECUTE FUNCTION signoff_request_guard();
```

`UPDATE … SET answered_at = now()` alone passes the trigger, because the row is open and becomes closed. The `signoff_request_answered_together` constraint is what refuses it, which is what the test asserts.

- [ ] **Step 4: Run** `./mvnw test -Dtest='ReadySchemaTest,ContentResetPolicyTest'` → PASS. Both new tables are app tables: they're truncated before each test and **must not** go in `PRESERVED_TABLES`.
- [ ] **Step 5: Commit.** `git add -A backend && git commit -m "Store document links and sign-off requests as history that is never rewritten"`

---

## Task 3: `HttpsLink` moves to `shared`; the request records; `READY`

**Files:**
- Move: `backend/src/main/java/ie/coursework/log/domain/HttpsLink.java` → `backend/src/main/java/ie/coursework/shared/link/HttpsLink.java`, and its test to `backend/src/test/java/ie/coursework/shared/link/HttpsLinkTest.java`
- Modify: `log/domain/LogContent.java` (import)
- Create: `components/domain/RequestOutcome.java`, `components/domain/SignoffRequest.java`, `components/domain/DocumentLink.java`
- Modify: `components/domain/CheckpointState.java`, `components/domain/CheckpointStateTest.java`, `progress/domain/StandingTest.java`
- Modify callers: `components/application/ComponentService.java:157`, `progress/application/ProgressService.java` (`cell`, `setSignoff`)

`components` validates links now, and `log` already depends on `components`, so `components` importing `log.domain.HttpsLink` would make a cycle.

- [ ] **Step 1: Move `HttpsLink`.**

```bash
mkdir -p backend/src/main/java/ie/coursework/shared/link backend/src/test/java/ie/coursework/shared/link
git mv backend/src/main/java/ie/coursework/log/domain/HttpsLink.java backend/src/main/java/ie/coursework/shared/link/HttpsLink.java
git mv backend/src/test/java/ie/coursework/log/domain/HttpsLinkTest.java backend/src/test/java/ie/coursework/shared/link/HttpsLinkTest.java
```

Change both files' `package` line to `package ie.coursework.shared.link;`, and add `import ie.coursework.shared.link.HttpsLink;` to `LogContent.java`. Run `./mvnw test -Dtest='HttpsLinkTest,LogContentTest'` → PASS.

- [ ] **Step 2: Write the failing state test.** Replace the body of `CheckpointStateTest` with the four-argument form and add the Ready cases:

```java
    private static final LocalDate TODAY = LocalDate.of(2027, 3, 3);

    @Test
    void aSignOffSettlesItWhateverTheDateOrRequest() {
        assertThat(CheckpointState.at(TODAY.minusDays(9), TODAY, true, true)).isEqualTo(CheckpointState.SIGNED_OFF);
        assertThat(CheckpointState.at(null, TODAY, true, false)).isEqualTo(CheckpointState.SIGNED_OFF);
    }

    @Test
    void anOpenRequestIsReadyBeforeOrAfterTheDate() {
        assertThat(CheckpointState.at(TODAY.minusDays(1), TODAY, false, true)).isEqualTo(CheckpointState.READY);
        assertThat(CheckpointState.at(TODAY.plusDays(5), TODAY, false, true)).isEqualTo(CheckpointState.READY);
        assertThat(CheckpointState.at(null, TODAY, false, true)).isEqualTo(CheckpointState.READY);
    }

    @Test
    void withoutEitherItIsDueOnceTheDateHasPassed() {
        assertThat(CheckpointState.at(TODAY.minusDays(1), TODAY, false, false)).isEqualTo(CheckpointState.DUE);
        assertThat(CheckpointState.at(TODAY, TODAY, false, false)).isEqualTo(CheckpointState.NOT_DUE);
        assertThat(CheckpointState.at(null, TODAY, false, false)).isEqualTo(CheckpointState.NOT_DUE);
    }
```

Add to `StandingTest`:

```java
    @Test
    void aReadyCheckpointIsNotBehind() { // decision R-9
        assertThat(Standing.behindBy(List.of(CheckpointState.READY, CheckpointState.DUE, CheckpointState.SIGNED_OFF))).isEqualTo(1);
    }
```

- [ ] **Step 3: Run** `./mvnw test -Dtest='CheckpointStateTest,StandingTest'` → FAIL to compile (`READY`, four arguments).

- [ ] **Step 4: Implement.** `CheckpointState`:

```java
/**
 * Design §8.4: a checkpoint is due once its stage's date has passed. A sign-off settles it whenever it was
 * given (plan P4-5). An open request makes it READY: the student is waiting on the teacher, so it is never
 * counted as behind (ready-for-signoff R-9).
 */
public enum CheckpointState {
    NOT_DUE,
    DUE,
    READY,
    SIGNED_OFF;

    public static CheckpointState at(LocalDate stageDate, LocalDate today, boolean signedOff, boolean requested) {
        if (signedOff) {
            return SIGNED_OFF;
        }
        if (requested) {
            return READY;
        }
        return stageDate != null && stageDate.isBefore(today) ? DUE : NOT_DUE;
    }
}
```

Pass `false` as the new fourth argument at each existing caller for now (`ComponentService.studentView`, `ProgressService.cell`, `ProgressService.setSignoff`); Tasks 8 and 10 replace it. `Standing.behindBy` already counts only `DUE`; leave it.

The three domain records:

```java
package ie.coursework.components.domain;

/** The teacher's answer to a request for sign-off (ready-for-signoff R-1). Names are API contract. */
public enum RequestOutcome { ACCEPTED, NOT_YET }
```

```java
package ie.coursework.components.domain;

import java.time.Instant;
import java.util.UUID;

/** One row of signoff_request, never a withdrawn one (decision R-16). Open until {@code answeredAt} is set. */
public record SignoffRequest(UUID id, UUID studentId, UUID checkpointId, Instant askedAt, String studentNote,
        Instant answeredAt, RequestOutcome outcome, String teacherNote) {

    public boolean open() {
        return answeredAt == null;
    }
}
```

```java
package ie.coursework.components.domain;

import java.time.Instant;

/** A student's current link to their work in one component (FR-38). */
public record DocumentLink(String url, Instant setAt) {}
```

- [ ] **Step 5: Run** `./mvnw test -Dtest='CheckpointStateTest,StandingTest,ProgressGridTest,StudentComponentViewTest'` → PASS.
- [ ] **Step 6: Commit.** `git add -A backend && git commit -m "Add the Ready checkpoint state, which is never behind, and move HttpsLink to shared"`

---

## Task 4: `SignoffRequestRepository` and `DocumentLinkRepository`

**Files:**
- Create: `components/adapter/persistence/SignoffRequestRepository.java`, `components/adapter/persistence/DocumentLinkRepository.java`
- Modify: `components/adapter/persistence/ComponentRepository.java` (`requiresLink`, `setRequireLink`)
- Test: `components/adapter/persistence/SignoffRequestRepositoryTest.java`, `components/adapter/persistence/DocumentLinkRepositoryTest.java`

**Interfaces (produces):**
```java
// SignoffRequestRepository
Optional<UUID> ask(UUID componentId, UUID studentId, UUID checkpointId, String note, Instant now)
Optional<UUID> withdraw(UUID componentId, UUID studentId, UUID checkpointId, Instant now)
Optional<UUID> answer(UUID componentId, UUID studentId, UUID checkpointId, UUID teacherId, RequestOutcome outcome, String note, Instant now)
List<SignoffRequest> open(UUID componentId)                        // oldest first
List<SignoffRequest> forStudent(UUID componentId, UUID studentId)  // not withdrawn, newest first
Map<UUID, Integer> waitingByClass(UUID teacherId)                  // classId → open requests from approved students
// DocumentLinkRepository
void add(UUID componentId, UUID studentId, String url, Instant now)
Optional<DocumentLink> current(UUID componentId, UUID studentId)
Map<UUID, DocumentLink> currentFor(UUID componentId)               // studentId → link
// ComponentRepository
boolean requiresLink(UUID componentId)
void setRequireLink(UUID componentId, boolean required)
```

- [ ] **Step 1: Write the failing tests.**

```java
package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.components.domain.RequestOutcome;
import ie.coursework.components.domain.SignoffRequest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class SignoffRequestRepositoryTest extends PostgresIntegrationTest {

    private static final String BIO = ComponentFixtures.BIOLOGY_2027;
    private static final Instant T0 = Instant.parse("2027-03-03T09:00:00Z");

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private SignoffRequestRepository requests;

    private ClassFixtures.World world;
    private UUID component;
    private UUID cp1;
    private UUID cp2;
    private UUID student;

    @BeforeEach
    void aComponent() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), BIO);
        cp1 = components.checkpointId(BIO, 1);
        cp2 = components.checkpointId(BIO, 2);
        student = world.approvedStudent();
    }

    @Test
    void askingTwiceMakesOneRequest() {
        assertThat(requests.ask(component, student, cp1, "page 2", T0)).isPresent();
        assertThat(requests.ask(component, student, cp1, "again", T0.plusSeconds(1))).isEmpty();
        assertThat(requests.open(component)).singleElement().extracting(SignoffRequest::studentNote).isEqualTo("page 2");
    }

    @Test
    void theQueueIsOldestFirst() {
        requests.ask(component, student, cp2, null, T0.plusSeconds(60));
        requests.ask(component, student, cp1, null, T0);
        assertThat(requests.open(component)).extracting(SignoffRequest::checkpointId).containsExactly(cp1, cp2);
    }

    @Test
    void aWithdrawnRequestLeavesTheQueueAndTheHistory() {
        requests.ask(component, student, cp1, null, T0);
        assertThat(requests.withdraw(component, student, cp1, T0.plusSeconds(5))).isPresent();
        assertThat(requests.withdraw(component, student, cp1, T0.plusSeconds(6))).isEmpty();
        assertThat(requests.open(component)).isEmpty();
        assertThat(requests.forStudent(component, student)).isEmpty();
    }

    @Test
    void anAnswerClosesTheRequestOnceAndStaysInTheHistory() {
        requests.ask(component, student, cp1, "page 2", T0);
        assertThat(requests.answer(component, student, cp1, world.teacher1(), RequestOutcome.NOT_YET, "add a hypothesis", T0.plusSeconds(9)))
                .isPresent();
        assertThat(requests.answer(component, student, cp1, world.teacher1(), RequestOutcome.ACCEPTED, null, T0.plusSeconds(10)))
                .isEmpty();
        assertThat(requests.forStudent(component, student)).singleElement().satisfies(r -> {
            assertThat(r.open()).isFalse();
            assertThat(r.outcome()).isEqualTo(RequestOutcome.NOT_YET);
            assertThat(r.teacherNote()).isEqualTo("add a hypothesis");
        });
    }

    @Test
    void waitingCountsOnlyOpenRequestsFromApprovedStudentsInTheTeachersClasses() {
        requests.ask(component, student, cp1, null, T0);
        requests.ask(component, student, cp2, null, T0);
        requests.answer(component, student, cp2, world.teacher1(), RequestOutcome.ACCEPTED, null, T0);
        requests.ask(component, world.removedStudent(), cp1, null, T0); // removed after asking
        assertThat(requests.waitingByClass(world.teacher1())).containsExactlyEntriesOf(java.util.Map.of(world.class1(), 1));
        assertThat(requests.waitingByClass(world.teacher2())).isEmpty();
    }
}
```

```java
package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class DocumentLinkRepositoryTest extends PostgresIntegrationTest {

    private static final Instant T0 = Instant.parse("2027-03-03T09:00:00Z");

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private DocumentLinkRepository links;
    @Autowired private ComponentRepository componentRepository;

    private ClassFixtures.World world;
    private UUID component;

    @BeforeEach
    void aComponent() {
        world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
    }

    @Test
    void theNewestLinkIsCurrentAndTheOldOnesStay() {
        links.add(component, world.approvedStudent(), "https://docs.google.com/d/old", T0);
        links.add(component, world.approvedStudent(), "https://docs.google.com/d/new", T0.plusSeconds(60));
        assertThat(links.current(component, world.approvedStudent())).hasValueSatisfying(l -> assertThat(l.url()).endsWith("/new"));
        assertThat(links.currentFor(component)).containsOnlyKeys(world.approvedStudent())
                .hasEntrySatisfying(world.approvedStudent(), l -> assertThat(l.url()).endsWith("/new"));
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM document_link", Integer.class)).isEqualTo(2);
    }

    @Test
    void noLinkIsEmpty() {
        assertThat(links.current(component, world.approvedStudent())).isEmpty();
    }

    @Test
    void theSettingRoundTrips() {
        assertThat(componentRepository.requiresLink(component)).isFalse();
        componentRepository.setRequireLink(component, true);
        assertThat(componentRepository.requiresLink(component)).isTrue();
    }
}
```

Before relying on `world.removedStudent()` in the waiting test, check `ClassFixtures.world()` creates that student's enrolment in `class1` with status `REMOVED`. If it's in another class, insert the request for a student you remove with `jdbcTemplate.update("UPDATE enrolment SET status = 'REMOVED' …")` instead.

- [ ] **Step 2: Run** `./mvnw test -Dtest='SignoffRequestRepositoryTest,DocumentLinkRepositoryTest'` → FAIL to compile.

- [ ] **Step 3: Implement `SignoffRequestRepository`.**

```java
package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.RequestOutcome;
import ie.coursework.components.domain.SignoffRequest;
import ie.coursework.shared.persistence.Timestamps;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Ready-for-signoff. Called only after a service has scoped the component, the student and the checkpoint; nothing
 * here checks who is asking. Rows are never deleted (V13). Withdrawn rows are never read back (decision R-16).
 */
@Repository
public class SignoffRequestRepository {

    private static final String OPEN = "withdrawn_at IS NULL AND answered_at IS NULL";
    private static final String SELECT = """
            SELECT id, student_user_id, checkpoint_id, asked_at, student_note, answered_at, outcome, teacher_note
            FROM signoff_request
            """;

    private final JdbcClient jdbc;

    public SignoffRequestRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The new row's id, or empty when one was already open (V13's partial index; nothing changed). */
    public Optional<UUID> ask(UUID componentId, UUID studentId, UUID checkpointId, String note, Instant now) {
        return jdbc.sql("""
                INSERT INTO signoff_request (instance_id, student_user_id, checkpoint_id, asked_at, student_note)
                VALUES (:component, :student, :checkpoint, :now, :note)
                ON CONFLICT (instance_id, student_user_id, checkpoint_id) WHERE withdrawn_at IS NULL AND answered_at IS NULL DO NOTHING
                RETURNING id
                """).param("component", componentId).param("student", studentId).param("checkpoint", checkpointId)
                .param("now", Timestamps.utc(now)).param("note", note)
                .query(UUID.class).optional();
    }

    /** The withdrawn row's id, or empty when nothing was open. */
    public Optional<UUID> withdraw(UUID componentId, UUID studentId, UUID checkpointId, Instant now) {
        return jdbc.sql("UPDATE signoff_request SET withdrawn_at = :now WHERE " + scope() + " AND " + OPEN + " RETURNING id")
                .param("component", componentId).param("student", studentId).param("checkpoint", checkpointId)
                .param("now", Timestamps.utc(now)).query(UUID.class).optional();
    }

    /** The answered row's id, or empty when nothing was open. */
    public Optional<UUID> answer(UUID componentId, UUID studentId, UUID checkpointId, UUID teacherId, RequestOutcome outcome,
            String note, Instant now) {
        return jdbc.sql("""
                UPDATE signoff_request SET answered_by_user_id = :teacher, answered_at = :now, outcome = :outcome, teacher_note = :note
                WHERE\s""" + scope() + " AND " + OPEN + " RETURNING id")
                .param("component", componentId).param("student", studentId).param("checkpoint", checkpointId)
                .param("teacher", teacherId).param("now", Timestamps.utc(now)).param("outcome", outcome.name()).param("note", note)
                .query(UUID.class).optional();
    }

    /** Every open request in a component, oldest first: the teacher's queue. */
    public List<SignoffRequest> open(UUID componentId) {
        return jdbc.sql(SELECT + " WHERE instance_id = :component AND " + OPEN + " ORDER BY asked_at, id")
                .param("component", componentId).query(SignoffRequestRepository::map).list();
    }

    /** One student's open and answered requests in a component, newest first. */
    public List<SignoffRequest> forStudent(UUID componentId, UUID studentId) {
        return jdbc.sql(SELECT + """
                 WHERE instance_id = :component AND student_user_id = :student AND withdrawn_at IS NULL
                ORDER BY asked_at DESC, id
                """).param("component", componentId).param("student", studentId).query(SignoffRequestRepository::map).list();
    }

    /** Open requests per class the teacher owns, counting only students still approved in that class. */
    public Map<UUID, Integer> waitingByClass(UUID teacherId) {
        Map<UUID, Integer> counts = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT i.class_group_id, count(*) AS waiting
                FROM signoff_request r
                JOIN component_instance i ON i.id = r.instance_id
                JOIN class_group g ON g.id = i.class_group_id
                JOIN enrolment e ON e.class_group_id = g.id AND e.student_user_id = r.student_user_id AND e.status = 'APPROVED'
                WHERE g.owner_user_id = :teacher AND r.withdrawn_at IS NULL AND r.answered_at IS NULL
                GROUP BY i.class_group_id
                """).param("teacher", teacherId)
                .query((rs, row) -> counts.put(rs.getObject("class_group_id", UUID.class), rs.getInt("waiting"))).list();
        return counts;
    }

    private static String scope() {
        return "instance_id = :component AND student_user_id = :student AND checkpoint_id = :checkpoint";
    }

    private static SignoffRequest map(ResultSet rs, int row) throws SQLException {
        OffsetDateTime answered = rs.getObject("answered_at", OffsetDateTime.class);
        String outcome = rs.getString("outcome");
        return new SignoffRequest(rs.getObject("id", UUID.class), rs.getObject("student_user_id", UUID.class),
                rs.getObject("checkpoint_id", UUID.class), rs.getObject("asked_at", OffsetDateTime.class).toInstant(),
                rs.getString("student_note"), answered == null ? null : answered.toInstant(),
                outcome == null ? null : RequestOutcome.valueOf(outcome), rs.getString("teacher_note"));
    }
}
```

- [ ] **Step 4: Implement `DocumentLinkRepository`.**

```java
package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.DocumentLink;
import ie.coursework.shared.persistence.Timestamps;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** FR-38–39. Every link is kept; the newest per student is current. Callers have already scoped the student. */
@Repository
public class DocumentLinkRepository {

    private final JdbcClient jdbc;

    public DocumentLinkRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void add(UUID componentId, UUID studentId, String url, Instant now) {
        jdbc.sql("INSERT INTO document_link (instance_id, student_user_id, url, set_at) VALUES (:component, :student, :url, :now)")
                .param("component", componentId).param("student", studentId).param("url", url).param("now", Timestamps.utc(now))
                .update();
    }

    public Optional<DocumentLink> current(UUID componentId, UUID studentId) {
        return jdbc.sql("""
                SELECT url, set_at FROM document_link WHERE instance_id = :component AND student_user_id = :student
                ORDER BY set_at DESC, id LIMIT 1
                """).param("component", componentId).param("student", studentId)
                .query((rs, row) -> new DocumentLink(rs.getString("url"), rs.getObject("set_at", OffsetDateTime.class).toInstant()))
                .optional();
    }

    /** Each student's current link in a component, in one query for the grid. */
    public Map<UUID, DocumentLink> currentFor(UUID componentId) {
        Map<UUID, DocumentLink> links = new HashMap<>();
        jdbc.sql("""
                SELECT DISTINCT ON (student_user_id) student_user_id, url, set_at FROM document_link
                WHERE instance_id = :component ORDER BY student_user_id, set_at DESC, id
                """).param("component", componentId)
                .query((rs, row) -> links.put(rs.getObject("student_user_id", UUID.class),
                        new DocumentLink(rs.getString("url"), rs.getObject("set_at", OffsetDateTime.class).toInstant())))
                .list();
        return links;
    }
}
```

- [ ] **Step 5: Add to `ComponentRepository`:**

```java
    /** Whether this class asks for a link before a student can ask for sign-off (ready-for-signoff R-6). */
    public boolean requiresLink(UUID componentId) {
        return jdbc.sql("SELECT require_link_for_signoff FROM component_instance WHERE id = :id")
                .param("id", componentId).query(Boolean.class).single();
    }

    public void setRequireLink(UUID componentId, boolean required) {
        jdbc.sql("UPDATE component_instance SET require_link_for_signoff = :required WHERE id = :id")
                .param("id", componentId).param("required", required).update();
    }
```

- [ ] **Step 6: Run** `./mvnw test -Dtest='SignoffRequestRepositoryTest,DocumentLinkRepositoryTest'` → PASS.
- [ ] **Step 7: Commit.** `git add -A backend && git commit -m "Read and write sign-off requests, document links and the require-link setting"`

---

## Task 5: `PUT /components/{id}/document-link`, the student sets their link

**Files:**
- Create: `components/adapter/web/DocumentLinkRequest.java`
- Modify: `components/application/ComponentViews.java` (`DocumentLinkView`), `ComponentService.java` (`setDocumentLink`), `ComponentController.java`, `audit/AuditEventType.java` (`DOCUMENT_LINK_SET`)
- Test: `components/adapter/web/DocumentLinkTest.java`

- [ ] **Step 1: Write the failing test.** Copy `ItemTickTest`'s setup (its `@AutoConfigureMockMvc`, fixtures and `as(username)` helper), then:

```java
    private String link() { return "/api/v1/components/" + component + "/document-link"; }

    @Test
    void anApprovedStudentSetsAndReplacesTheirLink() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.put(link(), "{\"url\":\"  https://docs.google.com/d/abc  \"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://docs.google.com/d/abc"))
                .andExpect(jsonPath("$.setOn").isNotEmpty());
        student.put(link(), "{\"url\":\"https://onedrive.live.com/x\"}").andExpect(status().isOk());
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM document_link", Integer.class)).isEqualTo(2);
    }

    @Test
    void theSameLinkTwiceAddsNoRow() throws Exception { // decision R-19
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.put(link(), "{\"url\":\"https://docs.google.com/d/abc\"}").andExpect(status().isOk());
        student.put(link(), "{\"url\":\"https://docs.google.com/d/abc\"}").andExpect(status().isOk());
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM document_link", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM audit_event WHERE event_type = 'DOCUMENT_LINK_SET'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void onlyHttpsLinksAreKept() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        for (String bad : new String[] {"http://docs.google.com/d/abc", "javascript:alert(1)", "docs.google.com", ""}) {
            student.put(link(), "{\"url\":\"" + bad + "\"}").andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        }
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM document_link", Integer.class)).isZero();
    }
```

Check `audit_event`'s column name (`event_type` or `type`) in `V2__identity.sql` before running.

- [ ] **Step 2: Run** `./mvnw test -Dtest=DocumentLinkTest` → FAIL (404, no endpoint).

- [ ] **Step 3: Implement.**

`DocumentLinkRequest`:

```java
package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** FR-38. https only, checked by the service after stripping (HttpsLink). */
public record DocumentLinkRequest(@NotBlank @Size(max = 2000) String url) {}
```

`ComponentViews`:

```java
    public record DocumentLinkView(String url, LocalDate setOn) {}
```

`ComponentService` (inject `DocumentLinkRepository links` and `AuditLog audit` through the constructor; check whether `AuditLog` is already injected):

```java
    /** FR-38–39: an approved student's link to their work. Stored, never fetched. The same link again changes nothing (R-19). */
    @Transactional
    public DocumentLinkView setDocumentLink(Actor actor, UUID componentId, String url) {
        ComponentInstance component = components.findForApprovedStudent(componentId, actor.userId())
                .orElseThrow(ComponentService::notFound);
        String stripped = url == null ? "" : url.strip();
        if (!HttpsLink.valid(stripped) || stripped.length() > 2000) {
            throw new DomainException(ErrorCode.VALIDATION_FAILED, "That isn't an https link.",
                    List.of(new FieldError("url", "must be a link starting https://")));
        }
        Optional<DocumentLink> current = links.current(component.id(), actor.userId());
        if (current.isPresent() && current.get().url().equals(stripped)) {
            return view(current.get());
        }
        Instant now = clock.instant();
        links.add(component.id(), actor.userId(), stripped, now);
        // Ids only: the link itself points at student work (ARCHITECTURE §5, audit details).
        audit.record(actor.userId(), AuditEventType.DOCUMENT_LINK_SET, "component_instance", component.id(),
                Map.of("componentId", component.id()));
        return view(new DocumentLink(stripped, now));
    }

    static DocumentLinkView view(DocumentLink link) {
        return new DocumentLinkView(link.url(), DublinDate.of(link.setAt()));
    }
```

Check `AuditLog.record`'s signature against `ProgressService.setSignoff` and match it. `ComponentController`:

```java
    @PutMapping("/components/{componentId}/document-link")
    DocumentLinkView setDocumentLink(Actor actor, @PathVariable UUID componentId, @Valid @RequestBody DocumentLinkRequest body) {
        return components.setDocumentLink(actor, componentId, body.url());
    }
```

Add `DOCUMENT_LINK_SET` to `AuditEventType` and update its Javadoc to "Ready-for-signoff events arrived with the backlog's first feature."

- [ ] **Step 4: Run** `./mvnw test -Dtest=DocumentLinkTest` → PASS.
- [ ] **Step 5: Commit.** `git add -A backend && git commit -m "Let a student set the link to their work, https only, keeping every earlier link"`

---

## Task 6: `PUT /components/{id}/settings`, the teacher's require-link switch

**Files:**
- Create: `components/adapter/web/ComponentSettingsRequest.java`
- Modify: `ComponentViews.TeacherComponent` (append `boolean requireLink`), `ComponentService` (`setSettings`, `teacherView`), `ComponentController`
- Test: `components/adapter/web/ComponentSettingsTest.java`

- [ ] **Step 1: Write the failing test** (setup as in `StageDatesTest`):

```java
    @Test
    void theClassesTeacherTurnsTheSettingOnAndTheViewSaysSo() throws Exception {
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        teacher.get("/api/v1/components/" + component).andExpect(jsonPath("$.requireLink").value(false));
        teacher.put("/api/v1/components/" + component + "/settings", "{\"requireLink\":true}").andExpect(status().isOk())
                .andExpect(jsonPath("$.view").value("TEACHER")).andExpect(jsonPath("$.requireLink").value(true));
    }

    @Test
    void nobodyElseReachesIt() throws Exception {
        for (String user : new String[] {ClassFixtures.TEACHER2, ClassFixtures.TEACHER_B, ClassFixtures.APPROVED_STUDENT}) {
            as(user).put("/api/v1/components/" + component + "/settings", "{\"requireLink\":true}").andExpect(status().isNotFound());
        }
    }

    @Test
    void theFlagIsRequired() throws Exception {
        as(ClassFixtures.TEACHER1).put("/api/v1/components/" + component + "/settings", "{}").andExpect(status().isBadRequest());
    }
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**

```java
package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotNull;

/** The class's one setting so far (ready-for-signoff R-7). A Settings tab arrives with the second. */
public record ComponentSettingsRequest(@NotNull Boolean requireLink) {}
```

```java
    @Transactional
    public TeacherComponent setSettings(Actor actor, UUID componentId, boolean requireLink) {
        Owned owned = owned(actor, componentId);
        components.setRequireLink(owned.component().id(), requireLink);
        return teacherView(owned);
    }
```

Append `boolean requireLink` to `TeacherComponent` and pass `components.requiresLink(owned.component().id())` in `teacherView`'s constructor call. Fix every other `new TeacherComponent(` the compiler reports. The endpoint:

```java
    @PutMapping("/components/{componentId}/settings")
    TeacherComponent setSettings(Actor actor, @PathVariable UUID componentId, @Valid @RequestBody ComponentSettingsRequest body) {
        return components.setSettings(actor, componentId, body.requireLink());
    }
```

- [ ] **Step 4: Run** `./mvnw test -Dtest='ComponentSettingsTest,StageDatesTest,ComponentCreateTest'` → PASS.
- [ ] **Step 5: Commit.** `git add -A backend && git commit -m "Let a teacher require a link to the work before students ask for sign-off"`

---

## Task 7: The student asks for sign-off, and can withdraw

**Files:**
- Create: `progress/application/SignoffRequestService.java`, `progress/adapter/web/SignoffRequestController.java`, `progress/adapter/web/AskRequest.java`
- Modify: `components/application/ComponentViews.java` (`OpenRequestView`), `shared/error/ErrorCode.java`, `audit/AuditEventType.java`
- Test: `progress/adapter/web/SignoffRequestTest.java`

**Interfaces (produces):**
```java
public record OpenRequestView(LocalDate askedOn, String note) {}  // ComponentViews
OpenRequestView SignoffRequestService.ask(Actor actor, UUID componentId, UUID checkpointId, String note)
void SignoffRequestService.withdraw(Actor actor, UUID componentId, UUID checkpointId)
ErrorCode.CHECKPOINT_ALREADY_SIGNED_OFF (409), SIGNOFF_REQUEST_NOT_OPEN (409), DOCUMENT_LINK_REQUIRED (400)
AuditEventType.SIGNOFF_REQUESTED, SIGNOFF_REQUEST_WITHDRAWN
```

- [ ] **Step 1: Write the failing test** (setup as in `SignoffTest`: `component`, `checkpoint = components.checkpointId(BIO, 1)`, `as(...)`):

```java
    private String request(UUID c) { return "/api/v1/components/" + component + "/checkpoints/" + c + "/request"; }

    @Test
    void theStudentAsksWithANoteAndAskingTwiceChangesNothing() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.post(request(checkpoint), "{\"note\":\"  plan's on page 2 \"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.note").value("plan's on page 2")).andExpect(jsonPath("$.askedOn").isNotEmpty());
        student.post(request(checkpoint), "{\"note\":\"other\"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.note").value("plan's on page 2"));
        assertThat(count("SELECT count(*) FROM signoff_request")).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM audit_event WHERE event_type = 'SIGNOFF_REQUESTED'")).isEqualTo(1);
    }

    @Test
    void aBlankNoteIsNoNote() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post(request(checkpoint), "{\"note\":\"   \"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.note").doesNotExist());
    }

    @Test
    void aNoteOver280IsRefused() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post(request(checkpoint), "{\"note\":\"" + "x".repeat(281) + "\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void aSignedOffCheckpointCantBeAskedFor() throws Exception {
        as(ClassFixtures.TEACHER1).put("/api/v1/components/" + component + "/students/" + world.approvedStudent()
                + "/checkpoints/" + checkpoint + "/signoff", "{\"signedOff\":true}").andExpect(status().isOk());
        as(ClassFixtures.APPROVED_STUDENT).post(request(checkpoint), "{}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CHECKPOINT_ALREADY_SIGNED_OFF"));
    }

    @Test
    void whenTheClassRequiresALinkTheStudentMustHaveOne() throws Exception {
        jdbcTemplate.update("UPDATE component_instance SET require_link_for_signoff = true WHERE id = ?", component);
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.post(request(checkpoint), "{}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("DOCUMENT_LINK_REQUIRED"));
        student.put("/api/v1/components/" + component + "/document-link", "{\"url\":\"https://docs.google.com/d/a\"}");
        student.post(request(checkpoint), "{}").andExpect(status().isCreated());
    }

    @Test
    void theStudentWithdrawsAnOpenRequestOnly() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.post(request(checkpoint), "{}").andExpect(status().isCreated());
        student.delete(request(checkpoint)).andExpect(status().isNoContent());
        student.delete(request(checkpoint)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SIGNOFF_REQUEST_NOT_OPEN"));
        assertThat(count("SELECT count(*) FROM signoff_request WHERE withdrawn_at IS NOT NULL")).isEqualTo(1);
    }

    private int count(String sql) { return jdbcTemplate.queryForObject(sql, Integer.class); }
```

- [ ] **Step 2: Run** `./mvnw test -Dtest=SignoffRequestTest` → FAIL (404).

- [ ] **Step 3: Implement.** `ErrorCode` (before `NOT_FOUND`):

```java
    CHECKPOINT_ALREADY_SIGNED_OFF(HttpStatus.CONFLICT, "That checkpoint is already signed off"),
    SIGNOFF_REQUEST_NOT_OPEN(HttpStatus.CONFLICT, "That request has already been answered or withdrawn"),
    DOCUMENT_LINK_REQUIRED(HttpStatus.BAD_REQUEST, "Add the link to your work first"),
```

`AuditEventType`: add `SIGNOFF_REQUESTED`, `SIGNOFF_REQUEST_WITHDRAWN`, `SIGNOFF_REQUEST_ANSWERED`. `ComponentViews`: add `public record OpenRequestView(LocalDate askedOn, String note) {}`.

`AskRequest`:

```java
package ie.coursework.progress.adapter.web;

import jakarta.validation.constraints.Size;

/** Ready-for-signoff R-17: an optional note, at most 280 characters. */
public record AskRequest(@Size(max = 280) String note) {}
```

`SignoffRequestService`:

```java
package ie.coursework.progress.application;

import ie.coursework.audit.AuditEventType;
import ie.coursework.audit.AuditLog;
import ie.coursework.components.adapter.persistence.BriefRepository;
import ie.coursework.components.adapter.persistence.ComponentRepository;
import ie.coursework.components.adapter.persistence.DocumentLinkRepository;
import ie.coursework.components.adapter.persistence.SignoffRepository;
import ie.coursework.components.adapter.persistence.SignoffRequestRepository;
import ie.coursework.components.adapter.persistence.TemplateRepository;
import ie.coursework.components.application.ComponentViews.OpenRequestView;
import ie.coursework.components.domain.Brief;
import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.components.domain.DublinDate;
import ie.coursework.components.domain.SignoffRequest;
import ie.coursework.identity.domain.Actor;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The student's side of ready-for-signoff. Every call starts with findForApprovedStudent; the checkpoint must be in
 * the brief's template version. Anything else is 404 (design §9). The teacher's answer is ProgressService.answer.
 */
@Service
public class SignoffRequestService {

    private final ComponentRepository components;
    private final BriefRepository briefs;
    private final TemplateRepository templates;
    private final SignoffRepository signoffs;
    private final SignoffRequestRepository requests;
    private final DocumentLinkRepository links;
    private final AuditLog audit;
    private final Clock clock;

    public SignoffRequestService(ComponentRepository components, BriefRepository briefs, TemplateRepository templates,
            SignoffRepository signoffs, SignoffRequestRepository requests, DocumentLinkRepository links, AuditLog audit, Clock clock) {
        this.components = components;
        this.briefs = briefs;
        this.templates = templates;
        this.signoffs = signoffs;
        this.requests = requests;
        this.links = links;
        this.audit = audit;
        this.clock = clock;
    }

    /** Idempotent (R-13): an open request is returned as it is, with no new row and no audit event. */
    @Transactional
    public OpenRequestView ask(Actor actor, UUID componentId, UUID checkpointId, String note) {
        ComponentInstance component = scoped(actor, componentId, checkpointId);
        UUID student = actor.userId();
        boolean signedOff = signoffs.forStudent(component.id(), student).stream()
                .anyMatch(s -> s.live() && s.checkpointId().equals(checkpointId));
        if (signedOff) {
            throw new DomainException(ErrorCode.CHECKPOINT_ALREADY_SIGNED_OFF, "Your teacher has already signed this off.");
        }
        if (components.requiresLink(component.id()) && links.current(component.id(), student).isEmpty()) {
            throw new DomainException(ErrorCode.DOCUMENT_LINK_REQUIRED, "Your teacher asks for a link to your work first.");
        }
        Instant now = clock.instant();
        requests.ask(component.id(), student, checkpointId, blankToNull(note), now)
                .ifPresent(id -> audit.record(student, AuditEventType.SIGNOFF_REQUESTED, "signoff_request", id,
                        Map.of("componentId", component.id(), "checkpointId", checkpointId)));
        SignoffRequest open = requests.forStudent(component.id(), student).stream()
                .filter(r -> r.open() && r.checkpointId().equals(checkpointId)).findFirst().orElseThrow();
        return new OpenRequestView(DublinDate.of(open.askedAt()), open.studentNote());
    }

    @Transactional
    public void withdraw(Actor actor, UUID componentId, UUID checkpointId) {
        ComponentInstance component = scoped(actor, componentId, checkpointId);
        UUID id = requests.withdraw(component.id(), actor.userId(), checkpointId, clock.instant())
                .orElseThrow(() -> new DomainException(ErrorCode.SIGNOFF_REQUEST_NOT_OPEN, "Your teacher has already answered this."));
        audit.record(actor.userId(), AuditEventType.SIGNOFF_REQUEST_WITHDRAWN, "signoff_request", id,
                Map.of("componentId", component.id(), "checkpointId", checkpointId));
    }

    private ComponentInstance scoped(Actor actor, UUID componentId, UUID checkpointId) {
        ComponentInstance component = components.findForApprovedStudent(componentId, actor.userId())
                .orElseThrow(ProgressService::notFound);
        Brief brief = briefs.findPublished(component.briefId()).orElseThrow(() -> new IllegalStateException("brief missing"));
        templates.checkpointInVersion(checkpointId, brief.versionId()).orElseThrow(ProgressService::notFound);
        return component;
    }

    static String blankToNull(String note) {
        return note == null || note.isBlank() ? null : note.strip();
    }
}
```

`ProgressService.notFound()` is package-private and static, so it's reachable from this class in the same package.

`SignoffRequestController`:

```java
package ie.coursework.progress.adapter.web;

import ie.coursework.components.application.ComponentViews.OpenRequestView;
import ie.coursework.identity.domain.Actor;
import ie.coursework.progress.application.SignoffRequestService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Ready-for-signoff: the student's request for a checkpoint (roadmap §7, backlog section). */
@RestController
@RequestMapping("/api/v1")
public class SignoffRequestController {

    private final SignoffRequestService requests;

    public SignoffRequestController(SignoffRequestService requests) {
        this.requests = requests;
    }

    @PostMapping("/components/{componentId}/checkpoints/{checkpointId}/request")
    @ResponseStatus(HttpStatus.CREATED)
    OpenRequestView ask(Actor actor, @PathVariable UUID componentId, @PathVariable UUID checkpointId,
            @Valid @RequestBody AskRequest body) {
        return requests.ask(actor, componentId, checkpointId, body.note());
    }

    /** Withdraws the open request. The row stays (V13); DELETE names the resource "my open request". */
    @DeleteMapping("/components/{componentId}/checkpoints/{checkpointId}/request")
    ResponseEntity<Void> withdraw(Actor actor, @PathVariable UUID componentId, @PathVariable UUID checkpointId) {
        requests.withdraw(actor, componentId, checkpointId);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 4: Run** `./mvnw test -Dtest=SignoffRequestTest` → PASS.
- [ ] **Step 5: Commit.** `git add -A backend && git commit -m "Let a student ask for a checkpoint's sign-off with a note, and withdraw it until it's answered"`

---

## Task 8: The student's page carries the link, the setting and each checkpoint's requests

**Files:**
- Create: `components/application/RequestViews.java`
- Modify: `ComponentViews` (`AnswerView`; `CheckpointView`; `StudentComponent`), `ComponentService.studentView`
- Test: `components/adapter/web/StudentComponentViewTest.java` (modify)

**Interfaces (produces):**
```java
public record AnswerView(LocalDate askedOn, String note, RequestOutcome outcome, LocalDate answeredOn, String teacherNote) {}
public record CheckpointView(UUID id, String text, CheckpointState state, LocalDate signedOffOn, OpenRequestView request, List<AnswerView> answers) {}
StudentComponent(... existing ..., boolean requireLink, DocumentLinkView documentLink)   // appended
RequestViews.open(List<SignoffRequest> rowsForOneCheckpoint) -> OpenRequestView | null
RequestViews.answers(List<SignoffRequest> rowsForOneCheckpoint) -> List<AnswerView>      // newest first
```

- [ ] **Step 1: Write the failing test** (add to `StudentComponentViewTest`):

```java
    @Test
    void eachCheckpointCarriesItsIdItsOpenRequestAndItsAnswers() throws Exception {
        UUID cp1 = components.checkpointId(BIO, 1);
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.post("/api/v1/components/" + component + "/checkpoints/" + cp1 + "/request", "{\"note\":\"page 2\"}");
        jdbcTemplate.update("""
                UPDATE signoff_request SET answered_by_user_id = ?, answered_at = now(), outcome = 'NOT_YET', teacher_note = 'add a hypothesis'
                """, world.teacher1());
        student.post("/api/v1/components/" + component + "/checkpoints/" + cp1 + "/request", "{\"note\":\"added it\"}");

        student.get("/api/v1/components/" + component).andExpect(status().isOk())
                .andExpect(jsonPath("$.requireLink").value(false))
                .andExpect(jsonPath("$.documentLink").doesNotExist())
                .andExpect(jsonPath("$.stages[0].checkpoint.id").value(cp1.toString()))
                .andExpect(jsonPath("$.stages[0].checkpoint.state").value("READY"))
                .andExpect(jsonPath("$.stages[0].checkpoint.request.note").value("added it"))
                .andExpect(jsonPath("$.stages[0].checkpoint.answers[0].outcome").value("NOT_YET"))
                .andExpect(jsonPath("$.stages[0].checkpoint.answers[0].teacherNote").value("add a hypothesis"))
                .andExpect(jsonPath("$.stages[0].checkpoint.answers[0].note").value("page 2"));
    }

    @Test
    void theCurrentLinkIsOnThePage() throws Exception {
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.put("/api/v1/components/" + component + "/document-link", "{\"url\":\"https://docs.google.com/d/a\"}");
        student.get("/api/v1/components/" + component).andExpect(jsonPath("$.documentLink.url").value("https://docs.google.com/d/a"));
    }
```

`jsonPath("$.documentLink").doesNotExist()` passes for a JSON `null` only if Jackson omits nulls; check how `signedOffOn: null` is asserted in the existing tests and match that (`.value(nullValue())` if nulls are written).

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `RequestViews`:

```java
package ie.coursework.components.application;

import ie.coursework.components.application.ComponentViews.AnswerView;
import ie.coursework.components.application.ComponentViews.OpenRequestView;
import ie.coursework.components.domain.DublinDate;
import ie.coursework.components.domain.SignoffRequest;
import java.util.List;

/** One checkpoint's request rows (newest first, as SignoffRequestRepository.forStudent returns them) as views. */
public final class RequestViews {

    private RequestViews() {}

    public static OpenRequestView open(List<SignoffRequest> rows) {
        return rows.stream().filter(SignoffRequest::open).findFirst()
                .map(r -> new OpenRequestView(DublinDate.of(r.askedAt()), r.studentNote())).orElse(null);
    }

    public static List<AnswerView> answers(List<SignoffRequest> rows) {
        return rows.stream().filter(r -> !r.open())
                .map(r -> new AnswerView(DublinDate.of(r.askedAt()), r.studentNote(), r.outcome(), DublinDate.of(r.answeredAt()),
                        r.teacherNote()))
                .toList();
    }
}
```

In `ComponentService.studentView`, inject `SignoffRequestRepository requests` and load once:

```java
        Map<UUID, List<SignoffRequest>> requested = requests.forStudent(component.id(), actor.userId()).stream()
                .collect(Collectors.groupingBy(SignoffRequest::checkpointId));
```

and replace the `CheckpointView` construction:

```java
            List<SignoffRequest> rows = checkpoint == null ? List.of() : requested.getOrDefault(checkpoint.id(), List.of());
            OpenRequestView open = RequestViews.open(rows);
            ...
                    checkpoint == null ? null : new CheckpointView(checkpoint.id(), checkpoint.text(),
                            CheckpointState.at(due, today, at != null, open != null), at == null ? null : DublinDate.of(at),
                            open, RequestViews.answers(rows)),
```

Append to the `StudentComponent` constructor call: `components.requiresLink(component.id())` and `links.current(component.id(), actor.userId()).map(ComponentService::view).orElse(null)`.

- [ ] **Step 4: Run** `./mvnw test -Dtest='StudentComponentViewTest,ComponentServiceOwnedTest'` → PASS.
- [ ] **Step 5: Commit.** `git add -A backend && git commit -m "Show the student their link, the class's setting and each checkpoint's requests and answers"`

---

## Task 9: The teacher answers; a sign-off from the grid answers too

**Files:**
- Create: `progress/adapter/web/AnswerRequest.java`
- Modify: `progress/application/ProgressService.java` (`answer`; `setSignoff` closes an open request), `progress/adapter/web/ProgressController.java`
- Test: `progress/adapter/web/AnswerTest.java`

**Interfaces (produces):** `Cell ProgressService.answer(Actor actor, UUID componentId, UUID studentId, UUID checkpointId, RequestOutcome outcome, String note)`

- [ ] **Step 1: Write the failing test** (setup as in `SignoffTest`):

```java
    private String ask() { return "/api/v1/components/" + component + "/checkpoints/" + checkpoint + "/request"; }
    private String answer() {
        return "/api/v1/components/" + component + "/students/" + world.approvedStudent() + "/checkpoints/" + checkpoint + "/request/answer";
    }

    @Test
    void acceptingSignsOffAndKeepsTheNote() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post(ask(), "{\"note\":\"page 2\"}");
        as(ClassFixtures.TEACHER1).post(answer(), "{\"outcome\":\"ACCEPTED\",\"note\":\"Good, clear aim.\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("SIGNED_OFF"));
        assertThat(count("SELECT count(*) FROM checkpoint_signoff WHERE revoked_at IS NULL")).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT teacher_note FROM signoff_request", String.class)).isEqualTo("Good, clear aim.");
        assertThat(count("SELECT count(*) FROM audit_event WHERE event_type IN ('SIGNOFF_REQUEST_ANSWERED', 'CHECKPOINT_SIGNED_OFF')"))
                .isEqualTo(2);
    }

    @Test
    void notYetLeavesItUnsignedAndTheStudentCanAskAgain() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post(ask(), "{}");
        as(ClassFixtures.TEACHER1).post(answer(), "{\"outcome\":\"NOT_YET\",\"note\":\"Say what you'll measure.\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.state").value(org.hamcrest.Matchers.oneOf("DUE", "NOT_DUE")));
        assertThat(count("SELECT count(*) FROM checkpoint_signoff")).isZero();
        as(ClassFixtures.APPROVED_STUDENT).post(ask(), "{}").andExpect(status().isCreated());
    }

    @Test
    void answeringWhatIsntOpenIsAConflict() throws Exception {
        as(ClassFixtures.TEACHER1).post(answer(), "{\"outcome\":\"ACCEPTED\"}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SIGNOFF_REQUEST_NOT_OPEN"));
    }

    @Test
    void aSignOffFromTheGridAnswersTheOpenRequest() throws Exception { // decision R-11
        as(ClassFixtures.APPROVED_STUDENT).post(ask(), "{}");
        as(ClassFixtures.TEACHER1).put("/api/v1/components/" + component + "/students/" + world.approvedStudent()
                + "/checkpoints/" + checkpoint + "/signoff", "{\"signedOff\":true}").andExpect(status().isOk());
        assertThat(jdbcTemplate.queryForObject("SELECT outcome FROM signoff_request", String.class)).isEqualTo("ACCEPTED");
    }

    @Test
    void theOutcomeIsRequiredAndTheNoteHasALimit() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post(ask(), "{}");
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        teacher.post(answer(), "{}").andExpect(status().isBadRequest());
        teacher.post(answer(), "{\"outcome\":\"ACCEPTED\",\"note\":\"" + "x".repeat(501) + "\"}").andExpect(status().isBadRequest());
    }
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `AnswerRequest`:

```java
package ie.coursework.progress.adapter.web;

import ie.coursework.components.domain.RequestOutcome;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** R-1, R-17: Accepted or Not yet, with an optional note of at most 500 characters. */
public record AnswerRequest(@NotNull RequestOutcome outcome, @Size(max = 500) String note) {}
```

`ProgressService` (inject `SignoffRequestRepository requests`):

```java
    /** R-1: answers the open request. ACCEPTED also signs off, in the same transaction. Nothing open is a 409 (R-15). */
    @Transactional
    public Cell answer(Actor actor, UUID componentId, UUID studentId, UUID checkpointId, RequestOutcome outcome, String note) {
        ComponentInstance component = componentService.requireOwned(actor, componentId);
        approvedMember(component, studentId);
        Brief brief = briefs.findPublished(component.briefId()).orElseThrow(() -> new IllegalStateException("brief missing"));
        templates.checkpointInVersion(checkpointId, brief.versionId()).orElseThrow(ProgressService::notFound);

        Instant now = clock.instant();
        UUID id = requests.answer(component.id(), studentId, checkpointId, actor.userId(), outcome,
                        SignoffRequestService.blankToNull(note), now)
                .orElseThrow(() -> new DomainException(ErrorCode.SIGNOFF_REQUEST_NOT_OPEN, "This request has been withdrawn or answered."));
        audit.record(actor.userId(), AuditEventType.SIGNOFF_REQUEST_ANSWERED, "signoff_request", id,
                Map.of("componentId", component.id(), "studentId", studentId, "checkpointId", checkpointId, "outcome", outcome.name()));
        if (outcome == RequestOutcome.ACCEPTED) {
            return setSignoff(actor, componentId, studentId, checkpointId, true);
        }
        return currentCell(component, studentId, checkpointId);
    }
```

Change `setSignoff` so that when `signedOff` is true and a row was inserted, it also answers any open request:

```java
        if (signedOff && changed.isPresent()) {
            requests.answer(component.id(), studentId, checkpointId, actor.userId(), RequestOutcome.ACCEPTED, null, now)
                    .ifPresent(r -> audit.record(actor.userId(), AuditEventType.SIGNOFF_REQUEST_ANSWERED, "signoff_request", r,
                            Map.of("componentId", component.id(), "studentId", studentId, "checkpointId", checkpointId,
                                    "outcome", RequestOutcome.ACCEPTED.name())));
        }
```

When `answer(ACCEPTED)` calls `setSignoff`, the request is already answered, so this second `requests.answer` finds nothing open and writes nothing. Extract the end of `setSignoff` (from `Instant live = …` to the return) into `currentCell(component, studentId, checkpointId)`. It must pass `ready` as the fourth argument of `CheckpointState.at`, computed as `requests.forStudent(component.id(), studentId).stream().anyMatch(r -> r.open() && r.checkpointId().equals(checkpointId))`. Then use it in both methods.

`ProgressController`:

```java
    @PostMapping("/students/{studentId}/checkpoints/{checkpointId}/request/answer")
    Cell answer(Actor actor, @PathVariable UUID componentId, @PathVariable UUID studentId, @PathVariable UUID checkpointId,
            @Valid @RequestBody AnswerRequest body) {
        return progress.answer(actor, componentId, studentId, checkpointId, body.outcome(), body.note());
    }
```

- [ ] **Step 4: Run** `./mvnw test -Dtest='AnswerTest,SignoffTest'` → PASS.
- [ ] **Step 5: Commit.** `git add -A backend && git commit -m "Let the teacher accept or say not yet with a note; a grid sign-off answers the request too"`

---

## Task 10: The grid and the one-student view: Ready, the queue, the links

**Files:**
- Modify: `progress/application/ProgressViews.java`, `progress/application/ProgressService.java` (`grid`, `student`, `cell`)
- Test: `progress/adapter/web/ProgressGridTest.java`, `progress/adapter/web/StudentCheckpointsTest.java` (modify)

**Interfaces (produces):**
```java
public record WaitingRequest(UUID studentId, String firstName, String lastName, UUID checkpointId, String checkpointText,
        LocalDate askedOn, String note) {}
GridStudent(... existing ..., DocumentLinkView documentLink)                 // appended
Grid(... existing ..., List<WaitingRequest> waiting)                        // appended, oldest first
StudentStage(... existing ..., OpenRequestView request, List<AnswerView> answers)   // appended
StudentCheckpoints(... existing ..., DocumentLinkView documentLink)         // appended
```

- [ ] **Step 1: Write the failing tests.** In `ProgressGridTest`:

```java
    @Test
    void aRequestIsReadyNotBehindAndJoinsTheQueueOldestFirst() throws Exception {
        UUID cp1 = components.checkpointId(BIO, 1);
        UUID cp2 = components.checkpointId(BIO, 2);
        as(ClassFixtures.APPROVED_STUDENT)
                .put("/api/v1/components/" + component + "/document-link", "{\"url\":\"https://docs.google.com/d/a\"}");
        // Inserted directly: asked_at is fixed once written (V13's guard), so the order is set at insert time.
        String insert = """
                INSERT INTO signoff_request (instance_id, student_user_id, checkpoint_id, asked_at, student_note)
                VALUES (?, ?, ?, now() - ?::interval, ?)
                """;
        jdbcTemplate.update(insert, component, world.approvedStudent(), cp2, "1 day", "second");
        jdbcTemplate.update(insert, component, world.approvedStudent(), cp1, "0 days", "later");

        as(ClassFixtures.TEACHER1).get("/api/v1/components/" + component + "/progress").andExpect(status().isOk())
                .andExpect(jsonPath("$.waiting.length()").value(2))
                .andExpect(jsonPath("$.waiting[0].checkpointId").value(cp2.toString()))
                .andExpect(jsonPath("$.waiting[0].note").value("second"))
                .andExpect(jsonPath("$.waiting[0].firstName").isNotEmpty())
                .andExpect(jsonPath("$.students[?(@.studentId == '" + world.approvedStudent() + "')].cells[0].state").value("READY"))
                .andExpect(jsonPath("$.students[?(@.studentId == '" + world.approvedStudent() + "')].documentLink.url")
                        .value("https://docs.google.com/d/a"));
    }
```

Give stage 1 a past date in the setup so `cells[0]` would otherwise be `DUE`. In `StudentCheckpointsTest`:

```java
    @Test
    void eachCheckpointCarriesItsOpenRequestAndAnswersAndThePageTheLink() throws Exception {
        UUID cp1 = components.checkpointId(BIO, 1);
        ApiSession student = as(ClassFixtures.APPROVED_STUDENT);
        student.put("/api/v1/components/" + component + "/document-link", "{\"url\":\"https://docs.google.com/d/a\"}");
        student.post("/api/v1/components/" + component + "/checkpoints/" + cp1 + "/request", "{\"note\":\"page 2\"}");
        as(ClassFixtures.TEACHER1).get(checkpointsPath()).andExpect(status().isOk())
                .andExpect(jsonPath("$.documentLink.url").value("https://docs.google.com/d/a"))
                .andExpect(jsonPath("$.stages[0].state").value("READY"))
                .andExpect(jsonPath("$.stages[0].request.note").value("page 2"))
                .andExpect(jsonPath("$.stages[0].answers.length()").value(0));
    }
```

- [ ] **Step 2: Run** `./mvnw test -Dtest='ProgressGridTest,StudentCheckpointsTest'` → FAIL.
- [ ] **Step 3: Implement.** Add `WaitingRequest` to `ProgressViews` and append the fields above. In `grid`, add two loads after `live`:

```java
        List<SignoffRequest> open = requests.open(component.id());
        Set<String> ready = open.stream().map(r -> key(r.studentId(), r.checkpointId())).collect(Collectors.toSet());
        Map<UUID, DocumentLink> linkByStudent = links.currentFor(component.id());
```

Then pass `ready.contains(key(m.studentId(), s.checkpoint().id()))` to `cell(...)`, and `Optional.ofNullable(linkByStudent.get(m.studentId())).map(ComponentService::view).orElse(null)` to `GridStudent`. Make `ComponentService.view(DocumentLink)` `public static`. Build the queue from the approved members, so a removed student's open request isn't shown:

```java
        Map<UUID, Member> members = approved(component).stream().collect(Collectors.toMap(Member::studentId, m -> m));
        Map<UUID, String> texts = stages.stream().filter(s -> s.checkpoint() != null)
                .collect(Collectors.toMap(s -> s.checkpoint().id(), s -> s.checkpoint().text()));
        List<WaitingRequest> waiting = open.stream().filter(r -> members.containsKey(r.studentId())).map(r -> {
            Member m = members.get(r.studentId());
            return new WaitingRequest(r.studentId(), m.firstName(), m.lastName(), r.checkpointId(), texts.get(r.checkpointId()),
                    DublinDate.of(r.askedAt()), r.studentNote());
        }).toList();
```

Reuse that `approved(component)` call for the students list too, so the query count goes up by exactly two. `cell` becomes `cell(GridStage stage, Instant signedOffAt, boolean ready, LocalDate today)`.

In `student`, load `requests.forStudent(component.id(), studentId)` grouped by checkpoint id. For each stage, pass `RequestViews.open(rows) != null` as `ready`, and append `RequestViews.open(rows), RequestViews.answers(rows)`. Append `links.current(...)` mapped with `ComponentService::view` to `StudentCheckpoints`.

- [ ] **Step 4: Run** `./mvnw test -Dtest='ProgressGridTest,StudentCheckpointsTest,AnswerTest'` → PASS. Update `docs/ARCHITECTURE.md` §5's "eleven as built" in Task 22, not here.
- [ ] **Step 5: Commit.** `git add -A backend && git commit -m "Show Ready cells, the oldest-first queue and each student's link on the teacher's views"`

---

## Task 11: `GET /signoff-requests/waiting`, the counts for `/teach`

**Files:**
- Modify: `progress/application/ProgressViews.java` (`WaitingCount`), `SignoffRequestService.java` (`waiting`), `SignoffRequestController.java`
- Test: `progress/adapter/web/WaitingCountsTest.java`

- [ ] **Step 1: Write the failing test:**

```java
    @Test
    void theTeacherSeesACountForEachClassWithSomeoneWaiting() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post("/api/v1/components/" + component + "/checkpoints/" + checkpoint + "/request", "{}");
        as(ClassFixtures.TEACHER1).get("/api/v1/signoff-requests/waiting").andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].classId").value(world.class1().toString()))
                .andExpect(jsonPath("$[0].waiting").value(1));
        as(ClassFixtures.TEACHER2).get("/api/v1/signoff-requests/waiting").andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void aStudentGetsNotFound() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).get("/api/v1/signoff-requests/waiting").andExpect(status().isNotFound());
    }
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `public record WaitingCount(UUID classId, int waiting) {}` in `ProgressViews`. In the service:

```java
    /** R-21: the badge on each class card at /teach. Only a teacher has classes; anyone else is 404, as for /classes. */
    @Transactional(readOnly = true)
    public List<WaitingCount> waiting(Actor actor) {
        if (!actor.holds(Role.TEACHER)) {
            throw ProgressService.notFound();
        }
        return requests.waitingByClass(actor.userId()).entrySet().stream()
                .map(e -> new WaitingCount(e.getKey(), e.getValue())).toList();
    }
```

Check what `ClassService.listOwned`'s `requireTeacher` throws for a student, and match it (the test asserts 404). The controller:

```java
    @GetMapping("/signoff-requests/waiting")
    List<WaitingCount> waiting(Actor actor) {
        return requests.waiting(actor);
    }
```

- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit.** `git add -A backend && git commit -m "Count each class's waiting sign-off requests for the teacher's class list"`

---

## Task 12: `SignoffRequestScopeTest`: everyone else gets 404

**Files:**
- Test: `backend/src/test/java/ie/coursework/progress/authz/SignoffRequestScopeTest.java`

Copy `SignoffScopeTest`'s fields, setup and `as(...)` helper. Every case must fail in a way you can see first, so start with Step 1.

- [ ] **Step 1: Write the test:**

```java
    private String ask(UUID c) { return "/api/v1/components/" + component + "/checkpoints/" + c + "/request"; }
    private String link() { return "/api/v1/components/" + component + "/document-link"; }
    private String settings() { return "/api/v1/components/" + component + "/settings"; }
    private String answer(UUID s, UUID c) {
        return "/api/v1/components/" + component + "/students/" + s + "/checkpoints/" + c + "/request/answer";
    }
    private static final String URL = "{\"url\":\"https://docs.google.com/d/a\"}";
    private static final String ACCEPT = "{\"outcome\":\"ACCEPTED\"}";

    @Test
    void anonymousIsUnauthenticated() throws Exception {
        ApiSession a = new ApiSession(mockMvc);
        a.post(ask(checkpoint), "{}").andExpect(status().isUnauthorized());
        a.delete(ask(checkpoint)).andExpect(status().isUnauthorized());
        a.put(link(), URL).andExpect(status().isUnauthorized());
        a.put(settings(), "{\"requireLink\":true}").andExpect(status().isUnauthorized());
        a.post(answer(world.approvedStudent(), checkpoint), ACCEPT).andExpect(status().isUnauthorized());
        a.get("/api/v1/signoff-requests/waiting").andExpect(status().isUnauthorized());
    }

    @Test
    void onlyAnApprovedStudentOfTheClassAsksOrSetsALink() throws Exception {
        for (String user : new String[] {ClassFixtures.PENDING_STUDENT, ClassFixtures.OUTSIDER, ClassFixtures.TEACHER2,
                ClassFixtures.TEACHER_B, ClassFixtures.LEADER_A}) {
            ApiSession s = as(user);
            s.post(ask(checkpoint), "{}").andExpect(status().isNotFound());
            s.delete(ask(checkpoint)).andExpect(status().isNotFound());
            s.put(link(), URL).andExpect(status().isNotFound());
        }
        assertThat(count("SELECT count(*) FROM signoff_request") + count("SELECT count(*) FROM document_link")).isZero();
    }

    @Test
    void aStudentCantAskForAnotherSubjectsOrAMadeUpCheckpoint() throws Exception {
        ApiSession s = as(ClassFixtures.APPROVED_STUDENT);
        s.post(ask(components.checkpointId(ComponentFixtures.CHEMISTRY_2027, 1)), "{}").andExpect(status().isNotFound());
        s.post(ask(UUID.randomUUID()), "{}").andExpect(status().isNotFound());
        assertThat(count("SELECT count(*) FROM signoff_request")).isZero();
    }

    @Test
    void onlyTheClassesTeacherAnswersOrChangesTheSetting() throws Exception {
        as(ClassFixtures.APPROVED_STUDENT).post(ask(checkpoint), "{}").andExpect(status().isCreated());
        for (String user : new String[] {ClassFixtures.TEACHER2, ClassFixtures.TEACHER_B, ClassFixtures.LEADER_A,
                ClassFixtures.APPROVED_STUDENT}) {
            as(user).post(answer(world.approvedStudent(), checkpoint), ACCEPT).andExpect(status().isNotFound());
            as(user).put(settings(), "{\"requireLink\":true}").andExpect(status().isNotFound());
        }
        assertThat(count("SELECT count(*) FROM signoff_request WHERE answered_at IS NOT NULL")).isZero();
    }

    @Test
    void theTeacherCantAnswerForAPendingRemovedOutsideOrMadeUpStudent() throws Exception {
        ApiSession teacher = as(ClassFixtures.TEACHER1);
        for (UUID s : new UUID[] {world.pendingStudent(), world.removedStudent(), world.outsider(), UUID.randomUUID()}) {
            teacher.post(answer(s, checkpoint), ACCEPT).andExpect(status().isNotFound());
        }
    }

    /** Bite test: an open request in class 2 must not be answerable through class 1's component id. */
    @Test
    void aRequestInAnotherComponentIsNotFoundThroughThisOne() throws Exception {
        UUID other = components.component(world.class2(), world.teacher1(), BIO);
        jdbcTemplate.update("""
                INSERT INTO signoff_request (instance_id, student_user_id, checkpoint_id, asked_at) VALUES (?, ?, ?, now())
                """, other, world.approvedStudent(), checkpoint);
        as(ClassFixtures.TEACHER1).post(answer(world.approvedStudent(), checkpoint), ACCEPT).andExpect(status().isConflict());
        assertThat(count("SELECT count(*) FROM signoff_request WHERE answered_at IS NOT NULL")).isZero();
    }

    private int count(String sql) { return jdbcTemplate.queryForObject(sql, Integer.class); }
```

The last test expects 409, not 404, because the student is approved in class 1 and the checkpoint is valid: there's simply nothing open *in class 1's component*. What it proves is that the other component's row is untouched. If `world.approvedStudent()` isn't enrolled in `class2`, that's fine: the row is inserted directly.

- [ ] **Step 2: Run** `./mvnw test -Dtest=SignoffRequestScopeTest` → PASS. If a case passes by accident, break the check it covers (for example, swap `findForApprovedStudent` for a plain lookup) and confirm the test fails, then restore the check.
- [ ] **Step 3: Commit.** `git add -A backend && git commit -m "Prove only the class's approved students ask and only its teacher answers"`

---

## Task 13: Backend gate before the frontend

- [ ] **Step 1:** `make verify`. The backend must be green, with no frontend changes yet.
- [ ] **Step 2:** If anything in `ProblemDetailsAdviceTest` or the authz suite (`classes/authz/`) lists every endpoint, add the six new ones there as well.
- [ ] **Step 3: Commit** any fixes: `git commit -am "Cover the ready-for-signoff endpoints in the shared suites"`.

---

## Task 14: Schemas, the helpers, and the backup quote's source

**Files:**
- Modify: `frontend/lib/api/schemas.ts`
- Create: `frontend/lib/app/ready.ts`, `frontend/lib/app/ready.test.ts`
- Create: `backend/src/test/java/ie/coursework/content/AppCopySourcesTest.java`
- Modify: `frontend/components/app/stage-card.tsx:8` (`CHECKPOINT_WORD` gains `READY`), any other exhaustive map `npx tsc --noEmit` reports

**Interfaces (produces, TS):**
```ts
checkpointStateSchema = z.enum(["NOT_DUE", "DUE", "READY", "SIGNED_OFF"])
documentLinkSchema = { url, setOn }
openRequestSchema = { askedOn, note: string|null }
answerSchema = { askedOn, note, outcome: "ACCEPTED"|"NOT_YET", answeredOn, teacherNote }
waitingRequestSchema = { studentId, firstName, lastName, checkpointId, checkpointText, askedOn, note }
waitingCountSchema = { classId, waiting }
// ready.ts
STUDENT_NOTE_MAX, TEACHER_NOTE_MAX, BACKUP_ADVICE, BACKUP_SOURCE
waitingHeading(n), waitingBadge(n), askedWhen(askedOn, today), linkHost(url), checkpointAnchor(id)
readyName(text), withdrawName(text), askAgainName(text), acceptName(text, name), notYetName(text, name),
openWorkName(name?), reviewName(text, name)
```

- [ ] **Step 1: The Java source test (fails until the phrase is right):**

```java
package ie.coursework.content;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Words the app quotes from SEC or NCCA documents in frontend code, where SourceTextTest can't see them. Each must
 * be on its cited page. The same literal is BACKUP_ADVICE in frontend/lib/app/ready.ts: change both or neither.
 */
class AppCopySourcesTest {

    static final String BACKUP_ADVICE = "It is strongly recommended that you make and regularly update a backup copy of your "
            + "digital report, which can be used in the event of loss or corruption.";

    @ParameterizedTest
    @ValueSource(strings = {"SEC-2027L025C2EL p. 3", "SEC-2027L022C2EL p. 3", "SEC-2027L021C2EL p. 3", "SEC-2027L033C2EL p. 3"})
    void theBackupAdviceIsOnPage3OfEveryBrief(String ref) { // FR-40, decision R-22
        SourceRef source = SourceRef.parse(ref);
        assertThat(SourceDocuments.startsOnPage(source, BACKUP_ADVICE))
                .as("not on %s; found on %s", ref, SourceDocuments.printedPagesContaining(source.key(), BACKUP_ADVICE)).isTrue();
    }
}
```

Run `cd backend && ./mvnw test -Dtest=AppCopySourcesTest`. If it fails, `printedPagesContaining` tells you the real page. Fix the reference, never the words. The PDF text wraps after "your" and before "be used"; `SourceDocuments.normalise` should absorb that, so check its rules if the match fails.

- [ ] **Step 2: Write `lib/app/ready.test.ts`:**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BACKUP_ADVICE, acceptName, askedWhen, checkpointAnchor, linkHost, notYetName, openWorkName, readyName, reviewName,
  waitingBadge, waitingHeading, withdrawName,
} from "./ready.ts";

test("the queue heading counts students waiting", () => {
  assert.equal(waitingHeading(0), "No one is waiting for you");
  assert.equal(waitingHeading(1), "1 student waiting for you");
  assert.equal(waitingHeading(3), "3 students waiting for you");
  assert.equal(waitingBadge(2), "2 waiting for sign-off");
});

test("asked when is said from the server's today", () => {
  assert.equal(askedWhen("2027-03-03", "2027-03-03"), "asked today");
  assert.equal(askedWhen("2027-03-02", "2027-03-03"), "asked yesterday");
  assert.equal(askedWhen("2027-02-24", "2027-03-03"), "asked 7 days ago");
});

test("a link is shown by its host", () => {
  assert.equal(linkHost("https://docs.google.com/document/d/abc/edit"), "docs.google.com");
  assert.equal(linkHost("https://www.example.ie/x"), "example.ie");
  assert.equal(linkHost("not a url"), "not a url");
});

test("every control names its checkpoint, and the teacher's the student", () => {
  const text = "Initial ideas discussed with the teacher";
  assert.equal(readyName(text), `Ready for sign-off: ${text}`);
  assert.equal(withdrawName(text), `Withdraw request: ${text}`);
  assert.equal(acceptName(text, "Aoife Byrne"), `Accept ${text} for Aoife Byrne`);
  assert.equal(notYetName(text, "Aoife Byrne"), `Not yet: ${text} for Aoife Byrne`);
  assert.equal(reviewName(text, "Aoife Byrne"), `Review ${text} for Aoife Byrne`);
  assert.equal(openWorkName("Aoife Byrne"), "Open Aoife Byrne's work (opens in a new tab)");
  assert.equal(openWorkName(), "Open your work (opens in a new tab)");
  assert.equal(checkpointAnchor("abc"), "checkpoint-abc");
});

test("the backup advice is the briefs' words", () => {
  assert.match(BACKUP_ADVICE, /^It is strongly recommended that you make and regularly update a backup copy/);
});
```

- [ ] **Step 3: Run** `cd frontend && node --test lib/app/ready.test.ts` → FAIL (no module).

- [ ] **Step 4: Implement `lib/app/ready.ts`:**

```ts
/** Ready-for-signoff copy and accessible names. The names are the specs' contract; D-10 may restyle, never rename. */

export const STUDENT_NOTE_MAX = 280;
export const TEACHER_NOTE_MAX = 500;

/** FR-40, quoted from the 2027 briefs, p. 3 (all four). AppCopySourcesTest checks the same literal. */
export const BACKUP_ADVICE =
  "It is strongly recommended that you make and regularly update a backup copy of your digital report, which can be used in the event of loss or corruption.";
export const BACKUP_SOURCE = "Your SEC brief";

export const NONDIRECTIVE_HELP = "Keep it general: what's missing, not how to fix it. Teachers don't correct the report for redrafting.";

export const waitingHeading = (n: number) =>
  n === 0 ? "No one is waiting for you" : `${n} ${n === 1 ? "student" : "students"} waiting for you`;
export const waitingBadge = (n: number) => `${n} waiting for sign-off`;

/** Whole days between two ISO dates (UTC midnight arithmetic, no timezone risk), said as the queue says it. */
export function askedWhen(askedOn: string, today: string): string {
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${askedOn}T00:00:00Z`)) / 86_400_000);
  return days <= 0 ? "asked today" : days === 1 ? "asked yesterday" : `asked ${days} days ago`;
}

export function linkHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const checkpointAnchor = (checkpointId: string) => `checkpoint-${checkpointId}`;

export const readyName = (text: string) => `Ready for sign-off: ${text}`;
export const withdrawName = (text: string) => `Withdraw request: ${text}`;
export const askAgainName = (text: string) => `Ask again: ${text}`;
export const acceptName = (text: string, name: string) => `Accept ${text} for ${name}`;
export const notYetName = (text: string, name: string) => `Not yet: ${text} for ${name}`;
export const reviewName = (text: string, name: string) => `Review ${text} for ${name}`;
export const openWorkName = (name?: string) => `Open ${name ? `${name}'s` : "your"} work (opens in a new tab)`;
```

- [ ] **Step 5: Update `schemas.ts`.** Add `READY` to `checkpointStateSchema`, then add:

```ts
// Ready-for-signoff: mirrors ComponentViews.DocumentLinkView, OpenRequestView, AnswerView and ProgressViews.
export const documentLinkSchema = z.object({ url: z.string(), setOn: z.string() });
export const openRequestSchema = z.object({ askedOn: z.string(), note: z.string().nullable() });
export const requestOutcomeSchema = z.enum(["ACCEPTED", "NOT_YET"]);
export const answerSchema = z.object({
  askedOn: z.string(), note: z.string().nullable(), outcome: requestOutcomeSchema, answeredOn: z.string(), teacherNote: z.string().nullable(),
});
export const waitingRequestSchema = z.object({
  studentId: z.string(), firstName: z.string(), lastName: z.string(), checkpointId: z.string(), checkpointText: z.string(),
  askedOn: z.string(), note: z.string().nullable(),
});
export const waitingCountSchema = z.object({ classId: z.string(), waiting: z.number() });
export type DocumentLink = z.infer<typeof documentLinkSchema>;
export type OpenRequest = z.infer<typeof openRequestSchema>;
export type Answer = z.infer<typeof answerSchema>;
export type WaitingRequest = z.infer<typeof waitingRequestSchema>;
```

These must be declared above their first use. Then:
- `studentStageSchema.checkpoint` becomes `z.object({ id: z.string(), text: z.string(), state: checkpointStateSchema, signedOffOn: z.string().nullable(), request: openRequestSchema.nullable(), answers: z.array(answerSchema) }).nullable()`.
- `studentComponentSchema` gains `requireLink: z.boolean(), documentLink: documentLinkSchema.nullable()`.
- `teacherComponentSchema` gains `requireLink: z.boolean()`.
- `progressStudentSchema` gains `documentLink: documentLinkSchema.nullable()`.
- `progressGridSchema` gains `waiting: z.array(waitingRequestSchema)`.
- `studentCheckpointsSchema` stages gain `request: openRequestSchema.nullable(), answers: z.array(answerSchema)`, and the top level gains `documentLink: documentLinkSchema.nullable()`.

- [ ] **Step 6: Fix the exhaustive maps.** Run `npx tsc --noEmit`. `stage-card.tsx`'s `CHECKPOINT_WORD` gains `READY: "Waiting for your teacher"`. Fix any spec fixture the compiler rejects for missing fields (`id`, `request: null`, `answers: []`, `requireLink: false`, `documentLink: null`, `waiting: []`). Search for fixture builders first: `grep -rn "signedOffOn" frontend/components frontend/lib --include=*.spec.tsx`.
- [ ] **Step 7: Run** `node --test lib/app/ready.test.ts && npx tsc --noEmit && npx vitest run` → PASS, then `make verify`.
- [ ] **Step 8: Commit.** `git add -A frontend backend && git commit -m "Mirror the ready-for-signoff records, name every control, and prove the backup quote's page"`

---

## Task 15: The student's "Your work" card

**Files:**
- Create: `frontend/components/app/work-link.tsx`, `frontend/components/app/document-link-card.tsx`, `frontend/components/app/document-link-card.spec.tsx`
- Modify: `frontend/components/app/component-overview.tsx` (render it after the "Where you are" section)

- [ ] **Step 1: Write the failing spec.** Mock `@/lib/api/client` and `next/navigation` the way `item-tick.spec.tsx` does:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/api/client", () => ({ api: { send: (...a: unknown[]) => send(...a) } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { DocumentLinkCard } from "./document-link-card";

describe("DocumentLinkCard (FR-38–40)", () => {
  beforeEach(() => { send.mockReset(); refresh.mockReset(); });

  it("asks for a link when there is none, and says when the class requires it", () => {
    render(<DocumentLinkCard componentId="c1" link={null} requireLink />);
    expect(screen.getByRole("heading", { name: "Your work" })).toBeInTheDocument();
    expect(screen.getByText(/Your teacher asks for this link before you can ask for a sign-off/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Link to your work" })).toBeInTheDocument();
  });

  it("shows the current link, opening in a new tab, and quotes the brief on backups", () => {
    render(<DocumentLinkCard componentId="c1" link={{ url: "https://docs.google.com/d/a", setOn: "2027-03-03" }} requireLink={false} />);
    const a = screen.getByRole("link", { name: "Open your work (opens in a new tab)" });
    expect(a).toHaveAttribute("href", "https://docs.google.com/d/a");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(/It is strongly recommended that you make and regularly update a backup copy/)).toBeInTheDocument();
  });

  it("saves a new link and refreshes", async () => {
    send.mockResolvedValue({ url: "https://docs.google.com/d/b", setOn: "2027-03-04" });
    render(<DocumentLinkCard componentId="c1" link={{ url: "https://docs.google.com/d/a", setOn: "2027-03-03" }} requireLink={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Change link" }));
    const box = screen.getByRole("textbox", { name: "Link to your work" });
    await userEvent.clear(box);
    await userEvent.type(box, "https://docs.google.com/d/b");
    await userEvent.click(screen.getByRole("button", { name: "Save link" }));
    expect(send).toHaveBeenCalledWith("PUT", "/components/c1/document-link", { url: "https://docs.google.com/d/b" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the server's refusal at the field, and moves focus to it", async () => {
    const { ApiError } = await import("@/lib/api/problem");
    send.mockRejectedValue(new ApiError({ code: "VALIDATION_FAILED", status: 400, detail: "That isn't an https link.",
      fieldErrors: [{ field: "url", message: "must be a link starting https://" }] }));
    render(<DocumentLinkCard componentId="c1" link={null} requireLink={false} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Link to your work" }), "http://x.ie");
    await userEvent.click(screen.getByRole("button", { name: "Save link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/https/);
  });
});
```

Check `FieldProblem`'s property names in `lib/api/problem.ts` before writing the last test's fixture.

- [ ] **Step 2: Run** `npx vitest run components/app/document-link-card.spec.tsx` → FAIL.
- [ ] **Step 3: Implement.** `work-link.tsx`:

```tsx
import { ExternalLink } from "lucide-react";

import { linkHost, openWorkName } from "@/lib/app/ready";

/** The one way a student's link is drawn (FR-39, design §9): new tab, no opener, no referrer, said in the name. */
export function WorkLink({ url, name, className = "" }: { url: string; name?: string; className?: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={openWorkName(name)}
      className={`inline-flex min-h-11 items-center gap-1.5 text-app-base font-semibold text-app-accent underline underline-offset-3 ${className}`}>
      <span data-private>{linkHost(url)}</span>
      <ExternalLink aria-hidden className="size-4 flex-none" />
    </a>
  );
}
```

Check that `lucide-react` is a dependency (`log-entry-form.tsx` imports `Eye` from it).

`document-link-card.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api/client";
import { type DocumentLink, documentLinkSchema } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { BACKUP_ADVICE, BACKUP_SOURCE } from "@/lib/app/ready";

import { card, eyebrow, lead } from "./styles";
import { WorkLink } from "./work-link";

/** FR-38–40: where the student's report lives. One link per component; changing it keeps the old one on record. */
export function DocumentLinkCard({ componentId, link, requireLink }: { componentId: string; link: DocumentLink | null; requireLink: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(link === null);
  const [url, setUrl] = useState(link?.url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.send("PUT", `/components/${componentId}/document-link`, { url }, documentLinkSchema);
      setEditing(false);
      router.refresh();
    } catch (err) {
      const field = err instanceof ApiError ? err.fieldErrors.find((f) => f.field === "url") : undefined;
      setError(field ? "That isn't a link we can keep. It must start with https://." : "Couldn't save the link. Check your connection and try again.");
      queueMicrotask(() => alertRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="work-heading" className={`${card} flex flex-col gap-3 p-5`}>
      <h2 id="work-heading" className={eyebrow}>Your work</h2>
      {link && !editing ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <WorkLink url={link.url} />
          <span className="font-mono text-app-label text-app-grey">{`Added ${formatCalendarDate(link.setOn)}`}</span>
          <Button type="button" variant="link" onClick={() => setEditing(true)} className="min-h-11 px-1">Change link</Button>
        </div>
      ) : (
        <form onSubmit={save} className="flex flex-col gap-2">
          <p className={lead}>
            {requireLink
              ? "Your teacher asks for this link before you can ask for a sign-off. Paste the share link to wherever your report lives."
              : "Paste the share link to wherever your report lives, so your teacher can open it when you ask for a sign-off."}
          </p>
          <label htmlFor="work-url" className="text-app-small font-semibold text-app-ink">Link to your work</label>
          <input id="work-url" type="url" inputMode="url" required value={url} onChange={(e) => setUrl(e.target.value)}
            aria-invalid={error !== null} aria-describedby={error ? "work-url-error" : undefined}
            className="min-h-11 rounded-app-control border border-app-field-border bg-app-surface px-3 text-app-base" />
          {error && <p id="work-url-error" ref={alertRef} tabIndex={-1} role="alert" className="text-app-small text-app-error">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save link"}</Button>
            {link && <Button type="button" variant="outline" onClick={() => { setEditing(false); setUrl(link.url); setError(null); }}>Cancel</Button>}
          </div>
          <p className="text-app-small text-app-grey">{"Make sure your teacher can open it: in Google Docs or OneDrive, share it with them first."}</p>
        </form>
      )}
      <figure className="flex flex-col gap-1 border-l-[3px] border-l-app-line pl-3">
        <blockquote className="text-app-small text-app-copy">{BACKUP_ADVICE}</blockquote>
        <figcaption className="text-app-label text-app-grey">{BACKUP_SOURCE}</figcaption>
      </figure>
    </section>
  );
}
```

Check that `ApiError` is exported from `@/lib/api/client` (it re-exports `./problem`) and that `FieldProblem` has a `field` property. In `component-overview.tsx`, render `<DocumentLinkCard componentId={component.id} link={component.documentLink} requireLink={component.requireLink} />` directly after the "Where you are" section.

- [ ] **Step 4: Run** `npx vitest run components/app/document-link-card.spec.tsx components/app/component-overview.spec.tsx` → PASS. Update `component-overview.spec.tsx`'s fixture if it fails on missing fields.
- [ ] **Step 5: Commit.** `git commit -am "Give the student a Your work card with their link and the brief's backup advice"` (`git add` the new files first).

---

## Task 16: The student's Ready control and the answer history

**Files:**
- Create: `frontend/components/app/request-history.tsx` (+ spec), `frontend/components/app/ready-control.tsx` (+ spec)
- Modify: `frontend/components/app/stage-card.tsx`, `stages-section.tsx`, `component-overview.tsx` (pass `link` and `requireLink` down), and their specs

**Behaviour, in the stage card's checkpoint box:**

| State | Shows | Controls |
|---|---|---|
| `NOT_DUE`/`DUE`, no request, the last answer isn't Not yet | — | **Ready for sign-off** → inline form: note (optional, counter from 90% of 280), the link line ("Your teacher will see: docs.google.com", or the nudge, or, when required and missing, "Add the link to your work above first" with Send disabled), **Send** / **Cancel** |
| `READY` | "Waiting for your teacher · asked 3 Nov", your note | **Withdraw** |
| Last answer `NOT_YET` and no open request | "Not yet · 4 Nov", the teacher's note | **Ask again** (opens the same form) |
| `SIGNED_OFF` | existing line + the accept note if the latest answer was Accepted | — |

Below, in every state with answers: `RequestHistory` as a `<details>` "Earlier requests (N)".

- [ ] **Step 1: Write the failing specs.** `ready-control.spec.tsx`, with mocks as in Task 15:

```tsx
const cp = (over: object = {}) => ({ id: "cp1", text: "Initial ideas discussed with the teacher", state: "DUE" as const,
  signedOffOn: null, request: null, answers: [], ...over });

it("sends a request with a note and announces it", async () => {
  send.mockResolvedValue({ askedOn: "2027-03-03", note: "page 2" });
  render(<ReadyControl componentId="c1" checkpoint={cp()} link={{ url: "https://docs.google.com/d/a", setOn: "2027-03-01" }} requireLink={false} />);
  await userEvent.click(screen.getByRole("button", { name: "Ready for sign-off: Initial ideas discussed with the teacher" }));
  expect(screen.getByText("Your teacher will see: docs.google.com")).toBeInTheDocument();
  await userEvent.type(screen.getByRole("textbox", { name: "Note for your teacher (optional)" }), "page 2");
  await userEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(send).toHaveBeenCalledWith("POST", "/components/c1/checkpoints/cp1/request", { note: "page 2" }, expect.anything());
  expect(refresh).toHaveBeenCalled();
  expect(screen.getByText("Sent to your teacher.")).toBeInTheDocument();
});

it("won't send without a link when the class requires one", async () => {
  render(<ReadyControl componentId="c1" checkpoint={cp()} link={null} requireLink />);
  await userEvent.click(screen.getByRole("button", { name: /^Ready for sign-off/ }));
  expect(screen.getByText("Add the link to your work above first.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
});

it("nudges, but lets the student send, when a link isn't required", async () => {
  render(<ReadyControl componentId="c1" checkpoint={cp()} link={null} requireLink={false} />);
  await userEvent.click(screen.getByRole("button", { name: /^Ready for sign-off/ }));
  expect(screen.getByText(/Add the link to your work above so your teacher can open it\./)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
});

it("waiting shows the note and Withdraw", async () => {
  sendNoContent.mockResolvedValue(undefined);
  render(<ReadyControl componentId="c1" checkpoint={cp({ state: "READY", request: { askedOn: "2027-11-03", note: "page 2" } })} link={null} requireLink={false} />);
  expect(screen.getByText(/Waiting for your teacher · asked 3 Nov/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Withdraw request: Initial ideas discussed with the teacher" }));
  expect(sendNoContent).toHaveBeenCalledWith("DELETE", "/components/c1/checkpoints/cp1/request");
});

it("after Not yet, shows the teacher's note and Ask again", () => {
  render(<ReadyControl componentId="c1" link={null} requireLink={false} checkpoint={cp({ answers: [
    { askedOn: "2027-11-03", note: null, outcome: "NOT_YET", answeredOn: "2027-11-04", teacherNote: "Say what you'll measure." }] })} />);
  expect(screen.getByText("Not yet · 4 Nov")).toBeInTheDocument();
  expect(screen.getByText("Say what you'll measure.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ask again: Initial ideas discussed with the teacher" })).toBeInTheDocument();
});

it("a failed send says so in an alert and keeps the note", async () => {
  send.mockRejectedValue(new Error("offline"));
  render(<ReadyControl componentId="c1" checkpoint={cp()} link={null} requireLink={false} />);
  await userEvent.click(screen.getByRole("button", { name: /^Ready for sign-off/ }));
  await userEvent.type(screen.getByRole("textbox", { name: "Note for your teacher (optional)" }), "page 2");
  await userEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't send it. Check your connection and try again.");
  expect(screen.getByRole("textbox", { name: "Note for your teacher (optional)" })).toHaveValue("page 2");
});
```

Mock `api` with both `send` and `sendNoContent`. Check what `formatCalendarDate` returns for `2027-11-03`. If it's "3 November", or includes the year, match the assertions to it and use that format everywhere in this feature. Don't add a second date format.

`request-history.spec.tsx`:

```tsx
it("lists answered requests newest first with both notes", () => {
  render(<RequestHistory answers={[
    { askedOn: "2027-11-05", note: "added it", outcome: "ACCEPTED", answeredOn: "2027-11-06", teacherNote: null },
    { askedOn: "2027-11-03", note: "page 2", outcome: "NOT_YET", answeredOn: "2027-11-04", teacherNote: "Say what you'll measure." },
  ]} />);
  expect(screen.getByText("Earlier requests (2)")).toBeInTheDocument();
  const items = screen.getAllByRole("listitem");
  expect(items[0]).toHaveTextContent(/Accepted/);
  expect(items[1]).toHaveTextContent(/Not yet.*Say what you'll measure\./);
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement `request-history.tsx`:**

```tsx
import type { Answer } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";

const OUTCOME = { ACCEPTED: "Accepted", NOT_YET: "Not yet" } as const;

/** R-16: answered requests, newest first, the same on both sides. Withdrawn ones aren't sent. */
export function RequestHistory({ answers, studentLabel = "Your note" }: { answers: ReadonlyArray<Answer>; studentLabel?: string }) {
  if (answers.length === 0) return null;
  return (
    <details className="text-app-small">
      <summary className="min-h-11 cursor-pointer content-center font-semibold text-app-accent">{`Earlier requests (${answers.length})`}</summary>
      <ul className="mt-1 flex flex-col gap-2">
        {answers.map((a, i) => (
          <li key={i} className="flex flex-col gap-0.5 border-l-[3px] border-l-app-line pl-3 text-app-copy">
            <span className="font-mono text-app-label text-app-grey">{`Asked ${formatCalendarDate(a.askedOn)} · ${OUTCOME[a.outcome]} ${formatCalendarDate(a.answeredOn)}`}</span>
            {a.note && <span>{`${studentLabel}: ${a.note}`}</span>}
            {a.teacherNote && <span>{`Teacher: ${a.teacherNote}`}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}
```

`ready-control.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { type DocumentLink, type StudentComponent, openRequestSchema } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { STUDENT_NOTE_MAX, askAgainName, linkHost, readyName, withdrawName } from "@/lib/app/ready";

import { RequestHistory } from "./request-history";

type Checkpoint = NonNullable<StudentComponent["stages"][number]["checkpoint"]>;

/** Ready for sign-off (backlog §1) inside the stage card's checkpoint box. One request at a time; withdraw until answered. */
export function ReadyControl({ componentId, checkpoint: c, link, requireLink }:
  { componentId: string; checkpoint: Checkpoint; link: DocumentLink | null; requireLink: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const alertRef = useRef<HTMLParagraphElement>(null);
  const latest = c.answers[0];
  const blocked = requireLink && link === null;

  async function act(run: () => Promise<unknown>, done: string, failed: string) {
    setBusy(true);
    setError(null);
    try {
      await run();
      setOpen(false);
      setNote("");
      setAnnouncement(done);
      router.refresh();
    } catch {
      setError(failed);
      queueMicrotask(() => alertRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }

  const send = () => act(() => api.send("POST", `/components/${componentId}/checkpoints/${c.id}/request`, { note }, openRequestSchema),
    "Sent to your teacher.", "Couldn't send it. Check your connection and try again.");
  const withdraw = () => act(() => api.sendNoContent("DELETE", `/components/${componentId}/checkpoints/${c.id}/request`),
    "Request withdrawn.", "Couldn't withdraw it. Check your connection and try again.");

  return (
    <div className="flex flex-col gap-2">
      {c.state === "READY" && c.request ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-app-small font-semibold text-app-ready">{`Waiting for your teacher · asked ${formatCalendarDate(c.request.askedOn)}`}</span>
            {c.request.note && <span className="text-app-small text-app-copy">{`Your note: ${c.request.note}`}</span>}
          </div>
          <Button type="button" variant="outline" aria-label={withdrawName(c.text)} disabled={busy} onClick={withdraw}>
            {busy ? "Withdrawing…" : "Withdraw"}
          </Button>
        </div>
      ) : c.state !== "SIGNED_OFF" && !open ? (
        <>
          {latest?.outcome === "NOT_YET" && (
            <div className="flex flex-col gap-0.5">
              <span className="text-app-small font-semibold text-app-due">{`Not yet · ${formatCalendarDate(latest.answeredOn)}`}</span>
              {latest.teacherNote && <span className="text-app-small text-app-copy">{latest.teacherNote}</span>}
            </div>
          )}
          <Button type="button" className="self-start" onClick={() => setOpen(true)}
            aria-label={latest?.outcome === "NOT_YET" ? askAgainName(c.text) : readyName(c.text)}>
            {latest?.outcome === "NOT_YET" ? "Ask again" : "Ready for sign-off"}
          </Button>
        </>
      ) : null}

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex flex-col gap-2">
          <label htmlFor={`note-${c.id}`} className="text-app-small font-semibold text-app-ink">Note for your teacher (optional)</label>
          <textarea id={`note-${c.id}`} value={note} maxLength={STUDENT_NOTE_MAX} rows={2} onChange={(e) => setNote(e.target.value)}
            className="rounded-app-control border border-app-field-border bg-app-surface px-3 py-2 text-app-base" />
          {note.length >= STUDENT_NOTE_MAX * 0.9 && <span className="text-app-label text-app-grey">{`${note.length} of ${STUDENT_NOTE_MAX}`}</span>}
          <p className="text-app-small text-app-grey">
            {link ? `Your teacher will see: ${linkHost(link.url)}`
              : blocked ? "Add the link to your work above first."
              : "Add the link to your work above so your teacher can open it. You can still send this without it."}
          </p>
          {error && <p ref={alertRef} tabIndex={-1} role="alert" className="text-app-small text-app-error">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || blocked}>{busy ? "Sending…" : "Send"}</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => { setOpen(false); setError(null); }}>Cancel</Button>
          </div>
        </form>
      )}
      {error && !open && <p ref={alertRef} tabIndex={-1} role="alert" className="text-app-small text-app-error">{error}</p>}
      {latest?.outcome === "ACCEPTED" && c.state === "SIGNED_OFF" && latest.teacherNote && (
        <span className="text-app-small text-app-copy">{`Your teacher: ${latest.teacherNote}`}</span>
      )}
      <RequestHistory answers={c.answers} />
      <p aria-live="polite" className="sr-only">{announcement}</p>
    </div>
  );
}
```

The nudge test expects the regex `/Add the link to your work above so your teacher can open it\./`, and the string above satisfies it. Add the tokens to `globals.css` next to `--app-due` (contrast-check them with the same note style):

```css
  --app-ready: var(--app-accent);         /* Ready: navy, the teacher's turn; 11.12:1 on white */
  --app-ready-tint: var(--app-accent-tint); /* Ready cell ground; navy on it 10.20:1 */
```

and in `@theme`: `--color-app-ready: var(--app-ready); --color-app-ready-tint: var(--app-ready-tint);`.

In `stage-card.tsx`, delete the "Bring it up in your next class." line and the `Only your teacher can sign this off.` fallback, and render `<ReadyControl componentId={componentId} checkpoint={s.checkpoint} link={link} requireLink={requireLink} />` after the checkpoint text. Add `link` and `requireLink` to `StageCard`'s props and thread them through `StagesSection` from `ComponentOverview`. The box's tint for `READY` is `bg-app-ready-tint`.

- [ ] **Step 4: Run** `npx vitest run components/app/ready-control.spec.tsx components/app/request-history.spec.tsx components/app/stage-card.spec.tsx components/app/stages-section.spec.tsx components/app/component-overview.spec.tsx` → PASS. Update the old specs that asserted the removed lines.
- [ ] **Step 5: Commit.** `git add -A frontend && git commit -m "Let the student mark a checkpoint ready with a note, withdraw it, and ask again after a not yet"`

---

## Task 17: The teacher's require-link switch

**Files:**
- Create: `frontend/components/app/require-link-switch.tsx` (+ spec)
- Modify: `frontend/app/(app)/teach/classes/[id]/component/page.tsx`

- [ ] **Step 1: Write the failing spec:**

```tsx
it("is a switch, off by default, that saves and refreshes", async () => {
  send.mockResolvedValue({});
  render(<RequireLinkSwitch componentId="c1" requireLink={false} />);
  const sw = screen.getByRole("switch", { name: "Require a link to their work before students ask for sign-off" });
  expect(sw).not.toBeChecked();
  await userEvent.click(sw);
  expect(send).toHaveBeenCalledWith("PUT", "/components/c1/settings", { requireLink: true }, expect.anything());
  expect(refresh).toHaveBeenCalled();
});

it("puts the switch back and says so when saving fails", async () => {
  send.mockRejectedValue(new Error("offline"));
  render(<RequireLinkSwitch componentId="c1" requireLink={false} />);
  await userEvent.click(screen.getByRole("switch"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save the setting.");
  expect(screen.getByRole("switch")).not.toBeChecked();
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Reuse `LogEntryForm`'s switch markup (lines 196–201), with the label text as the accessible name. Use an optimistic `checked` state that reverts on failure:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { api } from "@/lib/api/client";

import { card } from "./styles";

/** Ready-for-signoff R-6, R-7: the class's one setting. A Settings tab replaces this once there's a second. */
export function RequireLinkSwitch({ componentId, requireLink }: { componentId: string; requireLink: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(requireLink);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function change(next: boolean) {
    setOn(next);
    setBusy(true);
    setError(false);
    try {
      await api.send("PUT", `/components/${componentId}/settings`, { requireLink: next }, z.unknown());
      router.refresh();
    } catch {
      setOn(!next);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Sign-off requests" className={`${card} mt-6 flex flex-col gap-2 p-5`}>
      <label className="flex min-h-11 items-center justify-between gap-4 text-app-base font-semibold text-app-ink">
        Require a link to their work before students ask for sign-off
        <span className="relative inline-flex h-7 w-12 flex-none">
          <input type="checkbox" role="switch" checked={on} disabled={busy} onChange={(e) => void change(e.target.checked)}
            className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
          <span aria-hidden className="absolute inset-0 rounded-full bg-app-switch-off transition-colors duration-[var(--app-duration)] motion-reduce:transition-none peer-checked:bg-app-accent" />
          <span aria-hidden className="absolute top-0.5 left-0.5 size-6 rounded-full bg-app-surface transition-transform duration-[var(--app-duration)] motion-reduce:transition-none peer-checked:translate-x-5" />
        </span>
      </label>
      <p className="text-app-small text-app-grey">{on
        ? "Students add the link to their report before they can mark a checkpoint ready."
        : "Students can mark a checkpoint ready without a link. You'll see \"No link yet\"."}</p>
      {error && <p role="alert" className="text-app-small text-app-error">{"Couldn't save the setting. Check your connection and try again."}</p>}
    </section>
  );
}
```

In the Component tab page, when `body.data` is a `TeacherComponent`, render `<RequireLinkSwitch componentId={body.data.id} requireLink={body.data.requireLink} />` above `StageDatesForm`.

- [ ] **Step 4: Run** the spec plus `npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit.** `git add -A frontend && git commit -m "Add the require-link switch to the class's Component tab"`

---

## Task 18: The Progress tab: the queue, Ready cells, work links

**Files:**
- Create: `frontend/components/app/waiting-queue.tsx` (+ spec)
- Modify: `frontend/components/app/signoff-parts.tsx` (+ spec), `progress-grid.tsx` (+ spec), `app/(app)/teach/classes/[id]/progress/page.tsx`

- [ ] **Step 1: Write the failing specs.** `waiting-queue.spec.tsx`:

```tsx
const w = (first: string, askedOn: string, note: string | null = null) => ({ studentId: first, firstName: first, lastName: "Byrne",
  checkpointId: "cp1", checkpointText: "Initial ideas discussed with the teacher", askedOn, note });

it("lists who's waiting, oldest first, each opening the student page at that checkpoint", () => {
  render(<WaitingQueue classId="k1" today="2027-03-03" waiting={[w("Aoife", "2027-03-01", "page 2"), w("Cian", "2027-03-03")]} />);
  expect(screen.getByRole("heading", { name: "2 students waiting for you" })).toBeInTheDocument();
  const links = screen.getAllByRole("link");
  expect(links[0]).toHaveAccessibleName("Review Initial ideas discussed with the teacher for Aoife Byrne");
  expect(links[0]).toHaveAttribute("href", "/teach/classes/k1/students/Aoife#checkpoint-cp1");
  expect(screen.getByText(/asked 2 days ago/)).toBeInTheDocument();
  expect(screen.getByText("page 2")).toBeInTheDocument();
});

it("renders nothing when no one is waiting", () => {
  const { container } = render(<WaitingQueue classId="k1" today="2027-03-03" waiting={[]} />);
  expect(container).toBeEmptyDOMElement();
});
```

In `signoff-parts.spec.tsx`:

```tsx
it("a Ready cell in the grid is a link to review, not a sign-off button", () => {
  render(<CheckpointCell layout="grid" cell={{ checkpointId: "cp1", state: "READY", signedOffOn: null }} reviewHref="/teach/classes/k1/students/s1#checkpoint-cp1"
    names={{ sign: "Sign off X for A", undo: "u", revoke: "r", review: "Review X for A" }} busy={null} recent={false} confirming={false}
    onSign={vi.fn()} onUndo={vi.fn()} onAsk={vi.fn()} />);
  expect(screen.getByRole("link", { name: "Review X for A" })).toHaveAttribute("href", "/teach/classes/k1/students/s1#checkpoint-cp1");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
```

In `progress-grid.spec.tsx`, add a row with `documentLink` and assert `within(table).getByRole("link", { name: "Open Aoife Byrne's work (opens in a new tab)" })`.

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `waiting-queue.tsx`:

```tsx
import Link from "next/link";

import type { WaitingRequest } from "@/lib/api/schemas";
import { askedWhen, checkpointAnchor, reviewName, waitingHeading } from "@/lib/app/ready";
import { fullName, shortCheckpoint } from "@/lib/app/progress";

import { card, sectionTitle } from "./styles";

/** Backlog §1: "3 students waiting for you", oldest request first; each opens the student page at that checkpoint (R-3). */
export function WaitingQueue({ classId, today, waiting }: { classId: string; today: string; waiting: ReadonlyArray<WaitingRequest> }) {
  if (waiting.length === 0) return null;
  const students = new Set(waiting.map((w) => w.studentId)).size;
  return (
    <section aria-labelledby="queue-heading" className={`${card} mt-6 flex flex-col gap-2 border-l-4 border-l-app-ready p-5`}>
      <h2 id="queue-heading" className={sectionTitle}>{waitingHeading(students)}</h2>
      <ol className="flex flex-col divide-y divide-app-line">
        {waiting.map((w) => {
          const name = fullName(w);
          return (
            <li key={`${w.studentId}/${w.checkpointId}`} className="flex flex-col gap-0.5 py-2">
              <Link href={`/teach/classes/${classId}/students/${w.studentId}#${checkpointAnchor(w.checkpointId)}`}
                aria-label={reviewName(w.checkpointText, name)}
                className="min-h-11 content-center text-app-base font-semibold text-app-accent underline underline-offset-3">
                <span data-private>{name}</span>{` · ${shortCheckpoint(w.checkpointText)}`}
              </Link>
              <span className="text-app-small text-app-grey"><span data-private>{askedWhen(w.askedOn, today)}</span></span>
              {w.note && <span data-private className="text-app-small text-app-copy">{w.note}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
```

The heading counts distinct students; one student waiting on two checkpoints is still "1 student". Check `fullName` and `shortCheckpoint`'s signatures in `lib/app/progress.ts` and adapt the calls if needed.

In `signoff-parts.tsx`: add `review` to `names` and an optional `reviewHref?: string` prop. Before the `layout === "grid"` branch:

```tsx
  if (cell.state === "READY") {
    return layout === "grid" && reviewHref ? (
      <Link href={reviewHref} aria-label={names.review} className={`${GRID_BUTTON} bg-app-ready-tint hover:bg-app-accent-tint`}>
        <span className="text-app-small font-semibold text-app-ready">Ready</span>
        <span className="text-app-small font-semibold text-app-accent underline underline-offset-3">Review</span>
      </Link>
    ) : (
      <span className="text-app-small font-semibold text-app-ready">Ready for sign-off</span>
    );
  }
```

In `progress-grid.tsx`, pass `reviewHref={`/teach/classes/${grid.classId}/students/${st.studentId}#${checkpointAnchor(cell.checkpointId)}`}` and `names.review: reviewName(text, name)` where the cells are drawn (line 57). Next to both name links (lines 149 and 196), render `{st.documentLink && <WorkLink url={st.documentLink.url} name={fullName(st)} />}`. If `progress.ts`'s `summary(grid)` or `stageStateWord` switch on state, add `READY` there with a `node:test` case.

In the Progress page, render `<WaitingQueue classId={cls.id} today={grid.data.today} waiting={grid.data.waiting} />` above `<ProgressGrid …>`, inside the same `.app-hide-names` wrapper so Hide names blurs it. If the wrapper is inside `ProgressGrid`, render the queue inside `ProgressGrid` instead, as its first child.

- [ ] **Step 4: Run** `npx vitest run components/app/waiting-queue.spec.tsx components/app/signoff-parts.spec.tsx components/app/progress-grid.spec.tsx && node --test lib/app/progress.test.ts` → PASS.
- [ ] **Step 5: Commit.** `git add -A frontend && git commit -m "Show the teacher who's waiting, oldest first, with Ready cells that open the review"`

---

## Task 19: The review panel on the student page

**Files:**
- Create: `frontend/components/app/request-review.tsx` (+ spec)
- Modify: `frontend/components/app/student-checkpoints.tsx` (+ spec), `app/(app)/teach/classes/[id]/students/[studentId]/page.tsx`

- [ ] **Step 1: Write the failing spec** (mocks as before):

```tsx
const props = { componentId: "c1", studentId: "s1", name: "Aoife Byrne", text: "Initial ideas discussed with the teacher",
  checkpointId: "cp1", request: { askedOn: "2027-03-01", note: "plan's on page 2" }, link: { url: "https://docs.google.com/d/a", setOn: "2027-02-20" } };

it("shows the student's note and their work, and accepts with a note", async () => {
  send.mockResolvedValue({ checkpointId: "cp1", state: "SIGNED_OFF", signedOffOn: "2027-03-03" });
  render(<RequestReview {...props} />);
  expect(screen.getByText("plan's on page 2")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open Aoife Byrne's work (opens in a new tab)" })).toBeInTheDocument();
  expect(screen.getByText(/Keep it general/)).toBeInTheDocument();
  await userEvent.type(screen.getByRole("textbox", { name: "Note to Aoife Byrne (optional)" }), "Clear aim.");
  await userEvent.click(screen.getByRole("button", { name: "Accept Initial ideas discussed with the teacher for Aoife Byrne" }));
  expect(send).toHaveBeenCalledWith("POST", "/components/c1/students/s1/checkpoints/cp1/request/answer",
    { outcome: "ACCEPTED", note: "Clear aim." }, expect.anything());
  expect(refresh).toHaveBeenCalled();
});

it("says Not yet", async () => {
  send.mockResolvedValue({ checkpointId: "cp1", state: "DUE", signedOffOn: null });
  render(<RequestReview {...props} />);
  await userEvent.click(screen.getByRole("button", { name: "Not yet: Initial ideas discussed with the teacher for Aoife Byrne" }));
  expect(send).toHaveBeenCalledWith("POST", expect.stringContaining("/request/answer"), { outcome: "NOT_YET", note: "" }, expect.anything());
});

it("says No link yet when there isn't one", () => {
  render(<RequestReview {...props} link={null} />);
  expect(screen.getByText("No link yet")).toBeInTheDocument();
});

it("explains a 409: the student withdrew, or another tab answered", async () => {
  const { ApiError } = await import("@/lib/api/problem");
  send.mockRejectedValue(new ApiError({ code: "SIGNOFF_REQUEST_NOT_OPEN", status: 409 }));
  render(<RequestReview {...props} />);
  await userEvent.click(screen.getByRole("button", { name: /^Accept/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent("This request was withdrawn or already answered. The page has been refreshed.");
  expect(refresh).toHaveBeenCalled();
});
```

In `student-checkpoints.spec.tsx`, assert that the row with an open request has `id="checkpoint-cp1"`, contains the review panel, and that a row's answers show `Earlier requests (1)`.

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement `request-review.tsx`:**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api/client";
import { type DocumentLink, type OpenRequest, progressCellSchema } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { NONDIRECTIVE_HELP, TEACHER_NOTE_MAX, acceptName, notYetName } from "@/lib/app/ready";

import { WorkLink } from "./work-link";

type Outcome = "ACCEPTED" | "NOT_YET";

/** R-3: the teacher answers on the student page, with the work one click away. Accept signs off. */
export function RequestReview({ componentId, studentId, name, text, checkpointId, request, link }:
  { componentId: string; studentId: string; name: string; text: string; checkpointId: string; request: OpenRequest; link: DocumentLink | null }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const noteId = `answer-${checkpointId}`;

  async function answer(outcome: Outcome) {
    setBusy(outcome);
    setError(null);
    try {
      await api.send("POST", `/components/${componentId}/students/${studentId}/checkpoints/${checkpointId}/request/answer`,
        { outcome, note }, progressCellSchema);
      router.refresh();
    } catch (err) {
      const gone = err instanceof ApiError && err.code === "SIGNOFF_REQUEST_NOT_OPEN";
      setError(gone ? "This request was withdrawn or already answered. The page has been refreshed."
        : "Couldn't save your answer. Nothing changed. Check your connection and try again.");
      if (gone) router.refresh();
      queueMicrotask(() => alertRef.current?.focus());
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-app-inner border border-app-line bg-app-ready-tint p-4">
      <p className="text-app-small font-semibold text-app-ready">{`Ready for sign-off · asked ${formatCalendarDate(request.askedOn)}`}</p>
      {request.note && <p data-private className="text-app-base text-app-ink">{request.note}</p>}
      {link ? <WorkLink url={link.url} name={name} className="self-start" /> : <p className="text-app-small text-app-grey">No link yet</p>}
      <label htmlFor={noteId} className="text-app-small font-semibold text-app-ink">{`Note to ${name} (optional)`}</label>
      <textarea id={noteId} value={note} maxLength={TEACHER_NOTE_MAX} rows={2} onChange={(e) => setNote(e.target.value)}
        aria-describedby={`${noteId}-help`} className="rounded-app-control border border-app-field-border bg-app-surface px-3 py-2 text-app-base" />
      <p id={`${noteId}-help`} className="text-app-small text-app-grey">{NONDIRECTIVE_HELP}</p>
      {error && <p ref={alertRef} tabIndex={-1} role="alert" className="text-app-small text-app-error">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" aria-label={acceptName(text, name)} disabled={busy !== null} onClick={() => void answer("ACCEPTED")}>
          {busy === "ACCEPTED" ? "Accepting…" : "Accept"}
        </Button>
        <Button type="button" variant="outline" aria-label={notYetName(text, name)} disabled={busy !== null} onClick={() => void answer("NOT_YET")}>
          {busy === "NOT_YET" ? "Saving…" : "Not yet"}
        </Button>
      </div>
    </div>
  );
}
```

In `student-checkpoints.tsx`: give each `<li>` `id={checkpointAnchor(st.checkpoint.id)}` and `className="… scroll-mt-20"`. When `st.request` is set, render `<RequestReview … request={st.request} link={data.documentLink} />` under the grid row. Pass `names.review` and no `reviewHref` to `CheckpointCell`, so a Ready row says "Ready for sign-off" and the panel below does the work. After the sign-off history, render `<RequestHistory answers={st.answers} studentLabel="Their note" />`. In the page, render `{checkpoints.ok && checkpoints.data.documentLink && <WorkLink url={…} name={…} />}` under the subtitle.

- [ ] **Step 4: Run** `npx vitest run components/app/request-review.spec.tsx components/app/student-checkpoints.spec.tsx` → PASS.
- [ ] **Step 5: Commit.** `git add -A frontend && git commit -m "Let the teacher accept or say not yet on the student page, with the work one click away"`

---

## Task 20: `/teach`: N waiting for sign-off

**Files:**
- Modify: `frontend/components/app/class-list.tsx` (+ spec), `frontend/app/(app)/teach/page.tsx`

- [ ] **Step 1: Write the failing spec** (add to `class-list.spec.tsx`):

```tsx
it("shows a waiting badge only for classes with requests", () => {
  render(<ClassList classes={[summary({ id: "k1", name: "6A" }), summary({ id: "k2", name: "6B" })]} waiting={{ k1: 3 }} />);
  expect(screen.getByText("3 waiting for sign-off")).toBeInTheDocument();
  expect(screen.getAllByText(/waiting for sign-off/)).toHaveLength(1);
});
```

Use the spec file's existing fixture builder in place of `summary(...)`, and keep its other tests passing with `waiting` defaulting to `{}`.

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `ClassList` takes `waiting: Readonly<Record<string, number>> = {}`. Next to the pending badge, render the same pill when `(waiting[c.id] ?? 0) > 0`, in `bg-app-ready text-app-on-accent` (check `--app-on-accent` on navy), with `waitingBadge(n)`. The page:

```tsx
export default async function TeachPage() {
  const [classes, waiting] = await Promise.all([
    attempt(() => serverApi.get("/classes", z.array(classSummarySchema))),
    attempt(() => serverApi.get("/signoff-requests/waiting", z.array(waitingCountSchema))),
  ]);
  // The badge is a convenience: if its request fails, the class list still renders without it.
  const counts = waiting.ok ? Object.fromEntries(waiting.data.map((w) => [w.classId, w.waiting])) : {};
  return <AppMain>{classes.ok ? <ClassList classes={classes.data} waiting={counts} /> : <ErrorPanel error={classes.error} />}</AppMain>;
}
```

- [ ] **Step 4: Run** the spec and `npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit.** `git commit -am "Show each class's waiting sign-off requests on the teacher's class list"`

---

## Task 21: The journey

**Files:**
- Create: `frontend/e2e/ready-for-signoff.e2e.ts`

Same shape as `phase4.e2e.ts`: serial, a `tag` per project, `join`, and `expectAccessible` on each new page.

- [ ] **Step 1: Write the journey:**

```ts
import { expect, test } from "@playwright/test";

import { TEACHER, expectAccessible, phone, signInTeacher } from "./helpers";

/**
 * Ready-for-signoff: the class requires a link; the student adds one, marks Stage 1 ready with a note; the teacher sees
 * the badge and the queue, says Not yet with a note; the student reads it and asks again; the teacher accepts; the
 * student sees it signed off.
 */
const R = { className: "", classPath: "", aoife: "", password: "e2e-student-password" };
const INITIAL = "Initial ideas discussed with the teacher";

test.describe.configure({ mode: "serial" });

async function signInStudent(browser: import("@playwright/test").Browser) {
  const s = await phone(browser);
  await s.goto("/login");
  await s.getByRole("textbox", { name: "Username" }).fill(R.aoife);
  await s.getByLabel("Password").fill(R.password);
  await s.getByRole("button", { name: "Sign in" }).click();
  await s.getByRole("link", { name: /Biology/ }).click();
  return s;
}

async function openStage1(s: import("@playwright/test").Page) {
  const stage1 = s.getByTestId("stage-list").getByRole("button", { name: /Initial Response/ });
  if ((await stage1.getAttribute("aria-expanded")) !== "true") await stage1.click();
}

test("a class that requires a link, with one approved student", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set; run through scripts/e2e.sh");
  const tag = `${test.info().project.name}.${Date.now().toString(36)}`;
  R.className = `6R Biology ${tag}`;
  R.aoife = `e2e.r.aoife.${tag}`;
  await signInTeacher(teacher);
  await teacher.getByRole("link", { name: "Create class" }).click();
  await teacher.getByRole("textbox", { name: "Class name" }).fill(R.className);
  await teacher.getByRole("button", { name: "Create" }).click();
  await teacher.getByRole("link", { name: "Component" }).click();
  await teacher.getByRole("button", { name: "Create component" }).click();
  await teacher.getByLabel("Stage 1 date").fill("2026-09-01");
  await Promise.all([
    teacher.waitForResponse((r) => r.url().includes("/stage-dates") && r.request().method() === "PUT"),
    teacher.getByRole("button", { name: "Save dates" }).click(),
  ]);
  await Promise.all([
    teacher.waitForResponse((r) => r.url().includes("/settings") && r.request().method() === "PUT"),
    teacher.getByRole("switch", { name: "Require a link to their work before students ask for sign-off" }).click(),
  ]);
  await expectAccessible(teacher);
  R.classPath = new URL(teacher.url()).pathname.replace(/\/component$/, "");
  await teacher.getByRole("link", { name: "Students" }).click();
  const code = (await teacher.getByRole("region", { name: "Join code" }).locator("strong").textContent())?.trim() ?? "";

  const s = await phone(browser);
  await s.goto(`/join/${code}`);
  await s.getByRole("textbox", { name: "First name" }).fill("Aoife");
  await s.getByRole("textbox", { name: "Surname" }).fill("Byrne");
  await s.getByRole("textbox", { name: "Username" }).fill(R.aoife);
  await s.getByLabel("Password").fill(R.password);
  await s.getByRole("button", { name: "Create account and join" }).click();
  await expect(s).toHaveURL(/\/home$/);
  await s.context().close();
  await teacher.reload();
  await teacher.getByRole("button", { name: "Approve Aoife Byrne" }).click();
  await expect(teacher.getByRole("link", { name: "Aoife Byrne" })).toBeVisible();
});

test("the student needs a link, adds one, and asks with a note", async ({ browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  const s = await signInStudent(browser);
  await openStage1(s);
  await s.getByRole("button", { name: `Ready for sign-off: ${INITIAL}` }).click();
  await expect(s.getByRole("button", { name: "Send" })).toBeDisabled();
  await s.getByRole("textbox", { name: "Link to your work" }).fill("https://docs.google.com/document/d/e2e");
  await s.getByRole("button", { name: "Save link" }).click();
  await expect(s.getByRole("link", { name: "Open your work (opens in a new tab)" })).toHaveAttribute("rel", "noopener noreferrer");
  await openStage1(s);
  await s.getByRole("button", { name: `Ready for sign-off: ${INITIAL}` }).click();
  await s.getByRole("textbox", { name: "Note for your teacher (optional)" }).fill("My ideas are on page 1");
  await s.getByRole("button", { name: "Send" }).click();
  await expect(s.getByText(/^Waiting for your teacher · asked /)).toBeVisible();
  await expectAccessible(s);
  await s.context().close();
});

test("the teacher sees the badge and the queue, and says not yet", async ({ page: teacher }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await signInTeacher(teacher);
  await expect(teacher.getByRole("listitem").filter({ hasText: R.className }).getByText("1 waiting for sign-off")).toBeVisible();
  await teacher.goto(`${R.classPath}/progress`);
  await expect(teacher.getByRole("heading", { name: "1 student waiting for you" })).toBeVisible();
  await expectAccessible(teacher);
  await teacher.getByRole("link", { name: `Review ${INITIAL} for Aoife Byrne` }).first().click();
  await expect(teacher).toHaveURL(/#checkpoint-/);
  await expect(teacher.getByText("My ideas are on page 1")).toBeVisible();
  await expect(teacher.getByRole("link", { name: "Open Aoife Byrne's work (opens in a new tab)" }).first())
    .toHaveAttribute("href", "https://docs.google.com/document/d/e2e");
  await expectAccessible(teacher);
  await teacher.getByRole("textbox", { name: "Note to Aoife Byrne (optional)" }).fill("Say which idea you'll test.");
  await teacher.getByRole("button", { name: `Not yet: ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByText("Earlier requests (1)")).toBeVisible();
});

test("the student reads the note and asks again; the teacher accepts; the student sees it signed off", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  let s = await signInStudent(browser);
  await openStage1(s);
  await expect(s.getByText("Say which idea you'll test.")).toBeVisible();
  await s.getByRole("button", { name: `Ask again: ${INITIAL}` }).click();
  await s.getByRole("button", { name: "Send" }).click();
  await expect(s.getByText(/^Waiting for your teacher/)).toBeVisible();
  await s.context().close();

  await signInTeacher(teacher);
  await teacher.goto(`${R.classPath}/progress`);
  await teacher.getByRole("link", { name: `Review ${INITIAL} for Aoife Byrne` }).first().click();
  await teacher.getByRole("button", { name: `Accept ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Aoife Byrne` })).toBeVisible();

  s = await signInStudent(browser);
  await openStage1(s);
  await expect(s.getByText(/^Your teacher signed this off on /)).toBeVisible();
  await expect(s.getByText("Earlier requests (2)")).toBeVisible();
  await s.context().close();
});
```

- [ ] **Step 2: Run** `make e2e` (needs Docker). Fix any locator that finds two elements because both grid layouts are in the DOM: use `.filter({ visible: true })`, as `phase4.e2e.ts` does. Don't loosen what the assertion checks.
- [ ] **Step 3: Commit.** `git add frontend/e2e/ready-for-signoff.e2e.ts && git commit -m "Prove the ready-for-signoff journey end to end on laptop and phone"`

---

## Task 22: Docs, the UI checklist, the gate and hand-over

**Files:**
- Modify: `docs/ARCHITECTURE.md` (§4: three scope bullets; §5: `V13`, the two repositories, the grid's query count; §6: the new components; §10: R-9 and R-10 under "Things that look wrong but aren't")
- Modify: `docs/PILOT-DESIGN.md` §2's "not in the pilot" table: strike the FR-38–40 row with "pulled forward by ready-for-signoff, 17 Oct 2026 (R-4)". Leave the reason as history.
- Modify: `docs/HANDOFF.md`, `docs/BACKLOG.md` (rows 1 and 2 → Done when merged)
- Create: `docs/changes/ready-for-signoff.md` (run the `write-changes` skill after self-review, not here)

- [ ] **Step 1:** Work through `docs/design/UI-CHECKLIST.md` for each new or changed page: focus order, 44px targets, the live regions, `prefers-reduced-motion`, the 390px layout without sideways scroll, and Hide names covering the queue and work links. Fix what fails, each with its own test where one fits.
- [ ] **Step 2:** Run `make verify && make e2e` and paste both outputs into the hand-over.
- [ ] **Step 3:** Update `docs/ARCHITECTURE.md`. Keep each bullet in the file's voice: plain words first, then files and rules.
- [ ] **Step 4:** Update `docs/HANDOFF.md`: where this stopped, R-9 to R-22 for Tim to confirm, and that Task 23 waits for D-10.
- [ ] **Step 5: Commit.** `git commit -am "Record ready-for-signoff in the architecture and hand-over"`

### Gate

- `make verify` and `make e2e` green, with output shown.
- `SignoffRequestScopeTest` green, and each of its checks bitten once by hand (Task 12 Step 2).
- `AppCopySourcesTest` green.
- Then, in a **fresh session**: `/self-review` against `pilotMain`, then `write-changes`, then Tim opens the PR into `pilotMain`.

---

## Task 23: Restyle to D-10 (wait for the pack)

**Don't start until `docs/design/pilot/D-10-ready-for-signoff/` exists.** Write a short plan for it (`docs/superpowers/plans/<date>-ready-for-signoff-restyle-d10.md`), as `2026-09-28-pilot-3b-restyle-d6.md` did for D-6. It should cover:
- tokens from the pack into `globals.css` (replacing Task 16's provisional `--app-ready*`)
- copy changes to `ready.ts`'s visible strings, never its `*Name` functions
- each component's layout to the frames
- the specs and the journey kept passing unchanged, which proves the accessible names held
- `UI-CHECKLIST.md` again

---

## Self-review notes (for the executor)

- **Names that must match across tasks:** `SignoffRequestRepository.{ask,withdraw,answer,open,forStudent,waitingByClass}`, `DocumentLinkRepository.{add,current,currentFor}`, `ComponentRepository.{requiresLink,setRequireLink}`, `ComponentService.view(DocumentLink)` (public static from Task 10), `SignoffRequestService.blankToNull` (package-private static, used by `ProgressService`), `RequestViews.{open,answers}`, `CheckpointState.at(date, today, signedOff, requested)`.
- **Record fields are appended, never inserted,** so existing positional constructor calls fail to compile in exactly the places that need the new argument.
- **Checks this plan leaves to you, because they depend on code it didn't read in full:** `AuditLog.record`'s signature, the `audit_event` column name, whether nulls are serialised (`doesNotExist` vs `nullValue()`), `formatCalendarDate`'s output, `FieldProblem`'s property names, `ClassFixtures`' removed student's class, and where `.app-hide-names` is applied on the Progress page. Each is flagged in its task.
