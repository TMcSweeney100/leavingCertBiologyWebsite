import { Aside } from "@/components/bipi/aside";
import { SiteHeader } from "@/components/bipi/site-header";
import { SiteFooter } from "@/components/bipi/site-footer";
import { StickyNowBar } from "@/components/bipi/sticky-now-bar";
import { Timeline } from "@/components/bipi/timeline";
import { YouAreHere } from "@/components/bipi/you-are-here";
import { countdownText, deriveSchedule, parsePreviewDate } from "@/lib/schedule";

export default async function Home({ searchParams }: PageProps<"/">) {
  // Awaiting `searchParams` is what opts this page into dynamic rendering
  // (plan §4.1) — deliberate, and the only correct choice here: the page
  // does no I/O, so an SSR pass is a handful of pure function calls, while
  // static generation would freeze `new Date()` at build time and leave the
  // countdown wrong forever. `?date=YYYY-MM-DD` is the preview override
  // (decision 6); anything else it cannot parse falls back to the real
  // clock, so a mistyped link still renders a correct page.
  const { date } = await searchParams;
  const schedule = deriveSchedule(parsePreviewDate(date));

  return (
    <>
      <SiteHeader stages={schedule.stages} />
      <main className="flex-1">
        <YouAreHere schedule={schedule} />

        {/* Sits here rather than inside the section above so that it has the
            rest of the page to stick against: `position: sticky` only pins
            an element while its own parent is still in view. */}
        <StickyNowBar
          stageLabel={schedule.currentStage.label}
          countdown={countdownText(schedule.daysLeft, schedule.isDueToday)}
        />

        {/* The `#timeline` anchor site-header.tsx's second nav pill points
            at, with the section chrome from README §5. `scroll-mt` is larger
            on mobile than the `scroll-mt-6` used elsewhere because the
            sticky bar above would otherwise cover the heading it jumps to. */}
        <section
          id="timeline"
          className="scroll-mt-10 px-4.5 pt-5 pb-4.5 lg:scroll-mt-6 lg:px-10 lg:pt-6 lg:pb-7.5"
        >
          {/* Laptop: `1fr 300px`, `align-items: start` so the aside can stick
              against the tall left column rather than being stretched by it.
              The section heading lives *inside* the left column rather than
              spanning both, which is what lets the aside top-align with the
              "Timeline" eyebrow instead of starting below the h2. Mobile
              collapses to one column and drops the aside entirely. */}
          <div className="grid items-start gap-6.5 lg:grid-cols-[1fr_300px]">
            <div>
              <p className="font-mono text-eyebrow font-bold tracking-[.16em] text-muted-foreground uppercase">
                Timeline
              </p>
              <h2 className="mt-2.25 font-heading text-section-title leading-[1.2] font-bold tracking-[-.02em] text-foreground lg:text-section-title-lg lg:leading-[1.18] lg:tracking-[-.025em]">
                What&rsquo;s left this term
              </h2>
              {/* Mobile-only: on laptop the cards are wide enough to show
                  their detail without a disclosure hint. The tap affordance
                  it refers to arrives with the Collapsible in Phase 7. */}
              <p className="mt-1.75 font-sans text-task leading-[1.5] text-muted-foreground lg:hidden">
                Tap a stage for what it involves.
              </p>
              <div className="mt-5 lg:mt-4.5">
                <Timeline stages={schedule.stages} />
              </div>
            </div>
            <Aside comingUp={schedule.comingUp} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
