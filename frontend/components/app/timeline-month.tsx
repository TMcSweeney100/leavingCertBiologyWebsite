import Link from "next/link";

import type { TimelineItem } from "@/lib/api/schemas";
import { monthWeeks, type Range, rangeLabel, weekday } from "@/lib/app/timeline";

import { AddPersonalItem } from "./personal-item-drawer";
import type { ClassOption } from "./personal-item-form";
import { eyebrow } from "./styles";
import { subjectEdge } from "./subject";
import { ItemCard } from "./timeline-item-card";
import { isCoursework, isOwn, itemKey, Marker } from "./timeline-parts";

const WEEKDAY_COLS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A cell's chip (from `sm`): a link for the class's dates, plain text for the student's own (edited from the picked day). */
function Chip({ item }: { item: TimelineItem }) {
  const tone = isCoursework(item) ? "bg-app-accent text-app-on-accent"
    : isOwn(item) ? `bg-app-pick-tint ${item.done ? "text-app-grey line-through" : "text-app-ink"}`
    : `border border-app-field-border bg-app-surface text-app-ink ${item.subjectName ? `border-l-4 ${subjectEdge(item.subjectName)}` : ""}`;
  const body = (
    <>
      {item.kind !== "TEACHER_ITEM" && <Marker item={item} small onAccent={isCoursework(item)} />}
      <span className="line-clamp-2 min-w-0 break-words">{item.kind === "STAGE" && item.stageLabel ? `${item.stageLabel} date` : item.title}</span>
    </>
  );
  const className = `hidden items-center gap-1.5 rounded-app-inner px-2 py-1 text-app-help leading-tight font-semibold sm:flex ${tone}`;
  return item.componentId
    ? <Link href={`/components/${item.componentId}`} aria-label={item.title} title={item.title} className={className}>{body}</Link>
    : <span title={item.title} className={className}>{body}</span>;
}

/**
 * Plan timeline-redesign T-3, T-14, T-15: a real calendar. Still a table, so a screen reader moves by week and
 * weekday. Each day's number is a link that picks it (`?day=`); the picked day's items are listed underneath,
 * where they can be ticked, edited and added to. Below `sm` the chips give way to marks.
 */
export function TimelineMonth({ range, today, day, items, classes }: { range: Range; today: string; day: string; items: TimelineItem[]; classes: ClassOption[] }) {
  const label = rangeLabel(range);
  const byDate = new Map<string, TimelineItem[]>();
  for (const item of items) byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  const picked = byDate.get(day) ?? [];
  const pickedLabel = `${weekday(day)}${day === today ? ", today" : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-app-card border border-app-field-border bg-app-surface">
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>{WEEKDAY_COLS.map((d) => <th key={d} scope="col" className={`${eyebrow} border-b border-app-line px-1 py-2.5 text-center text-app-muted sm:px-3 sm:text-left`}>{d}</th>)}</tr>
          </thead>
          <tbody>
            {monthWeeks(range).map((week) => (
              <tr key={week[0]}>
                {week.map((date, n) => {
                  const outside = date < range.from || date > range.to;
                  const dayItems = outside ? [] : byDate.get(date) ?? [];
                  const isToday = date === today;
                  const number = `flex size-11 items-center justify-center rounded-full text-app-small sm:size-8 ${isToday ? "border-2 border-app-today-ring bg-app-today font-bold text-app-ink" : "font-semibold text-app-copy"}`;
                  return (
                    <td key={date} aria-disabled={outside || undefined}
                      className={`h-[58px] border-t border-l border-app-line p-0.5 align-top first:border-l-0 sm:h-[112px] sm:p-2 ${outside ? "text-app-disabled" : ""} ${isToday ? "bg-app-today/10" : n > 4 ? "bg-app-weekend" : ""} ${date === day && !outside ? "shadow-[inset_0_0_0_2px_var(--app-accent)]" : ""}`}>
                      <div className="flex flex-col items-center gap-1 sm:items-stretch">
                        {outside ? (
                          <span className="flex size-11 items-center justify-center text-app-small sm:size-8">{Number(date.slice(8))}</span>
                        ) : (
                          <Link href={`?view=month&from=${range.from}&day=${date}`} scroll={false} aria-current={isToday ? "date" : undefined}
                            aria-label={`${weekday(date)}, ${dayItems.length === 0 ? "nothing" : dayItems.length === 1 ? "1 item" : `${dayItems.length} items`}`}
                            className={`${number} touch-manipulation hover:bg-app-inset`}>
                            {Number(date.slice(8))}
                          </Link>
                        )}
                        {dayItems.map((item) => <Chip key={itemKey(item)} item={item} />)}
                        {dayItems.length > 0 && (
                          <span aria-hidden="true" className="-mt-2 flex items-center gap-[3px] sm:hidden">
                            {dayItems.slice(0, 3).map((item) => <Marker key={itemKey(item)} item={item} small />)}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="month-picked" className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <h3 id="month-picked" className="font-heading text-app-lead font-bold tracking-[-.01em] text-app-ink">{pickedLabel}</h3>
          {day >= today && <div className="w-[108px]"><AddPersonalItem classes={classes} today={today} date={day} compact /></div>}
        </div>
        {picked.length === 0 ? (
          <p className="text-app-small text-app-copy">Nothing on this day.</p>
        ) : (
          <ul aria-label={pickedLabel} className="flex flex-col gap-2.5">
            {picked.map((item) => <li key={itemKey(item)}><ItemCard item={item} today={today} classes={classes} /></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
