import Link from "next/link";

import type { GridStage } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { pickName, shortCheckpoint, stageKey, stageLabel, stageStateWord } from "@/lib/app/progress";

import { eyebrow } from "./styles";

/** Pack D-7's checkpoint view: All stages, or one checkpoint, as URLs (not tabs: each choice is a page state). */
export function StagePicker({ stages, today, current, basePath, variant }:
  { stages: GridStage[]; today: string; current: string; basePath: string; variant: "laptop" | "phone" }) {
  const href = (key: string) => `${basePath}?stage=${key}`;
  const laptop = variant === "laptop";
  const item = laptop
    ? "flex min-h-[72px] flex-1 flex-col gap-0.5 rounded-app-control border px-3 py-2 text-left"
    : "flex size-11 min-h-12 items-center justify-center rounded-app-control border font-mono text-app-base font-bold";
  const state = (on: boolean) => (on ? "border-app-accent bg-app-accent-tint text-app-accent" : "border-app-field-border bg-app-surface text-app-ink hover:bg-app-inset");

  return (
    <nav aria-label="Checkpoint view" className="mt-5">
      <ul className={`flex ${laptop ? "gap-2" : "flex-wrap gap-1.5"}`}>
        <li className={laptop ? "flex flex-[1.3]" : ""}>
          <Link href={href("all")} aria-label="All stages" aria-current={current === "all" ? "true" : undefined} className={`${item} ${state(current === "all")}`}>
            {laptop ? <><span className={eyebrow}>All</span><span className="text-app-small font-semibold">All stages</span><span className="text-app-label text-app-grey">Every checkpoint</span></> : "All"}
          </Link>
        </li>
        {stages.map((s) => {
          const key = stageKey(s);
          if (!s.checkpoint) {
            return (
              <li key={s.stageId} className={laptop ? "flex flex-1" : ""}>
                <span aria-label={`${stageLabel(s)}, no checkpoint`} className={`${item} border-dashed border-app-field-border text-app-muted`}>
                  {laptop ? <><span className={eyebrow}>{stageLabel(s)}</span><span className="text-app-small">No checkpoint</span><span className="text-app-label">Nothing to sign off</span></> : s.ordinal}
                </span>
              </li>
            );
          }
          const on = current === key;
          return (
            <li key={s.stageId} className={laptop ? "flex flex-1" : ""}>
              <Link href={href(key)} aria-label={pickName(s, today)} aria-current={on ? "true" : undefined}
                className={`${item} ${state(on)}`}>
                {laptop ? (
                  <>
                    <span className={eyebrow}>{stageLabel(s)}</span>
                    <span className="text-app-small font-semibold">{shortCheckpoint(s.checkpoint.text)}</span>
                    <span className="font-mono text-app-label text-app-grey">{s.dueDate ? formatCalendarDate(s.dueDate) : "No date set"}</span>
                    <span className={`text-app-label font-semibold ${stageStateWord(s, today) === "Due" ? "text-app-due" : "text-app-muted"}`}>{stageStateWord(s, today)}</span>
                  </>
                ) : key}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
