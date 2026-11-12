"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ProgressGrid as Grid, ProgressStudent } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { behindWords, checkpointStages, fullName, isQuiet, lastEntryWords, splitByStage, stageLabel } from "@/lib/app/progress";
import { checkpointCounts } from "@/lib/app/stage-sheet";

import { CountsBar } from "./counts-bar";
import { card, eyebrow } from "./styles";
import { WorkIcon } from "./work-link";

export type CellRenderer = (st: ProgressStudent, index: number, layout: "grid" | "card" | "row") => ReactNode;

/** The chosen stage's navy card (design B): the checkpoint, its bar and its counts. */
export function StageCard({ grid, index }: { grid: Grid; index: number }) {
  const stage = checkpointStages(grid)[index];
  const counts = checkpointCounts(grid, stage.stageId);
  const due = stage.dueDate ? `due ${formatCalendarDate(stage.dueDate)}` : "no date set";
  return (
    <section aria-labelledby="stage-heading" className="mt-3 rounded-app-card bg-app-accent p-[18px] text-app-on-accent">
      <p className={`${eyebrow} text-app-on-accent-muted`}>{`${stageLabel(stage)} · ${stage.name} · ${due}`}</p>
      <h2 id="stage-heading" className="mt-1.5 font-heading text-[20px] leading-[1.28] font-bold tracking-[-.01em] text-balance lg:text-[22px]">
        {stage.checkpoint.text}
      </h2>
      {counts && grid.students.length > 0 && <CountsBar counts={counts} showWaiting />}
    </section>
  );
}

/**
 * Direction A's stage view (plan progress-redesign): who's still to sign off, furthest behind first, one button
 * each; then who was signed off, folded. Which list a student is in is frozen at load (P-11), so a row signed off
 * here stays put with Undo. The headings count the truth, so they move as she works and always match the card.
 */
export function StageView({ grid, index, students, signedAtLoad, cell, aside }: {
  grid: Grid; index: number; students: ProgressStudent[]; signedAtLoad: ReadonlySet<string>;
  cell: CellRenderer; aside: (st: ProgressStudent) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { left, signed } = splitByStage(students, signedAtLoad);
  const signedNow = students.filter((st) => st.cells[index]?.state === "SIGNED_OFF").length;
  const rowOf = (st: ProgressStudent, layout: "row" | "card") => (
    <StudentRow key={st.studentId} st={st} classId={grid.classId} action={cell(st, index, layout)} extra={aside(st)} />
  );

  return (
    <>
      <section aria-labelledby="left-heading" className={`${card} mt-3`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-app-line px-[18px] py-3.5">
          <h3 id="left-heading" className="font-heading text-app-base font-bold text-app-ink">
            Still to sign off · <span data-private className="tabular-nums">{students.length - signedNow}</span>
          </h3>
          {left.length > 1 && <p className="text-app-small text-app-grey">Furthest behind first</p>}
        </div>
        {left.length === 0
          ? <p className="px-[18px] py-4 text-app-base text-app-grey">Everyone is signed off for this stage.</p>
          : <ul className="divide-y divide-app-line">{left.map((st) => rowOf(st, "row"))}</ul>}
      </section>

      {signed.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen} className={`${card} mt-3`}>
          <div className="flex items-center justify-between gap-3 px-[18px] py-3">
            <div className="flex min-w-0 flex-col">
              <h3 className="font-heading text-app-base font-bold text-app-ink">
                Signed off · <span data-private className="tabular-nums">{signedNow}</span>
              </h3>
              {!open && (
                <p data-private className="truncate text-app-small text-app-grey">
                  {signed.slice(0, 3).map(fullName).join(", ")}{signed.length > 3 ? ` and ${signed.length - 3} more` : ""}
                </p>
              )}
            </div>
            <CollapsibleTrigger aria-label={`${open ? "Hide" : "Show"} signed-off students`} className={cn(buttonVariants({ variant: "outline" }))}>
              {open ? "Hide" : "Show"}
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <ul className="divide-y divide-app-line border-t border-app-line">{signed.map((st) => rowOf(st, "card"))}</ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}

/** One student in a stage list: how far behind (a square for the eye, words for everyone), the name and work link, the log, the action. */
function StudentRow({ st, classId, action, extra }: { st: ProgressStudent; classId: string; action: ReactNode; extra: ReactNode }) {
  const name = fullName(st);
  return (
    <li className="flex flex-col gap-2 px-[18px] py-2.5">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <span aria-hidden
          className={`flex size-9 flex-none items-center justify-center rounded-app-control font-heading text-app-base font-bold ${st.behindBy > 0 ? "bg-app-due-tint text-app-due" : "bg-app-inset text-app-grey"}`}>
          {st.behindBy}
        </span>
        <div className="flex min-w-0 flex-1 basis-48 flex-col">
          <span className="inline-flex min-w-0 items-center">
            <Link href={`/teach/classes/${classId}/students/${st.studentId}`} data-private
              className="font-semibold break-words text-app-accent underline underline-offset-3">{name}</Link>
            {st.documentLink && <WorkIcon url={st.documentLink.url} name={name} />}
          </span>
          <span className="text-app-small text-app-grey">
            <span className={st.behindBy > 0 ? "font-semibold text-app-due" : undefined}>{behindWords(st.behindBy)}</span>
            {" · "}
            <span data-private className={isQuiet(st.daysSinceLastLogActivity) ? "font-semibold text-app-ink" : undefined}>
              {lastEntryWords(st.daysSinceLastLogActivity)}
            </span>
          </span>
        </div>
        {action}
      </div>
      {extra}
    </li>
  );
}
