"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type BriefSummary, teacherComponentSchema } from "@/lib/api/schemas";
import { weekdayDate } from "@/lib/app/component-setup";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { eyebrow, lead, sectionTitle } from "./styles";

const briefName = (b: BriefSummary) => `${b.title}, ${b.examYear}`;

/**
 * Roadmap §6.2 `/teach/classes/[id]/component`, no component yet — design pack D-5 state 1.
 *
 * The subject is fixed by the class, so the only choice is the exam year's brief, and one select says
 * that better than a list of radios. The commitment is shown *before* the action: the summary card is
 * driven by the selected brief, not by static copy, so changing the select changes what it promises.
 */
export function CreateComponentForm({ classId, briefs }: { classId: string; briefs: BriefSummary[] }) {
  const router = useRouter();
  const [briefId, setBriefId] = useState(briefs[0]?.id ?? "");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  if (briefs.length === 0) {
    return <p className={`mt-6 max-w-[620px] ${lead}`}>{"There's no brief for this subject yet. It appears here when the SEC publishes one."}</p>;
  }

  const selected = briefs.find((b) => b.id === briefId) ?? briefs[0];
  const nextYear = Math.max(...briefs.map((b) => b.examYear)) + 1;

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

  type Row = { label: string; value: string; strong?: boolean; mono?: boolean };
  const rows: Row[] = [
    { label: "Brief", value: briefName(selected) },
    ...(selected.topicTitle ? [{ label: "Topic", value: selected.topicTitle }] : []),
    { label: "SEC code", value: selected.secCode, mono: true },
    { label: "Completion date", value: weekdayDate(selected.completionDate), strong: true },
    { label: "Stages", value: "6, set by the SEC — you choose a date for each" },
  ];

  return (
    <form onSubmit={submit} className="mt-7 flex max-w-[620px] flex-col gap-4">
      <h2 className={sectionTitle}>No component set up yet</h2>
      <p className={lead}>
        {"This class does one coursework component. Choose the exam year's brief to set it up. The stages and the completion date come from the SEC; the dates in between are yours."}
      </p>
      {error && <ErrorPanel error={error} />}

      <FieldGroup>
        <Field id="brief" label="Brief" help={`The ${nextYear} briefs appear here when the SEC publishes them.`} controlClassName="cursor-pointer">
          {(control) => (
            <select {...control} value={briefId} onChange={(e) => setBriefId(e.target.value)}>
              {briefs.map((b) => (
                <option key={b.id} value={b.id}>
                  {briefName(b)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </FieldGroup>

      <section aria-labelledby="setting-up" role="group" className="rounded-app-card border border-app-field-border bg-app-surface px-[18px] py-4">
        <h3 id="setting-up" className={`${eyebrow} text-app-muted`}>
          {"What you're setting up"}
        </h3>
        <dl className="mt-2.5 flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col sm:flex-row sm:gap-3">
              <dt className="w-32 flex-none text-app-meta text-app-muted">{row.label}</dt>
              <dd className={`min-w-0 text-app-ink ${row.mono ? "font-mono text-app-meta" : "text-app-base"} ${row.strong ? "font-semibold" : ""}`}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={busy || !briefId} className="sm:flex-none">
          {busy ? "Creating component…" : "Create component"}
        </Button>
        <p className="text-app-meta text-app-grey">Students see the component as soon as it exists, with dates still to come.</p>
      </div>
    </form>
  );
}
