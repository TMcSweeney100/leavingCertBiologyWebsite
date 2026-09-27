"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, Fragment, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type TeacherComponent, teacherComponentSchema } from "@/lib/api/schemas";
import {
  datesChanged,
  datesRunSummary,
  formatCalendarDate,
  hoursLabel,
  saveStatus,
  shortWeekdayDate,
  weekdayDate,
} from "@/lib/app/component-setup";

import { ErrorPanel } from "./error-panel";
import { Notice } from "./notice";
import { lead, sectionTitle } from "./styles";
import { TeacherItems } from "./teacher-items";
import { YearView } from "./year-view";

type Stage = TeacherComponent["stages"][number];

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six"];
const lower = (label: string) => label.charAt(0).toLowerCase() + label.slice(1);

const textButton =
  "rounded-app-control px-1.5 py-1 text-app-meta font-semibold text-app-accent underline underline-offset-3 hover:text-app-accent-hover touch-manipulation";

/**
 * Roadmap §6.2 `/teach/classes/[id]/component`, component set — restyled from design pack D-5.
 *
 * The pack's three rules shape everything here. Numbers are the SEC's and letters are the teacher's,
 * so stages are numbered rows that cannot be added to and items are lettered by date elsewhere. Red
 * refuses and amber asks: only a date the server rejected is red; out-of-order dates and a completion
 * date that moved are amber, and both of those are saved states. And nothing is lost: one Save dates
 * covers all six stages, the status beside it always says where things stand, and leaving with unsaved
 * dates is confirmed.
 */
export function StageDatesForm({ component, today }: { component: TeacherComponent; today: string }) {
  const router = useRouter();
  const initial = useMemo(
    () => Object.fromEntries(component.stages.map((s) => [s.id, s.dueDate ?? ""])),
    [component.stages],
  );
  const [draft, setDraft] = useState<Record<string, string>>(initial);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  // Null until the teacher decides: the view then defaults by width in CSS alone, which is what the
  // pack asks for ("default per width is enough") without a hydration mismatch or an opening flash.
  const [yearViewOpen, setYearViewOpen] = useState<boolean | null>(null);

  const completion = formatCalendarDate(component.brief.completionDate);
  const byId = useMemo(() => new Map(component.stages.map((s) => [s.id, s])), [component.stages]);
  const refused = useMemo(() => new Map((error?.fieldErrors ?? []).map((f) => [f.field, f.message])), [error]);
  const dirty = datesChanged(component.stages, draft);
  const changed = component.stages.filter((s) => (s.dueDate ?? "") !== (draft[s.id] ?? "")).length;
  const saved = component.stages.filter((s) => s.dueDate).length;
  const noDates = saved === 0;

  const outOfOrder = component.warnings.filter((w) => w.code === "OUT_OF_ORDER");
  const moved = component.warnings.filter((w) => w.code === "AFTER_COMPLETION_DATE");
  const attentionStageIds = component.warnings.flatMap((w) => w.stageIds);
  const errorStageIds = [...refused.keys()];

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

  /** The line's footnote says the same thing the rows say, in the shape of the line (pack D-5 §4–6). */
  const footnote = (() => {
    if (errorStageIds.length > 0) {
      const names = errorStageIds.map((id) => byId.get(id)?.label ?? "A stage");
      return `${names.join(" and ")} sits past the completion end-stop.`;
    }
    if (moved.length > 0) {
      const names = moved.flatMap((w) => w.stageIds).map((id) => byId.get(id)?.label ?? "a stage");
      return `The end-stop moved left. ${names.join(" and ")} is now outside it.`;
    }
    if (outOfOrder.length > 0) {
      const pair = outOfOrder[0].stageIds.map((id) => byId.get(id)?.ordinal ?? "?");
      return `Stages ${pair.join(" and ")} are in the opposite order to their numbers.`;
    }
    return null;
  })();

  const yearView = (
    <YearView
      stages={component.stages}
      completionDate={component.brief.completionDate}
      today={today}
      attentionStageIds={attentionStageIds}
      errorStageIds={errorStageIds}
      footnote={footnote}
      onClose={() => setYearViewOpen(false)}
    />
  );

  const summary = datesRunSummary(component.stages, component.brief.completionDate);
  const collapsed = (
    <section className="rounded-app-card border border-app-field-border bg-app-surface px-4 py-3.5">
      {summary && <p className="text-app-small text-app-copy">{summary}</p>}
      <button type="button" onClick={() => setYearViewOpen(true)} className={`${textButton} -ml-1.5 mt-1`}>
        Show the year view
      </button>
    </section>
  );

  const status = saveStatus({
    total: component.stages.length,
    saved,
    changed,
    refusedCount: refused.size,
    warnings: component.warnings,
  });

  return (
    <div className="mt-7 flex flex-col gap-5">
      {/* State 6. Nothing the teacher did, so nothing is red — but the page must not look normal. */}
      {moved.length > 0 && (
        <div className="max-w-[640px]">
          <Notice tone="attention" role="status" heading="The completion date moved">
            {"The SEC moved this brief's completion date earlier, to "}
            <strong className="font-semibold">{weekdayDate(component.brief.completionDate)}</strong>
            {`. ${moved.flatMap((w) => w.stageIds).length === 1 ? "One of your dates is" : "Some of your dates are"} now after it. Fix it below and save.`}
          </Notice>
        </div>
      )}

      <div className="flex max-w-[620px] flex-col gap-1.5">
        <h2 className={sectionTitle}>
          {component.brief.title}, {component.brief.examYear}
        </h2>
        {(component.brief.topicTitle || component.brief.secCode) && (
          <p className="text-app-small text-app-muted">
            {component.brief.topicTitle ? `${component.brief.topicTitle} · ` : ""}
            <span className="font-mono text-app-meta">{component.brief.secCode}</span>
          </p>
        )}
        <p className={lead}>
          {"These are your class's own dates, not SEC deadlines. The SEC's only date is the completion date, "}
          <strong className="font-semibold text-app-ink">{completion}</strong>.
        </p>
      </div>

      {/* State 2. Says what students see, rather than implying it. */}
      {noDates && (
        <p className="max-w-[620px] rounded-app-card border border-l-4 border-app-accent/30 border-l-app-accent bg-app-accent-tint px-3.5 py-3 text-app-base leading-[1.45] text-app-copy">
          {"Until you save dates, students see "}
          <strong className="font-semibold text-app-ink">{"“Dates coming from your teacher”"}</strong>
          {" on this component and on their timeline."}
        </p>
      )}

      <div className={yearViewOpen === null ? "hidden md:block" : yearViewOpen ? "" : "hidden"}>{yearView}</div>
      <div className={yearViewOpen === null ? "md:hidden" : yearViewOpen ? "hidden" : ""}>{collapsed}</div>

      {error && (
        <ErrorPanel
          error={error}
          heading={refused.size > 0 ? "Your dates weren't saved" : undefined}
          summary={refused.size > 0 ? `${WORDS[refused.size] ?? refused.size} date${refused.size === 1 ? "" : "s"} need${refused.size === 1 ? "s" : ""} another look. Nothing was changed.` : undefined}
          fieldLabel={(field) => byId.get(field)?.label ?? field}
          focus
        />
      )}

      {/* noValidate: the `max` hint must not block a submit the server is meant to refuse (root CLAUDE.md). */}
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-app-card border border-app-field-border bg-app-surface">
          {component.stages.map((stage, index) => (
            <Fragment key={stage.id}>
              <StageDateRow
                stage={stage}
                stages={component.stages}
                value={draft[stage.id] ?? ""}
                onChange={(value) => setDraft((d) => ({ ...d, [stage.id]: value }))}
                max={component.brief.completionDate}
                refusal={refused.get(stage.id) ?? null}
                movedMessage={
                  moved.some((w) => w.stageIds.includes(stage.id))
                    ? `${stage.label ?? stage.name} is after the new completion date, ${weekdayDate(component.brief.completionDate)}. Choose a date on or before it.`
                    : null
                }
                attention={attentionStageIds.includes(stage.id)}
                last={index === component.stages.length - 1}
              />
              {/* One message per out-of-order pair, under the later of the two rows: the problem is
                  the pair, not either row on its own. */}
              {outOfOrder
                .filter((w) => w.stageIds[w.stageIds.length - 1] === stage.id)
                .map((w) => (
                  <p
                    key={`ooo-${w.stageIds.join("-")}`}
                    role="status"
                    className="border-b border-app-line bg-app-attention-tint py-2.5 pr-4 pl-4 text-app-small text-app-copy shadow-[inset_2px_0_0_var(--app-attention)] md:pl-[42px]"
                  >
                    {outOfOrderMessage(w.stageIds, byId, draft)}
                  </p>
                ))}
            </Fragment>
          ))}
        </div>
        <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          <Button type="submit" disabled={busy} className="md:flex-none">
            {busy ? "Saving dates…" : "Save dates"}
          </Button>
          <p className="text-center text-app-meta text-app-grey md:text-left">{status}</p>
        </div>
      </form>

      <TeacherItems componentId={component.id} stages={component.stages} />
    </div>
  );
}

function outOfOrderMessage(stageIds: ReadonlyArray<string>, byId: Map<string, Stage>, draft: Record<string, string>) {
  // Spring orders the pair [the lower-numbered stage, the stage dated before it].
  const [expectedFirst, actuallyFirst] = stageIds;
  const early = byId.get(actuallyFirst);
  const late = byId.get(expectedFirst);
  const earlyDate = draft[actuallyFirst] || early?.dueDate;
  const lateDate = draft[expectedFirst] || late?.dueDate;
  const when = (date: string | null | undefined) => (date ? ` (${shortWeekdayDate(date)})` : "");
  return `${early?.label ?? "A later stage"}${when(earlyDate)} is before ${lower(late?.label ?? "an earlier stage")}${when(lateDate)}. That's allowed — students move between stages — but check it's what you meant.`;
}

/**
 * One numbered stage. Not a `Field`: the row carries a mono ordinal, up to three lines of context, a
 * right-aligned date column and a row-level tint, and the visible stage name is content rather than
 * the input's label — so every input gets its own visually-hidden label naming its stage.
 */
function StageDateRow({
  stage,
  stages,
  value,
  onChange,
  max,
  refusal,
  movedMessage,
  attention,
  last,
}: {
  stage: Stage;
  stages: ReadonlyArray<Stage>;
  value: string;
  onChange: (value: string) => void;
  max: string;
  refusal: string | null;
  movedMessage: string | null;
  attention: boolean;
  last: boolean;
}) {
  const id = `date-${stage.id}`;
  const label = stage.label ?? stage.name;
  const problem = refusal ?? movedMessage;
  const noteId = problem ? `${id}-note` : undefined;
  const tone = refusal
    ? "bg-app-error-tint shadow-[inset_2px_0_0_var(--app-error)]"
    : attention
      ? "bg-app-attention-tint shadow-[inset_2px_0_0_var(--app-attention)]"
      : "";
  const ordinalInk = refusal ? "text-app-error-hover" : attention ? "text-app-attention" : "text-app-accent";
  const inputBorder = refusal ? "border-app-error" : attention ? "border-app-attention" : "border-app-field-border";

  return (
    <div
      className={`flex flex-col gap-2.5 px-4 py-3 md:flex-row md:gap-[18px] ${problem ? "md:items-start" : "md:items-center"} ${last ? "" : "border-b border-app-line"} ${tone}`}
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-2.5 md:gap-[18px]">
        <span className={`w-6 flex-none font-mono text-[14px] font-bold md:text-[15px] ${ordinalInk} ${problem ? "md:pt-0.5" : ""}`}>
          {stage.ordinal}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="text-app-base font-semibold text-app-ink">{stage.name}</span>
          {problem ? (
            <span id={noteId} className={`text-app-small ${refusal ? "text-app-error-hover" : "text-app-attention"}`}>
              {problem}
            </span>
          ) : (
            <>
              {(hoursLabel(stage, stages) || stage.supervised) && (
                <span className="text-app-small text-app-muted">
                  {[hoursLabel(stage, stages), stage.supervised ? "Supervised in class" : ""].filter(Boolean).join(" · ")}
                </span>
              )}
              {stage.checkpoint && <span className="text-app-small text-app-muted">{`Checkpoint: ${stage.checkpoint}`}</span>}
            </>
          )}
        </div>
      </div>
      <div className="flex flex-none flex-col gap-1 md:items-end">
        <label htmlFor={id} className="sr-only">{`${label} date`}</label>
        <input
          id={id}
          type="date"
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={refusal ? true : undefined}
          aria-describedby={noteId}
          className={`min-h-11 w-full rounded-app-control border bg-app-surface px-3 py-2.5 text-app-base text-app-ink md:min-h-0 md:w-[176px] md:px-2.5 md:py-2 ${inputBorder}`}
        />
        <span className={`text-app-small md:text-right ${refusal ? "text-app-error-hover" : "text-app-muted"}`}>
          {value ? weekdayDate(value) : "No date yet"}
        </span>
      </div>
    </div>
  );
}
