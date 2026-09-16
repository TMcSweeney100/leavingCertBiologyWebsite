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
