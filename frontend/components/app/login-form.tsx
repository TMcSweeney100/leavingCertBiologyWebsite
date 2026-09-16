"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { meSchema } from "@/lib/api/schemas";
import { landingFor } from "@/lib/app/navigation";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { pageTitle, textLink } from "./styles";

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
      <h1 id="login-heading" className={pageTitle}>
        Sign in
      </h1>
      {error && (
        <div className="mt-4 lg:mt-[18px]">
          <ErrorPanel error={error} />
        </div>
      )}
      <div className="mt-4 flex flex-col gap-4 lg:mt-[18px] lg:gap-[18px]">
        <FieldGroup>
          <Field id="login-username" label="Username">
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
          <Field id="login-password" label="Password">
            {(control) => (
              <input
                {...control}
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
        </FieldGroup>
        <Button type="submit" size="form" disabled={busy}>
          Sign in
        </Button>
      </div>
      <div className="mt-[18px] flex flex-col gap-2 text-app-base leading-normal lg:mt-5">
        <p>
          Joining a class?{" "}
          <Link href="/join" className={textLink}>
            Enter your join code
          </Link>
          .
        </p>
        <p>
          Forgotten your password?{" "}
          <Link href="/reset" className={textLink}>
            Use a reset code
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
