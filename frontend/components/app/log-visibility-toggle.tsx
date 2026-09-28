"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { logEntrySchema } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";

/** FR-24c: one tap, not buried in a menu. The name says what the tap will do, and to which entry. */
export function LogVisibilityToggle({ entryId, title, visible }: { entryId: string; title: string; visible: boolean }) {
  const router = useRouter();
  const noteId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await api.send("PUT", `/log/${entryId}/visibility`, { visible: !visible }, logEntrySchema);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  // The visible word starts the name (WCAG 2.5.3), and the title says which entry it acts on.
  const name = busy ? `${visible ? "Hiding" : "Showing"} ${title}…` : visible ? `Hide ${title} from your teacher` : `Show ${title} to your teacher`;
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" disabled={busy} onClick={toggle} aria-label={name}
        aria-describedby={visible ? undefined : noteId} className="min-w-[76px] text-app-accent">
        {busy ? (visible ? "Hiding…" : "Showing…") : visible ? "Hide" : "Show"}
      </Button>
      {!visible && (
        <p id={noteId} className="text-app-small text-app-copy">
          Showing it lets your teacher read its earlier versions too, including any you wrote while it was hidden.
        </p>
      )}
      {error && <ErrorPanel error={error} focus />}
    </div>
  );
}
