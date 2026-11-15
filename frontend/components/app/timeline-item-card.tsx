import type { TimelineItem } from "@/lib/api/schemas";
import { stageNumber, weekday } from "@/lib/app/timeline";

import { DoneTick } from "./personal-item-done";
import { EditPersonalItem, type OwnItem } from "./personal-item-drawer";
import type { ClassOption } from "./personal-item-form";
import { subjectEdge } from "./subject";
import { DuePill, isCoursework, isOwn, metaLine, TitleLink } from "./timeline-parts";

/** The fields the edit drawer needs, or null for anything that isn't the student's own. */
export function ownItem(item: TimelineItem): OwnItem | null {
  return item.personalItemId && item.personalKind
    ? { id: item.personalItemId, title: item.title, dueDate: item.date, kind: item.personalKind, classId: item.classId }
    : null;
}

/**
 * One item as a card (plan timeline-redesign): white with the subject's edge for the class's dates, azure tint for
 * the student's own. Never a link round its controls: the title, the tick and Edit sit side by side.
 */
export function ItemCard({ item, today, classes, editAs = "button" }: { item: TimelineItem; today: string; classes: ClassOption[]; editAs?: "button" | "title" }) {
  const own = ownItem(item);
  const coursework = isCoursework(item);
  const past = item.date < today;
  const stage = item.kind === "STAGE" ? stageNumber(item.stageLabel) : null;
  const tone = isOwn(item) ? "border-app-pick/25 bg-app-pick-tint" : `border-app-field-border bg-app-surface ${item.subjectName ? `border-l-4 ${subjectEdge(item.subjectName)}` : ""}`;
  const titleTone = item.done ? "text-app-grey line-through" : past ? "text-app-grey" : "text-app-ink";

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-app-card border px-3 py-3 sm:px-4 ${tone}`}>
      {own && <DoneTick id={own.id} title={own.title} done={item.done} />}
      <div className="min-w-0 flex-1">
        <p className="font-mono text-app-label font-bold tracking-[.04em] text-app-muted uppercase">{weekday(item.date)}</p>
        <p className={coursework ? `font-heading text-app-lead font-bold tracking-[-.01em] lg:text-app-title ${titleTone}` : `text-app-meta font-semibold ${titleTone}`}>
          {own && editAs === "title" ? <EditPersonalItem item={own} classes={classes} today={today} look="title" /> : <TitleLink item={item} />}
        </p>
        <p className="flex flex-wrap items-center gap-x-1.5 text-app-help text-app-muted">
          {stage && <span className="rounded-app-inner bg-app-accent px-2 py-0.5 font-mono text-app-label font-bold tracking-[.06em] text-app-on-accent uppercase">{item.stageLabel}</span>}
          {metaLine(item)}
        </p>
      </div>
      <DuePill today={today} item={item} />
      {own && editAs === "button" && <EditPersonalItem item={own} classes={classes} today={today} />}
    </div>
  );
}
