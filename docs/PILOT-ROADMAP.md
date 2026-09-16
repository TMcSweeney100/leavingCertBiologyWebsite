# Coursework Pilot — Roadmap

**Date:** 15 September 2026
**Status:** Draft for review. Nothing in here is built yet.
**Implements:** `docs/PILOT-DESIGN.md`. Where this roadmap and the design disagree, the design wins; raise the conflict rather than picking one.
**Who reads this:** Claude Code sessions doing the build, and Tim reviewing it.

This is the phase plan. It says what gets built, in what order, what "done" means at each checkpoint, and which decisions have to be made before each phase can start. The detailed, step-by-step TDD plans live in `docs/superpowers/plans/`, one per milestone, and are written **at the start of each phase**, not all now. The reason: a Phase 4 plan written today would name classes and endpoints that Phase 1 hasn't created yet, and would be wrong by the time anyone used it.

Detailed plans so far:

| Milestone | Plan |
|---|---|
| 1A Walking skeleton | `docs/superpowers/plans/2026-09-15-pilot-1a-walking-skeleton.md` |
| 1B Accounts and sessions | `docs/superpowers/plans/2026-09-15-pilot-1b-accounts-and-sessions.md` |
| 1C Classes and enrolment | `docs/superpowers/plans/2026-09-15-pilot-1c-classes-and-enrolment.md` |
| 1D App shell and first journey | `docs/superpowers/plans/2026-09-15-pilot-1d-app-shell-and-first-journey.md` |

---

## 0. Start here (for a Claude Code session)

1. Read §1 of this file to find the current milestone.
2. Read `docs/HANDOFF.md` for anything the last session left unfinished.
3. Open that milestone's plan and find the first unticked step. **If the milestone has no plan yet, write it first** with `superpowers:writing-plans`, from its outline in §8, against the code as it actually is.
4. Read the sections of `docs/PILOT-DESIGN.md` the plan cites. Don't read the whole thing every time. For how the built code works (auth, the request path, the add-a-feature recipe), read the matching section of `docs/ARCHITECTURE.md` rather than the files.
5. Work task by task using `superpowers:subagent-driven-development` (or `superpowers:executing-plans` inline). Every task is test-first: `superpowers:test-driven-development`.
6. Before saying anything passes, run it: `superpowers:verification-before-completion`.
7. At the end of a session, update the status board below and rewrite `docs/HANDOFF.md`.

**Stop and ask Tim, rather than choosing, when:**
- a task needs SEC or NCCA content that isn't in `docs/newDevelopement/subjectDocs/` or the design (never invent or "correct" a date, rule, mark or checkpoint);
- a checkpoint gate fails and the fix would change the design;
- an open question in §3 blocks the task;
- a design handoff hasn't arrived and the task is the restyle step for that page.

---

## 1. Status board

| Phase | Milestone | Plan | Status | Gate |
|---|---|---|---|---|
| 1 Foundation | 1A Walking skeleton | written | built; gate waiting on Vercel preview (see HANDOFF) | §8.1 Gate 1A |
| | 1B Accounts and sessions | written | built; gate passed locally, preview walk waiting on Tim | Gate 1B |
| | 1C Classes and enrolment | written | built; Gate 1C walked locally, all checks green | Gate 1C |
| | 1D App shell and first journey | written | built (16 Sep 2026); `make verify` and `make e2e` green, axe clean on every page; preview walk, Tim's review and the D-1/D-2 restyle still open | **Gate P1** |
| 2 Components | 2A–2F | to write at phase start | — | **Gate P2** |
| 3 The log | 3A–3C | to write | — | **Gate P3** |
| 4 Teacher grid | 4A–4B | to write | — | **Gate P4 = pilot can start** |
| 5 School leader view | 5A | to write | — | Gate P5 |
| 6 Writing tools | 6A–6C | to write | — | Gate P6 |
| Readiness | R1–R9 | §9 | — | **Go-live gate** |

---

## 2. Decisions this roadmap takes

The design left these open, or left them to "the Phase 1 plan". Each is what I'd recommend. **Confirm or change them before 1A starts.** All are cheap to change now and get more expensive with every phase.

| # | Decision | Why |
|---|---|---|
| R1 | **Amended 15 Sep 2026: the pilot lives on `pilotMain`, its own Vercel project, still behind the flag.** `main` stays Katelyn's live BiPi site (its Vercel project, `APP_ENABLED` unset). `pilotMain` is the pilot's production branch: a second Vercel project on the same repo with Production Branch `pilotMain` and `APP_ENABLED=true`, `BACKEND_INTERNAL_URL`, `PROXY_SHARED_SECRET` in both Production and Preview; the Render web service tracks it too. Each milestone is a branch (`pilot/1a-walking-skeleton`, …) merged by PR **into `pilotMain`**. Whenever `main` changes, merge `main` → `pilotMain` promptly; never the other way until the go-live decision. The original wording (build on `main` behind the flag) was replaced because a separate production branch and project let the pilot deploy for real without touching the live site; the flag stays as the safety net. | Katelyn's live site deploys from `main` and must never change by accident. Two Vercel projects give the pilot its own URL, secrets and region. Drift is the risk of a long-lived branch, so `main` → `pilotMain` merges are routine. |
| R2 | **Spring `JdbcClient` with SQL, not JPA.** Repositories live in `adapter.persistence` as contentCreater does, but use plain SQL mapped to records. | The design leans on Postgres features — triggers, `jsonb`, one teacher-view projection, union queries for the timeline, count queries for the leader view. JPA adds lazy loading, dirty checking and `open-in-view` traps to all of that, and gives nothing back. |
| R3 | **Operator setup is a command-line runner, not an admin screen or endpoint.** `java -jar app.jar operator create-school …` (or `scripts/operator.sh create-school …`) starts without a web server, runs one command against the database, and exits. | Design §3: "The operator sets up the school, teacher accounts and the school-leader role", with no admin screen in the pilot. A CLI has no network-exposed surface to secure. |
| R4 | **Java base package `ie.coursework`.** | The product has no name yet (positioning doc). Renaming later is a mechanical IDE refactor. |
| R5 | **Three frontend test runners, separated by file name.** The existing `node --test` suite keeps `lib/**/*.test.ts`. Vitest with jsdom and React Testing Library runs `**/*.spec.ts(x)`. Playwright runs `e2e/**/*.e2e.ts`. `npm test` runs the first two. | The 74 existing tests use `node:test` and stay as they are. Component and route-handler tests need jsdom and module mocks, which `node:test` doesn't give. The suffix stops each runner picking up the others' files. |
| R6 | **BCrypt through Spring's `DelegatingPasswordEncoder`.** Minimum 10 characters, maximum 64 (and never more than 72 bytes), no composition rules. | Design §5.2 allows bcrypt or Argon2id. BCrypt needs no extra dependency, and the delegating encoder can move to Argon2id later without a reset. BCrypt reads only the first 72 bytes, and Spring Security rejects longer input outright, so the cap is explicit rather than a surprise. |
| R7 | **Login rate limits count failures only: 5 per username per 15 minutes, 100 per IP address per 15 minutes.** | A whole school sits behind one NAT address, and 30 students signing in at the start of class is normal. The per-IP limit only catches spraying; the per-username limit is the real protection. |
| R8 | **The proxy sends `X-Forwarded-For` and a shared `X-Proxy-Secret`. Spring trusts the forwarded address only when the secret matches.** | Without it, every request reaches Spring from Vercel's addresses and the per-IP limit is meaningless. Without the secret, anyone calling the API directly could forge the header. |
| R9 | **Sessions expire after 7 days idle.** | Students log on phones between classes. A daily re-login would kill criterion 3 ("students keep logging"). Teachers get a visible "Sign out". *Worth confirming with the pilot school*, because staffroom PCs are shared. |
| R10 | **Only the user id is stored in the session. Roles are loaded from the database on every request.** | A role change or removal takes effect immediately. It also keeps the serialised session tiny, and design §9 says every request resolves roles and scopes anyway. |
| R11 | **`must_change` is enforced in Spring.** Until the password is changed, every endpoint except `me`, `password`, `logout` and `csrf` returns `PASSWORD_CHANGE_REQUIRED`. | Design §5.1: all authorisation happens in Spring. A frontend redirect alone would be a suggestion. |
| R12 | **Usernames are 3–32 characters from `a-z 0-9 . _ -` and stored lowercase.** | Students type them on phones. Case-insensitive, and no characters that autocorrect mangles. |
| R13 | **Pages are built working-first, then restyled from Claude Design handoffs.** See §6.3. | Tim is designing the look in Claude Design. The plans define routes, navigation, data, actions and states; the handoff defines the look. |
| R14 | **The BiPi site's planning docs are archived, not deleted.** `IMPLEMENTATION_PLAN.md`, `HANDOFF.md`, the two BiPi briefs, `design_handoff_bipi_schedule/` and the Phase A/B plans and spec move to `docs/archive/bipi-site/`. A new, short `docs/HANDOFF.md` tracks the pilot. | `docs/CLAUDE.md` cites `IMPLEMENTATION_PLAN.md` as the design-token authority for the live site, so deleting it would break a reference that's still in use. Git keeps them either way; moving them stops sessions reading them as current. Done in 1A Task 1. |
| R15 | **Subjects are loaded as content from Phase 1**, through the second Flyway instance and its own history table. | The content-migration mechanism (design §7.1) gets proven, and deployed, on four rows before Phase 2 depends on it for four templates. |
| R16 | **The Vercel function region is Dublin (`dub1`)**, set in `frontend/vercel.json`. | Design §5.4: functions currently run in Washington DC. |
| R17 | **JSON field names are camelCase.** Problem codes are `SCREAMING_SNAKE` and are part of the API contract. | Matches contentCreater's `ErrorCode` convention and the Zod schemas on the frontend. |
| R18 | **A join code lives 30 days** from creation or rotation, not the 14 the 1C plan originally proposed. Rotating replaces it and restarts the clock; turning joining off clears it. Confirmed by Tim, 16 Sep 2026. | `JoinCode.LIFETIME`. Fewer trips back to the teacher to re-share a code mid-term. |
| R19 | **`POST /classes` names the school by id** (`schoolId` in the request body), and the teacher must hold TEACHER there — not implicitly the caller's "current" school. In the pilot every teacher has one school, so the frontend fills it from `/auth/me`. Confirmed by Tim, 16 Sep 2026. | `CreateClassRequest`. Keeps the scope check explicit and testable rather than inferred. |
| R20 | **Redeeming a password reset code does not sign the student in.** It sets the password, ends every existing session of that user, and returns 204; the page then sends them to `/login`. Confirmed by Tim, 16 Sep 2026. | `AuthController.passwordReset`. Simpler than 1D's `/reset` page carrying a session across, and §6.2's `/reset` row doesn't require sign-in. |
| R21 | **Sign-out is a POST from a client button, then `/login`.** There is no GET sign-out link. Confirmed by Tim, 16 Sep 2026 (1D plan P-4). | A GET that changes state is CSRF bait, and Spring's CSRF filter would refuse it anyway. `SignOutButton`. |
| R22 | **`/reset` sends the student to `/login` after success**, the page-side half of R20. Confirmed by Tim, 16 Sep 2026 (1D plan P-5). | Redeeming doesn't sign in, so the page has nowhere else to go. `ResetForm`. |
| R23 | **`/school` is a placeholder page until Phase 5** ("Your school overview arrives in Phase 5"). Confirmed by Tim, 16 Sep 2026 (1D plan P-6). | A school leader needs somewhere to land from §6.1's routing before 5A exists. |
| R24 | **`middleware.ts` checks only that a `SESSION` cookie exists**, to redirect a signed-out visitor to `/login?next=…`; the `(app)` layout validates the session against Spring. Confirmed by Tim, 16 Sep 2026 (1D plan P-7). | Middleware can't reach Spring cheaply on every request. A stale cookie lands on `/login` without `next`, which is acceptable. |
| R25 | **The app has its own visual system, direction 2e "Navy", and no longer shares BiPi's look.** Decided by Tim, 16 Sep 2026, when design packs D-1 and D-2 were chosen. It replaces the earlier rule that the app keeps BiPi's neutrals and radii and only picks its own accent. Only the three typefaces are still shared. Navy `#1F3A6E` accent, amber `#A04806` for pending work only, cool graphite neutrals, 10/8/6px radii, hairline field groups, subject edge bars. Values live in `docs/design/pilot/D-1-app-shell-auth/tokens.css`, built as `--app-*` in `globals.css` and applied through `.app-theme`. BiPi tokens are untouched and are used only by the live schedule and by BiPi components reused in D-3. | The packs showed a sleeker, more distinct look that suits a signed-in tool better than a poster schedule. Keeping the BiPi palette would make the pilot's primary button compete with BiPi's "now" blue. `UI-BRIEF.md` §5 has the full system. |
| R26 | **A school has an optional short name for the app header** (`school.short_name`, `Me.roles[].schoolShortName`, null when unset; the header then shows the full name). The operator sets it with `create-school --short-name=…` or `set-school-short-name`. Confirmed by Tim, 16 Sep 2026 (D-1 open question 1). | The legal name ("North Wicklow Educate Together Secondary School") doesn't fit a header row. |
| R27 | **Class page additions from D-2, confirmed by Tim 16 Sep 2026:** "Turn joining off" and "Remove" both confirm inline in place (no `window.confirm`); a copy button on the join code with a short "Copied" status; pending requests show when they asked ("asked 2 days ago", from `requestedAt`); the issued reset code shows inline in that student's row with **Hide code** and warns that hiding it can't be undone. | Destructive actions confirm in place. The relative time needs no API change. |
| R28 | **Brand placeholders until H4:** the header and auth pages show the North Wicklow ETSS crest (`frontend/public/app/crest.png`) and the name "Leaving Cert Practical" (`APP_NAME` in `frontend/lib/app/brand.ts`). Both are one-file swaps. Confirmed by Tim, 16 Sep 2026. | The frames assume both, and the pilot has a single school. |

---

## 3. Questions, and what each one blocks

From design §11, plus the ones this roadmap adds (H1–H4).

| # | Question | Must be answered before |
|---|---|---|
| **Q9** | Which cohort: 6th years now, 5th years in spring 2027, or both? | **Go-live, not build order.** The phases are the same for either cohort. Q9 decides which briefs are *live* content (R5 in §9) and the go-live date. Note Physics' 2027 completion date is 11 December 2026. Phases 1–4 won't be ready for that class, so a 6th-year pilot realistically means Biology, Business and Chemistry. |
| Q8 | Confirm D1: same repository. | 1A Task 2. Every plan assumes yes. |
| **H1** | Which EU host runs Spring Boot, and which managed EU Postgres with point-in-time recovery? | **Answered 15 Sep 2026: Render, Frankfurt, for both.** Free tiers during the build; the Gate 1A point-in-time-recovery item is deferred to the go-live gate (§9 R1) and the database is upgraded before the first real account exists. See `docs/HANDOFF.md`. |
| H2 | Which school is the pilot, and who are the teachers and school leader? | Readiness R6. Also Q1. |
| H3 | Can the Vercel project set its function region, and is it on a plan that allows `dub1`? | Gate 1A |
| H4 | Is there a product name, for the privacy notice and page titles? | Readiness R3. Until then "Leaving Cert Practical" is a placeholder (R28). |
| Q1 | Which Chemistry, Physics and Business teachers review their subject's checkpoints, and by when? | Gate P2 (content marked reviewed) |
| Q3 | Should a teacher see that a student hid an entry that used to be visible? | Phase 3 plan |
| Q2 | Leader view on-track threshold (80% is a placeholder) | Phase 5 plan |
| Q6 | Do the AI-use fields match the current Coursework Rules and Procedures? | Phase 6 plan. Needs the document added to `subjectDocs/` first. |
| Q4 | How long is pilot data kept? | Go-live |
| Q5 | Who drafts the data processing agreement and privacy notice? | Go-live. **Start this now.** It's calendar-bound, not code-bound (design §1.1). |
| Q7 | If the 2028 briefs are late, does a 5th-year pilot wait? | 5th-year go-live |

---

## 4. Working agreement

### 4.1 Test-driven, always

Every task in every plan is red → green → refactor → commit:

1. Write the test. Run it. **Watch it fail for the reason you expect.** A test that passes first time is testing nothing, or the feature already exists; find out which.
2. Write the least code that makes it pass. Run it. Watch it pass.
3. Tidy up with the tests green. Run the whole module's suite.
4. Commit: one task, one commit, with a message that says what behaviour now exists.

The test layers are design §10's:

| Layer | Tool | Lives in | Run with |
|---|---|---|---|
| Domain rules | JUnit 5, no Spring | `backend/src/test/java/…/domain/` | `make backend-test` |
| Database: migrations, triggers, content | Testcontainers, Postgres 18 | `…/adapter/persistence/`, `…/content/` | `make backend-test` |
| HTTP and authorisation | MockMvc through the real security filter chain | `…/adapter/web/`, `…/authz/` | `make backend-test` |
| Real session cookies and CSRF | `RANDOM_PORT` and the JDK `HttpClient` | `…/security/SessionFlowTest` | `make backend-test` |
| Frontend logic | `node --test` (existing) | `frontend/lib/**/*.test.ts` | `make frontend-test` |
| Frontend components and route handlers | Vitest, jsdom, React Testing Library | `frontend/**/*.spec.ts(x)` | `make frontend-test` |
| End to end | Playwright | `frontend/e2e/*.e2e.ts` | `make e2e` (needs Docker) |

**Authorisation tests come before the endpoints** (design §10). From 1C on, every endpoint that takes an id gets an "outside my scope returns 404" test in the same task that creates the endpoint.

**Frontend tests query by role and accessible name** (`getByRole('button', { name: 'Approve' })`), never by class or test id. That is the contract restyling must keep (§6.3).

### 4.2 Commands

After 1A, from the repo root:

```bash
make db-up          # Postgres 18 for local dev (Docker)
make backend-run    # Spring Boot on :8080
make frontend-run   # Next.js on :3000 (APP_ENABLED=true in frontend/.env.local)
make verify         # backend tests + frontend lint, types, tests, build
make e2e            # Playwright journey against a throwaway database
```

`make verify` must be green before every commit that finishes a task. `make e2e` must be green at every gate.

### 4.3 Branches, commits, reviews

- One branch per milestone off `pilotMain` (or off the previous unmerged milestone branch): `pilot/1a-walking-skeleton`. One PR per milestone, base `pilotMain`, merged when its gate passes. `main` is Katelyn's site: only BiPi fixes go there, and `main` is merged into `pilotMain` afterwards (R1).
- Commit per task. Message: imperative, and it says the behaviour ("Reject stage dates after the completion date"), not the file.
- After each task: a spec-compliance review against the plan, then a code-quality review (`superpowers:requesting-code-review`). After each milestone: `/code-review` on the branch.
- Never commit secrets. `.env*` is already ignored in `frontend/`. 1A adds `backend/.env` to the ignore list.

### 4.4 Content discipline

The same rule the BiPi site lives by, now with higher stakes: **never invent, approximate or "correct" SEC or NCCA content.** Every checkpoint and prompt row carries a `source_ref` (document and page). A test fails if one doesn't. Content is added only as a reviewed SQL diff, and a content task isn't done until Tim has read the diff against the PDF.

### 4.5 Keeping the docs true

- `CLAUDE.md` at the repo root (created in 1A) holds conventions that are confirmed and still true. Update it when a task establishes a new one.
- `docs/HANDOFF.md` is rewritten at the end of every session: where things stand, what's half-done, what's waiting on a human.
- Tick plan checkboxes as steps complete, in the same commit.
- `docs/ARCHITECTURE.md` describes the code as built. A change to anything it describes fixes it in the same commit; sessions end by checking it for anything made false.

---

## 5. Repository shape after Phase 1

The tree below is the Phase 1 target as planned. `docs/ARCHITECTURE.md` §1 and §6 describe what was built and is kept current; where they differ, the architecture doc is right.

```
biologyProject/
  CLAUDE.md                  monorepo conventions (new, 1A)
  Makefile                   same targets as contentCreater
  compose.yaml               postgres (dev) + postgres-e2e (profile e2e)
  scripts/e2e.sh             starts the throwaway DB, runs Playwright, tears down
  docs/
    PILOT-DESIGN.md          the design
    PILOT-ROADMAP.md         this file
    HANDOFF.md               pilot status, rewritten each session
    design/pilot/            Claude Design handoffs, one folder per page (§6.3)
    archive/bipi-site/       the live site's finished planning docs
    newDevelopement/         specs and subject documents (unchanged)
    superpowers/plans/       one detailed plan per milestone
  backend/
    pom.xml, mvnw, Dockerfile
    src/main/java/ie/coursework/
      CourseworkApplication.java
      shared/error/          ErrorCode, DomainException, ProblemDetailsAdvice
      shared/config/         Clock bean, content Flyway
      security/              SecurityConfig, principal, rate limiter, client IP, filters
      identity/              domain / application / adapter.persistence / adapter.web / adapter.cli
      classes/               domain / application / adapter.persistence / adapter.web
      audit/                 AuditLog and event types
    src/main/resources/
      application.yaml
      db/migration/          schema: V1__…
      db/content/            content: V1__subjects.sql, later templates and briefs
  frontend/
    app/[class]/             the live public schedule (unchanged)
    app/(app)/               the pilot app, gated by APP_ENABLED
      layout.tsx             loads the session and renders the nav
      home/ components/ teach/ school/ account/
    app/(auth)/              login, join, reset (no nav, gated by APP_ENABLED)
    app/api/v1/[...path]/    the same-origin proxy
    lib/api/                 typed client, problem parsing, Zod schemas
    lib/app/                 session, routing and navigation helpers
    components/app/          app components (restyled from design handoffs)
    components/bipi/         the live site's components (reused in Phase 2)
    e2e/                     Playwright journeys
```

---

## 6. Pages and navigation

This is what Claude Design needs to design against: every page, who sees it, what it shows, what you can do on it, and the states it has to handle. **How it looks is the design's call.** What it does is fixed here and pinned by tests.

### 6.1 Navigation

**After sign-in**, in this order:
1. If `mustChangePassword`, go to `/account/password`. Nothing else is reachable until it's done (R11).
2. If the URL had a safe `?next=` (it starts with `/` and not `//`), go there.
3. Otherwise go to the landing page of the highest role held: Teacher → `/teach`, School leader → `/school`, Student → `/home`.

**Signed out:** any app route redirects to `/login?next=<path>`.

**App header**, on every app page (D-1):
- the crest and app name (a link to the landing page), then the school's short name (R26; hidden on phones);
- a role switcher, shown only when the user holds more than one role (e.g. a year head who teaches). It links to `/teach`, `/school` and `/home` for the roles held. On phones it's a full-width segmented row, with "School overview" shortened on screen to "School" (the accessible name stays the same);
- an account menu with the person's name, "Change password" and "Sign out".

**Student** (mobile-first):
- Primary: **Timeline** (`/home`) · **My components** (Phase 2, one entry per component, labelled by subject) · **Join a class** (`/join`)
- Inside a component: **Overview** · **Log** (P3) · **Sources** (P6) · **AI use** (P6) · **Word checker** (P6)

**Teacher** (desktop-first):
- Primary: **Classes** (`/teach`)
- Inside a class: **Students** · **Component** (P2) · **Progress** (P4)

**School leader**:
- Primary: **School overview** (`/school`)

### 6.2 Page inventory

"States" lists what the page has to show besides the happy path. Every page also handles "API unreachable" with the shared error panel.

**Auth pages** — route group `(auth)`, no app header

| Route | Phase | Shows | Actions | States |
|---|---|---|---|---|
| `/login` | 1D | Crest lockup; username and password form; links to `/join` and `/reset` | Sign in | Wrong credentials (one message for both), too many attempts (amber, with retry time; Sign in stays enabled because the API gives the wait only as text), already signed in → routed as in §6.1 |
| `/account/password` | 1D | Current password, new password, confirm | Change password | Forced mode (no way out except Sign out), new password too short, current password wrong |
| `/join` | 1D | Join-code entry, with "Your teacher reads an 8-character code out in class. Lowercase is fine." | Continue | Code unknown or expired (one message) |
| `/join/[code]` | 1D | Heading "Join a class", then a "You're joining" card with class name, subject and school (subject edge bar). Signed out: "Create account" form (first name, surname, username, password) plus a "Sign in instead" link. Signed in: "Join this class" button. | Create account and request to join · Join | Username taken, password too short, already enrolled (shows current status as a Pending approval / Approved eyebrow), code expired between steps (the form is dropped for the error and an "Enter a different join code" link) |
| `/reset` | 1D | Username, reset code from teacher, new password | Set new password | Code wrong or expired (one message), too many attempts (amber), done ("Password set" with a Sign in button, R22) |

**Student pages** — route group `(app)`

| Route | Phase | Shows | Actions | States |
|---|---|---|---|---|
| `/home` | 1D | My classes with status (Pending approval / Approved) | Join a class | No classes yet; all pending |
| `/home` | 2F | **Timeline**: chronological list, week view, month view, across every approved class. Items are stage dates, dated teacher items and my own items, labelled by subject, with days remaining and distinguished by type. | Switch list/week/month · Add my own item · Edit/delete my own item | No components yet (still shows my own items); nothing in range; pending-only classes |
| `/components/[id]` | 2E | Stages with the teacher's dates and current stage; each checkpoint's state; teacher items to tick; prompts; report sections; rules; mark bands; the process note | Tick/untick a teacher item (labelled self-reported) | Before the first stage; after completion date; no dates set yet by teacher |
| `/components/[id]/log` | 3B | My entries newest first, each with kind, date, "edited" marker, who can read it | New entry (note/source/AI use as note until P6) · Hide/show one tap · Edit | Empty log; hidden entries |
| `/components/[id]/log/new`, `/components/[id]/log/[entryId]` | 3B | Entry form with the plain-words visibility line (FR-24e); entry detail with revision history | Save · Save new revision · Toggle visibility | Validation; https-only links |
| `/components/[id]/sources` | 6B | Source entries, formatted in-text citation and reference-list entry | Add source · Copy citation · Copy reference list | No sources |
| `/components/[id]/ai-use` | 6A | AI-use entries and the formatted appendix block | Add AI use · Copy appendix · Copy reference entry | None recorded; the "discuss with your teacher first" note (FR-28) |
| `/components/[id]/checker` | 6C | Paste boxes per section, counts against the brief's limits, the "words not counted" list, image limit note | Paste, clear | Over limit; Business per-section budgets. **No network request, ever.** |

**Teacher pages**

| Route | Phase | Shows | Actions | States |
|---|---|---|---|---|
| `/teach` | 1D | My classes as cards with a subject edge bar: name, then subject · year · academic year · level, and an amber pending-request badge only when above zero (API order, not sorted by pending) | Create class | No classes (a card with the sentence and Create class) |
| `/teach/classes/new` | 1D | "My classes" link; subject, name, year group, academic year, level (optional) | Create · Cancel | Validation (the error panel, and each invalid row marked with its message) |
| `/teach/classes/[id]` (Students tab) | 1D | "My classes" link; section tabs (Students current; Component and Progress shown disabled until P2/P4); join code on a navy card with expiry and a copy button; pending requests with username and "asked …"; approved students | Copy code ("Copied") · New code · Turn joining off (confirm in place) · Approve · Decline · Remove (confirm in place) · Issue reset code (inline in that row, shown once, 24-hour expiry, Hide code, warns hiding can't be undone) | No students; nothing waiting; code off (R27) |
| `/teach/classes/[id]/component` | 2D | No component yet: choose the brief (subject + exam year). Component set: stage date for each stage, the completion date, my own items per stage | Create component · Set/change dates · Add, edit, retire my items | Date after completion date (named error); out-of-order dates (warning, allowed); brief's completion date changed (warning) |
| `/teach/classes/[id]/progress` | 4A | Grid: students × checkpoints, sign-off state and date, due markers, "behind by N", days since last log entry; furthest behind first | Sign off · Revoke | No component; nothing due yet; no approved students |
| `/teach/classes/[id]/students/[studentId]` | 3C / 4B | One student: their log in the teacher projection (hidden entries show kind and date only), their checkpoints | Sign off/revoke (4B) | Hidden entries; no entries |

**School leader page**

| Route | Phase | Shows | Actions | States |
|---|---|---|---|---|
| `/school` | 5A | For a year group and academic year: each class × each stage — "not started", or "N of M fully signed off" — and on track/behind per class. Counts only, no names. | Choose year group · Choose academic year | No classes with components; leader of more than one school (choose school) |

### 6.3 Design handoff protocol

1. **The build task comes first and works without the design.** It uses semantic HTML, shadcn primitives and the existing tokens, and gets a Vitest spec that queries by role and accessible name. The page is plain, but complete: every state in §6.2 renders.
2. **Tim's design arrives as a folder** in `docs/design/pilot/<pack-name>/`: the Claude Design export, a `tokens.css` of `--app-*` additions, and a `NOTES.md` on the template in `docs/design/UI-BRIEF.md` §8. Claude Design is briefed with `UI-BRIEF.md` plus this section's rows for the pages in the pack.
3. **A restyle task** follows, built to `docs/design/UI-STANDARDS.md` (§15 is the working method) and checked against `docs/design/UI-CHECKLIST.md`. Its rule: **the existing specs must pass unchanged.** If the design renames a button, change the spec in a separate, visible commit first.
4. **If the design changes behaviour** — adds a state, removes an action, moves something to another page — that's a roadmap change. Update §6.2 before building it.
5. The app's visual system is its own, direction 2e "Navy" (R25, `UI-BRIEF.md` §5), fixed by D-1 and D-2. Only the typefaces are shared with BiPi. Later packs build on `docs/design/pilot/D-1-app-shell-auth/tokens.css` and don't choose a new palette. Light only.

**Design packs to request, and when they're needed:**

| Pack | Pages | Needed by |
|---|---|---|
| D-1 App shell and auth | header, role switcher, account menu, `/login`, `/join`, `/join/[code]`, `/reset`, `/account/password` | Restyle at end of 1D |
| D-2 Teacher classes | `/teach`, `/teach/classes/new`, `/teach/classes/[id]` Students tab | End of 1D |
| D-3 Student component | `/components/[id]` (mobile-first; reuses BiPi stage cards, crosswalk, rules, marks) | Phase 2E |
| D-4 Timeline | `/home` list, week, month, add-item | Phase 2F |
| D-5 Teacher component setup | `/teach/classes/[id]/component` | Phase 2D |
| D-6 Log | student log list, entry form, entry history; teacher student view | Phase 3 |
| D-7 Progress grid | `/teach/classes/[id]/progress` | Phase 4 |
| D-8 School overview | `/school` | Phase 5 |
| D-9 Writing tools | sources, AI use, checker | Phase 6 |

### 6.4 Route guard rules

- Every top-level app route name is in `frontend/lib/app/routes.ts` (`APP_ROUTE_NAMES`). A `node:test` fails if any class slug in `lib/classes/` matches one (design §5.3).
- `app/(app)/layout.tsx` and `app/(auth)/layout.tsx` call `notFound()` unless `APP_ENABLED === 'true'` (R1).
- The frontend hides what a role can't do. **Spring decides.** A hidden button is never the protection.

---

## 7. API catalogue

All under `/api/v1`. JSON, camelCase. Errors are RFC 9457 problem details with a `code`. Anything outside the caller's scope returns **404** (design §9). Unsafe methods need the `X-XSRF-TOKEN` header.

### Phase 1

| Method and path | Who | Does |
|---|---|---|
| `GET /health` | anyone | `{ "status": "UP" }` |
| `GET /auth/csrf` | anyone | 204. Issues the `XSRF-TOKEN` cookie. |
| `POST /auth/login` | anyone | Starts a session. Returns `Me`. Codes: `INVALID_CREDENTIALS`, `TOO_MANY_ATTEMPTS`. |
| `POST /auth/logout` | signed in | 204. Ends the session. |
| `GET /auth/me` | signed in | `Me` = `{ userId, username, firstName, lastName, mustChangePassword, roles: [{ schoolId, schoolName, schoolShortName, role }] }` (`schoolShortName` nullable, R26) |
| `POST /auth/password` | signed in | Changes password, clears `mustChange`. Codes: `INVALID_CREDENTIALS`, `PASSWORD_TOO_SHORT`. |
| `POST /auth/password-reset` | anyone | `{ username, code, newPassword }`. Ends that user's other sessions. Code: `RESET_CODE_INVALID`. |
| `GET /subjects` | signed in | The four subjects |
| `GET /join/{code}` | anyone | `{ className, subjectName, schoolName }`. Code: `JOIN_CODE_INVALID`. |
| `POST /join/{code}/accounts` | anyone | Creates a student account, signs in and requests to join. Codes: `USERNAME_TAKEN`, `PASSWORD_TOO_SHORT`, `JOIN_CODE_INVALID`. |
| `POST /join/{code}/enrolments` | signed in | Requests to join with the current account. Returns enrolment status. |
| `GET /me/classes` | student | My classes with enrolment status |
| `GET /classes` | teacher | Classes I own |
| `POST /classes` | teacher | Create class (gets a join code) |
| `GET /classes/{id}` | owning teacher | Class, join code, enrolments |
| `POST /classes/{id}/join-code` | owning teacher | Rotate. `DELETE` turns joining off. |
| `POST /classes/{id}/enrolments/{enrolmentId}/approve` | owning teacher | Approve |
| `POST /classes/{id}/enrolments/{enrolmentId}/remove` | owning teacher | Decline or remove |
| `POST /classes/{id}/students/{studentId}/reset-codes` | owning teacher | One-time code, 24 hours, shown once |

### Phases 2–6 (shape only; each phase plan fixes the details)

| Phase | Endpoints |
|---|---|
| 2 | `GET /briefs?subjectCode=&examYear=` · `POST /classes/{id}/components` · `GET /components/{id}` (role-shaped view) · `PUT /components/{id}/stage-dates` · `POST/PATCH/DELETE /components/{id}/teacher-items[/{itemId}]` · `PUT /components/{id}/teacher-items/{itemId}/tick` · `GET /me/components` · `GET /me/timeline?from=&to=` · `GET/POST/PATCH/DELETE /me/personal-items[/{id}]` |
| 3 | `GET/POST /components/{id}/log` · `POST /log/{entryId}/revisions` · `GET /log/{entryId}/revisions` · `PUT /log/{entryId}/visibility` · `GET /components/{id}/students/{studentId}/log` (teacher projection) |
| 4 | `GET /components/{id}/progress` · `POST /components/{id}/students/{studentId}/signoffs` · `POST /signoffs/{id}/revoke` |
| 5 | `GET /schools/{schoolId}/overview?yearGroup=&academicYear=` |
| 6 | `GET /components/{id}/references` · `GET /components/{id}/ai-use/appendix` |

---

## 8. Phases

Each phase lists what it delivers, the outline of its tasks (each becomes TDD steps in the phase plan), what design it needs, and its **gate** — the checkpoint that has to pass before the next phase starts.

### 8.1 Phase 1 — Foundation

**Goal:** a teacher can be set up by the operator, create a class and read out a join code; a student can sign up with it, wait, be approved, and sign back in. Deployed to EU hosting from the first milestone.

#### 1A Walking skeleton — plan written

1. Housekeeping: commit the design move, archive the BiPi docs (R14), root `CLAUDE.md`, move the BiPi-specific rules out of `docs/CLAUDE.md`, add a pilot `docs/HANDOFF.md`
2. Backend scaffold: Maven wrapper, Spring Boot 4.1.1, Java 21, context loads against Testcontainers Postgres 18
3. `compose.yaml` and `Makefile`
4. Problem details: `ErrorCode`, `DomainException`, `ProblemDetailsAdvice`
5. Content Flyway: second instance, own history table, `V1__subjects.sql`
6. Security baseline: `/api/v1/health` public, everything else 401 as problem details
7. Frontend test tooling: Vitest, jsdom, RTL, Zod; `.spec` convention (R5)
8. `APP_ENABLED` gate and `APP_ROUTE_NAMES` collision test
9. The proxy route: cookies, CSRF header, `Set-Cookie` back, forwarded IP, proxy secret, 502 problem when down
10. Typed API client and `ApiError`, with server-side cookie forwarding
11. Deploy: Dockerfile, EU host (H1), EU Postgres, Vercel `dub1`, Preview env

**Gate 1A**
- [ ] `make verify` green
- [ ] The pilot Vercel project's deployment of `pilotMain` returns `{"status":"UP"}` from `GET /api/v1/health` through the proxy from the EU backend
- [ ] Response headers show the function ran in `dub1`
- [ ] Katelyn's Vercel project (`main`) still returns 404 for `/login` and 200 for the live class pages; the pilot project (`pilotMain`) serves `/login`
- [ ] ~~The database has a point-in-time-recovery setting turned on~~ Deferred to the go-live gate by Tim, 15 Sep 2026 (free Render Postgres during the build; no real data until onboarding). Must be on, with a restore tested, before go-live (§9 R1).

#### 1B Accounts and sessions — plan written

1. Identity and session schema
2. Domain rules: `Username`, `PasswordPolicy`, `Role`, `Actor`
3. Repositories and the clock
4. Audit log
5. Operator commands: `create-school`, `create-user`, `grant-role`
6. JSON login and logout on Spring Session JDBC, session id rotation, and the `ApiSession` MockMvc helper
7. Session flow over real HTTP: cookies, attributes, CSRF, logout
8. Login rate limiting (R7) and the trusted client address (R8)
9. The actor and `GET /auth/me`
10. Change password, `must_change` enforcement (R11), and `GET /subjects` as the first ordinary endpoint

**Gate 1B**
- [ ] `make verify` green
- [ ] Operator creates a school and a teacher on the deployed backend. The teacher signs in through the Preview proxy with `curl` and a cookie jar, is forced to change their password, then reaches `/auth/me`.
- [ ] Deploying a new backend build doesn't sign that session out
- [ ] The sixth wrong password for one username returns `TOO_MANY_ATTEMPTS`

#### 1C Classes and enrolment — plan to write after 1B

1. Schema: `subject` rows (from 1A), `class_group`, `enrolment`
2. `JoinCode` generation (8 characters, no 0/O/1/I/L) and expiry
3. Test fixtures (schools, users, classes) and authorisation test skeletons per role
4. Create and list classes
5. Class detail, rotate code, turn joining off
6. Join preview and join with an existing account
7. Student sign-up through a join code
8. Approve, decline, remove; `GET /me/classes`
9. Password reset codes: issue and redeem
10. Authorisation suites filled in: teacher, student, leader, anonymous

**Gate 1C — walked locally, 16 Sep 2026**
- [x] `make verify` green
- [x] Every endpoint in §7 Phase 1 has a scope test: another teacher's class → 404; a student calling teacher endpoints → 404; an enrolment id from another class → 404
- [x] Audit rows exist for role grants, enrolment decisions, reset codes and code rotation

Results in `docs/HANDOFF.md`. 151 backend tests pass (schema through the completed authorisation suites). The manual journey (create school/teacher/class, student signs up and is approved, teacher issues a reset code, student redeems it and the old session is invalidated) was walked by hand against the local stack; not yet re-walked against the Render/Vercel preview the way 1A/1B were — that's still open before merging to `pilotMain`.

#### 1D App shell and first journey — plan written

1. Server session helper and `(app)` layout with the nav from §6.1
2. `/login` and post-sign-in routing
3. `/account/password`
4. `/join` and `/join/[code]`
5. `/home` (my classes)
6. `/teach`, `/teach/classes/new`
7. `/teach/classes/[id]` Students tab
8. `/reset`
9. Playwright harness (`scripts/e2e.sh`, `make e2e`) and the Phase 1 journey
10. Restyle from D-1 and D-2 when they arrive (§6.3) — **not started: `docs/design/pilot/` doesn't exist yet (16 Sep 2026).** Pages are plain, semantic HTML with the shadcn `Button`; every spec queries by role and name, so the restyle must keep them green.

**Gate P1 — end of Phase 1** (tasks 1–9 built 16 Sep 2026, see `docs/HANDOFF.md`)
- [x] `make verify` and `make e2e` green — locally, 16 Sep 2026: the journey passes on both Playwright projects (laptop and phone)
- [ ] On Vercel Preview against the EU backend, by hand: operator creates a school and teacher → teacher signs in, changes password, creates a class → a phone opens `/join`, enters the code, creates an account → teacher approves → phone shows the class as approved → teacher issues a reset code → phone resets its password and signs in
- [ ] Keyboard-only run of the same journey on a laptop; no WCAG 2.2 AA failures in an axe scan of each page (`@axe-core/playwright` in the e2e) — *the axe half is done*: every page the journey visits is scanned with `wcag2a`, `wcag2aa`, `wcag22aa` and reports no violations; `phase1.e2e.ts` also signs in keyboard-only. The full keyboard-only walk by hand is still to do.
- [ ] Tim has reviewed the pages (design restyle can still be pending)

### 8.2 Phase 2 — Components and the timeline

**Goal:** a teacher sets up a component for a class from the real 2027 brief, with dates and their own items. A student sees it on a mobile page and on a cross-subject timeline that also holds their own items.

**Before the plan is written:** the four final 2027 briefs and the Coursework Rules and Procedures are in `subjectDocs/` (design §4.1 action). Design pack D-3, D-4 and D-5 requested.

| Milestone | Tasks (outline) |
|---|---|
| **2A Template schema** | Tables in design §6.2 and §6.3. Trigger rejecting insert, delete and ordinal changes on a published version's rows (test each). Text updates on published rows allowed (test). |
| **2B Science content** | One content source generates Biology, Chemistry and Physics template SQL. Content tests: every checkpoint and prompt has `source_ref`; mark bands sum to `marks_total`; stage count and labels match design §7.2; the §7.3 checkpoints are present with their basis. **Tim reads the diff against the PDFs.** |
| **2C Business content and 2027 briefs** | Business template (6 stages plus Compilation, `hours_group` for 4–5). Four `annual_brief` rows with rules, word/image limits and completion dates from the **final** briefs, never the `EN-EX` samples. Test: each brief's completion date equals the §4.3 table. |
| **2D Teacher component setup** | `component_instance`, `instance_stage_date`, `teacher_item`. Completion-date rule as a pure domain rule, a service check with `COMPLETION_DATE_EXCEEDED`, and a trigger (tests for all three). Out-of-order warning. Page `/teach/classes/[id]/component`. |
| **2E Student component page** | `GET /components/{id}` shaped by role. `item_tick`. Adapter from the API response to the BiPi components' props (`StageCard`, `ReportCrosswalk`, `ReportRules`, `MarksCard`) — the stage state comes from the class's own dates, reusing `lib/schedule.ts`'s Dublin-safe logic. Page `/components/[id]`. |
| **2F Personal items and timeline** | `personal_item` (owner-only; authz test that teacher and leader sessions can't reach any row). Timeline query as a union with `from`/`to`. `/home` list, week and month views, add/edit/delete. |

**Gate P2**
- [ ] `make verify` and `make e2e` green, with the journey extended: teacher creates a Biology component, sets dates, one date after the completion date is refused with the named message; student sees the stages and adds a personal item; the timeline shows both, in order, labelled
- [ ] Content: Tim has checked every checkpoint, prompt, rule, band and date against the source PDFs; the diff review is recorded in `docs/HANDOFF.md`
- [ ] Katelyn has reviewed the Biology checkpoints (Q1 for the other three can still be open, but the pilot can't use those subjects live until it isn't)
- [ ] Changing a published template's structure in a migration fails the test suite

### 8.3 Phase 3 — The log

**Goal:** students keep a dated, versioned log per component, control who reads each entry, and the teacher sees activity for every entry but content only for visible ones.

**Before the plan:** Q3 answered. D-6 requested.

| Milestone | Tasks (outline) |
|---|---|
| **3A Log model** | Tables in design §6.6. Domain rules: server-set `created_at`, revisions append-only (a DB rule rejects `UPDATE`/`DELETE` on `log_entry_revision`), `fields` validated per kind by Java records, links https only. |
| **3B Student log** | Endpoints for list, create, revise, history, visibility toggle (recorded in `log_visibility_change`). New entries default visible. Pages: log list, entry form with the plain-words visibility line, history. |
| **3C Teacher reading view** | One projection class builds the teacher view; a test proves a hidden entry's body, fields and history never appear in the JSON, while its kind, dates and revision count do. Page `/teach/classes/[id]/students/[studentId]`. |

**Gate P3**
- [ ] `make verify` and `make e2e` green; journey extended: student logs an entry, hides it; teacher sees an entry exists on that date, not its text; student edits another entry, teacher sees "edited" and the history
- [ ] An attempt to back-date (send `createdAt`) is ignored, and a test says so
- [ ] Authz: another student's log → 404; a teacher of a different class → 404

### 8.4 Phase 4 — Teacher grid

**Goal:** a teacher finds who's behind without asking around. **Passing this gate means the pilot can start** (design §3 cut line).

**Before the plan:** D-7 requested.

| Milestone | Tasks (outline) |
|---|---|
| **4A Behind, and the grid** | `checkpoint_signoff` (never deleted; at most one un-revoked per student and checkpoint, enforced by a partial unique index). Domain: "due" and "behind by N" (design §8.4) as pure functions with date-boundary tests using Dublin dates. Grid endpoint sorted by behind, then days since last log entry. Page `/teach/classes/[id]/progress`. |
| **4B Sign-offs** | Sign off and revoke, audited. From the grid and from the student view. |

**Gate P4 — pilot can start**
- [ ] `make verify` and `make e2e` green; journey extended: teacher signs off a checkpoint and the student moves up the grid; revoke puts them back; the student's component page shows the checkpoint state
- [ ] A 30-student × 7-checkpoint grid renders in under a second on the deployed stack (seeded by a test fixture script)
- [ ] Every readiness item marked "before go-live" in §9 is done, or Tim has explicitly accepted it as a risk

### 8.5 Phase 5 — School leader view

**Goal:** a deputy principal sees where every class stands, stage by stage, across a year group. Counts only.

**Before the plan:** Q2 answered. D-8 requested.

- **5A** Overview query and endpoint (`SCHOOL_LEADER` for that school only; authz tests for another school and for a teacher). Domain: per class × stage "not started" / "N of M fully signed off", on track at the Q2 threshold, compared by stage status, never by calendar position (design §4.3). Page `/school`.

**Gate P5**
- [ ] `make verify` and `make e2e` green; journey extended: teacher signs off, leader counts change
- [ ] A test proves the overview JSON contains no student names, ids or log content

### 8.6 Phase 6 — Writing tools

**Goal:** the AI-use record, reference builder and word/format checker.

**Before the plan:** Q6 answered against the actual Coursework Rules and Procedures. D-9 requested.

| Milestone | Tasks (outline) |
|---|---|
| **6A AI-use record** | `AI_USE` fields record (design §6.7, checked against the document). Appendix block and reference entry formatter, tested against the SEC's own examples. Page `/components/[id]/ai-use`. |
| **6B Reference builder** | `SOURCE` fields record. In-text citation and reference-list formatter, tested against the NCCA example strings as fixtures. Page `/components/[id]/sources`. |
| **6C Word and format checker** | Pure TypeScript counting in `lib/`, `node:test` suite. Page `/components/[id]/checker`. A Playwright test asserts no request leaves the page while typing and that `localStorage` stays empty. |

**Gate P6**
- [ ] `make verify` and `make e2e` green
- [ ] Every NCCA/SEC example string reproduces exactly
- [ ] The checker's no-network test passes

---

## 9. Pilot readiness track

These run alongside the phases, and most are calendar-bound rather than code-bound (design §1.1). Start the ones marked **now** this week.

| # | Item | Owner | When |
|---|---|---|---|
| R1 | Hosting chosen (H1); backups turned on; **a restore actually tested** into a scratch database | Claude builds, Tim approves | Gate 1A (chosen), before go-live (restore tested) |
| R2 | Monitoring: uptime check on `/api/v1/health` through the proxy; error tracking on both tiers; structured JSON logs with a correlation id passed by the proxy | Claude | Phase 3 |
| R3 | Privacy notice for students and parents; data processing agreement with the school; DPIA treating the log and personal items as content (design §9) | Someone qualified (Q5) | **Now** — before go-live |
| R4 | Content review: Katelyn for Biology; named teachers for Chemistry, Physics, Business (Q1) | Tim | **Now** — before Gate P2 for Biology |
| R5 | Source documents: four final 2027 briefs and the Coursework Rules and Procedures added to `subjectDocs/`; fix the swapped filenames noted in design §4.1 | Tim | **Now** — before Phase 2 plan |
| R6 | Onboarding runbook: operator CLI commands for the pilot school, teacher first sign-in, a one-page "how to join" for students | Claude drafts, Tim edits | Before go-live |
| R7 | 2028 briefs loaded as content migrations when the SEC publishes them (5th-year cohort only) | Claude, Tim reviews | Term 2 2027 |
| R8 | Retention and erasure procedure (Q4): what the operator runs when the school asks for a student's data to be erased | Claude drafts | Before go-live |
| R9 | Live BiPi site: fix the report-rules card (allowed formatting; formulae don't count toward images) — design §12 | Claude, separate small branch | Any time |

**Go-live gate**
- [ ] Gate P4 passed
- [ ] R1 restore tested, R3 signed, R4 done for every subject going live, R6 runbook used once in a dry run with Tim as the teacher
- [ ] `APP_ENABLED=true` set in Vercel Production, and the pilot school's accounts created

---

## 10. Cut line and calendar

- **Phases 1–4 start the pilot.** Phases 5 and 6 arrive during it (design §3).
- The build order doesn't depend on Q9. The go-live date does:
  - **6th years:** go-live as soon as Gate P4 and the go-live gate pass. Every week of build is a week of a class's runway gone, so Biology (26 Feb), Business (12 Mar) and Chemistry (23 Apr) are the realistic subjects; Physics (11 Dec) almost certainly isn't.
  - **5th years:** go-live the week the 2028 briefs are published and loaded (R7).
- No dates are put on the phases here, deliberately. After Gate 1A, record how long it actually took in `docs/HANDOFF.md`, and estimate the rest from that rather than from a guess made today.

---

## 11. Risks

| Risk | What reduces it |
|---|---|
| The calendar-bound items (R3, R4, R5) finish after the code | Start them now; they're on the go-live gate, not a phase gate |
| A wrong checkpoint or date costs a teacher's trust permanently | `source_ref` on every row, content tests, Tim's diff review, subject-teacher review |
| An authorisation bug leaks a student's log | Authz tests written before endpoints; one teacher-view projection; 404 for out of scope; `personal_item` owner-only test |
| Next.js proxy mishandles cookies or CSRF and everything looks fine in unit tests | Route handler specs for each header, plus `SessionFlowTest` and the Playwright journey through the real proxy |
| Design handoffs change behaviour late | §6.3: behaviour changes go through this roadmap first; restyles keep the specs green |
| Next 16 upgrade temptation | Stay on 15.3.9 until Vercel supports the Adapter API (design §5.4) |
| A deploy signs everyone out mid-lesson | Spring Session JDBC; tested at Gate 1B |
