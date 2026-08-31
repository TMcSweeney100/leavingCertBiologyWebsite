/**
 * The eyebrow + `<h2>` pair every page section opens with (README §5-§7:
 * "Timeline / What's left this term", "Report sections / All seven
 * sections…", "Report rules / The bits people lose marks on"). Three
 * sections, one identical treatment — extracted in Phase 8 rather than
 * typed out a third time, and the `#timeline` chrome in `app/page.tsx` now
 * renders through it too.
 *
 * Returns a fragment, not a wrapper: the caller decides what the heading
 * sits inside (the timeline's is the first thing in the left column of a
 * two-column grid, the others are direct children of their section), and
 * the space *below* the heading differs per section, so that stays a margin
 * on the caller's content rather than being baked in here.
 *
 * The `<h2>` is what keeps the document outline at h1 → h2 → h3 with no
 * skips: the stage cards' titles are the h3s under the timeline's h2.
 */

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
};

export function SectionHeading({ eyebrow, title }: SectionHeadingProps) {
  return (
    <>
      <p className="font-mono text-eyebrow font-bold tracking-[.16em] text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2.25 font-heading text-section-title leading-[1.2] font-bold tracking-[-.02em] text-foreground lg:text-section-title-lg lg:leading-[1.18] lg:tracking-[-.025em]">
        {title}
      </h2>
    </>
  );
}
