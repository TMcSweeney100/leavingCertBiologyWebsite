import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { TERM } from "@/lib/schedule.data";

/**
 * Mobile term progress — the 6px bar under the "You are here" panel
 * (design_handoff_bipi_schedule/README.md §3). Above the track, a label row:
 * "Week 6 of 15" on the left, the elapsed percentage on the right.
 *
 * The laptop treatment of the same number is the *term ruler* (a 2px track
 * inside a 46px band carrying a today-marker and one tick per deadline),
 * which is Phase 6 — hence the `lg:hidden` at this component's call site
 * rather than in here: this file only owns the bar.
 *
 * Built on the shadcn `Progress` primitive because plan decision #5 names
 * it specifically. Two consequences worth knowing:
 *
 * - `components/ui/progress.tsx` carries `"use client"` (Base UI's Progress
 *   is a client component), so this is the first BiPi component whose
 *   output reaches the client bundle. Plan §4.3's "only stage-card.tsx is a
 *   client component" rule still holds for `components/bipi/*` — this file
 *   is a server component that renders a client primitive — but §4.3 was
 *   written considering only `Collapsible`, and this is the second
 *   primitive that crosses the boundary. Nothing here has state; the value
 *   is a server-rendered prop.
 * - `locale="en-IE"` is not cosmetic. Without it Base UI formats the
 *   percentage (both the visible `ProgressValue` text and the root's
 *   `aria-valuetext`) with the ambient default locale, which is the
 *   server's on the server and the browser's on the client — a hydration
 *   mismatch waiting for the first visitor whose locale spaces percentages
 *   differently ("34 %"). Pinning it makes both sides render "34%".
 */

type TermProgressProps = {
  weekNumber: number;
  /** Percentage of the term elapsed, already clamped by `deriveSchedule`. */
  termPct: number;
  className?: string;
};

export function TermProgress({ weekNumber, termPct, className }: TermProgressProps) {
  return (
    <Progress
      value={termPct}
      locale="en-IE"
      className={`gap-0 ${className ?? ""}`}
      trackClassName="h-1.5 bg-border"
      indicatorClassName="rounded-full"
    >
      {/* All of the label row's type lives on this wrapper and is inherited,
          rather than being passed down through the primitives' `cn()`: this
          project's tailwind-merge doesn't recognise the custom `--text-*`
          scale as font sizes and silently drops either the size or the
          colour when both reach one `cn()` call (see stage-card.tsx's note).
          `text-[length:inherit]` is the one text utility passed through, and
          only to displace the primitives' own `text-sm` default. */}
      <div className="mb-1.75 flex w-full items-baseline justify-between gap-2 font-mono text-chip font-bold tracking-[.1em] text-muted-foreground uppercase">
        <ProgressLabel className="text-[length:inherit] font-bold">
          Week {weekNumber} of {TERM.weeks}
        </ProgressLabel>
        <ProgressValue className="text-[length:inherit] font-bold" />
      </div>
    </Progress>
  );
}
