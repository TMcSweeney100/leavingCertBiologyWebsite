# Timeline redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rebuild the student's `/home` page as a planner: a navy Next up card, three views (Timeline, Week, Month), Add my own item in a drawer opened from the page heading, and a done tick on the student's own items.

**Architecture:** one small backend change, then a frontend rebuild. Thirteen tasks on one branch:
- Task 0: the branch and the planning docs.
- Task 1 (backend): the timeline range cap rises from 100 to 366 days.
- Task 2 (backend): `personal_item.done_at`, `PUT /me/personal-items/{id}/done`, and `done` on the timeline and own-item responses.
- Task 3: the Zod schemas and the pure helpers in `lib/app/timeline.ts`.
- Task 4: shared parts (`Marker`, `DuePill`, `kindWord`) and the done tick.
- Task 5: the add/edit drawer, with Delete inside it.
- Task 6: `ItemCard`, the one card every view lists items with.
- Task 7: the Next up card.
- Task 8: the Timeline view (the rail).
- Task 9: the Week view (the planner).
- Task 10: the Month view (the calendar).
- Task 11: the `TimelineView` shell, the page, and removing the old code.
- Task 12: the journey, the docs, the checklist and the hand test.

**Tech Stack:** Spring Boot with `JdbcClient` and Flyway on Postgres 18; Next.js 15.3.9, React 19, Base UI through shadcn `base-nova` (`Drawer`, `ToggleGroup`, `Button`), Tailwind v4 with `--app-*` tokens, lucide-react. Tests: JUnit with `ApiSession`, `node --test`, Vitest with Testing Library, Playwright.

**Intent:** `docs/intent/timeline-redesign.md` (12 Nov 2026).

**Design:** `docs/design/pilot/timeline-redesign/`. Read `NOTES.md` first, then open `design/timeline.html`, `week.html`, `month.html` and `add-item.html` in a browser at 1440, 820 and 390 wide. Each has PNGs beside it. Where this plan and a mockup disagree, this plan wins; "Where the build differs from the mockup" at the end says where and why.

**Branch:** `pilot/timeline-redesign` from `pilotMain`, one PR at the end. Diff base `pilotMain`.

## Global Constraints

- Test first: watch each test fail, then make it pass (root `CLAUDE.md`). `make verify` green before every commit; `make e2e` green at the end (Task 12).
- A student's own items are private. `personal_item` is read only through `PersonalItemRepository` and `TimelineRepository`'s own union, always with the owner in the `WHERE`. No lookup by id alone; no other feature joins the table.
- Anything outside the actor's scope is a 404, never a 403.
- Never edit an applied migration. The new column is a new file, `V15__personal_item_done.sql`.
- A backend record change means a Zod schema change in the same PR (`lib/api/schemas.ts` mirrors the records field for field).
- The view and the date stay in the URL. No view state in `useState`.
- No raw colour in a component: every colour is an `--app-*` token, with a Tailwind opacity modifier where a lighter one is needed (`bg-app-today/10`). This plan adds no colour token.
- Never put a custom `--text-app-*` size and a `text-app-*` colour through one `cn()` call; build those strings with template literals (UI-STANDARDS §2).
- Kind is never colour alone: every item has its shape marker and its kind in words.
- Nothing dimmed with `opacity`: axe measures the faded colour and fails it. A past item uses `text-app-grey`.
- Every control at least 44 × 44px on touch, 8px between neighbours.
- A link is never wrapped round a button or a checkbox. An item's card is a `<div>`; its title, tick and Edit sit side by side inside it.
- Specs query by role and accessible name. Lean tests: a few cases proving the changed behaviour.
- Keep `docs/ARCHITECTURE.md` true in the same commit as any change it describes.
- Never `git add` `draft-list.md`.

---

## Decisions made

From the review and the mockups (`docs/intent/timeline-redesign.md`). Tim's:

| # | Question | Answer |
|---|---|---|
| T-1 | How many views? | Three: Timeline, Week, Month. Week is a planner. |
| T-2 | Which devices? | Laptop, iPad and phone. |
| T-3 | Month view? | A real calendar: a coloured chip per item, each a link, today highlighted. |
| T-4 | Previous and Next? | Chevron icon buttons and a Today button. |
| T-5 | Where is Add my own item? | Top right beside the heading, opening a drawer. |
| T-6 | A done tick on own items? | Yes. |

Made by Claude from the mockups and while writing this plan. **Not yet confirmed by Tim.** Each is one task or one clause, so any can be overruled before the build.

| # | What happens | Why it matters to you |
|---|---|---|
| T-7 | **Only the student's own items can be ticked here.** A teacher's item keeps its tick on the component page. | It matches the approved mockups. The table for it already exists (`item_tick`), so showing those ticks here later is a small follow-up. |
| T-8 | **A ticked item stays in place**, greyed and struck through, with a "Done" pill. **Next up skips ticked items.** | A planner you can check back over. Without the skip, Next up would keep naming a finished thing. |
| T-9 | **Delete moves into the edit drawer**, with the same confirm step. Rows show one Edit button. | Two buttons on every own item crowded the rows. |
| T-10 | **The Timeline view runs from the Monday of this week to 31 August** (or 12 weeks ahead, if that is later). "Show earlier" starts it at 1 September. There is no paging. | Every stage date up to the SEC completion date is on one page. The API's range cap rises from 100 days to 366 for it (Task 1). |
| T-11 | **The page asks the API twice**: once for the view's dates, once for the next 60 days, which feeds Next up. | Next up stays right when you browse to another week or month. Before, it was worked out from whatever range was on screen. |
| T-12 | **The drawer slides in from the right at every width**, full width on a phone. The mockup drew a bottom sheet on the phone. | Every other drawer in the app does this (`components/ui/drawer.tsx`). A bottom sheet on phones only would need the page to know its width in JavaScript. |
| T-13 | **The side card is "Completion dates"** (as today) plus a key to the marks. The mockup's "3 of 6 stages signed off" bar is not built. | `/me/components` doesn't return sign-off counts, and the intent says no new endpoint for a decoration. |
| T-14 | **The Month view lists the picked day under the calendar at every width**, not only on a phone. Clicking a day number picks it (`?day=`); today is picked by default. | That list is where you tick, edit and add on that day. The chips in the cells stay small and are links only. |
| T-15 | **Days outside the month show their number only**, greyed, with no chips. | Faded chips fail the contrast check, and the neighbouring month is one click away. |
| T-16 | **The Week view's summary is one sentence** ("This week: 3 of your own, 1 done · 1 from your teacher"), not three chips. The "Stage 4 is in 21 days" chip is not built. | Next up and "After this week" already say what is coming. |
| T-17 | **On a week card and in the month's picked-day list, an own item's title is its Edit button.** On the Timeline's wider cards there is a separate Edit button. | A 44px Edit button doesn't fit a 120px day column. |
| T-18 | **The first field keeps its label, "Title".** The mockup said "What is it?". | The label is the field's accessible name, which the specs and the e2e journey use. |
| T-19 | **Azure (`--app-pick`) also means "your own item", and gold (`--app-today`) marks today on this page.** `UI-STANDARDS.md` §5 is updated to say so. | They were limited to the date drawer and the year view. No new colour is added. |
| T-20 | **Old `?view=list` links open the Timeline view.** The `calendar` parameter is ignored. | No bookmark breaks. |
| T-21 | **A past item is grey, not faded.** The mockup used 62% opacity. | Opacity fails the automated contrast check. |
| T-22 | **The page column widens to 1096px** for `/home` only. | Seven day columns need the room; at the current 916px each would be about 120px. |

---

## Concepts in play

| Concept | What it is | Why it fits here | Where this repo already uses it |
|---|---|---|---|
| URL as state | The view and date live in `?view=…&from=…`; tabs and arrows are plain links and the server re-renders | Back, reload and shared links work with no client state to keep in step | `app/(app)/home/page.tsx` and `lib/app/timeline.ts` (`rangeFor`) today |
| Optimistic update with rollback | The control changes at once, the request follows, and a failure puts it back and says so | A tick must feel instant | `components/app/item-tick.tsx` |
| A nullable timestamp as a flag | `done_at timestamptz`, null for "not done"; the API exposes only a boolean | Records when, costs one column, and unticking is just setting null | `item_tick.done_at` (`V9__item_ticks.sql`) |
| Idempotent `PUT` of a state | `PUT …/done {"done": true}` sets the state; sending it twice is harmless | A double tap or a retry can't flip it back | `PUT /components/{id}/teacher-items/{itemId}/tick` (`ComponentController`) |
| Owner-scoped repository | Every query takes the owner and puts it in the `WHERE`; a wrong id is simply not found | The privacy rule for own items | `PersonalItemRepository` |
| Drawer (modal dialog) | Base UI's `Drawer` through shadcn: traps focus, closes on Escape, returns focus to its trigger | A short task with a clear close (UI-STANDARDS §9) | `components/app/request-drawer.tsx` |
| Toggle group | A row of buttons where one is pressed (`aria-pressed`), arrow keys moving between them | Kind is one of four; one tap instead of a dropdown | `components/app/teacher-log.tsx` (the filter chips) |
| A visually hidden native checkbox | A real `<input type="checkbox" class="sr-only">` with a drawn circle beside it | Keyboard, screen reader and form behaviour for free, with the mockup's look | New here; `item-tick.tsx` uses a plain native checkbox |
| Pure helpers under `node --test` | Grouping and wording live in `lib/app/*.ts` with no React | Week grouping, Next up, date shortcuts | `lib/app/timeline.ts` and `timeline.test.ts` |
| Responsive by CSS only | One markup, `lg:` and `sm:` classes switch columns to rows | No hydration mismatch, no width in JavaScript | `stage-dates-form.tsx` (the year view opens by width in CSS) |
| A table for a calendar | `<table>` with `<th scope="col">` weekdays and a caption | A screen reader can move by row and column | `timeline-view.tsx`'s month table today |

---

## File structure

Backend (`backend/src/main`):

| File | Change |
|---|---|
| `resources/db/migration/V15__personal_item_done.sql` | Create: `done_at` |
| `java/ie/coursework/timeline/domain/TimelineRange.java` | `MAX_DAYS` 366 |
| `java/ie/coursework/timeline/domain/PersonalItem.java`, `TimelineEntry.java` | add `boolean done` |
| `java/ie/coursework/timeline/application/TimelineViews.java` | `done` on `TimelineItem` and `PersonalItemView` |
| `java/ie/coursework/timeline/application/TimelineService.java` | `setDone`, and pass `done` through |
| `java/ie/coursework/timeline/adapter/persistence/PersonalItemRepository.java` | select `done`, add `setDone` |
| `java/ie/coursework/timeline/adapter/persistence/TimelineRepository.java` | `done` in every union branch |
| `java/ie/coursework/timeline/adapter/web/DoneRequest.java` | Create |
| `java/ie/coursework/timeline/adapter/web/PersonalItemController.java` | `PUT /{itemId}/done` |

Frontend (`frontend/`):

| File | Responsibility |
|---|---|
| `lib/api/schemas.ts` | `done` on `timelineItemSchema` and `personalItemSchema` |
| `lib/app/timeline.ts` (+ `.test.ts`) | Ranges, labels, grouping, Next up, date shortcuts. Pure |
| `components/app/subject.ts` | add `subjectRing` |
| `components/app/timeline-parts.tsx` | Create: `kindWord`, `metaLine`, `Marker`, `DuePill`, `TitleLink`. No hooks, usable from server components |
| `components/app/personal-item-done.tsx` (+ spec) | Create: `DoneTick`, `MarkDoneButton` (client) |
| `components/app/personal-item-form.tsx` (+ spec) | Rewrite: the form's fields, Kind as a toggle group, date shortcuts, Delete |
| `components/app/personal-item-drawer.tsx` (+ spec) | Create: `AddPersonalItem`, `EditPersonalItem` (client) |
| `components/app/personal-item-actions.tsx` (+ spec) | Delete |
| `components/app/timeline-item-card.tsx` | Create: `ItemCard` |
| `components/app/timeline-next-up.tsx` (+ spec) | Create: `NextUp` |
| `components/app/timeline-rail.tsx` (+ spec) | Create: the Timeline view |
| `components/app/timeline-week.tsx` (+ spec) | Create: the Week view |
| `components/app/timeline-month.tsx` (+ spec) | Create: the Month view |
| `components/app/timeline-view.tsx` (+ spec) | Rewrite: tabs, range controls, and which view to draw |
| `components/app/app-main.tsx` | add the `planner` width |
| `app/(app)/home/page.tsx` | two fetches, the heading row, `NextUp` |
| `app/globals.css` | add `--text-app-leaf`; remove the four D-4 tokens nothing uses any more |
| `e2e/phase2.e2e.ts` | the timeline journey |

`timeline-view.tsx` is 235 lines holding three views today. After this plan it is a shell of about 70 lines and each view is its own file.

---

### Task 0: Branch and the planning docs

**Files:**
- Commit: `docs/intent/timeline-redesign.md`, `docs/superpowers/plans/2026-11-12-timeline-redesign.md`, `docs/design/pilot/timeline-redesign/`
- Modify: `docs/BACKLOG.md`

- [ ] **Step 1: Branch from `pilotMain`**

The planning docs were written while `pilot/student-page-redesign` was checked out, and are untracked. Untracked files follow a checkout.

```bash
git fetch origin
git switch -c pilot/timeline-redesign origin/pilotMain
```

If git refuses because of uncommitted changes on the old branch, stop and ask Tim. Do not stash or discard them.

- [ ] **Step 2: Add the backlog row**

In `docs/BACKLOG.md`, in the same table as `_student-page-redesign_`, add a row directly under it:

```markdown
| — | _timeline-redesign_ | Rebuild the student's `/home` as a planner: a navy Next up card, three views (a Timeline rail to the end of the school year, a Week planner with an Add button per day, a Month calendar with chips), Add my own item in a drawer from the heading, and a done tick on the student's own items | planned 12 Nov 2026, not built. Plan: `docs/superpowers/plans/2026-11-12-timeline-redesign.md`; intent: `docs/intent/timeline-redesign.md`; design: `docs/design/pilot/timeline-redesign/` |
```

- [ ] **Step 3: Commit**

```bash
git add docs/intent/timeline-redesign.md docs/superpowers/plans/2026-11-12-timeline-redesign.md docs/design/pilot/timeline-redesign docs/BACKLOG.md
git commit -m "Plan the timeline redesign: intent, plan, mockups and the backlog row"
```

---

### Task 1: The range cap rises to 366 days

**Files:**
- Modify: `backend/src/main/java/ie/coursework/timeline/domain/TimelineRange.java`
- Test: `backend/src/test/java/ie/coursework/timeline/domain/TimelineRangeTest.java`
- Test: `backend/src/test/java/ie/coursework/timeline/adapter/web/TimelineTest.java`

- [ ] **Step 1: Change the tests first**

In `TimelineRangeTest.java`, replace the first and third tests with:

```java
    @Test
    void aSingleDayAndAWholeYearAreFine() {
        assertThat(TimelineRange.problem(FROM, FROM)).isEmpty();
        assertThat(TimelineRange.problem(FROM, FROM.plusDays(365))).isEmpty();
    }

    @Test
    void moreThanAYearIsRefused() {
        assertThat(TimelineRange.problem(FROM, FROM.plusDays(366))).contains("can be at most 366 days");
    }
```

In `TimelineTest.refusesABackwardsOrTooLongRange`, the "too long" request is 303 days, which is now allowed. Change its line to a range over a year:

```java
        student.get("/api/v1/me/timeline?from=2026-09-01&to=2027-09-02")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd backend && ./mvnw -q test -Dtest='TimelineRangeTest,TimelineTest'`
Expected: `aSingleDayAndAWholeYearAreFine` and `moreThanAYearIsRefused` FAIL (the cap is still 100).

- [ ] **Step 3: Raise the cap**

In `TimelineRange.java`, replace the class comment and the constant:

```java
/** The Timeline view runs from this week to the end of the school year (plan timeline-redesign T-10); a year caps the union query. */
public final class TimelineRange {

    public static final int MAX_DAYS = 366;
```

- [ ] **Step 4: Run them and watch them pass**

Run: `cd backend && ./mvnw -q test -Dtest='TimelineRangeTest,TimelineTest'`
Expected: PASS.

- [ ] **Step 5: Keep the architecture doc true, then commit**

In `docs/ARCHITECTURE.md`, in the `timeline` feature bullet, change "caps any range at 100 days" to "caps any range at 366 days".

```bash
make verify
git add backend docs/ARCHITECTURE.md
git commit -m "Let a timeline range run a whole year, for the Timeline view"
```

---

### Task 2: The done flag on a student's own item

**Files:**
- Create: `backend/src/main/resources/db/migration/V15__personal_item_done.sql`
- Create: `backend/src/main/java/ie/coursework/timeline/adapter/web/DoneRequest.java`
- Modify: `PersonalItem.java`, `TimelineEntry.java`, `TimelineViews.java`, `TimelineService.java`, `PersonalItemRepository.java`, `TimelineRepository.java`, `PersonalItemController.java` (paths in "File structure")
- Test: `backend/src/test/java/ie/coursework/timeline/adapter/web/PersonalItemsTest.java`
- Test: `backend/src/test/java/ie/coursework/timeline/adapter/web/TimelineTest.java`
- Test: `backend/src/test/java/ie/coursework/timeline/authz/PersonalItemPrivacyTest.java`

- [ ] **Step 1: Write the failing tests**

Add to `PersonalItemsTest.java`:

```java
    @Test
    void ticksAnItemDoneAndBackAgain() throws Exception {
        String body = student.post("/api/v1/me/personal-items", item("French vocab test", "2026-11-13", "TEST", null))
                .andExpect(jsonPath("$.done").value(false))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");

        student.put("/api/v1/me/personal-items/" + id + "/done", "{\"done\":true}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.done").value(true));
        student.put("/api/v1/me/personal-items/" + id + "/done", "{\"done\":true}")
                .andExpect(jsonPath("$.done").value(true));
        student.get("/api/v1/me/timeline?from=2026-11-01&to=2026-11-30")
                .andExpect(jsonPath("$.items[0].done").value(true));

        student.put("/api/v1/me/personal-items/" + id + "/done", "{\"done\":false}")
                .andExpect(jsonPath("$.done").value(false));
        student.put("/api/v1/me/personal-items/" + id + "/done", "{}")
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        student.put("/api/v1/me/personal-items/" + UUID.randomUUID() + "/done", "{\"done\":true}")
                .andExpect(status().isNotFound());
    }
```

In `TimelineTest.returnsTheRangeAndItsItemsInOrderWithLabels`, add two assertions to the chain (coursework rows are never done):

```java
                .andExpect(jsonPath("$.items[0].done").value(false))
                .andExpect(jsonPath("$.items[2].done").value(false))
```

In `PersonalItemPrivacyTest.nothingReachable`, add a line before the `delete`:

```java
        session.put(itemPath + "/done", "{\"done\":true}").andExpect(status().isNotFound());
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd backend && ./mvnw -q test -Dtest='PersonalItemsTest,TimelineTest,PersonalItemPrivacyTest'`
Expected: FAIL. `$.done` has no value, and the `PUT` is a 404 for everyone (no such route), so the privacy test passes by accident until the route exists. That is why it is checked again in Step 5.

- [ ] **Step 3: The migration**

Create `V15__personal_item_done.sql`:

```sql
-- The student's own tick on their own item (plan timeline-redesign T-6). Null means not done.
-- Unticking sets it back to null. Still private to the owner, like the rest of the row.
ALTER TABLE personal_item ADD COLUMN done_at timestamptz;
```

- [ ] **Step 4: The records, the repositories, the service and the endpoint**

`PersonalItem.java`:

```java
public record PersonalItem(UUID id, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId, String subjectName, boolean done) {}
```

`TimelineEntry.java` (add `done` last):

```java
/** One row of the timeline. Coursework rows carry the component; personal rows carry the item and whether its owner ticked it. */
public record TimelineEntry(String kind, LocalDate date, String title, String stageLabel, String subjectCode,
        String subjectName, UUID classId, String className, UUID componentId, UUID personalItemId, String personalKind,
        boolean done) {}
```

`TimelineViews.java`, both records:

```java
    public record TimelineItem(String kind, LocalDate date, String title, String stageLabel, String subjectCode,
            String subjectName, UUID classId, String className, UUID componentId, UUID personalItemId, String personalKind,
            boolean done) {}

    public record PersonalItemView(UUID id, String title, LocalDate dueDate, PersonalItemKind kind, UUID classId, String subjectName,
            boolean done) {}
```

`PersonalItemRepository.java`. The driver won't map `timestamptz` to `Instant`, so select a boolean (backend conventions):

```java
    private static final String SELECT = """
            SELECT p.id, p.title, p.due_date, p.kind, p.class_group_id, s.name AS subject_name,
                   p.done_at IS NOT NULL AS done
            FROM personal_item p
            LEFT JOIN class_group g ON g.id = p.class_group_id
            LEFT JOIN subject s ON s.id = g.subject_id
            WHERE p.student_user_id = :owner
            """;
```

Add the method, and `rs.getBoolean("done")` as the last argument in `map`:

```java
    /** False when no item with that id belongs to {@code owner}. Ticking an already ticked item keeps its first time. */
    public boolean setDone(UUID id, UUID owner, boolean done, Instant now) {
        return jdbc.sql("""
                UPDATE personal_item
                SET done_at = CASE WHEN :done THEN COALESCE(done_at, :now) ELSE NULL END, updated_at = :now
                WHERE id = :id AND student_user_id = :owner
                """).param("done", done).param("now", Timestamps.utc(now)).param("id", id).param("owner", owner)
                .update() == 1;
    }
```

`TimelineRepository.java`. Add `done` to the outer select list after `personal_kind`, and to each branch between the personal kind and `kind_order`:

```java
            SELECT kind, due_date, stage_label, title, subject_code, subject_name, class_id, class_name,
                   component_id, personal_item_id, personal_kind, done
```

- COMPLETION branch: `NULL::uuid AS personal_item_id, NULL::text AS personal_kind, false AS done,` then `1 AS kind_order, 0 AS within`
- STAGE branch: `NULL::uuid, NULL::text, false, 2, st.ordinal`
- TEACHER_ITEM branch: `NULL::uuid, NULL::text, false, 3, st.ordinal * 1000 + t.ordinal`
- PERSONAL branch: `p.id, p.kind, p.done_at IS NOT NULL, 4, 0`

And `rs.getBoolean("done")` as the last argument of `new TimelineEntry(...)`.

`TimelineService.java`: pass `e.done()` as the last argument of `new TimelineItem(...)`, `item.done()` as the last argument in `view`, and add:

```java
    @Transactional
    public PersonalItemView setDone(Actor actor, UUID itemId, boolean done) {
        if (!personal.setDone(itemId, actor.userId(), done, clock.instant())) {
            throw notFound();
        }
        return view(personal.find(itemId, actor.userId()).orElseThrow());
    }
```

Create `DoneRequest.java`:

```java
package ie.coursework.timeline.adapter.web;

import jakarta.validation.constraints.NotNull;

/** The same shape as the teacher-item tick's request. */
public record DoneRequest(@NotNull Boolean done) {}
```

`PersonalItemController.java` (import `PutMapping`):

```java
    @PutMapping("/{itemId}/done")
    PersonalItemView done(Actor actor, @PathVariable UUID itemId, @Valid @RequestBody DoneRequest body) {
        return timeline.setDone(actor, itemId, body.done());
    }
```

Fix any other caller the compiler names (`PersonalItemRepositoryTest`, `TimelineRepositoryTest` if they build these records).

- [ ] **Step 5: Run the tests and watch them pass**

Run: `cd backend && ./mvnw -q test -Dtest='PersonalItemsTest,TimelineTest,PersonalItemPrivacyTest,PersonalItemRepositoryTest,TimelineRepositoryTest'`
Expected: PASS. The privacy test now proves the new route is a 404 for a teacher, a leader and another student because of the owner filter, not because the route is missing.

- [ ] **Step 6: Docs and commit**

In `docs/ARCHITECTURE.md`, add to the `timeline` feature bullet: "`V15__personal_item_done.sql` adds `done_at`; `PUT /me/personal-items/{id}/done` sets or clears it through `PersonalItemRepository.setDone` (owner in the `WHERE`), and both the timeline and own-item responses carry it as a boolean `done` (always false for coursework rows)." If `docs/PILOT-ROADMAP.md` §7's API catalogue lists `/me/personal-items`, add the `PUT` beside it.

```bash
make verify
git add backend docs
git commit -m "Let a student tick their own item done: done_at, PUT /me/personal-items/{id}/done"
```

---

### Task 3: Schemas and the timeline helpers

**Files:**
- Modify: `frontend/lib/api/schemas.ts`
- Modify: `frontend/lib/app/timeline.ts`
- Test: `frontend/lib/app/timeline.test.ts`

- [ ] **Step 1: Write the failing tests**

In `timeline.test.ts`, change the import to:

```ts
import { dateShortcuts, groupTimeline, monthWeeks, nextUp, rangeFor, rangeLabel, relativeDay, schoolYear, stageNumber, stepFrom, toIsoDate, weekday, weekDays, weekSummary } from './timeline.ts';
```

Replace the whole `describe('rangeFor', …)` and `describe('stepFrom', …)` blocks with:

```ts
describe('rangeFor', () => {
  test('defaults to the timeline: this week\'s Monday to the end of the school year', () => {
    assert.deepEqual(rangeFor({}, TODAY), { view: 'timeline', from: '2026-10-12', to: '2027-08-31' });
  });

  test('a timeline with a from starts exactly there (Show earlier)', () => {
    assert.deepEqual(rangeFor({ view: 'timeline', from: '2026-09-01' }, TODAY), { view: 'timeline', from: '2026-09-01', to: '2027-08-31' });
  });

  test('late in the summer the timeline still reaches 12 weeks ahead', () => {
    assert.equal(rangeFor({}, '2027-08-10').to, '2027-11-02');
  });

  test('a week runs Monday to Sunday around from, and a month is the calendar month', () => {
    assert.deepEqual(rangeFor({ view: 'week', from: '2026-10-14' }, TODAY), { view: 'week', from: '2026-10-12', to: '2026-10-18' });
    assert.deepEqual(rangeFor({ view: 'month', from: '2026-02-17' }, TODAY), { view: 'month', from: '2026-02-01', to: '2026-02-28' });
  });

  test('an old list link, or anything malformed, is the timeline', () => {
    assert.equal(rangeFor({ view: 'list' }, TODAY).view, 'timeline');
    assert.deepEqual(rangeFor({ view: 'year', from: '2026-02-30' }, TODAY), { view: 'timeline', from: '2026-10-12', to: '2027-08-31' });
  });
});

describe('stepFrom', () => {
  test('moves a week or a month', () => {
    assert.equal(stepFrom({ view: 'week', from: '2026-10-12', to: '2026-10-18' }, -1), '2026-10-05');
    assert.equal(stepFrom({ view: 'month', from: '2026-12-01', to: '2026-12-31' }, 1), '2027-01-01');
    assert.equal(stepFrom({ view: 'month', from: '2027-01-01', to: '2027-01-31' }, -1), '2026-12-01');
  });
});

describe('the planner helpers', () => {
  const item = (date: string, over = {}) => ({ date, kind: 'PERSONAL', done: false, ...over });

  test('the school year runs September to August', () => {
    assert.deepEqual(schoolYear('2026-10-14'), { start: '2026-09-01', end: '2027-08-31' });
    assert.deepEqual(schoolYear('2027-03-02'), { start: '2026-09-01', end: '2027-08-31' });
  });

  test('groups into this week, next week, then months with their year', () => {
    const groups = groupTimeline([item('2026-10-12'), item('2026-10-16'), item('2026-10-20'), item('2026-10-29'), item('2027-01-04')], TODAY);
    assert.deepEqual(groups.map((g) => [g.label, g.sub, g.items.length]), [
      ['This week', '12–18 Oct', 2],
      ['Next week', '19–25 Oct', 1],
      ['October 2026', null, 1],
      ['January 2027', null, 1],
    ]);
  });

  test('next up is the first thing from today that is not done, then the three after it', () => {
    const items = [item('2026-10-13'), item('2026-10-14', { done: true }), item('2026-10-15'), item('2026-10-16'), item('2026-10-17'), item('2026-10-18'), item('2026-10-19')];
    const { next, then } = nextUp(items, TODAY);
    assert.equal(next?.date, '2026-10-15');
    assert.deepEqual(then.map((i) => i.date), ['2026-10-16', '2026-10-17', '2026-10-18']);
    assert.equal(nextUp([], TODAY).next, undefined);
  });

  test('a week\'s seven days, and its summary sentence', () => {
    assert.deepEqual(weekDays('2026-10-12'), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
    const week = [item('2026-10-12', { done: true }), item('2026-10-13'), item('2026-10-14', { kind: 'TEACHER_ITEM' }), item('2026-10-15', { kind: 'STAGE' })];
    assert.equal(weekSummary(week), 'This week: 2 of your own, 1 done · 1 from your teacher · 1 coursework date');
    assert.equal(weekSummary([]), 'Nothing this week yet.');
  });

  test('date shortcuts: today, tomorrow, next Monday', () => {
    assert.deepEqual(dateShortcuts(TODAY), [
      { label: 'Today', date: '2026-10-14' },
      { label: 'Tomorrow', date: '2026-10-15' },
      { label: 'Next Monday', date: '2026-10-19' },
    ]);
  });

  test('a stage label gives its number', () => {
    assert.equal(stageNumber('Stage 4'), '4');
    assert.equal(stageNumber(null), null);
  });
});
```

Leave the `relativeDay` and `labels and grids` blocks as they are, except that any range written there with `view: 'list'` becomes `view: 'week'` (the `list` view no longer exists in the type).

- [ ] **Step 2: Run them and watch them fail**

Run: `cd frontend && node --test lib/app/timeline.test.ts`
Expected: FAIL, "does not provide an export named 'dateShortcuts'".

- [ ] **Step 3: The schemas**

In `lib/api/schemas.ts`, add `done: z.boolean(),` as the last field of both `timelineItemSchema` and `personalItemSchema`.

- [ ] **Step 4: The helpers**

In `lib/app/timeline.ts`:

Replace the header comment's first line and the `View` type, and delete `LIST_DAYS`:

```ts
/**
 * Timeline ranges, labels and grouping (plan 2F P2-47, P2-48; plan timeline-redesign). Calendar dates are
 * "YYYY-MM-DD" strings, and all arithmetic is on UTC midnights, so no timezone or DST change can move a
 * date (as in lib/schedule.ts).
 */
export type View = 'timeline' | 'week' | 'month';
export type Range = { view: View; from: string; to: string };

const MS_PER_DAY = 86_400_000;
const AHEAD_DAYS = 84;
```

Export `addDays` and `monday` (add `export` to each), then add `schoolYear` and replace `rangeFor` and `stepFrom`:

```ts
/** The school year a date falls in: 1 September to 31 August. */
export function schoolYear(iso: string): { start: string; end: string } {
  const year = Number(iso.slice(0, 4)) - (Number(iso.slice(5, 7)) >= 9 ? 0 : 1);
  return { start: `${year}-09-01`, end: `${year + 1}-08-31` };
}

export function rangeFor(params: { view?: string | string[]; from?: string | string[] }, today: string): Range {
  const requested = first(params.view);
  const view: View = requested === 'week' || requested === 'month' ? requested : 'timeline';
  const fromParam = first(params.from);
  const anchor = isIsoDate(fromParam) ? fromParam : today;
  if (view === 'week') {
    const from = monday(anchor);
    return { view, from, to: addDays(from, 6) };
  }
  if (view === 'month') {
    const from = monthStart(anchor);
    return { view, from, to: addDays(nextMonthStart(from), -1) };
  }
  // T-10: from this week's Monday (so the week's past days show), or exactly from a given date ("Show earlier"),
  // to the end of that school year, and never less than 12 weeks ahead.
  const yearEnd = schoolYear(anchor).end;
  const ahead = addDays(anchor, AHEAD_DAYS);
  return { view, from: isIsoDate(fromParam) ? anchor : monday(anchor), to: ahead > yearEnd ? ahead : yearEnd };
}

/** The `from` of the previous (-1) or next (1) week or month. The timeline doesn't page. */
export function stepFrom(range: Range, direction: 1 | -1): string {
  if (range.view === 'week') return addDays(range.from, 7 * direction);
  if (range.view === 'month') return direction === 1 ? nextMonthStart(range.from) : monthStart(addDays(range.from, -1));
  return range.from;
}
```

Replace `rangeLabel` with a year-less `spanLabel` and a `rangeLabel` built on it:

```ts
/** "12–18 Oct", or "28 Dec – 3 Jan" across two months. */
export function spanLabel(from: string, to: string): string {
  const [fromDay, fromMonth] = DAY_MONTH.format(epoch(from)).split(' ');
  const end = DAY_MONTH.format(epoch(to));
  return fromMonth === end.split(' ')[1] ? `${fromDay}–${end}` : `${fromDay} ${fromMonth} – ${end}`;
}

export function rangeLabel(range: Range): string {
  if (range.view === 'month') return MONTH_YEAR.format(epoch(range.from));
  return `${spanLabel(range.from, range.to)} ${range.to.slice(0, 4)}`;
}
```

Add at the end of the file:

```ts
export type Group<T> = { label: string; sub: string | null; items: T[] };

/** The timeline's headings: "This week" and "Next week" by their dates, everything else by month and year. */
export function groupTimeline<T extends { date: string }>(items: ReadonlyArray<T>, today: string): Group<T>[] {
  const thisWeek = monday(today);
  const nextWeek = addDays(thisWeek, 7);
  const after = addDays(thisWeek, 14);
  const groups: Group<T>[] = [];
  for (const item of items) {
    const heading =
      item.date >= thisWeek && item.date < nextWeek ? { label: 'This week', sub: spanLabel(thisWeek, addDays(thisWeek, 6)) }
      : item.date >= nextWeek && item.date < after ? { label: 'Next week', sub: spanLabel(nextWeek, addDays(nextWeek, 6)) }
      : { label: monthYearLabel(item.date), sub: null };
    const last = groups.at(-1);
    if (last?.label === heading.label) last.items.push(item);
    else groups.push({ ...heading, items: [item] });
  }
  return groups;
}

/** T-8: the first thing from today on that isn't ticked done, and the three after it. */
export function nextUp<T extends { date: string; done: boolean }>(items: ReadonlyArray<T>, today: string): { next: T | undefined; then: T[] } {
  const upcoming = items.filter((i) => i.date >= today && !i.done);
  return { next: upcoming[0], then: upcoming.slice(1, 4) };
}

export function weekDays(from: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(from, i));
}

/** T-16: one sentence over the week. */
export function weekSummary(items: ReadonlyArray<{ kind: string; done: boolean }>): string {
  const own = items.filter((i) => i.kind === 'PERSONAL');
  const teacher = items.filter((i) => i.kind === 'TEACHER_ITEM').length;
  const coursework = items.length - own.length - teacher;
  const parts = [
    own.length > 0 && `${own.length} of your own, ${own.filter((i) => i.done).length} done`,
    teacher > 0 && `${teacher} from your teacher`,
    coursework > 0 && `${coursework} coursework ${coursework === 1 ? 'date' : 'dates'}`,
  ].filter(Boolean);
  return parts.length === 0 ? 'Nothing this week yet.' : `This week: ${parts.join(' · ')}`;
}

export function dateShortcuts(today: string): Array<{ label: string; date: string }> {
  return [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'Next Monday', date: addDays(monday(today), 7) },
  ];
}

/** "Stage 4" gives "4", for the rail's numbered square. */
export function stageNumber(label: string | null): string | null {
  return label?.match(/\d+/)?.[0] ?? null;
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `cd frontend && node --test lib/app/timeline.test.ts`
Expected: PASS. (`rangeLabel`'s existing test still passes: its output is unchanged.)

- [ ] **Step 6: Commit**

`npx tsc --noEmit` will now fail in `timeline-view.tsx`, its spec and `home/page.tsx` (the `list` view and the missing `done` are gone from the types). That is expected until Task 11, so this task and Tasks 4 to 10 commit without `make verify`; run only the commands each step names. Task 11 brings `make verify` back to green.

```bash
git add frontend/lib
git commit -m "Timeline helpers: the timeline range, grouping by week and month, Next up, date shortcuts"
```

---

### Task 4: Shared parts and the done tick

**Files:**
- Modify: `frontend/components/app/subject.ts`
- Create: `frontend/components/app/timeline-parts.tsx`
- Create: `frontend/components/app/personal-item-done.tsx`
- Test: `frontend/components/app/personal-item-done.spec.tsx`

- [ ] **Step 1: Write the failing spec**

Create `personal-item-done.spec.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { DoneTick, MarkDoneButton } from "./personal-item-done";

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("DoneTick", () => {
  it("is a checkbox named for its item, and saves the tick", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<DoneTick id="p1" title="French vocab test" done={false} />);
    const box = screen.getByRole("checkbox", { name: "Done: French vocab test" });
    expect(box).not.toBeChecked();

    await userEvent.click(box);

    expect(box).toBeChecked();
    expect(api.send).toHaveBeenCalledWith("PUT", "/me/personal-items/p1/done", { done: true }, expect.anything());
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("puts the tick back and says so when saving fails", async () => {
    vi.mocked(api.send).mockRejectedValue(new Error("offline"));
    render(<DoneTick id="p1" title="French vocab test" done={false} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Done: French vocab test" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't save. Try again.");
    expect(screen.getByRole("checkbox", { name: "Done: French vocab test" })).not.toBeChecked();
  });
});

describe("MarkDoneButton", () => {
  it("ticks the item from the Next up card", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<MarkDoneButton id="p1" title="Maths Assignment" />);
    await userEvent.click(screen.getByRole("button", { name: "Mark Maths Assignment done" }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/me/personal-items/p1/done", { done: true }, expect.anything());
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run components/app/personal-item-done.spec.tsx`
Expected: FAIL, cannot resolve `./personal-item-done`.

- [ ] **Step 3: `subjectRing`**

Add to the end of `components/app/subject.ts`:

```ts
/** Same identity as a ring: the timeline's hollow "from your teacher" marker (plan timeline-redesign). */
const RING: Record<string, string> = {
  BIOLOGY: "border-app-subject-biology",
  BUSINESS: "border-app-subject-business",
  CHEMISTRY: "border-app-subject-chemistry",
  PHYSICS: "border-app-subject-physics",
};

export function subjectRing(subject: string | null): string {
  return (subject && RING[subject.toUpperCase()]) || "border-app-grey";
}
```

- [ ] **Step 4: The shared parts**

Create `timeline-parts.tsx`. No `"use client"` and no hooks: the views are server components.

```tsx
import Link from "next/link";

import type { TimelineItem } from "@/lib/api/schemas";
import { KIND_LABEL } from "@/lib/app/personal-kind";
import { relativeDay } from "@/lib/app/timeline";

import { subjectRing } from "./subject";
import { textLink } from "./styles";

export const isOwn = (item: TimelineItem) => item.kind === "PERSONAL";
export const isCoursework = (item: TimelineItem) => item.kind === "STAGE" || item.kind === "COMPLETION";

/** Plan 2F P2-49: the kind is always a word. */
export function kindWord(item: TimelineItem) {
  if (item.kind === "COMPLETION") return "SEC completion date";
  if (item.kind === "STAGE") return "Stage date";
  if (item.kind === "TEACHER_ITEM") return "From your teacher";
  return item.personalKind ? KIND_LABEL[item.personalKind] : "Own item";
}

export function metaLine(item: TimelineItem) {
  const subject = item.subjectName ? ` · ${item.subjectName}` : "";
  return `${kindWord(item)}${subject}${isOwn(item) ? " · only you" : ""}`;
}

/** A stable key: the API gives timeline rows no id of their own. */
export const itemKey = (item: TimelineItem) => `${item.kind}-${item.personalItemId ?? item.componentId}-${item.date}-${item.title}`;

/**
 * Kinds are shapes first (pack D-4), colours second (plan timeline-redesign T-19): a navy square for the
 * component's own dates, a ring in the subject's colour for a teacher's item, an azure diamond for the student's own.
 */
export function Marker({ item, small, onAccent }: { item: TimelineItem; small?: boolean; onAccent?: boolean }) {
  const size = small ? "size-[7px]" : "size-[11px]";
  if (isCoursework(item)) return <span aria-hidden="true" className={`${size} flex-none rounded-[2px] ${onAccent ? "bg-app-on-accent" : "bg-app-accent"}`} />;
  if (item.kind === "TEACHER_ITEM") return <span aria-hidden="true" className={`${size} flex-none rounded-full border-2 ${subjectRing(item.subjectName)}`} />;
  return <span aria-hidden="true" className={`${size} flex-none rotate-45 border-2 border-app-pick`} />;
}

const PILL = "inline-flex h-[26px] flex-none items-center rounded-full px-2.5 text-app-help font-semibold whitespace-nowrap";

/** "Today" in gold, the next seven days in amber, later in grey, the past as plain grey text, a ticked item "Done". */
export function DuePill({ today, item }: { today: string; item: TimelineItem }) {
  if (item.done) return <span className={`${PILL} bg-app-approved-tint text-app-approved`}>Done</span>;
  const words = relativeDay(today, item.date);
  const text = words.charAt(0).toUpperCase() + words.slice(1);
  const days = Math.round((Date.parse(item.date) - Date.parse(today)) / 86_400_000);
  if (days === 0) return <span className={`${PILL} bg-app-today text-app-ink`}>{text}</span>;
  if (days < 0) return <span className="flex-none text-app-help text-app-grey">{text}</span>;
  return <span className={`${PILL} ${days <= 7 ? "bg-app-attention-tint text-app-attention" : "bg-app-inset text-app-grey"}`}>{text}</span>;
}

/** A coursework or teacher item links to its component; an own item has nowhere to go. */
export function TitleLink({ item, className = textLink }: { item: TimelineItem; className?: string }) {
  return item.componentId ? <Link href={`/components/${item.componentId}`} className={className}>{item.title}</Link> : <span>{item.title}</span>;
}
```

- [ ] **Step 5: The tick**

Create `personal-item-done.tsx`:

```tsx
"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { personalItemSchema } from "@/lib/api/schemas";

/** The tick moves at once; a failure puts it back (as `item-tick.tsx` does for a teacher's item). */
function useDone(id: string, initial: boolean) {
  const router = useRouter();
  const [done, setDone] = useState(initial);
  const [failed, setFailed] = useState(false);

  async function set(next: boolean) {
    setDone(next);
    setFailed(false);
    try {
      await api.send("PUT", `/me/personal-items/${id}/done`, { done: next }, personalItemSchema);
      router.refresh();
    } catch {
      setDone(!next);
      setFailed(true);
    }
  }
  return { done, failed, set };
}

const FAILED = "basis-full text-app-help font-semibold text-app-error";

/**
 * Plan timeline-redesign T-6: the student's own tick on their own item. A real checkbox, hidden but focusable,
 * with the drawn circle beside it; the label is the 44px hit area.
 */
export function DoneTick({ id, title, done: initial }: { id: string; title: string; done: boolean }) {
  const { done, failed, set } = useDone(id, initial);
  return (
    <>
      <label className="relative -m-2.5 flex size-11 flex-none cursor-pointer items-center justify-center touch-manipulation">
        <input type="checkbox" className="peer sr-only" checked={done} onChange={(e) => set(e.target.checked)} aria-label={`Done: ${title}`} />
        <span
          aria-hidden="true"
          className={`flex size-6 items-center justify-center rounded-full border-2 text-app-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-app-accent ${done ? "border-app-approved bg-app-approved" : "border-app-pick bg-app-surface"}`}
        >
          {done && <Check className="size-3.5" strokeWidth={3} />}
        </span>
      </label>
      {failed && <p role="alert" className={FAILED}>{"That didn't save. Try again."}</p>}
    </>
  );
}

/** The same tick as a button, for the Next up card: once ticked, the page refreshes and Next up moves on (T-8). */
export function MarkDoneButton({ id, title }: { id: string; title: string }) {
  const { done, failed, set } = useDone(id, false);
  return (
    <>
      <Button type="button" variant="onAccent" aria-label={`Mark ${title} done`} disabled={done} onClick={() => set(true)}>
        <Check aria-hidden="true" className="size-4" />
        {done ? "Done" : "Mark done"}
      </Button>
      {failed && <p role="alert" className="basis-full text-app-help font-semibold text-app-on-accent">{"That didn't save. Try again."}</p>}
    </>
  );
}
```

- [ ] **Step 6: Run the spec and watch it pass**

Run: `cd frontend && npx vitest run components/app/personal-item-done.spec.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add frontend/components/app/subject.ts frontend/components/app/timeline-parts.tsx frontend/components/app/personal-item-done.tsx frontend/components/app/personal-item-done.spec.tsx
git commit -m "Add the timeline's shared marks and pills, and the done tick on own items"
```

---

### Task 5: The add and edit drawer

**Files:**
- Rewrite: `frontend/components/app/personal-item-form.tsx`
- Create: `frontend/components/app/personal-item-drawer.tsx`
- Rewrite: `frontend/components/app/personal-item-form.spec.tsx` as `personal-item-drawer.spec.tsx`
- Delete: `frontend/components/app/personal-item-actions.tsx`, `personal-item-actions.spec.tsx`, `personal-item-form.spec.tsx`

- [ ] **Step 1: Write the failing spec**

```bash
cd frontend && git rm components/app/personal-item-form.spec.tsx components/app/personal-item-actions.spec.tsx
```

Create `personal-item-drawer.spec.tsx`:

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

import { AddPersonalItem, EditPersonalItem } from "./personal-item-drawer";

const classes = [{ classId: "c1", className: "6A Biology", subjectName: "Biology" }];
const TODAY = "2026-11-12"; // a Thursday

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("AddPersonalItem", () => {
  it("opens a drawer that says only the student can see it, and adds the item with two taps for kind and date", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<AddPersonalItem classes={classes} today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: "Add my own item" }));

    const dialog = await screen.findByRole("dialog", { name: "Add my own item" });
    expect(within(dialog).getByText("Only you can see this. Your teachers can't.")).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Title" }), "French vocab test");
    await userEvent.click(within(dialog).getByRole("button", { name: "Test" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Tomorrow" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/me/personal-items",
      { title: "French vocab test", dueDate: "2026-11-13", kind: "TEST", classId: null }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("from a day's Add button, starts on that day", async () => {
    render(<AddPersonalItem classes={classes} today={TODAY} date="2026-11-14" compact />);
    await userEvent.click(screen.getByRole("button", { name: "Add my own item on Sat 14 Nov" }));
    const dialog = await screen.findByRole("dialog", { name: "Add my own item" });
    expect(within(dialog).getByLabelText("Date")).toHaveValue("2026-11-14");
  });
});

describe("EditPersonalItem", () => {
  const item = { id: "p1", title: "History Test", dueDate: "2026-11-21", kind: "TEST" as const, classId: null };

  it("edits with the item's values filled in", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<EditPersonalItem item={item} classes={classes} today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit History Test" }));

    const dialog = await screen.findByRole("dialog", { name: "Edit my own item" });
    expect(within(dialog).getByRole("textbox", { name: "Title" })).toHaveValue("History Test");
    expect(within(dialog).getByRole("button", { name: "Test" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(dialog).getByRole("button", { name: "Essay" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("PATCH", "/me/personal-items/p1",
      { title: "History Test", dueDate: "2026-11-21", kind: "ESSAY", classId: null }, expect.anything());
  });

  it("deletes only after confirming, and Keep backs out", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue();
    render(<EditPersonalItem item={item} classes={classes} today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit History Test" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit my own item" });

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete this item" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep" }));
    expect(api.sendNoContent).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete this item" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete item" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/me/personal-items/p1");
    expect(refresh).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run components/app/personal-item-drawer.spec.tsx`
Expected: FAIL, cannot resolve `./personal-item-drawer`.

- [ ] **Step 3: The form**

Replace `personal-item-form.tsx` with:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, ApiError } from "@/lib/api/client";
import { KINDS } from "@/lib/app/personal-kind";
import { type PersonalKind, personalItemSchema } from "@/lib/api/schemas";
import { dateShortcuts } from "@/lib/app/timeline";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { eyebrow } from "./styles";

export type ClassOption = { classId: string; className: string; subjectName: string };
export type Draft = { title: string; dueDate: string; kind: PersonalKind; classId: string | null };

// The size goes through `cn()` inside ToggleGroupItem beside a text colour, so it is written as `length:` (UI-STANDARDS §2).
const KIND_BUTTON = "flex-1 justify-center rounded-app-control text-[length:var(--text-app-meta)]";

/**
 * The body of the add and edit drawer (plan 2F P2-50; plan timeline-redesign T-5, T-9). Kind is four buttons and
 * the date has three shortcuts, so a test tomorrow is a title and two taps. Delete lives here when editing.
 */
export function PersonalItemForm({
  itemId,
  initial,
  classes,
  today,
  onDone,
}: {
  itemId?: string;
  initial?: Draft;
  classes: ClassOption[];
  today: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial ?? { title: "", dueDate: "", kind: "OTHER", classId: null });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const id = itemId ?? "new";

  async function run(request: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await request();
      onDone();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(() => (itemId ? api.send("PATCH", `/me/personal-items/${itemId}`, draft, personalItemSchema) : api.send("POST", "/me/personal-items", draft, personalItemSchema)));
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-app-tray px-4 py-5 sm:px-6">
        {error && <ErrorPanel error={error} focus />}
        <FieldGroup>
          <Field id={`pi-title-${id}`} label="Title">
            {(c) => <input {...c} required maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />}
          </Field>
        </FieldGroup>

        <div className="flex flex-col gap-2">
          <p id={`pi-kind-${id}`} className={`${eyebrow} text-app-muted`}>Kind</p>
          <ToggleGroup aria-labelledby={`pi-kind-${id}`} value={[draft.kind]} onValueChange={(v) => { if (v[0]) setDraft({ ...draft, kind: v[0] as PersonalKind }); }} className="gap-2">
            {KINDS.map((k) => <ToggleGroupItem key={k.value} value={k.value} className={KIND_BUTTON}>{k.label}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-2">
          <FieldGroup>
            <Field id={`pi-date-${id}`} label="Date">
              {(c) => <input {...c} type="date" required value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />}
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            {dateShortcuts(today).map((s) => (
              <Button key={s.label} type="button" variant="outline" aria-pressed={draft.dueDate === s.date}
                className="rounded-full aria-pressed:border-app-pick aria-pressed:bg-app-pick-tint aria-pressed:text-app-ink"
                onClick={() => setDraft({ ...draft, dueDate: s.date })}>
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        <FieldGroup>
          <Field id={`pi-class-${id}`} label="Class (optional)">
            {(c) => (
              <select {...c} value={draft.classId ?? ""} onChange={(e) => setDraft({ ...draft, classId: e.target.value || null })}>
                <option value="">No class</option>
                {classes.map((k) => <option key={k.classId} value={k.classId}>{`${k.subjectName} · ${k.className}`}</option>)}
              </select>
            )}
          </Field>
        </FieldGroup>

        {itemId && (
          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-app-line pt-4">
            {confirming ? (
              <>
                <span className="text-app-small text-app-copy">Delete this item?</span>
                <Button type="button" variant="destructive" disabled={busy} onClick={() => void run(() => api.sendNoContent("DELETE", `/me/personal-items/${itemId}`))}>Delete item</Button>
                <Button type="button" variant="outline" onClick={() => setConfirming(false)}>Keep</Button>
              </>
            ) : (
              <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>Delete this item</Button>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-app-line bg-app-surface px-4 py-4 sm:px-6">
        <Button type="submit" className="flex-1" disabled={busy}>{busy ? "Saving…" : "Save item"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: The drawer**

Create `personal-item-drawer.tsx`:

```tsx
"use client";

import { Lock, Plus } from "lucide-react";
import { type ReactElement, type ReactNode, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import type { PersonalKind } from "@/lib/api/schemas";
import { weekday } from "@/lib/app/timeline";

import { type ClassOption, PersonalItemForm } from "./personal-item-form";

/**
 * A right-hand drawer for one of the student's own items (plan timeline-redesign T-5, T-12), built like
 * `RequestDrawer`: focus lands on the heading and goes back to the trigger on close. The form mounts only while
 * open, so a reopened drawer starts clean.
 */
function ItemDrawer({ title, trigger, label, children }: { title: string; trigger: ReactElement; label: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  return (
    <Drawer swipeDirection="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger}>{label}</DrawerTrigger>
      <DrawerContent initialFocus={heading}>
        <div className="flex items-start justify-between gap-3 border-b border-app-line px-4 pt-3 pb-4 sm:px-6 sm:pt-[18px]">
          <div className="flex min-w-0 flex-col gap-1">
            <DrawerTitle ref={heading} tabIndex={-1} className="text-app-section">{title}</DrawerTitle>
            <DrawerDescription className="flex items-center gap-1.5 text-app-small text-app-pick">
              <Lock aria-hidden="true" className="size-4 flex-none" />
              {"Only you can see this. Your teachers can't."}
            </DrawerDescription>
          </div>
          <DrawerClose render={<Button type="button" variant="outline" />}>Close</DrawerClose>
        </div>
        {open && children(() => setOpen(false))}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * The page's primary button, or with `compact` and a `date` the dashed "Add" under one day (the Week view, and the
 * Month view's picked day), which opens the form on that date.
 */
export function AddPersonalItem({ classes, today, date, compact }: { classes: ClassOption[]; today: string; date?: string; compact?: boolean }) {
  const trigger = compact ? (
    <Button type="button" variant="outline" aria-label={date ? `Add my own item on ${weekday(date)}` : undefined}
      className="w-full border-dashed bg-transparent text-app-grey lg:mt-auto" />
  ) : (
    <Button type="button" />
  );
  return (
    <ItemDrawer title="Add my own item" trigger={trigger}
      label={<><Plus aria-hidden="true" className="size-4" />{compact ? "Add" : "Add my own item"}</>}>
      {(close) => (
        <PersonalItemForm classes={classes} today={today} onDone={close}
          initial={date ? { title: "", dueDate: date, kind: "OTHER", classId: null } : undefined} />
      )}
    </ItemDrawer>
  );
}

export type OwnItem = { id: string; title: string; dueDate: string; kind: PersonalKind; classId: string | null };

/**
 * Edit, with Delete inside (T-9). `look` picks the trigger: a button reading "Edit", the same on the navy card, or
 * (T-17) the item's own title where a 44px button doesn't fit. The accessible name is always "Edit <title>".
 */
export function EditPersonalItem({ item, classes, today, look = "button" }: { item: OwnItem; classes: ClassOption[]; today: string; look?: "button" | "onAccent" | "title" }) {
  const trigger =
    look === "title" ? (
      <button type="button" aria-label={`Edit ${item.title}`}
        className="min-h-6 cursor-pointer text-left font-semibold underline decoration-app-pick/40 underline-offset-[3px] break-words touch-manipulation hover:decoration-current" />
    ) : (
      <Button type="button" variant={look === "onAccent" ? "onAccent" : "outline"} aria-label={`Edit ${item.title}`} />
    );
  return (
    <ItemDrawer title="Edit my own item" trigger={trigger} label={look === "title" ? item.title : "Edit"}>
      {(close) => (
        <PersonalItemForm itemId={item.id} classes={classes} today={today} onDone={close}
          initial={{ title: item.title, dueDate: item.dueDate, kind: item.kind, classId: item.classId }} />
      )}
    </ItemDrawer>
  );
}
```

Then remove the old actions file:

```bash
git rm components/app/personal-item-actions.tsx
```

- [ ] **Step 5: Run the spec and watch it pass**

Run: `cd frontend && npx vitest run components/app/personal-item-drawer.spec.tsx`
Expected: PASS (4 tests).

If "Add my own item on Sat 14 Nov" isn't found, check that `weekday("2026-11-14")` gives "Sat 14 Nov" (it does today). If the dialog isn't found by name, compare with how `date-picker-drawer.spec.tsx` finds its dialog (`findByRole("dialog", { name })`); `DrawerTitle` names it.

- [ ] **Step 6: Commit**

```bash
git add -A frontend/components/app/personal-item-form.tsx frontend/components/app/personal-item-drawer.tsx frontend/components/app/personal-item-drawer.spec.tsx frontend/components/app/personal-item-actions.tsx frontend/components/app/personal-item-actions.spec.tsx frontend/components/app/personal-item-form.spec.tsx
git commit -m "Add and edit an own item in a drawer: kind as four buttons, date shortcuts, delete inside"
```

---

### Task 6: The item card

One card for an item, used by the Timeline view, the Week view's "After this week" and the Month view's picked day. It is covered by those views' specs, so it has none of its own.

**Files:**
- Create: `frontend/components/app/timeline-item-card.tsx`

- [ ] **Step 1: Write the card**

```tsx
import type { TimelineItem } from "@/lib/api/schemas";
import { stageNumber, weekday } from "@/lib/app/timeline";

import { DoneTick } from "./personal-item-done";
import { EditPersonalItem, type OwnItem } from "./personal-item-drawer";
import type { ClassOption } from "./personal-item-form";
import { subjectEdge } from "./subject";
import { DuePill, isCoursework, isOwn, metaLine, TitleLink } from "./timeline-parts";

/** The fields the edit drawer needs, or null for anything that isn't the student's own. */
export function ownItem(item: TimelineItem): OwnItem | null {
  return item.personalItemId && item.personalKind
    ? { id: item.personalItemId, title: item.title, dueDate: item.date, kind: item.personalKind, classId: item.classId }
    : null;
}

/**
 * One item as a card (plan timeline-redesign): white with the subject's edge for the class's dates, azure tint for
 * the student's own. Never a link round its controls: the title, the tick and Edit sit side by side.
 */
export function ItemCard({ item, today, classes, editAs = "button" }: { item: TimelineItem; today: string; classes: ClassOption[]; editAs?: "button" | "title" }) {
  const own = ownItem(item);
  const coursework = isCoursework(item);
  const past = item.date < today;
  const stage = item.kind === "STAGE" ? stageNumber(item.stageLabel) : null;
  const tone = isOwn(item) ? "border-app-pick/25 bg-app-pick-tint" : `border-app-field-border bg-app-surface ${item.subjectName ? `border-l-4 ${subjectEdge(item.subjectName)}` : ""}`;
  const titleTone = item.done ? "text-app-grey line-through" : past ? "text-app-grey" : "text-app-ink";

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-app-card border px-3 py-3 sm:px-4 ${tone}`}>
      {own && <DoneTick id={own.id} title={own.title} done={item.done} />}
      <div className="min-w-0 flex-1">
        <p className="font-mono text-app-label font-bold tracking-[.04em] text-app-muted uppercase">{weekday(item.date)}</p>
        <p className={coursework ? `font-heading text-app-lead font-bold tracking-[-.01em] lg:text-app-title ${titleTone}` : `text-app-meta font-semibold ${titleTone}`}>
          {own && editAs === "title" ? <EditPersonalItem item={own} classes={classes} today={today} look="title" /> : <TitleLink item={item} />}
        </p>
        <p className="flex flex-wrap items-center gap-x-1.5 text-app-help text-app-muted">
          {stage && <span className="rounded-app-inner bg-app-accent px-2 py-0.5 font-mono text-app-label font-bold tracking-[.06em] text-app-on-accent uppercase">{item.stageLabel}</span>}
          {metaLine(item)}
        </p>
      </div>
      <DuePill today={today} item={item} />
      {own && editAs === "button" && <EditPersonalItem item={own} classes={classes} today={today} />}
    </div>
  );
}
```

- [ ] **Step 2: Type-check the new files only**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "timeline-item-card|timeline-parts|personal-item-(done|drawer|form)" || echo "no errors in the new files"`
Expected: `no errors in the new files`.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/app/timeline-item-card.tsx
git commit -m "Add ItemCard: one item with its tick, title, kind in words, due pill and Edit"
```

---

### Task 7: The Next up card

**Files:**
- Modify: `frontend/app/globals.css`
- Create: `frontend/components/app/timeline-next-up.tsx`
- Test: `frontend/components/app/timeline-next-up.spec.tsx`

- [ ] **Step 1: Write the failing spec**

Create `timeline-next-up.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TimelineItem } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { NextUp } from "./timeline-next-up";

const TODAY = "2026-11-12";
const own = (date: string, title: string, done = false): TimelineItem => ({
  kind: "PERSONAL", date, title, stageLabel: null, subjectCode: null, subjectName: null, classId: null, className: null,
  componentId: null, personalItemId: title, personalKind: "TEST", done,
});
const stage: TimelineItem = {
  kind: "STAGE", date: "2026-12-03", title: "Conducting the Experiment", stageLabel: "Stage 4", subjectCode: "BIOLOGY", subjectName: "Biology",
  classId: "c1", className: "6A Biology", componentId: "k1", personalItemId: null, personalKind: null, done: false,
};

describe("NextUp", () => {
  it("names the next thing not done as the heading, with its day and the things after it", () => {
    render(<NextUp items={[own("2026-11-12", "Maths Assignment", true), own("2026-11-13", "French vocab test"), own("2026-11-19", "Bio Assignment"), stage]} today={TODAY} classes={[]} />);
    const card = screen.getByRole("region", { name: "Next up" });
    expect(within(card).getByRole("heading", { name: "French vocab test" })).toBeInTheDocument();
    expect(card).toHaveTextContent("Next up · tomorrow");
    expect(card).toHaveTextContent("Fri 13 Nov · Test · only you");
    expect(card).toHaveTextContent("After that");
    expect(card).toHaveTextContent("Bio Assignment · Thu 19 Nov");
    expect(within(card).getByRole("button", { name: "Mark French vocab test done" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Edit French vocab test" })).toBeInTheDocument();
  });

  it("links a coursework date to its component and offers no tick", () => {
    render(<NextUp items={[stage]} today={TODAY} classes={[]} />);
    const card = screen.getByRole("region", { name: "Next up" });
    expect(within(card).getByRole("link", { name: "Conducting the Experiment" })).toHaveAttribute("href", "/components/k1");
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
  });

  it("draws nothing when nothing is coming", () => {
    const { container } = render(<NextUp items={[own("2026-11-12", "Maths Assignment", true)]} today={TODAY} classes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run components/app/timeline-next-up.spec.tsx`
Expected: FAIL, cannot resolve `./timeline-next-up`.

- [ ] **Step 3: The one new type size**

In `app/globals.css`, in the `@theme` block beside the other `--text-app-*` steps, add:

```css
  --text-app-leaf:      28px;   /* plan timeline-redesign — the day number on the Next up card's calendar leaf */
```

- [ ] **Step 4: The card**

Create `timeline-next-up.tsx`:

```tsx
import type { TimelineItem } from "@/lib/api/schemas";
import { nextUp, relativeDay, weekday } from "@/lib/app/timeline";

import { MarkDoneButton } from "./personal-item-done";
import { EditPersonalItem } from "./personal-item-drawer";
import type { ClassOption } from "./personal-item-form";
import { eyebrow } from "./styles";
import { ownItem } from "./timeline-item-card";
import { metaLine, TitleLink } from "./timeline-parts";

const MONTH = new Intl.DateTimeFormat("en-IE", { month: "short", timeZone: "UTC" });
const days = (today: string, date: string) => Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);

/**
 * Plan timeline-redesign: the page's one navy card. What is due is the heading; the date is a calendar leaf, gold
 * when it is today; "After that" names the next three. It skips anything ticked done (T-8).
 */
export function NextUp({ items, today, classes }: { items: TimelineItem[]; today: string; classes: ClassOption[] }) {
  const { next, then } = nextUp(items, today);
  if (!next) return null;
  const own = ownItem(next);

  return (
    <section aria-label="Next up" className="flex flex-wrap items-center gap-x-3.5 gap-y-3.5 rounded-app-card bg-app-accent p-4 text-app-on-accent sm:gap-x-[18px] sm:px-5 sm:py-[18px]">
      <div aria-hidden="true" className={`flex h-[62px] w-14 flex-none flex-col items-center justify-center rounded-app-card sm:h-[68px] sm:w-16 ${next.date === today ? "bg-app-today text-app-ink" : "bg-app-surface text-app-accent"}`}>
        <span className={eyebrow}>{MONTH.format(Date.parse(next.date))}</span>
        <span className="font-heading text-app-leaf leading-none font-bold">{Number(next.date.slice(8))}</span>
      </div>
      <div className="min-w-0 flex-1 basis-[200px]">
        <p className={`${eyebrow} text-app-on-accent-muted`}>{`Next up · ${relativeDay(today, next.date)}`}</p>
        <h2 className="font-heading text-app-section leading-tight font-bold tracking-[-.015em] text-balance">
          <TitleLink item={next} className="underline decoration-white/40 underline-offset-[3px] hover:decoration-current" />
        </h2>
        <p className="text-app-small text-app-on-accent-muted">{`${weekday(next.date)} · ${metaLine(next)}`}</p>
      </div>
      {own && (
        <div className="flex flex-wrap gap-2">
          <MarkDoneButton id={own.id} title={own.title} />
          <EditPersonalItem item={own} classes={classes} today={today} look="onAccent" />
        </div>
      )}
      {then.length > 0 && (
        <p className="flex basis-full flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-app-accent-track pt-3.5 text-app-small text-app-on-accent-muted">
          <span className={eyebrow}>After that</span>
          {then.map((i) => (
            <span key={`${i.kind}-${i.date}-${i.title}`}>
              <b className="font-semibold text-app-on-accent">{i.title}</b>
              {` · ${days(today, i.date) <= 1 ? relativeDay(today, i.date) : weekday(i.date)}`}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
```

`--app-on-accent-muted` on `--app-accent` is 6.96:1 (recorded beside the token), so the small lines pass.

- [ ] **Step 5: Run the spec and watch it pass**

Run: `cd frontend && npx vitest run components/app/timeline-next-up.spec.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/app/globals.css frontend/components/app/timeline-next-up.tsx frontend/components/app/timeline-next-up.spec.tsx
git commit -m "Add the Next up card: the thing due as the heading, a calendar leaf, and what comes after"
```

---

### Task 8: The Timeline view

**Files:**
- Create: `frontend/components/app/timeline-rail.tsx`
- Test: `frontend/components/app/timeline-rail.spec.tsx`

- [ ] **Step 1: Write the failing spec**

Create `timeline-rail.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MyComponent, TimelineItem } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { TimelineRail } from "./timeline-rail";

const TODAY = "2026-11-12"; // a Thursday
const bio = { stageLabel: null, subjectCode: "BIOLOGY", subjectName: "Biology", classId: "c1", className: "6A Biology", componentId: "k1", personalItemId: null, personalKind: null, done: false };
const none = { ...bio, subjectCode: null, subjectName: null, classId: null, className: null, componentId: null };
const items: TimelineItem[] = [
  { ...bio, kind: "TEACHER_ITEM", date: "2026-11-10", title: "Create Plan in workbook copy" },
  { ...none, kind: "PERSONAL", date: "2026-11-12", title: "Maths Assignment", personalItemId: "p1", personalKind: "DEADLINE" },
  { ...none, kind: "PERSONAL", date: "2026-11-19", title: "History Test", personalItemId: "p2", personalKind: "TEST", done: true },
  { ...bio, kind: "STAGE", date: "2026-12-03", title: "Conducting the Experiment", stageLabel: "Stage 4" },
  { ...bio, kind: "COMPLETION", date: "2027-02-26", title: "Biology in Practice Investigation" },
];
const components: MyComponent[] = [{ componentId: "k1", classId: "c1", className: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology", briefTitle: "Brief", completionDate: "2027-02-26" }];

describe("TimelineRail", () => {
  it("groups by this week, next week and month, each a named list in date order", () => {
    render(<TimelineRail items={items} today={TODAY} classes={[]} components={components} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
      ["This week9–15 Nov", "Next week16–22 Nov", "December 2026", "February 2027"]);
    const thisWeek = within(screen.getByRole("list", { name: "This week" })).getAllByRole("listitem");
    expect(thisWeek.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/Tue 10 Nov.*Create Plan in workbook copy.*From your teacher · Biology.*2 days ago/),
      expect.stringMatching(/Today · Thu 12 Nov/),
      expect.stringMatching(/Thu 12 Nov.*Maths Assignment.*Deadline · only you.*Today/),
    ]);
  });

  it("gives an own item its tick and Edit, and a coursework date its link, stage and kind in words", () => {
    render(<TimelineRail items={items} today={TODAY} classes={[]} components={components} />);
    expect(screen.getByRole("checkbox", { name: "Done: History Test" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Edit Maths Assignment" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Create Plan/ })).not.toBeInTheDocument();

    const december = screen.getByRole("list", { name: "December 2026" });
    expect(within(december).getByRole("link", { name: "Conducting the Experiment" })).toHaveAttribute("href", "/components/k1");
    expect(december).toHaveTextContent("Stage 4");
    expect(december).toHaveTextContent("Stage date · Biology");
    expect(screen.getByRole("list", { name: "February 2027" })).toHaveTextContent("SEC completion date · Biology");
  });

  it("lists each subject's completion date and what the marks mean", () => {
    render(<TimelineRail items={items} today={TODAY} classes={[]} components={components} />);
    expect(screen.getByRole("list", { name: "Completion dates" })).toHaveTextContent("Biology26 Feb 2027");
    expect(screen.getByRole("list", { name: "What the marks mean" })).toHaveTextContent("Your own item. Only you see it");
  });

  it("says when nothing is coming", () => {
    render(<TimelineRail items={[]} today={TODAY} classes={[]} components={[]} />);
    expect(screen.getByText("Nothing due between now and the end of the school year.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run components/app/timeline-rail.spec.tsx`
Expected: FAIL, cannot resolve `./timeline-rail`.

- [ ] **Step 3: The view**

Create `timeline-rail.tsx`:

```tsx
import { Flag } from "lucide-react";

import type { MyComponent, TimelineItem } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { groupTimeline, stageNumber, weekday } from "@/lib/app/timeline";

import type { ClassOption } from "./personal-item-form";
import { card, eyebrow } from "./styles";
import { subjectEdge } from "./subject";
import { ItemCard } from "./timeline-item-card";
import { itemKey, Marker } from "./timeline-parts";

const ROW = "grid grid-cols-[28px_minmax(0,1fr)] gap-x-2.5 pb-2.5 sm:grid-cols-[40px_minmax(0,1fr)] sm:gap-x-3.5";
/** The rail: a 2px line through the row's gutter and the gap under it, so the rows join up. Decorative. */
const LINE = "absolute top-0 -bottom-2.5 left-1/2 w-0.5 -translate-x-1/2 bg-app-field-border";
const SQUARE = "relative z-10 flex size-7 items-center justify-center self-center rounded-app-control text-app-on-accent sm:size-9";

function Node({ item }: { item: TimelineItem }) {
  if (item.kind === "STAGE") return <span className={`${SQUARE} bg-app-accent font-heading text-app-small font-bold`}>{stageNumber(item.stageLabel)}</span>;
  if (item.kind === "COMPLETION") return <span className={`${SQUARE} bg-app-ink`}><Flag className="size-4" /></span>;
  return <span className="relative z-10 flex size-[22px] items-center justify-center self-center rounded-full bg-app-ground"><Marker item={item} /></span>;
}

const KEY: ReadonlyArray<{ item: Pick<TimelineItem, "kind" | "subjectName">; words: string }> = [
  { item: { kind: "STAGE", subjectName: null }, words: "A stage date for your coursework" },
  { item: { kind: "TEACHER_ITEM", subjectName: null }, words: "Something from your teacher" },
  { item: { kind: "PERSONAL", subjectName: null }, words: "Your own item. Only you see it" },
];

/**
 * Plan timeline-redesign T-10: every date from this week to the end of the school year on one rail. Each group is
 * a heading and its own ordered list, so a screen reader hears "This week, list, 3 items". The rail, its nodes and
 * the Today line's dashes are decoration; the Today row itself is a list item marked `aria-current="date"`.
 */
export function TimelineRail({ items, today, classes, components }: { items: TimelineItem[]; today: string; classes: ClassOption[]; components: MyComponent[] }) {
  const groups = groupTimeline(items, today);
  const firstUpcoming = items.find((i) => i.date >= today);
  const showToday = firstUpcoming !== undefined && items.some((i) => i.date < today);
  const completionDates = components.filter((c, i, all) => all.findIndex((k) => k.subjectName === c.subjectName) === i);

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="min-w-0">
        {groups.length === 0 && <p className="text-app-base text-app-copy">Nothing due between now and the end of the school year.</p>}
        {groups.map((group, g) => {
          const headingId = `tl-group-${g}`;
          return (
            <section key={headingId} className={g === 0 ? "" : "pt-5"}>
              <h3 id={headingId} className="flex items-baseline gap-2.5 pb-2.5 sm:pl-[54px]">
                <span className="font-heading text-app-lead font-bold tracking-[-.01em] text-app-ink">{group.label}</span>
                {group.sub && <span className="text-app-help text-app-muted">{group.sub}</span>}
              </h3>
              <ol aria-label={group.label}>
                {group.items.map((item) => (
                  <Row key={itemKey(item)} item={item} today={today} classes={classes} todayBefore={showToday && item === firstUpcoming} />
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <aside className="flex flex-col gap-3 lg:sticky lg:top-4">
        {completionDates.length > 0 && (
          <div className={`${card} overflow-hidden`}>
            <p id="tl-completion" className={`${eyebrow} px-[18px] pt-3.5 pb-2.5 text-app-muted`}>Completion dates</p>
            <ul aria-labelledby="tl-completion">
              {completionDates.map((c) => (
                <li key={c.subjectName} className={`flex items-baseline justify-between gap-3 border-t border-l-4 border-app-line px-[18px] py-[11px] ${subjectEdge(c.subjectName)}`}>
                  <span className="text-app-base text-app-copy">{c.subjectName}</span>
                  <span className="text-app-meta text-app-grey">{formatCalendarDate(c.completionDate)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul aria-label="What the marks mean" className={`${card} flex flex-col gap-2 px-[18px] py-3.5 text-app-small text-app-copy`}>
          {KEY.map((k) => (
            <li key={k.words} className="flex items-center gap-2.5"><Marker item={k.item as TimelineItem} />{k.words}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function Row({ item, today, classes, todayBefore }: { item: TimelineItem; today: string; classes: ClassOption[]; todayBefore: boolean }) {
  return (
    <>
      {todayBefore && (
        <li aria-current="date" className={`${ROW} items-center`}>
          <div aria-hidden="true" className="relative flex justify-center self-stretch">
            <span className={LINE} />
            <span className="relative z-10 size-4 self-center rounded-full border-2 border-app-today-ring bg-app-today" />
          </div>
          <p className={`${eyebrow} flex items-center gap-2.5 text-app-ink after:flex-1 after:border-t-2 after:border-dashed after:border-app-today-ring/60`}>
            {`Today · ${weekday(today)}`}
          </p>
        </li>
      )}
      <li className={ROW}>
        <div aria-hidden="true" className="relative flex justify-center">
          <span className={LINE} />
          <Node item={item} />
        </div>
        <ItemCard item={item} today={today} classes={classes} />
      </li>
    </>
  );
}
```

`subjectEdge` sets `border-l-app-subject-…`; `border-app-line` on the same element colours the top border only because the left colour class is more specific in order. If the edge renders grey, move `border-app-line` to `border-t-app-line`.

- [ ] **Step 4: Run the spec and watch it pass**

Run: `cd frontend && npx vitest run components/app/timeline-rail.spec.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/app/timeline-rail.tsx frontend/components/app/timeline-rail.spec.tsx
git commit -m "Add the Timeline view: one rail from this week to the end of the school year"
```

---

### Task 9: The Week view

**Files:**
- Create: `frontend/components/app/timeline-week.tsx`
- Test: `frontend/components/app/timeline-week.spec.tsx`

- [ ] **Step 1: Write the failing spec**

Create `timeline-week.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TimelineItem } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { TimelineWeek } from "./timeline-week";

const TODAY = "2026-11-12"; // a Thursday
const bio = { stageLabel: null, subjectCode: "BIOLOGY", subjectName: "Biology", classId: "c1", className: "6A Biology", componentId: "k1", personalItemId: null, personalKind: null, done: false };
const none = { ...bio, subjectCode: null, subjectName: null, classId: null, className: null, componentId: null };
const items: TimelineItem[] = [
  { ...bio, kind: "TEACHER_ITEM", date: "2026-11-10", title: "Create Plan in workbook copy" },
  { ...none, kind: "PERSONAL", date: "2026-11-12", title: "Maths Assignment", personalItemId: "p1", personalKind: "DEADLINE" },
  { ...none, kind: "PERSONAL", date: "2026-11-19", title: "Bio Assignment", personalItemId: "p2", personalKind: "TEST" },
];
const week = () => render(<TimelineWeek from="2026-11-09" to="2026-11-15" today={TODAY} items={items} classes={[]} />);

describe("TimelineWeek", () => {
  it("draws seven days, Monday first, with each day's items, and marks today", () => {
    week();
    // Each day's heading carries its full date for screen readers; the short day and number beside it are decoration.
    const days = within(screen.getByRole("list", { name: "Days of the week" })).getAllByRole("heading", { level: 3 });
    expect(days.map((d) => d.querySelector(".sr-only")?.textContent)).toEqual(["Mon 9 Nov", "Tue 10 Nov", "Wed 11 Nov", "Thu 12 Nov, today", "Fri 13 Nov", "Sat 14 Nov", "Sun 15 Nov"]);
    expect(screen.getByRole("list", { name: "Tue 10 Nov" })).toHaveTextContent("Create Plan in workbook copy");
    expect(within(screen.getByRole("list", { name: "Thu 12 Nov" })).getByRole("checkbox", { name: "Done: Maths Assignment" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Thu 12 Nov" })).getByRole("button", { name: "Edit Maths Assignment" })).toBeInTheDocument();
  });

  it("offers Add on today and every day after it, never on a day gone", () => {
    week();
    expect(screen.getAllByRole("button", { name: /^Add my own item on/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Add my own item on Thu 12 Nov", "Add my own item on Fri 13 Nov", "Add my own item on Sat 14 Nov", "Add my own item on Sun 15 Nov",
    ]);
  });

  it("sums the week up in a sentence and lists what comes after it", () => {
    week();
    expect(screen.getByText("This week: 1 of your own, 0 done · 1 from your teacher")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "After this week" })).toHaveTextContent("Bio Assignment");
    expect(screen.queryByRole("list", { name: "Thu 19 Nov" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run components/app/timeline-week.spec.tsx`
Expected: FAIL, cannot resolve `./timeline-week`.

- [ ] **Step 3: The view**

Create `timeline-week.tsx`:

```tsx
import type { TimelineItem } from "@/lib/api/schemas";
import { weekday, weekDays, weekSummary } from "@/lib/app/timeline";

import { DoneTick } from "./personal-item-done";
import { AddPersonalItem, EditPersonalItem } from "./personal-item-drawer";
import type { ClassOption } from "./personal-item-form";
import { eyebrow } from "./styles";
import { subjectEdge } from "./subject";
import { ItemCard, ownItem } from "./timeline-item-card";
import { isCoursework, isOwn, itemKey, kindWord, Marker, TitleLink } from "./timeline-parts";

const AFTER = 4;
const WEEKDAY = new Intl.DateTimeFormat("en-IE", { weekday: "short", timeZone: "UTC" });

/**
 * Plan timeline-redesign T-1: the week as a planner. Seven columns from `lg`, day rows below it; the switch is CSS
 * only. Every day from today on has its own Add. `items` covers the week and the four weeks after, which feed
 * "After this week".
 */
export function TimelineWeek({ from, to, today, items, classes }: { from: string; to: string; today: string; items: TimelineItem[]; classes: ClassOption[] }) {
  const inWeek = items.filter((i) => i.date <= to);
  const after = items.filter((i) => i.date > to).slice(0, AFTER);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-app-small text-app-copy">{weekSummary(inWeek)}</p>

      <ol aria-label="Days of the week" className="overflow-hidden rounded-app-card border border-app-field-border bg-app-surface lg:grid lg:grid-cols-7">
        {weekDays(from).map((date, n) => {
          const isToday = date === today;
          const dayItems = inWeek.filter((i) => i.date === date);
          const headingId = `wk-${date}`;
          return (
            <li key={date} aria-current={isToday ? "date" : undefined}
              className={`flex border-t border-app-line first:border-t-0 lg:min-h-[300px] lg:min-w-0 lg:flex-col lg:border-t-0 lg:border-l lg:first:border-l-0 ${isToday ? "bg-app-today/10" : n > 4 ? "bg-app-weekend" : ""}`}>
              <h3 id={headingId} className="flex w-[60px] flex-none flex-col items-center gap-1 border-r border-app-line px-2 py-3 lg:w-auto lg:flex-row lg:justify-between lg:border-r-0 lg:border-b lg:px-3 lg:py-2.5">
                <span className="sr-only">{`${weekday(date)}${isToday ? ", today" : ""}`}</span>
                <span aria-hidden="true" className={`${eyebrow} ${isToday ? "text-app-ink" : "text-app-muted"}`}>{isToday ? "Today" : WEEKDAY.format(Date.parse(date))}</span>
                <span aria-hidden="true" className={`flex size-8 items-center justify-center rounded-full font-heading text-app-lead font-bold ${isToday ? "border-2 border-app-today-ring bg-app-today text-app-ink" : date < today ? "text-app-muted" : "text-app-ink"}`}>
                  {Number(date.slice(8))}
                </span>
              </h3>
              <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5 lg:px-2">
                {dayItems.length > 0 && (
                  <ul aria-label={weekday(date)} className="flex flex-col gap-2">
                    {dayItems.map((item) => <WeekCard key={itemKey(item)} item={item} today={today} classes={classes} />)}
                  </ul>
                )}
                {date >= today && <AddPersonalItem classes={classes} today={today} date={date} compact />}
              </div>
            </li>
          );
        })}
      </ol>

      {after.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 id="wk-after" className={`${eyebrow} text-app-muted`}>After this week</h3>
          <ol aria-labelledby="wk-after" className="flex flex-col gap-2.5">
            {after.map((item) => <li key={itemKey(item)}><ItemCard item={item} today={today} classes={classes} /></li>)}
          </ol>
        </section>
      )}
    </div>
  );
}

/** A day's card: small enough for a 120px column. An own item's title is its Edit button (T-17). */
function WeekCard({ item, today, classes }: { item: TimelineItem; today: string; classes: ClassOption[] }) {
  const own = ownItem(item);
  const navy = isCoursework(item);
  const tone = navy ? "border-app-accent bg-app-accent text-app-on-accent"
    : isOwn(item) ? "border-app-pick/25 bg-app-pick-tint text-app-ink"
    : `border-app-field-border bg-app-surface text-app-ink ${item.subjectName ? `border-l-4 ${subjectEdge(item.subjectName)}` : ""}`;
  const titleTone = navy ? "" : item.done ? "text-app-grey line-through" : item.date < today ? "text-app-grey" : "";

  return (
    <li className={`flex flex-wrap items-start gap-x-2.5 gap-y-1 rounded-app-control border p-2.5 text-app-small ${tone}`}>
      {own && <DoneTick id={own.id} title={own.title} done={item.done} />}
      <div className="min-w-0 flex-1">
        <p className={`leading-snug font-semibold break-words ${titleTone}`}>
          {own ? <EditPersonalItem item={own} classes={classes} today={today} look="title" />
            : <TitleLink item={item} className={navy ? "underline decoration-white/40 underline-offset-[3px]" : undefined} />}
        </p>
        <p className={`flex items-center gap-1.5 text-app-label ${navy ? "text-app-on-accent-muted" : "text-app-muted"}`}>
          <Marker item={item} small onAccent={navy} />
          {item.kind === "STAGE" && item.stageLabel ? item.stageLabel : kindWord(item)}
        </p>
      </div>
    </li>
  );
}
```

- [ ] **Step 4: Run the spec and watch it pass**

Run: `cd frontend && npx vitest run components/app/timeline-week.spec.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/app/timeline-week.tsx frontend/components/app/timeline-week.spec.tsx
git commit -m "Add the Week view: seven days as a planner, with Add on each day and what comes after"
```

---

### Task 10: The Month view

**Files:**
- Create: `frontend/components/app/timeline-month.tsx`
- Test: `frontend/components/app/timeline-month.spec.tsx`

- [ ] **Step 1: Write the failing spec**

Create `timeline-month.spec.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TimelineItem } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { TimelineMonth } from "./timeline-month";

const TODAY = "2026-11-12";
const bio = { stageLabel: null, subjectCode: "BIOLOGY", subjectName: "Biology", classId: "c1", className: "6A Biology", componentId: "k1", personalItemId: null, personalKind: null, done: false };
const none = { ...bio, subjectCode: null, subjectName: null, classId: null, className: null, componentId: null };
const items: TimelineItem[] = [
  { ...none, kind: "PERSONAL", date: "2026-11-12", title: "Maths Assignment", personalItemId: "p1", personalKind: "DEADLINE" },
  { ...bio, kind: "TEACHER_ITEM", date: "2026-11-20", title: "Make edits to experiment plan" },
];
const month = (day = TODAY) =>
  render(<TimelineMonth range={{ view: "month", from: "2026-11-01", to: "2026-11-30" }} today={TODAY} day={day} items={items} classes={[]} />);

describe("TimelineMonth", () => {
  it("is a table of weeks named by its month, with a chip per item that links to its component", () => {
    month();
    const table = screen.getByRole("table", { name: "November 2026" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(within(table).getByRole("link", { name: "Make edits to experiment plan" })).toHaveAttribute("href", "/components/k1");
    expect(within(table).getByText("Maths Assignment")).toBeInTheDocument();
  });

  it("makes each day a link that picks it, says how much is on it, and marks today", () => {
    month();
    const today = screen.getByRole("link", { name: "Thu 12 Nov, 1 item" });
    expect(today).toHaveAttribute("href", "?view=month&from=2026-11-01&day=2026-11-12");
    expect(today).toHaveAttribute("aria-current", "date");
    expect(screen.getByRole("link", { name: "Sat 14 Nov, nothing" })).not.toHaveAttribute("aria-current");
  });

  it("greys the days outside the month and gives them no link", () => {
    month();
    const cells = within(screen.getByRole("table", { name: "November 2026" })).getAllByRole("cell", { hidden: true });
    const outside = cells.filter((c) => c.getAttribute("aria-disabled") === "true");
    expect(outside.length).toBe(12); // 26–31 Oct and 1–6 Dec
    for (const cell of outside) expect(within(cell).queryByRole("link")).not.toBeInTheDocument();
  });

  it("lists the picked day under the calendar, with its tick, Edit and Add", () => {
    month();
    const picked = screen.getByRole("region", { name: "Thu 12 Nov, today" });
    expect(within(picked).getByRole("checkbox", { name: "Done: Maths Assignment" })).toBeInTheDocument();
    expect(within(picked).getByRole("button", { name: "Edit Maths Assignment" })).toBeInTheDocument();
    expect(within(picked).getByRole("button", { name: "Add my own item on Thu 12 Nov" })).toBeInTheDocument();
  });

  it("says when the picked day is empty", () => {
    month("2026-11-14");
    expect(within(screen.getByRole("region", { name: "Sat 14 Nov" })).getByText("Nothing on this day.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run components/app/timeline-month.spec.tsx`
Expected: FAIL, cannot resolve `./timeline-month`.

- [ ] **Step 3: The view**

Create `timeline-month.tsx`:

```tsx
import Link from "next/link";

import type { TimelineItem } from "@/lib/api/schemas";
import { monthWeeks, type Range, rangeLabel, weekday } from "@/lib/app/timeline";

import { AddPersonalItem } from "./personal-item-drawer";
import type { ClassOption } from "./personal-item-form";
import { eyebrow } from "./styles";
import { subjectEdge } from "./subject";
import { ItemCard } from "./timeline-item-card";
import { isCoursework, isOwn, itemKey, Marker } from "./timeline-parts";

const WEEKDAY_COLS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A cell's chip (from `sm`): a link for the class's dates, plain text for the student's own (edited from the picked day). */
function Chip({ item }: { item: TimelineItem }) {
  const tone = isCoursework(item) ? "bg-app-accent text-app-on-accent"
    : isOwn(item) ? `bg-app-pick-tint ${item.done ? "text-app-grey line-through" : "text-app-ink"}`
    : `border border-app-field-border bg-app-surface text-app-ink ${item.subjectName ? `border-l-4 ${subjectEdge(item.subjectName)}` : ""}`;
  const body = (
    <>
      {item.kind !== "TEACHER_ITEM" && <Marker item={item} small onAccent={isCoursework(item)} />}
      <span className="line-clamp-2 min-w-0 break-words">{item.kind === "STAGE" && item.stageLabel ? `${item.stageLabel} date` : item.title}</span>
    </>
  );
  const className = `hidden items-center gap-1.5 rounded-app-inner px-2 py-1 text-app-help leading-tight font-semibold sm:flex ${tone}`;
  return item.componentId
    ? <Link href={`/components/${item.componentId}`} aria-label={item.title} title={item.title} className={className}>{body}</Link>
    : <span title={item.title} className={className}>{body}</span>;
}

/**
 * Plan timeline-redesign T-3, T-14, T-15: a real calendar. Still a table, so a screen reader moves by week and
 * weekday. Each day's number is a link that picks it (`?day=`); the picked day's items are listed underneath,
 * where they can be ticked, edited and added to. Below `sm` the chips give way to marks.
 */
export function TimelineMonth({ range, today, day, items, classes }: { range: Range; today: string; day: string; items: TimelineItem[]; classes: ClassOption[] }) {
  const label = rangeLabel(range);
  const byDate = new Map<string, TimelineItem[]>();
  for (const item of items) byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  const picked = byDate.get(day) ?? [];
  const pickedLabel = `${weekday(day)}${day === today ? ", today" : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-app-card border border-app-field-border bg-app-surface">
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>{WEEKDAY_COLS.map((d) => <th key={d} scope="col" className={`${eyebrow} border-b border-app-line px-1 py-2.5 text-center text-app-muted sm:px-3 sm:text-left`}>{d}</th>)}</tr>
          </thead>
          <tbody>
            {monthWeeks(range).map((week) => (
              <tr key={week[0]}>
                {week.map((date, n) => {
                  const outside = date < range.from || date > range.to;
                  const dayItems = outside ? [] : byDate.get(date) ?? [];
                  const isToday = date === today;
                  const number = `flex size-11 items-center justify-center rounded-full text-app-small sm:size-8 ${isToday ? "border-2 border-app-today-ring bg-app-today font-bold text-app-ink" : "font-semibold text-app-copy"}`;
                  return (
                    <td key={date} aria-disabled={outside || undefined}
                      className={`h-[58px] border-t border-l border-app-line p-0.5 align-top first:border-l-0 sm:h-[112px] sm:p-2 ${outside ? "text-app-disabled" : ""} ${isToday ? "bg-app-today/10" : n > 4 ? "bg-app-weekend" : ""} ${date === day && !outside ? "shadow-[inset_0_0_0_2px_var(--app-accent)]" : ""}`}>
                      <div className="flex flex-col items-center gap-1 sm:items-stretch">
                        {outside ? (
                          <span className="flex size-11 items-center justify-center text-app-small sm:size-8">{Number(date.slice(8))}</span>
                        ) : (
                          <Link href={`?view=month&from=${range.from}&day=${date}`} scroll={false} aria-current={isToday ? "date" : undefined}
                            aria-label={`${weekday(date)}, ${dayItems.length === 0 ? "nothing" : dayItems.length === 1 ? "1 item" : `${dayItems.length} items`}`}
                            className={`${number} touch-manipulation hover:bg-app-inset`}>
                            {Number(date.slice(8))}
                          </Link>
                        )}
                        {dayItems.map((item) => <Chip key={itemKey(item)} item={item} />)}
                        {dayItems.length > 0 && (
                          <span aria-hidden="true" className="-mt-2 flex items-center gap-[3px] sm:hidden">
                            {dayItems.slice(0, 3).map((item) => <Marker key={itemKey(item)} item={item} small />)}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="month-picked" className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <h3 id="month-picked" className="font-heading text-app-lead font-bold tracking-[-.01em] text-app-ink">{pickedLabel}</h3>
          {day >= today && <div className="w-[108px]"><AddPersonalItem classes={classes} today={today} date={day} compact /></div>}
        </div>
        {picked.length === 0 ? (
          <p className="text-app-small text-app-copy">Nothing on this day.</p>
        ) : (
          <ul aria-label={pickedLabel} className="flex flex-col gap-2.5">
            {picked.map((item) => <li key={itemKey(item)}><ItemCard item={item} today={today} classes={classes} /></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
```

Notes for the engineer:
- The picked cell's ring is an inset `box-shadow` reading the token (`var(--app-accent)`), not a raw colour. A `<td>` can't take `outline` reliably inside `border-collapse`.
- `scroll={false}` on the day link keeps the page where it is while the picked day changes.
- `mt-auto` from the compact Add button has no effect here; the `w-[108px]` wrapper sizes it.

- [ ] **Step 4: Run the spec and watch it pass**

Run: `cd frontend && npx vitest run components/app/timeline-month.spec.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/app/timeline-month.tsx frontend/components/app/timeline-month.spec.tsx
git commit -m "Add the Month view: a calendar of chips, a link per day, and the picked day listed underneath"
```

---

### Task 11: The shell, the page, and the old code out

**Files:**
- Rewrite: `frontend/components/app/timeline-view.tsx`
- Rewrite: `frontend/components/app/timeline-view.spec.tsx`
- Modify: `frontend/components/app/app-main.tsx`
- Modify: `frontend/app/(app)/home/page.tsx`
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Rewrite the spec first**

Replace `timeline-view.spec.tsx` with:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TimelineItem } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { TimelineView } from "./timeline-view";

const TODAY = "2026-11-12";
const items: TimelineItem[] = [{
  kind: "PERSONAL", date: "2026-11-12", title: "Maths Assignment", stageLabel: null, subjectCode: null, subjectName: null, classId: null,
  className: null, componentId: null, personalItemId: "p1", personalKind: "DEADLINE", done: false,
}];
const view = (range: Parameters<typeof TimelineView>[0]["range"]) =>
  render(<TimelineView range={range} today={TODAY} day={TODAY} items={items} classes={[]} components={[]} />);

describe("TimelineView", () => {
  it("opens on the Timeline view, marks it current, and offers the term's earlier dates", () => {
    view({ view: "timeline", from: "2026-11-09", to: "2027-08-31" });
    expect(screen.getByRole("link", { name: "Timeline" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Week" })).toHaveAttribute("href", "?view=week&from=2026-11-12");
    expect(screen.getByRole("link", { name: "Month" })).toHaveAttribute("href", "?view=month&from=2026-11-12");
    expect(screen.getByRole("link", { name: "Show earlier" })).toHaveAttribute("href", "?view=timeline&from=2026-09-01");
    expect(screen.getByRole("list", { name: "This week" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Previous week" })).not.toBeInTheDocument();
  });

  it("hides Show earlier once the timeline starts at the school year", () => {
    view({ view: "timeline", from: "2026-09-01", to: "2027-08-31" });
    expect(screen.queryByRole("link", { name: "Show earlier" })).not.toBeInTheDocument();
  });

  it("steps a week with named arrow links and comes back with Today", () => {
    view({ view: "week", from: "2026-11-16", to: "2026-11-22" });
    expect(screen.getByRole("heading", { level: 2, name: "16–22 Nov 2026" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous week" })).toHaveAttribute("href", "?view=week&from=2026-11-09");
    expect(screen.getByRole("link", { name: "Next week" })).toHaveAttribute("href", "?view=week&from=2026-11-23");
    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("href", "?view=week");
    expect(screen.getByRole("list", { name: "Days of the week" })).toBeInTheDocument();
    // Off this week, the other views keep the week on screen as their anchor.
    expect(screen.getByRole("link", { name: "Month" })).toHaveAttribute("href", "?view=month&from=2026-11-16");
  });

  it("steps a month the same way", () => {
    view({ view: "month", from: "2026-11-01", to: "2026-11-30" });
    expect(screen.getByRole("link", { name: "Previous month" })).toHaveAttribute("href", "?view=month&from=2026-10-01");
    expect(screen.getByRole("link", { name: "Next month" })).toHaveAttribute("href", "?view=month&from=2026-12-01");
    expect(screen.getByRole("table", { name: "November 2026" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run components/app/timeline-view.spec.tsx`
Expected: FAIL (the old component has no "Show earlier", and wants `calendarOpen`).

- [ ] **Step 3: The shell**

Replace `timeline-view.tsx` with:

```tsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { MyComponent, TimelineItem } from "@/lib/api/schemas";
import { type Range, rangeLabel, schoolYear, stepFrom, type View, weekday } from "@/lib/app/timeline";

import type { ClassOption } from "./personal-item-form";
import { TimelineMonth } from "./timeline-month";
import { TimelineRail } from "./timeline-rail";
import { TimelineWeek } from "./timeline-week";

const VIEWS: ReadonlyArray<{ view: View; label: string }> = [
  { view: "timeline", label: "Timeline" },
  { view: "week", label: "Week" },
  { view: "month", label: "Month" },
];

/**
 * Plan timeline-redesign: the view switch, the range controls, and the chosen view. All of it is links: the view
 * and the date live in the URL (`?view=…&from=…`), so Back and a shared link land on the same screen. `items` is
 * whatever `fetchRange` in the page loaded for this view.
 */
export function TimelineView({ range, today, day, items, classes, components }: {
  range: Range;
  today: string;
  /** The Month view's picked day. */
  day: string;
  items: TimelineItem[];
  classes: ClassOption[];
  components: MyComponent[];
}) {
  // Switching view keeps you where you are: on today while today is on screen, otherwise on what you browsed to.
  const anchor = range.from <= today && today <= range.to ? today : range.from;
  const unit = range.view === "week" ? "week" : "month";
  const label = range.view === "timeline" ? `From ${weekday(range.from)}` : rangeLabel(range);
  const earlier = schoolYear(today).start;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Timeline view" className="flex w-full gap-[3px] rounded-app-card bg-app-inset p-[3px] sm:w-auto">
          {VIEWS.map((v) => (
            <Link key={v.view} href={v.view === "timeline" ? "?view=timeline" : `?view=${v.view}&from=${anchor}`}
              aria-current={v.view === range.view ? "page" : undefined}
              className={`flex min-h-[38px] flex-1 items-center justify-center rounded-[7px] border px-4 text-app-meta font-semibold touch-manipulation ${v.view === range.view ? "border-app-field-border bg-app-surface text-app-accent" : "border-transparent text-app-grey"}`}>
              {v.label}
            </Link>
          ))}
        </nav>

        {range.view === "timeline" ? (
          <>
            <h2 id="timeline-range" className="sr-only">{label}</h2>
            {range.from > earlier && <Link href={`?view=timeline&from=${earlier}`} className={buttonVariants({ variant: "outline" })}>Show earlier</Link>}
          </>
        ) : (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link href={`?view=${range.view}&from=${stepFrom(range, -1)}`} aria-label={`Previous ${unit}`} className={buttonVariants({ variant: "outline", size: "icon" })}>
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
            <h2 id="timeline-range" className="min-w-0 flex-1 text-center font-heading text-app-lead font-bold tracking-[-.01em] text-app-ink sm:min-w-[168px]">{label}</h2>
            <Link href={`?view=${range.view}&from=${stepFrom(range, 1)}`} aria-label={`Next ${unit}`} className={buttonVariants({ variant: "outline", size: "icon" })}>
              <ChevronRight aria-hidden="true" className="size-5" />
            </Link>
            <Link href={`?view=${range.view}`} className={buttonVariants({ variant: "outline" })}>Today</Link>
          </div>
        )}
      </div>

      <div aria-labelledby="timeline-range" role="group">
        {range.view === "timeline" && <TimelineRail items={items} today={today} classes={classes} components={components} />}
        {range.view === "week" && <TimelineWeek from={range.from} to={range.to} today={today} items={items} classes={classes} />}
        {range.view === "month" && <TimelineMonth range={range} today={today} day={day} items={items} classes={classes} />}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the spec and watch it pass**

Run: `cd frontend && npx vitest run components/app/timeline-view.spec.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: The wider column**

In `components/app/app-main.tsx`, add to `WIDTHS` and correct the comment:

```tsx
// Content column widths from pack D-2, plus the side gutters (16px phone, 28px laptop). `planner` is /home's:
// seven day columns need the room (plan timeline-redesign T-22).
const WIDTHS = {
  form: "max-w-[616px]",
  list: "max-w-[916px]",
  class: "max-w-[936px]",
  planner: "max-w-[1096px]",
} as const;
```

- [ ] **Step 6: The page**

Replace `app/(app)/home/page.tsx` with:

```tsx
import Link from "next/link";
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { Notice } from "@/components/app/notice";
import { AddPersonalItem } from "@/components/app/personal-item-drawer";
import { pageTitle } from "@/components/app/styles";
import { StudentNav } from "@/components/app/student-nav";
import { NextUp } from "@/components/app/timeline-next-up";
import { TimelineView } from "@/components/app/timeline-view";
import { buttonVariants } from "@/components/ui/button";
import { enrolmentViewSchema, myComponentSchema, timelineSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { addDays, type Range, rangeFor, toIsoDate } from "@/lib/app/timeline";
import { dublinToday } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const UPCOMING_DAYS = 60;
const AFTER_WEEK_DAYS = 28;

/** What to load for a view: the Week view also lists what follows it. */
function fetchRange(range: Range): { from: string; to: string } {
  return range.view === "week" ? { from: range.from, to: addDays(range.to, AFTER_WEEK_DAYS) } : range;
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const today = toIsoDate(dublinToday());
  const range = rangeFor(params, today);
  const load = fetchRange(range);
  // T-14: the Month view's picked day. Today when it's in the month on screen, otherwise the month's first day.
  const asked = one(params.day);
  const day = asked && asked >= range.from && asked <= range.to ? asked : today >= range.from && today <= range.to ? today : range.from;

  // T-11: Next up is loaded on its own, from today, so it stays right while another week or month is on screen.
  const [timeline, upcoming, classes, components] = await Promise.all([
    attempt(() => serverApi.get(`/me/timeline?from=${load.from}&to=${load.to}`, timelineSchema)),
    attempt(() => serverApi.get(`/me/timeline?from=${today}&to=${addDays(today, UPCOMING_DAYS)}`, timelineSchema)),
    attempt(() => serverApi.get("/me/classes", z.array(enrolmentViewSchema))),
    attempt(() => serverApi.get("/me/components", z.array(myComponentSchema))),
  ]);

  const joined = classes.ok ? classes.data : [];
  const approved = joined.filter((c) => c.status === "APPROVED");
  const options = joined.map((c) => ({ classId: c.classId, className: c.className, subjectName: c.subjectName }));

  return (
    <AppMain width="planner">
      <div className="flex flex-col gap-5">
        {classes.ok && <StudentNav classes={classes.data} components={components.ok ? components.data : []} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className={pageTitle}>{classes.ok && joined.length === 0 ? "Nothing here yet." : "Timeline"}</h1>
          <div className="flex flex-wrap gap-2.5">
            {classes.ok && joined.length === 0 && <Link href="/join" className={buttonVariants({ variant: "outline" })}>Join a class</Link>}
            <AddPersonalItem classes={options} today={today} />
          </div>
        </div>
        {classes.ok && joined.length === 0 && (
          <p className="text-app-base text-app-copy">Join a class with the code your teacher gave you, and add anything else you need to remember.</p>
        )}
        {classes.ok && joined.length > 0 && approved.length === 0 && (
          <Notice tone="attention">A teacher needs to approve you before your coursework dates show here. Your own items still do.</Notice>
        )}
        {classes.ok && approved.length > 0 && components.ok && components.data.length === 0 && (
          <Notice tone="attention">{"Your teachers haven't set up coursework yet. Your own items still show here."}</Notice>
        )}
        {!classes.ok && <ErrorPanel error={classes.error} />}

        {upcoming.ok && <NextUp items={upcoming.data.items} today={today} classes={options} />}

        {/* The student's own items always show here, even if /me/classes failed or they've joined nothing yet. */}
        {timeline.ok ? (
          <TimelineView range={range} today={today} day={day} items={timeline.data.items} classes={options} components={components.ok ? components.data : []} />
        ) : (
          <ErrorPanel error={timeline.error} />
        )}

        {!components.ok && <ErrorPanel error={components.error} />}
      </div>
    </AppMain>
  );
}
```

"Join a class" becomes the outline button so that Add my own item is the page's one primary button (UI-STANDARDS §6). If Next up fails to load while the timeline loads, the page shows the timeline without it; the timeline's own failure still shows `ErrorPanel`.

- [ ] **Step 7: Remove the tokens nothing uses**

In `app/globals.css`, search the frontend for each of these before deleting it:

```bash
cd frontend && grep -rn "app-countdown\|app-calendar-dot\|app-calendar-cell\|app-marker" app components lib --include="*.tsx" --include="*.ts"
```

Expected: no matches (the new `Marker` sizes itself). Then delete `--text-app-countdown`, `--text-app-countdown-sm`, `--app-marker`, `--app-marker-sm`, `--app-marker-stroke`, `--app-calendar-dot` and `--app-calendar-cell` from `globals.css`, and reword the "Pack D-4" comment above them to one line: `/* Pack D-4's item-kind markers are shapes; plan timeline-redesign sizes and colours them in timeline-parts.tsx. */`. If anything still matches, keep that token.

- [ ] **Step 8: Everything green again**

Run: `make verify`
Expected: PASS. Type errors here are leftovers from the old shape: a `TimelineItem` built without `done` in another spec, or an import of `personal-item-actions`. Fix each where the compiler points.

- [ ] **Step 9: Look at it**

```bash
make db-up
make backend-run   # one terminal
make frontend-run  # another
```

Sign in as a student and open `/home`. At 1440, 820 and 390 wide, compare each view with its mockup PNG in `docs/design/pilot/timeline-redesign/design/`: the Timeline rail, the Week planner (columns at 1440, rows at 820 and 390), the Month calendar (chips at 1440 and 820, marks at 390), and the drawer. Remove one decoration if a screen looks busy (UI-STANDARDS §15). Note anything that differs and isn't listed under "Where the build differs from the mockup".

- [ ] **Step 10: Commit**

```bash
git add frontend
git commit -m "Rebuild /home as a planner: Next up, the three views behind one shell, Add in the heading"
```

---

### Task 12: The journey, the docs, the checklist and the hand test

**Files:**
- Modify: `frontend/e2e/phase2.e2e.ts`
- Modify: `docs/ARCHITECTURE.md`, `docs/design/UI-STANDARDS.md`, `docs/BACKLOG.md`, `docs/HANDOFF.md`
- Modify: `docs/design/pilot/timeline-redesign/NOTES.md`

- [ ] **Step 1: Update the journey**

In `e2e/phase2.e2e.ts`, in the test "the timeline shows the stage date, the teacher's item and the student's own item, in order", replace everything from `await student.getByRole("button", { name: "Add my own item" }).click();` to the end of the test with:

```ts
  await student.getByRole("button", { name: "Add my own item" }).click();
  const drawer = student.getByRole("dialog", { name: "Add my own item" });
  await expect(drawer.getByText("Only you can see this. Your teachers can't.")).toBeVisible();
  await expectAccessible(student);
  await drawer.getByRole("textbox", { name: "Title" }).fill("Biology class test");
  await drawer.getByLabel("Date").fill("2026-12-02");
  await drawer.getByRole("button", { name: "Test" }).click();
  await drawer.getByRole("combobox", { name: "Class (optional)" }).selectOption({ label: `Biology · ${P2.className}` });
  // Wait for the POST itself to settle before navigating away: a goto while it's still in flight can
  // race the read on /home and land on a page rendered before the item was committed.
  await Promise.all([
    student.waitForResponse((r) => r.url().includes("/me/personal-items") && r.request().method() === "POST"),
    drawer.getByRole("button", { name: "Save item" }).click(),
  ]);

  // The group headings depend on today's date (This week, Next week, or a month), so find rows by their text.
  await student.goto("/home?view=timeline&from=2026-12-01");
  const row = (text: string) => student.getByRole("listitem").filter({ hasText: text }).last();
  await expect(row("Biology class test")).toContainText("Test · Biology · only you");
  await expect(row("Full draft in for feedback")).toContainText("From your teacher · Biology");
  await expect(row("Data Analysis and Conclusions")).toContainText("Stage date · Biology");
  await expect(row("SEC completion date")).toContainText("SEC completion date · Biology");
  await expectAccessible(student);

  // The student's own tick: it saves, and survives a reload.
  await Promise.all([
    student.waitForResponse((r) => r.url().includes("/done") && r.request().method() === "PUT"),
    student.getByRole("checkbox", { name: "Done: Biology class test" }).check(),
  ]);
  await student.reload();
  await expect(student.getByRole("checkbox", { name: "Done: Biology class test" })).toBeChecked();
  await expect(row("Biology class test")).toContainText("Done");

  await student.goto("/home?view=week&from=2026-12-02");
  await expect(student.getByRole("list", { name: "Wed 2 Dec" })).toContainText("Biology class test");
  await expectAccessible(student);

  await student.goto("/home?view=month&from=2026-12-01&day=2026-12-02");
  await expect(student.getByRole("table", { name: "December 2026" })).toBeVisible();
  await expect(student.getByRole("region", { name: /^Wed 2 Dec/ })).toContainText("Biology class test");
  await expectAccessible(student);

  expect(componentUrl).toMatch(/\/components\//);
});
```

The hidden checkbox is `sr-only`; if Playwright's `.check()` reports it isn't visible, click its label instead: `student.getByRole("listitem").filter({ hasText: "Biology class test" }).last().locator("label").first().click()`.

- [ ] **Step 2: Run the journey**

Run: `make e2e`
Expected: PASS on both the `laptop` and `phone` projects, with no axe violations. A contrast violation means a faded or tinted text colour: fix the class, don't loosen the scan.

- [ ] **Step 3: The docs**

`docs/ARCHITECTURE.md`: rewrite the "`/home` … is the student's timeline" bullet to describe what is built. It must say:
- `rangeFor` turns `?view=timeline|week|month&from=<date>` into a range; the timeline runs from this week's Monday (or an explicit `from`) to the end of the school year, and `?view=list` falls back to it.
- The page makes two timeline requests: the view's range (the week plus 28 days for the Week view) and today plus 60 days for `NextUp`.
- `TimelineView` is a shell of links; each view is its own file (`timeline-rail.tsx`, `timeline-week.tsx`, `timeline-month.tsx`), all listing items with `ItemCard`.
- Own items are added and edited in `personal-item-drawer.tsx` (`AddPersonalItem`, `EditPersonalItem`), with Delete inside the form; `DoneTick` and `MarkDoneButton` call `PUT /me/personal-items/{id}/done` optimistically.
- The Month view's picked day is `?day=`.
- Markers are shapes first: navy square, subject-coloured ring, azure diamond.

`docs/design/UI-STANDARDS.md` §5, replace the `--app-pick` / `--app-today` bullet with:

```markdown
- `--app-pick` (azure) means "yours": your pick in the date drawer and the year view (pack D-11), and a student's own item on `/home` (plan timeline-redesign). `--app-today` (gold) means "today" in those places and on `/home`. Neither is a state.
```

And in §3, after the sentence about the two Playwright projects, add: "`/home` is also drawn and hand-checked at 820 (iPad): students use all three."

`docs/BACKLOG.md`: change the `_timeline-redesign_` row's status to "built on `pilot/timeline-redesign`, not merged (<today's date>). Still to do: Tim's hand test, `/self-review` in a fresh session, `docs/changes/timeline-redesign.md`, and the PR into `pilotMain`." Add a new idea row under it:

```markdown
| — | _timeline-teacher-ticks_ (proposed) | Show a student's tick on a teacher's item on `/home` as well as on the component page. The table and endpoint exist (`item_tick`, `PUT /components/{id}/teacher-items/{itemId}/tick`); the timeline union would return the item's id and whether it is ticked | idea only (plan timeline-redesign T-7) |
```

`docs/HANDOFF.md`: say where this session stopped, as usual.

`docs/design/pilot/timeline-redesign/NOTES.md`: add a section "Where the build differs from the mockup" that copies the list from the end of this plan.

- [ ] **Step 4: The checklist**

Go through `docs/design/UI-CHECKLIST.md` for `/home` in all three views and for the drawer. Fix what fails.

- [ ] **Step 5: Verify and commit**

```bash
make verify && make e2e
git add frontend/e2e docs
git commit -m "Timeline redesign: the journey, the architecture and UI standards, the backlog"
```

- [ ] **Step 6: The hand test, for Tim**

Give Tim this list. Each line is one of the intent's success checks, at 1440, 820 and 390 wide:

1. Open `/home`. Next up names the next thing not done, with its date on the leaf (gold if it's today).
2. Week view: say what is due this week without scrolling.
3. Add "French test, tomorrow": the header button, the title, Test, Tomorrow, Save. It appears on tomorrow.
4. Tick it done: it strikes through at once, and Next up moves on. Reload: it is still ticked.
5. Untick it. Edit it from its Edit button, then delete it from inside the drawer (confirm first).
6. Week view: Add on Saturday opens the drawer on Saturday's date.
7. Month view: click a day; its items list underneath. A chip for a coursework date opens the component.
8. Timeline view: every stage date up to the SEC completion date is on the page. Show earlier brings September back.
9. Previous, Next and Today work in Week and Month, and the browser's Back button undoes each.
10. Keyboard only: Tab reaches the view links, the arrows, every tick, Edit and Add; Escape closes the drawer and focus returns to the button that opened it.

Then the usual close: `/self-review` in a fresh session, `write-changes` to `docs/changes/timeline-redesign.md`, and Tim opens the PR into `pilotMain`.

---

## Where the build differs from the mockup

| Mockup | Build | Decision |
|---|---|---|
| The drawer comes up from the bottom on a phone | It slides from the right at every width, full width on a phone | T-12 |
| A "Your coursework" side card with a "3 of 6 stages signed off" bar | "Completion dates" (as today) and the key to the marks | T-13 |
| The picked day's list shows on a phone only | It shows at every width | T-14 |
| Faded chips on the days outside the month | Those days show a greyed number only | T-15 |
| Three summary chips above the week, one reading "Stage 4 is in 21 days" | One sentence | T-16 |
| Every own item has an Edit button | On a week card the title is the Edit button | T-17 |
| The first field is labelled "What is it?" | "Title" | T-18 |
| Past items at 62% opacity | Grey text | T-21 |
| "Nothing for four weeks, over Christmas." between two months | Not built: the month headings already show the gap | — |
| A teacher item's chip in the month has a pale teal ground (`#EEF6F7`) | White with the subject's edge and a grey border | No new colour |
| Five values in `mock.css` that are not tokens: `#EEF6F7`, `#C9DFEF`, `#FFFBEF`, `#06456E`, `#6B4A00` | Tokens with an opacity modifier or an existing token: `border-app-pick/25`, `bg-app-today/10`, `text-app-ink` | No new colour |
| "Stage 4 of 6" on a stage date | "Stage 4": the timeline API doesn't say how many stages there are | — |
| A stage date in the month reads "Stage 4 date" on a navy chip | The same | — |

## Not in this plan

- Ticking a teacher's item from `/home` (T-7; the `_timeline-teacher-ticks_` idea).
- Times of day, reminders, repeating items, new kinds of own item.
- A year line per subject.
- Sign-off counts on `/me/components`.
- Any change to what a teacher sees.
- The student's component page.
