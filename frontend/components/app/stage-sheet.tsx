"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { type RefObject, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { ApiError } from "@/lib/api/client";
import type { ProgressGrid, TeacherComponent } from "@/lib/api/schemas";
import type { Attempt } from "@/lib/app/attempt";
import { hoursLabel, weekdayDate } from "@/lib/app/component-setup";
import type { DateMark } from "@/lib/app/date-marks";
import { ADD_ITEM, checkpointCounts, countsLabel, type DateRequest, stageItems } from "@/lib/app/stage-sheet";

import { DateBox } from "./date-box";
import { DatePickerPanel, pickedDay } from "./date-picker-panel";
import { ErrorPanel } from "./error-panel";
import { StageItemView } from "./stage-item-view";
import { StageItems } from "./stage-items";
import { StageNoteForm } from "./stage-note-form";
import { card, eyebrow } from "./styles";

type Stage = TeacherComponent["stages"][number];

/**
 * The stage sheet (plan stage-sheet, redesigned to design B by plan stage-drawer-redesign; mockups docs/design/pilot/stage-sheet/design/). A right-hand drawer opened from a
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
  /** Unsaved notes by stage id. They live in the page, like the dates, so closing the sheet keeps them (S-21). */
  noteDrafts: Record<string, string>;
  onNoteDraft: (stageId: string, text: string) => void;
  /** Unsaved dates or notes anywhere on the page. A client-side link doesn't trigger the page's leave warning. */
  hasUnsaved: boolean;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  // Keep showing the last stage while the sheet slides closed: the parent has already set `stage` to null.
  // Setting state during render from a prop is React's documented pattern for "remember the previous value".
  const [shown, setShown] = useState(props.stage);
  if (props.stage && props.stage !== shown) setShown(props.stage);
  const title = useRef<HTMLHeadingElement>(null);
  // The drawer's own props; the body gets the rest.
  const { returnFocus, onClose, hideNames, ...body } = props;

  return (
    <Drawer swipeDirection="right" open={props.stage !== null} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent initialFocus={title} finalFocus={returnFocus} className={hideNames ? "app-hide-names" : undefined}>
        {shown && <SheetBody key={shown.id} {...body} stage={shown} title={title} />}
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
  noteDrafts,
  onNoteDraft,
  hasUnsaved,
  title,
}: Omit<Parameters<typeof StageSheet>[0], "returnFocus" | "onClose" | "hideNames"> & { stage: Stage; title: RefObject<HTMLHeadingElement | null> }) {
  const id = useId();
  const dateBox = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const chooseHeading = useRef<HTMLHeadingElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const [request, setRequest] = useState<DateRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [savedAs, setSavedAs] = useState<string | null>(null);
  // The item view (plan stage-drawer-redesign R-5): an item's id, "new", or none. Like the calendar, it takes the rest's
  // place, and the rest is only `hidden`, so nothing in it is lost.
  const [item, setItem] = useState<string | null>(null);
  const itemHeading = useRef<HTMLHeadingElement>(null);
  const rest = useRef<HTMLDivElement>(null);
  /** Where focus goes when the item view closes: an item's id, or `ADD_ITEM`. */
  const itemReturn = useRef<string | null>(null);

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

  // Into the item view: focus its title. Out of it: back to the row, or to "Add an item" (S-31).
  useEffect(() => {
    if (item) {
      itemHeading.current?.focus();
      return;
    }
    const target = itemReturn.current;
    itemReturn.current = null;
    if (!target) return;
    rest.current?.querySelector<HTMLElement>(target === ADD_ITEM ? "[data-add-item]" : `[data-item="${target}"]`)?.focus();
  }, [item]);

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
  const openItem = item && item !== "new" ? (stageItems(stages, stage.id).find((i) => i.id === item) ?? null) : null;
  // An item retired elsewhere is gone after a refresh; the view then simply isn't shown.
  const viewing = item === "new" || openItem !== null;
  // The calendar's way back names where it goes (R-15).
  const backTo = item === "new" ? "the new item" : openItem ? `item ${openItem.letter}` : label;

  return (
    <>
      <div className="flex items-start gap-3 border-b border-app-line bg-app-surface px-4 pt-3 pb-3.5 sm:pt-4">
        {/* R-18: the line beside it already says "Stage 3". */}
        <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center rounded-app-card bg-app-accent font-heading text-[22px] font-bold text-app-on-accent">
          {stage.ordinal}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {meta && <p className="text-app-small text-app-muted">{meta}</p>}
          <DrawerTitle ref={title} tabIndex={-1} className="text-[20px] leading-[1.25] text-balance">
            {stage.name}
          </DrawerTitle>
        </div>
        <DrawerClose render={<Button type="button" variant="outline" />}>Close</DrawerClose>
      </div>

      <div ref={rest} hidden={request !== null || viewing} className="min-h-0 flex-1 overflow-y-auto bg-app-tray">
        <div className="border-b border-app-line bg-app-surface px-4 pt-1 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <label htmlFor={boxId} className="text-app-small font-bold text-app-ink">Stage date</label>
              <p id={whenId} className="text-app-help text-app-muted">
                {value ? weekdayDate(value) : "No date yet"}
                {pending && (
                  <>
                    {" · "}
                    <strong className="font-semibold text-app-ink">not saved</strong>
                  </>
                )}
              </p>
            </div>
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
              className={`w-[172px] flex-none cursor-pointer py-2.5 pr-2.5 pl-3 hover:border-app-accent hover:bg-app-accent-tint ${pending ? "border-dashed border-app-accent" : "border-app-field-border"}`}
            />
          </div>
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
                  disabled={busy}
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
          <p role="status" className="text-app-small font-semibold text-app-approved">
            {justSaved ? `${label}'s date saved.` : ""}
          </p>
          {error && (
            <div className="mt-3">
              <ErrorPanel error={error} fieldLabel={fieldLabel} focus />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 p-3">
          {stage.checkpoint && (
            <section aria-labelledby={`${id}-checkpoint`} className="rounded-app-card bg-app-accent p-[18px] text-app-on-accent">
              <h3 id={`${id}-checkpoint`} className={`${eyebrow} text-app-on-accent-muted`}>Checkpoint</h3>
              <p className="mt-1.5 font-heading text-[20px] leading-[1.28] font-bold tracking-[-.01em] text-balance">{stage.checkpoint}</p>
              {!progress.ok ? (
                <p className="mt-3 text-app-small text-app-on-accent-muted">{"Couldn't load the class's progress, so the counts aren't shown. Reload to try again."}</p>
              ) : progress.data.students.length === 0 ? (
                <p className="mt-3 text-app-small text-app-on-accent-muted">No students in the class yet.</p>
              ) : counts && (
                <>
                  <div role="img" aria-label={countsLabel(counts)} data-private className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
                    {counts.signedOff > 0 && <span className="bg-app-approved-on-accent" style={{ flexGrow: counts.signedOff }} />}
                    {counts.waiting > 0 && <span className="bg-app-attention-on-accent" style={{ flexGrow: counts.waiting }} />}
                    {counts.notYet > 0 && <span className="bg-app-accent-track" style={{ flexGrow: counts.notYet }} />}
                  </div>
                  <p className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-app-help text-app-on-accent-muted">
                    <span data-private><b className="font-bold text-app-approved-on-accent">{counts.signedOff}</b> signed off</span>
                    {counts.waiting === 0 && <span data-private><b className="font-bold text-app-on-accent">0</b> waiting</span>}
                    <span data-private><b className="font-bold text-app-on-accent">{counts.notYet}</b> not yet</span>
                  </p>
                  {counts.waiting > 0 && (
                    <Link
                      href={`/teach/classes/${classId}/progress`}
                      data-private
                      onClick={(event) => {
                        if (hasUnsaved && !window.confirm("Leave without saving your changes?")) event.preventDefault();
                      }}
                      className="mt-3 flex min-h-11 items-center justify-between rounded-app-control bg-app-attention-tint px-3 text-app-small font-bold text-app-attention focus-visible:outline-app-on-accent"
                    >
                      {`${counts.waiting} waiting for you`}
                      <span aria-hidden="true">›</span>
                    </Link>
                  )}
                </>
              )}
            </section>
          )}

          <section aria-labelledby={`${id}-official`} className={`${card} px-[18px] py-4`}>
            <h3 id={`${id}-official`} className="flex items-center gap-2 font-heading text-app-base font-bold text-app-accent">
              <BookOpen aria-hidden="true" className="size-[17px]" />
              From the guidelines
            </h3>
            <p className="mt-2 text-app-base leading-normal text-pretty text-app-ink">{stage.description}</p>
          </section>

          <StageNoteForm
            componentId={componentId}
            stageId={stage.id}
            note={stage.note}
            draft={noteDrafts[stage.id] ?? stage.note?.text ?? ""}
            onDraft={(text) => onNoteDraft(stage.id, text)}
          />

          <div className={`${card} px-[18px] py-4`}>
            <StageItems stage={stage} stages={stages} progress={progress} onOpen={setItem} />
          </div>

          {stage.prompts.length > 0 && (
            <details className={`${card} px-[18px] py-1.5`}>
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
      </div>

      {viewing && (
        <div hidden={request !== null} className="flex min-h-0 flex-1 flex-col">
          <StageItemView
            key={item}
            componentId={componentId}
            stage={stage}
            item={openItem}
            progress={progress}
            chooseDate={ask}
            heading={itemHeading}
            onBack={(focus) => {
              itemReturn.current = focus;
              setItem(null);
            }}
          />
        </div>
      )}

      {request && (
        <div role="group" aria-labelledby={`${id}-choose`} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-app-line px-4 pt-2 pb-3 sm:px-6">
            <Button type="button" variant="link" size="header" onClick={() => setRequest(null)} className="-ml-1.5">
              <span aria-hidden="true">‹ </span>
              Back to {backTo}
            </Button>
            {request.eyebrow && <p className="text-app-small text-app-muted">{request.eyebrow}</p>}
            <h3 id={`${id}-choose`} ref={chooseHeading} tabIndex={-1} className="font-heading text-app-title font-bold break-words text-app-ink">
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
