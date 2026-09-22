import Link from "next/link";
import { Fragment } from "react";

import type { MyComponent, TimelineItem } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { KIND_LABEL } from "@/lib/app/personal-kind";
import { monthWeeks, rangeFor, type Range, rangeLabel, relativeDay, stepFrom, type View, weekday } from "@/lib/app/timeline";

import { PersonalItemActions } from "./personal-item-actions";
import { type ClassOption } from "./personal-item-form";
import { subjectEdge } from "./subject";
import { textLink } from "./styles";

const VIEWS: ReadonlyArray<{ view: View; label: string }> = [
  { view: "list", label: "List" },
  { view: "week", label: "Week" },
  { view: "month", label: "Month" },
];
const WEEKDAY_COLS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAME = new Intl.DateTimeFormat("en-IE", { month: "long", timeZone: "UTC" });

/** Plan 2F P2-49: the kind is always a word. */
function kindWord(item: TimelineItem) {
  if (item.kind === "STAGE") return "Stage date";
  if (item.kind === "TEACHER_ITEM") return "From your teacher";
  return item.personalKind ? KIND_LABEL[item.personalKind] : "Own item";
}

function Title({ item }: { item: TimelineItem }) {
  const text = item.stageLabel && item.kind === "STAGE" ? `${item.stageLabel} · ${item.title}` : item.title;
  return item.componentId ? <Link href={`/components/${item.componentId}`} className={textLink}>{text}</Link> : <span>{text}</span>;
}

/** Kinds are shapes, not colours (pack D-4 tokens.css): completion/stage dates share the accent
    because both are the component's own dates; teacher and own items share grey and a stroke. */
function Marker({ item, small }: { item: TimelineItem; small?: boolean }) {
  const size = small ? "size-[var(--app-marker-sm)]" : "size-[var(--app-marker)]";
  if (item.kind === "STAGE") return <span aria-hidden="true" className={`${size} flex-none bg-app-accent`} />;
  if (item.kind === "TEACHER_ITEM") return <span aria-hidden="true" className={`${size} flex-none rounded-full border-[length:var(--app-marker-stroke)] border-app-grey`} />;
  return <span aria-hidden="true" className={`${size} flex-none rotate-45 border-[length:var(--app-marker-stroke)] border-app-grey`} />;
}

function metaLine(item: TimelineItem) {
  return item.subjectName ? `${kindWord(item)} · ${item.subjectName}` : kindWord(item);
}

/** Roadmap §6.2 `/home` 2F, restyled from design pack D-4: the countdown to the next thing due is
    the page's one bold moment; the calendar aside folds away, leaving the list the full width. */
export function TimelineView({
  range,
  today,
  items,
  classes,
  components,
  calendarOpen,
}: {
  range: Range;
  today: string;
  items: TimelineItem[];
  classes: ClassOption[];
  components: MyComponent[];
  calendarOpen: boolean;
}) {
  const href = (view: View, from: string, calendar = calendarOpen) => `?view=${view}&from=${from}&calendar=${calendar ? "on" : "off"}`;
  const label = rangeLabel(range);
  const next = items.find((i) => i.date >= today);

  const row = (item: TimelineItem) => (
    <li
      key={`${item.kind}-${item.personalItemId ?? item.componentId}-${item.date}-${item.title}`}
      className={`flex items-center gap-3 border-t border-app-line py-[17px] lg:gap-6 ${item.kind === "STAGE" && item.subjectName ? `border-l-4 pl-3.5 lg:pl-[14px] ${subjectEdge(item.subjectName)}` : ""}`}
    >
      <span className="w-[58px] flex-none font-mono text-app-help text-app-muted lg:w-[96px] lg:text-app-meta">{weekday(item.date)}</span>
      <Marker item={item} small />
      <div className="min-w-0 flex-1">
        <p className={item.kind === "STAGE" ? "font-heading text-app-base font-semibold tracking-[-.018em] text-app-ink lg:text-app-title" : "text-app-help font-semibold text-app-ink lg:text-app-meta"}>
          <Title item={item} />
        </p>
        <p className="text-app-help text-app-grey lg:text-app-small">{metaLine(item)}</p>
        {item.kind === "PERSONAL" && item.personalItemId && item.personalKind && item !== next && (
          <PersonalItemActions item={{ id: item.personalItemId, title: item.title, dueDate: item.date, kind: item.personalKind, classId: item.classId }} classes={classes} />
        )}
      </div>
      <span className="flex-none text-app-help text-app-grey lg:w-[96px] lg:text-right lg:text-app-meta">{relativeDay(today, item.date)}</span>
    </li>
  );

  const grouped: Array<{ month: string | null; item: TimelineItem }> = [];
  let seenMonth = "";
  for (const item of items) {
    const month = item.date.slice(0, 7);
    grouped.push({ month: range.view === "list" && month !== seenMonth ? MONTH_NAME.format(Date.parse(`${item.date}T00:00:00Z`)) : null, item });
    seenMonth = month;
  }

  const asideMonth = rangeFor({ view: "month", from: range.from }, range.from);
  const dueDates = new Set(items.map((i) => i.date));
  const completionDates = components.filter((c, i, all) => all.findIndex((k) => k.subjectName === c.subjectName) === i);

  return (
    <section className="flex flex-col gap-6">
      {next && (
        <article aria-label="Next up" role="region" className="overflow-hidden rounded-app-card border border-app-accent bg-app-surface">
          <div className="flex items-baseline justify-between gap-5 bg-app-accent px-[18px] py-[18px]">
            <p className="font-heading text-app-countdown-sm font-bold tracking-[-.035em] text-app-on-accent lg:text-app-countdown">{relativeDay(today, next.date)}</p>
            <span className="font-mono text-app-label font-bold tracking-[.09em] text-app-on-accent-muted uppercase">{`Next up · ${weekday(next.date)} ${next.date.slice(0, 4)}`}</span>
          </div>
          <div className="flex items-center gap-3.5 p-[18px]">
            <Marker item={next} />
            <div className="min-w-0 flex-1">
              <p className="text-app-lead font-semibold text-app-ink"><Title item={next} /></p>
              <p className="text-app-meta text-app-grey">
                {metaLine(next)}
                {next.kind === "PERSONAL" ? " · only you can see this" : ""}
              </p>
              {next.kind === "PERSONAL" && next.personalItemId && next.personalKind && (
                <PersonalItemActions item={{ id: next.personalItemId, title: next.title, dueDate: next.date, kind: next.personalKind, classId: next.classId }} classes={classes} />
              )}
            </div>
          </div>
        </article>
      )}

      <div className="flex flex-wrap items-center justify-between gap-5">
        <nav aria-label="Timeline view" className="flex gap-[3px] rounded-app-card bg-app-inset p-[3px]">
          {VIEWS.map((v) => (
            <Link key={v.view} href={href(v.view, range.from)} aria-current={v.view === range.view ? "page" : undefined}
              className={`flex min-h-[38px] items-center rounded-[7px] px-4 text-app-meta font-semibold ${v.view === range.view ? "border border-app-field-border bg-app-surface text-app-accent" : "border border-transparent text-app-grey"}`}>
              {v.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-[18px]">
          <Link href={href(range.view, stepFrom(range, -1))} className={textLink}>Previous</Link>
          <h2 id="timeline-range" className="font-semibold text-app-ink">{label}</h2>
          <Link href={href(range.view, stepFrom(range, 1))} className={textLink}>Next</Link>
          <Link
            href={href(range.view, range.from, !calendarOpen)}
            aria-expanded={calendarOpen}
            className="hidden min-h-11 items-center rounded-app-control border border-app-field-border bg-app-surface px-[15px] text-app-meta font-semibold text-app-copy lg:inline-flex"
          >
            {calendarOpen ? "Hide calendar" : "Show calendar"}
          </Link>
        </div>
      </div>

      <div className="flex gap-10">
        <div aria-labelledby="timeline-range" className="min-w-0 flex-1">
          {range.view === "month" ? (
            <table className="w-full table-fixed border-collapse text-app-small">
              <caption className="sr-only">{label}</caption>
              <thead>
                <tr>{WEEKDAY_COLS.map((d) => <th key={d} scope="col" className="py-1 text-left">{d}</th>)}</tr>
              </thead>
              <tbody>
                {monthWeeks(range).map((week) => (
                  <tr key={week[0]}>
                    {week.map((date) => {
                      const outOfRange = date < range.from || date > range.to;
                      return (
                        <td key={date} aria-disabled={outOfRange || undefined} className={`h-20 border border-app-line p-1 align-top ${outOfRange ? "text-app-disabled" : ""}`}>
                          <span className={date === today ? "font-bold text-app-accent" : ""}>{Number(date.slice(8))}</span>
                          {items.filter((i) => i.date === date).map((i) => (
                            <span key={`${i.kind}-${i.title}`} className="block truncate">{i.title}</span>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : items.length === 0 ? (
            <p className="text-app-base text-app-copy">{`Nothing due ${label}.`}</p>
          ) : (
            <ul aria-label="Timeline items" className="flex flex-col">
              {grouped.map(({ month, item }, i) => (
                <Fragment key={`f-${item.kind}-${item.personalItemId ?? item.componentId}-${item.date}-${item.title}`}>
                  {month && (
                    <li aria-hidden="true" className={`font-mono text-app-label font-bold tracking-[.1em] text-app-muted uppercase ${i === 0 ? "pb-2.5" : "pt-6 pb-2.5"}`}>{month}</li>
                  )}
                  {row(item)}
                </Fragment>
              ))}
            </ul>
          )}
        </div>

        {calendarOpen && (
          <aside className="hidden w-[344px] flex-none flex-col gap-3.5 lg:flex">
            <div className="flex flex-col gap-3 rounded-app-card border border-app-field-border bg-app-surface p-[18px]">
              <h2 className="font-heading text-app-lead font-bold tracking-[-.02em] text-app-ink">{new Intl.DateTimeFormat("en-IE", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.parse(`${asideMonth.from}T00:00:00Z`))}</h2>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {WEEKDAY_COLS.map((d) => <span key={d} className="font-mono text-app-label text-app-muted">{d[0]}</span>)}
                {monthWeeks(asideMonth).flat().map((date) => {
                  const outOfRange = date < asideMonth.from || date > asideMonth.to;
                  const due = dueDates.has(date);
                  return (
                    <span
                      key={date}
                      className={`flex h-[var(--app-calendar-cell)] flex-col items-center justify-center gap-0.5 rounded-[6px] text-app-base ${
                        date === today ? "bg-app-accent font-bold text-app-on-accent" : outOfRange ? "text-app-disabled" : due ? "font-bold text-app-ink" : "text-app-copy"
                      }`}
                    >
                      {Number(date.slice(8))}
                      {due && date !== today && <span aria-hidden="true" className="size-[var(--app-calendar-dot)] rounded-full bg-app-accent" />}
                    </span>
                  );
                })}
              </div>
              <p className="text-app-help text-app-muted">A dot means something is due. The list beside it says what.</p>
            </div>
            {completionDates.length > 0 && (
              <div className="overflow-hidden rounded-app-card border border-app-field-border bg-app-surface">
                <p className="px-[18px] pt-3.5 pb-2.5 font-mono text-app-label font-bold tracking-[.1em] text-app-muted uppercase">Completion dates</p>
                {completionDates.map((c) => (
                  <div key={c.subjectName} className={`flex items-baseline justify-between gap-3 border-t border-app-line px-[18px] py-[11px] border-l-4 ${subjectEdge(c.subjectName)}`}>
                    <span className="text-app-base text-app-copy">{c.subjectName}</span>
                    <span className="text-app-meta text-app-grey">{formatCalendarDate(c.completionDate)}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
