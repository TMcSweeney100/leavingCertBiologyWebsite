"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";

import { ErrorPanel } from "./error-panel";
import { SignOutButton } from "./sign-out-button";

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
          code: "CONFIRMATION_MISMATCH",
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
      <h1 id="password-heading">Change password</h1>
      {forced && (
        <p>You signed in with a temporary password. Choose your own to continue. It needs at least 10 characters.</p>
      )}
      {error && <ErrorPanel error={error} />}
      <label>
        Current password
        <input
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </label>
      <label>
        New password
        {/* minLength is a hint: in a browser the native check runs first with the same message, earlier. */}
        <input
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={64}
          required
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </label>
      <label>
        Confirm new password
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>
      <Button type="submit" disabled={busy}>
        Change password
      </Button>
      {forced ? <SignOutButton /> : <Link href={landing}>Cancel</Link>}
    </form>
  );
}
