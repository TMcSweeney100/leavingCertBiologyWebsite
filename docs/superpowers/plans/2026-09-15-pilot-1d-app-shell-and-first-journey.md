# Pilot 1D — App Shell and First Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Phase 1 journey works in a browser: a teacher signs in, changes their temporary password, creates a class and reads out its code; a student on a phone joins with the code, waits, is approved, forgets their password and resets it with a teacher-issued code. Every page is plain but complete, every state in roadmap §6.2 renders, and a Playwright run proves the whole journey with an accessibility scan on each page.

**Architecture:** Server components load data through `lib/api/server.ts` (the viewer's cookie forwarded to Spring) and render; the few interactive parts are small client components that call `lib/api/client.ts` through the proxy and then `router.refresh()` or `router.push()`. Zod schemas in `lib/api/schemas.ts` mirror the backend's response records exactly. A `middleware.ts` redirects a cookieless visitor to `/login?next=…`; the `(app)` layout does the real session check and the forced-password-change redirect. Pages use semantic HTML and the shadcn `Button`; the look arrives with design packs D-1 and D-2 (Task 10, roadmap §6.3).

**Tech Stack:** Next.js 15.3.9 App Router, React 19, Zod 4, Vitest + React Testing Library + user-event (from 1A), Playwright with `@axe-core/playwright` (new), shadcn `Button` on Base UI (existing).

**Roadmap:** `docs/PILOT-ROADMAP.md` §6 (navigation, pages, handoff protocol) and §8.1 1D. **Design:** §5.1, §5.3, §8.1, §10.

---

## Before you start

- 1C is built. Branch from it: `git checkout -b pilot/1d-app-shell-and-first-journey` (from `pilot/1c-classes-and-enrolment`, or `main` if merged).
- `make verify` is green. `make db-up` works.
- Read from earlier milestones: `frontend/lib/api/client.ts`, `server.ts`, `problem.ts` (1A Task 10), `frontend/app/(auth)/layout.tsx` and `lib/app/routes.ts` (1A Task 8), `frontend/BIPI-SITE-NOTES.md` §"Framework" (the `node --test` import convention), and the backend response records this plan mirrors: `identity/adapter/web/MeResponse.java`, `classes/application/ClassViews.java`, `classes/adapter/web/CreateClassRequest.java`, `SignUpRequest.java`, `identity/adapter/web/PasswordResetRequest.java`, `ChangePasswordRequest.java`.
- `frontend/.env.local` has `APP_ENABLED=true`, `BACKEND_INTERNAL_URL=http://localhost:8080`, `PROXY_SHARED_SECRET=local-dev-proxy-secret` (copy `.env.example`). `backend/.env` has `APP_COOKIE_SECURE=false`, or the browser won't keep the session cookie over plain http.

**Decisions this plan takes** — **all four confirmed as written by Tim on 16 Sep 2026**:

| # | Decision | Where |
|---|---|---|
| P-4 | **Sign-out is a POST from a client button, then `/login`.** No GET sign-out link, because a GET that changes state is CSRF bait and Spring's CSRF would refuse it anyway. | `SignOutButton` |
| P-5 | **The reset page sends the student to `/login` after success** (matches 1C's P-3: redeeming doesn't sign in). | `ResetForm` |
| P-6 | **`/school` is a placeholder page in 1D** ("Your school overview arrives in Phase 5"), so a school leader has somewhere to land. | `app/(app)/school/page.tsx` |
| P-7 | **Middleware checks only that a `SESSION` cookie exists**, to add `?next=`; validity is checked by the layout. A stale cookie therefore lands on `/login` without `next`, which is acceptable. | `middleware.ts` |

**Testing rules (roadmap §4.1, §6.3)**

- Component specs query **by role and accessible name** only. No test ids, no class names. This is the contract the restyle must keep.
- Client components are specced with the API client mocked (`vi.mock("@/lib/api/client")`) and `next/navigation` mocked. Server pages are not rendered in Vitest; their logic lives in `lib/app/*.ts` with `node:test` coverage, and the pages themselves are covered by Playwright.
- Every page handles "API unreachable" with `ErrorPanel`.

---

## File structure

All paths under `frontend/`.

| File | Responsibility | Task |
|---|---|---|
| `lib/api/schemas.ts` | Zod schemas mirroring the backend records; exported types | 1 |
| `lib/app/navigation.ts` + `navigation.test.ts` | `safeNext`, `landingFor`, `teacherSchoolId`, `APP_NAV` | 1 |
| `lib/app/session.ts` | `getSession()` (null when signed out), `requireSession()` | 1 |
| `lib/app/attempt.ts` | `attempt(fn)` → data or `ApiError`, for server pages | 1 |
| `middleware.ts` | Cookieless app visitor → `/login?next=` | 1 |
| `components/app/error-panel.tsx` + spec | Shared "API unreachable / error" panel | 1 |
| `components/app/app-header.tsx` + spec, `sign-out-button.tsx` + spec | Role switcher, account menu | 2 |
| `app/(app)/layout.tsx`, `app/(app)/school/page.tsx` | Session gate, forced change, header; leader placeholder | 2 |
| `app/(auth)/login/page.tsx`, `components/app/login-form.tsx` + spec | Sign in, post-sign-in routing | 3 |
| `app/(auth)/account/password/page.tsx`, `components/app/change-password-form.tsx` + spec | Change password, forced mode | 4 |
| `app/(auth)/join/page.tsx`, `components/app/join-code-form.tsx` + spec | Code entry | 5 |
| `app/(auth)/join/[code]/page.tsx`, `components/app/sign-up-form.tsx` + spec, `join-button.tsx` + spec | Preview, sign-up, join | 5 |
| `app/(app)/home/page.tsx`, `components/app/my-classes.tsx` + spec | Student's classes | 6 |
| `app/(app)/teach/page.tsx`, `components/app/class-list.tsx` + spec | Teacher's classes | 7 |
| `app/(app)/teach/classes/new/page.tsx`, `components/app/create-class-form.tsx` + spec | Create class | 7 |
| `app/(app)/teach/classes/[id]/page.tsx`, `components/app/class-students.tsx` + spec | Students tab: code, approve, remove, reset code | 8 |
| `app/(auth)/reset/page.tsx`, `components/app/reset-form.tsx` + spec | Reset with a teacher's code | 9 |
| `playwright.config.ts`, `e2e/phase1.e2e.ts`, `scripts/e2e.sh`, `package.json` | The journey and the harness | 10 |
| `docs/design/pilot/…` | Restyle from D-1, D-2 when they arrive | 11 |

---

## Task 1: Schemas, navigation rules, session helper, middleware, error panel

**Files:**
- Create: `lib/api/schemas.ts`, `lib/app/navigation.ts`, `lib/app/navigation.test.ts`, `lib/app/session.ts`, `lib/app/attempt.ts`, `middleware.ts`, `components/app/error-panel.tsx`, `components/app/error-panel.spec.tsx`

- [ ] **Step 1: Write the failing tests**

`lib/app/navigation.test.ts` (node:test; imports carry `.ts`):

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_NAV, landingFor, safeNext, teacherSchoolId } from './navigation.ts';
import type { Me } from '../api/schemas.ts';

const school = { schoolId: '11111111-1111-1111-1111-111111111111', schoolName: 'School A' };

function me(roles: Me['roles'], mustChangePassword = false): Me {
  return {
    userId: 'u1',
    username: 'someone',
    firstName: 'Some',
    lastName: 'One',
    mustChangePassword,
    roles,
  };
}

describe('safeNext', () => {
  test('accepts only same-origin absolute paths', () => {
    assert.equal(safeNext('/teach/classes/abc'), '/teach/classes/abc');
    assert.equal(safeNext('/home?x=1'), '/home?x=1');
    for (const bad of [undefined, null, '', 'home', '//evil.example', 'https://evil.example', '/\\evil', '/login']) {
      assert.equal(safeNext(bad), undefined, String(bad));
    }
  });
});

describe('landingFor', () => {
  test('forced password change beats everything', () => {
    assert.equal(landingFor(me([{ ...school, role: 'TEACHER' }], true), '/home'), '/account/password');
  });

  test('a safe next beats the role landing', () => {
    assert.equal(landingFor(me([{ ...school, role: 'STUDENT' }]), '/join/ABCDEFGH'), '/join/ABCDEFGH');
    assert.equal(landingFor(me([{ ...school, role: 'STUDENT' }]), '//evil.example'), '/home');
  });

  test('highest role wins: teacher, then leader, then student', () => {
    assert.equal(landingFor(me([{ ...school, role: 'STUDENT' }, { ...school, role: 'TEACHER' }])), '/teach');
    assert.equal(landingFor(me([{ ...school, role: 'STUDENT' }, { ...school, role: 'SCHOOL_LEADER' }])), '/school');
    assert.equal(landingFor(me([{ ...school, role: 'STUDENT' }])), '/home');
    assert.equal(landingFor(me([])), '/home');
  });
});

describe('teacherSchoolId', () => {
  test('is the school of the TEACHER role, or undefined', () => {
    assert.equal(teacherSchoolId(me([{ ...school, role: 'TEACHER' }])), school.schoolId);
    assert.equal(teacherSchoolId(me([{ ...school, role: 'STUDENT' }])), undefined);
  });
});

describe('APP_NAV', () => {
  test('offers one landing per role held, in the roadmap order', () => {
    const all = APP_NAV(me([{ ...school, role: 'STUDENT' }, { ...school, role: 'TEACHER' }, { ...school, role: 'SCHOOL_LEADER' }]));
    assert.deepEqual(all.map((n) => n.href), ['/teach', '/school', '/home']);
    assert.deepEqual(APP_NAV(me([{ ...school, role: 'STUDENT' }])).map((n) => n.label), ['Timeline']);
  });
});
```

`components/app/error-panel.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/problem";

import { ErrorPanel } from "./error-panel";

describe("ErrorPanel", () => {
  it("explains an unreachable service in plain words", () => {
    render(<ErrorPanel error={ApiError.unreachable(new Error("x"))} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Can't reach the service");
    expect(screen.getByRole("link", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows the API's own detail for a problem", () => {
    render(<ErrorPanel error={new ApiError({ code: "NOT_FOUND", status: 404, detail: "No such class." })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No such class.");
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd frontend && npm test`
Expected: FAIL — `Cannot find module './navigation.ts'`, then `Failed to resolve import "./error-panel"`.

- [ ] **Step 3: Write the schemas**

`lib/api/schemas.ts` — one schema per backend record, field for field:

```ts
import { z } from "zod";

// Mirrors identity/adapter/web/MeResponse.java.
export const roleSchema = z.enum(["STUDENT", "TEACHER", "SCHOOL_LEADER"]);
export const meSchema = z.object({
  userId: z.string(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  mustChangePassword: z.boolean(),
  roles: z.array(z.object({ schoolId: z.string(), schoolName: z.string(), role: roleSchema })),
});
export type Me = z.infer<typeof meSchema>;
export type Role = z.infer<typeof roleSchema>;

// Mirrors classes/application/ClassViews.java.
export const levelSchema = z.enum(["HIGHER", "ORDINARY", "MIXED"]);
export const enrolmentStatusSchema = z.enum(["PENDING", "APPROVED", "REMOVED"]);

export const joinCodeSchema = z.object({ code: z.string(), expiresAt: z.string() });

export const classSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  yearGroup: z.number(),
  academicYear: z.string(),
  level: levelSchema.nullable(),
  pendingCount: z.number(),
});
export type ClassSummary = z.infer<typeof classSummarySchema>;

export const memberSchema = z.object({
  enrolmentId: z.string(),
  studentId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  status: enrolmentStatusSchema,
  requestedAt: z.string(),
});
export type Member = z.infer<typeof memberSchema>;

export const classDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  yearGroup: z.number(),
  academicYear: z.string(),
  level: levelSchema.nullable(),
  joinCode: joinCodeSchema.nullable(),
  enrolments: z.array(memberSchema),
});
export type ClassDetail = z.infer<typeof classDetailSchema>;

export const joinPreviewSchema = z.object({ className: z.string(), subjectName: z.string(), schoolName: z.string() });
export type JoinPreview = z.infer<typeof joinPreviewSchema>;

export const enrolmentViewSchema = z.object({
  enrolmentId: z.string(),
  classId: z.string(),
  className: z.string(),
  subjectName: z.string(),
  schoolName: z.string(),
  status: enrolmentStatusSchema,
});
export type EnrolmentView = z.infer<typeof enrolmentViewSchema>;

export const resetCodeIssuedSchema = z.object({ code: z.string(), expiresAt: z.string() });

export const subjectSchema = z.object({ code: z.string(), name: z.string() });
export type Subject = z.infer<typeof subjectSchema>;

export const noContentSchema = z.undefined();
```

- [ ] **Step 4: Write the navigation rules and session helper**

`lib/app/navigation.ts` (roadmap §6.1):

```ts
import type { Me, Role } from '../api/schemas.ts';

/** Landing page per role, highest first (roadmap §6.1). */
const LANDINGS: ReadonlyArray<{ role: Role; href: string; label: string }> = [
  { role: 'TEACHER', href: '/teach', label: 'Classes' },
  { role: 'SCHOOL_LEADER', href: '/school', label: 'School overview' },
  { role: 'STUDENT', href: '/home', label: 'Timeline' },
];

/**
 * A `?next=` value is honoured only if it's a path on this origin: starts with one slash, and isn't
 * the login page itself (which would loop).
 */
export function safeNext(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined;
  if (value === '/login' || value.startsWith('/login?')) return undefined;
  return value;
}

export function landingFor(me: Me, next?: string | null): string {
  if (me.mustChangePassword) return '/account/password';
  const safe = safeNext(next);
  if (safe) return safe;
  const held = new Set(me.roles.map((r) => r.role));
  return LANDINGS.find((l) => held.has(l.role))?.href ?? '/home';
}

/** The school a teacher creates classes at. In the pilot a teacher has exactly one (plan 1C P-2). */
export function teacherSchoolId(me: Me): string | undefined {
  return me.roles.find((r) => r.role === 'TEACHER')?.schoolId;
}

/** Header links: one per role held, roadmap order. Shown as a switcher only when there's more than one. */
export function APP_NAV(me: Me): ReadonlyArray<{ href: string; label: string }> {
  const held = new Set(me.roles.map((r) => r.role));
  return LANDINGS.filter((l) => held.has(l.role)).map(({ href, label }) => ({ href, label }));
}
```

`lib/app/attempt.ts`:

```ts
import { ApiError } from "@/lib/api/problem";

export type Attempt<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/** For server pages: a failed load renders the shared error panel instead of crashing the route. */
export async function attempt<T>(load: () => Promise<T>): Promise<Attempt<T>> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error };
    throw error;
  }
}
```

`lib/app/session.ts`:

```ts
import { redirect } from "next/navigation";

import { ApiError, ApiErrorCode } from "@/lib/api/problem";
import { meSchema, type Me } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";

/** The signed-in account, or null when there's no valid session. Other API failures propagate. */
export async function getSession(): Promise<Me | null> {
  try {
    return await serverApi.get("/auth/me", meSchema);
  } catch (error) {
    if (error instanceof ApiError && error.code === ApiErrorCode.UNAUTHENTICATED) return null;
    throw error;
  }
}

/** For pages that need a session. `middleware.ts` usually got here first and added `?next=`. */
export async function requireSession(): Promise<Me> {
  const me = await getSession();
  if (!me) redirect("/login");
  return me;
}
```

`middleware.ts` (at `frontend/middleware.ts`):

```ts
import { type NextRequest, NextResponse } from "next/server";

/**
 * Signed out → `/login?next=<path>` (roadmap §6.1). Plan decision P-7: only the cookie's presence is
 * checked here; `(app)/layout.tsx` validates the session against Spring.
 */
const SESSION_COOKIE = "SESSION";

export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/home/:path*", "/teach/:path*", "/school/:path*", "/components/:path*", "/account/:path*"],
};
```

- [ ] **Step 5: Write the error panel**

`components/app/error-panel.tsx`:

```tsx
import Link from "next/link";

import { ApiError, ApiErrorCode } from "@/lib/api/problem";

/** The one way every page shows an API failure (roadmap §6.2: "API unreachable"). */
export function ErrorPanel({ error }: { error: ApiError }) {
  const unreachable = error.code === ApiErrorCode.BACKEND_UNREACHABLE;
  return (
    <section role="alert" aria-live="polite">
      <h2>{unreachable ? "Can't reach the service" : error.title}</h2>
      <p>{unreachable ? "Check your connection and try again in a moment." : error.detail}</p>
      <Link href="">Try again</Link>
    </section>
  );
}
```

`<Link href="">` reloads the current URL; in a server page that re-runs the load.

- [ ] **Step 6: Run the tests and watch them pass**

Run: `npm test && npm run typecheck && npm run lint`
Expected: node tests 78 + 7 = 85 passing; specs 32 + 2 = 34 passing; types and lint clean.

- [ ] **Step 7: Commit**

```bash
cd .. && git add frontend/lib frontend/middleware.ts frontend/components/app
git commit -m "Add API schemas, navigation rules, session helper and error panel

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 2: The app layout and header

Roadmap §6.1 (header: role switcher when more than one role, account menu with Change password and Sign out; forced change first) and P-6.

**Files:**
- Create: `components/app/sign-out-button.tsx`, `sign-out-button.spec.tsx`, `components/app/app-header.tsx`, `app-header.spec.tsx`, `app/(app)/layout.tsx`, `app/(app)/school/page.tsx`

- [ ] **Step 1: Write the failing specs**

`components/app/sign-out-button.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { sendNoContent: vi.fn(async () => undefined) } };
});

import { api } from "@/lib/api/client";

import { SignOutButton } from "./sign-out-button";

describe("SignOutButton", () => {
  it("posts to logout and goes to the login page", async () => {
    render(<SignOutButton />);

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(api.sendNoContent).toHaveBeenCalledWith("POST", "/auth/logout");
    expect(push).toHaveBeenCalledWith("/login");
  });
});
```

`components/app/app-header.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Me } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { sendNoContent: vi.fn() } };
});

import { AppHeader } from "./app-header";

const school = { schoolId: "s1", schoolName: "School A" };
const base: Me = { userId: "u1", username: "k.hanlon", firstName: "Katelyn", lastName: "Hanlon", mustChangePassword: false, roles: [] };

describe("AppHeader", () => {
  it("shows no role switcher for a single role", () => {
    render(<AppHeader me={{ ...base, roles: [{ ...school, role: "TEACHER" }] }} />);
    expect(screen.queryByRole("navigation", { name: "Switch role" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Classes" })).toHaveAttribute("href", "/teach");
  });

  it("shows a role switcher for a year head who teaches", () => {
    render(<AppHeader me={{ ...base, roles: [{ ...school, role: "TEACHER" }, { ...school, role: "SCHOOL_LEADER" }] }} />);
    const nav = screen.getByRole("navigation", { name: "Switch role" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "School overview" })).toHaveAttribute("href", "/school");
  });

  it("has the account menu with change password and sign out", () => {
    render(<AppHeader me={{ ...base, roles: [{ ...school, role: "STUDENT" }] }} />);
    expect(screen.getByRole("link", { name: "Change password" })).toHaveAttribute("href", "/account/password");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByText("Katelyn Hanlon")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run components/app`
Expected: FAIL — `Failed to resolve import "./sign-out-button"` and `"./app-header"`.

- [ ] **Step 3: Write the components**

`components/app/sign-out-button.tsx` (P-4):

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await api.sendNoContent("POST", "/auth/logout");
    } finally {
      // Whether or not Spring answered, the browser should leave the app.
      router.push("/login");
    }
  }

  return (
    <Button type="button" variant="outline" onClick={signOut} disabled={busy}>
      Sign out
    </Button>
  );
}
```

`components/app/app-header.tsx`:

```tsx
import Link from "next/link";

import type { Me } from "@/lib/api/schemas";
import { APP_NAV } from "@/lib/app/navigation";

import { SignOutButton } from "./sign-out-button";

/** On every app page (roadmap §6.1). Plain until design pack D-1. */
export function AppHeader({ me }: { me: Me }) {
  const nav = APP_NAV(me);
  return (
    <header>
      {nav.length > 1 ? (
        <nav aria-label="Switch role">
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        nav[0] && <Link href={nav[0].href}>{nav[0].label}</Link>
      )}
      <nav aria-label="Account">
        <span>
          {me.firstName} {me.lastName}
        </span>
        <Link href="/account/password">Change password</Link>
        <SignOutButton />
      </nav>
    </header>
  );
}
```

`app/(app)/layout.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/app/app-header";
import { isAppEnabled } from "@/lib/app/routes";
import { getSession } from "@/lib/app/session";

// Every signed-in page. Roadmap §6.1: forced password change first, then the page.
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!isAppEnabled()) notFound();
  const me = await getSession();
  if (!me) redirect("/login");
  if (me.mustChangePassword) redirect("/account/password");
  return (
    <>
      <AppHeader me={me} />
      {children}
    </>
  );
}
```

`app/(app)/school/page.tsx` (P-6):

```tsx
export default function SchoolPage() {
  return (
    <main>
      <h1>School overview</h1>
      <p>Your school overview arrives in Phase 5.</p>
    </main>
  );
}
```

If `getSession` throws `BACKEND_UNREACHABLE`, Next renders its error boundary. Add `app/(app)/error.tsx`:

```tsx
"use client";

import { ApiError } from "@/lib/api/problem";
import { ErrorPanel } from "@/components/app/error-panel";

export default function AppError({ error }: { error: Error }) {
  const apiError = error instanceof ApiError ? error : ApiError.unreachable(error);
  return (
    <main>
      <ErrorPanel error={apiError} />
    </main>
  );
}
```

- [ ] **Step 4: Run the specs and watch them pass**

Run: `npx vitest run components/app`
Expected: 6 tests, 0 failures.

- [ ] **Step 5: Check the layout by hand**

```bash
cd .. && make db-up && (cd backend && ./mvnw -q spring-boot:run &) ; sleep 30
cd frontend && npm run dev &
sleep 8
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/home
# → 307 http://localhost:3000/login?next=%2Fhome
```

Stop both servers afterwards.

- [ ] **Step 6: Run everything, then commit**

```bash
npm test && npm run typecheck && npm run lint && cd ..
git add "frontend/app/(app)" frontend/components/app
git commit -m "Add the app layout with session gate, role switcher and sign-out

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 3: `/login` and post-sign-in routing

Roadmap §6.2 `/login`: username and password; wrong credentials (one message), too many attempts (with retry time), already signed in → routed as §6.1.

**Files:**
- Create: `components/app/login-form.tsx`, `login-form.spec.tsx`
- Replace: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Write the failing spec**

`components/app/login-form.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/problem";
import type { Me } from "@/lib/api/schemas";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { LoginForm } from "./login-form";

const teacher: Me = {
  userId: "u1", username: "k.hanlon", firstName: "K", lastName: "H", mustChangePassword: false,
  roles: [{ schoolId: "s1", schoolName: "School A", role: "TEACHER" }],
};

async function fillAndSubmit(username = "k.hanlon", password = "correct-horse-battery") {
  await userEvent.type(screen.getByRole("textbox", { name: "Username" }), username);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

beforeEach(() => {
  push.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("LoginForm", () => {
  it("signs in and goes to the role's landing page", async () => {
    vi.mocked(api.send).mockResolvedValue(teacher);
    render(<LoginForm />);

    await fillAndSubmit();

    expect(api.send).toHaveBeenCalledWith("POST", "/auth/login", { username: "k.hanlon", password: "correct-horse-battery" }, expect.anything());
    expect(push).toHaveBeenCalledWith("/teach");
  });

  it("honours a safe next and ignores an unsafe one", async () => {
    vi.mocked(api.send).mockResolvedValue(teacher);
    const { unmount } = render(<LoginForm next="/join/ABCDEFGH" />);
    await fillAndSubmit();
    expect(push).toHaveBeenCalledWith("/join/ABCDEFGH");
    unmount();

    push.mockReset();
    render(<LoginForm next="//evil.example" />);
    await fillAndSubmit();
    expect(push).toHaveBeenCalledWith("/teach");
  });

  it("sends a temporary password holder to change it", async () => {
    vi.mocked(api.send).mockResolvedValue({ ...teacher, mustChangePassword: true });
    render(<LoginForm next="/teach" />);

    await fillAndSubmit();

    expect(push).toHaveBeenCalledWith("/account/password");
  });

  it("shows one message for wrong credentials and keeps the username", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({ code: "INVALID_CREDENTIALS", status: 401, detail: "Wrong username or password." }));
    render(<LoginForm />);

    await fillAndSubmit("k.hanlon", "nope-nope-nope");

    expect(screen.getByRole("alert")).toHaveTextContent("Wrong username or password.");
    expect(screen.getByRole("textbox", { name: "Username" })).toHaveValue("k.hanlon");
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the retry time when throttled", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({ code: "TOO_MANY_ATTEMPTS", status: 429, detail: "Too many attempts. Try again in 12 minutes." }));
    render(<LoginForm />);

    await fillAndSubmit();

    expect(screen.getByRole("alert")).toHaveTextContent("Try again in 12 minutes.");
  });

  it("reports an unreachable service", async () => {
    vi.mocked(api.send).mockRejectedValue(ApiError.unreachable(new Error("x")));
    render(<LoginForm />);

    await fillAndSubmit();

    expect(screen.getByRole("alert")).toHaveTextContent("Can't reach the service");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run components/app/login-form`
Expected: FAIL — `Failed to resolve import "./login-form"`.

- [ ] **Step 3: Write the form and page**

`components/app/login-form.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { meSchema } from "@/lib/api/schemas";
import { landingFor } from "@/lib/app/navigation";

import { ErrorPanel } from "./error-panel";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await api.send("POST", "/auth/login", { username, password }, meSchema);
      router.push(landingFor(me, next));
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="login-heading">
      <h1 id="login-heading">Sign in</h1>
      {error && <ErrorPanel error={error} />}
      <label>
        Username
        <input name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" required
          value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <Button type="submit" disabled={busy}>Sign in</Button>
      <p>
        Joining a class? <a href="/join">Enter your join code</a>. Forgotten your password? <a href="/reset">Use a reset code</a>.
      </p>
    </form>
  );
}
```

`app/(auth)/login/page.tsx` (replaces the 1A placeholder):

```tsx
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/app/login-form";
import { landingFor, safeNext } from "@/lib/app/navigation";
import { getSession } from "@/lib/app/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams;
  const next = safeNext(Array.isArray(params.next) ? params.next[0] : params.next);

  // Already signed in: route as if they'd just signed in (roadmap §6.2).
  const me = await getSession().catch(() => null);
  if (me) redirect(landingFor(me, next));

  return (
    <main>
      <LoginForm next={next} />
    </main>
  );
}
```

`getSession().catch(() => null)`: if Spring is down, the login page still renders and the form's own submit will report it.

- [ ] **Step 4: Run the spec and watch it pass**

Run: `npx vitest run components/app/login-form`
Expected: 6 tests, 0 failures.

- [ ] **Step 5: Run everything, then commit**

```bash
npm test && npm run typecheck && npm run lint && cd ..
git add "frontend/app/(auth)/login" frontend/components/app/login-form.tsx frontend/components/app/login-form.spec.tsx
git commit -m "Sign in with post-sign-in routing by role, next and forced change

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 4: `/account/password`

Roadmap §6.2: current, new, confirm; forced mode has no way out except Sign out; new too short; current wrong.

**Files:**
- Create: `components/app/change-password-form.tsx`, `change-password-form.spec.tsx`, `app/(auth)/account/password/page.tsx`

- [ ] **Step 1: Write the failing spec**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/problem";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { sendNoContent: vi.fn(), send: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { ChangePasswordForm } from "./change-password-form";

async function fill(current: string, next: string, confirm = next) {
  await userEvent.type(screen.getByLabelText("Current password"), current);
  await userEvent.type(screen.getByLabelText("New password"), next);
  await userEvent.type(screen.getByLabelText("Confirm new password"), confirm);
  await userEvent.click(screen.getByRole("button", { name: "Change password" }));
}

beforeEach(() => {
  push.mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("ChangePasswordForm", () => {
  it("changes the password and goes to the landing page", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    render(<ChangePasswordForm forced={false} landing="/teach" />);

    await fill("Temporary-Pass-1", "my-own-password-1");

    expect(api.sendNoContent).toHaveBeenCalledWith("POST", "/auth/password", { currentPassword: "Temporary-Pass-1", newPassword: "my-own-password-1" });
    expect(push).toHaveBeenCalledWith("/teach");
  });

  it("refuses a confirmation that doesn't match before calling the API", async () => {
    render(<ChangePasswordForm forced={false} landing="/home" />);

    await fill("Temporary-Pass-1", "my-own-password-1", "my-own-password-2");

    expect(screen.getByRole("alert")).toHaveTextContent("don't match");
    expect(api.sendNoContent).not.toHaveBeenCalled();
  });

  it("explains forced mode and offers only sign out", () => {
    render(<ChangePasswordForm forced landing="/home" />);

    expect(screen.getByText(/temporary password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("offers cancel when not forced", () => {
    render(<ChangePasswordForm forced={false} landing="/home" />);
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/home");
  });

  it("shows the API's reasons: too short, or current wrong", async () => {
    vi.mocked(api.sendNoContent).mockRejectedValueOnce(new ApiError({ code: "PASSWORD_TOO_SHORT", status: 400, detail: "Passwords need at least 10 characters." }));
    render(<ChangePasswordForm forced={false} landing="/home" />);
    await fill("Temporary-Pass-1", "short");
    expect(screen.getByRole("alert")).toHaveTextContent("at least 10 characters");

    vi.mocked(api.sendNoContent).mockRejectedValueOnce(new ApiError({ code: "INVALID_CREDENTIALS", status: 401, detail: "Your current password isn't right." }));
    // The form cleared the current password after the error; the other two fields are cleared here.
    await userEvent.clear(screen.getByLabelText("New password"));
    await userEvent.clear(screen.getByLabelText("Confirm new password"));
    await fill("Temporary-Pass-1", "my-own-password-1");
    expect(screen.getByRole("alert")).toHaveTextContent("current password isn't right");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run components/app/change-password`
Expected: FAIL — import not found.

- [ ] **Step 3: Write the form and page**

`components/app/change-password-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";

import { ErrorPanel } from "./error-panel";
import { SignOutButton } from "./sign-out-button";

export function ChangePasswordForm({ forced, landing }: { forced: boolean; landing: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError(new ApiError({ code: "CONFIRMATION_MISMATCH", status: 0, title: "Passwords don't match", detail: "The two new passwords don't match. Type them again." }));
      return;
    }
    setBusy(true);
    try {
      await api.sendNoContent("POST", "/auth/password", { currentPassword: current, newPassword: next });
      router.push(landing);
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
      setCurrent("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="password-heading">
      <h1 id="password-heading">Change password</h1>
      {forced && (
        <p>You signed in with a temporary password. Choose your own to continue. It needs at least 10 characters.</p>
      )}
      {error && <ErrorPanel error={error} />}
      <label>
        Current password
        <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label>
        New password
        <input type="password" autoComplete="new-password" minLength={10} maxLength={64} required value={next} onChange={(e) => setNext(e.target.value)} />
      </label>
      <label>
        Confirm new password
        <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <Button type="submit" disabled={busy}>Change password</Button>
      {forced ? <SignOutButton /> : <Link href={landing}>Cancel</Link>}
    </form>
  );
}
```

Note `minLength={10}` is a hint only; the spec types "short" and jsdom doesn't block submit on `minLength`, so the API's `PASSWORD_TOO_SHORT` path is still exercised. In a browser the native check runs first, which is fine: same message, earlier.

`app/(auth)/account/password/page.tsx`:

```tsx
import { ChangePasswordForm } from "@/components/app/change-password-form";
import { landingFor } from "@/lib/app/navigation";
import { requireSession } from "@/lib/app/session";

export default async function ChangePasswordPage() {
  const me = await requireSession();
  return (
    <main>
      <ChangePasswordForm forced={me.mustChangePassword} landing={landingFor({ ...me, mustChangePassword: false })} />
    </main>
  );
}
```

This page lives in the `(auth)` group (no header) so a forced user has nothing else to click.

- [ ] **Step 4: Run the spec and watch it pass**

Run: `npx vitest run components/app/change-password`
Expected: 5 tests, 0 failures.

- [ ] **Step 5: Run everything, then commit**

```bash
npm test && npm run typecheck && npm run lint && cd ..
git add "frontend/app/(auth)/account" frontend/components/app/change-password-form.tsx frontend/components/app/change-password-form.spec.tsx
git commit -m "Change password, with a forced mode that only offers sign-out

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 5: `/join` and `/join/[code]`

Roadmap §6.2: code entry; preview of class, subject, school; signed out → Create account form plus "Sign in instead"; signed in → "Join this class"; username taken, password too short, already enrolled (shows status), code expired between steps.

**Files:**
- Create: `components/app/join-code-form.tsx` + spec, `sign-up-form.tsx` + spec, `join-button.tsx` + spec, `app/(auth)/join/page.tsx`, `app/(auth)/join/[code]/page.tsx`

- [ ] **Step 1: Write the failing specs**

`components/app/join-code-form.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import { JoinCodeForm } from "./join-code-form";

describe("JoinCodeForm", () => {
  it("goes to the code's page, normalised", async () => {
    render(<JoinCodeForm />);

    await userEvent.type(screen.getByRole("textbox", { name: "Join code" }), " abcd-efgh ");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(push).toHaveBeenCalledWith("/join/ABCDEFGH");
  });

  it("shows the invalid-code message passed in", () => {
    render(<JoinCodeForm invalid />);
    expect(screen.getByRole("alert")).toHaveTextContent("isn't right, or it has expired");
  });
});
```

`components/app/sign-up-form.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/problem";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { SignUpForm } from "./sign-up-form";

const enrolment = { enrolmentId: "e1", classId: "c1", className: "6A Biology", subjectName: "Biology", schoolName: "School A", status: "PENDING" as const };

async function fill() {
  await userEvent.type(screen.getByRole("textbox", { name: "First name" }), "Aoife");
  await userEvent.type(screen.getByRole("textbox", { name: "Surname" }), "Byrne");
  await userEvent.type(screen.getByRole("textbox", { name: "Username" }), "aoife.b");
  await userEvent.type(screen.getByLabelText("Password"), "aoife-loves-cells");
  await userEvent.click(screen.getByRole("button", { name: "Create account and join" }));
}

beforeEach(() => {
  push.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("SignUpForm", () => {
  it("creates the account, joins, and goes home", async () => {
    vi.mocked(api.send).mockResolvedValue(enrolment);
    render(<SignUpForm code="ABCDEFGH" />);

    await fill();

    expect(api.send).toHaveBeenCalledWith("POST", "/join/ABCDEFGH/accounts",
      { firstName: "Aoife", lastName: "Byrne", username: "aoife.b", password: "aoife-loves-cells" }, expect.anything());
    expect(push).toHaveBeenCalledWith("/home");
  });

  it("links to sign in instead, keeping the code as next", () => {
    render(<SignUpForm code="ABCDEFGH" />);
    expect(screen.getByRole("link", { name: "Sign in instead" })).toHaveAttribute("href", "/login?next=%2Fjoin%2FABCDEFGH");
  });

  it("shows a taken username, a short password, and an expired code", async () => {
    render(<SignUpForm code="ABCDEFGH" />);
    for (const [code, detail] of [
      ["USERNAME_TAKEN", "That username is taken."],
      ["PASSWORD_TOO_SHORT", "Passwords need at least 10 characters."],
      ["JOIN_CODE_INVALID", "That join code isn't right, or it has expired."],
    ] as const) {
      vi.mocked(api.send).mockRejectedValueOnce(new ApiError({ code, status: 400, detail }));
      await fill();
      expect(screen.getByRole("alert")).toHaveTextContent(detail);
      await userEvent.clear(screen.getByRole("textbox", { name: "First name" }));
      await userEvent.clear(screen.getByRole("textbox", { name: "Surname" }));
      await userEvent.clear(screen.getByRole("textbox", { name: "Username" }));
    }
    expect(push).not.toHaveBeenCalled();
  });
});
```

`components/app/join-button.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/problem";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { JoinButton } from "./join-button";

const view = (status: "PENDING" | "APPROVED") => ({ enrolmentId: "e1", classId: "c1", className: "6A Biology", subjectName: "Biology", schoolName: "School A", status });

beforeEach(() => {
  push.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("JoinButton", () => {
  it("asks to join and shows the resulting status", async () => {
    vi.mocked(api.send).mockResolvedValue(view("PENDING"));
    render(<JoinButton code="ABCDEFGH" />);

    await userEvent.click(screen.getByRole("button", { name: "Join this class" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/join/ABCDEFGH/enrolments", undefined, expect.anything());
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for your teacher to approve");
    expect(screen.getByRole("link", { name: "Go to your classes" })).toHaveAttribute("href", "/home");
  });

  it("says so when already approved", async () => {
    vi.mocked(api.send).mockResolvedValue(view("APPROVED"));
    render(<JoinButton code="ABCDEFGH" />);

    await userEvent.click(screen.getByRole("button", { name: "Join this class" }));

    expect(screen.getByRole("status")).toHaveTextContent("already in this class");
  });

  it("reports a code that expired between steps", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({ code: "JOIN_CODE_INVALID", status: 404, detail: "That join code isn't right, or it has expired." }));
    render(<JoinButton code="ABCDEFGH" />);

    await userEvent.click(screen.getByRole("button", { name: "Join this class" }));

    expect(screen.getByRole("alert")).toHaveTextContent("expired");
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run components/app/join components/app/sign-up`
Expected: FAIL — imports not found.

- [ ] **Step 3: Write the components**

`components/app/join-code-form.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

/** Same normalisation as the backend's JoinCode.parse: strip spaces and dashes, uppercase. */
export function normaliseJoinCode(typed: string): string {
  return typed.replace(/[\s-]/g, "").toUpperCase();
}

export function JoinCodeForm({ invalid = false }: { invalid?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    router.push(`/join/${encodeURIComponent(normaliseJoinCode(code))}`);
  }

  return (
    <form onSubmit={submit} aria-labelledby="join-heading">
      <h1 id="join-heading">Join a class</h1>
      {invalid && (
        <p role="alert">That join code isn&rsquo;t right, or it has expired. Ask your teacher for a new one.</p>
      )}
      <label>
        Join code
        <input name="code" autoCapitalize="characters" autoCorrect="off" autoComplete="off" required
          value={code} onChange={(e) => setCode(e.target.value)} />
      </label>
      <Button type="submit">Continue</Button>
    </form>
  );
}
```

`components/app/sign-up-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { enrolmentViewSchema } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";

export function SignUpForm({ code }: { code: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.send("POST", `/join/${encodeURIComponent(code)}/accounts`, { firstName, lastName, username, password }, enrolmentViewSchema);
      router.push("/home");
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="signup-heading">
      <h2 id="signup-heading">Create your account</h2>
      {error && <ErrorPanel error={error} />}
      <label>
        First name
        <input name="firstName" autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </label>
      <label>
        Surname
        <input name="lastName" autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </label>
      <label>
        Username
        <input name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" required
          value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <p>3 to 32 characters: letters, numbers, dots, dashes and underscores.</p>
      <label>
        Password
        <input name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <p>At least 10 characters.</p>
      <Button type="submit" disabled={busy}>Create account and join</Button>
      <p>
        Already have an account? <Link href={`/login?next=${encodeURIComponent(`/join/${code}`)}`}>Sign in instead</Link>
      </p>
    </form>
  );
}
```

`components/app/join-button.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type EnrolmentView, enrolmentViewSchema } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";

const STATUS_TEXT = {
  PENDING: "Request sent. Waiting for your teacher to approve it.",
  APPROVED: "You're already in this class.",
  REMOVED: "You were removed from this class. Ask your teacher if that's a mistake.",
} as const;

export function JoinButton({ code }: { code: string }) {
  const [result, setResult] = useState<EnrolmentView | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.send("POST", `/join/${encodeURIComponent(code)}/enrolments`, undefined, enrolmentViewSchema));
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div>
        <p role="status">{STATUS_TEXT[result.status]}</p>
        <Link href="/home">Go to your classes</Link>
      </div>
    );
  }
  return (
    <div>
      {error && <ErrorPanel error={error} />}
      <Button type="button" onClick={join} disabled={busy}>Join this class</Button>
    </div>
  );
}
```

- [ ] **Step 4: Write the pages**

`app/(auth)/join/page.tsx`:

```tsx
import { JoinCodeForm } from "@/components/app/join-code-form";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ invalid?: string }> }) {
  const { invalid } = await searchParams;
  return (
    <main>
      <JoinCodeForm invalid={invalid === "1"} />
    </main>
  );
}
```

`app/(auth)/join/[code]/page.tsx`:

```tsx
import { redirect } from "next/navigation";

import { ErrorPanel } from "@/components/app/error-panel";
import { JoinButton } from "@/components/app/join-button";
import { SignUpForm } from "@/components/app/sign-up-form";
import { joinPreviewSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { getSession } from "@/lib/app/session";

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const preview = await attempt(() => serverApi.get(`/join/${encodeURIComponent(code)}`, joinPreviewSchema));
  if (!preview.ok) {
    if (preview.error.code === "JOIN_CODE_INVALID") redirect("/join?invalid=1");
    return (
      <main>
        <ErrorPanel error={preview.error} />
      </main>
    );
  }
  const me = await getSession().catch(() => null);

  return (
    <main>
      <h1>Join {preview.data.className}</h1>
      <p>
        {preview.data.subjectName}, {preview.data.schoolName}
      </p>
      {me ? (
        <>
          <p>Signed in as {me.username}.</p>
          <JoinButton code={code} />
        </>
      ) : (
        <SignUpForm code={code} />
      )}
    </main>
  );
}
```

- [ ] **Step 5: Run the specs and watch them pass**

Run: `npx vitest run components/app`
Expected: all pass (8 new tests).

- [ ] **Step 6: Run everything, then commit**

```bash
npm test && npm run typecheck && npm run lint && cd ..
git add "frontend/app/(auth)/join" frontend/components/app
git commit -m "Join a class by code: preview, sign up, or join with an existing account

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 6: `/home` (my classes)

Roadmap §6.2 `/home` 1D: my classes with status; Join a class; states: none yet, all pending.

**Files:**
- Create: `components/app/my-classes.tsx` + spec, `app/(app)/home/page.tsx`

- [ ] **Step 1: Write the failing spec**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MyClasses } from "./my-classes";

const cls = (status: "PENDING" | "APPROVED", className = "6A Biology") => ({
  enrolmentId: "e-" + className, classId: "c-" + className, className, subjectName: "Biology", schoolName: "School A", status,
});

describe("MyClasses", () => {
  it("lists classes with their status", () => {
    render(<MyClasses classes={[cls("APPROVED"), cls("PENDING", "6B Chemistry")]} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("6A Biology");
    expect(items[0]).toHaveTextContent("Approved");
    expect(items[1]).toHaveTextContent("Pending approval");
    expect(screen.getByRole("link", { name: "Join a class" })).toHaveAttribute("href", "/join");
  });

  it("explains an empty list", () => {
    render(<MyClasses classes={[]} />);
    expect(screen.getByText(/no classes yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Join a class" })).toBeInTheDocument();
  });

  it("explains when everything is still pending", () => {
    render(<MyClasses classes={[cls("PENDING")]} />);
    expect(screen.getByRole("status")).toHaveTextContent(/waiting for a teacher/i);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run components/app/my-classes`
Expected: FAIL — import not found.

- [ ] **Step 3: Write the component and page**

`components/app/my-classes.tsx`:

```tsx
import Link from "next/link";

import type { EnrolmentView } from "@/lib/api/schemas";

const STATUS_LABEL = { PENDING: "Pending approval", APPROVED: "Approved", REMOVED: "Removed" } as const;

export function MyClasses({ classes }: { classes: EnrolmentView[] }) {
  const allPending = classes.length > 0 && classes.every((c) => c.status === "PENDING");
  return (
    <section aria-labelledby="classes-heading">
      <h1 id="classes-heading">My classes</h1>
      {classes.length === 0 ? (
        <p>No classes yet. Ask your teacher for a join code.</p>
      ) : (
        <ul>
          {classes.map((c) => (
            <li key={c.enrolmentId}>
              <strong>{c.className}</strong> — {c.subjectName}, {c.schoolName}: {STATUS_LABEL[c.status]}
            </li>
          ))}
        </ul>
      )}
      {allPending && <p role="status">Waiting for a teacher to approve you. Check back after class.</p>}
      <Link href="/join">Join a class</Link>
    </section>
  );
}
```

`app/(app)/home/page.tsx`:

```tsx
import { ErrorPanel } from "@/components/app/error-panel";
import { MyClasses } from "@/components/app/my-classes";
import { enrolmentViewSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { z } from "zod";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const classes = await attempt(() => serverApi.get("/me/classes", z.array(enrolmentViewSchema)));
  return <main>{classes.ok ? <MyClasses classes={classes.data} /> : <ErrorPanel error={classes.error} />}</main>;
}
```

- [ ] **Step 4: Run the spec and watch it pass**

Run: `npx vitest run components/app/my-classes`
Expected: 3 tests, 0 failures.

- [ ] **Step 5: Run everything, then commit**

```bash
npm test && npm run typecheck && npm run lint && cd ..
git add "frontend/app/(app)/home" frontend/components/app/my-classes.tsx frontend/components/app/my-classes.spec.tsx
git commit -m "Students see their classes and enrolment status

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 7: `/teach` and `/teach/classes/new`

Roadmap §6.2: my classes with subject, name, year group, academic year, pending count; Create class. New: subject, name, year group, academic year, level optional; validation.

**Files:**
- Create: `components/app/class-list.tsx` + spec, `create-class-form.tsx` + spec, `app/(app)/teach/page.tsx`, `app/(app)/teach/classes/new/page.tsx`

- [ ] **Step 1: Write the failing specs**

`components/app/class-list.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassList } from "./class-list";

const summary = { id: "c1", name: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology", yearGroup: 6, academicYear: "2026/27", level: "HIGHER" as const, pendingCount: 2 };

describe("ClassList", () => {
  it("links each class and shows pending requests", () => {
    render(<ClassList classes={[summary, { ...summary, id: "c2", name: "5th", pendingCount: 0 }]} />);
    expect(screen.getByRole("link", { name: /6A Biology/ })).toHaveAttribute("href", "/teach/classes/c1");
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("2 pending requests");
    expect(screen.getAllByRole("listitem")[1]).not.toHaveTextContent("pending");
    expect(screen.getByRole("link", { name: "Create class" })).toHaveAttribute("href", "/teach/classes/new");
  });

  it("explains an empty list", () => {
    render(<ClassList classes={[]} />);
    expect(screen.getByText(/no classes yet/i)).toBeInTheDocument();
  });
});
```

`components/app/create-class-form.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/problem";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { CreateClassForm } from "./create-class-form";

const subjects = [{ code: "BIOLOGY", name: "Biology" }, { code: "CHEMISTRY", name: "Chemistry" }];
const detail = { id: "c9", name: "5th Chem", subjectCode: "CHEMISTRY", subjectName: "Chemistry", yearGroup: 5, academicYear: "2026/27", level: null, joinCode: { code: "ABCDEFGH", expiresAt: "2026-10-15T09:00:00Z" }, enrolments: [] };

beforeEach(() => {
  push.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("CreateClassForm", () => {
  it("creates the class and opens it", async () => {
    vi.mocked(api.send).mockResolvedValue(detail);
    render(<CreateClassForm schoolId="s1" subjects={subjects} defaultAcademicYear="2026/27" />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Subject" }), "CHEMISTRY");
    await userEvent.type(screen.getByRole("textbox", { name: "Class name" }), "5th Chem");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Year group" }), "5");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/classes",
      { schoolId: "s1", subjectCode: "CHEMISTRY", name: "5th Chem", yearGroup: 5, academicYear: "2026/27", level: null }, expect.anything());
    expect(push).toHaveBeenCalledWith("/teach/classes/c9");
  });

  it("lists the field errors the API returns", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({
      code: "VALIDATION_FAILED", status: 400, detail: "One or more fields are invalid.",
      fieldErrors: [{ field: "academicYear", message: "must look like 2026/27" }],
    }));
    render(<CreateClassForm schoolId="s1" subjects={subjects} defaultAcademicYear="2026/27" />);

    await userEvent.type(screen.getByRole("textbox", { name: "Class name" }), "6A");
    await userEvent.clear(screen.getByRole("textbox", { name: "Academic year" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Academic year" }), "2026-27");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("alert")).toHaveTextContent("academicYear: must look like 2026/27");
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run components/app/class-list components/app/create-class`
Expected: FAIL — imports not found.

- [ ] **Step 3: Write the components**

`components/app/class-list.tsx`:

```tsx
import Link from "next/link";

import type { ClassSummary } from "@/lib/api/schemas";

export function ClassList({ classes }: { classes: ClassSummary[] }) {
  return (
    <section aria-labelledby="teach-heading">
      <h1 id="teach-heading">My classes</h1>
      {classes.length === 0 ? (
        <p>No classes yet. Create one and read its join code out to the class.</p>
      ) : (
        <ul>
          {classes.map((c) => (
            <li key={c.id}>
              <Link href={`/teach/classes/${c.id}`}>
                {c.name} — {c.subjectName}
              </Link>{" "}
              Year {c.yearGroup}, {c.academicYear}
              {c.level ? `, ${c.level.toLowerCase()}` : ""}
              {c.pendingCount > 0 && (
                <> · {c.pendingCount} pending {c.pendingCount === 1 ? "request" : "requests"}</>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link href="/teach/classes/new">Create class</Link>
    </section>
  );
}
```

`components/app/create-class-form.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { classDetailSchema, type Subject } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";

export function CreateClassForm({ schoolId, subjects, defaultAcademicYear }: { schoolId: string; subjects: Subject[]; defaultAcademicYear: string }) {
  const router = useRouter();
  const [subjectCode, setSubjectCode] = useState(subjects[0]?.code ?? "");
  const [name, setName] = useState("");
  const [yearGroup, setYearGroup] = useState("6");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear);
  const [level, setLevel] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.send("POST", "/classes",
        { schoolId, subjectCode, name, yearGroup: Number(yearGroup), academicYear, level: level || null },
        classDetailSchema);
      router.push(`/teach/classes/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="new-class-heading">
      <h1 id="new-class-heading">Create a class</h1>
      {error && (
        <div role="alert">
          <ErrorPanel error={error} />
          {error.fieldErrors.length > 0 && (
            <ul>
              {error.fieldErrors.map((f) => (
                <li key={f.field}>{f.field}: {f.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <label>
        Subject
        <select value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} required>
          {subjects.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
      </label>
      <label>
        Class name
        <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Year group
        <select value={yearGroup} onChange={(e) => setYearGroup(e.target.value)}>
          <option value="5">5th year</option>
          <option value="6">6th year</option>
        </select>
      </label>
      <label>
        Academic year
        <input required value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
      </label>
      <label>
        Level (optional)
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">Not set</option>
          <option value="HIGHER">Higher</option>
          <option value="ORDINARY">Ordinary</option>
          <option value="MIXED">Mixed</option>
        </select>
      </label>
      <Button type="submit" disabled={busy}>Create</Button>
    </form>
  );
}
```

The `ErrorPanel` inside a `role="alert"` wrapper nests two alerts; the outer one is what the spec reads. Acceptable for the plain version; D-2 may restyle it.

- [ ] **Step 4: Write the pages**

`app/(app)/teach/page.tsx`:

```tsx
import { z } from "zod";

import { ClassList } from "@/components/app/class-list";
import { ErrorPanel } from "@/components/app/error-panel";
import { classSummarySchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function TeachPage() {
  const classes = await attempt(() => serverApi.get("/classes", z.array(classSummarySchema)));
  return <main>{classes.ok ? <ClassList classes={classes.data} /> : <ErrorPanel error={classes.error} />}</main>;
}
```

`lib/app/academic-year.ts` (its own file: Next.js forbids extra exports from a page):

```ts
/** "2026/27" for any date from August 2026 to July 2027. */
export function currentAcademicYear(today = new Date()): string {
  const start = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
}
```

`app/(app)/teach/classes/new/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { z } from "zod";

import { CreateClassForm } from "@/components/app/create-class-form";
import { ErrorPanel } from "@/components/app/error-panel";
import { subjectSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { currentAcademicYear } from "@/lib/app/academic-year";
import { attempt } from "@/lib/app/attempt";
import { teacherSchoolId } from "@/lib/app/navigation";
import { requireSession } from "@/lib/app/session";

export default async function NewClassPage() {
  const me = await requireSession();
  const schoolId = teacherSchoolId(me);
  if (!schoolId) notFound();
  const subjects = await attempt(() => serverApi.get("/subjects", z.array(subjectSchema)));
  return (
    <main>
      {subjects.ok ? (
        <CreateClassForm schoolId={schoolId} subjects={subjects.data} defaultAcademicYear={currentAcademicYear()} />
      ) : (
        <ErrorPanel error={subjects.error} />
      )}
    </main>
  );
}
```

`lib/app/academic-year.test.ts` (node:test):

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { currentAcademicYear } from './academic-year.ts';

describe('currentAcademicYear', () => {
  test('rolls over in August', () => {
    assert.equal(currentAcademicYear(new Date(2026, 8, 15)), '2026/27');
    assert.equal(currentAcademicYear(new Date(2027, 6, 31)), '2026/27');
    assert.equal(currentAcademicYear(new Date(2027, 7, 1)), '2027/28');
    assert.equal(currentAcademicYear(new Date(2099, 9, 1)), '2099/00');
  });
});
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npm test`
Expected: node tests +1, specs +4, all green.

- [ ] **Step 6: Run everything, then commit**

```bash
npm run typecheck && npm run lint && cd ..
git add "frontend/app/(app)/teach" frontend/components/app frontend/lib/app
git commit -m "Teachers list and create classes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 8: `/teach/classes/[id]` Students tab

Roadmap §6.2: join code with expiry, pending requests, approved students; Rotate code, Turn joining off, Approve, Decline/remove, Issue reset code (shown once, 24-hour expiry); states: no students, code expired, code off.

**Files:**
- Create: `components/app/class-students.tsx` + spec, `app/(app)/teach/classes/[id]/page.tsx`

- [ ] **Step 1: Write the failing spec**

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ClassDetail } from "@/lib/api/schemas";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { ClassStudents } from "./class-students";

const detail: ClassDetail = {
  id: "c1", name: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology", yearGroup: 6, academicYear: "2026/27", level: "HIGHER",
  joinCode: { code: "ABCDEFGH", expiresAt: "2026-10-15T09:00:00.000Z" },
  enrolments: [
    { enrolmentId: "e1", studentId: "s1", firstName: "Cian", lastName: "Murphy", username: "cian.m", status: "PENDING", requestedAt: "2026-10-01T09:00:00Z" },
    { enrolmentId: "e2", studentId: "s2", firstName: "Aoife", lastName: "Byrne", username: "aoife.b", status: "APPROVED", requestedAt: "2026-09-30T09:00:00Z" },
  ],
};

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("ClassStudents", () => {
  it("shows the code with its expiry, and the two lists", () => {
    render(<ClassStudents detail={detail} />);
    expect(screen.getByRole("heading", { name: "6A Biology" })).toBeInTheDocument();
    expect(screen.getByText("ABCDEFGH")).toBeInTheDocument();
    expect(screen.getByText(/expires/i)).toHaveTextContent("15 Oct 2026");
    const pending = screen.getByRole("region", { name: "Pending requests" });
    expect(within(pending).getByText(/Cian Murphy/)).toBeInTheDocument();
    const approved = screen.getByRole("region", { name: "Students" });
    expect(within(approved).getByText(/Aoife Byrne/)).toBeInTheDocument();
  });

  it("approves and declines pending requests, then refreshes", async () => {
    vi.mocked(api.send).mockResolvedValue({ enrolmentId: "e1", classId: "c1", className: "6A", subjectName: "Biology", schoolName: "S", status: "APPROVED" });
    render(<ClassStudents detail={detail} />);
    const pending = screen.getByRole("region", { name: "Pending requests" });

    await userEvent.click(within(pending).getByRole("button", { name: "Approve Cian Murphy" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/enrolments/e1/approve", undefined, expect.anything());
    expect(refresh).toHaveBeenCalled();

    await userEvent.click(within(pending).getByRole("button", { name: "Decline Cian Murphy" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/enrolments/e1/remove", undefined, expect.anything());
  });

  it("removes an approved student after confirming", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.send).mockResolvedValue({ enrolmentId: "e2", classId: "c1", className: "6A", subjectName: "Biology", schoolName: "S", status: "REMOVED" });
    render(<ClassStudents detail={detail} />);

    await userEvent.click(screen.getByRole("button", { name: "Remove Aoife Byrne" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/enrolments/e2/remove", undefined, expect.anything());
  });

  it("issues a reset code and shows it once with its expiry", async () => {
    vi.mocked(api.send).mockResolvedValue({ code: "RSTCDEXY", expiresAt: "2026-10-02T09:00:00.000Z" });
    render(<ClassStudents detail={detail} />);

    await userEvent.click(screen.getByRole("button", { name: "Issue reset code for Aoife Byrne" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/students/s2/reset-codes", undefined, expect.anything());
    const shown = screen.getByRole("status");
    expect(shown).toHaveTextContent("RSTCDEXY");
    expect(shown).toHaveTextContent(/24 hours|2 Oct 2026/);
  });

  it("rotates the code and turns joining off", async () => {
    vi.mocked(api.send).mockResolvedValue({ code: "NEWCODE2", expiresAt: "2026-10-29T09:00:00.000Z" });
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    render(<ClassStudents detail={detail} />);

    await userEvent.click(screen.getByRole("button", { name: "New code" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/join-code", undefined, expect.anything());
    expect(refresh).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Turn joining off" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/classes/c1/join-code");
  });

  it("explains a class with no code and no students", () => {
    render(<ClassStudents detail={{ ...detail, joinCode: null, enrolments: [] }} />);
    expect(screen.getByText(/joining is off/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New code" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Turn joining off" })).not.toBeInTheDocument();
    expect(screen.getByText(/no students yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run components/app/class-students`
Expected: FAIL — import not found.

- [ ] **Step 3: Write the component and page**

`components/app/class-students.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type ClassDetail, enrolmentViewSchema, joinCodeSchema, type Member, resetCodeIssuedSchema } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Dublin" }).format(new Date(iso));
}

function fullName(m: Member) {
  return `${m.firstName} ${m.lastName}`;
}

export function ClassStudents({ detail }: { detail: ClassDetail }) {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [resetCode, setResetCode] = useState<{ student: string; code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  const base = `/classes/${detail.id}`;
  const pending = detail.enrolments.filter((m) => m.status === "PENDING");
  const approved = detail.enrolments.filter((m) => m.status === "APPROVED");

  return (
    <div>
      <h1>{detail.name}</h1>
      <p>
        {detail.subjectName}, year {detail.yearGroup}, {detail.academicYear}
      </p>
      {error && <ErrorPanel error={error} />}

      <section aria-labelledby="code-heading">
        <h2 id="code-heading">Join code</h2>
        {detail.joinCode ? (
          <p>
            <strong>{detail.joinCode.code}</strong> — expires {formatDate(detail.joinCode.expiresAt)}
          </p>
        ) : (
          <p>Joining is off. Make a new code to let students join.</p>
        )}
        <Button type="button" disabled={busy} onClick={() => run(() => api.send("POST", `${base}/join-code`, undefined, joinCodeSchema))}>
          New code
        </Button>
        {detail.joinCode && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => run(() => api.sendNoContent("DELETE", `${base}/join-code`))}>
            Turn joining off
          </Button>
        )}
      </section>

      <section aria-labelledby="pending-heading">
        <h2 id="pending-heading">Pending requests</h2>
        {pending.length === 0 ? (
          <p>No requests waiting.</p>
        ) : (
          <ul>
            {pending.map((m) => (
              <li key={m.enrolmentId}>
                {fullName(m)} ({m.username})
                <Button type="button" disabled={busy} aria-label={`Approve ${fullName(m)}`}
                  onClick={() => run(() => api.send("POST", `${base}/enrolments/${m.enrolmentId}/approve`, undefined, enrolmentViewSchema))}>
                  Approve
                </Button>
                <Button type="button" variant="outline" disabled={busy} aria-label={`Decline ${fullName(m)}`}
                  onClick={() => run(() => api.send("POST", `${base}/enrolments/${m.enrolmentId}/remove`, undefined, enrolmentViewSchema))}>
                  Decline
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="students-heading">
        <h2 id="students-heading">Students</h2>
        {resetCode && (
          <p role="status">
            Reset code for {resetCode.student}: <strong>{resetCode.code}</strong>. Shown once; valid for 24 hours, until {formatDate(resetCode.expiresAt)}.
          </p>
        )}
        {approved.length === 0 ? (
          <p>No students yet.</p>
        ) : (
          <ul>
            {approved.map((m) => (
              <li key={m.enrolmentId}>
                {fullName(m)} ({m.username})
                <Button type="button" variant="outline" disabled={busy} aria-label={`Issue reset code for ${fullName(m)}`}
                  onClick={() => run(async () => {
                    const issued = await api.send("POST", `${base}/students/${m.studentId}/reset-codes`, undefined, resetCodeIssuedSchema);
                    setResetCode({ student: fullName(m), ...issued });
                  })}>
                  Issue reset code
                </Button>
                <Button type="button" variant="outline" disabled={busy} aria-label={`Remove ${fullName(m)}`}
                  onClick={() => {
                    if (window.confirm(`Remove ${fullName(m)} from ${detail.name}?`)) {
                      run(() => api.send("POST", `${base}/enrolments/${m.enrolmentId}/remove`, undefined, enrolmentViewSchema));
                    }
                  }}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

The `<section aria-labelledby>` elements are what the spec finds as `region`s named "Pending requests" and "Students". The reset code lives in component state, so a refresh (which re-renders the server page) keeps it visible until navigation: shown once, as the roadmap says.

`app/(app)/teach/classes/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { ClassStudents } from "@/components/app/class-students";
import { ErrorPanel } from "@/components/app/error-panel";
import { classDetailSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await attempt(() => serverApi.get(`/classes/${encodeURIComponent(id)}`, classDetailSchema));
  if (!detail.ok && detail.error.code === "NOT_FOUND") notFound();
  return <main>{detail.ok ? <ClassStudents detail={detail.data} /> : <ErrorPanel error={detail.error} />}</main>;
}
```

- [ ] **Step 4: Run the spec and watch it pass**

Run: `npx vitest run components/app/class-students`
Expected: 6 tests, 0 failures.

- [ ] **Step 5: Run everything, then commit**

```bash
npm test && npm run typecheck && npm run lint && cd ..
git add "frontend/app/(app)/teach" frontend/components/app/class-students.tsx frontend/components/app/class-students.spec.tsx
git commit -m "Teachers manage a class: code, approvals, removals and reset codes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 9: `/reset`

Roadmap §6.2: username, reset code from teacher, new password; code wrong or expired (one message); too many attempts. P-5: success sends to `/login`.

**Files:**
- Create: `components/app/reset-form.tsx` + spec, `app/(auth)/reset/page.tsx`

- [ ] **Step 1: Write the failing spec**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/problem";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { ResetForm } from "./reset-form";

async function fill(code = "abcd-efgh") {
  await userEvent.type(screen.getByRole("textbox", { name: "Username" }), "aoife.b");
  await userEvent.type(screen.getByRole("textbox", { name: "Reset code" }), code);
  await userEvent.type(screen.getByLabelText("New password"), "a-fresh-start-2026");
  await userEvent.click(screen.getByRole("button", { name: "Set new password" }));
}

beforeEach(() => {
  push.mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("ResetForm", () => {
  it("sends the code as typed, then goes to sign in", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    render(<ResetForm />);

    await fill();

    expect(api.sendNoContent).toHaveBeenCalledWith("POST", "/auth/password-reset", { username: "aoife.b", code: "abcd-efgh", newPassword: "a-fresh-start-2026" });
    expect(screen.getByRole("status")).toHaveTextContent("Password set");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("shows one message for a wrong or expired code", async () => {
    vi.mocked(api.sendNoContent).mockRejectedValue(new ApiError({ code: "RESET_CODE_INVALID", status: 400, detail: "That code isn't right, or it has expired. Ask your teacher for a new one." }));
    render(<ResetForm />);

    await fill();

    expect(screen.getByRole("alert")).toHaveTextContent("isn't right, or it has expired");
  });

  it("shows the throttle message", async () => {
    vi.mocked(api.sendNoContent).mockRejectedValue(new ApiError({ code: "TOO_MANY_ATTEMPTS", status: 429, detail: "Too many attempts. Try again in 15 minutes." }));
    render(<ResetForm />);

    await fill();

    expect(screen.getByRole("alert")).toHaveTextContent("15 minutes");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run components/app/reset-form`
Expected: FAIL — import not found.

- [ ] **Step 3: Write the form and page**

`components/app/reset-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";

import { ErrorPanel } from "./error-panel";

export function ResetForm() {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.sendNoContent("POST", "/auth/password-reset", { username, code, newPassword });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div>
        <p role="status">Password set. Sign in with your new password.</p>
        <Link href="/login">Sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} aria-labelledby="reset-heading">
      <h1 id="reset-heading">Reset your password</h1>
      <p>Your teacher can give you a reset code. It works once and lasts 24 hours.</p>
      {error && <ErrorPanel error={error} />}
      <label>
        Username
        <input name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" required
          value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label>
        Reset code
        <input name="code" autoCapitalize="characters" autoCorrect="off" autoComplete="one-time-code" required
          value={code} onChange={(e) => setCode(e.target.value)} />
      </label>
      <label>
        New password
        <input name="newPassword" type="password" autoComplete="new-password" required
          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </label>
      <Button type="submit" disabled={busy}>Set new password</Button>
    </form>
  );
}
```

`app/(auth)/reset/page.tsx`:

```tsx
import { ResetForm } from "@/components/app/reset-form";

export default function ResetPage() {
  return (
    <main>
      <ResetForm />
    </main>
  );
}
```

- [ ] **Step 4: Run the spec and watch it pass**

Run: `npx vitest run components/app/reset-form`
Expected: 3 tests, 0 failures.

- [ ] **Step 5: Run everything, then commit**

```bash
npm test && npm run typecheck && npm run lint && cd ..
git add "frontend/app/(auth)/reset" frontend/components/app/reset-form.tsx frontend/components/app/reset-form.spec.tsx
git commit -m "Students reset a password with a teacher's code

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 10: Playwright harness and the Phase 1 journey

Roadmap §4.1 (e2e layer), §8.1 Gate P1 (journey, keyboard-only, axe scan). `make e2e` already points at `scripts/e2e.sh`.

**Files:**
- Modify: `package.json`, `.gitignore` (frontend)
- Create: `playwright.config.ts`, `e2e/phase1.e2e.ts`, `scripts/e2e.sh` (repo root)

- [ ] **Step 1: Install**

```bash
cd frontend
npm install -D @playwright/test@^1.58.0 @axe-core/playwright@^4.11.0
npx playwright install chromium
```

Add scripts to `package.json`:

```json
    "test:e2e": "playwright test"
```

Append to `frontend/.gitignore`:

```gitignore
/test-results/
/playwright-report/
```

- [ ] **Step 2: Write the config**

`frontend/playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against a Next.js server that scripts/e2e.sh has already started on :3100, itself pointed
 * at a Spring backend on :8081 and the throwaway postgres-e2e database. Nothing here starts servers.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "laptop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
});
```

- [ ] **Step 3: Write the harness script**

`scripts/e2e.sh` (repo root):

```bash
#!/usr/bin/env bash
# Starts a throwaway database and a fresh backend and frontend on unusual ports, seeds one teacher
# with the operator CLI, runs the Playwright journey, and tears everything down.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

E2E_DB_URL="jdbc:postgresql://localhost:55433/coursework_e2e"
BACKEND_PORT=8081
FRONTEND_PORT=3100
PROXY_SECRET="e2e-proxy-secret"
LOG_DIR="frontend/test-results"
mkdir -p "$LOG_DIR"

cleanup() {
  echo "e2e: tearing down"
  [ -n "${NEXT_PID:-}" ] && kill "$NEXT_PID" 2>/dev/null || true
  [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null || true
  docker compose --profile e2e down postgres-e2e -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "e2e: database"
docker compose --profile e2e up -d postgres-e2e
until [ "$(docker inspect -f '{{.State.Health.Status}}' coursework-postgres-e2e 2>/dev/null)" = "healthy" ]; do sleep 1; done

echo "e2e: backend jar"
(cd backend && ./mvnw --quiet -DskipTests package)
JAR="$(ls backend/target/coursework-backend-*.jar | head -1)"

echo "e2e: seed teacher"
TEMP_PASSWORD="$(java -jar "$JAR" operator create-user --first-name=E2E --last-name=Teacher --username=e2e.teacher \
  --spring.datasource.url="$E2E_DB_URL" --spring.datasource.username=coursework --spring.datasource.password=coursework 2>/dev/null \
  | sed -n 's/.*Temporary password (shown once): //p')"
java -jar "$JAR" operator create-school --name="E2E School" --roll=99999E \
  --spring.datasource.url="$E2E_DB_URL" --spring.datasource.username=coursework --spring.datasource.password=coursework >/dev/null 2>&1
java -jar "$JAR" operator grant-role --username=e2e.teacher --roll=99999E --role=TEACHER \
  --spring.datasource.url="$E2E_DB_URL" --spring.datasource.username=coursework --spring.datasource.password=coursework >/dev/null 2>&1
[ -n "$TEMP_PASSWORD" ] || { echo "e2e: no temporary password captured"; exit 1; }

echo "e2e: backend on :$BACKEND_PORT"
DATABASE_URL="$E2E_DB_URL" DATABASE_USERNAME=coursework DATABASE_PASSWORD=coursework \
  SERVER_PORT=$BACKEND_PORT APP_COOKIE_SECURE=false PROXY_SHARED_SECRET="$PROXY_SECRET" \
  java -jar "$JAR" > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
until curl -sf "http://127.0.0.1:$BACKEND_PORT/actuator/health" >/dev/null; do sleep 1; done

echo "e2e: frontend on :$FRONTEND_PORT"
(cd frontend && APP_ENABLED=true BACKEND_INTERNAL_URL="http://127.0.0.1:$BACKEND_PORT" PROXY_SHARED_SECRET="$PROXY_SECRET" \
  npm run build >"../$LOG_DIR/next-build.log" 2>&1)
(cd frontend && APP_ENABLED=true BACKEND_INTERNAL_URL="http://127.0.0.1:$BACKEND_PORT" PROXY_SHARED_SECRET="$PROXY_SECRET" \
  npx next start -p $FRONTEND_PORT >"../$LOG_DIR/next.log" 2>&1) &
NEXT_PID=$!
until curl -sf "http://localhost:$FRONTEND_PORT/login" >/dev/null; do sleep 1; done

echo "e2e: playwright"
(cd frontend && E2E_TEACHER_PASSWORD="$TEMP_PASSWORD" npm run test:e2e)
```

```bash
chmod +x scripts/e2e.sh
```

The build reads `APP_ENABLED` at build time for prerendered routes, which is why it's set on the build as well as the start.

- [ ] **Step 4: Write the journey**

`frontend/e2e/phase1.e2e.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page, test } from "@playwright/test";

/**
 * Gate P1's journey (roadmap §8.1): operator seeded a teacher (scripts/e2e.sh); the teacher signs in,
 * changes password, creates a class; a phone joins with the code and creates an account; the
 * teacher approves; the phone sees it; the teacher issues a reset code; the phone resets and signs
 * in. Every page visited gets an axe scan with no WCAG 2.2 AA violations.
 */
const TEACHER = { username: "e2e.teacher", temporary: process.env.E2E_TEACHER_PASSWORD ?? "", password: "e2e-teacher-password" };
const STUDENT = { username: `e2e.student.${Date.now().toString(36)}`, password: "e2e-student-password", reset: "e2e-student-password-2" };

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

async function phone(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true });
  return context.newPage();
}

test.describe.configure({ mode: "serial" });

test("the Phase 1 journey", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set; run through scripts/e2e.sh");
  const teacherPasswordNow = TEACHER.temporary;

  // Signed out → login with next.
  await teacher.goto("/teach");
  await expect(teacher).toHaveURL(/\/login\?next=%2Fteach/);
  await expectAccessible(teacher);

  // Teacher signs in with the temporary password and is forced to change it.
  await teacher.getByRole("textbox", { name: "Username" }).fill(TEACHER.username);
  await teacher.getByLabel("Password").fill(teacherPasswordNow);
  await teacher.getByRole("button", { name: "Sign in" }).click();
  await expect(teacher).toHaveURL(/\/account\/password/);
  await expectAccessible(teacher);
  await teacher.getByLabel("Current password").fill(teacherPasswordNow);
  await teacher.getByLabel("New password", { exact: true }).fill(TEACHER.password);
  await teacher.getByLabel("Confirm new password").fill(TEACHER.password);
  await teacher.getByRole("button", { name: "Change password" }).click();
  await expect(teacher).toHaveURL(/\/teach$/);
  await expectAccessible(teacher);

  // Creates a class and reads the code.
  await teacher.getByRole("link", { name: "Create class" }).click();
  await expectAccessible(teacher);
  await teacher.getByRole("textbox", { name: "Class name" }).fill("6A Biology");
  await teacher.getByRole("button", { name: "Create" }).click();
  await expect(teacher).toHaveURL(/\/teach\/classes\//);
  await expectAccessible(teacher);
  const code = (await teacher.getByRole("region", { name: "Join code" }).locator("strong").textContent())?.trim() ?? "";
  expect(code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
  const classUrl = teacher.url();

  // A phone joins with the code and creates an account.
  const student = await phone(browser);
  await student.goto("/join");
  await expectAccessible(student);
  await student.getByRole("textbox", { name: "Join code" }).fill(code.toLowerCase());
  await student.getByRole("button", { name: "Continue" }).click();
  await expect(student.getByRole("heading", { name: "Join 6A Biology" })).toBeVisible();
  await expectAccessible(student);
  await student.getByRole("textbox", { name: "First name" }).fill("Aoife");
  await student.getByRole("textbox", { name: "Surname" }).fill("Byrne");
  await student.getByRole("textbox", { name: "Username" }).fill(STUDENT.username);
  await student.getByLabel("Password").fill(STUDENT.password);
  await student.getByRole("button", { name: "Create account and join" }).click();
  await expect(student).toHaveURL(/\/home$/);
  await expect(student.getByRole("listitem")).toContainText("Pending approval");
  await expectAccessible(student);

  // The teacher approves.
  await teacher.goto(classUrl);
  await teacher.getByRole("button", { name: "Approve Aoife Byrne" }).click();
  await expect(teacher.getByRole("region", { name: "Students" })).toContainText("Aoife Byrne");

  // The phone sees it.
  await student.reload();
  await expect(student.getByRole("listitem")).toContainText("Approved");

  // The teacher issues a reset code.
  await teacher.getByRole("button", { name: "Issue reset code for Aoife Byrne" }).click();
  const resetCode = (await teacher.getByRole("status").locator("strong").textContent())?.trim() ?? "";
  expect(resetCode).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);

  // The phone signs out, resets, and signs back in.
  await student.getByRole("button", { name: "Sign out" }).click();
  await expect(student).toHaveURL(/\/login/);
  await student.goto("/reset");
  await expectAccessible(student);
  await student.getByRole("textbox", { name: "Username" }).fill(STUDENT.username);
  await student.getByRole("textbox", { name: "Reset code" }).fill(resetCode);
  await student.getByLabel("New password").fill(STUDENT.reset);
  await student.getByRole("button", { name: "Set new password" }).click();
  await student.getByRole("link", { name: "Sign in" }).click();
  await student.getByRole("textbox", { name: "Username" }).fill(STUDENT.username);
  await student.getByLabel("Password").fill(STUDENT.reset);
  await student.getByRole("button", { name: "Sign in" }).click();
  await expect(student).toHaveURL(/\/home$/);
  await expect(student.getByRole("listitem")).toContainText("Approved");
});

test("keyboard-only sign in", async ({ page }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await page.goto("/login");
  await page.keyboard.press("Tab");
  await page.keyboard.type(TEACHER.username);
  await page.keyboard.press("Tab");
  await page.keyboard.type(TEACHER.password);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/teach$/);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});
```

The second test relies on the first having changed the teacher's password (serial mode). Both projects (laptop, phone) run the file; the student username carries a timestamp so the second project's sign-up doesn't collide.

- [ ] **Step 5: Run it**

```bash
cd .. && make e2e
```

Expected: both tests pass in both projects; `frontend/playwright-report/` has the HTML report. If axe reports violations, fix the page (a missing label, a heading order, a contrast issue in the placeholder styling) rather than relaxing the tags.

If `getByLabel("New password", { exact: true })` still matches two fields, the confirm label contains the words "New password"; the `exact` option compares the whole accessible name, so this is a copy mismatch: check the label text in `change-password-form.tsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/playwright.config.ts frontend/e2e frontend/.gitignore scripts/e2e.sh
git commit -m "Run the Phase 1 journey end to end with an accessibility scan

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 11: Restyle from design packs D-1 and D-2

Roadmap §6.3. **Do not start this task until `docs/design/pilot/` holds the handoff folders for the app shell and auth pages (D-1) and the teacher class pages (D-2).** If they haven't arrived, stop here and record it in `docs/HANDOFF.md`; the milestone can still go to Gate P1 review with the plain pages.

**Files:**
- Modify: every component in `components/app/` and page in `app/(app)`, `app/(auth)` that the packs cover
- Do not modify: any `*.spec.tsx` (except in a separate, visible commit if the design renames a control)

- [ ] **Step 1: Read the packs**

Read `docs/design/UI-STANDARDS.md` first (§15 is this task's method). Then, for each of `docs/design/pilot/<pack>/`: the Claude Design export, `tokens.css` and `NOTES.md`. Anything in `NOTES.md` that changes behaviour (a new state, a removed action, something moved to another page) is a roadmap change: update `docs/PILOT-ROADMAP.md` §6.2 first, and stop to ask if it conflicts with a decision in this plan.

- [ ] **Step 2: Establish the app's visual system**

The first pack defines tokens, type and components for the app (roadmap §6.3 point 5). Add them to `app/globals.css` under a new `@theme` block or as `--app-*` variables beside the `--bipi-*` ones, never by changing the BiPi values (the live schedule uses them).

- [ ] **Step 3: Restyle one page at a time, specs unchanged**

For each page: apply the design to the rules in `docs/design/UI-STANDARDS.md` (the `shadcn` skill for adding primitives), run `docs/design/UI-CHECKLIST.md` on it, then `npx vitest run components/app`. A red spec means the accessible names changed. If the design genuinely renames a control ("Approve" → "Accept"), change the spec in its own commit first, with the message naming the design pack, then restyle.

- [ ] **Step 4: Run everything**

```bash
make verify && make e2e
```

- [ ] **Step 5: Commit per page**

```bash
git commit -m "Restyle /login from design pack D-1

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 12: Gate P1

- [ ] **Step 1: Run every check**

```bash
make verify && make e2e
```

- [ ] **Step 2: Walk the gate** (roadmap §8.1)

- [ ] `make verify` and `make e2e` green
- [ ] On Vercel Preview against the EU backend, by hand: operator creates a school and teacher (Render shell, `operator …`) → teacher signs in, changes password, creates a class → a phone opens `/join`, enters the code, creates an account → teacher approves → phone shows the class as approved → teacher issues a reset code → phone resets its password and signs in
- [ ] Keyboard-only run of the same journey on a laptop; the axe scan in `phase1.e2e.ts` reported no WCAG 2.2 AA failures
- [ ] Tim has reviewed the pages (design restyle can still be pending)

- [ ] **Step 3: Update the docs**

- Root `CLAUDE.md`, frontend conventions: "App pages: server component loads with `serverApi` inside `attempt()` and renders `ErrorPanel` on failure; interactive parts are client components in `components/app/` that call `api` and then `router.refresh()`. `lib/app/session.ts` is the only place that reads `/auth/me` on the server. `middleware.ts` only checks the cookie exists."
- `docs/PILOT-ROADMAP.md` §1: 1D done; Phase 1 gate P1 status. §2: add P-4 to P-7 as decisions if Tim confirmed them.
- `docs/HANDOFF.md`: Phase 1 complete; how long 1D took; the Phase 2 preconditions from roadmap §8.2 ("before the plan is written": the four final 2027 briefs and the Coursework Rules and Procedures in `subjectDocs/`; design packs D-3, D-4, D-5 requested). **The 2A plan doesn't exist yet and can't be written until those documents are in the repo.**

- [ ] **Step 4: Commit and open the PR**

```bash
git add docs CLAUDE.md
git commit -m "Record Gate P1

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin pilot/1d-app-shell-and-first-journey
```

Open the PR from the GitHub compare page, titled "Pilot 1D: app shell and first journey", body:

```
Sign-in, forced password change, joining by code, the student's class list, the teacher's class pages with approvals and reset codes, and a Playwright run of the whole Phase 1 journey with an axe scan on every page.

Gate P1 (docs/PILOT-ROADMAP.md §8.1) results in docs/HANDOFF.md. Restyle from D-1/D-2 is [done | pending the design packs].

App routes stay behind APP_ENABLED, so merging this doesn't change the live site.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**Don't merge.** Tim reviews and merges.
