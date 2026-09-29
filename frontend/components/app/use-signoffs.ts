"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/api/client";
import { progressCellSchema } from "@/lib/api/schemas";
import { doneSentence, fullName, type SignoffAction } from "@/lib/app/progress";

export type SignoffTarget = {
  student: { studentId: string; firstName: string; lastName: string };
  checkpoint: { id: string; text: string };
};

export const targetKey = (t: SignoffTarget) => `${t.student.studentId}/${t.checkpoint.id}`;

/**
 * Sign off, undo and revoke for one component (pack D-7). Each is the same idempotent PUT (plan P4-6); the page
 * refreshes from the server afterwards. `recent` is this visit's sign-offs, which offer Undo until `resetVisit`
 * (Re-sort) or a reload (plan P4-26); `changes` counts for the Re-sort button.
 */
export function useSignoffs(componentId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<{ key: string; action: SignoffAction } | null>(null);
  const [recent, setRecent] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ target: SignoffTarget; action: SignoffAction } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [changes, setChanges] = useState(0);

  async function run(target: SignoffTarget, action: SignoffAction) {
    const key = targetKey(target);
    setBusy({ key, action });
    setFailed(null);
    setConfirming(null);
    setAnnouncement("");
    try {
      await api.send("PUT", `/components/${componentId}/students/${target.student.studentId}/checkpoints/${target.checkpoint.id}/signoff`,
        { signedOff: action === "sign" }, progressCellSchema);
      setRecent((prev) => {
        const next = new Set(prev);
        if (action === "sign") next.add(key);
        else next.delete(key);
        return next;
      });
      setChanges((n) => n + 1);
      setAnnouncement(doneSentence(action, target.checkpoint.text, fullName(target.student)));
      router.refresh();
    } catch {
      // The alert under the row (role="alert") announces the failure itself.
      setFailed({ target, action });
    } finally {
      setBusy(null);
    }
  }

  return {
    busy, recent, confirming, failed, announcement, changes,
    signOff: (t: SignoffTarget) => run(t, "sign"),
    undo: (t: SignoffTarget) => run(t, "undo"),
    revoke: (t: SignoffTarget) => run(t, "revoke"),
    askRevoke: (t: SignoffTarget) => { setFailed(null); setConfirming(targetKey(t)); },
    keep: () => setConfirming(null),
    retry: () => { if (failed) void run(failed.target, failed.action); },
    resetVisit: () => { setRecent(new Set()); setChanges(0); },
  };
}

export type Signoffs = ReturnType<typeof useSignoffs>;
