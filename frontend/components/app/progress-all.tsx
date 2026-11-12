"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode, useState } from "react";

import type { ProgressCell, ProgressGrid as Grid, ProgressStudent } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import {
  type Band, bandHeading, bands, checkpointStages, dotsLabel, fullName, isQuiet, lastEntryWords, shortCheckpoint, stageKey, stageLabel,
  stageStateWord, studentCount, summary,
} from "@/lib/app/progress";

import type { CellRenderer } from "./progress-stage";
import { card, eyebrow } from "./styles";
import { WorkIcon } from "./work-link";

/** All's navy card (plan progress-redesign P-19): the page's answer, and the class as up to date against behind. */
export function ClassCard({ grid }: { grid: Grid }) {
  const sum = summary(grid);
  const n = (value: number) => <span data-private className="tabular-nums">{value}</span>;
  const total = grid.students.length;
  const upToDate = grid.students.filter((st) => st.behindBy === 0).length;
  const behind = [...new Set(grid.students.map((st) => st.behindBy))].filter((b) => b > 0).sort((a, b) => b - a)
    .map((b) => ({ behindBy: b, count: grid.students.filter((st) => st.behindBy === b).length }));
  let head: ReactNode;
  let sub = "";
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
    <section aria-labelledby="class-heading" className="mt-3 rounded-app-card bg-app-accent p-[18px] text-app-on-accent">
      <p className={`${eyebrow} text-app-on-accent-muted`}>Every stage</p>
      <h2 id="class-heading" className="mt-1.5 font-heading text-[20px] leading-[1.28] font-bold tracking-[-.01em] text-balance lg:text-[22px]">{head}</h2>
      {sub && <p className="mt-1 text-app-small text-app-on-accent-muted">{sub}</p>}
      {sum.kind === "behind" && (
        <>
          <div role="img" aria-label={`${upToDate} up to date, ${total - upToDate} behind, of ${studentCount(total)}`} data-private
            className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
            {upToDate > 0 && <span className="bg-app-approved-on-accent" style={{ flexGrow: upToDate }} />}
            <span className="bg-app-attention-on-accent" style={{ flexGrow: total - upToDate }} />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-app-help text-app-on-accent-muted">
            {behind.map((g) => (
              <span key={g.behindBy} data-private>
                <b className="font-bold text-app-attention-on-accent">{g.count}</b> {g.count === 1 ? "is" : "are"} {g.behindBy} behind
              </span>
            ))}
            <span data-private><b className="font-bold text-app-approved-on-accent">{upToDate}</b> up to date</span>
          </p>
        </>
      )}
    </section>
  );
}

const DOT: Record<ProgressCell["state"], string> = {
  SIGNED_OFF: "bg-app-signed text-app-on-accent",
  DUE: "bg-app-due-tint text-app-due ring-[1.5px] ring-app-due ring-inset",
  READY: "bg-app-attention-on-accent text-app-ink",
  NOT_DUE: "bg-app-surface text-app-muted ring-[1.5px] ring-app-field-border ring-inset",
};

/**
 * Direction A's All tab (plan progress-redesign): the quiet grid at `lg:`, banded furthest behind first, with "Up to
 * date" folded except anyone waiting (P-21); below `lg:` a read-only list of stage dots (P-20). Both are rendered
 * and CSS shows one, because the server can't know the width.
 */
export function AllView({ grid, students, bandOf, basePath, cell, aside }: {
  grid: Grid; students: ProgressStudent[]; bandOf: (st: ProgressStudent) => number; basePath: string;
  cell: CellRenderer; aside: (st: ProgressStudent) => ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  const stages = checkpointStages(grid);
  const groups = bands(students, bandOf);
  const shown = (g: Band) => (g.behindBy > 0 || showAll ? g.students : g.students.filter((st) => st.cells.some((c) => c.state === "READY")));
  const fold = (g: Band) => {
    const folded = g.students.filter((st) => !st.cells.some((c) => c.state === "READY")).length;
    if (g.behindBy > 0 || folded === 0) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 bg-app-ground px-4 py-2">
        <span className="text-app-small text-app-grey">
          {showAll ? "Everyone up to date is showing." : <><span data-private>{folded}</span> more, all signed off so far</>}
        </span>
        <button type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}
          className="min-h-11 rounded-app-control border border-app-field-border bg-app-surface px-3 text-app-small font-semibold text-app-ink hover:bg-app-inset touch-manipulation">
          {showAll ? "Hide them" : `Show ${folded} more`}
        </button>
      </div>
    );
  };
  const nameCell = (st: ProgressStudent) => (
    <span className="inline-flex min-w-0 items-center">
      <Link href={`/teach/classes/${grid.classId}/students/${st.studentId}`} data-private
        className="font-semibold break-words text-app-accent underline underline-offset-3">{fullName(st)}</Link>
      {st.documentLink && <WorkIcon url={st.documentLink.url} name={fullName(st)} />}
    </span>
  );
  const columns = stages.length + 2;

  return (
    <>
      <div className="hidden lg:block">
        <div className="relative left-1/2 w-[min(1084px,calc(100vw-72px))] -translate-x-1/2">
          <div className={`${card} mt-3 overflow-x-auto`}>
            <table className="w-full table-fixed border-collapse text-left">
              <caption className="sr-only">{`Checkpoint sign-offs for ${grid.className}, grouped by how many due checkpoints each student is behind`}</caption>
              <thead>
                <tr className="border-b border-app-line">
                  <th scope="col" className="w-[236px] px-4 py-3 align-bottom text-app-small font-semibold text-app-grey">Student</th>
                  {stages.map((stage) => {
                    const state = stageStateWord(stage, grid.today);
                    return (
                      <th scope="col" key={stage.stageId} className="px-2.5 py-3 align-bottom">
                        <span className={`block ${eyebrow} text-app-muted`}>{stageLabel(stage)}</span>
                        <Link href={`${basePath}?stage=${stageKey(stage)}`} className="block text-app-small leading-tight font-semibold text-app-accent underline underline-offset-3">
                          {shortCheckpoint(stage.checkpoint.text)}
                        </Link>
                        <span className={`block text-app-label font-semibold ${state === "Due" ? "text-app-due" : "text-app-muted"}`}>
                          {state === "Due" ? "Due" : stage.dueDate ? formatCalendarDate(stage.dueDate) : "No date"}
                        </span>
                      </th>
                    );
                  })}
                  <th scope="col" className="w-[132px] px-4 py-3 align-bottom text-app-small font-semibold text-app-grey">Log</th>
                </tr>
              </thead>
              {groups.map((g) => {
                const folded = fold(g);
                return (
                  <tbody key={`${g.behindBy}-${g.students[0].studentId}`}>
                    <tr className="bg-app-ground">
                      <th scope="rowgroup" colSpan={columns} className="px-4 py-2.5 text-left"><BandHeading behindBy={g.behindBy} count={g.students.length} /></th>
                    </tr>
                    {shown(g).map((st) => {
                      const extra = aside(st);
                      return (
                        <Fragment key={st.studentId}>
                          <tr className="border-t border-app-line">
                            <th scope="row" className="px-4 py-1 text-left align-middle font-normal">{nameCell(st)}</th>
                            {stages.map((stage, i) => <td key={stage.stageId} className="p-1 align-middle">{cell(st, i, "grid")}</td>)}
                            <td className="px-4 py-1 align-middle">
                              <span data-private className={`text-app-small ${isQuiet(st.daysSinceLastLogActivity) ? "font-semibold text-app-ink" : "text-app-grey"}`}>
                                {lastEntryWords(st.daysSinceLastLogActivity)}
                              </span>
                            </td>
                          </tr>
                          {extra && <tr><td colSpan={columns} className="px-4 pb-3">{extra}</td></tr>}
                        </Fragment>
                      );
                    })}
                    {folded && <tr className="border-t border-app-line"><td colSpan={columns} className="p-0">{folded}</td></tr>}
                  </tbody>
                );
              })}
            </table>
          </div>
        </div>
      </div>

      <section aria-label="Students" className="mt-3 flex flex-col gap-3 lg:hidden">
        {groups.map((g) => (
          <div key={`${g.behindBy}-${g.students[0].studentId}`} className={`${card} overflow-hidden`}>
            <h3 className="bg-app-ground px-4 py-2.5"><BandHeading behindBy={g.behindBy} count={g.students.length} /></h3>
            <ul className="divide-y divide-app-line">
              {shown(g).map((st) => (
                <li key={st.studentId} className="flex flex-col gap-1 px-4 py-2.5">
                  {nameCell(st)}
                  <span aria-hidden className="flex gap-1.5">
                    {st.cells.map((c, i) => (
                      <span key={c.checkpointId} className={`inline-flex size-[26px] items-center justify-center rounded-full font-mono text-app-label font-bold ${DOT[c.state]}`}>
                        {c.state === "SIGNED_OFF" ? <Check className="size-3.5" strokeWidth={3} /> : stages[i] ? stageKey(stages[i]) : ""}
                      </span>
                    ))}
                  </span>
                  <span className="sr-only">{dotsLabel(st, grid)}</span>
                </li>
              ))}
            </ul>
            {fold(g)}
          </div>
        ))}
      </section>
    </>
  );
}

function BandHeading({ behindBy, count }: { behindBy: number; count: number }) {
  const { numeral, label } = bandHeading(behindBy);
  return (
    <span className="flex flex-wrap items-baseline gap-x-2.5">
      {numeral && <span className="font-heading text-app-behind-sm leading-none font-bold text-app-due tabular-nums">{numeral}</span>}
      <span className="font-heading text-app-base font-bold text-app-ink">{label}</span>
      <span className="text-app-small text-app-grey">· <span data-private>{studentCount(count)}</span></span>
    </span>
  );
}
