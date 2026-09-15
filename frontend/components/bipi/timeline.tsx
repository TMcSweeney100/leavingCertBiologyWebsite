import { StageCard } from "@/components/bipi/stage-card";
import { StageDot } from "@/components/bipi/stage-dot";
import type { StageState } from "@/lib/schedule.types";
import type { StageWithState } from "@/lib/schedule";

/**
 * Rail + dots, mapping the five real stages (`stage-3`, `stage-4`,
 * `catchup`, `stage-5`, `stage-6`) to a `StageCard` each — plan §4.2's file
 * layout ("rail + dots, maps the five cards"), built now in Phase 4
 * alongside the static card because the rail treatment (README §5) is a
 * direct per-row mapping with no dependency on later-phase work: no "you
 * are here" panel above it (Phase 5), no laptop two-column grid (Phase 6),
 * no real `?date=`-driven state (Phase 5). What's deliberately NOT here is
 * the surrounding "Timeline" section chrome — the eyebrow, H2 ("What's left
 * this term"), mobile hint copy and the `#timeline` anchor id that
 * site-header.tsx's nav pill already points at. That's page-composition
 * work with its own exact copy this phase wasn't asked to pin down, so it's
 * left for whichever later phase assembles the full page (see the mount
 * site in app/page.tsx for the same note).
 *
 * Exact numbers (grid-template-columns, gaps, dot sizes/margins, the
 * inter-card rhythm) are cross-checked against the actual rendered
 * prototype (`docs/design_handoff_bipi_schedule/design/BiPi Schedule
 * Hub.dc.html`, `styleB()` + the `#2a` mobile markup), not just the prose
 * spec, since the prose alone under-specifies the vertical rhythm between
 * cards (it's produced by zero gap on the list plus a padding-bottom on
 * each card's own wrapper, not a gap on the list itself).
 */

type TimelineProps = {
  stages: StageWithState[];
};

// Nudges the dot down onto the optical centre of the card's first line of
// text. Current is 4px larger, so it needs 2px less. Positioning only — the
// dot's own size and colour live in stage-dot.tsx, shared with the stepper.
const DOT_MARGIN_TOP: Record<StageState, string> = {
  current: "mt-1", // 4px
  done: "mt-1.5", // 6px
  upcoming: "mt-1.5",
};

function Connector({ done }: { done: boolean }) {
  return (
    <div
      className={`mt-1.5 w-0.5 min-h-6 [flex:1_1_auto] ${done ? "bg-(--bipi-done) opacity-50" : "bg-border"}`}
    />
  );
}

export function Timeline({ stages }: TimelineProps) {
  // Stage 1 and 2 are `isAlwaysDone` and never render as cards here — they
  // get their own "completed strip" treatment (Phase 8). Filtering on the
  // flag (rather than slicing off the first two array entries) stays
  // correct even if the always-done prefix ever changes length.
  const rows = stages.filter((stage) => !stage.isAlwaysDone);

  return (
    <div>
      {rows.map((stage, index) => (
        <div key={stage.id} className="grid grid-cols-[26px_1fr] gap-3 lg:gap-3.5">
          <div className="flex flex-col items-center">
            <StageDot state={stage.state} className={DOT_MARGIN_TOP[stage.state]} />
            {/* Last row: no connector, nothing after it to link to. */}
            {index < rows.length - 1 && <Connector done={stage.state === "done"} />}
          </div>
          <div className="pb-3.5 lg:pb-4">
            <StageCard stage={stage} />
          </div>
        </div>
      ))}
    </div>
  );
}
