"use client";

import Link from "next/link";
import { type RefObject, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { ApiError } from "@/lib/api/client";
import type { ProgressGrid, TeacherComponent } from "@/lib/api/schemas";
import type { Attempt } from "@/lib/app/attempt";
import { hoursLabel, weekdayDate } from "@/lib/app/component-setup";
import type { DateMark } from "@/lib/app/date-marks";
import { checkpointCounts, type DateRequest } from "@/lib/app/stage-sheet";

import { DateBox } from "./date-box";
import { DatePickerPanel, pickedDay } from "./date-picker-panel";
import { ErrorPanel } from "./error-panel";
import { StageItems } from "./stage-items";
import { eyebrow, lead } from "./styles";

type Stage = TeacherComponent["stages"][number];

const sectionLabel = `${eyebrow} text-app-muted`;

/**
 * The stage sheet (plan stage-sheet; mockups docs/design/pilot/stage-sheet/design/). A right-hand drawer opened from a
 * stage's name on the Component tab. Two views in one drawer (S-4): at rest, and the date calendar in place of the
 * rest, so there's never a second drawer on top. The date is the page's shared draft (S-6); Save this date saves this
 * stage only (S-7). Escape closes the whole sheet, even from the calendar (S-19).
 */
export function StageSheet(props: {
  componentId: string;
  stage: Stage | null;
  stages: ReadonlyArray<Stage>;
  draft: Record<string, string>;
  onDateChange: (stageId: string, iso: string) => void;
  onSaveDate: (stageId: string) => Promise<void>;
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  /** Names a refused field in the error list: Spring keys `COMPLETION_DATE_EXCEEDED` by stage id (S-34). */
  fieldLabel: (field: string) => string;
  /** The class's progress grid: the checkpoint's counts and who has ticked each item (S-15, S-16). */
  progress: Attempt<ProgressGrid>;
  classId: string;
  /** The Progress tab's Hide names (S-20). The sheet is portalled out of the page, so it carries the class itself. */
  hideNames: boolean;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  // Keep showing the last stage while the sheet slides closed: the parent has already set `stage` to null.
  // Setting state during render from a prop is React's documented pattern for "remember the previous value".
  const [shown, setShown] = useState(props.stage);
  if (props.stage && props.stage !== shown) setShown(props.stage);
  const title = useRef<HTMLHeadingElement>(null);

  return (
    <Drawer swipeDirection="right" open={props.stage !== null} onOpenChange={(next) => !next && props.onClose()}>
      <DrawerContent initialFocus={title} finalFocus={props.returnFocus} className={props.hideNames ? "app-hide-names" : undefined}>
        {shown && <SheetBody key={shown.id} {...props} stage={shown} title={title} />}
      </DrawerContent>
    </Drawer>
  );
}

function SheetBody({
  componentId,
  stage,
  stages,
  draft,
  onDateChange,
  onSaveDate,
  marks,
  completionDate,
  today,
  fieldLabel,
  progress,
  classId,
  title,
}: Parameters<typeof StageSheet>[0] & { stage: Stage; title: RefObject<HTMLHeadingElement | null> }) {
  const id = useId();
  const dateBox = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const chooseHeading = useRef<HTMLHeadingElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const [request, setRequest] = useState<DateRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [savedAs, setSavedAs] = useState<string | null>(null);

  const label = stage.label ?? stage.name;
  const value = draft[stage.id] ?? "";
  const saved = stage.dueDate ?? "";
  const unsaved = value !== saved;
  // The page refreshes after a save without waiting, so for one round trip the date just saved is shown while
  // `unsaved` still is: that moment is "saved", not "not saved". It remembers which date was sent, so a different date
  // picked while the save was in flight stays unsaved.
  const justSaved = savedAs === value;
  const pending = unsaved && !justSaved;
  const boxId = `${id}-date`;
  const whenId = `${id}-when`;
  const helpId = `${id}-save-help`;

  const changeDate = (iso: string) => {
    setSavedAs(null);
    onDateChange(stage.id, iso);
  };
  const ask = (next: DateRequest) => {
    returnTo.current = next.from;
    setRequest(next);
  };

  // Into the calendar: focus the picked day (else today; else the view's heading). Out of it: back to the box.
  useEffect(() => {
    if (request) {
      (pickedDay(panel.current) ?? chooseHeading.current)?.focus();
      return;
    }
    returnTo.current?.focus();
    returnTo.current = null;
  }, [request]);

  async function save() {
    setBusy(true);
    setError(null);
    const sent = value;
    try {
      await onSaveDate(stage.id);
      setSavedAs(sent);
      dateBox.current?.focus(); // Save this date is about to go; the box stays (S-32).
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  const meta = [stage.label, hoursLabel(stage, stages), stage.supervised ? "Supervised in class" : ""].filter(Boolean).join(" · ");
  const counts = progress.ok ? checkpointCounts(progress.data, stage.id) : null;

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-app-line px-4 pt-3 pb-3.5 sm:px-6 sm:pt-[18px] sm:pb-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          {meta && <p className="text-app-small text-app-muted">{meta}</p>}
          <DrawerTitle ref={title} tabIndex={-1} className="text-[20px] leading-[1.25] text-balance sm:text-app-section">
            {stage.name}
          </DrawerTitle>
        </div>
        <DrawerClose render={<Button type="button" variant="outline" />}>Close</DrawerClose>
      </div>

      <div hidden={request !== null} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        <div className="border-b border-app-line py-4">
          <label htmlFor={boxId} className={sectionLabel}>Stage date</label>
          <div className="mt-2">
            <DateBox
              opener={{
                ref: dateBox,
                onClick: (event) =>
                  ask({
                    title: `Choose the ${label} date`,
                    eyebrow: "", // The header just above already names the stage (S-33).
                    help: "Nothing is saved until you press Save this date.",
                    picking: { kind: "stage", ordinal: stage.ordinal },
                    value,
                    onPick: changeDate,
                    from: event.currentTarget,
                  }),
              }}
              id={boxId}
              value={value}
              describedBy={whenId}
              className={`w-full cursor-pointer py-2.5 pr-2.5 pl-3 hover:border-app-accent hover:bg-app-accent-tint sm:w-[220px] ${pending ? "border-dashed border-app-accent" : "border-app-field-border"}`}
            />
          </div>
          <p id={whenId} className="mt-1 text-app-small text-app-muted">
            {value ? weekdayDate(value) : "No date yet"}
            {pending && (
              <>
                {" · "}
                <strong className="font-semibold text-app-ink">not saved</strong>
              </>
            )}
          </p>
          {pending && (
            <>
              <div className="mt-3 flex items-center gap-2">
                <Button type="button" size="header" disabled={busy} aria-describedby={helpId} onClick={() => void save()}>
                  {busy ? "Saving…" : "Save this date"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="header"
                  onClick={() => {
                    changeDate(saved);
                    dateBox.current?.focus(); // Undo is about to go; the box stays (S-32).
                  }}
                >
                  Undo
                </Button>
              </div>
              <p id={helpId} className="mt-2 text-app-small text-app-grey">
                {`Saves ${label}'s date only. Other dates you've changed on the page stay unsaved until you press Save dates there.`}
              </p>
            </>
          )}
          {/* Always rendered, so the change of text is announced (Concepts in play, "A persistent live region"). */}
          <p role="status" className="mt-2 text-app-small font-semibold text-app-approved">
            {justSaved ? `${label}'s date saved.` : ""}
          </p>
          {error && (
            <div className="mt-3">
              <ErrorPanel error={error} fieldLabel={fieldLabel} focus />
            </div>
          )}
        </div>

        <section aria-labelledby={`${id}-official`} className="border-b border-app-line py-4">
          <h3 id={`${id}-official`} className={sectionLabel}>From the guidelines</h3>
          <p className={`mt-2 ${lead}`}>{stage.description}</p>
        </section>

        {stage.checkpoint && (
          <section aria-labelledby={`${id}-checkpoint`} className="border-b border-app-line py-4">
            <h3 id={`${id}-checkpoint`} className={sectionLabel}>Checkpoint</h3>
            <p className="mt-2 rounded-app-inner bg-app-inset px-3 py-2.5 text-app-base text-app-ink">{stage.checkpoint}</p>
            {!progress.ok ? (
              <p className="mt-2 text-app-small text-app-muted">{"Couldn't load the class's progress, so the counts aren't shown. Reload to try again."}</p>
            ) : progress.data.students.length === 0 ? (
              <p className="mt-2 text-app-small text-app-muted">No students in the class yet.</p>
            ) : counts && (
              <p className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-app-small text-app-grey">
                <span data-private><b className="font-semibold text-app-ink">{counts.signedOff}</b> signed off</span>
                {counts.waiting > 0 ? (
                  <Link href={`/teach/classes/${classId}/progress`} data-private className="font-semibold text-app-accent underline underline-offset-3">
                    {`${counts.waiting} waiting for you`}
                  </Link>
                ) : (
                  <span data-private><b className="font-semibold text-app-ink">0</b> waiting</span>
                )}
                <span data-private><b className="font-semibold text-app-ink">{counts.notYet}</b> not yet</span>
              </p>
            )}
          </section>
        )}

        <div className="border-b border-app-line py-4">
          <StageItems componentId={componentId} stage={stage} stages={stages} chooseDate={ask} progress={progress} />
        </div>

        {stage.prompts.length > 0 && (
          <details className="py-1.5">
            <summary className="cursor-pointer py-2.5 text-app-base font-semibold text-app-accent">
              {`Questions students get from the guidelines (${stage.prompts.length})`}
            </summary>
            <ul className="mb-2.5 flex list-disc flex-col gap-1 pl-5">
              {stage.prompts.map((prompt, i) => (
                <li key={i} className="text-app-base text-app-copy">
                  {prompt.heading && (i === 0 || stage.prompts[i - 1].heading !== prompt.heading) && (
                    <span className="block text-app-small text-app-grey">{prompt.heading}</span>
                  )}
                  {prompt.text}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {request && (
        <div role="group" aria-labelledby={`${id}-choose`} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-app-line px-4 pt-2 pb-3 sm:px-6">
            <Button type="button" variant="link" size="header" onClick={() => setRequest(null)} className="-ml-1.5">
              <span aria-hidden="true">‹ </span>
              Back to {label}
            </Button>
            {request.eyebrow && <p className="text-app-small text-app-muted">{request.eyebrow}</p>}
            <h3 id={`${id}-choose`} ref={chooseHeading} tabIndex={-1} className="font-heading text-app-title font-bold text-app-ink">
              {request.title}
            </h3>
            <p className="text-app-small text-app-grey">{request.help}</p>
          </div>
          <div ref={panel} className="flex min-h-0 flex-1 flex-col">
            <DatePickerPanel
              picking={request.picking}
              value={request.value}
              marks={marks}
              completionDate={completionDate}
              today={today}
              onPick={(iso) => {
                request.onPick(iso);
                setRequest(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
