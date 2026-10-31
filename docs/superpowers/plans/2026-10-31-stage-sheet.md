# Stage sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** on the teacher's Component tab, clicking a stage opens a right-hand sheet with the stage's date, the official guideline text and prompts, the stage's items (added and edited there) with who has ticked them, the checkpoint's sign-off counts, and the teacher's own note for students, which students then see above the official text.

**Architecture:** three parts on one branch, each tested by hand before the next. **Part 1** (frontend, plus two fields on the teacher's stage data): a `StageSheet` drawer holding `StageItems` and the date calendar, which is pulled out of `DatePickerDrawer` as `DatePickerPanel` so the sheet can swap to it in place; `StageDatesForm` keeps only the teacher's edits over the saved dates, so the sheet's one-stage save doesn't wipe other rows. **Part 2**: the existing progress grid gains `itemTicks`, and the Component tab loads the grid alongside the component. **Part 3**: a `stage_note` table, `PUT`/`DELETE …/stages/{stageId}/note`, a note form with a live preview in the sheet, and the note in the student's stage card.

**Tech Stack:** Spring Boot (JdbcClient, Flyway), Postgres 18, Next.js 15.3.9, React 19, Base UI drawer (shadcn `base-nova`), Tailwind with `--app-*` tokens, JUnit + Testcontainers + `ApiSession`, `node --test`, Vitest + Testing Library, Playwright.

**Intent:** `docs/intent/stage-sheet.md` (confirmed 31 Oct 2026). **Design:** built straight from the mockups in `docs/design/pilot/stage-sheet/design/` (`explore-one-drawer`, `explore-stage-rows`, `explore-sheet-date`), no Claude Design pack (Tim, 31 Oct 2026). Where the mockups show no state, this plan says what to build.

**Branch:** `pilot/stage-sheet` from `pilotMain`, one PR at the end (Tim, 31 Oct 2026). Diff base `pilotMain`.

## Global Constraints

- Test first: watch each test fail, then make it pass (root `CLAUDE.md`). `make verify` green before every commit; `make e2e` green at the end of each part.
- The official stage description and prompts are shown exactly as stored. Never edited, hidden or reworded.
- No uploads, no file columns. Links in notes are stored as text and never fetched by the server.
- All authorisation in Spring; every new or changed endpoint starts with `ComponentService.owned` / `requireOwned`. Out of scope is 404, never 403.
- Zod schemas in `frontend/lib/api/schemas.ts` change in the same commit as the Java record they mirror.
- Next.js stays on 15.3.9. App routes stay behind `APP_ENABLED`.
- shadcn first; restyle to `--app-*`; never put a custom `--text-*` size and a `text-*` colour through one `cn()` call (UI-STANDARDS §2).
- Specs query by role and accessible name. Lean tests: a few cases proving the changed behaviour.
- Note text: at most **1,000** characters, blank refused. Only `http://` and `https://` addresses become links.
- "Note updated" shows for **7** days after a note changes, worked out from the note's date. Nothing new is recorded about students.
- Keep `docs/ARCHITECTURE.md` true in the same commit as any change it describes.

---

## Decisions made

From brainstorming and the interview (`docs/intent/stage-sheet.md`), settled:

| # | Question | Answer |
|---|---|---|
| S-1 | Can the teacher change the official description? | No. They add their own note, shown alongside it. |
| S-2 | Can the teacher hide the official description? | No. |
| S-3 | What goes in the sheet? | The date, the note, the official text, the checkpoint with sign-off counts, the stage's items with who ticked them, the prompts (folded). Not report sections. A student preview is a later backlog row (`student-preview`). |
| S-4 | Does it fit one drawer? | Yes: three views (at rest; picking a date, the calendar taking over the sheet; an item opened in place). No second drawer. |
| S-5 | Does the page keep its item list? | No. Items live in the sheet; each row shows its item letters and a "Your note" chip. |
| S-6 | Where is a stage date changed? | On the row and in the sheet, sharing one unsaved draft. |
| S-7 | How does the sheet save a date? | **Save this date**, that stage only. **Save dates** stays on the page. No rewrite to per-stage saving. |
| S-8 | Note format? | Plain text, line breaks kept, 1,000 characters. `http(s)` links clickable, new tab. Only the text stored. |
| S-9 | Extras on the note? | "Updated" tag for students for 7 days, from the note's date; a live preview under the box. |
| S-10 | When is a stage opened? | Both when planning and in the week a stage runs. |
| S-11 | Build order? | The sheet → who ticked → the note. |
| S-12 | Success? | The intent's three hand tests. |
| S-13 | Design source? | The mockups, no Claude Design pack. |
| S-14 | PRs? | One branch, one PR at the end. |

The agent's calls from the session, unchallenged (intent, "The agent's calls"): the note sits above the official text headed "Note from your teacher"; Save note; names as on Progress; the counts link to Progress; `?stage=N` in the address; full screen on a phone.

Made while writing this plan. **Tim: confirm or change S-15 to S-29.**

| # | What happens | Why it matters to you |
|---|---|---|
| S-15 | Ticks come with the **existing progress grid**: `GET /components/{id}/progress` gains `itemTicks: [{itemId, studentIds}]`. The Component tab loads the grid alongside the component (`Promise.all`). No new endpoint. | One request gives names, checkpoint states and ticks. The grid is already behind `requireOwned` and `SignoffScopeTest`, so there's no new door to guard. The Progress page gets a few more bytes it ignores. |
| S-16 | Only **approved** students' ticks, and only on **active** items. A removed student's tick stays in the table but isn't returned. | Matches who the grid shows. A test proves the removed student's tick is left out. |
| S-17 | An item in the sheet is a button that opens it in place; the edit form keeps the word **Retire** (confirmed in place, "Retire item" / "Keep"), as the old list did. | Same words as before, so nothing to relearn. |
| S-18 | `?stage=N` is written with the browser's own `history.pushState`, not `router.push`; a `popstate` listener closes or opens the sheet. Opening a sheet from the URL comes from the page's `searchParams`. | `router.push` would re-run the server page (two API calls) on every open. Next 15 keeps its router in step with native `pushState` (supported since 14.1). Back closes the sheet. |
| S-19 | **Escape closes the whole sheet**, even from the calendar view. "‹ Back to Stage 2" returns to the rest of the sheet. | Base UI's dialog owns Escape; intercepting it means depending on its close-reason API. A keyboard user still has Back. |
| S-20 | Names and counts in the sheet follow the Progress tab's **Hide names** (the same cookie, the same blur via `data-private`). | The Component tab may be projected (the year view is a natural thing to show a class); names only appear inside an opened item, but they shouldn't appear on a projector if you've asked for them hidden. |
| S-21 | **Unsaved note text survives closing the sheet**: it's kept in the page beside the dates' draft and counts for the leave-page warning. | A scrim click or Escape would otherwise throw away a paragraph you'd typed. Pack D-5's "nothing is lost". |
| S-22 | When a saved note's box is emptied, **Save note becomes Remove note**. | Says what the button will do. |
| S-23 | The student's tag reads **"Note updated"**, not "Updated". | "Updated" alone could mean the dates changed. |
| S-24 | `PUT /components/{id}/stages/{stageId}/note` `{text}` → `{text, updatedOn}`; `DELETE` → 204. A stage outside the component's template is **404** (it's in the path); blank or over 1,000 is `VALIDATION_FAILED`. | Mirrors teacher items (`DELETE` → 204). |
| S-25 | The mockup's source line under the official text ("NCCA Business guidelines, p. 5") is **left out**. | `source_ref` isn't in the API; adding it is beyond this feature. The heading still says "From the guidelines". |
| S-26 | Only `http(s)` addresses become links; trailing `.,;:!?)` isn't part of the link; each link says "(opens in a new tab)" to screen readers. Rendered as React elements, never as HTML. | `javascript:` can't become a link, and nothing a teacher types can inject markup. |
| S-27 | The counts line: `SIGNED_OFF` = "signed off", `READY` = "waiting for you" (a link to the Progress tab, where the waiting list is), `DUE` and `NOT_DUE` together = "not yet". | Three numbers, one line. |
| S-28 | Ticked and not-ticked names are full names, sorted by surname then first name. | Easy to scan for one student. |
| S-29 | The sheet's date box is labelled **"Stage date"**, not "Stage 2 date". | "Stage 2 date" belongs to the row's box; two controls with one name confuse a screen reader and the tests. |

Made while building (31 Oct 2026, Tim away), mostly from code review between tasks. **Tim: confirm or change these too.**

| # | What happens | Why it matters to you |
|---|---|---|
| S-30 | The item form's date help starts with **"Letters follow the date, so they change when a date does."** | The deleted page list said it; nothing else did. Without it, item B turning into A after a date change is a surprise. |
| S-31 | When an item's form closes, focus goes somewhere: back to the item's row after Save or Cancel, to "Add an item to Stage N" after a new item or Retire item. | The button you pressed disappears with the form; without this a keyboard user lands at the top of the sheet. |
| S-32 | After **Save this date** or **Undo**, focus goes to the date box, and "Stage 2's date saved." shows at once (the Save row hides as soon as the save succeeds, not when the page catches up). | Both buttons disappear when the date stops being unsaved. And for one round trip after a save the button used to come back enabled with no status. |
| S-33 | The calendar view in the sheet doesn't repeat the stage name above "Choose the Stage 2 date" (an item's still says "Item B · Stage 2"). The "‹" in "Back to Stage 2" is hidden from screen readers. | The sheet's header already names the stage, directly above. |
| S-34 | **Save this date is refused while another stage's saved date is after the completion date** (after the SEC moves it earlier). The refusal names that stage; Save dates on the page fixes them together. | `PUT …/stage-dates` replaces every date, and a stage left out is cleared, so the sheet has to send the late ones too. Fixing it means a one-stage endpoint: say if you want that. |
| S-35 | Each item in the sheet is one button whose name includes its letter: "B Bring three questions 6 Oct 2026". | The old list hid the letter from screen readers because it had separate Edit buttons. Here the letter is how the calendar's eyebrow names the item ("Item B"). |

Built differently from this plan's code, with no change to what you see: the Zod prompt shape is one shared `promptSchema` for both stage schemas (Task 1); `DatePickerPanel` drops a `days` ref nothing read (Task 3); `StageDatesForm`'s saved-dates memo is `savedDates`, because `saved` was already a count (Task 6); `setDate` drops an edit equal to the saved date, so Undo leaves nothing behind; the Retire button stays red on hover; the prompts toggle is 44px tall; the stage rows show a pointer cursor.

---

## Concepts in play

| Concept | What it is | Why it fits here | Where this repo already uses it |
|---|---|---|---|
| Lifting state up | State two components show lives in their common parent and goes down as props plus a setter | The row and the sheet show the same unsaved date | `components/app/stage-dates-form.tsx` (`draft` feeds the rows, the year view and every date drawer) |
| Store the edits, not a copy | Keep only what the user changed (`{s4: "2026-10-16"}`) and work out the rest (`{...saved, ...edits}`); after a save, drop the edits that now match | A one-stage save must not wipe other rows' unsaved dates. Today's full copy, reset after every save, does | New here; replaces `useEffect(() => setDraft(initial), [initial])` in `stage-dates-form.tsx` |
| Stretched link | A button's `::after` is absolutely positioned over its whole row, so the row is the click target; anything that must stay separately clickable sits above it (`relative z-10`) | The stage name opens the sheet; the date box in the same row still opens the date drawer. No button inside a button | New here. The student's `StageCard` wraps its whole header in one button, which works only because nothing else in it is clickable |
| Native history with the App Router | `window.history.pushState` / `replaceState` update the URL without a server round trip; Next 15 keeps its router in step | `?stage=2` without re-running the server page | New here. The Progress page reads `?stage=` on the server (`app/(app)/teach/classes/[id]/progress/page.tsx`) |
| State from the previous render | `if (stage && stage !== shown) setShown(stage)` during render: React's documented way to remember a prop's last value | The sheet keeps showing the stage while it slides closed, after the parent has set it to null | New here |
| Base UI drawer focus | `initialFocus` and `finalFocus` say where focus goes on open and close; a modal drawer traps focus | Open on the title, return to the stage name that opened it | `components/app/request-drawer.tsx` (`initialFocus={title}`), `date-picker-drawer.tsx` (`finalFocus={box}`) |
| Parallel loads in a server component | `Promise.all([attempt(a), attempt(b)])` starts both requests at once; each result is its own `Attempt` | The grid and the component load together; a failed grid blanks one section, not the page | `attempt()` in `lib/app/attempt.ts`; new as a pair |
| Upsert | `INSERT … ON CONFLICT (key) DO UPDATE` writes or replaces in one statement | One note per stage per component | `ItemTickRepository.set` |
| A persistent live region | A `role="status"` element that is always rendered and whose text changes, so screen readers announce the change | "Stage 2's date saved." | `date-picker-drawer.tsx` (`aria-live="polite"` readout) |
| Text to links without HTML | Split text into text and link parts with an allow-listed pattern, render each as a React element | Clickable links with no injection risk | New here. The log shows text as typed (`whitespace-pre-wrap`, `log-history.tsx`) |

---

## File structure

**Part 1: the sheet, dates and items**

| File | Change | Responsibility |
|---|---|---|
| `backend/…/components/application/ComponentViews.java` | Modify | `SetupStage` gains `description`, `prompts` |
| `backend/…/components/application/ComponentService.java` | Modify | `teacherView` fills them |
| `backend/src/test/…/components/adapter/web/TeacherStageGuidanceTest.java` | Create | The teacher sees what students are told |
| `frontend/lib/api/schemas.ts` | Modify | `setupStageSchema` mirrors it |
| `frontend/lib/app/stage-sheet.ts` (+ `.test.ts`) | Create | `dropSaved`, `oneStageDates`, `stageFromParam`, `stageItems`, `DateRequest` |
| `frontend/components/app/date-picker-panel.tsx` | Create | The calendar body pulled out of `DatePickerDrawer`, plus `pickedDay` |
| `frontend/components/app/date-picker-drawer.tsx` | Modify | Drawer + header around `DatePickerPanel`; `aria-haspopup` optional on the opener |
| `frontend/components/app/stage-items.tsx` (+ `.spec.tsx`) | Create | One stage's items: list, open in place, add, edit, retire |
| `frontend/components/app/stage-sheet.tsx` (+ `.spec.tsx`) | Create | The right-hand sheet and its two views |
| `frontend/components/app/stage-dates-form.tsx` (+ `.spec.tsx`) | Modify | Edits-only draft, Save this date, stage names open the sheet, item letters on rows, `?stage=` |
| `frontend/components/app/teacher-items.tsx` (+ `.spec.tsx`) | Delete | Replaced by `StageItems` in the sheet |
| `frontend/app/(app)/teach/classes/[id]/component/page.tsx` | Modify | Passes `?stage=` |
| `frontend/e2e/helpers.ts`, `frontend/e2e/phase2.e2e.ts` | Modify | `setSheetDate`; the item is added through the sheet |

**Part 2: who ticked, and the checkpoint counts**

| File | Change | Responsibility |
|---|---|---|
| `backend/…/components/adapter/persistence/ItemTickRepository.java` | Modify | `tickedBy(componentId)` |
| `backend/…/progress/application/ProgressViews.java`, `ProgressService.java` | Modify | `ItemTicks`; `Grid.itemTicks`, approved students only |
| `backend/src/test/…/progress/adapter/web/ProgressGridTest.java` | Modify | One case |
| `frontend/lib/api/schemas.ts`, `lib/app/progress.test.ts`, `components/app/progress-grid.spec.tsx` | Modify | `itemTicks` in the schema and the two grid fixtures |
| `frontend/lib/app/stage-sheet.ts` (+ `.test.ts`) | Modify | `checkpointCounts`, `tickLists` |
| `frontend/app/(app)/teach/classes/[id]/component/page.tsx` | Modify | Loads the grid alongside; reads Hide names |
| `frontend/components/app/stage-dates-form.tsx`, `stage-sheet.tsx`, `stage-items.tsx` (+ specs) | Modify | Counts line, tick counts, name lists, the failure line, Hide names |
| `frontend/e2e/phase2.e2e.ts` | Modify | The teacher sees the student's tick |

**Part 3: the teacher's note**

| File | Change | Responsibility |
|---|---|---|
| `backend/src/main/resources/db/migration/V14__stage_notes.sql` | Create | `stage_note` |
| `backend/…/components/domain/StageNote.java` | Create | The record |
| `backend/…/components/adapter/persistence/StageNoteRepository.java` | Create | Read, upsert, delete |
| `backend/…/components/application/ComponentViews.java`, `ComponentService.java` | Modify | `NoteView`; `note` on both stage views; `setNote`, `clearNote` |
| `backend/…/components/adapter/web/StageNoteRequest.java`, `ComponentController.java` | Create / Modify | The two endpoints |
| `backend/src/test/…/components/adapter/web/StageNoteTest.java` | Create | Set, change, clear, refuse, student sees it |
| `backend/src/test/…/components/authz/ComponentScopeTest.java`, `application/ComponentServiceOwnedTest.java` | Modify | Scope rows; the constructor's new argument |
| `frontend/lib/api/schemas.ts` | Modify | `noteSchema`; `note` on both stage schemas |
| `frontend/lib/app/note-text.ts` (+ `.test.ts`) | Create | `noteParts`, `recentlyUpdated`, `NOTE_MAX` |
| `frontend/components/app/note-text.tsx` (+ `.spec.tsx`) | Create | Note text with links |
| `frontend/components/app/stage-note-form.tsx` (+ `.spec.tsx`) | Create | The note box, preview, Save / Remove note |
| `frontend/components/app/stage-sheet.tsx`, `stage-dates-form.tsx` (+ specs) | Modify | The note section; note drafts in the page; the row chip |
| `frontend/components/app/stage-card.tsx`, `stages-section.tsx`, `component-overview.tsx` (+ specs) | Modify | The student sees the note and "Note updated" |
| `frontend/e2e/phase2.e2e.ts` | Modify | Teacher writes a note; student sees it |
| `docs/ARCHITECTURE.md`, `docs/PILOT-ROADMAP.md` §6.2 and §7, `docs/BACKLOG.md`, `docs/HANDOFF.md` | Modify | Keep the docs true |

Backend paths shorten `backend/src/main/java/ie/coursework` to `backend/…`.

---

### Task 0: Branch and the planning docs

**Files:** none changed.

- [ ] **Step 1: See what's in the working tree**

Run: `git status --short`

Expected, besides this feature's files (`docs/intent/stage-sheet.md`, this plan, `docs/design/pilot/stage-sheet/`): `docs/BACKLOG.md` and `docs/HANDOFF.md` (the last session's true handoff: three merged features moved to Done; this plan's two backlog rows were added on top), and three edits that aren't this feature's: `docs/design/UI-STANDARDS.md`, `frontend/components/app/styles.ts` and `frontend/lib/app/component-setup.ts`, plus the untracked `draft-list.md`. **Never add those last four.** No task in this plan touches them. Note them in `docs/HANDOFF.md` for Tim.

- [ ] **Step 2: Branch and commit the planning docs**

`git add -p` is interactive and doesn't run here, so BACKLOG and HANDOFF go in whole. Their uncommitted lines are true records of merged work; say so in the final report so Tim can check.

```bash
git switch -c pilot/stage-sheet pilotMain
git add docs/intent/stage-sheet.md docs/superpowers/plans/2026-10-31-stage-sheet.md docs/design/pilot/stage-sheet docs/BACKLOG.md docs/HANDOFF.md
git commit -m "Plan the stage sheet: the intent, the plan and the mockups"
```

Uncommitted files ride along to the new branch untouched; that's expected.

---

## Part 1 — the sheet, dates and items

### Task 1: The teacher sees each stage's official text and prompts

**Files:**
- Modify: `backend/…/components/application/ComponentViews.java` (`SetupStage`)
- Modify: `backend/…/components/application/ComponentService.java` (`teacherView`)
- Create: `backend/src/test/java/ie/coursework/components/adapter/web/TeacherStageGuidanceTest.java`
- Modify: `frontend/lib/api/schemas.ts` (`setupStageSchema`), `frontend/components/app/stage-dates-form.spec.tsx` (fixture)

**Interfaces:**
- Produces: `SetupStage(UUID id, int ordinal, String label, String name, String description, Integer hoursMin, Integer hoursMax, String hoursGroup, boolean supervised, String checkpoint, LocalDate dueDate, List<TeacherItemView> items, List<PromptView> prompts)`; Zod `setupStageSchema` with `description: z.string()` and `prompts: z.array(z.object({ heading: z.string().nullable(), text: z.string() }))`.

- [ ] **Step 1: Write the failing test**

The expected strings come from the template tables, so the test never restates SEC or NCCA content.

```java
package ie.coursework.components.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.ApiSession;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import ie.coursework.support.TestAccounts;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** Stage sheet S-3: the teacher's stage data carries what the student is told (the description and the prompts). */
@AutoConfigureMockMvc
class TeacherStageGuidanceTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    @Test
    void eachStageCarriesItsDescriptionAndPrompts() throws Exception {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        UUID stage1 = components.stageId(ComponentFixtures.BIOLOGY_2027, 1);
        String description = jdbcTemplate.queryForObject("SELECT description FROM template_stage WHERE id = ?", String.class, stage1);
        Integer prompts = jdbcTemplate.queryForObject("SELECT count(*)::int FROM template_prompt WHERE stage_id = ?", Integer.class, stage1);

        new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD)
                .get("/api/v1/components/" + component)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.view").value("TEACHER"))
                .andExpect(jsonPath("$.stages[0].description").value(description))
                .andExpect(jsonPath("$.stages[0].prompts.length()").value(prompts));
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw -q test -Dtest=TeacherStageGuidanceTest`
Expected: FAIL, `No value at JSON path "$.stages[0].description"`.

- [ ] **Step 3: Add the fields**

In `ComponentViews.java`, replace `SetupStage`:

```java
    /** Stage sheet S-3: {@code description} and {@code prompts} are the student's, so the teacher sees what students are told. */
    public record SetupStage(UUID id, int ordinal, String label, String name, String description, Integer hoursMin,
            Integer hoursMax, String hoursGroup, boolean supervised, String checkpoint, LocalDate dueDate,
            List<TeacherItemView> items, List<PromptView> prompts) {}
```

In `ComponentService.teacherView`, read the prompts the way `studentView` does and pass both:

```java
        Map<UUID, List<PromptView>> prompts = templates.prompts(brief.versionId()).stream()
                .collect(Collectors.groupingBy(TemplatePrompt::stageId, LinkedHashMap::new,
                        Collectors.mapping(p -> new PromptView(p.heading(), p.text()), Collectors.toList())));

        List<SetupStage> setup = stages.stream().map(s -> new SetupStage(s.id(), s.ordinal(), s.label(), s.name(),
                s.description(), s.hoursMin(), s.hoursMax(), s.hoursGroup(), s.supervised(), checkpoints.get(s.id()),
                dates.get(s.id()), itemsByStage.getOrDefault(s.id(), List.of()),
                prompts.getOrDefault(s.id(), List.of()))).toList();
```

`warnings(setup, …)` reads only `id`, `ordinal`, `dueDate` and `items`, so it's unchanged.

- [ ] **Step 4: Mirror it in Zod and the fixture**

In `frontend/lib/api/schemas.ts`, `setupStageSchema` gains, after `name`:

```ts
  description: z.string(),
```

and after `items`:

```ts
  prompts: z.array(z.object({ heading: z.string().nullable(), text: z.string() })),
```

In `frontend/components/app/stage-dates-form.spec.tsx`, the `stage` helper gains `description: \`About stage ${n}.\`, prompts: [] as { heading: string | null; text: string }[],` before `...extra`.

- [ ] **Step 5: Run the test and verify**

Run: `cd backend && ./mvnw -q test -Dtest=TeacherStageGuidanceTest` → PASS. Then `make verify` → green.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/ie/coursework/components/application/ComponentViews.java backend/src/main/java/ie/coursework/components/application/ComponentService.java backend/src/test/java/ie/coursework/components/adapter/web/TeacherStageGuidanceTest.java frontend/lib/api/schemas.ts frontend/components/app/stage-dates-form.spec.tsx
git commit -m "The teacher's stage data carries each stage's official description and prompts"
```

---

### Task 2: Pure helpers for the sheet (`lib/app/stage-sheet.ts`)

**Files:**
- Create: `frontend/lib/app/stage-sheet.ts`, `frontend/lib/app/stage-sheet.test.ts`

**Interfaces:**
- Consumes: `letteredItems`, `LetteredItem`, `StageLike` from `lib/app/component-setup.ts`; `Picking` from `lib/app/date-marks.ts`.
- Produces:
  - `dropSaved(edits: Record<string, string>, saved: Record<string, string>): Record<string, string>` (returns `edits` itself when nothing is dropped)
  - `oneStageDates(stages: ReadonlyArray<{ id: string; dueDate: string | null }>, stageId: string, value: string): { stageId: string; dueDate: string | null }[]`
  - `stageFromParam(param: string | null | undefined, stages: ReadonlyArray<{ id: string; ordinal: number }>): string | null`
  - `stageItems(stages: ReadonlyArray<StageLike>, stageId: string): LetteredItem[]`
  - `type DateRequest = { title: string; eyebrow: string; help: string; picking: Picking; value: string; onPick: (iso: string) => void; from: HTMLElement | null }`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { dropSaved, oneStageDates, stageFromParam, stageItems } from './stage-sheet.ts';

const stages = [
  { id: 's1', ordinal: 1, label: 'Stage 1', name: 'One', dueDate: '2026-09-20', items: [{ id: 'i2', text: 'Later', dueDate: '2026-10-08' }] },
  { id: 's2', ordinal: 2, label: 'Stage 2', name: 'Two', dueDate: null, items: [{ id: 'i1', text: 'Sooner', dueDate: '2026-10-06' }, { id: 'i3', text: 'Undated', dueDate: null }] },
];

describe('stage sheet helpers', () => {
  test('dropSaved keeps only the edits that still differ from what is saved', () => {
    const edits = { s1: '2026-09-21', s2: '2026-10-10' };
    assert.deepEqual(dropSaved(edits, { s1: '2026-09-21', s2: '' }), { s2: '2026-10-10' });
    assert.equal(dropSaved(edits, { s1: '', s2: '' }), edits, 'nothing dropped: the same object, so React skips a render');
  });

  test("oneStageDates sends the one stage's new date and every other stage's saved date", () => {
    assert.deepEqual(oneStageDates(stages, 's2', '2026-10-10'), [
      { stageId: 's1', dueDate: '2026-09-20' },
      { stageId: 's2', dueDate: '2026-10-10' },
    ]);
    assert.deepEqual(oneStageDates(stages, 's1', ''), [
      { stageId: 's1', dueDate: null },
      { stageId: 's2', dueDate: null },
    ]);
  });

  test('stageFromParam reads ?stage=N, and ignores anything else', () => {
    assert.equal(stageFromParam('2', stages), 's2');
    assert.equal(stageFromParam('7', stages), null);
    assert.equal(stageFromParam('2x', stages), null);
    assert.equal(stageFromParam(null, stages), null);
  });

  test("stageItems keeps each item's letter from the whole component", () => {
    assert.deepEqual(stageItems(stages, 's2').map((i) => [i.letter, i.text]), [['A', 'Sooner'], ['C', 'Undated']]);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && node --test lib/app/stage-sheet.test.ts`
Expected: FAIL, cannot find module `./stage-sheet.ts`.

- [ ] **Step 3: Write the helpers**

```ts
import { letteredItems, type LetteredItem, type StageLike } from './component-setup.ts';
import type { Picking } from './date-marks.ts';

/**
 * The stage sheet's pure parts (plan stage-sheet). The page keeps only the teacher's edits over the saved dates
 * (Concepts in play, "Store the edits, not a copy"): after any save, an edit that now matches what's saved is done.
 */
export function dropSaved(edits: Record<string, string>, saved: Record<string, string>): Record<string, string> {
  const kept = Object.entries(edits).filter(([id, value]) => value !== (saved[id] ?? ''));
  return kept.length === Object.keys(edits).length ? edits : Object.fromEntries(kept);
}

/** Save this date (S-7). The endpoint replaces every date, so every other stage sends its saved date, not its draft. */
export function oneStageDates(
  stages: ReadonlyArray<{ id: string; dueDate: string | null }>,
  stageId: string,
  value: string,
): { stageId: string; dueDate: string | null }[] {
  return stages.map((s) => ({ stageId: s.id, dueDate: s.id === stageId ? value || null : s.dueDate }));
}

/** `?stage=2` names the open sheet (S-18). */
export function stageFromParam(
  param: string | null | undefined,
  stages: ReadonlyArray<{ id: string; ordinal: number }>,
): string | null {
  if (!param || !/^\d+$/.test(param)) return null;
  return stages.find((s) => s.ordinal === Number(param))?.id ?? null;
}

/** One stage's items. Letters run across the whole component (pack D-5), so they're worked out from every stage. */
export function stageItems(stages: ReadonlyArray<StageLike>, stageId: string): LetteredItem[] {
  return letteredItems(stages).filter((item) => item.stageId === stageId);
}

/** What the sheet's calendar view needs: who asked, for what, and where focus goes back to. */
export type DateRequest = {
  title: string;
  eyebrow: string;
  help: string;
  picking: Picking;
  value: string;
  onPick: (iso: string) => void;
  from: HTMLElement | null;
};
```

- [ ] **Step 4: Run them to see them pass**

Run: `cd frontend && node --test lib/app/stage-sheet.test.ts` → 4 passing.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/app/stage-sheet.ts frontend/lib/app/stage-sheet.test.ts
git commit -m "Stage sheet helpers: drop saved edits, one-stage dates, ?stage=, a stage's lettered items"
```

---

### Task 3: Pull the calendar body out of the date drawer (`DatePickerPanel`)

A refactor with no change in behaviour: the 10 cases in `date-picker-drawer.spec.tsx` are the test, and they must pass untouched.

**Files:**
- Create: `frontend/components/app/date-picker-panel.tsx`
- Modify: `frontend/components/app/date-picker-drawer.tsx`

**Interfaces:**
- Produces:
  - `DatePickerPanel({ picking, value, marks, completionDate, today, onPick }: { picking: Picking; value: string; marks: ReadonlyArray<DateMark>; completionDate: string; today: string; onPick: (iso: string) => void })`. Its state starts from `value` when it mounts; callers remount it (a `key`) for each opening. Renders the year line, the month, the key and the footer as siblings, for a `flex flex-col` parent.
  - `pickedDay(container: HTMLElement | null): HTMLElement | null`: the selected day's button, else today's, else null.
  - `DateBoxOpener` keeps its name and home in `date-picker-drawer.tsx`, with `"aria-haspopup"` now optional.

- [ ] **Step 1: Run the drawer spec as the baseline**

Run: `cd frontend && npx vitest run components/app/date-picker-drawer.spec.tsx components/app/stage-dates-form.spec.tsx`
Expected: all pass. They're the guard for this task.

- [ ] **Step 2: Create `date-picker-panel.tsx`**

Move, unchanged, everything inside `DatePickerDrawer` that isn't the drawer or its header: the `selected`, `month`, `refused`, `typed`, `typedLeft` state; `choose`, `typeInto`; `range`, `runFrom`, `readout`, `run`, `notADate`, `pinLabel`; and the three JSX blocks (the `YearLine` block, the `days` block with `DateCalendar` and the key, and the footer). Initial state comes straight from props (no `show` reset; the caller remounts). `finish(iso)` becomes `onPick(iso)`.

```tsx
"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { weekdayDate } from "@/lib/app/component-setup";
import { calendarMonths, type DateMark, type Picking, pickReadout, runStart } from "@/lib/app/date-marks";
import { parseTypedDate, typedDate, typedFromInput } from "@/lib/app/typed-date";

import { DateCalendar } from "./date-calendar";
import { MarkTag } from "./mark-tag";
import { YearLine } from "./year-line";

const monthOf = (iso: string) => `${iso.slice(0, 7)}-01`;
const DAY_MONTH = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", timeZone: "UTC" });

/** The day to focus when a calendar opens (C-12): the chosen day, else today. */
export function pickedDay(container: HTMLElement | null): HTMLElement | null {
  return (
    container?.querySelector<HTMLElement>('button[data-selected-single="true"]') ??
    container?.querySelector<HTMLElement>('[data-today="true"] button') ??
    null
  );
}

/**
 * The date calendar's body (plan date-picker-drawer Parts 2–3, pack D-11): the year line, one month, the key and the
 * footer. Pulled out of `DatePickerDrawer` (plan stage-sheet Task 3) so the stage sheet can show it in place of its own
 * content, with no second drawer (S-4). Nothing saves: `Use this date` and `Clear date` hand the day to `onPick`.
 * Its state starts from `value` when it mounts, so callers give it a fresh `key` each time it opens.
 */
export function DatePickerPanel({
  picking,
  value,
  marks,
  completionDate,
  today,
  onPick,
}: {
  picking: Picking;
  value: string;
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  /** The day from `Use this date`, or "" from `Clear date`. */
  onPick: (iso: string) => void;
}) {
  // The panel's own state (C-22): the day tapped, the month in view, a day refused.
  const [selected, setSelected] = useState(value);
  const [month, setMonth] = useState(monthOf(value || today));
  const [refused, setRefused] = useState<string | null>(null);
  const [typed, setTyped] = useState(typedDate(value));
  const [typedLeft, setTypedLeft] = useState(false);
  const days = useRef<HTMLDivElement>(null);
  const typedId = useId();
  const typedNoteId = `${typedId}-note`;

  // … `choose`, `typeInto`, `range`, `runFrom`, `readout`, `run`, `notADate`, `pinLabel`: moved verbatim from
  // date-picker-drawer.tsx …

  return (
    <>
      {/* The YearLine block, moved verbatim. */}
      {/* The `days` block (DateCalendar, the completion-month line, the key), moved verbatim, keeping ref={days}. */}
      {/* The footer block, moved verbatim, with every `finish(x)` replaced by `onPick(x)`. */}
    </>
  );
}
```

The comments mark where the moved code goes, word for word. Don't retype it: cut it from `date-picker-drawer.tsx` and paste it here.

- [ ] **Step 3: Slim `DatePickerDrawer` down to the drawer and its header**

```tsx
"use client";

import { type MouseEvent, type ReactNode, type RefObject, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import type { DateMark, Picking } from "@/lib/app/date-marks";

import { DatePickerPanel, pickedDay } from "./date-picker-panel";

/** What the caller spreads onto its date button so that it opens the calendar. */
export type DateBoxOpener = {
  ref: RefObject<HTMLButtonElement | null>;
  /** Set when the button opens a dialog; the stage sheet's boxes swap the sheet's view instead (S-4). */
  "aria-haspopup"?: "dialog";
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * The right-hand calendar drawer (plan date-picker-drawer, Parts 2 and 3; pack D-11), opened by the caller's own date
 * button. The calendar itself is `DatePickerPanel`; this is the drawer, its header, and focus in and out.
 */
export function DatePickerDrawer({
  children, title, eyebrow, help, picking, value, marks, completionDate, today, onPick,
}: {
  // … the props and their comments, unchanged …
}) {
  const [open, setOpen] = useState(false);
  // A fresh panel on every opening, so it starts from the box's value (C-22).
  const [opens, setOpens] = useState(0);
  const box = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);

  const show = (next: boolean) => {
    if (next) setOpens((n) => n + 1);
    setOpen(next);
  };
  const opener: DateBoxOpener = { ref: box, "aria-haspopup": "dialog", onClick: () => show(true) };

  return (
    <Drawer swipeDirection="right" open={open} onOpenChange={show}>
      {children(opener)}
      <DrawerContent initialFocus={() => pickedDay(content.current) ?? true} finalFocus={box}>
        {/* The header block (eyebrow, DrawerTitle, DrawerDescription, Close), unchanged. */}
        <div ref={content} className="flex min-h-0 flex-1 flex-col">
          <DatePickerPanel
            key={opens}
            picking={picking}
            value={value}
            marks={marks}
            completionDate={completionDate}
            today={today}
            onPick={(iso) => {
              onPick(iso);
              setOpen(false);
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 4: Run the baseline again**

Run: `cd frontend && npx vitest run components/app/date-picker-drawer.spec.tsx components/app/stage-dates-form.spec.tsx components/app/teacher-items.spec.tsx`
Expected: all pass, unchanged. If one fails, the move changed behaviour: diff the panel against the old drawer before touching the spec.

- [ ] **Step 5: Verify and commit**

Run: `make verify` → green.

```bash
git add frontend/components/app/date-picker-panel.tsx frontend/components/app/date-picker-drawer.tsx
git commit -m "Pull the date calendar's body out of the drawer as DatePickerPanel, so the stage sheet can show it in place"
```

---

### Task 4: One stage's items (`StageItems`)

**Files:**
- Create: `frontend/components/app/stage-items.tsx`, `frontend/components/app/stage-items.spec.tsx`

**Interfaces:**
- Consumes: `stageItems`, `DateRequest` (Task 2); `DateBox`; `Field`, `FieldGroup`; `api`, `teacherItemSchema`.
- Produces: `StageItems({ componentId, stage, stages, chooseDate }: { componentId: string; stage: StageLike; stages: ReadonlyArray<StageLike>; chooseDate: (request: DateRequest) => void })`. Part 2 adds a `progress` prop.

Behaviour, ported from `teacher-items.tsx` with the stage fixed: one open item at a time; "Add an item to Stage N"; "Save item" / "Cancel"; "Retire" (named `Retire <text>`) then "Retire item" / "Keep". An item's date box calls `chooseDate` instead of opening a drawer.

- [ ] **Step 1: Write the failing spec**

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
import type { DateRequest } from "@/lib/app/stage-sheet";

import { StageItems } from "./stage-items";

const stages = [
  { id: "s1", ordinal: 1, label: "Stage 1", name: "One", dueDate: null, items: [{ id: "i1", text: "Read the brief", dueDate: "2026-09-18" }] },
  { id: "s2", ordinal: 2, label: "Stage 2", name: "Two", dueDate: null, items: [{ id: "i2", text: "Bring three questions", dueDate: "2026-10-06" }] },
];

// The sheet answers a date request by showing its calendar; here the "calendar" picks 8 Oct at once.
const chooseDate = vi.fn((request: DateRequest) => request.onPick("2026-10-08"));

const renderItems = () => render(<StageItems componentId="k1" stage={stages[1]} stages={stages} chooseDate={chooseDate} />);

beforeEach(() => {
  refresh.mockReset();
  chooseDate.mockClear();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("StageItems", () => {
  it("lists only this stage's items, keeping their letters from the whole component", () => {
    renderItems();
    expect(screen.getByRole("button", { name: /^B Bring three questions/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Read the brief")).not.toBeInTheDocument();
  });

  it("adds an item to this stage, its date chosen through the sheet's calendar", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i3", text: "Draft question", dueDate: "2026-10-08" });
    renderItems();
    await userEvent.click(screen.getByRole("button", { name: "Add an item to Stage 2" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Item" }), "Draft question");
    await userEvent.click(screen.getByLabelText("Date (optional)"));
    expect(chooseDate).toHaveBeenCalledWith(expect.objectContaining({ title: "Choose the date for “Draft question”", picking: { kind: "item" } }));
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/components/k1/teacher-items",
      { stageId: "s2", text: "Draft question", dueDate: "2026-10-08" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("opens an item in place to edit it, and retires it only after confirming", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    renderItems();
    await userEvent.click(screen.getByRole("button", { name: /^B Bring three questions/ }));
    expect(screen.getByRole("textbox", { name: "Item" })).toHaveValue("Bring three questions");

    await userEvent.click(screen.getByRole("button", { name: "Retire Bring three questions" }));
    const confirm = screen.getByText("Retire this item? Students won't see it any more.").parentElement!;
    await userEvent.click(within(confirm).getByRole("button", { name: "Retire item" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/teacher-items/i2");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd frontend && npx vitest run components/app/stage-items.spec.tsx`
Expected: FAIL, cannot resolve `./stage-items`.

- [ ] **Step 3: Write `stage-items.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { teacherItemSchema } from "@/lib/api/schemas";
import { formatCalendarDate, type LetteredItem, type StageLike } from "@/lib/app/component-setup";
import { type DateRequest, stageItems } from "@/lib/app/stage-sheet";

import { DateBox } from "./date-box";
import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { eyebrow } from "./styles";

/**
 * One stage's items, in the stage sheet (plan stage-sheet S-5, S-17): the page's separate item list is gone. Each item
 * opens in place; one at a time. Items save one at a time through their own endpoints, outside the dates' batch.
 * An item's date is chosen in the sheet's own calendar view, through `chooseDate`, never a second drawer (S-4).
 */
export function StageItems({
  componentId,
  stage,
  stages,
  chooseDate,
}: {
  componentId: string;
  stage: StageLike;
  stages: ReadonlyArray<StageLike>;
  chooseDate: (request: DateRequest) => void;
}) {
  const router = useRouter();
  const formId = useId();
  const dateBox = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<string | "new" | null>(null);
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [retiring, setRetiring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const items = useMemo(() => stageItems(stages, stage.id), [stages, stage.id]);
  const label = stage.label ?? stage.name;
  const base = `/components/${componentId}/teacher-items`;
  const openItem = items.find((item) => item.id === open);

  function start(item?: LetteredItem) {
    setOpen(item?.id ?? "new");
    setText(item?.text ?? "");
    setDueDate(item?.dueDate ?? "");
    setRetiring(false);
    setError(null);
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setOpen(null);
      setRetiring(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = { text, dueDate: dueDate || null };
    void run(() =>
      open === "new"
        ? api.send("POST", base, { stageId: stage.id, ...body }, teacherItemSchema)
        : api.send("PATCH", `${base}/${open}`, body, teacherItemSchema),
    );
  }

  const form = (
    <form onSubmit={submit} className="flex flex-col gap-3 pt-1 pb-3">
      <FieldGroup>
        <Field id={`${formId}-text`} label="Item">
          {(control) => <input {...control} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />}
        </Field>
        <Field id={`${formId}-date`} label="Date (optional)" help="An item with no date keeps a letter, but stays off the line and the calendar.">
          {(control) => (
            <DateBox
              opener={{
                ref: dateBox,
                onClick: (event) =>
                  chooseDate({
                    title: text.trim() ? `Choose the date for “${text.trim()}”` : "Choose the date for the new item",
                    eyebrow: openItem ? `Item ${openItem.letter} · ${label}` : `New item · ${label}`,
                    help: "Nothing is saved until you press Save item.",
                    picking: { kind: "item" },
                    value: dueDate,
                    onPick: setDueDate,
                    from: event.currentTarget,
                  }),
              }}
              id={control.id}
              value={dueDate}
              describedBy={`${control["aria-describedby"] ?? ""} ${control.id}-value`.trim()}
              className={`${control.className} cursor-pointer`}
            />
          )}
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="header" disabled={busy || !text.trim()}>
          {busy ? "Saving…" : "Save item"}
        </Button>
        <Button type="button" variant="outline" size="header" onClick={() => setOpen(null)}>
          Cancel
        </Button>
        {openItem && (
          <Button
            type="button"
            variant="link"
            size="header"
            onClick={() => setRetiring(true)}
            aria-label={`Retire ${openItem.text}`}
            className="ml-auto text-app-error-hover"
          >
            Retire
          </Button>
        )}
      </div>
      {openItem && retiring && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-app-small text-app-copy">{"Retire this item? Students won't see it any more."}</span>
          <Button
            type="button"
            variant="confirmDestructive"
            size="header"
            disabled={busy}
            onClick={() => void run(() => api.sendNoContent("DELETE", `${base}/${openItem.id}`))}
          >
            Retire item
          </Button>
          <Button type="button" variant="outline" size="header" onClick={() => setRetiring(false)}>
            Keep
          </Button>
        </div>
      )}
    </form>
  );

  return (
    <section aria-labelledby={`${formId}-heading`} className="flex flex-col gap-2">
      <h3 id={`${formId}-heading`} className={`${eyebrow} text-app-muted`}>
        Your items in this stage
      </h3>
      {error && <ErrorPanel error={error} focus />}
      {items.length === 0 && open !== "new" && (
        <p className="text-app-small text-app-muted">No items in this stage yet. Students see your items under the stage and on their timeline.</p>
      )}
      {items.length > 0 && (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id} className="border-t border-app-line first:border-t-0">
              <button
                type="button"
                aria-expanded={open === item.id}
                onClick={() => (open === item.id ? setOpen(null) : start(item))}
                className="grid w-full grid-cols-[26px_1fr_auto] items-baseline gap-x-2.5 gap-y-0.5 rounded-app-inner py-2.5 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span
                  className={`flex size-[26px] items-center justify-center self-center rounded-full font-mono text-app-help font-bold ${
                    item.dueDate ? "border-2 border-app-accent text-app-accent" : "border-2 border-dashed border-app-disabled text-app-muted"
                  }`}
                >
                  {item.letter}
                </span>
                <span className="text-app-base font-semibold text-app-ink">{item.text}</span>
                <span aria-hidden="true" className="font-bold text-app-accent">{open === item.id ? "⌄" : "›"}</span>
                <span className="col-start-2 text-app-small text-app-muted">
                  {item.dueDate ? formatCalendarDate(item.dueDate) : "No date, so not on the line or the calendar"}
                </span>
              </button>
              {open === item.id && form}
            </li>
          ))}
        </ul>
      )}
      {open === "new" ? (
        form
      ) : (
        <div>
          <Button type="button" variant="link" size="header" onClick={() => start()} className="-ml-1.5">
            {`Add an item to ${label}`}
          </Button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `cd frontend && npx vitest run components/app/stage-items.spec.tsx` → 3 passing.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/app/stage-items.tsx frontend/components/app/stage-items.spec.tsx
git commit -m "StageItems: one stage's items, opened in place, with dates chosen through the sheet"
```

---

### Task 5: The sheet (`StageSheet`)

**Files:**
- Create: `frontend/components/app/stage-sheet.tsx`, `frontend/components/app/stage-sheet.spec.tsx`

**Interfaces:**
- Consumes: `DatePickerPanel`, `pickedDay` (Task 3); `StageItems` (Task 4); `DateRequest` (Task 2); `DateBox`; Base UI `Drawer`.
- Produces:

```ts
StageSheet(props: {
  componentId: string;
  stage: Stage | null;            // the open stage; null closes the sheet
  stages: ReadonlyArray<Stage>;   // Stage = TeacherComponent["stages"][number]
  draft: Record<string, string>;  // the page's shared draft (saved + edits)
  onDateChange: (stageId: string, iso: string) => void;
  onSaveDate: (stageId: string) => Promise<void>;  // rejects with ApiError
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
})
```

Part 2 adds `progress`, `classId` and `hideNames`; Part 3 adds `noteDraft` and `onNoteDraft`.

Views: **rest** (the date with Save this date, the official text, the checkpoint, `StageItems`, the folded prompts) and **date** (a `role="group"` named by "Choose the … date", with "‹ Back to Stage N" and `DatePickerPanel`). The rest view stays mounted but `hidden` while the date view shows, so a half-typed item survives the trip to the calendar. Entering the date view focuses the picked day (else today); leaving it returns focus to the box that asked.

- [ ] **Step 1: Write the failing spec**

```tsx
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { ApiError } from "@/lib/api/client";

import { StageSheet } from "./stage-sheet";

const stage = {
  id: "s2", ordinal: 2, label: "Stage 2", name: "Developing a question", description: "Students develop a research question.",
  hoursMin: 1, hoursMax: 2, hoursGroup: null, supervised: false, checkpoint: "Question discussed with the teacher",
  dueDate: "2026-10-10", items: [], prompts: [{ heading: "Prompts", text: "Is it researchable?" }],
};

function renderSheet(props: Partial<Parameters<typeof StageSheet>[0]> = {}) {
  const onDateChange = vi.fn();
  const onSaveDate = vi.fn().mockResolvedValue(undefined);
  render(
    <StageSheet componentId="k1" stage={stage} stages={[stage]} draft={{ s2: "2026-10-10" }} onDateChange={onDateChange}
      onSaveDate={onSaveDate} marks={[]} completionDate="2027-02-26" today="2026-10-01" returnFocus={createRef()}
      onClose={vi.fn()} {...props} />,
  );
  return { onDateChange, onSaveDate };
}

beforeEach(() => vi.clearAllMocks());

describe("StageSheet", () => {
  it("is a dialog named by the stage, with its date, the official text, the checkpoint and the folded prompts", async () => {
    renderSheet();
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    expect(within(sheet).getByLabelText("Stage date")).toHaveTextContent("10/10/2026");
    expect(within(sheet).getByText("Students develop a research question.")).toBeInTheDocument();
    expect(within(sheet).getByText("Question discussed with the teacher")).toBeInTheDocument();
    expect(within(sheet).getByText("Questions students get from the guidelines (1)")).toBeInTheDocument();
  });

  it("swaps to the calendar in the same dialog, and Use this date hands the day back and returns focus to the box", async () => {
    const { onDateChange } = renderSheet();
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    await userEvent.click(within(sheet).getByLabelText("Stage date"));
    const view = within(sheet).getByRole("group", { name: "Choose the Stage 2 date" });
    await userEvent.click(within(view).getByRole("button", { name: /^Friday 16 October 2026/ }));
    await userEvent.click(within(view).getByRole("button", { name: "Use this date" }));

    expect(onDateChange).toHaveBeenCalledWith("s2", "2026-10-16");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    await waitFor(() => expect(within(sheet).getByLabelText("Stage date")).toHaveFocus());
  });

  it("offers Save this date for an unsaved date, and shows a refusal inside the sheet", async () => {
    const refusal = new ApiError(400, { type: "about:blank", title: "Bad", status: 400, code: "COMPLETION_DATE_EXCEEDED", detail: "Stage 2 is after the completion date." });
    const { onSaveDate } = renderSheet({ draft: { s2: "2026-10-17" } });
    onSaveDate.mockRejectedValueOnce(refusal);
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    expect(within(sheet).getByText("not saved")).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole("button", { name: "Save this date" }));

    expect(onSaveDate).toHaveBeenCalledWith("s2");
    expect(await within(sheet).findByText("Stage 2 is after the completion date.")).toBeInTheDocument();
  });
});
```

Check how `ApiError` is constructed in `lib/api/problem.ts` before running. If its constructor differs, build the refusal the way `stage-dates-form.spec.tsx`'s "refuses a whole save" case does, and keep the assertion.

- [ ] **Step 2: Run it to see it fail**

Run: `cd frontend && npx vitest run components/app/stage-sheet.spec.tsx`
Expected: FAIL, cannot resolve `./stage-sheet`.

- [ ] **Step 3: Write `stage-sheet.tsx`**

```tsx
"use client";

import { type RefObject, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { ApiError } from "@/lib/api/client";
import type { TeacherComponent } from "@/lib/api/schemas";
import { hoursLabel, weekdayDate } from "@/lib/app/component-setup";
import type { DateMark } from "@/lib/app/date-marks";
import type { DateRequest } from "@/lib/app/stage-sheet";

import { DateBox } from "./date-box";
import { DatePickerPanel, pickedDay } from "./date-picker-panel";
import { ErrorPanel } from "./error-panel";
import { StageItems } from "./stage-items";
import { eyebrow, lead } from "./styles";

type Stage = TeacherComponent["stages"][number];

const sectionLabel = `${eyebrow} text-app-muted`;

/**
 * The stage sheet (plan stage-sheet; mockups docs/design/pilot/stage-sheet/design/). A right-hand drawer opened from a
 * stage's name on the Component tab. Two views in one drawer (S-4): at rest, and the date calendar in place of the
 * rest, so there's never a second drawer on top. The date is the page's shared draft (S-6); Save this date saves this
 * stage only (S-7). Escape closes the whole sheet, even from the calendar (S-19).
 */
export function StageSheet(props: {
  componentId: string;
  stage: Stage | null;
  stages: ReadonlyArray<Stage>;
  draft: Record<string, string>;
  onDateChange: (stageId: string, iso: string) => void;
  onSaveDate: (stageId: string) => Promise<void>;
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  // Keep showing the last stage while the sheet slides closed: the parent has already set `stage` to null.
  // Setting state during render from a prop is React's documented pattern for "remember the previous value".
  const [shown, setShown] = useState(props.stage);
  if (props.stage && props.stage !== shown) setShown(props.stage);
  const title = useRef<HTMLHeadingElement>(null);

  return (
    <Drawer swipeDirection="right" open={props.stage !== null} onOpenChange={(next) => !next && props.onClose()}>
      <DrawerContent initialFocus={title} finalFocus={props.returnFocus}>
        {shown && <SheetBody key={shown.id} {...props} stage={shown} title={title} />}
      </DrawerContent>
    </Drawer>
  );
}

function SheetBody({
  componentId,
  stage,
  stages,
  draft,
  onDateChange,
  onSaveDate,
  marks,
  completionDate,
  today,
  title,
}: Parameters<typeof StageSheet>[0] & { stage: Stage; title: RefObject<HTMLHeadingElement | null> }) {
  const id = useId();
  const dateBox = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const chooseHeading = useRef<HTMLHeadingElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const [request, setRequest] = useState<DateRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const label = stage.label ?? stage.name;
  const value = draft[stage.id] ?? "";
  const saved = stage.dueDate ?? "";
  const unsaved = value !== saved;
  const boxId = `${id}-date`;
  const whenId = `${id}-when`;

  const changeDate = (iso: string) => {
    setJustSaved(false);
    onDateChange(stage.id, iso);
  };
  const ask = (next: DateRequest) => {
    returnTo.current = next.from;
    setRequest(next);
  };

  // Into the calendar: focus the picked day (else today; else the view's heading). Out of it: back to the box.
  useEffect(() => {
    if (request) {
      (pickedDay(panel.current) ?? chooseHeading.current)?.focus();
      return;
    }
    returnTo.current?.focus();
    returnTo.current = null;
  }, [request]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSaveDate(stage.id);
      setJustSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  const meta = [stage.label, hoursLabel(stage, stages), stage.supervised ? "Supervised in class" : ""].filter(Boolean).join(" · ");

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-app-line px-4 pt-3 pb-3.5 sm:px-6 sm:pt-[18px] sm:pb-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          {meta && <p className="text-app-small text-app-muted">{meta}</p>}
          <DrawerTitle ref={title} tabIndex={-1} className="text-[20px] leading-[1.25] text-balance sm:text-app-section">
            {stage.name}
          </DrawerTitle>
        </div>
        <DrawerClose render={<Button type="button" variant="outline" />}>Close</DrawerClose>
      </div>

      <div hidden={request !== null} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        <div className="border-b border-app-line py-4">
          <label htmlFor={boxId} className={sectionLabel}>Stage date</label>
          <div className="mt-2">
            <DateBox
              opener={{
                ref: dateBox,
                onClick: (event) =>
                  ask({
                    title: `Choose the ${label} date`,
                    eyebrow: stage.name,
                    help: "Nothing is saved until you press Save this date.",
                    picking: { kind: "stage", ordinal: stage.ordinal },
                    value,
                    onPick: changeDate,
                    from: event.currentTarget,
                  }),
              }}
              id={boxId}
              value={value}
              describedBy={whenId}
              className={`w-full cursor-pointer py-2.5 pr-2.5 pl-3 hover:border-app-accent hover:bg-app-accent-tint sm:w-[220px] ${unsaved ? "border-dashed border-app-accent" : "border-app-field-border"}`}
            />
          </div>
          <p id={whenId} className="mt-1 text-app-small text-app-muted">
            {value ? weekdayDate(value) : "No date yet"}
            {unsaved && (
              <>
                {" · "}
                <strong className="font-semibold text-app-ink">not saved</strong>
              </>
            )}
          </p>
          {unsaved && (
            <>
              <div className="mt-3 flex items-center gap-2">
                <Button type="button" size="header" disabled={busy} onClick={() => void save()}>
                  {busy ? "Saving…" : "Save this date"}
                </Button>
                <Button type="button" variant="link" size="header" onClick={() => changeDate(saved)}>
                  Undo
                </Button>
              </div>
              <p className="mt-2 text-app-small text-app-grey">
                {`Saves ${label}'s date only. Other dates you've changed on the page stay unsaved until you press Save dates there.`}
              </p>
            </>
          )}
          {/* Always rendered, so the change of text is announced (Concepts in play, "A persistent live region"). */}
          <p role="status" className="mt-2 text-app-small font-semibold text-app-approved">
            {justSaved && !unsaved ? `${label}'s date saved.` : ""}
          </p>
          {error && (
            <div className="mt-3">
              <ErrorPanel error={error} focus />
            </div>
          )}
        </div>

        <section aria-labelledby={`${id}-official`} className="border-b border-app-line py-4">
          <h3 id={`${id}-official`} className={sectionLabel}>From the guidelines</h3>
          <p className={`mt-2 ${lead}`}>{stage.description}</p>
        </section>

        {stage.checkpoint && (
          <section aria-labelledby={`${id}-checkpoint`} className="border-b border-app-line py-4">
            <h3 id={`${id}-checkpoint`} className={sectionLabel}>Checkpoint</h3>
            <p className="mt-2 rounded-app-inner bg-app-inset px-3 py-2.5 text-app-base text-app-ink">{stage.checkpoint}</p>
          </section>
        )}

        <div className="border-b border-app-line py-4">
          <StageItems componentId={componentId} stage={stage} stages={stages} chooseDate={ask} />
        </div>

        {stage.prompts.length > 0 && (
          <details className="py-4">
            <summary className="cursor-pointer text-app-base font-semibold text-app-accent">
              {`Questions students get from the guidelines (${stage.prompts.length})`}
            </summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
              {stage.prompts.map((prompt, i) => (
                <li key={i} className="text-app-base text-app-copy">
                  {prompt.heading && (i === 0 || stage.prompts[i - 1].heading !== prompt.heading) && (
                    <span className="block text-app-small text-app-grey">{prompt.heading}</span>
                  )}
                  {prompt.text}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {request && (
        <div role="group" aria-labelledby={`${id}-choose`} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-app-line px-4 pt-2 pb-3 sm:px-6">
            <Button type="button" variant="link" size="header" onClick={() => setRequest(null)} className="-ml-1.5">
              {`‹ Back to ${label}`}
            </Button>
            <p className="text-app-small text-app-muted">{request.eyebrow}</p>
            <h3 id={`${id}-choose`} ref={chooseHeading} tabIndex={-1} className="font-heading text-app-title font-bold text-app-ink">
              {request.title}
            </h3>
            <p className="text-app-small text-app-grey">{request.help}</p>
          </div>
          <div ref={panel} className="flex min-h-0 flex-1 flex-col">
            <DatePickerPanel
              picking={request.picking}
              value={request.value}
              marks={marks}
              completionDate={completionDate}
              today={today}
              onPick={(iso) => {
                request.onPick(iso);
                setRequest(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
```

`Parameters<typeof StageSheet>[0]` reuses the props type, so it can't drift. If tsc rejects the spread of `onClose` / `returnFocus` into `SheetBody` (unused there), destructure them out in `StageSheet` before spreading.

- [ ] **Step 4: Run it to see it pass**

Run: `cd frontend && npx vitest run components/app/stage-sheet.spec.tsx` → 3 passing.

If the calendar's day names differ from `Friday 16 October 2026` (they come from `dayName` in `lib/app/date-marks.ts`), match the spec to `dayName`'s format; don't change `dayName`.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/app/stage-sheet.tsx frontend/components/app/stage-sheet.spec.tsx
git commit -m "StageSheet: the right-hand stage sheet, with its date, official text, checkpoint, items and the calendar in place"
```

---

### Task 6: The page opens the sheet; the item list goes

**Files:**
- Modify: `frontend/components/app/stage-dates-form.tsx`, `frontend/components/app/stage-dates-form.spec.tsx`
- Modify: `frontend/app/(app)/teach/classes/[id]/component/page.tsx`
- Delete: `frontend/components/app/teacher-items.tsx`, `frontend/components/app/teacher-items.spec.tsx`

**Interfaces:**
- Consumes: `StageSheet` (Task 5); `dropSaved`, `oneStageDates`, `stageFromParam`, `stageItems` (Task 2).
- Produces: `StageDatesForm({ component, today, initialStage }: { component: TeacherComponent; today: string; initialStage?: string | null })`.

- [ ] **Step 1: Write the failing spec cases**

Add to `stage-dates-form.spec.tsx` (it already mocks `useRouter` and `api`):

```tsx
  it("opens a stage's sheet from its name, and shows the stage's item letters on the row", async () => {
    render5(component({ stages: [stage(3, "2026-09-25", { items: [{ id: "i1", text: "Plan draft", dueDate: "2026-09-20" }] }), stage(4, null)] }));
    expect(screen.getByText("1 item")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Name 3" }));
    expect(await screen.findByRole("dialog", { name: "Name 3" })).toBeInTheDocument();
    expect(window.location.search).toBe("?stage=3");
  });

  it("saving one stage in its sheet keeps another row's unsaved date", async () => {
    const saved = component({ stages: [stage(3, "2026-09-25"), stage(4, null), stage(5, "2026-11-27")] });
    vi.mocked(api.send).mockResolvedValue(saved);
    const { rerender } = render(<StageDatesForm component={component({ stages: [stage(3, "2026-09-25"), stage(4, null), stage(5, null)] })} today={TODAY} />);
    await setDate("Stage 4 date", "2026-10-16");

    await userEvent.click(screen.getByRole("button", { name: "Name 5" }));
    const sheet = await screen.findByRole("dialog", { name: "Name 5" });
    await userEvent.click(within(sheet).getByLabelText("Stage date"));
    const field = within(sheet).getByRole("textbox", { name: "Type a date" });
    await userEvent.type(field, "27112026");
    await userEvent.keyboard("{Enter}");
    await userEvent.click(within(sheet).getByRole("button", { name: "Save this date" }));

    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/stage-dates", {
      dates: [{ stageId: "s3", dueDate: "2026-09-25" }, { stageId: "s4", dueDate: null }, { stageId: "s5", dueDate: "2026-11-27" }],
    }, expect.anything());
    rerender(<StageDatesForm component={saved} today={TODAY} />);
    expect(screen.getByLabelText("Stage 4 date")).toHaveTextContent("16/10/2026");
  });
```

Add a `beforeEach` line resetting the address so one case's `?stage=` doesn't leak: `window.history.replaceState(null, "", "/");`.

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && npx vitest run components/app/stage-dates-form.spec.tsx`
Expected: the two new cases FAIL (no button named "Name 3"; no "1 item").

- [ ] **Step 3: Keep only the edits (the draft)**

In `stage-dates-form.tsx`, replace the `initial` memo, the `draft` state and the `useEffect(() => setDraft(initial), [initial])` line with:

```tsx
  // Only what the teacher changed (Concepts in play, "Store the edits, not a copy"). The draft is worked out from it,
  // so a save that changes one stage's saved date leaves every other row's unsaved date alone (S-7).
  const saved = useMemo(
    () => Object.fromEntries(component.stages.map((s) => [s.id, s.dueDate ?? ""])),
    [component.stages],
  );
  const [edits, setEdits] = useState<Record<string, string>>({});
  useEffect(() => setEdits((current) => dropSaved(current, saved)), [saved]);
  const draft = useMemo(() => ({ ...saved, ...edits }), [saved, edits]);
  const setDate = (stageId: string, value: string) => setEdits((current) => ({ ...current, [stageId]: value }));
```

and in the stage row's props, `onChange={(value) => setDraft((d) => ({ ...d, [stage.id]: value }))}` becomes `onChange={(value) => setDate(stage.id, value)}`.

- [ ] **Step 4: Save this date, and the sheet's open state**

Add after `save`:

```tsx
  /** Save this date, from the sheet (S-7): this stage's draft, every other stage's saved date. */
  async function saveStage(stageId: string) {
    const dates = oneStageDates(component.stages, stageId, draft[stageId] ?? "");
    await api.send("PUT", `/components/${component.id}/stage-dates`, { dates }, teacherComponentSchema);
    setError(null);
    router.refresh();
  }

  // The open sheet is in the address as ?stage=N (S-18), written with the browser's own history so opening a sheet
  // doesn't re-run the server page. Back closes it; a link with ?stage=N opens it.
  const [sheetId, setSheetId] = useState<string | null>(() => stageFromParam(initialStage, component.stages));
  const sheetOpener = useRef<HTMLElement | null>(null);
  const pushed = useRef(false);
  useEffect(() => {
    const sync = () => setSheetId(stageFromParam(new URLSearchParams(window.location.search).get("stage"), component.stages));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [component.stages]);

  function openSheet(stage: Stage, from: HTMLElement) {
    sheetOpener.current = from;
    pushed.current = true;
    window.history.pushState(null, "", `?stage=${stage.ordinal}`);
    setSheetId(stage.id);
  }

  function closeSheet() {
    setSheetId(null);
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }
  const sheetStage = component.stages.find((s) => s.id === sheetId) ?? null;
```

Add `initialStage = null` to the props (`initialStage?: string | null`), `useRef` to the React import, and imports for `StageSheet`, `dropSaved`, `oneStageDates`, `stageFromParam`, `stageItems`.

- [ ] **Step 5: The row: the name opens the sheet, the letters show**

In `StageDateRow`, add props `onOpen: (from: HTMLElement) => void` and `letters: ReadonlyArray<string>`. The row's outer `div` gains `relative` and, when it has no tone, a hover tint: replace `${tone}` in its class string with `${tone || "hover:bg-app-accent-tint"} relative`. Replace the stage name `span` with the stretched button:

```tsx
          {/* Stretched link (Concepts in play): the name's ::after covers the row, so the row opens the sheet; the date
              column sits above it (relative z-10) and keeps its own button. */}
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={(event) => onOpen(event.currentTarget)}
            className="w-fit rounded-app-inner text-left text-app-base font-semibold text-app-ink decoration-app-accent underline-offset-3 after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {stage.name}
            <span aria-hidden="true" className="ml-1.5 font-bold text-app-accent">›</span>
          </button>
```

After the checkpoint line (inside the `problem ? … : <>…</>` branch's fragment), add:

```tsx
              {letters.length > 0 && (
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-app-small text-app-grey">
                  {letters.map((letter) => (
                    <MarkTag key={letter} kind="item">{letter}</MarkTag>
                  ))}
                  {/* Its own element, so "1 item" is findable as text next to the tags. */}
                  <span>{`${letters.length} item${letters.length === 1 ? "" : "s"}`}</span>
                </span>
              )}
```

The date column's wrapper (`<div className="flex flex-none flex-col gap-1 md:items-end">`) gains `relative z-10`.

In the rows' `.map`, pass:

```tsx
                onOpen={(from) => openSheet(stage, from)}
                letters={stageItems(component.stages, stage.id).map((item) => item.letter)}
```

- [ ] **Step 6: Swap the item list for the sheet**

Replace the `<TeacherItems … />` element with:

```tsx
      <StageSheet
        componentId={component.id}
        stage={sheetStage}
        stages={component.stages}
        draft={draft}
        onDateChange={setDate}
        onSaveDate={saveStage}
        marks={marks}
        completionDate={component.brief.completionDate}
        today={today}
        returnFocus={sheetOpener}
        onClose={closeSheet}
      />
```

Remove the `TeacherItems` import. Then delete the old list:

```bash
git rm frontend/components/app/teacher-items.tsx frontend/components/app/teacher-items.spec.tsx
```

- [ ] **Step 7: The page passes `?stage=`**

In `app/(app)/teach/classes/[id]/component/page.tsx`:

```tsx
export default async function ClassComponentPage({ params, searchParams }:
  { params: Promise<{ id: string }>; searchParams: Promise<{ stage?: string }> }) {
  const { id } = await params;
  const { stage } = await searchParams;
```

and `<StageDatesForm component={body.data} today={toIsoDate(dublinToday())} initialStage={stage ?? null} />`.

- [ ] **Step 8: Run the specs, then verify**

Run: `cd frontend && npx vitest run components/app/stage-dates-form.spec.tsx components/app/stage-sheet.spec.tsx components/app/stage-items.spec.tsx` → all pass.

If "saving one stage … keeps another row's unsaved date" fails on the last line, the edits are being reset somewhere. Check that nothing still calls a `setDraft`.

Run: `make verify` → green.

- [ ] **Step 9: Commit**

```bash
git add frontend/components/app/stage-dates-form.tsx frontend/components/app/stage-dates-form.spec.tsx "frontend/app/(app)/teach/classes/[id]/component/page.tsx"
git commit -m "Stage names open the stage sheet, rows show their item letters, and the page's item list goes"
```

---

### Task 7: The journey, the docs, and Part 1's hand test

**Files:**
- Modify: `frontend/e2e/helpers.ts`, `frontend/e2e/phase2.e2e.ts`
- Modify: `docs/ARCHITECTURE.md` §6, `docs/PILOT-ROADMAP.md` §6.2

- [ ] **Step 1: A date helper for the sheet**

In `e2e/helpers.ts`, after `setDate` (add `Locator` to the `@playwright/test` type import):

```ts
/** A date inside the stage sheet: the box swaps the sheet to its calendar (no second dialog); typing and Enter swap back. */
export async function setSheetDate(sheet: Locator, label: string, iso: string) {
  await sheet.getByLabel(label, { exact: true }).click();
  const [year, month, day] = iso.split("-");
  const field = sheet.getByRole("textbox", { name: "Type a date" });
  await field.fill(`${day}${month}${year}`);
  await field.press("Enter");
  await expect(field).toHaveCount(0);
}
```

- [ ] **Step 2: The teacher adds the item through the sheet**

In `phase2.e2e.ts`, import `setSheetDate`, and replace the block from `await teacher.getByRole("button", { name: "Add item", exact: true }).click();` to the end of the first test with:

```ts
  // Stage sheet (plan stage-sheet): the stage's name opens its sheet; the item is added there, its date picked in the
  // sheet's own calendar view.
  const stage6 = "Finalising the Biology in Practice Investigation Report";
  await teacher.getByRole("button", { name: stage6 }).click();
  const sheet = teacher.getByRole("dialog", { name: stage6 });
  await expect(sheet).toContainText("From the guidelines");
  await expect(teacher).toHaveURL(/\?stage=6$/);
  await expectAccessible(teacher);
  await sheet.getByRole("button", { name: "Add an item to Stage 6" }).click();
  await sheet.getByRole("textbox", { name: "Item" }).fill("Full draft in for feedback");
  await setSheetDate(sheet, "Date (optional)", "2026-12-04");
  await sheet.getByRole("button", { name: "Save item" }).click();
  await expect(sheet.getByRole("button", { name: /Full draft in for feedback/ })).toBeVisible();
  await expectAccessible(teacher);
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(teacher).toHaveURL(/\/component$/);
  await expect(teacher.getByText("1 item")).toBeVisible();
});
```

- [ ] **Step 3: Run the journey**

Run: `make e2e`
Expected: green on both projects. The student test still finds "Full draft in for feedback" under Stage 6, unchanged.

- [ ] **Step 4: Keep the docs true**

- `docs/ARCHITECTURE.md` §6, "The teacher's component setup": replace the `TeacherItems` sentence with the stage sheet. Each stage name opens `StageSheet` (`components/app/stage-sheet.tsx`), a right-hand drawer at `?stage=N`, written with `history.pushState`. It holds the date (Save this date saves one stage, sending the others' saved dates), the official description and prompts, the checkpoint, and `StageItems` (one stage's items, which replaced the page's list). The calendar is `DatePickerPanel`, shared with `DatePickerDrawer`, and swaps into the sheet in place. `StageDatesForm` keeps only the teacher's edits (`dropSaved`), not a copy of the dates.
- `docs/PILOT-ROADMAP.md` §6.2, the `/teach/classes/[id]/component` row: "my own items per stage" becomes "a stage sheet per stage (click its name): its date with Save this date, the official description and prompts, the checkpoint, and my own items for that stage". Add "Open a stage's sheet" to its actions.

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/helpers.ts frontend/e2e/phase2.e2e.ts docs/ARCHITECTURE.md docs/PILOT-ROADMAP.md
git commit -m "Prove the stage sheet in the journey, and record it in the architecture and the roadmap"
```

- [ ] **Step 6: Stop for Tim's hand test of Part 1**

Tim runs `make db-up`, `make backend-run` and `make frontend-run`, then checks on a laptop and on a phone-width window:
- Stage 2's name opens its sheet; the address shows `?stage=2`; Back closes it.
- The sheet shows the official text and prompts.
- An item can be added with a date picked in the sheet's calendar, and Retire works.
- A date picked in the sheet shows dashed on the row; Save this date saves only that stage, and another row's unsaved date stays dashed.

**Don't start Part 2 until Tim says Part 1 is right.** Anything he finds goes into "From Tim's testing" in `docs/BACKLOG.md`. *(31 Oct 2026: Tim is away for this build and asked for all three parts in one run. Write this checklist into `docs/HANDOFF.md` as "Hand test, Part 1" and carry on; questions wait for the final report.)*

---

## Part 2 — who ticked each item, and the checkpoint counts

### Task 8: The grid carries each item's ticks

**Files:**
- Modify: `backend/…/components/adapter/persistence/ItemTickRepository.java`
- Modify: `backend/…/progress/application/ProgressViews.java`, `backend/…/progress/application/ProgressService.java`
- Modify: `backend/src/test/java/ie/coursework/progress/adapter/web/ProgressGridTest.java`
- Modify: `frontend/lib/api/schemas.ts`, `frontend/lib/app/progress.test.ts`, `frontend/components/app/progress-grid.spec.tsx`

**Interfaces:**
- Produces: `ItemTickRepository.tickedBy(UUID componentId): Map<UUID, List<UUID>>` (active items only); `ProgressViews.ItemTicks(UUID itemId, List<UUID> studentIds)`; `Grid` gains `List<ItemTicks> itemTicks` (last component); Zod `itemTicksSchema` and `progressGridSchema.itemTicks`.

- [ ] **Step 1: Write the failing test**

Add to `ProgressGridTest`:

```java
    @Test
    void eachItemListsTheApprovedStudentsWhoTickedIt() throws Exception {
        UUID item = components.item(component, components.stageId(BIO, 2), "Bring three questions", null);
        as(ClassFixtures.APPROVED_STUDENT).put("/api/v1/components/" + component + "/teacher-items/" + item + "/tick", "{\"done\":true}")
                .andExpect(status().isOk());
        // A removed student's tick stays in the table (V9 keeps history), but it isn't the grid's to show (S-16).
        jdbcTemplate.update("""
                INSERT INTO item_tick (instance_id, student_user_id, teacher_item_id, done_at, updated_at)
                VALUES (?, ?, ?, now(), now())
                """, component, world.removedStudent(), item);

        as(ClassFixtures.TEACHER1).get("/api/v1/components/" + component + "/progress")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemTicks.length()").value(1))
                .andExpect(jsonPath("$.itemTicks[0].itemId").value(item.toString()))
                .andExpect(jsonPath("$.itemTicks[0].studentIds.length()").value(1))
                .andExpect(jsonPath("$.itemTicks[0].studentIds[0]").value(world.approvedStudent().toString()));
    }
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && ./mvnw -q test -Dtest=ProgressGridTest`
Expected: FAIL, `No value at JSON path "$.itemTicks"`.

- [ ] **Step 3: Read the ticks**

In `ItemTickRepository`:

```java
    /** Stage sheet S-15: who has ticked each active item in the component. Unticked rows and retired items aren't returned. */
    public Map<UUID, List<UUID>> tickedBy(UUID componentId) {
        Map<UUID, List<UUID>> ticked = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT t.teacher_item_id, t.student_user_id FROM item_tick t
                JOIN teacher_item i ON i.id = t.teacher_item_id AND i.retired_at IS NULL
                WHERE t.instance_id = :component AND t.done_at IS NOT NULL
                ORDER BY t.teacher_item_id
                """).param("component", componentId)
                .query(rs -> {
                    ticked.computeIfAbsent(rs.getObject("teacher_item_id", UUID.class), k -> new ArrayList<>())
                            .add(rs.getObject("student_user_id", UUID.class));
                });
        return ticked;
    }
```

(imports `java.util.ArrayList`, `java.util.List`).

- [ ] **Step 4: Put them on the grid**

`ProgressViews`:

```java
    /** Stage sheet S-15, S-16: the approved students who have ticked one active item. Items nobody has ticked are left out. */
    public record ItemTicks(UUID itemId, List<UUID> studentIds) {}

    public record Grid(UUID componentId, UUID classId, String className, LocalDate today, List<GridStage> stages,
            List<GridStudent> students, List<WaitingRequest> waiting, List<ItemTicks> itemTicks) {}
```

`ProgressService`: add `ItemTickRepository ticks` to the constructor (after `DocumentLinkRepository links`) and a `private final ItemTickRepository ticks;` field. In `grid`, before `return`:

```java
        Set<UUID> memberIds = members.stream().map(Member::studentId).collect(Collectors.toSet());
        List<ItemTicks> itemTicks = ticks.tickedBy(component.id()).entrySet().stream()
                .map(e -> new ItemTicks(e.getKey(), e.getValue().stream().filter(memberIds::contains).toList()))
                .filter(t -> !t.studentIds().isEmpty())
                .toList();
```

and add `itemTicks` as the last argument of `new Grid(…)`. Import `ItemTickRepository` and `ProgressViews.ItemTicks`.

- [ ] **Step 5: Mirror it in Zod and the two grid fixtures**

```ts
export const itemTicksSchema = z.object({ itemId: z.string(), studentIds: z.array(z.string()) });
```

`progressGridSchema` gains `itemTicks: z.array(itemTicksSchema),`. In `lib/app/progress.test.ts` (the grid builder, `waiting: [],`) and `components/app/progress-grid.spec.tsx` (`students, waiting: [],`), add `itemTicks: []`.

- [ ] **Step 6: Run and verify**

Run: `cd backend && ./mvnw -q test -Dtest=ProgressGridTest` → PASS. Then `make verify` → green.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/ie/coursework/components/adapter/persistence/ItemTickRepository.java backend/src/main/java/ie/coursework/progress/application/ProgressViews.java backend/src/main/java/ie/coursework/progress/application/ProgressService.java backend/src/test/java/ie/coursework/progress/adapter/web/ProgressGridTest.java frontend/lib/api/schemas.ts frontend/lib/app/progress.test.ts frontend/components/app/progress-grid.spec.tsx
git commit -m "The progress grid lists who has ticked each item, approved students only"
```

---

### Task 9: Counts and ticks in the sheet

**Files:**
- Modify: `frontend/lib/app/stage-sheet.ts` (+ `.test.ts`)
- Modify: `frontend/app/(app)/teach/classes/[id]/component/page.tsx`
- Modify: `frontend/components/app/stage-dates-form.tsx`, `stage-sheet.tsx`, `stage-items.tsx` and their specs

**Interfaces:**
- Consumes: `progressGridSchema`, `fullName` (`lib/app/progress.ts`), `HIDE_NAMES_COOKIE`, `Attempt`.
- Produces:
  - `checkpointCounts(grid: Pick<ProgressGrid, "stages" | "students">, stageId: string): { signedOff: number; waiting: number; notYet: number } | null` (null when the stage has no checkpoint)
  - `tickLists(grid: Pick<ProgressGrid, "students" | "itemTicks">, itemId: string): { ticked: string[]; notYet: string[] }`
  - New props: `StageDatesForm` `progress: Attempt<ProgressGrid>`, `hideNames: boolean`; `StageSheet` `progress`, `classId`, `hideNames`; `StageItems` `progress`.

- [ ] **Step 1: Write the failing helper tests**

Add to `stage-sheet.test.ts`:

```ts
import { checkpointCounts, tickLists } from './stage-sheet.ts';

const student = (studentId: string, firstName: string, lastName: string, state: 'NOT_DUE' | 'DUE' | 'READY' | 'SIGNED_OFF') => ({
  studentId, firstName, lastName, behindBy: 0, lastLogActivityOn: null, daysSinceLastLogActivity: null, documentLink: null,
  cells: [{ checkpointId: 'c2', state, signedOffOn: null }],
});
const grid = {
  stages: [
    { stageId: 's2', ordinal: 2, label: 'Stage 2', name: 'Two', dueDate: null, checkpoint: { id: 'c2', text: 'Discussed' } },
    { stageId: 's6', ordinal: 6, label: 'Stage 6', name: 'Six', dueDate: null, checkpoint: null },
  ],
  students: [student('a', 'Aoife', 'Byrne', 'SIGNED_OFF'), student('b', 'Cian', 'Murphy', 'READY'), student('c', 'Ella', 'Doyle', 'DUE'), student('d', 'Finn', 'Allen', 'NOT_DUE')],
  itemTicks: [{ itemId: 'i1', studentIds: ['b', 'a'] }],
};

describe('stage sheet progress helpers', () => {
  test('checkpointCounts: signed off, waiting (Ready), and the rest as not yet', () => {
    assert.deepEqual(checkpointCounts(grid, 's2'), { signedOff: 1, waiting: 1, notYet: 2 });
    assert.equal(checkpointCounts(grid, 's6'), null);
  });

  test('tickLists: full names, by surname, ticked and not', () => {
    assert.deepEqual(tickLists(grid, 'i1'), { ticked: ['Aoife Byrne', 'Cian Murphy'], notYet: ['Finn Allen', 'Ella Doyle'] });
    assert.deepEqual(tickLists(grid, 'i9').ticked, []);
  });
});
```

Run: `cd frontend && node --test lib/app/stage-sheet.test.ts` → the two new tests FAIL.

- [ ] **Step 2: Write the helpers**

Add to `lib/app/stage-sheet.ts`:

```ts
import type { ProgressGrid } from '@/lib/api/schemas';
import { fullName } from './progress.ts';

export type CheckpointCounts = { signedOff: number; waiting: number; notYet: number };

/** The counts line (S-27). Null for a stage with nothing to sign off (Business Stage 6). */
export function checkpointCounts(grid: Pick<ProgressGrid, 'stages' | 'students'>, stageId: string): CheckpointCounts | null {
  const checkpointId = grid.stages.find((s) => s.stageId === stageId)?.checkpoint?.id;
  if (!checkpointId) return null;
  const counts = { signedOff: 0, waiting: 0, notYet: 0 };
  for (const student of grid.students) {
    const state = student.cells.find((c) => c.checkpointId === checkpointId)?.state;
    if (state === 'SIGNED_OFF') counts.signedOff += 1;
    else if (state === 'READY') counts.waiting += 1;
    else counts.notYet += 1;
  }
  return counts;
}

export type TickLists = { ticked: string[]; notYet: string[] };

/** Who has ticked one item, and who hasn't (S-16, S-28): approved students, full names, by surname. */
export function tickLists(grid: Pick<ProgressGrid, 'students' | 'itemTicks'>, itemId: string): TickLists {
  const ticked = new Set(grid.itemTicks.find((t) => t.itemId === itemId)?.studentIds ?? []);
  const byName = [...grid.students].sort(
    (a, b) => a.lastName.localeCompare(b.lastName, 'en-IE') || a.firstName.localeCompare(b.firstName, 'en-IE'),
  );
  return {
    ticked: byName.filter((s) => ticked.has(s.studentId)).map(fullName),
    notYet: byName.filter((s) => !ticked.has(s.studentId)).map(fullName),
  };
}
```

Run it again → all pass.

- [ ] **Step 3: The page loads the grid alongside the component**

Replace the body of `ClassComponentPage` after `const cls = detail.data;` with:

```tsx
  if (!cls.componentId) {
    const briefs = await attempt(() =>
      serverApi.get(`/briefs?subjectCode=${encodeURIComponent(cls.subjectCode)}`, z.array(briefSummarySchema)));
    return (
      <AppMain width="class">
        <ClassHeader detail={cls} current="component" />
        {briefs.ok ? <CreateComponentForm classId={cls.id} briefs={briefs.data} /> : <div className="mt-6"><ErrorPanel error={briefs.error} /></div>}
      </AppMain>
    );
  }

  // The grid feeds the stage sheet's counts and ticks (S-15). Both start at once; a failed grid blanks those two
  // sections of the sheet, never the page.
  const [body, progress] = await Promise.all([
    attempt(() => serverApi.get(`/components/${cls.componentId}`, teacherComponentSchema)),
    attempt(() => serverApi.get(`/components/${cls.componentId}/progress`, progressGridSchema)),
  ]);
  // Read on the server so names arrive already blurred, as on Progress (plan P4-15, S-20).
  const hideNames = (await cookies()).get(HIDE_NAMES_COOKIE)?.value === "1";

  return (
    <AppMain width="class">
      <ClassHeader detail={cls} current="component" />
      {!body.ok ? (
        <div className="mt-6"><ErrorPanel error={body.error} /></div>
      ) : (
        // The year view needs today's Dublin date; deriving it on the server keeps it off the client's clock.
        <>
          <RequireLinkSwitch componentId={body.data.id} requireLink={body.data.requireLink} />
          <StageDatesForm component={body.data} today={toIsoDate(dublinToday())} initialStage={stage ?? null}
            progress={progress} hideNames={hideNames} />
        </>
      )}
    </AppMain>
  );
```

Imports: `cookies` from `next/headers`; `progressGridSchema` from `@/lib/api/schemas`; `HIDE_NAMES_COOKIE` from `@/lib/app/progress`.

- [ ] **Step 4: Write the failing component cases**

In `stage-sheet.spec.tsx`, add a grid fixture and pass `progress`, `classId` and `hideNames` in `renderSheet`'s defaults (`progress: { ok: true, data: grid }, classId: "c1", hideNames: false`), with the stage given an item `{ id: "i1", text: "Bring three questions", dueDate: "2026-10-06" }`:

```tsx
const grid = {
  componentId: "k1", classId: "c1", className: "6A", today: "2026-10-01", waiting: [],
  stages: [{ stageId: "s2", ordinal: 2, label: "Stage 2", name: "Developing a question", dueDate: null, checkpoint: { id: "c2", text: "Discussed" } }],
  students: [
    { studentId: "a", firstName: "Aoife", lastName: "Byrne", behindBy: 0, lastLogActivityOn: null, daysSinceLastLogActivity: null, documentLink: null, cells: [{ checkpointId: "c2", state: "READY" as const, signedOffOn: null }] },
    { studentId: "b", firstName: "Cian", lastName: "Murphy", behindBy: 0, lastLogActivityOn: null, daysSinceLastLogActivity: null, documentLink: null, cells: [{ checkpointId: "c2", state: "DUE" as const, signedOffOn: null }] },
  ],
  itemTicks: [{ itemId: "i1", studentIds: ["b"] }],
};
```

```tsx
  it("counts the checkpoint across the class, and lists who has and hasn't ticked an item", async () => {
    renderSheet();
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    expect(within(sheet).getByRole("link", { name: "1 waiting for you" })).toHaveAttribute("href", "/teach/classes/c1/progress");
    await userEvent.click(within(sheet).getByRole("button", { name: /Bring three questions.*1 ticked/ }));
    expect(within(sheet).getByRole("list", { name: /^Ticked/ })).toHaveTextContent("Cian Murphy");
    expect(within(sheet).getByRole("list", { name: /^Not ticked yet/ })).toHaveTextContent("Aoife Byrne");
  });

  it("says so in place when the class's progress didn't load", async () => {
    renderSheet({ progress: { ok: false, error: ApiError.unreachable(new Error("down")) } });
    const sheet = await screen.findByRole("dialog", { name: "Developing a question" });
    expect(within(sheet).getAllByText(/Couldn't load the class's progress/).length).toBeGreaterThan(0);
  });
```

In `stage-items.spec.tsx`, pass `progress={{ ok: true, data: { … itemTicks: [] … } }}` in `renderItems`. Use a grid with no students, so nothing else in those cases changes. In `stage-dates-form.spec.tsx`, `render5` and the direct renders pass `progress={{ ok: true, data: emptyGrid }} hideNames={false}`, with `emptyGrid` built the same way. Run: the two new sheet cases FAIL.

- [ ] **Step 5: Show the counts, the ticks and the names**

Thread the props: `StageDatesForm` takes `progress` and `hideNames` and passes them, with `classId={component.classId}`, to `StageSheet`. `StageSheet` passes `progress` to `StageItems`, and adds `hideNames ? "app-hide-names" : ""` to `DrawerContent`'s `className`. The sheet portals out of the page, so it needs the class itself.

In `SheetBody`'s checkpoint section, after the checkpoint text:

```tsx
            {!progress.ok ? (
              <p className="mt-2 text-app-small text-app-muted">{"Couldn't load the class's progress, so the counts aren't shown. Reload to try again."}</p>
            ) : progress.data.students.length === 0 ? (
              <p className="mt-2 text-app-small text-app-muted">No students in the class yet.</p>
            ) : counts && (
              <p className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-app-small text-app-grey">
                <span data-private><b className="font-semibold text-app-ink">{counts.signedOff}</b> signed off</span>
                {counts.waiting > 0 ? (
                  <Link href={`/teach/classes/${classId}/progress`} data-private className="font-semibold text-app-accent underline underline-offset-3">
                    {`${counts.waiting} waiting for you`}
                  </Link>
                ) : (
                  <span data-private><b className="font-semibold text-app-ink">0</b> waiting</span>
                )}
                <span data-private><b className="font-semibold text-app-ink">{counts.notYet}</b> not yet</span>
              </p>
            )}
```

with `const counts = progress.ok ? checkpointCounts(progress.data, stage.id) : null;` and `import Link from "next/link";`.

In `StageItems`, add the prop `progress: Attempt<ProgressGrid>`. The heading's line gains, when `progress.ok`, a right-aligned `${progress.data.students.length} students`. Each item button gains, before the chevron, `{progress.ok && <span data-private className="text-app-small text-app-grey whitespace-nowrap">{`${tickLists(progress.data, item.id).ticked.length} ticked`}</span>}`. Move the chevron into that cell so the grid stays three columns. Under the open item's form:

```tsx
              {open === item.id && progress.ok && (
                <TickNames lists={tickLists(progress.data, item.id)} id={`${formId}-${item.id}`} />
              )}
              {open === item.id && !progress.ok && (
                <p className="pb-3 text-app-small text-app-muted">{"Couldn't load the class's progress, so who has ticked this isn't shown."}</p>
              )}
```

```tsx
/** Who has and hasn't ticked one item (S-28). Students tick these themselves; the words say so. */
function TickNames({ lists, id }: { lists: TickLists; id: string }) {
  const group = (key: string, heading: string, names: string[], done: boolean) => (
    <div className="flex flex-col gap-1.5">
      <h4 id={`${id}-${key}`} className="text-app-small font-semibold text-app-grey">{heading}</h4>
      {names.length === 0 ? (
        <p className="text-app-small text-app-muted">Nobody.</p>
      ) : (
        <ul aria-labelledby={`${id}-${key}`} className="flex flex-wrap gap-1.5">
          {names.map((name) => (
            <li key={name} data-private className={`rounded-full border px-2 py-0.5 text-app-small ${done ? "border-app-approved/30 bg-app-approved-tint text-app-approved" : "border-app-line bg-app-surface text-app-ink"}`}>
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <div className="mb-3 flex flex-col gap-3 rounded-app-inner border border-app-line bg-app-ground p-3">
      {group("not", `Not ticked yet (${lists.notYet.length})`, lists.notYet, false)}
      {group("done", `Ticked (${lists.ticked.length}) · students tick these themselves`, lists.ticked, true)}
    </div>
  );
}
```

Two students can share a full name; key by name plus index if `tickLists` ever returns duplicates. The fixtures here don't.

- [ ] **Step 6: Run and verify**

Run: `cd frontend && npx vitest run components/app/stage-sheet.spec.tsx components/app/stage-items.spec.tsx components/app/stage-dates-form.spec.tsx && node --test lib/app/stage-sheet.test.ts` → all pass. Then `make verify` → green.

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/app/stage-sheet.ts frontend/lib/app/stage-sheet.test.ts "frontend/app/(app)/teach/classes/[id]/component/page.tsx" frontend/components/app/stage-dates-form.tsx frontend/components/app/stage-dates-form.spec.tsx frontend/components/app/stage-sheet.tsx frontend/components/app/stage-sheet.spec.tsx frontend/components/app/stage-items.tsx frontend/components/app/stage-items.spec.tsx
git commit -m "The stage sheet counts the checkpoint across the class and shows who has ticked each item"
```

---

### Task 10: The journey sees the tick; Part 2's hand test

**Files:**
- Modify: `frontend/e2e/phase2.e2e.ts`, `docs/ARCHITECTURE.md` §5

- [ ] **Step 1: The teacher sees the student's tick**

In the second test of `phase2.e2e.ts`, after the student's last `expectAccessible(student);`:

```ts
  // Stage sheet Part 2: the teacher sees who ticked it, in Stage 6's sheet.
  await teacher.getByRole("link", { name: "Component" }).click();
  const stage6 = "Finalising the Biology in Practice Investigation Report";
  await teacher.getByRole("button", { name: stage6 }).click();
  const sheet = teacher.getByRole("dialog", { name: stage6 });
  await sheet.getByRole("button", { name: /Full draft in for feedback.*1 ticked/ }).click();
  await expect(sheet.getByRole("list", { name: /^Ticked/ })).toContainText("Cian Murphy");
  await expectAccessible(teacher);
```

- [ ] **Step 2: Run the journey**

Run: `make e2e` → green.

- [ ] **Step 3: Keep the docs true**

In `docs/ARCHITECTURE.md` §5, the `V9__item_ticks.sql` bullet gains: "`ItemTickRepository.tickedBy` reads who has ticked each active item for the grid's `itemTicks` (approved students only, filtered in `ProgressService.grid`), which the Component tab's stage sheet shows." In §6, the stage-sheet paragraph gains: "The page loads `/components/{id}/progress` alongside the component; the sheet's counts line and tick lists come from it, and say so in place when it fails. Names follow Hide names (`app_hide_names`)."

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/phase2.e2e.ts docs/ARCHITECTURE.md
git commit -m "Prove in the journey that the teacher sees who ticked an item"
```

- [ ] **Step 5: Stop for Tim's hand test of Part 2**

Success test 2: open the current stage and answer "who hasn't ticked B, and who's waiting?" in a few seconds, without the Progress tab. Check Hide names on Progress, then open the sheet: the names are blurred. **Don't start Part 3 until Tim says Part 2 is right.** *(31 Oct 2026, Tim away: write it into `docs/HANDOFF.md` as "Hand test, Part 2" and carry on.)*

---

## Part 3 — the teacher's note

### Task 11: Notes in the API

**Files:**
- Create: `backend/src/main/resources/db/migration/V14__stage_notes.sql`
- Create: `backend/…/components/domain/StageNote.java`, `backend/…/components/adapter/persistence/StageNoteRepository.java`, `backend/…/components/adapter/web/StageNoteRequest.java`
- Modify: `backend/…/components/application/ComponentViews.java`, `ComponentService.java`, `backend/…/components/adapter/web/ComponentController.java`
- Create: `backend/src/test/java/ie/coursework/components/adapter/web/StageNoteTest.java`
- Modify: `backend/src/test/java/ie/coursework/components/authz/ComponentScopeTest.java`, `backend/src/test/java/ie/coursework/components/application/ComponentServiceOwnedTest.java`
- Modify: `frontend/lib/api/schemas.ts`; the stage fixtures in `stage-dates-form.spec.tsx`, `stage-sheet.spec.tsx`, `stage-card.spec.tsx`, `stages-section.spec.tsx`, `component-overview.spec.tsx`

**Interfaces:**
- Produces: `ComponentViews.NoteView(String text, LocalDate updatedOn)`; `SetupStage` and `StudentStage` gain `NoteView note` (last component); `ComponentService.setNote(Actor, UUID componentId, UUID stageId, String text): NoteView`, `clearNote(Actor, UUID, UUID)`; `PUT` and `DELETE /api/v1/components/{componentId}/stages/{stageId}/note`; Zod `noteSchema`, `StageNote` type, `note: noteSchema.nullable()` on both stage schemas.

- [ ] **Step 1: Write the failing tests**

```java
package ie.coursework.components.adapter.web;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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

/** Stage sheet S-8, S-24: one note per stage, set and cleared by the class's teacher, read by its approved students. */
@AutoConfigureMockMvc
class StageNoteTest extends PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;

    private UUID component;
    private String note;
    private ApiSession teacher;

    @BeforeEach
    void component() throws Exception {
        ClassFixtures.World world = fixtures.world();
        component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);
        note = "/api/v1/components/" + component + "/stages/" + components.stageId(ComponentFixtures.BIOLOGY_2027, 2) + "/note";
        teacher = new ApiSession(mockMvc).login(ClassFixtures.TEACHER1, TestAccounts.PASSWORD);
    }

    @Test
    void theTeacherSetsChangesAndClearsTheirNote() throws Exception {
        teacher.put(note, "{\"text\":\"  Bring your notes. https://drive.google.com/x  \"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("Bring your notes. https://drive.google.com/x"))
                .andExpect(jsonPath("$.updatedOn").isNotEmpty());
        teacher.put(note, "{\"text\":\"Workshop on Thursday.\"}").andExpect(status().isOk());
        teacher.get("/api/v1/components/" + component)
                .andExpect(jsonPath("$.stages[1].note.text").value("Workshop on Thursday."))
                .andExpect(jsonPath("$.stages[0].note").isEmpty());

        teacher.delete(note).andExpect(status().isNoContent());
        teacher.get("/api/v1/components/" + component).andExpect(jsonPath("$.stages[1].note").isEmpty());
    }

    @Test
    void aBlankOrTooLongNoteIsRefused() throws Exception {
        teacher.put(note, "{\"text\":\"   \"}").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        teacher.put(note, "{\"text\":\"%s\"}".formatted("x".repeat(1001))).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void aStageOfAnotherSubjectIsNotFound() throws Exception {
        String chemistry = "/api/v1/components/" + component + "/stages/"
                + components.stageId(ComponentFixtures.CHEMISTRY_2027, 2) + "/note";
        teacher.put(chemistry, "{\"text\":\"x\"}").andExpect(status().isNotFound());
        teacher.delete(chemistry).andExpect(status().isNotFound());
    }

    @Test
    void anApprovedStudentSeesTheNoteOnTheirStage() throws Exception {
        teacher.put(note, "{\"text\":\"Workshop on Thursday.\"}").andExpect(status().isOk());
        new ApiSession(mockMvc).login(ClassFixtures.APPROVED_STUDENT, TestAccounts.PASSWORD)
                .get("/api/v1/components/" + component)
                .andExpect(jsonPath("$.view").value("STUDENT"))
                .andExpect(jsonPath("$.stages[1].note.text").value("Workshop on Thursday."))
                .andExpect(jsonPath("$.stages[1].note.updatedOn").isNotEmpty());
    }
}
```

In `ComponentScopeTest`: add a field `private String note;`, set it in `seed()` to `component + "/stages/" + stage(6) + "/note"`, and add to `everyEndpoint`:

```java
        session.put(note, "{\"text\":\"x\"}").andExpect(expected);
        session.delete(note).andExpect(expected);
```

and to `anApprovedStudentReadsTheirViewButNoTeacherEndpoint`:

```java
        student.put(note, "{\"text\":\"x\"}").andExpect(status().isNotFound());
        student.delete(note).andExpect(status().isNotFound());
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd backend && ./mvnw -q test -Dtest='StageNoteTest,ComponentScopeTest'`
Expected: FAIL (the note endpoints 404 for the owner too, and there's no `note` on the views).

- [ ] **Step 3: The table**

`V14__stage_notes.sql`:

```sql
-- The teacher's own note on one stage of their class's component (plan stage-sheet S-8). Shown to the class's
-- students beside the official description, which it never replaces. Plain text; links in it are never fetched.
CREATE TABLE stage_note (
    instance_id       uuid        NOT NULL REFERENCES component_instance (id),
    template_stage_id uuid        NOT NULL REFERENCES template_stage (id),
    text              text        NOT NULL CONSTRAINT stage_note_text_present CHECK (btrim(text) <> '' AND char_length(text) <= 1000),
    updated_at        timestamptz NOT NULL,
    PRIMARY KEY (instance_id, template_stage_id)
);
```

It isn't content, so it stays out of `PRESERVED_TABLES` and the test reset truncates it.

- [ ] **Step 4: The record and the repository**

`StageNote.java`:

```java
package ie.coursework.components.domain;

import java.time.Instant;
import java.util.UUID;

/** A teacher's note on one stage of their component (plan stage-sheet S-8). */
public record StageNote(UUID stageId, String text, Instant updatedAt) {}
```

`StageNoteRepository.java`:

```java
package ie.coursework.components.adapter.persistence;

import ie.coursework.components.domain.StageNote;
import ie.coursework.shared.persistence.Timestamps;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Every method is keyed on the component, so a note is only ever reached through a component already in scope. */
@Repository
public class StageNoteRepository {

    private final JdbcClient jdbc;

    public StageNoteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The component's notes by stage. */
    public Map<UUID, StageNote> forComponent(UUID componentId) {
        Map<UUID, StageNote> notes = new LinkedHashMap<>();
        jdbc.sql("SELECT template_stage_id, text, updated_at FROM stage_note WHERE instance_id = :component")
                .param("component", componentId)
                .query(rs -> {
                    UUID stage = rs.getObject("template_stage_id", UUID.class);
                    notes.put(stage, new StageNote(stage, rs.getString("text"), rs.getObject("updated_at", OffsetDateTime.class).toInstant()));
                });
        return notes;
    }

    public StageNote set(UUID componentId, UUID stageId, String text, Instant now) {
        jdbc.sql("""
                INSERT INTO stage_note (instance_id, template_stage_id, text, updated_at)
                VALUES (:component, :stage, :text, :now)
                ON CONFLICT (instance_id, template_stage_id)
                DO UPDATE SET text = EXCLUDED.text, updated_at = EXCLUDED.updated_at
                """).param("component", componentId).param("stage", stageId).param("text", text)
                .param("now", Timestamps.utc(now))
                .update();
        return new StageNote(stageId, text, now);
    }

    public void clear(UUID componentId, UUID stageId) {
        jdbc.sql("DELETE FROM stage_note WHERE instance_id = :component AND template_stage_id = :stage")
                .param("component", componentId).param("stage", stageId)
                .update();
    }
}
```

- [ ] **Step 5: The views and the service**

`ComponentViews`: add `public record NoteView(String text, LocalDate updatedOn) {}`, and append `NoteView note` as the last component of `SetupStage` and of `StudentStage`.

`ComponentService`: add `StageNoteRepository notes` to the constructor (last before `AuditLog audit`) and a field. In `teacherView` and `studentView`, read `Map<UUID, StageNote> notes = this.notes.forComponent(<component id>);` and pass `note(notes.get(s.id()))` as the new last argument, with:

```java
    private static NoteView note(StageNote note) {
        return note == null ? null : new NoteView(note.text(), DublinDate.of(note.updatedAt()));
    }
```

and the two operations:

```java
    /** Stage sheet S-8, S-24: the teacher's note on one stage. Whitespace either side is dropped; blank is refused earlier. */
    @Transactional
    public NoteView setNote(Actor actor, UUID componentId, UUID stageId, String text) {
        Owned owned = owned(actor, componentId);
        requireStage(owned, stageId);
        return note(notes.set(owned.component().id(), stageId, text.strip(), clock.instant()));
    }

    @Transactional
    public void clearNote(Actor actor, UUID componentId, UUID stageId) {
        Owned owned = owned(actor, componentId);
        requireStage(owned, stageId);
        notes.clear(owned.component().id(), stageId);
    }

    /** The stage is in the path, so one outside the component's template is 404 (S-24), not a validation error. */
    private void requireStage(Owned owned, UUID stageId) {
        boolean inVersion = templates.stages(owned.brief().versionId()).stream().anyMatch(s -> s.id().equals(stageId));
        if (!inVersion) {
            throw new DomainException(ErrorCode.NOT_FOUND, "No such stage.");
        }
    }
```

`ComponentServiceOwnedTest`: add `mock(StageNoteRepository.class),` before `mock(AuditLog.class)` in the constructor call.

- [ ] **Step 6: The endpoints**

`StageNoteRequest.java`:

```java
package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StageNoteRequest(@NotBlank @Size(max = 1000) String text) {}
```

`ComponentController`:

```java
    @PutMapping("/components/{componentId}/stages/{stageId}/note")
    NoteView setNote(Actor actor, @PathVariable UUID componentId, @PathVariable UUID stageId,
            @Valid @RequestBody StageNoteRequest body) {
        return components.setNote(actor, componentId, stageId, body.text());
    }

    @DeleteMapping("/components/{componentId}/stages/{stageId}/note")
    ResponseEntity<Void> clearNote(Actor actor, @PathVariable UUID componentId, @PathVariable UUID stageId) {
        components.clearNote(actor, componentId, stageId);
        return ResponseEntity.noContent().build();
    }
```

- [ ] **Step 7: Mirror it in Zod and the fixtures**

```ts
export const noteSchema = z.object({ text: z.string(), updatedOn: z.string() });
export type StageNote = z.infer<typeof noteSchema>;
```

placed before `setupStageSchema`. Both `setupStageSchema` and `studentStageSchema` gain `note: noteSchema.nullable(),`. Add `note: null` to the stage fixtures in `stage-dates-form.spec.tsx` (the `stage` helper), `stage-sheet.spec.tsx`, `stage-card.spec.tsx` (`baseStage`), `stages-section.spec.tsx` and `component-overview.spec.tsx`. `npx tsc --noEmit` names any one missed.

- [ ] **Step 8: Run and verify**

Run: `cd backend && ./mvnw -q test -Dtest='StageNoteTest,ComponentScopeTest,ComponentServiceOwnedTest'` → PASS. Then `make verify` → green.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/resources/db/migration/V14__stage_notes.sql backend/src/main/java/ie/coursework/components backend/src/test/java/ie/coursework/components frontend/lib/api/schemas.ts frontend/components/app/*.spec.tsx
git commit -m "A teacher's note per stage: the table, PUT and DELETE, and the note on both stage views"
```

---

### Task 12: Note text with clickable links

**Files:**
- Create: `frontend/lib/app/note-text.ts` (+ `.test.ts`), `frontend/components/app/note-text.tsx` (+ `.spec.tsx`)

**Interfaces:**
- Produces: `NOTE_MAX = 1000`; `type NotePart = { kind: 'text'; text: string } | { kind: 'link'; href: string }`; `noteParts(text: string): NotePart[]`; `recentlyUpdated(updatedOn: string, today: string): boolean` (true from the day of the change for 7 days); `NoteText({ text }: { text: string })`.

- [ ] **Step 1: Write the failing tests**

`lib/app/note-text.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { noteParts, recentlyUpdated } from './note-text.ts';

describe('note text', () => {
  test('http(s) addresses become links; trailing punctuation stays text', () => {
    assert.deepEqual(noteParts('Sign up (https://example.ie/slots). Thanks'), [
      { kind: 'text', text: 'Sign up (' },
      { kind: 'link', href: 'https://example.ie/slots' },
      { kind: 'text', text: '). Thanks' },
    ]);
  });

  test('nothing else becomes a link', () => {
    assert.deepEqual(noteParts('javascript:alert(1) or www.example.ie'), [{ kind: 'text', text: 'javascript:alert(1) or www.example.ie' }]);
  });

  test('"Note updated" lasts 7 days from the day of the change', () => {
    assert.equal(recentlyUpdated('2026-10-28', '2026-10-28'), true);
    assert.equal(recentlyUpdated('2026-10-28', '2026-11-03'), true);
    assert.equal(recentlyUpdated('2026-10-28', '2026-11-04'), false);
  });
});
```

`components/app/note-text.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoteText } from "./note-text";

describe("NoteText", () => {
  it("keeps line breaks and opens links in a new tab, saying so", () => {
    render(<NoteText text={"Thursday.\nSlots: https://example.ie/slots"} />);
    const link = screen.getByRole("link", { name: "https://example.ie/slots (opens in a new tab)" });
    expect(link).toHaveAttribute("href", "https://example.ie/slots");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
```

Run: `cd frontend && node --test lib/app/note-text.test.ts && npx vitest run components/app/note-text.spec.tsx` → FAIL (no modules).

- [ ] **Step 2: Write them**

`lib/app/note-text.ts`:

```ts
/** A teacher's note (plan stage-sheet S-8, S-26): plain text, at most this long. */
export const NOTE_MAX = 1000;

export type NotePart = { kind: 'text'; text: string } | { kind: 'link'; href: string };

// Only http(s), so `javascript:` and friends never become links. Rendered as React elements, never as HTML.
const LINK = /https?:\/\/[^\s<>"]+/gi;
const TRAILING = /[.,;:!?)\]'"]+$/;

export function noteParts(text: string): NotePart[] {
  const parts: NotePart[] = [];
  let rest = 0;
  for (const match of text.matchAll(LINK)) {
    const href = match[0].replace(TRAILING, '');
    const start = match.index ?? 0;
    if (start > rest) parts.push({ kind: 'text', text: text.slice(rest, start) });
    parts.push({ kind: 'link', href });
    rest = start + href.length;
  }
  if (rest < text.length) parts.push({ kind: 'text', text: text.slice(rest) });
  return parts;
}

const DAY = 86_400_000;

/** "Note updated" (S-9, S-23): from the day of the change, for 7 days. Calendar dates, read in UTC like the rest of lib/app. */
export function recentlyUpdated(updatedOn: string, today: string): boolean {
  const days = (Date.parse(today) - Date.parse(updatedOn)) / DAY;
  return days >= 0 && days < 7;
}
```

`components/app/note-text.tsx`:

```tsx
import { noteParts } from "@/lib/app/note-text";

/** A teacher's note as written: line breaks kept, http(s) links opening in a new tab (S-26). */
export function NoteText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-app-base text-app-ink">
      {noteParts(text).map((part, i) =>
        part.kind === "text" ? (
          part.text
        ) : (
          <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" className="text-app-accent underline underline-offset-3 hover:text-app-accent-hover">
            {part.href}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ),
      )}
    </p>
  );
}
```

Run both again → pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/app/note-text.ts frontend/lib/app/note-text.test.ts frontend/components/app/note-text.tsx frontend/components/app/note-text.spec.tsx
git commit -m "Note text: http(s) links clickable and announced, and how long a note counts as updated"
```

---

### Task 13: The note in the sheet

**Files:**
- Create: `frontend/components/app/stage-note-form.tsx` (+ `.spec.tsx`)
- Modify: `frontend/components/app/stage-sheet.tsx`, `stage-dates-form.tsx` (+ specs)

**Interfaces:**
- Produces: `StageNoteForm({ componentId, stageId, note, draft, onDraft }: { componentId: string; stageId: string; note: StageNote | null; draft: string; onDraft: (text: string) => void })`; `StageSheet` gains `noteDrafts: Record<string, string>` and `onNoteDraft: (stageId: string, text: string) => void`.

- [ ] **Step 1: Write the failing spec**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";
import type { StageNote } from "@/lib/api/schemas";

import { StageNoteForm } from "./stage-note-form";

function Harness({ note }: { note: StageNote | null }) {
  const [draft, setDraft] = useState(note?.text ?? "");
  return <StageNoteForm componentId="k1" stageId="s2" note={note} draft={draft} onDraft={setDraft} />;
}

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("StageNoteForm", () => {
  it("previews the note as students will see it, links included, and saves it", async () => {
    vi.mocked(api.send).mockResolvedValue({ text: "Slots: https://example.ie/slots", updatedOn: "2026-10-31" });
    render(<Harness note={null} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Your note for students" }), "Slots: https://example.ie/slots");
    expect(screen.getByRole("link", { name: /https:\/\/example\.ie\/slots/ })).toBeInTheDocument();
    expect(screen.getByText("Not saved yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/stages/s2/note", { text: "Slots: https://example.ie/slots" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("an emptied box removes the note", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    render(<Harness note={{ text: "Old", updatedOn: "2026-10-28" }} />);
    expect(screen.getByText("Saved 28 Oct 2026")).toBeInTheDocument();
    await userEvent.clear(screen.getByRole("textbox", { name: "Your note for students" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove note" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/stages/s2/note");
  });
});
```

Run: FAIL (no module).

- [ ] **Step 2: Write `stage-note-form.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api/client";
import { noteSchema, type StageNote } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { NOTE_MAX } from "@/lib/app/note-text";

import { ErrorPanel } from "./error-panel";
import { NoteText } from "./note-text";
import { eyebrow } from "./styles";

/**
 * The teacher's note on one stage (plan stage-sheet S-8, S-9, S-22). The draft lives in the page (S-21), so closing
 * the sheet doesn't lose it. The preview shows exactly what students will see, links included.
 */
export function StageNoteForm({ componentId, stageId, note, draft, onDraft }: {
  componentId: string;
  stageId: string;
  note: StageNote | null;
  draft: string;
  onDraft: (text: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const id = `note-${stageId}`;
  const path = `/components/${componentId}/stages/${stageId}/note`;
  const text = draft.trim();
  const dirty = draft !== (note?.text ?? "");
  const removing = text === "" && note !== null;

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (removing) await api.sendNoContent("DELETE", path);
      else await api.send("PUT", path, { text: draft }, noteSchema);
      // The server drops whitespace either side; match it so the saved note and the draft agree after the refresh.
      onDraft(text);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <label htmlFor={id} className={`${eyebrow} text-app-muted`}>Your note for students</label>
      <p id={`${id}-help`} className="text-app-small text-app-grey">Shown to students above the guidelines. Web links become clickable.</p>
      <Textarea
        id={id}
        rows={4}
        value={draft}
        maxLength={NOTE_MAX}
        aria-describedby={`${id}-help ${id}-count`}
        onChange={(event) => onDraft(event.target.value)}
      />
      <p id={`${id}-count`} className="text-right text-app-meta text-app-muted">
        {`${draft.length.toLocaleString("en-IE")} / ${NOTE_MAX.toLocaleString("en-IE")}`}
      </p>
      {text && (
        <div className="flex flex-col gap-1 rounded-app-inner bg-app-inset px-3 py-2.5">
          <p className={`${eyebrow} text-app-muted`}>How students see it</p>
          <NoteText text={text} />
        </div>
      )}
      {error && <ErrorPanel error={error} focus />}
      <div className="flex items-center justify-between gap-3">
        <p role="status" className="text-app-small text-app-muted">
          {dirty ? "Not saved yet" : note ? `Saved ${formatCalendarDate(note.updatedOn)}` : ""}
        </p>
        <Button type="submit" variant="outline" size="header" disabled={busy || !dirty}>
          {busy ? "Saving…" : removing ? "Remove note" : "Save note"}
        </Button>
      </div>
    </form>
  );
}
```

Run the spec → pass.

- [ ] **Step 3: The sheet and the page hold it**

`StageDatesForm`:

```tsx
  // Note drafts live here, like the dates' edits (S-21): a sheet closed by Escape or a scrim click keeps them.
  const savedNotes = useMemo(
    () => Object.fromEntries(component.stages.map((s) => [s.id, s.note?.text ?? ""])),
    [component.stages],
  );
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  useEffect(() => setNoteDrafts((current) => dropSaved(current, savedNotes)), [savedNotes]);
  const notesDirty = Object.entries(noteDrafts).some(([id, text]) => text !== (savedNotes[id] ?? ""));
```

The leave-page warning's `if (!dirty) return;` becomes `if (!dirty && !notesDirty) return;` (and its dependency list gains `notesDirty`). Pass `noteDrafts={noteDrafts}` and `onNoteDraft={(stageId, text) => setNoteDrafts((d) => ({ ...d, [stageId]: text }))}` to `StageSheet`. In `StageDateRow`, add a `hasNote: boolean` prop (passed `Boolean(stage.note)`). Render the item letters line whenever `letters.length > 0 || hasNote`, and append `{hasNote && <span className="rounded-full border border-app-accent/30 bg-app-surface px-2 py-px text-app-meta font-semibold text-app-accent">Your note</span>}` inside it.

`SheetBody`, a section between the date and "From the guidelines":

```tsx
        <section className="border-b border-app-line py-4">
          <StageNoteForm componentId={componentId} stageId={stage.id} note={stage.note}
            draft={noteDrafts[stage.id] ?? stage.note?.text ?? ""} onDraft={(text) => onNoteDraft(stage.id, text)} />
        </section>
```

Spec case in `stage-dates-form.spec.tsx`:

```tsx
  it("keeps a note typed in a sheet after the sheet closes, and chips a saved note on its row", async () => {
    render5(component({ stages: [stage(3, "2026-09-25", { note: { text: "Bring notes", updatedOn: "2026-09-20" } }), stage(4, null)] }));
    expect(screen.getByText("Your note")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Name 4" }));
    await userEvent.type(await screen.findByRole("textbox", { name: "Your note for students" }), "Half a thought");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Name 4" }));
    expect(await screen.findByRole("textbox", { name: "Your note for students" })).toHaveValue("Half a thought");
  });
```

- [ ] **Step 4: Run and verify**

Run: `cd frontend && npx vitest run components/app/stage-note-form.spec.tsx components/app/stage-sheet.spec.tsx components/app/stage-dates-form.spec.tsx` → pass. Then `make verify` → green.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/app/stage-note-form.tsx frontend/components/app/stage-note-form.spec.tsx frontend/components/app/stage-sheet.tsx frontend/components/app/stage-sheet.spec.tsx frontend/components/app/stage-dates-form.tsx frontend/components/app/stage-dates-form.spec.tsx
git commit -m "Write a note for students in the stage sheet, with a live preview; drafts survive closing the sheet"
```

---

### Task 14: Students see the note

**Files:**
- Modify: `frontend/components/app/stage-card.tsx`, `stages-section.tsx`, `component-overview.tsx` (+ the three specs)

**Interfaces:**
- Consumes: `NoteText`, `recentlyUpdated` (Task 12).
- Produces: `StageCard` and `StagesSection` gain a required `today: string` prop.

- [ ] **Step 1: Write the failing spec case**

In `stage-card.spec.tsx`, every render gains `today="2026-10-30"`. Add:

```tsx
  it("shows the teacher's note above the official text, and a Note updated tag for a week", () => {
    const stage = { ...baseStage, note: { text: "Slots: https://example.ie/slots", updatedOn: "2026-10-28" } };
    render(<StageCard componentId="k1" stage={stage} allStages={[stage]} state="current" open={true} onToggle={vi.fn()} link={null} requireLink={false} today="2026-10-30" />);
    expect(screen.getByText("Note from your teacher")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /https:\/\/example\.ie\/slots/ })).toHaveAttribute("target", "_blank");
    expect(screen.getByText("Updated 28 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("Note updated")).toBeInTheDocument();
  });
```

Run: FAIL.

- [ ] **Step 2: Show it**

`StageCard`: add `today: string` to the props. In the header button, after the state word:

```tsx
        {s.note && recentlyUpdated(s.note.updatedOn, today) && (
          <span className={`${eyebrow} rounded-full bg-app-accent-tint px-2.5 py-1 text-app-accent`}>Note updated</span>
        )}
```

In the panel, before `<p className={lead}>{s.description}</p>`:

```tsx
            {s.note && (
              <div className="flex flex-col gap-1 rounded-app-inner border-l-[3px] border-l-app-accent bg-app-accent-tint p-3">
                <span className={`${eyebrow} text-app-accent`}>Note from your teacher</span>
                <NoteText text={s.note.text} />
                <span className="text-app-small text-app-muted">{`Updated ${formatCalendarDate(s.note.updatedOn)}`}</span>
              </div>
            )}
```

`StagesSection` takes `today` and passes it to each `StageCard`; `ComponentOverview` passes `today={component.today}` to `StagesSection`. Update `stages-section.spec.tsx` and `component-overview.spec.tsx` renders so tsc is happy (`today` as the fixture's today).

- [ ] **Step 3: Run and verify**

Run: `cd frontend && npx vitest run components/app/stage-card.spec.tsx components/app/stages-section.spec.tsx components/app/component-overview.spec.tsx` → pass. Then `make verify` → green.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/app/stage-card.tsx frontend/components/app/stage-card.spec.tsx frontend/components/app/stages-section.tsx frontend/components/app/stages-section.spec.tsx frontend/components/app/component-overview.tsx frontend/components/app/component-overview.spec.tsx
git commit -m "Students see their teacher's note above the official text, with Note updated for a week"
```

---

### Task 15: The journey, the docs, the checklist, and Part 3's hand test

**Files:**
- Modify: `frontend/e2e/phase2.e2e.ts`
- Modify: `docs/ARCHITECTURE.md` §4, §5, §6; `docs/PILOT-ROADMAP.md` §6.2, §7; `docs/BACKLOG.md`; `docs/HANDOFF.md`

- [ ] **Step 1: Teacher writes, student reads**

In the first test, before `await sheet.getByRole("button", { name: "Close" }).click();`:

```ts
  // Stage sheet Part 3: a note for students, with a link the preview already shows clickable.
  await sheet.getByRole("textbox", { name: "Your note for students" }).fill("Feedback slots on Thursday. Sign up: https://example.ie/slots");
  await expect(sheet.getByRole("link", { name: /https:\/\/example\.ie\/slots/ })).toBeVisible();
  await sheet.getByRole("button", { name: "Save note" }).click();
  await expect(sheet.getByText(/^Saved \d/)).toBeVisible();
```

In the second test, after the student opens Stage 6 the first time:

```ts
  await expect(student.getByText("Note from your teacher")).toBeVisible();
  await expect(student.getByRole("link", { name: /https:\/\/example\.ie\/slots/ })).toHaveAttribute("target", "_blank");
  await expect(student.getByText("Note updated")).toBeVisible();
```

Run: `make e2e` → green.

- [ ] **Step 2: Keep the docs true**

- `docs/ARCHITECTURE.md` §4: "**A stage note is reached only through `ComponentService.setNote` / `clearNote`**, which start with `owned` and then require the stage to be in the component's template version (else 404). Every `StageNoteRepository` method is keyed on the component." §5: a `V14__stage_notes.sql` bullet for `stage_note` (PK component + stage, text 1–1,000 after trim by check constraint, `updated_at`; upserted; deleted on clear; not content). §6: the stage-sheet paragraph gains the note (`StageNoteForm`, its draft held in `StageDatesForm`, `NoteText` and `lib/app/note-text.ts` for links), and the student page paragraph gains "Note from your teacher" in `StageCard` with "Note updated" for 7 days (`recentlyUpdated`).
- `docs/PILOT-ROADMAP.md` §7: rows for `PUT /api/v1/components/{id}/stages/{stageId}/note` (Class teacher, `{text}` → `{text, updatedOn}`) and `DELETE` (→ 204); the `GET …/progress` row's response gains `itemTicks`. §6.2: the Component row gains "a note for students per stage", and the student component row gains "the teacher's note per stage".
- `docs/BACKLOG.md`: the `stage-sheet` row says built on `pilot/stage-sheet`, not merged: self-review, changes doc and PR still to do.
- `docs/HANDOFF.md`: where things stand, Tim's hand tests, and S-15 to S-29 waiting on Tim.

- [ ] **Step 3: The UI checklist**

Go through `docs/design/UI-CHECKLIST.md` for the sheet, its calendar view, the rows and the student's note. Note anything that fails, with what was checked, in `docs/HANDOFF.md`. Check in the browser: 390px, 200% zoom, keyboard only (name → sheet → date → calendar → back → items → close, focus returning each time), and Hide names.

- [ ] **Step 4: Verify and commit**

Run: `make verify && make e2e` → both green. Show the output.

```bash
git add frontend/e2e/phase2.e2e.ts docs/ARCHITECTURE.md docs/PILOT-ROADMAP.md docs/BACKLOG.md docs/HANDOFF.md
git commit -m "Prove the note in the journey, and record the stage sheet in the docs"
```

- [ ] **Step 5: Stop for Tim's hand test of Part 3**

Success test 3, and all three tests end to end on a laptop and a phone. Then, outside this plan: `/self-review` in a fresh session, `code-simplification` if it flags anything (its own commit), `write-changes` → `docs/changes/stage-sheet.md`, and Tim opens the PR into `pilotMain`.

---

## Not in this plan

- The student preview in the sheet (`student-preview`, its own backlog row).
- Copying setup from another class; "seen by N students"; notes that appear from a date; students replying to notes.
- Showing the official text's source reference (S-25).
- Escape stepping back from the calendar view instead of closing the sheet (S-19).
- The leave-page warning for a half-typed item (items save one at a time, as before).
