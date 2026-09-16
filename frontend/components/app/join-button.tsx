"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type EnrolmentView, enrolmentViewSchema } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";

const STATUS_TEXT = {
  PENDING: "Request sent. Waiting for your teacher to approve it.",
  APPROVED: "You're already in this class.",
  REMOVED: "You were removed from this class. Ask your teacher if that's a mistake.",
} as const;

/** For a signed-in student on a join page: one click asks to join, and the answer shows the status. */
export function JoinButton({ code }: { code: string }) {
  const [result, setResult] = useState<EnrolmentView | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.send("POST", `/join/${encodeURIComponent(code)}/enrolments`, undefined, enrolmentViewSchema));
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div>
        <p role="status">{STATUS_TEXT[result.status]}</p>
        <Link href="/home">Go to your classes</Link>
      </div>
    );
  }
  return (
    <div>
      {error && <ErrorPanel error={error} />}
      <Button type="button" onClick={join} disabled={busy}>
        Join this class
      </Button>
    </div>
  );
}
