import { Progress } from "@/components/ui/progress";
import { TERM } from "@/lib/schedule.data";
import type { StageState } from "@/lib/schedule.data";
import { TERM_SPAN_LABEL, termPositionPct, type StageWithState } from "@/lib/schedule";

/**
 * The laptop term ruler — the two-pixel track inside the "You are here"
 * panel that carries today's marker and one tick per deadline
 * (design_handoff_bipi_schedule/README.md §3). It replaces the mobile 6px
 * bar above 1024px; the two are never both in the layout.
 *
 * The thing that makes it worth building: **ticks are positioned by real
 * elapsed time**, not spread evenly, so the October crunch looks like a
 * crunch. That is information design rather than decoration, and it is why
 * `termPositionPct` lives in `lib/schedule.ts` with tests rather than being
 * computed inline here.
 *
 * **Edge clamping.** Every tick wrapper is 74px wide and centred on its
 * date — except at the extremes, where centring would push half the label
 * outside the panel. A tick above 88% anchors to the right edge and
 * right-aligns its text; one below 6% anchors left. Without this the
 * December tick (99.02% this year) overhangs, which is the single layout
 * failure the implementation plan calls out by name — there is a test
 * pinning that date above the threshold.
 *
 * **Motion** (plan §1.3 suggestion ②) is the only animation on the site:
 * on load the marker travels from the start of term to today while the fill
 * grows under it. See the keyframes in globals.css for why it encodes the
 * content rather than dressing it up, and `motion-reduce:animate-none`
 * below for the reduced-motion path.
 *
 * The band is a `Progress` whose children are the marker and the ticks.
 * Children of a `role="progressbar"` are presentational, which is the right
 * outcome here: the tick dates all appear again as real text in the cards
 * below and in the aside, so announcing five more date fragments inside a
 * progress bar would be noise. The visible label row above the band stays
 * outside it, as ordinary text.
 */

type TermRulerProps = {
  /** All stages; the two always-done 5th-Year ones get no tick. */
  stages: StageWithState[];
  /** Percentage of the term elapsed, already clamped by `deriveSchedule`. */
  termPct: number;
  weekNumber: number;
  className?: string;
};

const TICK_COLOR: Record<StageState, string> = {
  current: "bg-(--bipi-now)",
  done: "bg-(--bipi-done)",
  // §1.1③ — was #C4C7CE at 1.69:1 against white, which fails WCAG 1.4.11
  // for a graphic that encodes state. See the token note in globals.css.
  upcoming: "bg-(--bipi-tick-idle)",
};

const TICK_DATE_COLOR: Record<StageState, string> = {
  current: "text-(--bipi-now)",
  done: "text-(--bipi-ink-2)",
  upcoming: "text-muted-foreground",
};

/** Where a tick's 74px label wrapper anchors, given its position on the track. */
function tickAnchor(pct: number) {
  if (pct > 88) return { wrap: "right-0 text-right", tick: "ml-auto", style: undefined };
  if (pct < 6) return { wrap: "left-0 text-left", tick: "mr-auto", style: undefined };
  return { wrap: "-translate-x-1/2 text-center", tick: "mx-auto", style: { left: `${pct}%` } };
}

export function TermRuler({ stages, termPct, weekNumber, className }: TermRulerProps) {
  const ticks = stages.filter((stage) => !stage.isAlwaysDone);

  return (
    <div className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4 font-mono text-chip font-bold tracking-[.1em] text-muted-foreground uppercase">
        <span>
          Week {weekNumber} of {TERM.weeks}
        </span>
        <span className="tabular-nums">
          {TERM_SPAN_LABEL} · {termPct}% elapsed
        </span>
      </div>

      <Progress
        value={termPct}
        locale="en-IE"
        aria-label="Term elapsed"
        className="relative block h-[46px] gap-0"
        trackClassName="absolute inset-x-0 top-0 h-0.5"
        indicatorClassName="rounded-full animate-[bipi-ruler-fill_400ms_ease-out_both] motion-reduce:animate-none"
      >
        {/* Today. The one place other than the current stage where
            `--bipi-now` is allowed to appear. */}
        <div
          style={{ left: `${termPct}%` }}
          className="absolute top-[-4px] z-1 size-2.25 -translate-x-1/2 rounded-full bg-(--bipi-now) shadow-[0_0_0_4px_oklch(0.52_0.14_268_/_0.18)] animate-[bipi-ruler-marker_400ms_ease-out_both] motion-reduce:animate-none"
        />

        {ticks.map((stage) => {
          const pct = termPositionPct(stage.dueDate);
          const anchor = tickAnchor(pct);
          return (
            <div
              key={stage.id}
              style={anchor.style}
              className={`absolute top-0 w-[74px] ${anchor.wrap}`}
            >
              <div className={`h-2.25 w-px ${anchor.tick} ${TICK_COLOR[stage.state]}`} />
              <div
                className={`mt-1.5 font-mono text-eyebrow leading-[1.2] font-bold tabular-nums ${TICK_DATE_COLOR[stage.state]}`}
              >
                {stage.shortDate}
              </div>
              <div className="mt-0.5 font-sans text-label leading-[1.2] text-muted-foreground">
                {stage.isCatchup ? "Catch-up" : stage.label.replace("Stage ", "St ")}
              </div>
            </div>
          );
        })}
      </Progress>
    </div>
  );
}
