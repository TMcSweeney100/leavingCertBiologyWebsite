// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, POST } from "./route";

/**
 * Component specs mock the API client, so a proxy that mangled a cookie would leave all of them
 * green. These pin what crosses the proxy in each direction.
 */
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("APP_ENABLED", "true");
  vi.stubEnv("BACKEND_INTERNAL_URL", "http://backend.test");
  vi.stubEnv("PROXY_SHARED_SECRET", "s3cret");
});

function context(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

function forwarded() {
  const [url, init] = fetchMock.mock.calls[0];
  const requestInit = init as RequestInit;
  return { url: String(url), init: requestInit, headers: new Headers(requestInit.headers) };
}

describe("the proxy", () => {
  it("is a 404 while the app is switched off, and never reaches the backend", async () => {
    vi.stubEnv("APP_ENABLED", "");
    const response = await GET(new NextRequest("http://localhost/api/v1/health"), context(["health"]));
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards method, path and query to the backend", async () => {
    await GET(new NextRequest("http://localhost/api/v1/classes/abc?view=full"), context(["classes", "abc"]));
    expect(forwarded().url).toBe("http://backend.test/api/v1/classes/abc?view=full");
    expect(forwarded().init.method).toBe("GET");
  });

  it("encodes each path segment", async () => {
    await GET(new NextRequest("http://localhost/api/v1/join/x"), context(["join", "A B/C"]));
    expect(forwarded().url).toBe("http://backend.test/api/v1/join/A%20B%2FC");
  });

  it("forwards the session cookie and CSRF header, and drops other browser headers", async () => {
    const request = new NextRequest("http://localhost/api/v1/auth/me", {
      headers: {
        cookie: "SESSION=abc; XSRF-TOKEN=def",
        "x-xsrf-token": "def",
        authorization: "Bearer stolen",
        "x-proxy-secret": "forged",
      },
    });
    await GET(request, context(["auth", "me"]));

    const { headers } = forwarded();
    expect(headers.get("cookie")).toBe("SESSION=abc; XSRF-TOKEN=def");
    expect(headers.get("x-xsrf-token")).toBe("def");
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("x-proxy-secret")).toBe("s3cret");
  });

  it("sends only the first forwarded address, which is the client's", async () => {
    const request = new NextRequest("http://localhost/api/v1/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    await GET(request, context(["auth", "login"]));
    expect(forwarded().headers.get("x-forwarded-for")).toBe("203.0.113.7");
  });

  it("sends no secret header when none is configured", async () => {
    vi.stubEnv("PROXY_SHARED_SECRET", "");
    await GET(new NextRequest("http://localhost/api/v1/health"), context(["health"]));
    expect(forwarded().headers.has("x-proxy-secret")).toBe(false);
  });

  it("forwards a JSON body byte for byte, with its content type", async () => {
    const request = new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"username":"aoife.b","password":"correct horse"}',
    });
    await POST(request, context(["auth", "login"]));

    const { init, headers } = forwarded();
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe(
      '{"username":"aoife.b","password":"correct horse"}',
    );
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("passes every Set-Cookie back to the browser", async () => {
    const backendHeaders = new Headers({ "content-type": "application/json" });
    backendHeaders.append("set-cookie", "SESSION=new; Path=/; HttpOnly; SameSite=Lax");
    backendHeaders.append("set-cookie", "XSRF-TOKEN=tok; Path=/");
    fetchMock.mockResolvedValue(new Response("{}", { status: 200, headers: backendHeaders }));

    const response = await POST(
      new NextRequest("http://localhost/api/v1/auth/login", { method: "POST", body: "{}" }),
      context(["auth", "login"]),
    );

    expect(response.headers.getSetCookie()).toEqual([
      "SESSION=new; Path=/; HttpOnly; SameSite=Lax",
      "XSRF-TOKEN=tok; Path=/",
    ]);
  });

  it("passes a problem response through untouched", async () => {
    const problem = '{"code":"USERNAME_TAKEN","status":409,"detail":"That username is taken."}';
    fetchMock.mockResolvedValue(
      new Response(problem, { status: 409, headers: { "content-type": "application/problem+json" } }),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/v1/join/ABCD2345/accounts", { method: "POST", body: "{}" }),
      context(["join", "ABCD2345", "accounts"]),
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(await response.text()).toBe(problem);
  });

  it("passes a 204 through with no body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const response = await DELETE(
      new NextRequest("http://localhost/api/v1/classes/abc/join-code", { method: "DELETE" }),
      context(["classes", "abc", "join-code"]),
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("never follows a backend redirect", async () => {
    await GET(new NextRequest("http://localhost/api/v1/health"), context(["health"]));
    expect(forwarded().init.redirect).toBe("manual");
  });

  it("is never cached", async () => {
    const response = await GET(new NextRequest("http://localhost/api/v1/health"), context(["health"]));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers with its own problem when the backend is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const response = await GET(new NextRequest("http://localhost/api/v1/health"), context(["health"]));

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(await response.json()).toMatchObject({ code: "BACKEND_UNREACHABLE", status: 502 });
  });
});
