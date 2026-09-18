"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type BriefSummary, teacherComponentSchema } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";

import { ErrorPanel } from "./error-panel";
import { card, lead, sectionTitle } from "./styles";

/** Roadmap §6.2 `/teach/classes/[id]/component`, no component yet: choose the brief (D-5 state 1). */
export function CreateComponentForm({ classId, briefs }: { classId: string; briefs: BriefSummary[] }) {
  const router = useRouter();
  const [briefId, setBriefId] = useState(briefs[0]?.id ?? "");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  if (briefs.length === 0) {
    return <p className={`mt-6 ${lead}`}>{"There's no brief for this subject yet. It appears here when the SEC publishes one."}</p>;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.send("POST", `/classes/${classId}/components`, { briefId }, teacherComponentSchema);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
      <h2 className={sectionTitle}>Choose the brief</h2>
      <p className={lead}>{"Stages are set by the brief. You'll add dates and your own items next."}</p>
      {error && <ErrorPanel error={error} />}
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Brief</legend>
        {briefs.map((b) => (
          <label key={b.id} className={`${card} flex cursor-pointer items-start gap-3 p-4`}>
            <input type="radio" name="brief" value={b.id} checked={briefId === b.id} onChange={() => setBriefId(b.id)} className="mt-1" />
            <span className="flex flex-col gap-1">
              <span className="font-semibold text-app-ink">
                {b.title}, {b.examYear}
              </span>
              <span className="text-app-small text-app-grey">
                SEC code {b.secCode}
                {b.topicTitle ? ` · ${b.topicTitle}` : ""}
              </span>
              <span className="text-app-small text-app-grey">Completion date {formatCalendarDate(b.completionDate)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <Button type="submit" disabled={busy || !briefId}>
          Create component
        </Button>
      </div>
    </form>
  );
}
