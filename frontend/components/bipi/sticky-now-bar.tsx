/**
 * Mobile sticky mini-banner — plan §1.3 suggestion ①, the one sticky
 * element the design gets: once you have scrolled past the "You are here"
 * panel, "Stage 4 · 10 days left" stays within reach at the top of the
 * screen. On a phone the timeline runs to several screens, and this is the
 * single fact you want permanently available while reading it.
 *
 * Pure CSS, no JavaScript and no scroll listener: the bar sits in normal
 * flow directly beneath the panel and `position: sticky` pins it from
 * there. That means it is briefly visible in place before it pins, which is
 * the intended behaviour of the pattern, not a glitch.
 *
 * Laptop is excluded (`lg:hidden`) because the laptop layout keeps the same
 * information permanently on screen in the sticky aside column (Phase 6).
 *
 * `aria-hidden` because this is a visual convenience that repeats, verbatim,
 * content the panel immediately above it already carries. In DOM order the
 * two are adjacent, so to a screen reader — which has no "scrolled past"
 * state — announcing it would be pure repetition. It holds nothing
 * interactive, so nothing becomes unreachable by hiding it.
 *
 * Its height is why every anchor target *below* it carries a larger
 * `scroll-mt-*` on mobile than the `scroll-mt-6` docs/CLAUDE.md describes:
 * a jumped-to heading would otherwise land underneath the pinned bar.
 */

type StickyNowBarProps = {
  /** The current stage's short label, e.g. "Stage 4". */
  stageLabel: string;
  /** The countdown as one phrase, e.g. "10 days left" — see `countdownText`. */
  countdown: string;
};

export function StickyNowBar({ stageLabel, countdown }: StickyNowBarProps) {
  return (
    <div
      aria-hidden="true"
      className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4.5 py-2.25 lg:hidden print:hidden"
    >
      <p className="flex min-w-0 items-center gap-1.75 font-mono text-label leading-none font-bold tracking-[.1em] text-(--bipi-ink-2) uppercase">
        <span className="size-1.5 shrink-0 rounded-full bg-(--bipi-now)" />
        <span className="truncate">{stageLabel}</span>
      </p>
      <p className="flex-none font-mono text-label leading-none font-bold tracking-[.06em] text-(--bipi-now-ink) uppercase tabular-nums">
        {countdown}
      </p>
    </div>
  );
}
