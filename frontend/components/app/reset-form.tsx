"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { Notice } from "./notice";
import { lead, pageTitle } from "./styles";

/** Plan decision P-5: success sends the student to `/login`; redeeming a code doesn't sign in. */
export function ResetForm() {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.sendNoContent("POST", "/auth/password-reset", { username, code, newPassword });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div>
        <h1 className={pageTitle}>Reset your password</h1>
        <div role="status" className="mt-5">
          <Notice tone="approved" eyebrow="Password set">
            Password set. Sign in with your new password.
          </Notice>
        </div>
        <Link href="/login" className={`mt-[18px] ${buttonVariants({ size: "form" })}`}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} aria-labelledby="reset-heading">
      <h1 id="reset-heading" className={pageTitle}>
        Reset your password
      </h1>
      <p className={`mt-2.5 max-w-[400px] ${lead}`}>
        Your teacher can give you a reset code. It works once and lasts 24 hours.
      </p>
      {error && (
        <div className="mt-4 lg:mt-[18px]">
          <ErrorPanel error={error} />
        </div>
      )}
      <div className="mt-4 flex flex-col gap-4 lg:mt-[18px] lg:gap-[18px]">
        <FieldGroup>
          <Field id="reset-username" label="Username">
            {(control) => (
              <input
                {...control}
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            )}
          </Field>
          <Field
            id="reset-code"
            label="Reset code"
            invalid={error?.code === "RESET_CODE_INVALID"}
            controlClassName="font-mono font-bold uppercase tracking-[.12em]"
          >
            {(control) => (
              <input
                {...control}
                name="code"
                translate="no"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="one-time-code"
                spellCheck={false}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            )}
          </Field>
          <Field
            id="reset-new-password"
            label="New password"
            help="At least 10 characters."
            invalid={error?.code === "PASSWORD_TOO_SHORT"}
          >
            {(control) => (
              <input
                {...control}
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            )}
          </Field>
        </FieldGroup>
        <Button type="submit" size="form" disabled={busy}>
          Set new password
        </Button>
      </div>
    </form>
  );
}
