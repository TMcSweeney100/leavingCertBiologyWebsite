"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import {
  type ClassDetail,
  enrolmentViewSchema,
  joinCodeSchema,
  type Member,
  resetCodeIssuedSchema,
} from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Dublin",
  }).format(new Date(iso));
}

function fullName(m: Member) {
  return `${m.firstName} ${m.lastName}`;
}

/**
 * Roadmap §6.2 `/teach/classes/[id]` Students tab. Every action calls Spring then refreshes the
 * server page; the issued reset code lives in component state so it survives that refresh and is
 * gone on navigation: shown once.
 */
export function ClassStudents({ detail }: { detail: ClassDetail }) {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [resetCode, setResetCode] = useState<{ student: string; code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  const base = `/classes/${detail.id}`;
  const pending = detail.enrolments.filter((m) => m.status === "PENDING");
  const approved = detail.enrolments.filter((m) => m.status === "APPROVED");

  return (
    <div>
      <h1>{detail.name}</h1>
      <p>
        {detail.subjectName}, year {detail.yearGroup}, {detail.academicYear}
      </p>
      {error && <ErrorPanel error={error} />}

      <section aria-labelledby="code-heading">
        <h2 id="code-heading">Join code</h2>
        {detail.joinCode ? (
          <p>
            <strong>{detail.joinCode.code}</strong> — expires {formatDate(detail.joinCode.expiresAt)}
          </p>
        ) : (
          <p>Joining is off. Make a new code to let students join.</p>
        )}
        <Button
          type="button"
          disabled={busy}
          onClick={() => run(() => api.send("POST", `${base}/join-code`, undefined, joinCodeSchema))}
        >
          New code
        </Button>
        {detail.joinCode && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => run(() => api.sendNoContent("DELETE", `${base}/join-code`))}
          >
            Turn joining off
          </Button>
        )}
      </section>

      <section aria-labelledby="pending-heading">
        <h2 id="pending-heading">Pending requests</h2>
        {pending.length === 0 ? (
          <p>No requests waiting.</p>
        ) : (
          <ul>
            {pending.map((m) => (
              <li key={m.enrolmentId}>
                {fullName(m)} ({m.username})
                <Button
                  type="button"
                  disabled={busy}
                  aria-label={`Approve ${fullName(m)}`}
                  onClick={() =>
                    run(() =>
                      api.send("POST", `${base}/enrolments/${m.enrolmentId}/approve`, undefined, enrolmentViewSchema),
                    )
                  }
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  aria-label={`Decline ${fullName(m)}`}
                  onClick={() =>
                    run(() =>
                      api.send("POST", `${base}/enrolments/${m.enrolmentId}/remove`, undefined, enrolmentViewSchema),
                    )
                  }
                >
                  Decline
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="students-heading">
        <h2 id="students-heading">Students</h2>
        {resetCode && (
          <p role="status">
            Reset code for {resetCode.student}: <strong>{resetCode.code}</strong>. Shown once; valid for 24 hours,
            until {formatDate(resetCode.expiresAt)}.
          </p>
        )}
        {approved.length === 0 ? (
          <p>No students yet.</p>
        ) : (
          <ul>
            {approved.map((m) => (
              <li key={m.enrolmentId}>
                {fullName(m)} ({m.username})
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  aria-label={`Issue reset code for ${fullName(m)}`}
                  onClick={() =>
                    run(async () => {
                      const issued = await api.send(
                        "POST",
                        `${base}/students/${m.studentId}/reset-codes`,
                        undefined,
                        resetCodeIssuedSchema,
                      );
                      setResetCode({ student: fullName(m), ...issued });
                    })
                  }
                >
                  Issue reset code
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  aria-label={`Remove ${fullName(m)}`}
                  onClick={() => {
                    if (window.confirm(`Remove ${fullName(m)} from ${detail.name}?`)) {
                      run(() =>
                        api.send("POST", `${base}/enrolments/${m.enrolmentId}/remove`, undefined, enrolmentViewSchema),
                      );
                    }
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
