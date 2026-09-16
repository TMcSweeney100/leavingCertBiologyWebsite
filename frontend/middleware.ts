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
