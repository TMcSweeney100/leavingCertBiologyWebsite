import type { ResolvedClass } from "@/lib/schedule.types";

/**
 * How the 200 marks split across the four assessment bands
 * (design_handoff_bipi_schedule/README.md §7). Sits beside the report rules
 * on laptop, under them on mobile.
 *
 * Reference content from the SEC brief, like the rules — static, and the
 * one place on the page that answers "what is actually being marked?".
 * Band D is worth reading: Scientific Literacy is assessed across the whole
 * report rather than as a section of its own, which is why the crosswalk
 * has seven sections and this card has four bands.
 *
 * The total is `total` rather than a typed-out "200" — and the band rows do
 * not sum it themselves, because the brief states the total and the site
 * should print what the brief states, not a number it computed.
 */
type MarksCardProps = {
  bands: ResolvedClass["markBands"];
  total: number;
};

export function MarksCard({ bands, total }: MarksCardProps) {
  return (
    <section
      aria-label="How the report is marked"
      className="rounded-(--bipi-r-card) border border-border bg-card px-3.75 py-3.75 lg:px-5.5 lg:py-5"
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <h3 className="font-mono text-eyebrow leading-none font-bold tracking-[.14em] text-muted-foreground uppercase">
          How it&rsquo;s marked
        </h3>
        <p className="font-mono text-pill-lg leading-none font-bold text-foreground tabular-nums lg:text-task">
          {total} marks
        </p>
      </div>

      <dl className="mt-2.5 lg:mt-3">
        {bands.map((band) => (
          <div
            key={band.band}
            className="grid grid-cols-[20px_1fr_34px] items-baseline gap-2.5 border-t border-border py-2.25 lg:grid-cols-[22px_1fr_34px] lg:py-2.75"
          >
            <dt className="font-mono text-task leading-[1.3] font-bold text-(--bipi-now-ink) lg:text-standfirst">
              {band.band}
            </dt>
            <dd className="font-sans text-task leading-[1.4] text-(--bipi-ink-2) lg:text-body lg:leading-[1.45]">
              {band.covers}
            </dd>
            {/* Outside the <dd> it describes, so it needs to say what it is
                to a screen reader; sighted readers get it from the column
                and the "200 marks" total above. */}
            <dd className="text-right font-mono text-task leading-[1.3] font-bold text-foreground tabular-nums lg:text-body">
              <span className="sr-only">Marks: </span>
              {band.marks}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
