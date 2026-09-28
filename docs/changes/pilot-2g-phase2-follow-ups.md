# Phase 2 follow-ups (Part A of pilot-3-the-log)

## What was added

Six small fixes closed out from Phase 2's backlog, plus the e2e coverage to prove them: the SEC brief's completion date now shows as its own dated item on the student timeline, ahead of stage dates on the same day; a ticked teacher item remembers and shows the day it was ticked ("You ticked this · 2 Oct 2026"); a teacher editing one item no longer loses that draft when retiring a different item; every primary submit button shows a present-participle label ("Signing in…") while its request is in flight; a failed submit moves keyboard focus to the error message; and a new unit test proves `ComponentService.owned`'s two authorisation checks (the component's own owner filter, and `ClassService.owned`) each matter independently, not just together. No new user-facing feature — this is Phase 2 polish that Phase 3 (the log) depends on for its own busy-label and focus-on-error conventions.

## Files changed

| File | What changed and why |
|---|---|
| **Migration** | none — no schema changes in Part A |
| `backend/.../timeline/adapter/persistence/TimelineRepository.java` | New `COMPLETION` branch in the union query (`kind_order` renumbered 1–4) so the brief's `completion_date` is its own timeline row, sorted before `STAGE` on a shared day |
| `backend/.../timeline/adapter/persistence/TimelineRepositoryTest.java` | Two new tests: ordering + field-correctness for the completion row; scoping to `APPROVED` enrolments and the requested date range |
| `backend/.../components/domain/DublinDate.java` + `DublinDateTest.java` | Added `of(Instant) -> LocalDate`; `today()` now delegates to it |
| `backend/.../components/adapter/persistence/ItemTickRepository.java` + `ItemTickRepositoryTest.java` | `doneItems` changed from `Set<UUID>` to `Map<UUID, Instant>` (item id → when ticked), still excluding untocked rows |
| `backend/.../components/application/ComponentViews.java` (`StudentItem`) | Gained `LocalDate doneOn` |
| `backend/.../components/application/ComponentService.java` (`studentView`, `tick`) | Compute `doneOn` from the tick's `Instant` via `DublinDate.of`, null when not done |
| `backend/.../components/adapter/web/StudentComponentViewTest.java` | HTTP round-trip with a pinned clock: tick → `doneOn` appears; untick → it clears |
| `backend/.../components/application/ComponentServiceOwnedTest.java` (new) | First Mockito test in the repo: stubs the class check and the component-owner filter to fail independently, proving both gate access on their own |
| `frontend/lib/api/schemas.ts` | `timelineItemSchema.kind` gains `"COMPLETION"`; `doneOn: z.string().nullable()` added to `studentItemSchema` and the nested stage `items` schema |
| `frontend/components/app/timeline-view.tsx` + spec | `kindWord`, `Marker`, and the STAGE-styling checks all also match `COMPLETION` |
| `frontend/components/app/item-tick.tsx` + spec | Renders "You ticked this · &lt;date&gt;" once `doneOn` is known, else plain "You ticked this" |
| `frontend/components/app/teacher-items.tsx` + spec | `run(action, after)` takes a completion callback so retiring one item's cleanup no longer clears a different item's in-progress edit |
| `frontend/components/app/login-form.tsx`, `change-password-form.tsx`, `reset-form.tsx`, `sign-up-form.tsx`, `join-button.tsx`, `sign-out-button.tsx`, `create-class-form.tsx`, `create-component-form.tsx`, `stage-dates-form.tsx`, `teacher-items.tsx`, `personal-item-form.tsx` + specs | Submit button label is a `{busy ? "…ing…" : "…"}` ternary (11 components, one label pair each) |
| `frontend/components/app/error-panel.tsx` + spec | New `focus?: boolean` prop: a `useEffect` moves DOM focus onto the `role="alert"` section (via `tabIndex={focus ? -1 : undefined}`) whenever `focus` is true and a new error appears |
| 12 client components (`change-password-form`, `class-students`, `create-class-form`, `create-component-form`, `join-button`, `login-form`, `personal-item-actions`, `personal-item-form`, `reset-form`, `sign-up-form` ×2, `stage-dates-form`, `teacher-items`) | Each passes `focus` on its `<ErrorPanel>` — except `item-tick.tsx`, deliberately excluded (P3-12: it's a checkbox that reverts on failure; moving focus off it would lose the user's place) |
| `frontend/e2e/phase2.e2e.ts` | Extends the existing journey: asserts the dated-tick text after a reload, and the completion-date row on the timeline, with an accessibility check |
| `docs/ARCHITECTURE.md`, `docs/superpowers/plans/2026-09-16-pilot-2f-personal-items-and-timeline.md` | One-line updates recording the completion-date change against its original P2-44 decision |

## How it fits together

**Completion date (Q-P2-E):** `GET /api/v1/timeline?from=&to=` → `TimelineService` → `TimelineRepository.between` runs one `UNION ALL` query with a new first branch selecting `annual_brief.completion_date` for every approved enrolment in range, tagged `kind='COMPLETION'`, `kind_order=1`. The frontend's `timeline-view.tsx` receives the same `TimelineItem` shape it always did, just with one more `kind` value to render.

**Dated ticks:** `PUT /api/v1/components/{id}/teacher-items/{itemId}/tick` → `ComponentService.tick` calls `clock.instant()`, writes it via `ItemTickRepository.set`, and returns a `StudentItem` whose `doneOn` is `DublinDate.of(now)` — computed server-side, in Dublin local time, never in the browser. The same computation happens when the student reloads and `ComponentService.studentView` reads `doneItems()` back.

**Alert focus:** any client form's failed `api.send`/`api.sendNoContent` call sets its local `error` state and renders `<ErrorPanel error={error} focus />`. `ErrorPanel`'s `useEffect([focus, error])` then calls `.focus()` on its own `<section role="alert" tabIndex={-1}>`, so a screen-reader or keyboard user lands on the failure message immediately, and it re-fires if a second, different submit fails while the panel is already showing.

## Concepts & patterns used

- **Union query with a discriminator column** — several `SELECT`s of the same shape glued by `UNION ALL`, each tagging its rows with a `kind`. Adding the completion date was one more branch and a `kind_order` renumber, not a second query or an API change. Already used the same way for `STAGE`/`TEACHER_ITEM`/`PERSONAL` in the same file.
- **Server-side "today" in a named zone** — `DublinDate.of(Instant)` converts a UTC instant to a Dublin calendar date on the server. The alternative (formatting a UTC date in the browser) would show the wrong day near midnight for anyone in Ireland's summer (IST, UTC+1) — the same reasoning `today()` already used, just applied to a moment other than "now".
- **Mockito for isolating a compound check** — `ComponentServiceOwnedTest` is the first Mockito-based test here. It exists because `ComponentService.owned` runs two checks that real Postgres-backed data can't fail independently (both ultimately filter by the same class owner), so a stub was the only way to prove either one matters alone. See `docs/PILOT-ROADMAP.md`/plan §"Concepts in play" for the "bite test" verification step that proves the new test actually fails when a check is removed.
- **Callback-parameterised side effect, not a shared flag** — `teacher-items.tsx`'s `run(action, after)` replaces two call sites (submit, retire) that used to both clear the same two pieces of state unconditionally. Passing `after` as a parameter is a small, standard React pattern for "two callers need two different cleanups from one shared async wrapper," and was preferred over adding more booleans to track which flow is running.
- **Programmatic focus on a live region** — `role="alert"` already announces the message to assistive tech; adding `ref.current.focus()` on top (via a normally-non-interactive `<section>` made focusable with `tabIndex={-1}`) is the same pattern GOV.UK's error-summary component uses, and matches this repo's `UI-STANDARDS.md` §83/§105.
- **Inline ternary over a wrapper component** (decision P3-11) — the busy-label change was deliberately done as 11 separate one-line ternaries, not a shared `SubmitButton` component, to avoid introducing an abstraction for what is otherwise a plain conditional render.

## Implementation techniques

Every task was built test-first, one subagent per task, with a spec-compliance review and then a code-quality review before moving to the next task (`superpowers:subagent-driven-development`). Each review re-ran the relevant tests independently rather than trusting the implementer's report — twice this caught something worth noting:

- Task A1's literal test snippet called `fixtures.world()` a second time inside each new test body; the class's `@BeforeEach` already calls it once, so a second call hit a duplicate-key error (a fixed school roll number, and `component_instance.class_group_id`'s unique constraint). Fixed by reusing the class-level `world` field and the component `@BeforeEach` already built.
- Task A7's e2e regex for the dated-tick text assumed a 3-letter month abbreviation everywhere; running it for real on 27 Sept 2026 showed `en-IE`'s `Intl.DateTimeFormat` renders September as "Sept" (4 letters) — the only month that does. Widened `[a-z]{2}` to `[a-z]{2,3}`, with a comment, rather than pinning the test to a different date.

The `ComponentServiceOwnedTest` bite test is worth repeating as a technique: after writing a test meant to isolate one of two entangled checks, temporarily delete each check in turn in the real method, confirm the corresponding test (and only that one) fails, then restore the code exactly (`git diff` empty). That's the actual proof the test is testing something, not a coincidence of the mock setup.

## Things to know

- `ErrorPanel` is now a client component (`"use client"`). Every server page that renders it on a load failure (`app/(app)/home/page.tsx` and others) still works unchanged — a server component can render a client component — but none of those pages pass `focus`, and shouldn't: after a navigation, focus belongs to the page's main content, not a banner.
- `item-tick.tsx` is the one component that deliberately never gets `focus` on its `ErrorPanel`. If a future form is added that reverts its own state on failure (rather than showing a fresh error the user must act on), it should follow the same exclusion, not the default inclusion.
- `kind_order` in `TimelineRepository`'s SQL is a positional contract across four branches (COMPLETION=1, STAGE=2, TEACHER_ITEM=3, PERSONAL=4) that determines same-day ordering. Adding a fifth kind means picking its place in that sequence deliberately, not just appending it.
- `doneItems()` returning a `Map<UUID, Instant>` instead of a `Set<UUID>` is a breaking change to that method's signature; its only caller was updated in the same commit, but any new caller needs the instant, not just the boolean.

## What I'd get wrong next time

- Assuming a plan's literal test snippet will drop into an existing test class unmodified. Both divergences above (A1's fixture reuse, A7's locale regex) came from executing the snippet against the real, current state of the code rather than trusting it as written — the plan is a guide to intent, not a literal patch.
- Assuming month abbreviations are all the same length when formatting dates for assertions. `en-IE`'s "Sept" is the only 4-letter one; a regex or fixed-width assumption written against any other month would look correct until it ran in September.

## Self-review findings

A fresh-context review of the whole branch (all seven commits together, not each in isolation) re-ran `make verify` independently (355 backend tests, 140 `node:test`, 185 Vitest, all green) and checked specifically for cross-commit issues: whether `teacher-items.tsx`'s three separate edits (A3's callback refactor, A4's busy label, A5's focus prop) compose without collision (they do), and whether A5's alert-focus rollout reached every client `<ErrorPanel>` site and correctly excluded `item-tick.tsx` and every server page (it did, verified by an independent grep rather than trusting the task list). No critical or important findings. Two minor, non-blocking notes: `docs/ARCHITECTURE.md`'s `item_tick` bullet doesn't yet mention `doneOn`/the `Map` change (worth a line next time that file is touched), and a reminder not to `git add -A` given the untracked CV PDF sitting in the working tree.

## Deviations from the plan

- Task A1: the two new `TimelineRepositoryTest` cases reuse the test class's existing `world`/`seed()`-built component instead of calling `fixtures.world()`/`components.component()` again, to avoid unique-constraint violations the plan's literal snippet would have hit. Coverage intent (ordering, approved/pending/removed scoping, date-range scoping) is unchanged.
- Task A7: the dated-tick e2e regex is `[a-z]{2,3}` instead of the plan's `[a-z]{2}`, to tolerate `en-IE`'s "Sept" abbreviation for September.
- A small follow-up commit (`e3e1500`) fixed a doc-comment citation in `error-panel.tsx` (pointed at `UI-STANDARDS.md` §29, a CSS rule, instead of §83/§105, the actual behavioural rules) — caught by code-quality review after Task A5, applied directly rather than looping back through a subagent for a one-line fix.

## Follow-ups

- `docs/ARCHITECTURE.md`'s timeline/item-tick bullets could use a line about `doneOn` and the `Map<UUID, Instant>` change, next time that file is edited for another reason.
- Part B (Phase 3, the log) starts from `pilotMain` only after this branch merges — its forms are expected to reuse the busy-label and alert-focus conventions established here.
