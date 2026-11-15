import { Flag } from "lucide-react";

import type { MyComponent, TimelineItem } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { groupTimeline, stageNumber, weekday } from "@/lib/app/timeline";

import type { ClassOption } from "./personal-item-form";
import { card, eyebrow } from "./styles";
import { subjectEdge } from "./subject";
import { ItemCard } from "./timeline-item-card";
import { itemKey, Marker } from "./timeline-parts";

const ROW = "grid grid-cols-[28px_minmax(0,1fr)] gap-x-2.5 pb-2.5 sm:grid-cols-[40px_minmax(0,1fr)] sm:gap-x-3.5";
/** The rail: a 2px line through the row's gutter and the gap under it, so the rows join up. Decorative. */
const LINE = "absolute top-0 -bottom-2.5 left-1/2 w-0.5 -translate-x-1/2 bg-app-field-border";
const SQUARE = "relative z-10 flex size-7 items-center justify-center self-center rounded-app-control text-app-on-accent sm:size-9";

function Node({ item }: { item: TimelineItem }) {
  if (item.kind === "STAGE") return <span className={`${SQUARE} bg-app-accent font-heading text-app-small font-bold`}>{stageNumber(item.stageLabel)}</span>;
  if (item.kind === "COMPLETION") return <span className={`${SQUARE} bg-app-ink`}><Flag className="size-4" /></span>;
  return <span className="relative z-10 flex size-[22px] items-center justify-center self-center rounded-full bg-app-ground"><Marker item={item} /></span>;
}

const KEY: ReadonlyArray<{ item: Pick<TimelineItem, "kind" | "subjectName">; words: string }> = [
  { item: { kind: "STAGE", subjectName: null }, words: "A stage date for your coursework" },
  { item: { kind: "TEACHER_ITEM", subjectName: null }, words: "Something from your teacher" },
  { item: { kind: "PERSONAL", subjectName: null }, words: "Your own item. Only you see it" },
];

/**
 * Plan timeline-redesign T-10: every date from this week to the end of the school year on one rail. Each group is
 * a heading and its own ordered list, so a screen reader hears "This week, list, 3 items". The rail, its nodes and
 * the Today line's dashes are decoration; the Today row itself is a list item marked `aria-current="date"`.
 */
export function TimelineRail({ items, today, classes, components }: { items: TimelineItem[]; today: string; classes: ClassOption[]; components: MyComponent[] }) {
  const groups = groupTimeline(items, today);
  const firstUpcoming = items.find((i) => i.date >= today);
  const showToday = firstUpcoming !== undefined && items.some((i) => i.date < today);
  const completionDates = components.filter((c, i, all) => all.findIndex((k) => k.subjectName === c.subjectName) === i);

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="min-w-0">
        {groups.length === 0 && <p className="text-app-base text-app-copy">Nothing due between now and the end of the school year.</p>}
        {groups.map((group, g) => {
          const headingId = `tl-group-${g}`;
          return (
            <section key={headingId} className={g === 0 ? "" : "pt-5"}>
              <h3 id={headingId} className="flex items-baseline gap-2.5 pb-2.5 sm:pl-[54px]">
                <span className="font-heading text-app-lead font-bold tracking-[-.01em] text-app-ink">{group.label}</span>
                {group.sub && <span className="text-app-help text-app-muted">{group.sub}</span>}
              </h3>
              <ol aria-label={group.label}>
                {group.items.map((item) => (
                  <Row key={itemKey(item)} item={item} today={today} classes={classes} todayBefore={showToday && item === firstUpcoming} />
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <aside className="flex flex-col gap-3 lg:sticky lg:top-4">
        {completionDates.length > 0 && (
          <div className={`${card} overflow-hidden`}>
            <p id="tl-completion" className={`${eyebrow} px-[18px] pt-3.5 pb-2.5 text-app-muted`}>Completion dates</p>
            <ul aria-labelledby="tl-completion">
              {completionDates.map((c) => (
                <li key={c.subjectName} className={`flex items-baseline justify-between gap-3 border-t border-l-4 border-app-line px-[18px] py-[11px] ${subjectEdge(c.subjectName)}`}>
                  <span className="text-app-base text-app-copy">{c.subjectName}</span>
                  <span className="text-app-meta text-app-grey">{formatCalendarDate(c.completionDate)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul aria-label="What the marks mean" className={`${card} flex flex-col gap-2 px-[18px] py-3.5 text-app-small text-app-copy`}>
          {KEY.map((k) => (
            <li key={k.words} className="flex items-center gap-2.5"><Marker item={k.item as TimelineItem} />{k.words}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function Row({ item, today, classes, todayBefore }: { item: TimelineItem; today: string; classes: ClassOption[]; todayBefore: boolean }) {
  return (
    <>
      {todayBefore && (
        <li aria-current="date" className={`${ROW} items-center`}>
          <div aria-hidden="true" className="relative flex justify-center self-stretch">
            <span className={LINE} />
            <span className="relative z-10 size-4 self-center rounded-full border-2 border-app-today-ring bg-app-today" />
          </div>
          <p className={`${eyebrow} flex items-center gap-2.5 text-app-ink after:flex-1 after:border-t-2 after:border-dashed after:border-app-today-ring/60`}>
            {`Today · ${weekday(today)}`}
          </p>
        </li>
      )}
      <li className={ROW}>
        <div aria-hidden="true" className="relative flex justify-center">
          <span className={LINE} />
          <Node item={item} />
        </div>
        <ItemCard item={item} today={today} classes={classes} />
      </li>
    </>
  );
}
