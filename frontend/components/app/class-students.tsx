"use client";

import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import {
  type ClassDetail,
  enrolmentViewSchema,
  joinCodeSchema,
  type Member,
  resetCodeIssuedSchema,
} from "@/lib/api/schemas";
import { askedAgo } from "@/lib/app/asked-ago";

import { ClassHeader } from "./class-header";
import { ErrorPanel } from "./error-panel";
import { card, eyebrow, lead, sectionTitle } from "./styles";

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

const COPIED_FOR_MS = 2000;

/**
 * Roadmap §6.2 `/teach/classes/[id]` Students tab, design pack D-2. Every action calls Spring then
 * refreshes the server page; the issued reset code lives in component state so it survives that
 * refresh and is gone on navigation: shown once. Turning joining off and removing a student confirm
 * in place (roadmap R27).
 */
export function ClassStudents({ detail, now }: { detail: ClassDetail; now?: Date }) {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [resetCode, setResetCode] = useState<{ enrolmentId: string; code: string; expiresAt: string } | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);
  const [confirmingOff, setConfirmingOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => clearTimeout(timer);
  }, [copied]);

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

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // No clipboard permission: the code is on screen and selectable, so there's nothing to report.
    }
  }

  const base = `/classes/${detail.id}`;
  const pending = detail.enrolments.filter((m) => m.status === "PENDING");
  const approved = detail.enrolments.filter((m) => m.status === "APPROVED");
  const today = now ?? new Date();

  return (
    <div>
      <ClassHeader detail={detail} current="students" />

      {error && (
        <div className="mt-6">
          <ErrorPanel error={error} />
        </div>
      )}

      <section aria-labelledby="code-heading" className="mt-7 flex flex-col gap-3">
        <h2 id="code-heading" className={sectionTitle}>
          Join code
        </h2>
        {detail.joinCode ? (
          <>
            <div className="relative flex flex-col gap-1.5 rounded-app-card bg-app-accent px-5 pt-5 pb-[18px] lg:px-6 lg:pt-[22px] lg:pb-5">
              <p aria-hidden="true" className={`${eyebrow} text-app-on-accent-muted`}>
                Join code
              </p>
              <strong
                translate="no"
                className="font-mono text-app-code leading-[1.05] font-bold tracking-[.1em] [overflow-wrap:anywhere] text-app-on-accent lg:text-app-code-lg"
              >
                {detail.joinCode.code}
              </strong>
              <p className="mt-1 text-app-meta text-app-on-accent-muted">expires {formatDate(detail.joinCode.expiresAt)}</p>
              <div className="absolute top-3 right-3 flex items-center gap-2.5">
                <span aria-live="polite" className="text-app-small font-semibold text-app-on-accent">
                  {copied ? "Copied" : ""}
                </span>
                <Button
                  type="button"
                  variant="onAccent"
                  size="icon"
                  aria-label="Copy join code"
                  onClick={() => copyCode(detail.joinCode!.code)}
                >
                  <Copy aria-hidden="true" strokeWidth={1.9} />
                </Button>
              </div>
            </div>
            {confirmingOff ? (
              <div className="app-appear flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-app-card border border-app-error/40 bg-app-error-tint px-4 py-3">
                <p className="basis-full text-app-meta text-app-error-hover sm:basis-auto">Turn joining off for {detail.name}?</p>
                <Button
                  type="button"
                  variant="confirmDestructive"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api.sendNoContent("DELETE", `${base}/join-code`);
                      setConfirmingOff(false);
                    })
                  }
                >
                  Turn off
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmingOff(false)}>
                  Keep
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => api.send("POST", `${base}/join-code`, undefined, joinCodeSchema))}
                >
                  New code
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmingOff(true)}>
                  Turn joining off
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-start gap-3.5 rounded-app-card border border-dashed border-app-field-border bg-app-surface p-6">
            <p className={lead}>Joining is off. Make a new code to let students join.</p>
            <Button
              type="button"
              disabled={busy}
              onClick={() => run(() => api.send("POST", `${base}/join-code`, undefined, joinCodeSchema))}
            >
              New code
            </Button>
          </div>
        )}
      </section>

      <section aria-labelledby="pending-heading" className="mt-8 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-[11px]">
          <h2 id="pending-heading" className={sectionTitle}>
            Pending requests
          </h2>
          {pending.length > 0 && (
            <span className="inline-flex items-center gap-[7px] rounded-full bg-app-attention py-[5px] pr-[11px] pl-[9px] text-app-small font-semibold text-app-on-accent tabular-nums">
              <span className="font-mono text-app-meta font-bold">{pending.length}</span> <span>waiting</span>
            </span>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="text-app-base text-app-grey">No requests waiting.</p>
        ) : (
          <ul className="flex flex-col gap-[9px]">
            {pending.map((m) => (
              <li key={m.enrolmentId} className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-[13px] ${card}`}>
                <div className="flex min-w-0 flex-[1_1_5rem] flex-col gap-0.5">
                  <p className="text-app-lead font-semibold break-words text-app-ink">{fullName(m)}</p>
                  <p className="text-app-small text-app-muted">
                    <span translate="no" className="font-mono text-app-help [overflow-wrap:anywhere]">
                      {m.username}
                    </span>{" "}
                    · {askedAgo(m.requestedAt, today)}
                  </p>
                </div>
                <div className="flex flex-none gap-[9px]">
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="students-heading" className="mt-8 flex flex-col gap-3">
        <h2 id="students-heading" className={sectionTitle}>
          Students
        </h2>
        {approved.length === 0 ? (
          <p className="text-app-base text-app-grey">No students yet.</p>
        ) : (
          <ul className="flex flex-col gap-[9px]">
            {approved.map((m) => {
              const nameId = `student-${m.enrolmentId}`;
              const confirming = confirmingRemove === m.enrolmentId;
              const issued = resetCode?.enrolmentId === m.enrolmentId ? resetCode : null;
              return (
                <li
                  key={m.enrolmentId}
                  aria-labelledby={nameId}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-app-card border px-4 py-[13px] transition-[background-color,border-color] duration-[var(--app-duration)] ${
                    confirming ? "border-app-error/40 bg-app-error-tint" : "border-app-field-border bg-app-surface"
                  }`}
                >
                  <div className="flex min-w-0 flex-[1_1_5rem] flex-col gap-0.5">
                    <p id={nameId} className="text-app-lead font-semibold break-words text-app-ink">
                      {fullName(m)}
                    </p>
                    <p translate="no" className="font-mono text-app-help [overflow-wrap:anywhere] text-app-muted">
                      {m.username}
                    </p>
                  </div>
                  {confirming ? (
                    <div className="app-appear flex basis-full flex-wrap items-center gap-x-[11px] gap-y-2.5">
                      <p className="basis-full text-app-meta text-app-error-hover sm:basis-auto">
                        Remove {fullName(m)} from {detail.name}?
                      </p>
                      <Button
                        type="button"
                        variant="confirmDestructive"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await api.send(
                              "POST",
                              `${base}/enrolments/${m.enrolmentId}/remove`,
                              undefined,
                              enrolmentViewSchema,
                            );
                            setConfirmingRemove(null);
                          })
                        }
                      >
                        Remove
                      </Button>
                      <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmingRemove(null)}>
                        Keep
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-none gap-[9px]">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        aria-label={`Issue reset code for ${fullName(m)}`}
                        onClick={() =>
                          run(async () => {
                            const code = await api.send(
                              "POST",
                              `${base}/students/${m.studentId}/reset-codes`,
                              undefined,
                              resetCodeIssuedSchema,
                            );
                            setResetCode({ enrolmentId: m.enrolmentId, ...code });
                          })
                        }
                      >
                        Issue reset code
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={busy}
                        aria-label={`Remove ${fullName(m)}`}
                        onClick={() => setConfirmingRemove(m.enrolmentId)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                  {issued && (
                    // Sized for one student to read off the laptop, not for the projector (pack D-2).
                    <div
                      role="status"
                      className="app-appear flex basis-full flex-wrap items-center gap-x-[18px] gap-y-3 rounded-app-card border border-l-4 border-app-field-border border-l-app-accent bg-app-accent-tint px-4 py-3.5"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className={`${eyebrow} text-app-muted`}>Reset code for {fullName(m)}</p>
                        <strong
                          translate="no"
                          className="font-mono text-app-code-sm font-bold tracking-[.14em] [overflow-wrap:anywhere] text-app-ink"
                        >
                          {issued.code}
                        </strong>
                        <p className="mt-0.5 text-app-small text-app-copy">
                          Shown once; valid for 24 hours, until {formatDate(issued.expiresAt)}. Hiding it can&apos;t be
                          undone.
                        </p>
                      </div>
                      <Button type="button" variant="outline" className="ml-auto" onClick={() => setResetCode(null)}>
                        Hide code
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
