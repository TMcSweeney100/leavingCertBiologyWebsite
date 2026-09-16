"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type EnrolmentView, enrolmentViewSchema } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";
import { Notice, type NoticeTone } from "./notice";
import { ExpiredCode } from "./sign-up-form";
import { textLink } from "./styles";

const STATUS: Record<EnrolmentView["status"], { label: string; text: string; tone: NoticeTone }> = {
  PENDING: { label: "Pending approval", text: "Request sent. Waiting for your teacher to approve it.", tone: "attention" },
  APPROVED: { label: "Approved", text: "You're already in this class.", tone: "approved" },
  REMOVED: { label: "Removed", text: "You were removed from this class. Ask your teacher if that's a mistake.", tone: "error" },
};

/** For a signed-in student on a join page: one click asks to join, and the answer shows the status. */
export function JoinButton({ code, signedInAs }: { code: string; signedInAs?: string }) {
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
    const status = STATUS[result.status];
    return (
      <div className="mt-5 flex flex-col items-start gap-[18px]">
        <div role="status" className="w-full">
          <Notice tone={status.tone} eyebrow={status.label}>
            {status.text}
          </Notice>
        </div>
        <Link href="/home" className={`text-app-base font-semibold ${textLink}`}>
          Go to your classes
        </Link>
      </div>
    );
  }
  if (error?.code === "JOIN_CODE_INVALID") return <ExpiredCode error={error} />;
  return (
    <div className="mt-5 flex flex-col gap-[18px]">
      {error && <ErrorPanel error={error} />}
      <Button type="button" size="form" onClick={join} disabled={busy}>
        Join this class
      </Button>
      {signedInAs && <p className="text-app-meta text-app-grey">Signed in as {signedInAs}.</p>}
    </div>
  );
}
