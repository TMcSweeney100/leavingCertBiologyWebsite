"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type TeacherComponent, teacherComponentSchema } from "@/lib/api/schemas";
import { datesChanged, formatCalendarDate, hoursLabel } from "@/lib/app/component-setup";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { Notice } from "./notice";
import { lead, sectionTitle } from "./styles";
import { TeacherItems } from "./teacher-items";

const stageName = (s: { label: string | null; name: string }) => (s.label ? `${s.label} ${s.name}` : s.name);

/**
 * Roadmap §6.2 `/teach/classes/[id]/component`, component set (D-5 states 2–10). Dates save as one batch
 * (plan 2D P2-24); a date the server refuses is marked on its own row by stage id (P2-27).
 */
export function StageDatesForm({ component }: { component: TeacherComponent }) {
  const router = useRouter();
  const initial = useMemo(
    () => Object.fromEntries(component.stages.map((s) => [s.id, s.dueDate ?? ""])),
    [component.stages],
  );
  const [draft, setDraft] = useState<Record<string, string>>(initial);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = datesChanged(component.stages, draft);
  const completion = formatCalendarDate(component.brief.completionDate);
  const refused = new Map((error?.fieldErrors ?? []).map((f) => [f.field, f.message]));
  const byId = new Map(component.stages.map((s) => [s.id, s]));
  const noDates = component.stages.every((s) => !s.dueDate);

  useEffect(() => setDraft(initial), [initial]);

  // UI-STANDARDS: a long form confirms before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const dates = component.stages.map((s) => ({ stageId: s.id, dueDate: draft[s.id] || null }));
      await api.send("PUT", `/components/${component.id}/stage-dates`, { dates }, teacherComponentSchema);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-7 flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className={sectionTitle}>
          {component.brief.title}, {component.brief.examYear}
        </h2>
        <p className={lead}>
          {`These are your class's own dates, not SEC deadlines. The SEC's only date is the completion date, ${completion}.`}
        </p>
        {noDates && <p className={lead}>{'No dates yet. Until you set them, students see "dates coming from your teacher".'}</p>}
      </div>

      {component.warnings.map((w) => (
        <Notice key={`${w.code}-${w.stageIds.join("-")}`} tone="attention" role="status">
          {w.code === "OUT_OF_ORDER"
            ? `${byId.get(w.stageIds[1])?.label} is due before ${byId.get(w.stageIds[0])?.label}. That's allowed, because students move between stages, but check it's what you meant.`
            : `Some dates are now after the completion date, ${completion}, because the SEC changed it. Choose dates on or before it.`}
        </Notice>
      ))}

      {error && <ErrorPanel error={error} />}

      {/* noValidate: the `max` hint must not block a submit the server is meant to refuse (root CLAUDE.md). */}
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <FieldGroup>
          {component.stages.map((s) => (
            <Field
              key={s.id}
              id={`date-${s.id}`}
              label={stageName(s)}
              error={refused.get(s.id)}
              help={[hoursLabel(s, component.stages), s.supervised ? "Supervised in class" : "", s.checkpoint ? `Checkpoint: ${s.checkpoint}` : ""]
                .filter(Boolean)
                .join(" · ")}
            >
              {(control) => (
                <input
                  {...control}
                  type="date"
                  max={component.brief.completionDate}
                  value={draft[s.id] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                />
              )}
            </Field>
          ))}
        </FieldGroup>
        <div>
          <Button type="submit" disabled={busy}>
            Save dates
          </Button>
        </div>
      </form>

      <section aria-labelledby="items-heading" className="flex flex-col gap-4">
        <h2 id="items-heading" className={sectionTitle}>
          Your items
        </h2>
        {component.stages.map((s) => (
          <TeacherItems key={s.id} componentId={component.id} stage={s} />
        ))}
      </section>
    </div>
  );
}
