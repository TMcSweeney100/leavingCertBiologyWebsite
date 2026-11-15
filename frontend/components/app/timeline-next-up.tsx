import type { TimelineItem } from "@/lib/api/schemas";
import { nextUp, relativeDay, weekday } from "@/lib/app/timeline";

import { MarkDoneButton } from "./personal-item-done";
import { EditPersonalItem } from "./personal-item-drawer";
import type { ClassOption } from "./personal-item-form";
import { eyebrow } from "./styles";
import { ownItem } from "./timeline-item-card";
import { metaLine, TitleLink } from "./timeline-parts";

const MONTH = new Intl.DateTimeFormat("en-IE", { month: "short", timeZone: "UTC" });
const days = (today: string, date: string) => Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);

/**
 * Plan timeline-redesign: the page's one navy card. What is due is the heading; the date is a calendar leaf, gold
 * when it is today; "After that" names the next three. It skips anything ticked done (T-8).
 */
export function NextUp({ items, today, classes }: { items: TimelineItem[]; today: string; classes: ClassOption[] }) {
  const { next, then } = nextUp(items, today);
  if (!next) return null;
  const own = ownItem(next);

  return (
    <section aria-label="Next up" className="flex flex-wrap items-center gap-x-3.5 gap-y-3.5 rounded-app-card bg-app-accent p-4 text-app-on-accent sm:gap-x-[18px] sm:px-5 sm:py-[18px]">
      <div aria-hidden="true" className={`flex h-[62px] w-14 flex-none flex-col items-center justify-center rounded-app-card sm:h-[68px] sm:w-16 ${next.date === today ? "bg-app-today text-app-ink" : "bg-app-surface text-app-accent"}`}>
        <span className={eyebrow}>{MONTH.format(Date.parse(next.date))}</span>
        <span className="font-heading text-app-leaf leading-none font-bold">{Number(next.date.slice(8))}</span>
      </div>
      <div className="min-w-0 flex-1 basis-[200px]">
        <p className={`${eyebrow} text-app-on-accent-muted`}>{`Next up · ${relativeDay(today, next.date)}`}</p>
        <h2 className="font-heading text-app-section leading-tight font-bold tracking-[-.015em] text-balance">
          <TitleLink item={next} className="underline decoration-white/40 underline-offset-[3px] hover:decoration-current" />
        </h2>
        <p className="text-app-small text-app-on-accent-muted">{`${weekday(next.date)} · ${metaLine(next)}`}</p>
      </div>
      {own && (
        <div className="flex flex-wrap gap-2">
          <MarkDoneButton id={own.id} title={own.title} />
          <EditPersonalItem item={own} classes={classes} today={today} look="onAccent" />
        </div>
      )}
      {then.length > 0 && (
        <p className="flex basis-full flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-app-accent-track pt-3.5 text-app-small text-app-on-accent-muted">
          <span className={eyebrow}>After that</span>
          {then.map((i) => (
            <span key={`${i.kind}-${i.date}-${i.title}`}>
              <b className="font-semibold text-app-on-accent">{i.title}</b>
              {` · ${days(today, i.date) <= 1 ? relativeDay(today, i.date) : weekday(i.date)}`}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
