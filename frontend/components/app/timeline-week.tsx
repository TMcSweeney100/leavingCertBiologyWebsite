import type { TimelineItem } from "@/lib/api/schemas";
import { weekday, weekDays, weekSummary } from "@/lib/app/timeline";

import { DoneTick } from "./personal-item-done";
import { AddPersonalItem, EditPersonalItem } from "./personal-item-drawer";
import type { ClassOption } from "./personal-item-form";
import { eyebrow } from "./styles";
import { subjectEdge } from "./subject";
import { ItemCard, ownItem } from "./timeline-item-card";
import { isCoursework, isOwn, itemKey, kindWord, Marker, TitleLink } from "./timeline-parts";

const AFTER = 4;
const WEEKDAY = new Intl.DateTimeFormat("en-IE", { weekday: "short", timeZone: "UTC" });

/**
 * Plan timeline-redesign T-1: the week as a planner. Seven columns from `lg`, day rows below it; the switch is CSS
 * only. Every day from today on has its own Add. `items` covers the week and the four weeks after, which feed
 * "After this week".
 */
export function TimelineWeek({ from, to, today, items, classes }: { from: string; to: string; today: string; items: TimelineItem[]; classes: ClassOption[] }) {
  const inWeek = items.filter((i) => i.date <= to);
  const after = items.filter((i) => i.date > to).slice(0, AFTER);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-app-small text-app-copy">{weekSummary(inWeek)}</p>

      <ol aria-label="Days of the week" className="overflow-hidden rounded-app-card border border-app-field-border bg-app-surface lg:grid lg:grid-cols-7">
        {weekDays(from).map((date, n) => {
          const isToday = date === today;
          const dayItems = inWeek.filter((i) => i.date === date);
          const headingId = `wk-${date}`;
          return (
            <li key={date} aria-current={isToday ? "date" : undefined}
              className={`flex border-t border-app-line first:border-t-0 lg:min-h-[300px] lg:min-w-0 lg:flex-col lg:border-t-0 lg:border-l lg:first:border-l-0 ${isToday ? "bg-app-today/10" : n > 4 ? "bg-app-weekend" : ""}`}>
              <h3 id={headingId} className="flex w-[60px] flex-none flex-col items-center gap-1 border-r border-app-line px-2 py-3 lg:w-auto lg:flex-row lg:justify-between lg:border-r-0 lg:border-b lg:px-3 lg:py-2.5">
                <span className="sr-only">{`${weekday(date)}${isToday ? ", today" : ""}`}</span>
                <span aria-hidden="true" className={`${eyebrow} ${isToday ? "text-app-ink" : "text-app-muted"}`}>{isToday ? "Today" : WEEKDAY.format(Date.parse(date))}</span>
                <span aria-hidden="true" className={`flex size-8 items-center justify-center rounded-full font-heading text-app-lead font-bold ${isToday ? "border-2 border-app-today-ring bg-app-today text-app-ink" : date < today ? "text-app-muted" : "text-app-ink"}`}>
                  {Number(date.slice(8))}
                </span>
              </h3>
              <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5 lg:px-2">
                {dayItems.length > 0 && (
                  <ul aria-label={weekday(date)} className="flex flex-col gap-2">
                    {dayItems.map((item) => <WeekCard key={itemKey(item)} item={item} today={today} classes={classes} />)}
                  </ul>
                )}
                {date >= today && <AddPersonalItem classes={classes} today={today} date={date} compact />}
              </div>
            </li>
          );
        })}
      </ol>

      {after.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 id="wk-after" className={`${eyebrow} text-app-muted`}>After this week</h3>
          <ol aria-labelledby="wk-after" className="flex flex-col gap-2.5">
            {after.map((item) => <li key={itemKey(item)}><ItemCard item={item} today={today} classes={classes} /></li>)}
          </ol>
        </section>
      )}
    </div>
  );
}

/** A day's card: small enough for a 120px column. An own item's title is its Edit button (T-17). */
function WeekCard({ item, today, classes }: { item: TimelineItem; today: string; classes: ClassOption[] }) {
  const own = ownItem(item);
  const navy = isCoursework(item);
  const tone = navy ? "border-app-accent bg-app-accent text-app-on-accent"
    : isOwn(item) ? "border-app-pick/25 bg-app-pick-tint text-app-ink"
    : `border-app-field-border bg-app-surface text-app-ink ${item.subjectName ? `border-l-4 ${subjectEdge(item.subjectName)}` : ""}`;
  const titleTone = navy ? "" : item.done ? "text-app-grey line-through" : item.date < today ? "text-app-grey" : "";

  return (
    <li className={`flex flex-wrap items-start gap-x-2.5 gap-y-1 rounded-app-control border p-2.5 text-app-small ${tone}`}>
      {own && <DoneTick id={own.id} title={own.title} done={item.done} />}
      <div className="min-w-0 flex-1">
        <p className={`leading-snug font-semibold break-words ${titleTone}`}>
          {own ? <EditPersonalItem item={own} classes={classes} today={today} look="title" />
            : <TitleLink item={item} className={navy ? "underline decoration-white/40 underline-offset-[3px]" : undefined} />}
        </p>
        <p className={`flex items-center gap-1.5 text-app-label ${navy ? "text-app-on-accent-muted" : "text-app-muted"}`}>
          <Marker item={item} small onAccent={navy} />
          {item.kind === "STAGE" && item.stageLabel ? item.stageLabel : kindWord(item)}
        </p>
      </div>
    </li>
  );
}
