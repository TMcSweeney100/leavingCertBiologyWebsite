# Handoff — coursework pilot

Rewritten at the end of every session. The live BiPi site's final handoff is archived at `docs/archive/bipi-site/HANDOFF.md`; its open items (Katelyn's copy sign-offs, print page count) still stand.

## Where things are

- **1D App shell and first journey is built** — tasks 1–10 of `docs/superpowers/plans/2026-09-15-pilot-1d-app-shell-and-first-journey.md`, on branch `pilot/1d-app-shell-and-first-journey`, **branched from `pilot/1c-classes-and-enrolment` at `5f11ab6`** (1C was not yet merged when 1D started). `make verify` and `make e2e` are green. **No PR opened; Tim opens and merges PRs.** Because the branch is stacked on 1C, merge 1C's PR into `pilotMain` first, then open 1D's PR against `pilotMain` (it will then show only 1D's commits).
- **Task 11 (restyle from design packs D-1 and D-2) is not started.** `docs/design/pilot/` doesn't exist; Tim said on 16 Sep 2026 the designs aren't ready and will follow in a few days. Every page is plain, semantic HTML with the shadcn `Button` and no layout styling at all. Every component spec queries by role and accessible name only, so the restyle has a contract to keep (roadmap §6.3). When the packs arrive, follow the plan's Task 11 exactly: read `NOTES.md` first, tokens go beside the `--bipi-*` variables (never changing them), one page per commit, `npx vitest run components/app` after each.
- **Task 12 (Gate P1) is partly walked** — see "Gate P1" below. What's left needs Tim: the Vercel Preview walk, the keyboard-only walk by hand, and the page review.
- **Session 3 (16 Sep 2026):** all of 1D tasks 1–10 in one session, using `superpowers:executing-plans` inline (no subagents): each task's tests written and watched fail first, then the implementation, then `npm test`, `typecheck`, `lint` before each commit. Twelve commits on top of `5f11ab6`. One pre-existing bug from 1A was found by the e2e build and fixed (see "Deviations").
- **1C Classes and enrolment is built but still unmerged**; its Gate 1C notes are carried over below. **1A and 1B are merged and live** on `pilotMain` (PRs #3 and #4).

## Gate P1 — walked locally, 16 Sep 2026

- [x] `make verify` green — 151 backend tests; frontend: 85 `node:test` tests, 75 Vitest specs, lint, types, production build.
- [x] `make e2e` green — `frontend/e2e/phase1.e2e.ts` passes on both Playwright projects (`laptop` = Desktop Chrome, `phone` = Pixel 7): signed-out redirect with `?next=`, teacher signs in with the temporary password, forced change, creates a class, reads the code; a phone context joins with the code (typed lowercase), creates an account, lands on `/home` as "Pending approval"; teacher approves; phone reloads and sees "Approved"; teacher issues a reset code; phone signs out, resets with the code, signs in with the new password. Plus a keyboard-only sign-in test.
- [x] **axe scan:** every page the journey visits is scanned with tags `wcag2a`, `wcag2aa`, `wcag22aa` and reports **no violations**, on both projects. (This is the automated half of the gate's third checkbox.)
- [ ] The same journey by hand on the Vercel Preview against the Render backend (operator commands from Render's Shell — remember the Starter-instance trick in "Gate 1B" below).
- [ ] Keyboard-only run of the whole journey by hand on a laptop.
- [ ] Tim has reviewed the pages.

**Local throwaway data:** none new — `make e2e` uses the `postgres-e2e` container with no volume and removes it on exit. The 1B/1C gate rows in the dev Postgres (`Gate Check School` ×2, `gate.teacher*`, `gate.student.c`) are still there; harmless.

## Commits on `pilot/1d-app-shell-and-first-journey` (ahead of `pilot/1c-classes-and-enrolment`)

Oldest first:

1. `6d08888` Task 1 — `lib/api/schemas.ts`, `lib/app/{navigation,session,attempt}.ts`, `middleware.ts`, `ErrorPanel`
2. `3b13cc3` Task 2 — `(app)/layout.tsx` session gate, `AppHeader`, `SignOutButton`, `/school` placeholder, `(app)/error.tsx`
3. `25e81e6` Task 3 — `/login` and `LoginForm`
4. `91efdad` Task 4 — `/account/password` and `ChangePasswordForm`
5. `1f5d97d` Task 5 — `/join`, `/join/[code]`, `JoinCodeForm`, `SignUpForm`, `JoinButton`
6. `dbea46d` Task 6 — `/home` and `MyClasses`
7. `6bc858d` Task 7 — `/teach`, `/teach/classes/new`, `ClassList`, `CreateClassForm`, `lib/app/academic-year.ts`
8. `5b9b285` Task 8 — `/teach/classes/[id]` and `ClassStudents`
9. `32d2105` Task 9 — `/reset` and `ResetForm`
10. `71318f4` Fix (1A bug) — API client lets Next's dynamic-render bailout through
11. `827a2b3` Task 10 — Playwright config, `phase1.e2e.ts`, `scripts/e2e.sh`, `test:e2e`
12. *(this commit)* Task 12 — Gate P1 doc updates (this file, roadmap, root `CLAUDE.md`)

## Deviations from the 1D plan, all small, all caught by tests or the e2e run

- **Pre-existing 1A bug, found by `next build` inside `make e2e`:** `createApiClient` wrapped `await transport.extraHeaders()` inside the same `try/catch` as `fetch`. On the server that helper calls Next's `headers()`, which during a static build throws a bailout signal meaning "this route is dynamic". The catch turned that signal into `BACKEND_UNREACHABLE`, so prerendering `/school` (a static page under the `(app)` layout, which calls `getSession()`) failed the build. Fixed by reading the transport headers before the `try`, with a `client.spec.ts` test that a throwing `extraHeaders` propagates untouched. Nothing in 1A–1C had a static page under a session-reading layout, which is why it never showed.
- **`ErrorPanel`'s "Try again" is `<a href="?">`, not the plan's `<Link href="">`.** `next/link` with an empty href rendered nothing in jsdom (the spec found no link at all), and a plain `<a href="">` isn't exposed as a link role either. `href="?"` reloads the current path (dropping the query), which is what "try again" wants on a server page.
- **`ErrorPanel` lists `fieldErrors` itself.** The plan had `CreateClassForm` wrap the panel in a second `role="alert"` to add the field list, and noted the nesting as acceptable; `getByRole("alert")` refuses multiple matches, so the spec failed. Moving the list into the panel (with its own spec case) is simpler and every form gets it.
- **`LoginForm` links with `next/link`**, not `<a>`: Next's `no-html-link-for-pages` lint rule fires once `/join` and `/reset` exist as pages.
- **Straight apostrophes in copy** (`isn&apos;t`, not `&rsquo;`): the specs assert straight ones.
- **`export const dynamic = "force-dynamic"`** also on `/join/[code]` and `/teach/classes/new` (the plan only had it on the list pages). Harmless either way since `headers()` makes them dynamic; explicit is clearer.
- **The e2e journey tolerates an already-changed teacher password.** Both Playwright projects run the file against one seeded teacher, so the second project finds the temporary password already replaced. The test now waits for either the "Change password" heading or an alert containing "Wrong username or password" and branches. The alert locator is filtered by text because Next's route announcer is an empty `role="alert"` on every page, which otherwise matches first.
- **`scripts/e2e.sh` passes the database to the operator commands as `DATABASE_*` environment variables**, the same ones `application.yaml` reads, instead of the plan's `--spring.datasource.url=` arguments.
- **ESLint ignores `playwright-report/**` and `test-results/**`** (`eslint.config.mjs`), or `npm run lint` fails on Playwright's generated report after any e2e run.
- Every other file was implemented essentially as the plan wrote it; every backend field name and endpoint the plan assumed matched (HANDOFF's earlier note that 1C changed no wire contract held).

## Half-done

Nothing in code. Open items are process:

- Task 11 restyle — waiting on design packs D-1 and D-2 (see above).
- Gate P1's three manual checkboxes — waiting on Tim.
- No PR for 1C or 1D. Per `CLAUDE.md`, Tim opens and merges PRs.

## Waiting on a human

- **Open the 1C PR** (`pilot/1c-classes-and-enrolment` → `pilotMain`; both branches were pushed to `origin` on 16 Sep 2026, 1C for the first time), title "Pilot 1C: classes and enrolment", then **the 1D PR** (`pilot/1d-app-shell-and-first-journey` → `pilotMain`), title "Pilot 1D: app shell and first journey", body per the 1D plan's Task 12 Step 4 with "Restyle from D-1/D-2 is pending the design packs".
- **Walk Gate P1 on the Vercel Preview** (and Gate 1C's journey, still only walked locally).
- **Design packs D-1 and D-2** into `docs/design/pilot/<route>/` with `NOTES.md`, then Task 11.
- **Phase 2 preconditions (roadmap §8.2), needed before the 2A plan can be written:** the four final 2027 briefs and the Coursework Rules and Procedures in `subjectDocs/`; design packs D-3, D-4, D-5 requested. **The 2A plan doesn't exist yet and can't be written until those documents are in the repo.**
- Carried over: Gate 1B's "redeploy Render while holding a live session cookie" check; confirm Katelyn's `main` project 404s `/login` and `/api/v1/health`; delete the gate-check accounts and schools before any real onboarding; roadmap §9 R3–R5 are calendar-bound.

## Gate 1C — walked locally, 16 Sep 2026 (carried over; branch still unmerged)

- [x] `make verify` green (151 backend tests)
- [x] Every endpoint in roadmap §7 Phase 1 has a scope test (`classes/authz/{Teacher,Student,Leader,Anonymous}ScopeTest.java`)
- [x] Audit rows exist for role grants, enrolment decisions, reset codes and code rotation

The manual journey was walked against the local stack only (`make db-up`, packaged jar), all nine checkpoints first time, including session invalidation on reset. Not yet walked on the Render/Vercel preview. 1C's deviations from its plan (fixture join codes with no `L`, `membersOf` pending-first ordering, the tautological audit assertion, no new migration for `password_reset_code`) are in git history on that branch's commits `345e734`, `485d74c` and the plan itself.

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
