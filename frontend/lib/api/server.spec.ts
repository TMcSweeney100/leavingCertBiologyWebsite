// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: "SESSION=abc123==; XSRF-TOKEN=t" }),
}));

import { serverApi } from "./server";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response('{"status":"UP"}', { status: 200, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("BACKEND_INTERNAL_URL", "http://backend.test");
});

describe("serverApi", () => {
  it("calls Spring directly and forwards the viewer's raw cookie header", async () => {
    await serverApi.get("/health", z.object({ status: z.string() }));

    expect(String(fetchMock.mock.calls[0][0])).toBe("http://backend.test/api/v1/health");
    // Raw, not re-serialised: re-encoding would turn a base64 session id's "=" into "%3D".
    expect(new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).get("cookie")).toBe(
      "SESSION=abc123==; XSRF-TOKEN=t",
    );
  });

  it("offers no way to mutate", () => {
    expect(Object.keys(serverApi)).toEqual(["get"]);
  });
});
