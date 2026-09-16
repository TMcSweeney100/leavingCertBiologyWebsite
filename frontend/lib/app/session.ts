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
