# CLAUDE.md

This is a living file. Keep it short and true: add a convention when a task confirms one, and delete anything that stops being true.

## What this repository is

Two things that share a Next.js app:

1. **The live BiPi public schedule** at `/[class]` — read-only, deployed from `main` to Vercel. Before touching `app/[class]/`, `components/bipi/`, `lib/schedule*`, `lib/briefs/` or `lib/classes/`, read `frontend/BIPI-SITE-NOTES.md`.
2. **The Leaving Cert coursework pilot** — a Spring Boot API in `backend/` behind a same-origin Next.js proxy, plus app pages in `frontend/app/(app)` and `frontend/app/(auth)`.

## Read before planning or building pilot work

1. `docs/PILOT-ROADMAP.md` — status board, decisions, pages, API, gates. Start at its §0.
2. `docs/ARCHITECTURE.md` — how the code works as built: request path, auth, patterns, the add-a-feature recipe. Read the section for the layer you're touching instead of rediscovering it from the files. Keep it true in the same commit as any change it describes.
3. `docs/HANDOFF.md` — where the last session stopped.
4. The current milestone plan in `docs/superpowers/plans/`.
5. `docs/PILOT-DESIGN.md` — the sections the plan cites. It wins over the roadmap; the roadmap wins over the specs in `docs/newDevelopement/`.
6. `docs/design/UI-STANDARDS.md` before any task that touches app UI; `docs/design/UI-CHECKLIST.md` before calling it done. `docs/design/UI-BRIEF.md` is what Claude Design gets. **The app no longer uses the BiPi look** (roadmap R25): its palette is navy/amber `--app-*`, applied through `.app-theme`; `--bipi-*` is only for the live schedule.

## Commands (repo root)

- `make db-up` / `make db-down` — Postgres 18 in Docker
- `make backend-run` — Spring Boot on :8080
- `make frontend-run` — Next.js on :3000 (needs `APP_ENABLED=true` in `frontend/.env.local` for app pages)
- `make verify` — backend tests, frontend lint, types, tests, build. Green before every task commit.
- `make e2e` — Playwright journey against a throwaway database

## Rules that don't bend

- **Test first.** Watch the test fail, then make it pass. No production code without a failing test.
- **Never invent SEC or NCCA content.** Every checkpoint and prompt carries a `source_ref`. If a source is missing, stop and ask. `SourceTextTest` checks each quoted string against its PDF page; never reword content to make it pass.
- **All authorisation happens in Spring.** Every service method takes the acting user. Anything outside the actor's scope is a 404, never a 403.
- **The browser only talks to `/api/v1/*` on its own origin.** `BACKEND_INTERNAL_URL` is never exposed to client code.
- **No file or blob columns, no upload endpoints, no server-side fetching of student links.**
- **Next.js stays on 15.3.9** until Vercel supports Next 16's Adapter API.
- **App routes stay behind `APP_ENABLED`** until the go-live gate.
- **Branches (roadmap R1, amended 15 Sep 2026):** `main` is Katelyn's live BiPi site; `pilotMain` is the pilot's production branch with its own Vercel project and the Render backend. Milestone branches (`pilot/1x-…`) branch from `pilotMain` and merge into `pilotMain` by PR. Merge `main` into `pilotMain` after any BiPi change; never merge `pilotMain` into `main` without Tim's go-live decision. Tim opens and merges PRs.

## Backend conventions

- Base package `ie.coursework`. Feature packages: `domain` (no Spring), `application` (services), `adapter.persistence` (`JdbcClient` + SQL), `adapter.web` (controllers, request/response records).
- Errors: throw `DomainException(ErrorCode, detail)`. `ErrorCode` names are API contract.
- Schema migrations in `db/migration`; content in `db/content` (own history table). Never edit an applied migration.
- Content tables (`template_*`, `component_template`, `annual_brief`, `brief_rule`) survive the test reset. A test that inserts into them is `@Transactional` so it rolls back. Correct published content with UPDATEs of text columns; structure changes need a new template version (the V7 triggers refuse anything else).
- Tests needing Postgres extend `PostgresIntegrationTest`. It truncates every table except migration history and content tables before each test, and clears every `InMemoryState` bean.
- Controllers take an `Actor` parameter (resolved fresh per request: roles and disabled state); nothing else reads the security context.
- Bind timestamps with `Timestamps.utc(instant)`; the Postgres driver won't bind `Instant`. Don't map `timestamptz` to `Instant` record components either: read `OffsetDateTime`, or select a boolean.
- In-memory state (the login throttle) implements `InMemoryState`. **It assumes one API instance.** Move it to Postgres before scaling out.
- HTTP tests use `ApiSession` (real filter chain, cookie jar, CSRF header), never MockMvc's `csrf()` / `user()` shortcuts. Create data with `TestAccounts`.
- `@WebMvcTest` slices must exclude `WebConfig` and `CurrentActorArgumentResolver`, which need the identity services (see `ProblemDetailsAdviceTest`).
- Beans a controller needs must not live in the web-only `SecurityConfig`: an operator process (`operator …` as first argument, no web server) still scans the controllers. `AuthenticationConfig` exists for that reason.
- Operator commands: `scripts/operator.sh create-school|create-user|grant-role …` locally; on the host, run the same image with `operator …` as its arguments.
- Class-scoped endpoints go through `ClassService.owned(actor, classId)` first; an enrolment id is looked up with `EnrolmentRepository.findInClass`, never by id alone.
- Component-scoped endpoints go through `ComponentService.owned(actor, componentId)` first; a teacher item id is looked up with `TeacherItemRepository.findActive(itemId, componentId)`, never by id alone.

## Frontend conventions (pilot app)

- Tests: `lib/**/*.test.ts` run under `node --test` (existing convention); `**/*.spec.ts(x)` run under Vitest; `e2e/*.e2e.ts` under Playwright.
- Component specs query by role and accessible name. Restyles from design handoffs must keep them passing (`docs/PILOT-ROADMAP.md` §6.3).
- Server components call Spring through `lib/api/server.ts`; client components through `lib/api/client.ts`. Mutations happen from client components only.
- App pages: a server component loads with `serverApi` inside `attempt()` and renders `ErrorPanel` on failure; interactive parts are client components in `components/app/` that call `api` and then `router.refresh()` or `router.push()`. `lib/app/session.ts` is the only place that reads `/auth/me` on the server. `middleware.ts` only checks that the session cookie exists.
- Zod schemas in `lib/api/schemas.ts` mirror the backend response records field for field. A backend record change means a schema change in the same PR.
- `make e2e` (`scripts/e2e.sh`) builds the jar, seeds one teacher with the operator CLI on the throwaway `postgres-e2e` database, and runs `e2e/*.e2e.ts` on a laptop and a phone project against a production Next build on :3100. Nothing in `playwright.config.ts` starts servers.
