import { countsLabel, type CheckpointCounts } from "@/lib/app/stage-sheet";

/**
 * The navy checkpoint card's bar and counts line (design B, plan progress-redesign P-13): the stage sheet and the
 * Progress tab's stage view. The sheet turns `showWaiting` off while anyone waits, because its "N waiting for you"
 * link says it instead.
 */
export function CountsBar({ counts, showWaiting }: { counts: CheckpointCounts; showWaiting: boolean }) {
  return (
    <>
      <div role="img" aria-label={countsLabel(counts)} data-private className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
        {counts.signedOff > 0 && <span className="bg-app-approved-on-accent" style={{ flexGrow: counts.signedOff }} />}
        {counts.waiting > 0 && <span className="bg-app-attention-on-accent" style={{ flexGrow: counts.waiting }} />}
        {counts.notYet > 0 && <span className="bg-app-accent-track" style={{ flexGrow: counts.notYet }} />}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-app-help text-app-on-accent-muted">
        <span data-private><b className="font-bold text-app-approved-on-accent">{counts.signedOff}</b> signed off</span>
        {showWaiting && (
          <span data-private>
            <b className={`font-bold ${counts.waiting > 0 ? "text-app-attention-on-accent" : "text-app-on-accent"}`}>{counts.waiting}</b> waiting
          </span>
        )}
        <span data-private><b className="font-bold text-app-on-accent">{counts.notYet}</b> not yet</span>
      </p>
    </>
  );
}
