# Handoff — coursework pilot

Rewritten at the end of every session. The live BiPi site's final handoff is archived at `docs/archive/bipi-site/HANDOFF.md`; its open items (Katelyn's copy sign-offs, print page count) still stand.

## Where things are

- **1C Classes and enrolment is built.** All 11 tasks done on branch `pilot/1c-classes-and-enrolment` (branched from `pilotMain` at `3d9dbcb`, not yet merged — **no PR opened; Tim opens and merges PRs**). `make verify` is green, 151 backend tests pass, Gate 1C's three checkboxes are all ticked. See "Gate 1C" below for what was walked and what's still open before merging.
- **Current milestone: 1D App shell and first journey.** Plan already written and its decisions already confirmed: `docs/superpowers/plans/2026-09-15-pilot-1d-app-shell-and-first-journey.md`. It mirrors 1C's response records in Zod (`ClassViews`, `SignUpRequest`, `PasswordResetRequest`, `CreateClassRequest`, `EnrolmentView`, etc.) — **no field names or shapes changed during 1C's build** (only two internal bugs were fixed, see "Deviations" below; the wire contract is exactly what 1D's plan assumed), so 1D's Zod schemas should not need adjusting. Start 1D from `pilot/1c-classes-and-enrolment` once it's merged, or from that branch directly if 1D work needs to start before Tim reviews the 1C PR.
- **Session 2 (16 Sep 2026):** all of 1C in one session, using `superpowers:subagent-driven-development` — a fresh implementer subagent per task, each running its own TDD cycle and committing, with two-stage (spec + code-quality) review for Tasks 1–6. Tim asked partway through to drop the separate reviewer-agent step for speed; Tasks 7–10 and Gate 1C were self-verified directly (reading the actual diff, re-running the tests) instead of via a second review subagent.
- **1A and 1B are merged and live** on `pilotMain` (PRs #3 and #4), gates walked on the real Render + Vercel hosts on 16 Sep 2026. See "Gate 1A" / "Gate 1B" below, carried over from the previous session — nothing there has changed.

## Gate 1C — walked locally, 16 Sep 2026

- [x] `make verify` green (151 backend tests; frontend untouched by this milestone, its checks pass as before)
- [x] Every endpoint in roadmap §7 Phase 1 has a scope test: another teacher's class → 404; a student calling teacher endpoints → 404; an enrolment id from another class → 404 (Tasks 4 and 10 — `classes/authz/{Teacher,Student,Leader,Anonymous}ScopeTest.java`)
- [x] Audit rows exist for role grants (sign-up and join), enrolment decisions, reset codes and code rotation (asserted in Tasks 6, 7, 8, 9)

**Manual journey walked against the local stack** (`make db-up`, packaged jar, `127.0.0.1:8080`), following the plan's Task 11 Step 2 script exactly: operator created a school and teacher, teacher logged in and changed password, created a class and got a join code back, a student previewed the code and signed up (PENDING), the teacher approved them (APPROVED, visible on the student's own `/me/classes`), the teacher issued a reset code, the student redeemed it (204), and the old session was confirmed dead (401 on `/auth/me`) — proving the session-invalidation-on-reset behaviour. All nine checkpoints passed first time.

**Not yet done, unlike 1A/1B's gates:** this was walked only against the local stack, not against the Render/Vercel preview. Before or as part of opening the PR, walk it again on the deployed preview the way 1A/1B's final gate walks were done (Render Shell for the operator commands, curl from a local machine against the pilot Vercel URL).

**Local throwaway data now sitting in the dev Postgres** (from `make db-up`, not shared/production — harmless, but accumulating): two "Gate Check School" rows (roll `00009Z` from 1B's gate walk, roll `00010C` from 1C's), and accounts `gate.teacher` / `gate.teacher.c` / `gate.student.c`. Fine to leave for now since local Postgres gets rebuilt from Flyway anyway, but a `make db-down` before the next big local run would clear it.

## Commits on `pilot/1c-classes-and-enrolment` (ahead of `pilotMain`)

Oldest first:

1. `71303b7` Record 1A/1B gate walks and confirm 1C/1D decisions (carried over from session 1, committed at the start of this session)
2. `e9149eb` Task 1 — `class_group`/`enrolment` schema
3. `e67edc0` Task 2 — `JoinCode`, `EnrolmentStatus`, `Level`, `ClassGroup`, `Enrolment`, four new `ErrorCode`s
4. `9639775` Task 3 — `ClassGroupRepository`, `EnrolmentRepository`, `ClassFixtures`
5. `345e734` Fix: `membersOf` ordering reverted to pending-first (see Deviations)
6. `d51c284` Task 3 code-quality follow-up: mechanism comment on `EnrolmentRepository.request`, named constants in `ClassFixtures`
7. `891f26a` Task 4 — the four authorisation-scope suites, written red
8. `10780d6` Task 4 code-quality follow-up: test naming/comments
9. `639d778` Task 5 — create and list classes
10. `3cc56f9` Task 6 — class detail, rotate/disable join code
11. `485d74c` Fix: tautological audit-log assertion in `ClassDetailTest` (see Deviations)
12. `9995edf` Task 7 — join preview, sign-up, join with an existing account
13. `e227312` Task 8 — approve, decline, remove
14. `9afcf6f` Task 9 — password reset codes
15. `aea0baa` Task 10 — authorisation suites completed for every role
16. *(uncommitted at session end)* Task 11 — Gate 1C doc updates (this file, `docs/PILOT-ROADMAP.md`, root `CLAUDE.md`)

## Deviations from the 1C plan, all caught and fixed during the build

- **Task 3 — the plan's literal fixture join codes were invalid.** `"CLASSPNE"`/`"CLASSTWP"` (the plan's own O→P, I→J substitution for `CLASSONE`/`CLASSTWO`) still contain the letter `L`, which the join-code alphabet and the DB's `class_group_join_code_format` CHECK both exclude. Fixed to `"CKASSPNE"`/`"CKASSTWP"` (L→K) in `ClassFixtures.java`. Any future plan that hand-writes a join-code literal needs to check it against `^[A-HJKMNP-Z2-9]{8}$` — five characters (0, O, 1, I, L) are excluded, not the four the plan's own comment claims.
- **Task 3 — a genuine contradiction between the plan's Task 3 test and its Task 6 test, both about `EnrolmentRepository.membersOf`'s ordering.** Task 3's test asserted `containsExactly(APPROVED_STUDENT, PENDING_STUDENT)`; Task 6's `ClassDetailTest` asserts `$.enrolments[0].status == "PENDING"`. The repository's own javadoc says "pending first". The first implementer subagent made Task 3 pass by flipping the SQL to approved-first — which would have silently broken Task 6 three tasks later. Caught before Task 6 was built; reverted the SQL to pending-first (matching the javadoc and Task 6) and fixed Task 3's test assertion instead, since that assertion was the actual bug.
- **Task 6 — a code-quality fix, not a behaviour change.** The rotate test's "the code is never written to the audit log" check extracted the new code from the JSON response with a hand-rolled regex that silently degrades to the whole response body if it ever fails to match, and compared it against an audit `details` payload that's hardcoded to `Map.of()` in `ClassService` — so the assertion could never fail regardless of whether a leak occurred. Split into two tests; the new one extracts the code via `JsonPath.read` (fails loudly if the field is missing) and asserts the audit row's `details` column is genuinely `{}`.
- **Task 9 — no new migration was needed.** The plan flagged `password_reset_code` as possibly needing a new `V5` migration; it already existed, added ahead of schedule in 1B's `V2__identity.sql`. Confirmed before writing `ResetCodeRepository` rather than assumed.
- Every other file in the plan was implemented essentially verbatim — no other field renames, signature changes, or endpoint-shape deviations. Every "check the actual signature first" caveat the plan raised (for `SchoolRepository`, `RoleRepository`, `UserAccountRepository`, `StoredCredential`, `LoginThrottle`, `OtherSessions`, `AuditEventType`, `AuthController`'s client-address helper) came back matching the plan's assumptions exactly, so nothing else needed adapting.

## Half-done

Nothing in code — all 11 of 1C's tasks are complete and tested. What's open is process, not implementation:

- The Gate 1C doc updates (this file, roadmap, `CLAUDE.md`) were written this session but were still uncommitted when the session ended — check `git status` on `pilot/1c-classes-and-enrolment` and commit them (message "Record Gate 1C") if they're not already committed by the time this is read.
- No PR has been opened for `pilot/1c-classes-and-enrolment` → `pilotMain`. Per `CLAUDE.md`, Tim opens and merges PRs — don't open one without being asked.

## Waiting on a human

- **Open the 1C PR** (`pilot/1c-classes-and-enrolment` → `pilotMain`) when Tim's ready, title "Pilot 1C: classes and enrolment", body per the plan's Task 11 Step 5.
- **Walk Gate 1C's manual journey against the Render/Vercel preview**, not just locally — the way 1A/1B's final gates were walked, ideally before or as part of the PR.
- **One Gate 1B item still open from last session:** redeploy Render while holding a live session cookie, then `/auth/me` with that cookie.
- **Confirm Katelyn's site is unaffected:** `main`'s Vercel project should 404 `/login` and `/api/v1/health` while serving `/nwetss-hanlon`.
- **Tidy up:** delete `gate.teacher`, `gate.teacher.c`, `gate.student.c` and the two "Gate Check School" rows before any real onboarding (local dev data is harmless; don't forget if any of this ever touched a shared host).
- Roadmap §9 R3, R4, R5 — calendar-bound, start now.

## Branch strategy — unchanged since 15 Sep 2026

`pilotMain` is the pilot's production branch (its own Vercel project, the Render backend); `main` stays Katelyn's live BiPi site. Milestone branches (`pilot/1x-…`) branch from `pilotMain` and merge into it by PR. Merge `main` → `pilotMain` after any BiPi change; never the other way without Tim's go-live decision. Tim opens and merges PRs. `pilot/1c-classes-and-enrolment` follows this: branched from `pilotMain` at `3d9dbcb`.

## Gate 1A — passed on the real host, 16 Sep 2026

1A and 1B are both merged to `pilotMain` (PRs #3 and #4). Render's web service tracks `pilotMain`. Verified against the live pilot URL:

- `/api/v1/health` → `{"status":"UP"}`, so the same-origin proxy reaches Spring on Render.
- `x-vercel-id` second segment is `dub1` (H3 satisfied).
- `/login` → 200, so `APP_ENABLED=true` is live in the pilot project.
- `/` → 307 to `/nwetss-hanlon`, so the BiPi pages are unaffected by the pilot code.

PITR is deferred to the go-live gate (hosting decision below).

**Still unchecked:** that Katelyn's project (`main`) returns 404 for `/login` and `/api/v1/health` while still serving `/nwetss-hanlon`. Worth confirming once, since it's the guarantee that merging pilot work never touches the live site.

## The pilot's URLs and the 16 Sep 2026 deployment saga

**The pilot Vercel project is `leaving-cert-practical`** (team `tim-mc-sweeneys-projects`), dashboard at `https://vercel.com/tim-mc-sweeneys-projects/leaving-cert-practical`. The project was renamed from its original repo-derived name, and **both** of these are bound to it and serve identically:

```
https://leaving-cert-practical-git-pilotmain-tim-mc-sweeneys-projects.vercel.app
https://leaving-cert-biology-website-wrwb.vercel.app   (legacy, kept after the rename)
```

`https://leaving-cert-practical.vercel.app` (the bare name) is **not** assigned — it returns `DEPLOYMENT_NOT_FOUND`. Don't use it.

**What actually went wrong**, after roughly two hours lost: deployments were Ready, Production, Current, with domains correctly bound — and served platform-level `NOT_FOUND` on *every* path including `/`. That combination means the build produced **empty output**. This is a monorepo; the Next.js app is in `frontend/`, so Vercel building from the repo root ships a directory with no app in it. Tim corrected the project settings (Settings → Build and Deployment) and a rebuild served immediately. Framework Preset is `Next.js` with **no** Build/Output/Install/Development Command overrides — the greyed-out defaults are correct, don't fill them in.

**How to tell these failures apart in one second**, instead of an hour in the dashboard:

```
curl -sD - <url> -o /dev/null | grep -i x-vercel-error
```

- `x-vercel-error: NOT_FOUND` on *every* path, including `/`, with a ~79-byte plaintext body = nothing bound to that hostname, **or a deployment whose output is empty**. Either way you never reach the app, so app config and env vars are irrelevant.
- `x-vercel-error: DEPLOYMENT_NOT_FOUND` = that hostname isn't assigned to a deployment at all.
- A missing route on a healthy host returns the app's own Next.js `/_not-found` **HTML** page with **no** `x-vercel-error` header. That is the only shape where `APP_ENABLED` and friends are worth looking at.
- `302 → vercel.com/sso-api` = alive and serving, just behind Deployment Protection. This masks everything behind it, so turn protection off before diagnosing anything else.

**A project rename moves its auto-generated `.vercel.app` domain.** Old bookmarked URLs can survive as bound aliases (as `-wrwb` did) or go dead. Always read the live list from the deployment's own Domains field rather than reconstructing hostnames from naming patterns — two hours went into testing invented URLs that were never real.

**Deployment Protection** was turned off for the pilot project during this session so `curl` could reach it. If it goes back on, either use Settings → Deployment Protection → Protection Bypass for Automation with `-H "x-vercel-protection-bypass: <secret>"`, or leave protection on Preview only.

## Gate 1B — passed on the real host, 16 Sep 2026

`make verify` green: 88 backend tests, 78 node tests, 32 Vitest specs, frontend build. The gate behaviours were walked on 15 Sep 2026 against the local Compose database with the packaged jar, exactly as the plan's Task 11 Step 2 script describes but on `127.0.0.1:8080`:

- Operator created school `00009Z` and `gate.teacher`, granted TEACHER.
- Login with the temporary password returned `mustChangePassword: true`; `/subjects` returned `PASSWORD_CHANGE_REQUIRED`; `/auth/password` returned 204; `/subjects` then listed Biology, Business, Chemistry, Physics.
- The backend process was stopped and restarted; the same cookie still returned 200 from `/auth/me` (Spring Session JDBC).
- Six wrong passwords: five `INVALID_CREDENTIALS`, then `TOO_MANY_ATTEMPTS`.

**16 Sep 2026 — walked on the real host, through the live proxy.** Operator commands ran from Render's Shell; the curl script ran from Tim's machine against the pilot Vercel URL. Every item passed:

- Operator created school `Gate Check School` (`00009Z`, id `6f8ff5b1-d9a4-47dd-9488-7d0d55e57003`), created `gate.teacher`, granted TEACHER.
- Login with the temporary password → `mustChangePassword: true`, roles showing TEACHER at Gate Check School.
- `/subjects` before the change → `PASSWORD_CHANGE_REQUIRED` (403 problem details, through the proxy, unmodified).
- `/auth/password` → 204. `/subjects` then listed Biology, Business, Chemistry, Physics.
- `/auth/me` → the account, `mustChangePassword: false`.
- Six wrong passwords → five `INVALID_CREDENTIALS`, then `TOO_MANY_ATTEMPTS`.

`gate.teacher`'s password is now `gate-check-password`. **Delete this account and `Gate Check School` before onboarding a real school.**

**Render Shell needs a paid instance.** Free web services have no shell. Render bills compute per second, so the way through is: bump the instance to Starter, run the operator commands, drop back to Free — that costs cents, not $7/month. Worth knowing for every future operator command on the host.

**The one gate item still open:** *"redeploying the backend didn't sign that session out."* It needs a Render redeploy while a live session cookie is held, then `/auth/me` with that same cookie. It passed locally on 15 Sep (process stopped and restarted); it has not been repeated on Render.

## Deviations from the 1B plan, all small

- `AuthenticationManager` lives in a new `security/AuthenticationConfig`, not in `SecurityConfig`: the plan's `@ConditionalOnWebApplication` on `SecurityConfig` removed the bean from operator processes, which still component-scan `AuthController` and so failed to start (`OperatorProcessTest` caught it).
- `ProblemDetailsAdviceTest` (a `@WebMvcTest` slice from 1A) now excludes `WebConfig` and `CurrentActorArgumentResolver`; the slice was otherwise pulling in the actor resolver, whose services aren't in the slice.
- Everything else compiled and passed as written, including the Spring Session schema in `V3__spring_session.sql`, which matches the jar's `schema-postgresql.sql` after whitespace and case.

## Hosting decision (H1) — 15 Sep 2026

**Render, Frankfurt, for both the API and the database.** Chosen over Railway (PITR needs extra pgBackRest machinery, usage-priced), Scaleway (managed Postgres 18 not offered yet) and Fly.io (Postgres 16 only, and dearer). Render can't move a resource between regions later, so both are created in Frankfurt from the start.

**Free tiers during the build.** The free web service sleeps when idle, so the first request after a pause can fail at the proxy while the JVM wakes; hit the backend URL directly before testing. The free database has no point-in-time recovery, so that Gate 1A item is deferred to the go-live gate (roadmap §9 R1). Until onboarding there is no data worth keeping: Flyway rebuilds everything. **Upgrade the database to a paid instance before the first real account is created**, and check Render's current free-Postgres expiry rule.

## Things sessions have confirmed

- Roadmap §2 decisions R1–R17 were taken as written in session 1; none changed. R18–R20 (join-code lifetime, explicit `schoolId` on class creation, reset-doesn't-sign-in) were added this session — see `docs/PILOT-ROADMAP.md` §2.
- Every API name in the 1A/1B plans compiled against Spring Boot 4.1.1 as given. The one 1A code change was an explicit return type on `extraHeaders` in `frontend/lib/api/server.ts`.
- Vitest without a config picks up the `node:test` files too; the `include: ["**/*.spec.{ts,tsx}"]` line is what keeps the runners apart.
- The login throttle is in memory and assumes one API instance (root `CLAUDE.md`). Render free runs one.
