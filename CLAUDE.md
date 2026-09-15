# CLAUDE.md

This is a living file. Keep it short and true: add a convention when a task confirms one, and delete anything that stops being true.

## What this repository is

Two things that share a Next.js app:

1. **The live BiPi public schedule** at `/[class]` — read-only, deployed from `main` to Vercel. Before touching `app/[class]/`, `components/bipi/`, `lib/schedule*`, `lib/briefs/` or `lib/classes/`, read `frontend/BIPI-SITE-NOTES.md`.
2. **The Leaving Cert coursework pilot** — a Spring Boot API in `backend/` behind a same-origin Next.js proxy, plus app pages in `frontend/app/(app)` and `frontend/app/(auth)`.

## Read before planning or building pilot work

1. `docs/PILOT-ROADMAP.md` — status board, decisions, pages, API, gates. Start at its §0.
2. `docs/HANDOFF.md` — where the last session stopped.
3. The current milestone plan in `docs/superpowers/plans/`.
4. `docs/PILOT-DESIGN.md` — the sections the plan cites. It wins over the roadmap; the roadmap wins over the specs in `docs/newDevelopement/`.

## Commands (repo root)

- `make db-up` / `make db-down` — Postgres 18 in Docker
- `make backend-run` — Spring Boot on :8080
- `make frontend-run` — Next.js on :3000 (needs `APP_ENABLED=true` in `frontend/.env.local` for app pages)
- `make verify` — backend tests, frontend lint, types, tests, build. Green before every task commit.
- `make e2e` — Playwright journey against a throwaway database

## Rules that don't bend

- **Test first.** Watch the test fail, then make it pass. No production code without a failing test.
- **Never invent SEC or NCCA content.** Every checkpoint and prompt carries a `source_ref`. If a source is missing, stop and ask.
- **All authorisation happens in Spring.** Every service method takes the acting user. Anything outside the actor's scope is a 404, never a 403.
- **The browser only talks to `/api/v1/*` on its own origin.** `BACKEND_INTERNAL_URL` is never exposed to client code.
- **No file or blob columns, no upload endpoints, no server-side fetching of student links.**
- **Next.js stays on 15.3.9** until Vercel supports Next 16's Adapter API.
- **App routes stay behind `APP_ENABLED`** until the go-live gate.

## Backend conventions

- Base package `ie.coursework`. Feature packages: `domain` (no Spring), `application` (services), `adapter.persistence` (`JdbcClient` + SQL), `adapter.web` (controllers, request/response records).
- Errors: throw `DomainException(ErrorCode, detail)`. `ErrorCode` names are API contract.
- Schema migrations in `db/migration`; content in `db/content` (own history table). Never edit an applied migration.
- Tests needing Postgres extend `PostgresIntegrationTest`. It truncates every table except migration history and content tables before each test.

## Frontend conventions (pilot app)

- Tests: `lib/**/*.test.ts` run under `node --test` (existing convention); `**/*.spec.ts(x)` run under Vitest; `e2e/*.e2e.ts` under Playwright.
- Component specs query by role and accessible name. Restyles from design handoffs must keep them passing (`docs/PILOT-ROADMAP.md` §6.3).
- Server components call Spring through `lib/api/server.ts`; client components through `lib/api/client.ts`. Mutations happen from client components only.
