import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { MyComponent, TimelineItem } from "@/lib/api/schemas";
import { type Range, rangeLabel, schoolYear, stepFrom, type View, weekday } from "@/lib/app/timeline";

import type { ClassOption } from "./personal-item-form";
import { TimelineMonth } from "./timeline-month";
import { TimelineRail } from "./timeline-rail";
import { TimelineWeek } from "./timeline-week";

const VIEWS: ReadonlyArray<{ view: View; label: string }> = [
  { view: "timeline", label: "Timeline" },
  { view: "week", label: "Week" },
  { view: "month", label: "Month" },
];

/**
 * Plan timeline-redesign: the view switch, the range controls, and the chosen view. All of it is links: the view
 * and the date live in the URL (`?view=…&from=…`), so Back and a shared link land on the same screen. `items` is
 * whatever `fetchRange` in the page loaded for this view.
 */
export function TimelineView({ range, today, day, items, classes, components }: {
  range: Range;
  today: string;
  /** The Month view's picked day. */
  day: string;
  items: TimelineItem[];
  classes: ClassOption[];
  components: MyComponent[];
}) {
  // Switching view keeps you where you are: on today while today is on screen, otherwise on what you browsed to.
  const anchor = range.from <= today && today <= range.to ? today : range.from;
  const unit = range.view === "week" ? "week" : "month";
  const label = range.view === "timeline" ? `From ${weekday(range.from)}` : rangeLabel(range);
  const earlier = schoolYear(today).start;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Timeline view" className="flex w-full gap-[3px] rounded-app-card bg-app-inset p-[3px] sm:w-auto">
          {VIEWS.map((v) => (
            <Link key={v.view} href={v.view === "timeline" ? "?view=timeline" : `?view=${v.view}&from=${anchor}`}
              aria-current={v.view === range.view ? "page" : undefined}
              className={`flex min-h-[38px] flex-1 items-center justify-center rounded-[7px] border px-4 text-app-meta font-semibold touch-manipulation ${v.view === range.view ? "border-app-field-border bg-app-surface text-app-accent" : "border-transparent text-app-grey"}`}>
              {v.label}
            </Link>
          ))}
        </nav>

        {range.view === "timeline" ? (
          <>
            <h2 id="timeline-range" className="sr-only">{label}</h2>
            {range.from > earlier && <Link href={`?view=timeline&from=${earlier}`} className={buttonVariants({ variant: "outline" })}>Show earlier</Link>}
          </>
        ) : (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link href={`?view=${range.view}&from=${stepFrom(range, -1)}`} aria-label={`Previous ${unit}`} className={buttonVariants({ variant: "outline", size: "icon" })}>
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
            <h2 id="timeline-range" className="min-w-0 flex-1 text-center font-heading text-app-lead font-bold tracking-[-.01em] text-app-ink sm:min-w-[168px]">{label}</h2>
            <Link href={`?view=${range.view}&from=${stepFrom(range, 1)}`} aria-label={`Next ${unit}`} className={buttonVariants({ variant: "outline", size: "icon" })}>
              <ChevronRight aria-hidden="true" className="size-5" />
            </Link>
            <Link href={`?view=${range.view}`} className={buttonVariants({ variant: "outline" })}>Today</Link>
          </div>
        )}
      </div>

      <div aria-labelledby="timeline-range" role="group">
        {range.view === "timeline" && <TimelineRail items={items} today={today} classes={classes} components={components} />}
        {range.view === "week" && <TimelineWeek from={range.from} to={range.to} today={today} items={items} classes={classes} />}
        {range.view === "month" && <TimelineMonth range={range} today={today} day={day} items={items} classes={classes} />}
      </div>
    </section>
  );
}
