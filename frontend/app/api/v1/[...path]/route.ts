import { type NextRequest, NextResponse } from "next/server";

import { isAppEnabled } from "@/lib/app/routes";

/**
 * Same-origin proxy to the Spring Boot API (design §5.1).
 *
 * The browser never learns where the API lives and never makes a cross-origin call, so there's no
 * CORS to configure and the session cookie is first-party. Headers cross on an allowlist: the
 * session cookie and CSRF token in, every Set-Cookie out. Problem details pass through untouched,
 * so the user sees Spring's explanation rather than this file's opinion.
 */
export const dynamic = "force-dynamic";

const FORWARDED_REQUEST_HEADERS = ["accept", "content-type", "cookie", "x-xsrf-token"] as const;

function problem(status: number, code: string, title: string, detail: string) {
  return NextResponse.json(
    {
      type: `urn:coursework:problem:${code.toLowerCase().replaceAll("_", "-")}`,
      title,
      status,
      detail,
      code,
      fieldErrors: [],
    },
    { status, headers: { "content-type": "application/problem+json", "cache-control": "no-store" } },
  );
}

/**
 * The client's own address. On Vercel the first `x-forwarded-for` entry is the client. Spring
 * trusts what arrives only alongside the shared secret (roadmap R8), because this header is
 * trivially forgeable by anyone calling the API directly.
 */
function clientAddress(request: NextRequest): string | undefined {
  const first = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || undefined;
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!isAppEnabled()) {
    return problem(404, "NOT_FOUND", "Not found", "No such resource.");
  }

  const { path } = await context.params;
  const backend = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8080";
  const target = `${backend}/api/v1/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const address = clientAddress(request);
  if (address) headers.set("x-forwarded-for", address);
  const secret = process.env.PROXY_SHARED_SECRET;
  if (secret) headers.set("x-proxy-secret", secret);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      // Bytes, not text: re-encoding a body as a string can corrupt anything that isn't UTF-8.
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return problem(502, "BACKEND_UNREACHABLE", "The service could not be reached", "Please try again in a moment.");
  }

  const responseHeaders = new Headers({ "cache-control": "no-store" });
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new NextResponse(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
