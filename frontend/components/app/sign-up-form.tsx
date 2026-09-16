"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { enrolmentViewSchema } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { sectionTitle, textLink } from "./styles";

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

  // Pack D-1: a code that expired between steps leaves nothing to submit.
  if (error?.code === "JOIN_CODE_INVALID") return <ExpiredCode error={error} />;

  return (
    <form onSubmit={submit} aria-labelledby="signup-heading" className="mt-7">
      <h2 id="signup-heading" className={sectionTitle}>
        Create your account
      </h2>
      {error && (
        <div className="mt-3.5">
          <ErrorPanel error={error} />
        </div>
      )}
      <div className="mt-3.5 flex flex-col gap-4 lg:gap-[18px]">
        <FieldGroup>
          <Field id="signup-first-name" label="First name">
            {(control) => (
              <input
                {...control}
                name="firstName"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            )}
          </Field>
          <Field id="signup-surname" label="Surname">
            {(control) => (
              <input
                {...control}
                name="lastName"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            )}
          </Field>
          <Field
            id="signup-username"
            label="Username"
            help="3 to 32 characters: letters, numbers, dots, dashes and underscores."
            error={error?.code === "USERNAME_TAKEN" ? error.detail : undefined}
          >
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
            id="signup-password"
            label="Password"
            help="At least 10 characters."
            invalid={error?.code === "PASSWORD_TOO_SHORT"}
          >
            {(control) => (
              <input
                {...control}
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
        </FieldGroup>
        <Button type="submit" size="form" disabled={busy}>
          Create account and join
        </Button>
      </div>
      <p className="mt-[18px] text-app-base">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(`/join/${code}`)}`} className={textLink}>
          Sign in instead
        </Link>
        .
      </p>
    </form>
  );
}

/** Shared with JoinButton: the code stopped working after the preview loaded. */
export function ExpiredCode({ error }: { error: ApiError }) {
  return (
    <div className="mt-5 flex flex-col items-start gap-[18px]">
      <div className="w-full">
        <ErrorPanel error={error} />
      </div>
      <Link href="/join" className={`text-app-base font-semibold ${textLink}`}>
        Enter a different join code
      </Link>
    </div>
  );
}
