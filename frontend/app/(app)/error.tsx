"use client";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { ApiError } from "@/lib/api/problem";

// Reached when the layout's session check itself fails (Spring unreachable, say).
export default function AppError({ error }: { error: Error }) {
  const apiError = error instanceof ApiError ? error : ApiError.unreachable(error);
  return (
    <AppMain>
      <ErrorPanel error={apiError} />
    </AppMain>
  );
}
