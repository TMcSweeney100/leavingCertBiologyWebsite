"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";

import { ErrorPanel } from "./error-panel";

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
        <p role="status">Password set. Sign in with your new password.</p>
        <Link href="/login">Sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} aria-labelledby="reset-heading">
      <h1 id="reset-heading">Reset your password</h1>
      <p>Your teacher can give you a reset code. It works once and lasts 24 hours.</p>
      {error && <ErrorPanel error={error} />}
      <label>
        Username
        <input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label>
        Reset code
        <input
          name="code"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <label>
        New password
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </label>
      <Button type="submit" disabled={busy}>
        Set new password
      </Button>
    </form>
  );
}
