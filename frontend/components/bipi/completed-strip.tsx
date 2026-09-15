/**
 * The completed strip — one line saying Stages 1-2 are already behind the
 * class (design_handoff_bipi_schedule/README.md §4). It sits between the
 * "You are here" panel and the timeline, and it is the only place the two
 * `isAlwaysDone` stages appear: `timeline.tsx` filters them out of the rail
 * deliberately, so without this the page would silently start at Stage 3
 * and a reader could reasonably wonder what happened to the first two.
 *
 * Static by design. These two stages were finished in 5th Year, so nothing
 * here is date-derived and `--bipi-now` correctly appears nowhere in it.
 *
 * Copy comes from the brief's `completedStrip` at both breakpoints. The
 * design prototype shortens it on mobile ("Stages 1-2 done in 5th Year —
 * §1 & §2 written"), but that shorter string exists nowhere in the brief,
 * which is copied byte-for-byte from the handoff, so inventing a second
 * copy of the same sentence in JSX would break the rule that editing the
 * brief alone re-words the site. The full sentence wraps to three lines on
 * a 390px phone, which is fine — this is reassurance, not something anyone
 * needs to scan.
 *
 * The green check is decorative: it repeats what the sentence already says,
 * so it is `aria-hidden` and the tick is drawn as a Unicode glyph in a CSS
 * circle rather than as an icon (README §"no heavy imagery").
 */
type CompletedStripProps = {
  text: string;
};

export function CompletedStrip({ text }: CompletedStripProps) {
  return (
    // Mobile: a full-bleed tinted band with a hairline under it, which is
    // what separates it from the timeline section below. Laptop: the tint
    // and the rule both go, and it becomes a quiet line above the grid.
    <div className="flex items-start gap-2.5 border-b border-border bg-(--bipi-done-tint) px-4.5 py-3.5 lg:gap-3 lg:border-b-0 lg:bg-transparent lg:px-10 lg:pt-5.5 lg:pb-0">
      {/* `items-start`, not the design's `center`: the design's own mobile
          copy is one short line, but COMPLETED_STRIP is the full sentence
          and wraps to three lines on a phone — vertically centring a tick
          against a three-line paragraph reads as a mistake. `mt-px` nudges
          it onto the first line's optical centre. */}
      <span
        aria-hidden="true"
        className="mt-px inline-flex size-4.5 flex-none items-center justify-center rounded-full bg-(--bipi-done) font-sans text-label leading-none font-bold text-white lg:size-5 lg:text-pill-lg"
      >
        ✓
      </span>
      <p className="font-sans text-inset leading-[1.4] font-semibold text-(--bipi-ink-2) lg:text-body">
        {text}
      </p>
    </div>
  );
}
