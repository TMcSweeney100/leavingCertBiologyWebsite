import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Aside } from "@/components/bipi/aside";
import { CompletedStrip } from "@/components/bipi/completed-strip";
import { MarksCard } from "@/components/bipi/marks-card";
import { ReportCrosswalk } from "@/components/bipi/report-crosswalk";
import { ReportRules } from "@/components/bipi/report-rules";
import { SectionHeading } from "@/components/bipi/section-heading";
import { SiteHeader } from "@/components/bipi/site-header";
import { SiteFooter } from "@/components/bipi/site-footer";
import { StickyNowBar } from "@/components/bipi/sticky-now-bar";
import { Timeline } from "@/components/bipi/timeline";
import { YouAreHere } from "@/components/bipi/you-are-here";
import { countdownText, deriveSchedule, parsePreviewDate } from "@/lib/schedule";
import { resolveClass } from "@/lib/class-resolve";
import { CLASS_SLUGS, getClass } from "@/lib/classes";

type ClassParams = Promise<{ class: string }>;

export async function generateStaticParams() {
  return CLASS_SLUGS.map((slug) => ({ class: slug }));
}

export async function generateMetadata({ params }: { params: ClassParams }): Promise<Metadata> {
  const { class: slug } = await params;
  const config = getClass(slug);
  if (!config) return {};
 
  const cls = resolveClass(config);
  const title = `BiPi Schedule Hub — ${cls.school.name}`;

  return {
    title,
    description: cls.header.standfirst,
    openGraph: {
      title,
      description: cls.header.standfirst,
      locale: "en_IE",
      type: "website",
    },
    // D2: the demo class is reachable for a demo and invisible to Google.
    ...(config.listed === false ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function ClassPage({
  params,
  searchParams,
}: {
  params: ClassParams;
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  // Awaiting `searchParams` is what opts this page into dynamic rendering
  // (plan §4.1) — deliberate, and the only correct choice here: the page
  // does no I/O, so an SSR pass is a handful of pure function calls, while
  // static generation would freeze `new Date()` at build time and leave the
  // countdown wrong forever. `generateStaticParams` below pre-renders each
  // known class's route shell; it does not conflict with this page staying
  // dynamically rendered per request. `?date=YYYY-MM-DD` is the preview
  // override (decision 6); anything else it cannot parse falls back to the
  // real clock, so a mistyped link still renders a correct page.
  const { class: slug } = await params;
  const { date } = await searchParams;
  const config = getClass(slug);
  if (!config) notFound();
  const cls = resolveClass(config);
  const schedule = deriveSchedule(cls, parsePreviewDate(date));

  return (
    <>
      <SiteHeader stages={schedule.stages} header={cls.header} school={cls.school} teacher={cls.teacher} />
      <main className="flex-1">
        <YouAreHere schedule={schedule} cls={cls} />

        {/* Sits here rather than inside the section above so that it has the
            rest of the page to stick against: `position: sticky` only pins
            an element while its own parent is still in view. */}
        {schedule.currentStage && (
          <StickyNowBar
            stageLabel={schedule.currentStage.label}
            countdown={countdownText(schedule.daysLeft, schedule.isDueToday)}
          />
        )}

        {/* Stages 1-2, which timeline.tsx filters out of the rail. Above
            the timeline rather than below it because it reads as the line
            the rail continues from. */}
        <CompletedStrip text={cls.completedStrip} />

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
              <SectionHeading eyebrow="Timeline" title="What’s left this term" />
              {/* Mobile-only: on laptop the cards are wide enough to show
                  their detail without a disclosure hint — and every card
                  carries the disclosure trigger itself, so this is a hint
                  about where to tap, not the only affordance. */}
              <p className="mt-1.75 font-sans text-task leading-[1.5] text-muted-foreground lg:hidden">
                Tap a stage for what it involves.
              </p>
              <div className="mt-5 lg:mt-4.5">
                <Timeline stages={schedule.stages} />
              </div>
            </div>
            <Aside comingUp={schedule.comingUp} termAtAGlance={schedule.termAtAGlance} />
          </div>
        </section>

        {/* `#report-sections` — the third nav pill. White band, so the
            crosswalk reads as a table on a surface rather than as more of
            the page ground the cards sit on. */}
        <section
          id="report-sections"
          className="scroll-mt-10 border-t border-border bg-card px-4.5 py-5 lg:scroll-mt-6 lg:px-10 lg:pt-7 lg:pb-7.5"
        >
          <SectionHeading
            eyebrow="Report sections"
            title="All seven sections, and when each one should be written"
          />
          <div className="mt-3.5 lg:mt-4.5">
            <ReportCrosswalk sections={schedule.reportSections} />
          </div>
        </section>

        {/* `#report-rules` — the fourth and last nav pill. Reference content
            from the SEC brief: the formatting rules and the mark split.
            Laptop puts the marks card in a fixed 380px column beside the
            rules; mobile stacks them. */}
        <section
          id="report-rules"
          className="scroll-mt-10 border-t border-border px-4.5 py-5 lg:scroll-mt-6 lg:px-10 lg:pt-7 lg:pb-7.5"
        >
          <div className="grid items-start gap-3.5 lg:grid-cols-[1fr_380px] lg:gap-8.5">
            <div>
              <SectionHeading eyebrow="Report rules" title="The bits people lose marks on" />
              <div className="mt-3.5 lg:mt-4">
                <ReportRules rules={cls.reportRules} />
              </div>
            </div>
            <MarksCard bands={cls.markBands} total={cls.marksTotal} />
          </div>
        </section>
      </main>
      <SiteFooter secDeadline={cls.secDeadline} path={`/${cls.slug}`} />
    </>
  );
}
