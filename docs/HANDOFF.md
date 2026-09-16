# Handoff — coursework pilot

Rewritten at the end of every session. The live BiPi site's final handoff is archived at `docs/archive/bipi-site/HANDOFF.md`; its open items (Katelyn's copy sign-offs, print page count) still stand.

## Where things are

- **Current milestone:** 1C Classes and enrolment. Its plan is `docs/superpowers/plans/2026-09-15-pilot-1c-classes-and-enrolment.md` (nothing built yet). It takes three product decisions (P-1 to P-3) listed at its top for Tim to confirm before Task 1.
- **Next plan also written:** 1D, `docs/superpowers/plans/2026-09-15-pilot-1d-app-shell-and-first-journey.md`, with four more decisions (P-4 to P-7) at its top. It mirrors the 1C response records in Zod, so if 1C changes a field name during the build, update `lib/api/schemas.ts` in the 1D plan to match.
- **Branches, stacked and unmerged:** `pilot/1a-walking-skeleton` (Tasks 1–10 plus the Render half of Task 11) and `pilot/1b-accounts-and-sessions` on top of it (all ten tasks). Both pushed. Merge 1A into `pilotMain` first, then 1B.
- **Session 1 (15 Sep 2026):** 1A Tasks 1–11 (local half) and all of 1B in one session, roughly four hours of wall-clock time including first-time downloads and the Render setup. Roadmap §10 wants this number for estimating later phases: about two hours per milestone of this size once tooling is warm.

## Branch strategy — changed 15 Sep 2026

`pilotMain` (created by Tim from `main`) is now the pilot's production branch; `main` stays Katelyn's live site. Roadmap R1 is amended. What follows from it:

- The 1A PR base is `pilotMain`; the 1B PR base is `pilotMain` after 1A merges (or `pilot/1a-walking-skeleton` before). Future milestone branches start from `pilotMain`.
- A second Vercel project on the same repo, Root Directory `frontend`, Production Branch `pilotMain`, with `APP_ENABLED=true`, `BACKEND_INTERNAL_URL=https://leavingcertpractical.onrender.com` and `PROXY_SHARED_SECRET` in **both** Production and Preview. Katelyn's project keeps `main` and no app variables. Optional, in her project: Settings → Git → Ignored Build Step `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]` so pilot branches don't build there.
- The Render web service should track `pilotMain` once 1A is merged.
- After any change to `main`, merge `main` → `pilotMain`.

## Gate 1A — waiting on Vercel

Render side done and verified from outside: `https://leavingcertpractical.onrender.com` (Frankfurt, free web service and free Postgres 18.6, Docker from `backend/`, health check `/actuator/health`). Still needs Tim, because this machine has no Vercel or GitHub CLI:

1. In the **pilot** Vercel project (see branch strategy above): `APP_ENABLED=true`, `BACKEND_INTERNAL_URL=https://leavingcertpractical.onrender.com`, `PROXY_SHARED_SECRET=<same value as in Render>`, Production and Preview. Redeploy after saving.
2. Check `curl -si https://<preview-url>/api/v1/health` returns `{"status":"UP"}` and an `x-vercel-id` whose second segment is `dub1` (H3). If Deployment Protection is on, use a Protection Bypass for Automation secret.
3. Open the 1A PR from `https://github.com/TMcSweeney100/leavingCertBiologyWebsite/compare/pilotMain...pilot/1a-walking-skeleton`, body in the 1A plan Task 12 Step 4. Don't merge until step 2 passes.
4. After merge: Katelyn's project still returns 404 for `/login` and `/api/v1/health` and 200 for `/nwetss-hanlon`; the pilot project serves `/login`.

PITR is deferred to the go-live gate (hosting decision below).

## Gate 1B — passed locally, preview walk waiting on Tim

`make verify` green: 88 backend tests, 78 node tests, 32 Vitest specs, frontend build. The gate behaviours were walked on 15 Sep 2026 against the local Compose database with the packaged jar, exactly as the plan's Task 11 Step 2 script describes but on `127.0.0.1:8080`:

- Operator created school `00009Z` and `gate.teacher`, granted TEACHER.
- Login with the temporary password returned `mustChangePassword: true`; `/subjects` returned `PASSWORD_CHANGE_REQUIRED`; `/auth/password` returned 204; `/subjects` then listed Biology, Business, Chemistry, Physics.
- The backend process was stopped and restarted; the same cookie still returned 200 from `/auth/me` (Spring Session JDBC).
- Six wrong passwords: five `INVALID_CREDENTIALS`, then `TOO_MANY_ATTEMPTS`.

**To finish the gate on the preview:** the Render web service tracks `pilot/1a-walking-skeleton`. Switch it to `pilot/1b-accounts-and-sessions` (or merge 1A and 1B and point it at `main`), redeploy, then run the operator commands from Render's shell (same image, `operator …` arguments) and the curl script in the 1B plan Task 11 Step 2 against the preview URL. Then open the 1B PR from `compare/pilot/1a-walking-skeleton...pilot/1b-accounts-and-sessions` (or against `pilotMain` once 1A is merged).

## Deviations from the 1B plan, all small

- `AuthenticationManager` lives in a new `security/AuthenticationConfig`, not in `SecurityConfig`: the plan's `@ConditionalOnWebApplication` on `SecurityConfig` removed the bean from operator processes, which still component-scan `AuthController` and so failed to start (`OperatorProcessTest` caught it).
- `ProblemDetailsAdviceTest` (a `@WebMvcTest` slice from 1A) now excludes `WebConfig` and `CurrentActorArgumentResolver`; the slice was otherwise pulling in the actor resolver, whose services aren't in the slice.
- Everything else compiled and passed as written, including the Spring Session schema in `V3__spring_session.sql`, which matches the jar's `schema-postgresql.sql` after whitespace and case.

## Half-done

Nothing in code. Both gates' preview steps are Tim's (above).

## Waiting on a human

- Vercel Preview variables, preview URL, H3, Deployment Protection bypass. Then the 1A PR, then the 1B PR.
- Render: switch the web service's branch for the 1B gate walk (or merge first).
- The 1C decisions P-1 to P-3 and the 1D decisions P-4 to P-7. Defaults are in the plans; say if any should change.
- Roadmap §9 R3, R4, R5 — calendar-bound, start now.

## Hosting decision (H1) — 15 Sep 2026

**Render, Frankfurt, for both the API and the database.** Chosen over Railway (PITR needs extra pgBackRest machinery, usage-priced), Scaleway (managed Postgres 18 not offered yet) and Fly.io (Postgres 16 only, and dearer). Render can't move a resource between regions later, so both are created in Frankfurt from the start.

**Free tiers during the build.** The free web service sleeps when idle, so the first request after a pause can fail at the proxy while the JVM wakes; hit the backend URL directly before testing. The free database has no point-in-time recovery, so that Gate 1A item is deferred to the go-live gate (roadmap §9 R1). Until onboarding there is no data worth keeping: Flyway rebuilds everything. **Upgrade the database to a paid instance before the first real account is created**, and check Render's current free-Postgres expiry rule.

## Things this session confirmed

- Roadmap §2 decisions R1–R17 were taken as written; none changed.
- Every API name in both plans compiled against Spring Boot 4.1.1 as given. The one 1A code change was an explicit return type on `extraHeaders` in `frontend/lib/api/server.ts`.
- Vitest without a config picks up the `node:test` files too; the `include: ["**/*.spec.{ts,tsx}"]` line is what keeps the runners apart.
- The login throttle is in memory and assumes one API instance (root `CLAUDE.md`). Render free runs one.
