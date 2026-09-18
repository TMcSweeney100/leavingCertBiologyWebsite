"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import type { PersonalKind } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";
import { type ClassOption, PersonalItemForm } from "./personal-item-form";

type Item = { id: string; title: string; dueDate: string; kind: PersonalKind; classId: string | null };

/** Edit and delete on the student's own timeline items; delete confirms in place (plan 2F P2-50). */
export function PersonalItemActions({ item, classes }: { item: Item; classes: ClassOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "editing" | "confirming">("idle");
  const [error, setError] = useState<ApiError | null>(null);

  async function remove() {
    setError(null);
    try {
      await api.sendNoContent("DELETE", `/me/personal-items/${item.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    }
  }

  if (mode === "editing") {
    return (
      <PersonalItemForm
        itemId={item.id}
        initial={{ title: item.title, dueDate: item.dueDate, kind: item.kind, classId: item.classId }}
        classes={classes}
        onDone={() => setMode("idle")}
      />
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {mode === "confirming" ? (
        <>
          <span className="text-app-small text-app-copy">Delete this item?</span>
          <Button type="button" variant="destructive" onClick={remove}>Delete item</Button>
          <Button type="button" variant="outline" onClick={() => setMode("idle")}>Keep</Button>
        </>
      ) : (
        <>
          <Button type="button" variant="outline" aria-label={`Edit ${item.title}`} onClick={() => setMode("editing")}>Edit</Button>
          <Button type="button" variant="outline" aria-label={`Delete ${item.title}`} onClick={() => setMode("confirming")}>Delete</Button>
        </>
      )}
      {error && <ErrorPanel error={error} />}
    </div>
  );
}
