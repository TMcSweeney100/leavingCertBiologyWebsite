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
 * (Re-sort) or a reload (plan P4-26); `changes` counts for the Re-sort button. A teacher clicks down a column
 * faster than the server answers, so `busy` and `failed` hold one entry per cell, never one for the whole page.
 */
export function useSignoffs(componentId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<ReadonlyMap<string, SignoffAction>>(new Map());
  const [recent, setRecent] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState<string | null>(null);
  const [failed, setFailed] = useState<ReadonlyMap<string, { target: SignoffTarget; action: SignoffAction }>>(new Map());
  const [announcement, setAnnouncement] = useState("");
  const [changes, setChanges] = useState(0);

  async function run(target: SignoffTarget, action: SignoffAction) {
    const key = targetKey(target);
    setBusy((prev) => new Map(prev).set(key, action));
    setFailed((prev) => without(prev, key));
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
      setFailed((prev) => new Map(prev).set(key, { target, action }));
    } finally {
      setBusy((prev) => without(prev, key));
    }
  }

  return {
    busy, recent, confirming, failed, announcement, changes,
    signOff: (t: SignoffTarget) => run(t, "sign"),
    undo: (t: SignoffTarget) => run(t, "undo"),
    revoke: (t: SignoffTarget) => run(t, "revoke"),
    askRevoke: (t: SignoffTarget) => { setFailed((prev) => without(prev, targetKey(t))); setConfirming(targetKey(t)); },
    keep: () => setConfirming(null),
    retry: (key: string) => { const f = failed.get(key); if (f) void run(f.target, f.action); },
    resetVisit: () => { setRecent(new Set()); setChanges(0); },
  };
}

function without<V>(map: ReadonlyMap<string, V>, key: string): ReadonlyMap<string, V> {
  if (!map.has(key)) return map;
  const next = new Map(map);
  next.delete(key);
  return next;
}

export type Signoffs = ReturnType<typeof useSignoffs>;
