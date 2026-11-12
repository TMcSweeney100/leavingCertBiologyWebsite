"use client";

import Link from "next/link";
import { useState } from "react";

import type { ProgressGrid as Grid, ProgressStudent } from "@/lib/api/schemas";
import {
  checkpointStages, failSentence, fullName, HIDE_NAMES_COOKIE, inOrder, revokeName, revokeQuestion, signName, stageKey, summary, undoName,
} from "@/lib/app/progress";
import { checkpointAnchor, reviewName } from "@/lib/app/ready";

import { Button, buttonVariants } from "@/components/ui/button";

import { AllView, ClassCard } from "./progress-all";
import { type CellRenderer, StageCard, StageView } from "./progress-stage";
import { CheckpointCell, RevokeStrip, SignoffAlert } from "./signoff-parts";
import { StageTabs } from "./stage-tabs";
import { card } from "./styles";
import { targetKey, useSignoffs, type SignoffTarget } from "./use-signoffs";
import { WaitingQueue } from "./waiting-queue";

/** Plan P4-11 and progress-redesign P-11: the order, each student's band, and who was signed off on each stage, as first rendered. */
function freeze(grid: Grid) {
  return {
    order: grid.students.map((s) => s.studentId),
    band: new Map(grid.students.map((s) => [s.studentId, s.behindBy])),
    signed: checkpointStages(grid).map((_, i) => new Set(grid.students.filter((s) => s.cells[i]?.state === "SIGNED_OFF").map((s) => s.studentId))),
  };
}

/**
 * The Progress tab (direction A, plan progress-redesign): the waiting requests, the stage tabs, then one stage's
 * view, or All. Rows, bands and a stage's two lists are fixed at load so nothing moves under the pointer; Re-sort
 * adopts the server's current state (plan P4-11).
 */
export function ProgressGrid({ grid, basePath, stage, hideNames }: { grid: Grid; basePath: string; stage: string; hideNames: boolean }) {
  const s = useSignoffs(grid.componentId);
  const [hidden, setHidden] = useState(hideNames);
  const [layout, setLayout] = useState(() => freeze(grid));
  const stages = checkpointStages(grid);
  const students = inOrder(grid.students, layout.order);
  const index = stages.findIndex((st) => stageKey(st) === stage);

  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    document.cookie = `${HIDE_NAMES_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  function resort() {
    setLayout(freeze(grid));
    s.resetVisit();
  }

  const target = (st: ProgressStudent, i: number): SignoffTarget => ({ student: st, checkpoint: stages[i].checkpoint });

  const cell: CellRenderer = (st, i, kind) => {
    const t = target(st, i);
    const key = targetKey(t);
    const name = fullName(st);
    const text = t.checkpoint.text;
    return (
      <CheckpointCell layout={kind} cell={st.cells[i]}
        names={{ sign: signName(text, name), undo: undoName(text, name), revoke: revokeName(text, name), review: reviewName(text, name) }}
        reviewHref={`/teach/classes/${grid.classId}/students/${st.studentId}#${checkpointAnchor(t.checkpoint.id)}`}
        busy={s.busy.get(key) ?? null} recent={s.recent.has(key)} confirming={s.confirming === key}
        onSign={() => s.signOff(t)} onUndo={() => s.undo(t)} onAsk={() => s.askRevoke(t)} />
    );
  };

  /** The revoke question and any failures in this student's row. */
  function aside(st: ProgressStudent) {
    const asking = stages.findIndex((_, i) => s.confirming === targetKey(target(st, i)));
    const failures = [...s.failed].filter(([, f]) => f.target.student.studentId === st.studentId);
    if (asking < 0 && failures.length === 0) return null;
    const t = asking >= 0 ? target(st, asking) : null;
    return (
      <div className="flex flex-col gap-2">
        {t && (
          <RevokeStrip question={revokeQuestion(t.checkpoint.text, fullName(st), "grid")} text={t.checkpoint.text} name={fullName(st)}
            busy={s.busy.has(targetKey(t))} onRevoke={() => s.revoke(t)} onKeep={s.keep} />
        )}
        {failures.map(([key, f]) => (
          <SignoffAlert key={key} message={failSentence(f.action, f.target.checkpoint.text, fullName(st))} name={fullName(st)} onRetry={() => s.retry(key)} />
        ))}
      </div>
    );
  }

  return (
    <div className={hidden ? "app-hide-names" : undefined}>
      <WaitingQueue classId={grid.classId} today={grid.today} waiting={grid.waiting} />
      <StageTabs grid={grid} current={index < 0 ? "all" : stage} basePath={basePath} />
      {index < 0 ? <ClassCard grid={grid} /> : <StageCard grid={grid} index={index} />}
      <Notice grid={grid} classId={grid.classId} />
      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        {s.changes > 0 && (
          <Button type="button" variant="outline" onClick={resort}>{`Re-sort (${s.changes} ${s.changes === 1 ? "change" : "changes"})`}</Button>
        )}
        <button type="button" role="switch" aria-checked={hidden} onClick={toggleHidden}
          className="inline-flex min-h-11 items-center gap-2.5 text-app-meta font-semibold text-app-ink touch-manipulation">
          <span aria-hidden className={`relative inline-flex h-7 w-12 flex-none rounded-full ${hidden ? "bg-app-accent" : "bg-app-switch-off"}`}>
            <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-app-surface transition-transform duration-[var(--app-duration)] motion-reduce:transition-none ${hidden ? "translate-x-5" : ""}`} />
          </span>
          Hide names
        </button>
      </div>
      {index < 0
        ? <AllView grid={grid} students={students} bandOf={(st) => layout.band.get(st.studentId) ?? st.behindBy} basePath={basePath} cell={cell} aside={aside} />
        : <StageView grid={grid} index={index} students={students} signedAtLoad={layout.signed[index] ?? new Set()} cell={cell} aside={aside} />}
      <p aria-live="polite" className="sr-only">{s.announcement}</p>
    </div>
  );
}

function Notice({ grid, classId }: { grid: Grid; classId: string }) {
  const kind = summary(grid).kind;
  if (kind !== "noDates" && kind !== "nothingDue") return null;
  return (
    <div className={`${card} mt-3 flex flex-wrap items-center justify-between gap-4 p-5`}>
      <p className="max-w-[600px] text-app-base text-app-copy">
        {kind === "noDates"
          ? "Set the stage dates on the Component tab and each checkpoint becomes due once its date passes. You can still sign off early when a student shows you their work."
          : "You can sign off a checkpoint early when a student shows you their work. It counts once its date passes."}
      </p>
      {kind === "noDates" && (
        <Link href={`/teach/classes/${classId}/component`} className={buttonVariants({ variant: "outline" })}>Go to the Component tab</Link>
      )}
    </div>
  );
}
