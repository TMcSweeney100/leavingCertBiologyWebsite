import { headers } from "next/headers";

import { type ApiClient, createApiClient } from "./client";

/**
 * For server components. Calls Spring directly and forwards the viewer's own raw `cookie` header,
 * so the request carries their session.
 *
 * Read-only by design: it has no `send`. Mutations happen in client components through the proxy,
 * because that's where the CSRF token is (root CLAUDE.md).
 */
const client = createApiClient({
  baseUrl: () => process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8080",
  extraHeaders: async (): Promise<Record<string, string>> => {
    const cookie = (await headers()).get("cookie");
    return cookie ? { cookie } : {};
  },
  csrf: false,
});

export const serverApi: Pick<ApiClient, "get"> = { get: client.get };
