import { Progress } from "@/components/ui/progress";
import type { StageState } from "@/lib/schedule.data";
import type { RulerTick } from "@/lib/schedule";

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
 * **Edge clamping.** Every tick wrapper is 54px wide and centred on its
 * date — except at the extremes, where centring would push half the label
 * outside the panel. A tick above 95% anchors to the right edge and
 * right-aligns its text; one below 6% anchors left. Without this the 11
 * December deadline tick (99.02% this year) overhangs, which is the single
 * layout failure the implementation plan calls out by name — there is a
 * test pinning that date above the threshold. See `tickAnchor` for why the
 * threshold sits at 95% rather than 88%.
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
  /** Every mark on the ruler, in date order — see `buildRulerTicks`. */
  ticks: RulerTick[];
  /** Percentage of the term elapsed, already clamped by `deriveSchedule`. */
  termPct: number;
  weekNumber: number;
  weeks: number;
  /** "Sept → 12 Dec" — see `termSpanLabel`. */
  spanLabel: string;
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

/**
 * Where a tick's label wrapper anchors, given its position on the track.
 *
 * The threshold is 95%, not the 88% this started at: the 4 December draft
 * tick sits at ~92.2% and the 11 December deadline at ~99.0%, and at 88%
 * *both* clamped right and rendered on top of each other. 95% is above the
 * draft and below the deadline, so exactly one tick clamps — which is the
 * only arrangement that works. Verified in a browser at five widths; see
 * the tests pinning both positions against this number.
 */
function tickAnchor(pct: number) {
  if (pct > 95) return { wrap: "right-0 text-right", tick: "ml-auto", style: undefined };
  if (pct < 6) return { wrap: "left-0 text-left", tick: "mr-auto", style: undefined };
  return { wrap: "-translate-x-1/2 text-center", tick: "mx-auto", style: { left: `${pct}%` } };
}

export function TermRuler({ ticks, termPct, weekNumber, weeks, spanLabel, className }: TermRulerProps) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4 font-mono text-chip font-bold tracking-[.1em] text-muted-foreground uppercase">
        <span>
          Week {weekNumber} of {weeks}
        </span>
        <span className="tabular-nums">
          {spanLabel} · {termPct}% elapsed
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

        {ticks.map((tick) => {
          const pct = tick.positionPct;
          const anchor = tickAnchor(pct);
          return (
            <div
              key={tick.id}
              style={anchor.style}
              className={`absolute top-0 w-[54px] ${anchor.wrap}`}
            >
              <div className={`h-2.25 w-px ${anchor.tick} ${TICK_COLOR[tick.state]}`} />
              <div
                className={`mt-1.5 font-mono text-eyebrow leading-[1.2] font-bold tabular-nums ${TICK_DATE_COLOR[tick.state]}`}
              >
                {tick.shortDate}
              </div>
              <div className="mt-0.5 font-sans text-label leading-[1.2] text-muted-foreground">
                {tick.caption}
              </div>
            </div>
          );
        })}
      </Progress>
    </div>
  );
}
