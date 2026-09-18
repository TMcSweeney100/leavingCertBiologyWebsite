# Architecture — how the pilot works, as built

**Who this is for:** anyone about to change the pilot, whether a Claude Code session or Tim reading to understand it. Each section opens with how that part works in plain words, then the files and the rules. It describes the code on the branch as it is; when a session changes something described here, it changes this file in the same commit (the rule is in `docs/HANDOFF.md`).

What this file is not: the design rationale (`docs/PILOT-DESIGN.md`), the plan (`docs/PILOT-ROADMAP.md`), the API table (roadmap §7), the UI rules (`docs/design/`). It points at those rather than repeating them.

---

## 1. The shape

Two programs and a database:

```
browser ──HTTPS──▶ Next.js on Vercel (Dublin)  ──HTTP──▶ Spring Boot on Render (Frankfurt) ──▶ Postgres on Render
                    frontend/                              backend/
                    renders pages, proxies /api/v1/*       owns every rule, every check, every row
```

- **Next.js** (`frontend/`, Next 15.3.9, React 19, Tailwind 4, shadcn on Base UI) renders the pages and forwards every API call. It holds no business logic and no secrets the browser could reach.
- **Spring Boot** (`backend/`, Boot 4.1, Java 21) is the only thing that talks to the database. Every permission check happens here.
- **Postgres 18** holds everything, including sessions. There are no files, blobs or uploads anywhere.

The same repo also serves Katelyn's public BiPi schedule at `/[class]`, which has no backend at all. Root `CLAUDE.md` says which files belong to which, and `frontend/BIPI-SITE-NOTES.md` covers the schedule.

**Two branches, two deployments.** `main` deploys the BiPi site. `pilotMain` deploys the pilot: its own Vercel project with `APP_ENABLED=true`, and the Render backend tracks it. Milestone branches (`pilot/1d-…`) merge into `pilotMain` by PR. Everything under `app/(app)`, `app/(auth)` and the proxy returns 404 unless `APP_ENABLED` is exactly `"true"` (`frontend/lib/app/routes.ts`).

## 2. A request, end to end

**In plain words.** The browser only ever calls its own origin at `/api/v1/…`. A Next route handler forwards that call to Spring, adding the client's real IP address and a shared secret so Spring knows the address is genuine. Spring answers with JSON, or with a "problem" JSON body describing what went wrong. The proxy passes the answer back untouched, cookies included. Server-rendered pages skip the proxy and call Spring directly, forwarding the viewer's cookie.

| Hop | File | What happens |
|---|---|---|
| Browser → proxy | `frontend/lib/api/client.ts` (`api`) | Adds `accept`, JSON body, and on any unsafe method the `X-XSRF-TOKEN` header read from the `XSRF-TOKEN` cookie. If the token is missing it fetches `/auth/csrf` first; if Spring rejects it as stale it refreshes once and retries. |
| Proxy → Spring | `frontend/app/api/v1/[...path]/route.ts` | Forwards only `accept`, `content-type`, `cookie`, `x-xsrf-token`. Adds `x-forwarded-for` (first hop of Vercel's header) and `x-proxy-secret` from `PROXY_SHARED_SECRET`. Body goes through as bytes. Every `Set-Cookie` comes back. Network failure becomes a `BACKEND_UNREACHABLE` problem. |
| Server page → Spring | `frontend/lib/api/server.ts` (`serverApi`) | Same client, but base URL is `BACKEND_INTERNAL_URL`, it forwards the viewer's raw `cookie` header, and it is `get` only. Mutations never happen server-side because the CSRF token lives in the browser. |
| Spring | `security/SecurityConfig.java` → controller → service → repository | See §3 to §5. |
| Response shape | `frontend/lib/api/schemas.ts` | Every response is parsed with a Zod schema that mirrors the Java response record field for field. A mismatch throws `RESPONSE_SHAPE_UNEXPECTED` rather than rendering garbage. **Change a Java record → change the schema in the same PR.** |
| Errors | `backend/…/shared/error/`, `frontend/lib/api/problem.ts` | Spring throws `DomainException(ErrorCode, detail)`; `ProblemDetailsAdvice` turns it into RFC 9457 JSON with a stable `code`. Security filters that reject before a controller use `ProblemResponses` to write the same shape. The frontend wraps every failure, including network and shape failures, in one `ApiError` class with `code`, `title`, `detail`, `fieldErrors`. `ErrorCode` names are API contract: renaming one breaks the frontend. |

Environment variables the proxy and server client need: `APP_ENABLED`, `BACKEND_INTERNAL_URL`, `PROXY_SHARED_SECRET` (`frontend/.env.example`). None of them is `NEXT_PUBLIC_`; the browser never sees them.

## 3. Authentication: who you are

**In plain words.** You sign in with a username and password. Spring checks the password with bcrypt, then starts a session and sends the browser a `SESSION` cookie. The session is stored in Postgres and remembers only your user id. Every later request carries the cookie; Spring looks the session up, finds the id, and loads your roles fresh from the database, so a role change takes effect immediately. There is no email anywhere: accounts are created by an operator (teachers) or by a join code (students), and passwords are reset with a one-time code from a teacher.

**Sign-in** (`identity/adapter/web/AuthController.java`):

1. Username is normalised (`Username.normalise`) and the client address resolved (`security/ClientAddressResolver.java`, which trusts `X-Forwarded-For` only when `X-Proxy-Secret` matches).
2. `security/LoginThrottle.java` checks failures: 5 per username and 100 per address in a sliding 15 minutes (`app.login-limits` in `application.yaml`). Blocked → `TOO_MANY_ATTEMPTS` with the minutes to wait. It counts failures only, in memory, and assumes one API instance (`shared/InMemoryState.java`).
3. Spring's `DaoAuthenticationProvider` (`security/AuthenticationConfig.java`) compares the hash via `CredentialUserDetailsService` (Spring's delegating encoder from `security/PasswordConfig.java`, bcrypt by default, so hashes carry a `{bcrypt}` prefix), whose "username" is the user id. Any failure, including a disabled account or a password over 72 bytes, is one message: `INVALID_CREDENTIALS`, "Wrong username or password."
4. `security/SessionEstablisher.java` rotates the session id (fixation), stores an `AuthenticatedUser(userId)` principal, and saves the context. Spring Session JDBC writes it to `spring_session` (`V3__spring_session.sql`); timeout 7 days; cookie `HttpOnly`, `SameSite=Lax`, `Secure` except locally (`APP_COOKIE_SECURE=false` in `backend/.env`).
5. The response is `MeResponse`, the same body as `GET /auth/me`.

**Every request after that:**

- The filter chain (`security/SecurityConfig.java`) lists the public endpoints explicitly (health, csrf, login, join preview, sign-up, password reset); everything else needs a session. Rejections are problem JSON, never a redirect or an HTML page.
- CSRF is Spring's SPA mode: a readable `XSRF-TOKEN` cookie, echoed back in `X-XSRF-TOKEN`. `GET /api/v1/auth/csrf` exists only to make Spring issue the cookie.
- `security/PasswordChangeRequiredFilter.java` runs after authorisation. If the credential has `must_change` set, only `me`, `csrf`, `password` and `logout` answer; everything else is `PASSWORD_CHANGE_REQUIRED` (roadmap R11). Teachers start with a temporary password from the operator, so this is their first screen.
- A controller that declares an `Actor` parameter gets one from `security/CurrentActorArgumentResolver.java`, which calls `identity/application/ActorResolver.java`: profile must exist and not be disabled, then the role grants are loaded. That is the only place the security context is read.

**Passwords and codes** (`identity/domain/`):

- `PasswordPolicy`: 10 to 64 characters, at most 72 bytes.
- `Username`: `^[a-z0-9._-]{3,32}$`, lower-cased on the way in.
- Changing a password (`PasswordService`) checks the current one, clears `must_change`, and ends the user's other sessions (`security/OtherSessions.java`, which finds sessions by principal name, the user id).
- Reset codes (`PasswordResetService`, `ResetCode`): 8 characters from an alphabet without look-alikes, hashed at rest, 24-hour life, one use. A teacher issues one for a pending or approved student of a class they own. Redeeming counts against the login throttle so it can't be guessed faster than a password, ends all the user's sessions, and does **not** sign them in.
- Temporary passwords (`TemporaryPasswordGenerator`): 16 characters, printed once by the operator command.

**Sign-out** invalidates the session server-side. Removing a session row is the only way to end one; there is no token to revoke.

## 4. Authorisation: what you may touch

**In plain words.** Roles are per school: a person can be a TEACHER at one school and a STUDENT at another. The session says who you are; the database says what you hold; the service you call decides whether the thing you asked for is in your scope. If it isn't, the answer is "not found", never "forbidden", so nobody can learn that a class or student exists by probing ids.

- `identity/domain/Actor.java`: `userId` plus `RoleGrant(schoolId, role)` list; `holds(role)`, `holds(role, schoolId)`, `schoolsWhere(role)`.
- **Every service method takes the actor as its first argument.** There is no `@PreAuthorize`, no security expression, no role check in a controller.
- **Class-scoped work goes through `ClassService.owned(actor, classId)` first.** It requires TEACHER and finds the class by id *and* owner; either failing is `NOT_FOUND`. Enrolment and reset-code endpoints call it before anything else.
- **An enrolment id is only ever looked up with `EnrolmentRepository.findInClass(enrolmentId, classId)`**, never by id alone, so an id from another class is not found.
- Students see only their own enrolments (`EnrolmentService.myClasses(actor)`). School leader scope arrives in Phase 5.
- The authz suite (`backend/src/test/java/ie/coursework/classes/authz/`) runs the same endpoints as anonymous, student, teacher of another school and leader, and asserts 401 or 404 for each. Add a new class-scoped endpoint there.

## 5. Data

**In plain words.** Plain SQL through Spring's `JdbcClient`, no ORM. The schema is versioned with Flyway. Content that changes every year (subjects, later templates and briefs) has its own migration history so "what changed for 2028" is answerable.

- Tables so far (`backend/src/main/resources/db/migration/`): `subject`; `school` (with an optional `short_name` for the app header), `app_user`, `password_credential`, `user_role`, `password_reset_code`, `audit_event`; `spring_session`, `spring_session_attributes`; `class_group`, `enrolment`. Content: `db/content/V1__subjects.sql`.
- Content migrations so far: `V1__subjects.sql`, `V2__science_templates.sql` (Biology, Chemistry, Physics v1), `V3__business_template.sql` (Business v1), `V4__briefs_2027.sql` (the four published 2027 briefs, each pinning v1). Every quoted string carries `source_ref` = `'<doc key> p. <printed page>'`; `content/SourceDocuments` maps keys to the PDFs in `docs/newDevelopement/subjectDocs/` and `SourceTextTest` checks each string is on its page. A content change that fails it is wrong until the PDF says otherwise.
- Content tables (`V6__templates_and_briefs.sql`): `component_template` → `template_version` → `template_stage`, `template_section`, `template_mark_band`, `template_checkpoint`, `template_prompt`, and the link tables `template_section_stage` and `template_mark_band_section`; `annual_brief` (pins a template version) and `brief_rule`. Rows below a version carry `version_id` and reference their parent by `(id, version_id)`, so nothing crosses versions.
- **A published version's structure is frozen by trigger** (`V7__template_guards.sql`). Each table's trigger names its correctable text columns; any other change, insert or delete on a PUBLISHED or RETIRED version raises `check_violation`. Fix wording with an UPDATE in a new content migration; change structure by adding a new version. A published brief keeps its template, version, year, code and rule rows, but its completion date, limits and wording can change.
- **Tests that write to content tables roll back** (`@Transactional` on the class, `support/TemplateRows` for rows): the reset preserves content tables, so anything a test leaves there leaks into every later test. `ContentResetPolicyTest` fails if a template or brief table isn't in `PRESERVED_TABLES`.
- **Never edit an applied migration.** Add `V<n+1>__name.sql`. `validate-on-migrate` will refuse a changed checksum.
- `shared/config/ContentMigrationsConfig.java` runs schema migrations, then content migrations into `flyway_content_history`.
- Repositories live in `<feature>/adapter/persistence/`, one class per aggregate, SQL inline as text blocks, row mappers as static methods. Read `EnrolmentRepository.request` before writing an upsert: its `ON CONFLICT … WHERE` guard and the `orElseGet` fallback are one mechanism.
- Timestamps: bind with `Timestamps.utc(instant)` and read `OffsetDateTime`, then `.toInstant()`. The driver can't bind `Instant`.
- The one `Clock` bean (`shared/config/TimeConfig.java`) is injected into anything that reads the time, so tests can pin it.
- `audit/AuditLog.java` appends an event inside the same transaction as the change. Details hold ids and enum names only, never a code, password or anything a student wrote.
- Domain records (`<feature>/domain/`) have no Spring imports. Rules like `EnrolmentStatus.canApprove()` and `JoinCode.parse` live there and have plain unit tests.

## 6. Frontend: pages, routing, session

**In plain words.** Each page is a server component: it asks Spring for its data, and if that fails it renders the shared error panel instead of crashing. Anything the user can click that changes data is a small client component that calls the API, then tells Next to re-render the page. The middleware only checks that a session cookie exists; the layout then confirms the session with Spring and applies the forced-password-change rule.

- **Route groups.** `app/(auth)/` (`/login`, `/join`, `/join/[code]`, `/reset`, `/account/password`) has no app header. `app/(app)/` (`/home`, `/teach/…`, `/school`) has one. Both layouts `notFound()` unless the app is enabled.
- **`middleware.ts`**: for `/home`, `/teach`, `/school`, `/components`, `/account`, redirects to `/login?next=<path>` when the `SESSION` cookie is absent. Nothing else.
- **`lib/app/session.ts`** is the only server-side reader of `/auth/me`. `getSession()` returns the account or null on `UNAUTHENTICATED`. `app/(app)/layout.tsx` calls it, redirects to `/login` if null, to `/account/password` if `mustChangePassword`, then renders `AppHeader`.
- **`lib/app/navigation.ts`**: landing page by highest role (Teacher `/teach`, School leader `/school`, Student `/home`); `safeNext` accepts only same-origin paths that aren't `/login`; `APP_NAV` builds the header links.
- **Page pattern** (`app/(app)/teach/classes/[id]/page.tsx` is the template):
  ```tsx
  export const dynamic = "force-dynamic";
  const detail = await attempt(() => serverApi.get(`/classes/${id}`, classDetailSchema));
  if (!detail.ok && detail.error.code === "NOT_FOUND") notFound();
  return <main>{detail.ok ? <ClassStudents detail={detail.data} /> : <ErrorPanel error={detail.error} />}</main>;
  ```
  `attempt` (`lib/app/attempt.ts`) catches `ApiError` only; anything else reaches `app/(app)/error.tsx`.
- **Component pattern** (`components/app/class-students.tsx` is the template): `"use client"`, local `busy` and `error` state, `await api.send(…)` then `router.refresh()` (or `router.push` after sign-in), errors shown through `ErrorPanel`. State that must survive the refresh but not navigation, such as a reset code shown once, stays in component state.
- **`ErrorPanel`** (`components/app/error-panel.tsx`) is the one way any page shows an API failure, with field errors listed and a "Try again" link.
- **Styling** is the app's own "Navy" system from design packs D-1 and D-2 (roadmap R25; `docs/design/UI-BRIEF.md` §5), not BiPi's. Tokens are `--app-*` in `app/globals.css`. Both layouts wrap their pages in `.app-theme`, which re-points shadcn's semantic variables (`bg-primary` is navy there and BiPi blue on the live schedule). Building blocks in `components/app/`: `AppMain` (the `<main id="main">` of every signed-in page, the skip link's target), `Field`/`FieldGroup` (the hairline field group; a row takes `help`, `error` or `invalid` and wires `aria-describedby`/`aria-invalid`), `Notice` (edge-bar message or status), `ErrorPanel` (compact for a refused request, heading and "Try again" for a service failure, amber for `TOO_MANY_ATTEMPTS`), `styles.ts` (shared class strings), `subject.ts` (subject edge bars). Brand placeholders (app name, crest) are in `lib/app/brand.ts` (R28). Rules in `docs/design/UI-STANDARDS.md`.

## 7. Adding a feature: the recipe

Backend, test first at each step:

1. **Domain**: a record or enum in `<feature>/domain/` with a unit test.
2. **Migration**: `db/migration/V<n>__….sql`. If a new table holds content, add it to `PRESERVED_TABLES` in `PostgresIntegrationTest`.
3. **Repository** in `adapter/persistence/`, tested against Postgres (extend `PostgresIntegrationTest`; see `ClassRepositoriesTest`).
4. **Service** in `application/`: first parameter `Actor`, scope check first, `@Transactional` on writes, audit event inside the transaction, `DomainException` with an existing or new `ErrorCode`.
5. **Controller** in `adapter/web/`: request and response as records, `@Valid` on bodies, `Actor` as a parameter. Test with `ApiSession` (real filter chain and cookies) and `TestAccounts` (see `ClassDetailTest`), plus a case in the authz suite.
6. **Roadmap §7**: add the endpoint row.

Frontend:

7. **Schema** in `lib/api/schemas.ts` mirroring the response record.
8. **Page** under `app/(app)` or `app/(auth)` on the pattern in §6.
9. **Client component** in `components/app/` with a `*.spec.tsx` that queries by role and accessible name (`class-students.spec.tsx` is the template).
10. **Journey**: extend `e2e/phase1.e2e.ts` (or the current phase's file) so the axe scan covers the new page.
11. `make verify && make e2e`.

## 8. Testing and running

| Layer | Runner | Where | Notes |
|---|---|---|---|
| Java unit | JUnit | `backend/src/test/…/domain`, `security` | No Spring context. |
| Java integration | JUnit + Testcontainers | classes extending `PostgresIntegrationTest` | One Postgres 18 container per JVM, started in a static initialiser. Before each test every table except migration history and content is truncated and every `InMemoryState` bean cleared. |
| Java HTTP | `ApiSession` over MockMvc | `adapter/web/*Test`, `authz/` | Real filter chain, cookie jar, CSRF fetched on first unsafe call, random client address per session. Never `csrf()` or `user()` shortcuts. |
| Java web slice | `@WebMvcTest` | `ProblemDetailsAdviceTest` | Must exclude `WebConfig` and `CurrentActorArgumentResolver`. |
| TS pure logic | `node --test` | `lib/**/*.test.ts` | BiPi convention, kept. |
| React components | Vitest + Testing Library, jsdom | `**/*.spec.ts(x)` | `test/setup.ts` cleans up between tests. |
| Journey | Playwright | `e2e/*.e2e.ts` | `laptop` and `phone` projects; axe scan on every page visited, after running animations settle. |

Commands (repo root): `make db-up`, `make backend-run` (:8080), `make frontend-run` (:3000, needs `frontend/.env.local`), `make verify`, `make e2e`.

`make e2e` (`scripts/e2e.sh`): starts `postgres-e2e` on :55433 with no volume, builds the jar, seeds one teacher with the operator CLI, starts Spring on :8081 and a production Next build on :3100, runs Playwright, tears everything down. It refuses to start if either port is taken, because a leftover server would answer the readiness check and the journey would test stale code.

**Operator commands** (`identity/adapter/cli/OperatorCommands.java`), the only way a school or teacher comes into existence:

```
scripts/operator.sh create-school --name="…" --short-name="…" --roll=76543A   # short name is optional; it fits the app header
scripts/operator.sh set-school-short-name --roll=76543A --short-name="…"
scripts/operator.sh create-user   --first-name=… --last-name=… --username=…     # prints the temporary password once
scripts/operator.sh grant-role    --username=… --roll=76543A --role=TEACHER
```

The same jar run with `operator` as its first argument starts without a web server (`CourseworkApplication.start`). That is why `AuthenticationConfig` is separate from the web-only `SecurityConfig`: controllers are still scanned and need their beans.

## 9. Deployment and configuration

- **Frontend**: Vercel, functions in `dub1` (`frontend/vercel.json`). Pilot project on `pilotMain` with `APP_ENABLED`, `BACKEND_INTERNAL_URL`, `PROXY_SHARED_SECRET` set for Production and Preview.
- **Backend**: Render web service, Frankfurt, from `backend/Dockerfile` (multi-stage, non-root, `SERVER_ADDRESS=0.0.0.0`). Environment: `DATABASE_URL` (JDBC form, not `postgres://`), `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `PROXY_SHARED_SECRET`. Health at `/actuator/health`.
- **Database**: Render Postgres, Frankfurt. Point-in-time recovery is deferred to the go-live gate (roadmap §9 R1).
- **Operator work on the host**: run the same image with `operator …` as arguments from Render's shell, so secrets never leave the host.
- **Local**: `backend/.env` (from `.env.example`) sets `APP_COOKIE_SECURE=false` because Safari won't keep a Secure cookie from plain http.

### 9.1 Operating the hosts (learned 15–16 Sep 2026)

- **Pilot Vercel project:** `leaving-cert-practical`, team `tim-mc-sweeneys-projects`. Two hostnames are bound and serve identically: `https://leaving-cert-practical-git-pilotmain-tim-mc-sweeneys-projects.vercel.app` and the legacy `https://leaving-cert-biology-website-wrwb.vercel.app`. The bare `leaving-cert-practical.vercel.app` is **not** assigned. Read hostnames from the deployment's Domains field; never reconstruct them from naming patterns.
- **Monorepo root:** the project's Root Directory is `frontend/`; Framework Preset `Next.js` with no command overrides. Building from the repo root ships empty output, which presents as platform `NOT_FOUND` on every path.
- **Diagnose a Vercel deploy from the network first:**
  ```
  curl -sD - <url> -o /dev/null | grep -i x-vercel-error
  ```
  `NOT_FOUND` on every path including `/` = nothing bound or empty build output; `DEPLOYMENT_NOT_FOUND` = hostname unassigned; the app's own `/_not-found` HTML with no `x-vercel-error` header = healthy host, now look at `APP_ENABLED` and env vars; `302 → vercel.com/sso-api` = Deployment Protection is on, turn it off (or use a Protection Bypass header) before diagnosing anything else.
- **Render free tier:** the web service sleeps when idle, so the first request after a pause can fail at the proxy while the JVM wakes; hit the backend URL directly first. The free database has no point-in-time recovery: **upgrade it before the first real account exists**, and check Render's free-Postgres expiry rule.
- **Render Shell needs a paid instance.** Bump the service to Starter, run the operator commands, drop back to Free; per-second billing makes it cents.
- **Regions can't be changed after creation** on Render; both the service and the database were made in Frankfurt from the start (roadmap §3 H1).
- **Verifying a deploy:** `/api/v1/health` → `{"status":"UP"}` through the proxy; `x-vercel-id` second segment `dub1`; `/login` → 200 on the pilot project; `/` → 307 to the default class. Katelyn's project on `main` must return 404 for `/login` and `/api/v1/health` while still serving the schedule.

## 10. Things that look wrong but aren't

- `PasswordChangeRequiredFilter` is not a `@Component`: Boot would register it a second time outside the security chain.
- `OtherSessions` takes an `ObjectProvider`: the operator process has no session repository.
- `createApiClient` reads transport headers outside its `try`: on the server that is Next's `headers()`, which throws a bailout signal during a static build to mark the route dynamic, and that signal must propagate.
- `ErrorPanel`'s "Try again" is `<a href="?">`: `next/link` with an empty href renders nothing in jsdom.
- Next's route announcer is an empty `role="alert"` on every page; e2e locators for alerts filter by text.
- The app's focus-outline rule in `globals.css` sits in `@layer base`. Unlayered CSS beats every Tailwind utility whatever its specificity, so field inputs couldn't hand focus to their row.
- `.app-theme` exists instead of re-pointing `--primary` and friends at `:root`: the live BiPi schedule uses `bg-card`, `text-muted-foreground` and `Progress`, and must keep its colours.
- Join and reset code inputs are uppercased with CSS only; the value stays as typed, and `normaliseJoinCode` or the backend uppercases it.
- `PostgresIntegrationTest` starts its container in a static block, not `@Testcontainers`: the extension stops the container after the first class in a full build.
