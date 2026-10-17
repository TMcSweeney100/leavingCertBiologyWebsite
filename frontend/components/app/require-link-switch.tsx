"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { api } from "@/lib/api/client";

import { card } from "./styles";

/** Ready-for-signoff R-6, R-7: the class's one setting. A Settings tab replaces this once there's a second. */
export function RequireLinkSwitch({ componentId, requireLink }: { componentId: string; requireLink: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(requireLink);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function change(next: boolean) {
    if (busy) return;
    setOn(next);
    setBusy(true);
    setError(false);
    try {
      await api.send("PUT", `/components/${componentId}/settings`, { requireLink: next }, z.unknown());
      router.refresh();
    } catch {
      setOn(!next);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Sign-off requests" className={`${card} mt-6 flex flex-col gap-2 p-5`}>
      <label className="flex min-h-11 items-center justify-between gap-4 text-app-base font-semibold text-app-ink">
        Require a link to their work before students ask for sign-off
        <span className="relative inline-flex h-7 w-12 flex-none">
          <input type="checkbox" role="switch" checked={on} aria-disabled={busy} onChange={(e) => void change(e.target.checked)}
            className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
          <span aria-hidden className="absolute inset-0 rounded-full bg-app-switch-off transition-colors duration-[var(--app-duration)] motion-reduce:transition-none peer-checked:bg-app-accent" />
          <span aria-hidden className="absolute top-0.5 left-0.5 size-6 rounded-full bg-app-surface transition-transform duration-[var(--app-duration)] motion-reduce:transition-none peer-checked:translate-x-5" />
        </span>
      </label>
      <p className="text-app-small text-app-grey">{on
        ? "Students add the link to their report before they can mark a checkpoint ready."
        : "Students can mark a checkpoint ready without a link. You'll see \"No link yet\"."}</p>
      {error && <p role="alert" className="text-app-small text-app-error">{"Couldn't save the setting. Check your connection and try again."}</p>}
    </section>
  );
}
