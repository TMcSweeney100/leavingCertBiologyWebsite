"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

/** Same normalisation as the backend's JoinCode.parse: strip spaces and dashes, uppercase. */
export function normaliseJoinCode(typed: string): string {
  return typed.replace(/[\s-]/g, "").toUpperCase();
}

export function JoinCodeForm({ invalid = false }: { invalid?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    router.push(`/join/${encodeURIComponent(normaliseJoinCode(code))}`);
  }

  return (
    <form onSubmit={submit} aria-labelledby="join-heading">
      <h1 id="join-heading">Join a class</h1>
      {invalid && (
        <p role="alert">That join code isn&apos;t right, or it has expired. Ask your teacher for a new one.</p>
      )}
      <label>
        Join code
        <input
          name="code"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <Button type="submit">Continue</Button>
    </form>
  );
}
