"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

import { Field, FieldGroup } from "./field";
import { Notice } from "./notice";
import { lead, pageTitle } from "./styles";

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
      <h1 id="join-heading" className={pageTitle}>
        Join a class
      </h1>
      {/* Pack D-1: the code field is uppercased on screen, so say that lowercase works. */}
      <p className={`mt-2.5 ${lead}`}>Your teacher reads an 8-character code out in class. Lowercase is fine.</p>
      {invalid && (
        <div className="mt-4 lg:mt-[18px]">
          <Notice tone="error" role="alert">
            That join code isn&apos;t right, or it has expired. Ask your teacher for a new one.
          </Notice>
        </div>
      )}
      <div className="mt-4 flex flex-col gap-4 lg:mt-[18px] lg:gap-[18px]">
        <FieldGroup>
          <Field
            id="join-code"
            label="Join code"
            invalid={invalid}
            controlClassName="font-mono text-[22px] font-bold uppercase tracking-[.16em] placeholder:normal-case"
          >
            {(control) => (
              <input
                {...control}
                name="code"
                translate="no"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            )}
          </Field>
        </FieldGroup>
        <Button type="submit" size="form">
          Continue
        </Button>
      </div>
    </form>
  );
}
