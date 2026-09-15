import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ApiError, ApiErrorCode, createApiClient, readCsrfCookie } from "./client";

const meSchema = z.object({ userId: z.string(), username: z.string() });

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function problem(code: string, status: number) {
  return new Response(JSON.stringify({ code, status, detail: code }), {
    status,
    headers: { "content-type": "application/problem+json" },
  });
}

function clearCsrfCookie() {
  document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

const browser = () => createApiClient({ baseUrl: () => "", extraHeaders: async () => ({}), csrf: true });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  clearCsrfCookie();
});

afterEach(clearCsrfCookie);

describe("get", () => {
  it("returns the validated body from the same-origin API path", async () => {
    fetchMock.mockResolvedValue(json({ userId: "u1", username: "aoife.b" }));

    await expect(browser().get("/auth/me", meSchema)).resolves.toEqual({ userId: "u1", username: "aoife.b" });
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/v1/auth/me");
    expect((fetchMock.mock.calls[0][1] as RequestInit).cache).toBe("no-store");
  });

  it("turns a problem response into an ApiError carrying its code", async () => {
    fetchMock.mockResolvedValue(problem("UNAUTHENTICATED", 401));

    const error = await browser().get("/auth/me", meSchema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("UNAUTHENTICATED");
    expect((error as ApiError).status).toBe(401);
  });

  it("rejects a body that doesn't match the schema", async () => {
    fetchMock.mockResolvedValue(json({ userId: "u1" }));

    const error = await browser().get("/auth/me", meSchema).catch((e: unknown) => e);
    expect((error as ApiError).code).toBe(ApiErrorCode.RESPONSE_SHAPE_UNEXPECTED);
  });

  it("reports an unreachable network as one error code", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await browser().get("/auth/me", meSchema).catch((e: unknown) => e);
    expect((error as ApiError).code).toBe(ApiErrorCode.BACKEND_UNREACHABLE);
  });

  it("sends no CSRF header on a GET", async () => {
    document.cookie = "XSRF-TOKEN=tok; path=/";
    fetchMock.mockResolvedValue(json({ userId: "u1", username: "a" }));

    await browser().get("/auth/me", meSchema);
    expect(new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).has("x-xsrf-token")).toBe(false);
  });
});

describe("send", () => {
  it("sends JSON with the CSRF token from the cookie", async () => {
    document.cookie = "XSRF-TOKEN=tok%3D1; path=/";
    fetchMock.mockResolvedValue(json({ userId: "u1", username: "aoife.b" }));

    await browser().send("POST", "/auth/login", { username: "aoife.b", password: "x" }, meSchema);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(init.method).toBe("POST");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-xsrf-token")).toBe("tok=1");
    expect(init.body).toBe('{"username":"aoife.b","password":"x"}');
  });

  it("fetches a CSRF token first when there's no cookie", async () => {
    fetchMock.mockImplementation(async (input) => {
      if (String(input) === "/api/v1/auth/csrf") {
        document.cookie = "XSRF-TOKEN=fresh; path=/";
        return new Response(null, { status: 204 });
      }
      return json({ userId: "u1", username: "a" });
    });

    await browser().send("POST", "/auth/login", {}, meSchema);

    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual(["/api/v1/auth/csrf", "/api/v1/auth/login"]);
    expect(new Headers((fetchMock.mock.calls[1][1] as RequestInit).headers).get("x-xsrf-token")).toBe("fresh");
  });

  it("refreshes a stale token and retries once", async () => {
    document.cookie = "XSRF-TOKEN=stale; path=/";
    let loginAttempts = 0;
    fetchMock.mockImplementation(async (input) => {
      if (String(input) === "/api/v1/auth/csrf") {
        document.cookie = "XSRF-TOKEN=fresh; path=/";
        return new Response(null, { status: 204 });
      }
      loginAttempts += 1;
      return loginAttempts === 1 ? problem("CSRF_TOKEN_INVALID", 403) : json({ userId: "u1", username: "a" });
    });

    await expect(browser().send("POST", "/auth/login", {}, meSchema)).resolves.toMatchObject({ userId: "u1" });
    expect(loginAttempts).toBe(2);
  });

  it("gives up after one retry", async () => {
    document.cookie = "XSRF-TOKEN=stale; path=/";
    fetchMock.mockImplementation(async (input) =>
      String(input) === "/api/v1/auth/csrf" ? new Response(null, { status: 204 }) : problem("CSRF_TOKEN_INVALID", 403),
    );

    const error = await browser().send("POST", "/auth/login", {}, meSchema).catch((e: unknown) => e);
    expect((error as ApiError).code).toBe("CSRF_TOKEN_INVALID");
    expect(fetchMock.mock.calls.filter((call) => String(call[0]) === "/api/v1/auth/login")).toHaveLength(2);
  });
});

describe("sendNoContent", () => {
  it("resolves to nothing on a 204", async () => {
    document.cookie = "XSRF-TOKEN=tok; path=/";
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(browser().sendNoContent("POST", "/auth/logout")).resolves.toBeUndefined();
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBeUndefined();
  });
});

describe("readCsrfCookie", () => {
  it("finds and decodes the token among other cookies", () => {
    expect(readCsrfCookie("a=1; XSRF-TOKEN=ab%3D%3D; b=2")).toBe("ab==");
    expect(readCsrfCookie("a=1")).toBeUndefined();
  });
});
