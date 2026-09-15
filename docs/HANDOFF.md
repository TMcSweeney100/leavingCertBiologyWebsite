# Handoff — coursework pilot

Rewritten at the end of every session. The live BiPi site's final handoff is archived at `docs/archive/bipi-site/HANDOFF.md`; its open items (Katelyn's copy sign-offs, print page count) still stand.

## Where things are

- **Current milestone:** 1A Walking skeleton — `docs/superpowers/plans/2026-09-15-pilot-1a-walking-skeleton.md`
- **Branch:** `pilot/1a-walking-skeleton` (one commit per task, Tasks 1–10)
- **Last completed task:** Task 10 (typed API client). `make verify` is green.
- **Session 1 (15 Sep 2026):** Tasks 1–10 plus the local half of Task 11 in one session, roughly two hours of wall-clock time including first-time Maven, dependency and Docker image downloads. Roadmap §10 wants this number for estimating later phases.

## Half-done

- **Task 11 (deploy).** Done on the Render side: web service `https://leavingcertpractical.onrender.com` (Frankfurt, free, Docker from `backend/`, health check `/actuator/health`) and the free Frankfurt Postgres 18.6. Verified from outside on 15 Sep 2026: `/actuator/health` and `/api/v1/health` return UP, `/api/v1/auth/csrf` sets `XSRF-TOKEN`, `/api/v1/auth/me` returns the `UNAUTHENTICATED` problem, `/login` is 401. Both Flyway histories applied. **Not done, needs Tim (no Vercel CLI on this machine):** Vercel Preview variables (`APP_ENABLED=true`, `BACKEND_INTERNAL_URL=https://leavingcertpractical.onrender.com`, `PROXY_SHARED_SECRET` matching Render), then the preview check in Task 11 Step 7.
- **Task 12 (Gate 1A).** `make verify` passes. Still open: preview `/api/v1/health` through the proxy, the `dub1` header (H3), and the post-merge Production check. PITR deferred (below).
- **PR for 1A not opened** (no `gh` here). Open it from `https://github.com/TMcSweeney100/leavingCertBiologyWebsite/compare/main...pilot/1a-walking-skeleton` with the body in the 1A plan, Task 12 Step 4. Don't merge until the preview check passes.
- **1B is being built on `pilot/1b-accounts-and-sessions`, branched from the 1A branch** (not `main`) because 1A isn't merged. Merge 1A first; the 1B PR then rebases cleanly or targets `main` with 1A's commits already in.

## Waiting on a human

- Vercel Preview variables, preview URL, H3 (`dub1` accepted?), Deployment Protection bypass if on. Then the 1A PR.
- Roadmap §9 R3, R4, R5 — calendar-bound, start now.

## Hosting decision (H1) — 15 Sep 2026

**Render, Frankfurt, for both the API and the database.** Chosen over Railway (PITR needs extra pgBackRest machinery, usage-priced), Scaleway (managed Postgres 18 not offered yet) and Fly.io (Postgres 16 only, and dearer). Render can't move a resource between regions later, so both are created in Frankfurt from the start.

**Free tiers during the build.** The free web service sleeps when idle, so the first request after a pause can fail at the proxy while the JVM wakes; hit the backend URL directly before testing. The free database has no point-in-time recovery, so that Gate 1A item is deferred to the go-live gate (roadmap §9 R1). Until onboarding there is no data worth keeping: Flyway rebuilds everything. **Upgrade the database to a paid instance before the first real account is created**, and check Render's current free-Postgres expiry rule.

## Things this session confirmed

- Roadmap §2 decisions R1–R17 were taken as written; none changed.
- Every API name in the plan compiled against Spring Boot 4.1.1 as given. The only code change from the plan was an explicit return type on `extraHeaders` in `frontend/lib/api/server.ts`, which TypeScript otherwise infers as a union that fails the `Record<string, string>` check.
- Vitest without a config picks up the `node:test` files too; the `include: ["**/*.spec.{ts,tsx}"]` line is what keeps the runners apart.
