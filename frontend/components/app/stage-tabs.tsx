"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { ProgressGrid } from "@/lib/api/schemas";
import { shortCheckpoint, stageKey, stageLabel, tabLine } from "@/lib/app/progress";
import { checkpointCounts } from "@/lib/app/stage-sheet";

import { card, eyebrow } from "./styles";

const TAB = "flex min-w-[112px] flex-1 flex-col gap-1.5 rounded-app-control px-2.5 pt-2 pb-2.5";
const LINK = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent touch-manipulation";

/**
 * Direction A's stage tabs (plan progress-redesign P-15): All, then every stage, each a link to its `?stage=` view
 * with a small bar of who's signed off. They're links, not ARIA tabs, because each loads its own view, and they're
 * named by their visible words. On a narrow screen the row scrolls sideways, with the current stage brought into
 * view by setting the row's own scroll position (`scrollIntoView` could move the whole page).
 */
export function StageTabs({ grid, current, basePath }:
  { grid: Pick<ProgressGrid, "stages" | "students" | "today">; current: string; basePath: string }) {
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const row = nav.current;
    const on = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (row && on) row.scrollLeft = on.offsetLeft - (row.clientWidth - on.clientWidth) / 2;
  }, [current]);

  const tone = (on: boolean) => (on ? "bg-app-accent text-app-on-accent" : "text-app-ink hover:bg-app-inset");
  const quiet = (on: boolean) => (on ? "text-app-on-accent-muted" : "text-app-grey");
  const allOn = current === "all";

  return (
    <nav ref={nav} aria-label="Stages" className={`${card} relative mt-3 flex gap-1 overflow-x-auto p-1.5 [scrollbar-width:none]`}>
      <Link href={`${basePath}?stage=all`} aria-current={allOn ? "page" : undefined} className={`${TAB} ${tone(allOn)} ${LINK}`}>
        <span className={`${eyebrow} ${quiet(allOn)}`}>All</span>
        <span className="min-h-[2.5em] text-app-small leading-tight font-semibold">Every stage</span>
        <span className={`text-app-label ${quiet(allOn)}`}>Overview</span>
      </Link>
      {grid.stages.map((stage) => {
        if (!stage.checkpoint) {
          return (
            <div key={stage.stageId} className={`${TAB} text-app-muted`}>
              <span className={`${eyebrow} text-app-muted`}>{stageLabel(stage)}</span>
              <span className="min-h-[2.5em] text-app-small leading-tight font-semibold">{stage.name}</span>
              <span className="text-app-label">Nothing to sign off</span>
            </div>
          );
        }
        const key = stageKey(stage);
        const on = key === current;
        const counts = checkpointCounts(grid, stage.stageId);
        const line = tabLine(stage, counts ? counts.waiting + counts.notYet : 0, grid.today);
        return (
          <Link key={stage.stageId} href={`${basePath}?stage=${key}`} aria-current={on ? "page" : undefined} className={`${TAB} ${tone(on)} ${LINK}`}>
            <span className={`${eyebrow} ${quiet(on)}`}>{stageLabel(stage)}</span>
            <span className="min-h-[2.5em] text-app-small leading-tight font-semibold">{shortCheckpoint(stage.checkpoint.text)}</span>
            <span aria-hidden data-private className={`flex h-[5px] overflow-hidden rounded-full ${on ? "bg-app-accent-track" : "bg-app-inset"}`}>
              {counts && counts.signedOff > 0 && <span className={on ? "bg-app-approved-on-accent" : "bg-app-signed"} style={{ flexGrow: counts.signedOff }} />}
              {counts && counts.waiting > 0 && <span className="bg-app-attention-on-accent" style={{ flexGrow: counts.waiting }} />}
              {counts && counts.notYet > 0 && <span style={{ flexGrow: counts.notYet }} />}
            </span>
            <span data-private className={`text-app-label font-semibold ${on ? "text-app-on-accent-muted" : line.endsWith("to sign off") ? "text-app-due" : "text-app-grey"}`}>
              {line}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
