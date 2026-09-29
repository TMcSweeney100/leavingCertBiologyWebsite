"use client";

import Link from "next/link";
import { Fragment, type ReactNode, useState } from "react";

import type { GridStage, ProgressGrid as Grid, ProgressStudent } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import {
  bandHeading, bands, behindWords, checkpointStages, failSentence, fullName, HIDE_NAMES_COOKIE, inOrder, isQuiet, lastEntryWords,
  missingText, revokeQuestion, revokeName, shortCheckpoint, signName, stageKey, stageLabel, stageStateWord, studentCount, summary, undoName,
} from "@/lib/app/progress";

import { Button, buttonVariants } from "@/components/ui/button";

import { CheckpointCell, RevokeStrip, SignoffAlert } from "./signoff-parts";
import { StagePicker } from "./stage-picker";
import { card, eyebrow, sectionTitle } from "./styles";
import { targetKey, useSignoffs, type SignoffTarget } from "./use-signoffs";

type Staged = GridStage & { checkpoint: NonNullable<GridStage["checkpoint"]> };

function freeze(students: ProgressStudent[]) {
  return { order: students.map((s) => s.studentId), band: new Map(students.map((s) => [s.studentId, s.behindBy])) };
}

/**
 * The Progress tab (pack D-7, direction 1b "Bands"). Rows and bands are fixed at load so nothing moves under the
 * pointer; Re-sort adopts the server's current order (plan P4-11). Both layouts are rendered and CSS shows one per
 * width, because the phone defaults to a different stage and the server can't know the width (plan P4-27).
 */
export function ProgressGrid({ grid, basePath, laptopStage, phoneStage, hideNames }:
  { grid: Grid; basePath: string; laptopStage: string; phoneStage: string; hideNames: boolean }) {
  const s = useSignoffs(grid.componentId);
  const [hidden, setHidden] = useState(hideNames);
  const [layout, setLayout] = useState(() => freeze(grid.students));
  const stages = checkpointStages(grid);
  const groups = bands(inOrder(grid.students, layout.order), (st) => layout.band.get(st.studentId) ?? st.behindBy);

  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    document.cookie = `${HIDE_NAMES_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  function resort() {
    setLayout(freeze(grid.students));
    s.resetVisit();
  }

  const target = (st: ProgressStudent, stage: Staged): SignoffTarget => ({ student: st, checkpoint: stage.checkpoint });

  function cell(st: ProgressStudent, stage: Staged, index: number, layoutKind: "grid" | "one") {
    const t = target(st, stage);
    const key = targetKey(t);
    const name = fullName(st);
    return (
      <CheckpointCell layout={layoutKind} cell={st.cells[index]}
        names={{ sign: signName(stage.checkpoint.text, name), undo: undoName(stage.checkpoint.text, name), revoke: revokeName(stage.checkpoint.text, name) }}
        busy={s.busy?.key === key ? s.busy.action : null} recent={s.recent.has(key)} confirming={s.confirming === key}
        onSign={() => s.signOff(t)} onUndo={() => s.undo(t)} onAsk={() => s.askRevoke(t)} />
    );
  }

  /** The revoke question or the failure for this student's row, if either belongs to it. */
  function aside(st: ProgressStudent) {
    const asking = stages.find((stage) => s.confirming === targetKey(target(st, stage)));
    const failed = s.failed && s.failed.target.student.studentId === st.studentId ? s.failed : null;
    if (asking) {
      const t = target(st, asking);
      return <RevokeStrip question={revokeQuestion(asking.checkpoint.text, fullName(st), "grid")} text={asking.checkpoint.text} name={fullName(st)}
        busy={s.busy?.key === targetKey(t)} onRevoke={() => s.revoke(t)} onKeep={s.keep} />;
    }
    if (failed) return <SignoffAlert message={failSentence(failed.action, failed.target.checkpoint.text, fullName(st))} name={fullName(st)} onRetry={s.retry} />;
    return null;
  }

  const oneLaptop = stages.findIndex((stage) => stageKey(stage) === laptopStage);
  const onePhone = stages.findIndex((stage) => stageKey(stage) === phoneStage);

  return (
    <div className={hidden ? "app-hide-names" : undefined}>
      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <Answer grid={grid} />
        <div className="flex flex-wrap items-center gap-3">
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
      </div>
      <Notice grid={grid} classId={grid.classId} />

      <div className="hidden lg:block">
        <StagePicker stages={grid.stages} today={grid.today} current={laptopStage} basePath={basePath} variant="laptop" />
        <div className="relative left-1/2 w-[min(1084px,calc(100vw-72px))] -translate-x-1/2">
          <div className={`${card} mt-4 overflow-x-auto`}>
            <table className="w-full table-fixed border-collapse text-left">
              <caption className="sr-only">{`Checkpoint sign-offs for ${grid.className}, grouped by how many due checkpoints each student is behind`}</caption>
              <thead>
                <tr className="border-b border-app-line">
                  <th scope="col" className="w-[196px] px-4 py-3 text-app-small font-semibold text-app-grey">Student</th>
                  {oneLaptop < 0 ? stages.map((stage) => (
                    <th scope="col" key={stage.stageId} className="px-2.5 py-3 align-top">
                      <span className={`block ${eyebrow} text-app-grey`}>{stageLabel(stage)}</span>
                      <Link href={`${basePath}?stage=${stageKey(stage)}`} className="block text-app-small font-semibold text-app-accent underline underline-offset-3">
                        {shortCheckpoint(stage.checkpoint.text)}
                      </Link>
                      <span className={`block text-app-label font-semibold ${stageStateWord(stage, grid.today) === "Due" ? "text-app-due" : "text-app-muted"}`}>
                        {stageStateWord(stage, grid.today)}
                      </span>
                    </th>
                  )) : (
                    <th scope="col" className="px-4 py-3 align-top">
                      <span className={`block ${eyebrow} text-app-grey`}>{`${stageLabel(stages[oneLaptop])}: ${stages[oneLaptop].name}`}</span>
                      <span className="block text-app-base font-semibold text-app-ink">{stages[oneLaptop].checkpoint.text}</span>
                      <span className="block font-mono text-app-label text-app-grey">
                        {stages[oneLaptop].dueDate ? formatCalendarDate(stages[oneLaptop].dueDate as string) : "No date set"} · {stageStateWord(stages[oneLaptop], grid.today)}
                      </span>
                    </th>
                  )}
                  <th scope="col" className="w-[134px] px-4 py-3 text-app-small font-semibold text-app-grey">Log</th>
                </tr>
              </thead>
              {groups.map((g) => {
                const columns = (oneLaptop < 0 ? stages.length : 1) + 2;
                return (
                  <tbody key={`${g.behindBy}-${g.students[0].studentId}`}>
                    <tr className="bg-app-ground">
                      <th scope="rowgroup" colSpan={columns} className="px-4 py-3 text-left"><BandHeading behindBy={g.behindBy} count={g.students.length} /></th>
                    </tr>
                    {g.students.map((st) => {
                      const extra = aside(st);
                      return (
                        <Fragment key={st.studentId}>
                          <tr className="border-t border-app-line">
                            <th scope="row" className="px-4 py-2 text-left align-top font-normal">
                              <Link href={`/teach/classes/${grid.classId}/students/${st.studentId}`} data-private
                                className="block font-semibold text-app-accent underline underline-offset-3 break-words">{fullName(st)}</Link>
                              <span className="block text-app-small text-app-grey">{behindWords(st.behindBy)}</span>
                            </th>
                            {oneLaptop < 0
                              ? stages.map((stage, i) => <td key={stage.stageId} className="p-1 align-top">{cell(st, stage, i, "grid")}</td>)
                              : <td className="px-4 py-2 align-top">{cell(st, stages[oneLaptop], oneLaptop, "one")}</td>}
                            <td className="px-4 py-2 align-top">
                              <span data-private className={`text-app-small ${isQuiet(st.daysSinceLastLogActivity) ? "font-semibold text-app-ink" : "text-app-grey"}`}>
                                {lastEntryWords(st.daysSinceLastLogActivity)}
                              </span>
                            </td>
                          </tr>
                          {extra && <tr><td colSpan={columns} className="px-4 pb-3">{extra}</td></tr>}
                        </Fragment>
                      );
                    })}
                  </tbody>
                );
              })}
            </table>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <StagePicker stages={grid.stages} today={grid.today} current={phoneStage} basePath={basePath} variant="phone" />
        {onePhone >= 0 ? (
          <div className={`${card} mt-3 flex flex-col gap-1 p-4`}>
            <p className="flex flex-wrap gap-x-3 text-app-small">
              <span className="font-semibold text-app-ink">{stageLabel(stages[onePhone])}</span>
              <span className="font-mono text-app-grey">{stages[onePhone].dueDate ? formatCalendarDate(stages[onePhone].dueDate as string) : "No date set"}</span>
              <span className="font-semibold">{stageStateWord(stages[onePhone], grid.today)}</span>
            </p>
            <p className="text-app-base text-app-ink">{stages[onePhone].checkpoint.text}</p>
          </div>
        ) : (
          <p className="mt-3 text-app-small text-app-grey">All checkpoints. Pick a stage number to sign off.</p>
        )}
        <section aria-label="Students" className="mt-4 flex flex-col gap-5">
          {groups.map((g) => (
            <div key={`${g.behindBy}-${g.students[0].studentId}`}>
              <h3><BandHeading behindBy={g.behindBy} count={g.students.length} /></h3>
              <ul className={`${card} mt-2 divide-y divide-app-line`}>
                {g.students.map((st) => (
                  <li key={st.studentId} className="flex flex-col gap-2 p-4">
                    <div className="flex flex-col gap-0.5">
                      <Link href={`/teach/classes/${grid.classId}/students/${st.studentId}`} data-private
                        className="font-semibold text-app-accent underline underline-offset-3 break-words">{fullName(st)}</Link>
                      <span className="text-app-small text-app-grey">{behindWords(st.behindBy)}</span>
                      <span data-private className={`text-app-small ${isQuiet(st.daysSinceLastLogActivity) ? "font-semibold text-app-ink" : "text-app-grey"}`}>
                        {lastEntryWords(st.daysSinceLastLogActivity)}
                      </span>
                      {onePhone < 0 && missingText(st, grid) && <span className="text-app-small text-app-due">{missingText(st, grid)}</span>}
                    </div>
                    {onePhone >= 0 && cell(st, stages[onePhone], onePhone, "one")}
                    {aside(st)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>

      <p aria-live="polite" className="sr-only">{s.announcement}</p>
    </div>
  );
}

function BandHeading({ behindBy, count }: { behindBy: number; count: number }) {
  const { numeral, label } = bandHeading(behindBy);
  return (
    <span className="flex flex-wrap items-baseline gap-x-2.5">
      {numeral && <span className="font-heading text-app-behind-sm font-bold leading-none tabular-nums text-app-due lg:text-app-behind">{numeral}</span>}
      <span className={`font-heading font-bold ${numeral ? "text-app-base text-app-ink" : "text-app-section text-app-ink"}`}>{label}</span>
      <span className="text-app-small text-app-grey">· <span data-private>{studentCount(count)}</span></span>
    </span>
  );
}

function Answer({ grid }: { grid: Grid }) {
  const sum = summary(grid);
  const n = (value: number) => <span data-private className="tabular-nums">{value}</span>;
  let head: ReactNode;
  let sub: string;
  switch (sum.kind) {
    case "noDates":
      head = "No stage dates yet";
      sub = "Nothing can be due until the stages have dates.";
      break;
    case "nothingDue":
      head = "Nothing is due yet";
      sub = sum.next ? `${sum.next.label}’s checkpoint is due on ${sum.next.date}.` : "";
      break;
    case "upToDate":
      head = <>All {n(sum.total)} {sum.total === 1 ? "student is" : "students are"} up to date</>;
      sub = `Every checkpoint due so far (${sum.due}) is signed off.${sum.next ? ` ${sum.next.label}’s is next, on ${sum.next.date}.` : ""}`;
      break;
    case "behind":
      head = <>{n(sum.behind)} of {n(sum.total)} students {sum.behind === 1 ? "is" : "are"} behind</>;
      sub = `${sum.due} ${sum.dueCount > 1 ? "are" : "is"} due. Furthest behind first.${sum.noCheckpoint.map((l) => ` ${l} has no checkpoint.`).join("")}`;
      break;
  }
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h2 className={sectionTitle}>{head}</h2>
      {sub && <p className="text-app-base text-app-grey">{sub}</p>}
    </div>
  );
}

function Notice({ grid, classId }: { grid: Grid; classId: string }) {
  const kind = summary(grid).kind;
  if (kind !== "noDates" && kind !== "nothingDue") return null;
  return (
    <div className={`${card} mt-4 flex flex-wrap items-center justify-between gap-4 p-5`}>
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
