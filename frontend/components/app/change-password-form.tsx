"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { SignOutButton } from "./sign-out-button";
import { lead, pageTitle, textLink } from "./styles";

const MISMATCH = "CONFIRMATION_MISMATCH";

/** Roadmap §6.2: forced mode (temporary password) has no way out except Sign out. */
export function ChangePasswordForm({ forced, landing }: { forced: boolean; landing: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError(
        new ApiError({
          code: MISMATCH,
          status: 0,
          title: "Passwords don't match",
          detail: "The two new passwords don't match. Type them again.",
        }),
      );
      return;
    }
    setBusy(true);
    try {
      await api.sendNoContent("POST", "/auth/password", { currentPassword: current, newPassword: next });
      router.push(landing);
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
      setCurrent("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="password-heading">
      <h1 id="password-heading" className={pageTitle}>
        Change password
      </h1>
      {forced && (
        <p className={`mt-2.5 max-w-[400px] ${lead}`}>
          You signed in with a temporary password. Choose your own to continue. It needs at least 10 characters.
        </p>
      )}
      {error && (
        <div className="mt-4 lg:mt-[18px]">
          <ErrorPanel error={error} />
        </div>
      )}
      <div className="mt-4 flex flex-col gap-4 lg:mt-[18px] lg:gap-[18px]">
        <FieldGroup>
          <Field
            id="password-current"
            label="Current password"
            error={error?.code === "INVALID_CREDENTIALS" ? error.detail : undefined}
          >
            {(control) => (
              <input
                {...control}
                type="password"
                autoComplete="current-password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            )}
          </Field>
          <Field
            id="password-new"
            label="New password"
            help="At least 10 characters."
            invalid={error?.code === "PASSWORD_TOO_SHORT"}
          >
            {(control) => (
              // minLength is a hint: in a browser the native check runs first with the same message, earlier.
              <input
                {...control}
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={64}
                required
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            )}
          </Field>
          <Field id="password-confirm" label="Confirm new password" invalid={error?.code === MISMATCH}>
            {(control) => (
              <input
                {...control}
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            )}
          </Field>
        </FieldGroup>
        <Button type="submit" size="form" disabled={busy}>
          Change password
        </Button>
      </div>
      <div className="mt-[18px] lg:mt-5">
        {forced ? (
          <SignOutButton />
        ) : (
          <Link href={landing} className={`text-app-base ${textLink}`}>
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
