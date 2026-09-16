"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { enrolmentViewSchema } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";

/** Design §8.1: first name, surname, username, password. Nothing else is collected. */
export function SignUpForm({ code }: { code: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.send(
        "POST",
        `/join/${encodeURIComponent(code)}/accounts`,
        { firstName, lastName, username, password },
        enrolmentViewSchema,
      );
      router.push("/home");
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="signup-heading">
      <h2 id="signup-heading">Create your account</h2>
      {error && <ErrorPanel error={error} />}
      <label>
        First name
        <input
          name="firstName"
          autoComplete="given-name"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </label>
      <label>
        Surname
        <input
          name="lastName"
          autoComplete="family-name"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </label>
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
      <p>3 to 32 characters: letters, numbers, dots, dashes and underscores.</p>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <p>At least 10 characters.</p>
      <Button type="submit" disabled={busy}>
        Create account and join
      </Button>
      <p>
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(`/join/${code}`)}`}>Sign in instead</Link>
      </p>
    </form>
  );
}
