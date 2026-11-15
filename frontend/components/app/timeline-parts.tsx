import Link from "next/link";

import type { TimelineItem } from "@/lib/api/schemas";
import { KIND_LABEL } from "@/lib/app/personal-kind";
import { relativeDay } from "@/lib/app/timeline";

import { subjectRing } from "./subject";
import { textLink } from "./styles";

export const isOwn = (item: TimelineItem) => item.kind === "PERSONAL";
export const isCoursework = (item: TimelineItem) => item.kind === "STAGE" || item.kind === "COMPLETION";

/** Plan 2F P2-49: the kind is always a word. */
export function kindWord(item: TimelineItem) {
  if (item.kind === "COMPLETION") return "SEC completion date";
  if (item.kind === "STAGE") return "Stage date";
  if (item.kind === "TEACHER_ITEM") return "From your teacher";
  return item.personalKind ? KIND_LABEL[item.personalKind] : "Own item";
}

export function metaLine(item: TimelineItem) {
  const subject = item.subjectName ? ` · ${item.subjectName}` : "";
  return `${kindWord(item)}${subject}${isOwn(item) ? " · only you" : ""}`;
}

/** A stable key: the API gives timeline rows no id of their own. */
export const itemKey = (item: TimelineItem) => `${item.kind}-${item.personalItemId ?? item.componentId}-${item.date}-${item.title}`;

/**
 * Kinds are shapes first (pack D-4), colours second (plan timeline-redesign T-19): a navy square for the
 * component's own dates, a ring in the subject's colour for a teacher's item, an azure diamond for the student's own.
 */
export function Marker({ item, small, onAccent }: { item: TimelineItem; small?: boolean; onAccent?: boolean }) {
  const size = small ? "size-[7px]" : "size-[11px]";
  if (isCoursework(item)) return <span aria-hidden="true" className={`${size} flex-none rounded-[2px] ${onAccent ? "bg-app-on-accent" : "bg-app-accent"}`} />;
  if (item.kind === "TEACHER_ITEM") return <span aria-hidden="true" className={`${size} flex-none rounded-full border-2 ${subjectRing(item.subjectName)}`} />;
  return <span aria-hidden="true" className={`${size} flex-none rotate-45 border-2 border-app-pick`} />;
}

const PILL = "inline-flex h-[26px] flex-none items-center rounded-full px-2.5 text-app-help font-semibold whitespace-nowrap";

/** "Today" in gold, the next seven days in amber, later in grey, the past as plain grey text, a ticked item "Done". */
export function DuePill({ today, item }: { today: string; item: TimelineItem }) {
  if (item.done) return <span className={`${PILL} bg-app-approved-tint text-app-approved`}>Done</span>;
  const words = relativeDay(today, item.date);
  const text = words.charAt(0).toUpperCase() + words.slice(1);
  const days = Math.round((Date.parse(item.date) - Date.parse(today)) / 86_400_000);
  if (days === 0) return <span className={`${PILL} bg-app-today text-app-ink`}>{text}</span>;
  if (days < 0) return <span className="flex-none text-app-help text-app-grey">{text}</span>;
  return <span className={`${PILL} ${days <= 7 ? "bg-app-attention-tint text-app-attention" : "bg-app-inset text-app-grey"}`}>{text}</span>;
}

/** A coursework or teacher item links to its component; an own item has nowhere to go. */
export function TitleLink({ item, className = textLink }: { item: TimelineItem; className?: string }) {
  return item.componentId ? <Link href={`/components/${item.componentId}`} className={className}>{item.title}</Link> : <span>{item.title}</span>;
}
