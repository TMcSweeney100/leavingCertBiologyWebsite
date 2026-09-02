import { StageDot } from "@/components/bipi/stage-dot";
import type { StageState } from "@/lib/schedule.types";
import type { StageWithState } from "@/lib/schedule";

/**
 * Laptop-only stage stepper — one column per stage, all seven including the
 * two 5th-Year stages and the catch-up window
 * (design_handoff_bipi_schedule/README.md §1, "Laptop only — stepper").
 * It sits at the foot of the header's white band, so it reads as part of
 * the masthead rather than as a section of its own.
 *
 * It is a summary of information the timeline below states in full, so it
 * is `aria-hidden`: to a screen reader, reading seven stage labels and
 * dates here and then again as headings twenty lines later is repetition,
 * not orientation. Nothing in it is interactive, so nothing becomes
 * unreachable. (Same reasoning as sticky-now-bar.tsx.)
 *
 * The connector after the last column is dropped rather than drawn: at
 * `repeat(7, 1fr)` the final line would run to the right edge of the header
 * and point at nothing.
 */

type StepperProps = {
  stages: StageWithState[];
};

const LABEL_COLOR: Record<StageState, string> = {
  current: "text-(--bipi-now)",
  done: "text-(--bipi-ink-2)",
  upcoming: "text-muted-foreground",
};

export function Stepper({ stages }: StepperProps) {
  return (
    <div aria-hidden="true" className="mt-6.5 hidden grid-cols-7 lg:grid">
      {stages.map((stage, index) => (
        <div key={stage.id} className="flex flex-col gap-2.25">
          {/* Fixed to the tallest dot (the 16px current one) so every
              column's label starts on the same line — without it the current
              column alone is pushed 4px down by its larger dot. */}
          <div className="flex h-4 items-center">
            <StageDot state={stage.state} />
            {index < stages.length - 1 && (
              <div
                className={`h-0.5 [flex:1_1_auto] ${
                  stage.state === "done" ? "bg-(--bipi-done) opacity-50" : "bg-border"
                }`}
              />
            )}
          </div>
          <div className="pr-3.5">
            <p
              className={`font-mono text-label leading-[1.2] font-bold tracking-[.08em] uppercase ${LABEL_COLOR[stage.state]}`}
            >
              {stage.label}
            </p>
            <p className="mt-0.75 font-sans text-label leading-[1.3] text-muted-foreground tabular-nums">
              {stage.shortDate}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
