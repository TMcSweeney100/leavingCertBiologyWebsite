# Handoff — coursework pilot

Rewritten at the end of every session. The live BiPi site's final handoff is archived at `docs/archive/bipi-site/HANDOFF.md`; its open items (Katelyn's copy sign-offs, print page count) still stand.

## Where things are

- **Current milestone:** 1C Classes and enrolment. Its plan is `docs/superpowers/plans/2026-09-15-pilot-1c-classes-and-enrolment.md` (nothing built yet). **Its decisions are settled — start at Task 1.**
- **Next plan also written:** 1D, `docs/superpowers/plans/2026-09-15-pilot-1d-app-shell-and-first-journey.md`, decisions also settled. It mirrors the 1C response records in Zod, so if 1C changes a field name during the build, update `lib/api/schemas.ts` in the 1D plan to match.
- **Decisions P-1 to P-7, confirmed by Tim 16 Sep 2026:** **P-1 changed — a join code lives 30 days, not 14** (`JoinCode.LIFETIME`, already updated in the plan). P-2 to P-7 stand exactly as written: explicit `schoolId` on class creation; redeeming a reset code doesn't sign the student in; POST sign-out; reset sends to `/login`; `/school` is a Phase 5 placeholder; middleware checks only that the `SESSION` cookie exists.
- **1A and 1B are merged and live.** PRs #3 and #4 are in `pilotMain`; both gates were walked on the real Render + Vercel hosts on 16 Sep 2026. `pilotMain` is at `3d9dbcb`. The `pilot/1a-…` and `pilot/1b-…` branches are now history and can be deleted whenever Tim likes.
- **Session 1 (15 Sep 2026):** 1A Tasks 1–11 (local half) and all of 1B in one session, roughly four hours of wall-clock time including first-time downloads and the Render setup. Roadmap §10 wants this number for estimating later phases: about two hours per milestone of this size once tooling is warm.

## Branch strategy — changed 15 Sep 2026

`pilotMain` (created by Tim from `main`) is now the pilot's production branch; `main` stays Katelyn's live site. Roadmap R1 is amended. What follows from it:

- The 1A PR base is `pilotMain`; the 1B PR base is `pilotMain` after 1A merges (or `pilot/1a-walking-skeleton` before). Future milestone branches start from `pilotMain`.
- A second Vercel project on the same repo, Root Directory `frontend`, Production Branch `pilotMain`, with `APP_ENABLED=true`, `BACKEND_INTERNAL_URL=https://leavingcertpractical.onrender.com` and `PROXY_SHARED_SECRET` in **both** Production and Preview. Katelyn's project keeps `main` and no app variables. Optional, in her project: Settings → Git → Ignored Build Step `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]` so pilot branches don't build there.
- The Render web service should track `pilotMain` once 1A is merged.
- After any change to `main`, merge `main` → `pilotMain`.

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

## Half-done

Nothing in code. 1A and 1B are merged, deployed and gate-walked.

## Waiting on a human

- **One Gate 1B item:** redeploy Render while holding a live session cookie, then `/auth/me` with that cookie (see Gate 1B above).
- **Confirm Katelyn's site is unaffected:** `main`'s project should 404 `/login` and `/api/v1/health` while serving `/nwetss-hanlon`.
- **Tidy up:** delete `gate.teacher` and `Gate Check School` before any real onboarding.
- Roadmap §9 R3, R4, R5 — calendar-bound, start now.

## Hosting decision (H1) — 15 Sep 2026

**Render, Frankfurt, for both the API and the database.** Chosen over Railway (PITR needs extra pgBackRest machinery, usage-priced), Scaleway (managed Postgres 18 not offered yet) and Fly.io (Postgres 16 only, and dearer). Render can't move a resource between regions later, so both are created in Frankfurt from the start.

**Free tiers during the build.** The free web service sleeps when idle, so the first request after a pause can fail at the proxy while the JVM wakes; hit the backend URL directly before testing. The free database has no point-in-time recovery, so that Gate 1A item is deferred to the go-live gate (roadmap §9 R1). Until onboarding there is no data worth keeping: Flyway rebuilds everything. **Upgrade the database to a paid instance before the first real account is created**, and check Render's current free-Postgres expiry rule.

## Things this session confirmed

- Roadmap §2 decisions R1–R17 were taken as written; none changed.
- Every API name in both plans compiled against Spring Boot 4.1.1 as given. The one 1A code change was an explicit return type on `extraHeaders` in `frontend/lib/api/server.ts`.
- Vitest without a config picks up the `node:test` files too; the `include: ["**/*.spec.{ts,tsx}"]` line is what keeps the runners apart.
- The login throttle is in memory and assumes one API instance (root `CLAUDE.md`). Render free runs one.
