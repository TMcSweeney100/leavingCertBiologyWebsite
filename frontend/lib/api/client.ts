import type { ZodType } from "zod";

import { ApiError, ApiErrorCode } from "./problem";

export { ApiError, ApiErrorCode } from "./problem";
export type { FieldProblem } from "./problem";

const API_PREFIX = "/api/v1";
const CSRF_COOKIE = "XSRF-TOKEN";

export type Mutation = "POST" | "PUT" | "PATCH" | "DELETE";

/** Where requests go and what they carry. The browser and server clients differ only here. */
export interface ApiTransport {
  baseUrl(): string;
  extraHeaders(): Promise<Record<string, string>>;
  /** Whether to send Spring's CSRF token. Only the browser has one. */
  csrf: boolean;
}

export interface ApiClient {
  get<T>(path: string, schema: ZodType<T>, init?: { signal?: AbortSignal }): Promise<T>;
  send<T>(method: Mutation, path: string, body: unknown, schema: ZodType<T>): Promise<T>;
  sendNoContent(method: Mutation, path: string, body?: unknown): Promise<void>;
}

/** The CSRF token from a `document.cookie`-style string, decoded. */
export function readCsrfCookie(cookies: string): string | undefined {
  for (const part of cookies.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === CSRF_COOKIE) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export function createApiClient(transport: ApiTransport): ApiClient {
  async function call(
    method: string,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<Response> {
    // Outside the try: on the server these come from Next's headers(), which throws a bailout
    // signal during a static build to mark the route dynamic. That must propagate as itself.
    const transportHeaders = await transport.extraHeaders();
    let response: Response;
    try {
      response = await fetch(`${transport.baseUrl()}${API_PREFIX}${path}`, {
        method,
        headers: {
          accept: "application/json",
          ...transportHeaders,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal,
      });
    } catch (cause) {
      throw ApiError.unreachable(cause);
    }
    if (!response.ok) {
      throw ApiError.fromResponseBody(response.status, await readJson(response));
    }
    return response;
  }

  async function csrfHeader(refresh: boolean): Promise<Record<string, string>> {
    if (!transport.csrf) return {};
    let token = refresh ? undefined : readCsrfCookie(document.cookie);
    if (!token) {
      await call("GET", "/auth/csrf", undefined, {});
      token = readCsrfCookie(document.cookie);
    }
    return token ? { "x-xsrf-token": token } : {};
  }

  async function mutate(method: Mutation, path: string, body: unknown): Promise<Response> {
    try {
      return await call(method, path, body, await csrfHeader(false));
    } catch (error) {
      // A token can go stale (cookie cleared, server restarted with a new key). One refresh and
      // retry covers that; a second failure is real and surfaces.
      if (transport.csrf && error instanceof ApiError && error.code === ApiErrorCode.CSRF_TOKEN_INVALID) {
        return call(method, path, body, await csrfHeader(true));
      }
      throw error;
    }
  }

  async function parse<T>(response: Response, schema: ZodType<T>, path: string): Promise<T> {
    const parsed = schema.safeParse(await readJson(response));
    if (!parsed.success) throw ApiError.badShape(path, parsed.error);
    return parsed.data;
  }

  return {
    async get<T>(path: string, schema: ZodType<T>, init?: { signal?: AbortSignal }): Promise<T> {
      return parse(await call("GET", path, undefined, {}, init?.signal), schema, path);
    },
    async send<T>(method: Mutation, path: string, body: unknown, schema: ZodType<T>): Promise<T> {
      return parse(await mutate(method, path, body), schema, path);
    },
    async sendNoContent(method: Mutation, path: string, body?: unknown): Promise<void> {
      await mutate(method, path, body);
    },
  };
}

/** For client components. Same origin, through the proxy. */
export const api = createApiClient({ baseUrl: () => "", extraHeaders: async () => ({}), csrf: true });
