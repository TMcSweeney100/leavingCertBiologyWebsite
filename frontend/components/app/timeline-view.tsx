import Link from "next/link";

import type { TimelineItem } from "@/lib/api/schemas";
import { KIND_LABEL } from "@/lib/app/personal-kind";
import { monthWeeks, type Range, rangeLabel, relativeDay, stepFrom, type View, weekday } from "@/lib/app/timeline";

import { PersonalItemActions } from "./personal-item-actions";
import { type ClassOption } from "./personal-item-form";
import { textLink } from "./styles";

const VIEWS: ReadonlyArray<{ view: View; label: string }> = [
  { view: "list", label: "List" },
  { view: "week", label: "Week" },
  { view: "month", label: "Month" },
];

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

/** Roadmap §6.2 `/home` 2F: list, week and month across every approved class, plus the student's own items. */
export function TimelineView({ range, today, items, classes }: { range: Range; today: string; items: TimelineItem[]; classes: ClassOption[] }) {
  const href = (view: View, from: string) => `?view=${view}&from=${from}`;
  const label = rangeLabel(range);
  const row = (item: TimelineItem) => (
    <li key={`${item.kind}-${item.personalItemId ?? item.componentId}-${item.date}-${item.title}`} className="flex flex-col gap-1 border-b border-app-line py-3">
      <span className="text-app-small text-app-grey">{`${weekday(item.date)} · ${relativeDay(today, item.date)} · ${kindWord(item)}`}</span>
      <span className="text-app-base text-app-ink"><Title item={item} /></span>
      {item.subjectName && <span className="text-app-small text-app-grey">{item.subjectName}</span>}
      {item.kind === "PERSONAL" && item.personalItemId && item.personalKind && (
        <PersonalItemActions item={{ id: item.personalItemId, title: item.title, dueDate: item.date, kind: item.personalKind, classId: item.classId }} classes={classes} />
      )}
    </li>
  );

  return (
    <section aria-labelledby="timeline-range" className="flex flex-col gap-4">
      <nav aria-label="Timeline view" className="flex flex-wrap items-center gap-4">
        {VIEWS.map((v) => (
          <Link key={v.view} href={href(v.view, range.from)} aria-current={v.view === range.view ? "page" : undefined}
            className={v.view === range.view ? "font-semibold text-app-accent" : textLink}>
            {v.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-4">
        <Link href={href(range.view, stepFrom(range, -1))} className={textLink}>Previous</Link>
        <h2 id="timeline-range" className="font-semibold text-app-ink">{label}</h2>
        <Link href={href(range.view, stepFrom(range, 1))} className={textLink}>Next</Link>
      </div>

      {range.view === "month" ? (
        <table className="w-full table-fixed border-collapse text-app-small">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <th key={d} scope="col" className="py-1 text-left">{d}</th>)}</tr>
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
        <ul aria-label="Timeline items" className="flex flex-col">{items.map(row)}</ul>
      )}
    </section>
  );
}
