import type { GlanceMonth, StageWithState } from "@/lib/schedule";

/**
 * The laptop-only sticky aside — the right-hand column of the timeline grid
 * (design_handoff_bipi_schedule/README.md §8). Two cards: what is still
 * ahead, and the whole term month by month. It sticks at `top: 16px` so it
 * stays in reach while the long left column scrolls.
 *
 * "Coming up" lists the stages *after* the current one, so it empties out
 * as the term progresses and disappears entirely on the last stage — the
 * card is omitted rather than rendered with a heading and nothing under it.
 *
 * "Term at a glance" is one of the two places the **4 December draft
 * deadline** appears outside Stage 6's own task list (plan §1.2 flagged
 * that gap) — the other is the laptop term ruler (`TermRuler`, inside
 * `you-are-here.tsx`). It takes `termAtAGlance` as a prop, built by
 * `deriveSchedule` from the same `rulerTicks` the laptop ruler renders — so
 * it cannot drift from `STAGES` the way a hand-written copy could.
 */

type AsideProps = {
  /** The stages after the current one, in order. May be empty. */
  comingUp: StageWithState[];
  /** The term's dates grouped by month, derived from `rulerTicks`. */
  termAtAGlance: GlanceMonth[];
};

function AsideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-(--bipi-r-card) border border-border bg-card px-5 py-4.5">
      <h3 className="font-mono text-eyebrow leading-none font-bold tracking-[.14em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function Aside({ comingUp, termAtAGlance }: AsideProps) {
  return (
    <aside className="sticky top-4 hidden gap-4 lg:grid print:hidden">
      {comingUp.length > 0 && (
        <AsideCard title="Coming up">
          <div className="mt-3">
            {comingUp.map((stage) => (
              <div
                key={stage.id}
                className="flex justify-between gap-3 border-t border-border py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-sans text-body leading-[1.3] font-semibold text-(--bipi-ink-2)">
                    {stage.title}
                  </p>
                  <p className="mt-1 font-sans text-pill leading-[1.3] text-muted-foreground">
                    {stage.reportSectionLabel === "—"
                      ? stage.reportSectionName
                      : `Report ${stage.reportSectionLabel} due`}
                  </p>
                </div>
                <p className="flex-none font-mono text-pill-lg leading-[1.3] font-bold text-(--bipi-now-ink) tabular-nums">
                  {stage.shortDate}
                </p>
              </div>
            ))}
          </div>
        </AsideCard>
      )}

      <AsideCard title="Term at a glance">
        <div className="mt-3.5 grid gap-3.5">
          {termAtAGlance.map((month) => (
            <div key={month.month}>
              <p className="font-heading text-pill-lg leading-none font-bold tracking-[-.01em] text-foreground">
                {month.month}
              </p>
              <div className="mt-2 grid gap-1.5">
                {month.items.map((item) => (
                  <div
                    key={`${month.month}-${item.day}`}
                    className="grid grid-cols-[34px_1fr] items-baseline gap-2"
                  >
                    <span className="font-mono text-pill leading-[1.3] font-bold text-(--bipi-now-ink) tabular-nums">
                      {item.day}
                    </span>
                    <span className="font-sans text-inset leading-[1.4] text-(--bipi-ink-2)">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AsideCard>
    </aside>
  );
}
