# Handoff — coursework pilot

Rewritten at the end of every session. The live BiPi site's final handoff is archived at `docs/archive/bipi-site/HANDOFF.md`; its open items (Katelyn's copy sign-offs, print page count) still stand.

## Where things are

- **Current milestone:** 1A Walking skeleton — `docs/superpowers/plans/2026-09-15-pilot-1a-walking-skeleton.md`
- **Branch:** `pilot/1a-walking-skeleton` (one commit per task, Tasks 1–10)
- **Last completed task:** Task 10 (typed API client). `make verify` is green.
- **Session 1 (15 Sep 2026):** Tasks 1–10 plus the local half of Task 11 in one session, roughly two hours of wall-clock time including first-time Maven, dependency and Docker image downloads. Roadmap §10 wants this number for estimating later phases.

## Half-done

- **Task 11 (deploy).** `backend/Dockerfile`, `backend/.dockerignore` and `frontend/vercel.json` are written and committed. The image builds and, run against the local Compose database, `/actuator/health` returns UP. Steps 3–7 (choose the host, stand up the EU database and API, set Vercel Preview variables, push, verify the preview) are not started: they need the H1 decision below.
- **Task 12 (Gate 1A).** `make verify` passes. The other four gate items depend on the deployment.

## Waiting on a human

- **Roadmap §3 H1 — hosting vendor.** Task 11 Step 3 lists the criteria and a shortlist (Render, Fly.io, Scaleway, Railway). Needs EU region for API and database, managed Postgres 18, point-in-time recovery, Dockerfile deploys, a health-check path. Nothing in Task 11 or Gate 1A can move until this is chosen.
- **Roadmap §3 H3** — can the Vercel project set its function region to `dub1`? Check in the project settings once the branch is pushed.
- Roadmap §9 R3, R4, R5 — calendar-bound, start now.

## Things this session confirmed

- Roadmap §2 decisions R1–R17 were taken as written; none changed.
- Every API name in the plan compiled against Spring Boot 4.1.1 as given. The only code change from the plan was an explicit return type on `extraHeaders` in `frontend/lib/api/server.ts`, which TypeScript otherwise infers as a union that fails the `Record<string, string>` check.
- Vitest without a config picks up the `node:test` files too; the `include: ["**/*.spec.{ts,tsx}"]` line is what keeps the runners apart.
