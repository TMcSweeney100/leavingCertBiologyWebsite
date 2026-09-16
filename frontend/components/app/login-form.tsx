"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { meSchema } from "@/lib/api/schemas";
import { landingFor } from "@/lib/app/navigation";

import { ErrorPanel } from "./error-panel";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await api.send("POST", "/auth/login", { username, password }, meSchema);
      router.push(landingFor(me, next));
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="login-heading">
      <h1 id="login-heading">Sign in</h1>
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
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <Button type="submit" disabled={busy}>
        Sign in
      </Button>
      <p>
        Joining a class? <Link href="/join">Enter your join code</Link>. Forgotten your password?{" "}
        <Link href="/reset">Use a reset code</Link>.
      </p>
    </form>
  );
}
