import { Eye, EyeOff, Pencil } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { LogEntry } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate, entryDetail, entryHeading, entryTitle } from "@/lib/app/log";

import { LogKindChip } from "./log-kind-chip";
import { LogVisibilityToggle } from "./log-visibility-toggle";
import { card, sectionTitle, textLink } from "./styles";

const RULE = "Each entry is dated when you save it. Editing keeps the earlier version. Nothing is deleted.";
const RULES = [
  ["Dated for you.", "The date is set when you save."],
  ["Edits are kept.", "Every revision stays in the history."],
  ["Nothing is deleted.", "You can hide an entry, not remove it."],
] as const;

/** Pack D-6, "the ledger": one card, hairline rows, date first; the reader column says in words who can read each entry. */
export function LogList({ componentId, entries }: { componentId: string; entries: LogEntry[] }) {
  const newEntry = (
    <Link href={`/components/${componentId}/log/new`} className={buttonVariants({ size: "default", className: "w-full lg:w-auto" })}>
      New entry
    </Link>
  );
  if (entries.length === 0) {
    return (
      <div className={`${card} mt-6 grid gap-6 p-5 lg:grid-cols-[1fr_280px] lg:p-6`}>
        <div className="flex flex-col items-start gap-3">
          <h2 className={sectionTitle}>Nothing in your log yet</h2>
          <p className="text-app-base text-app-copy">
            Keep a note of what you did, each source you used, and every time you used an AI tool. It&apos;s how you show the work is yours.
          </p>
          {newEntry}
        </div>
        <ul className="flex flex-col gap-3 border-t border-app-line pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          {RULES.map(([rule, why]) => (
            <li key={rule} className="text-app-small text-app-copy"><strong className="text-app-ink">{rule}</strong> {why}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className={sectionTitle}>Your log</h2>
          <p className="mt-1 text-app-small text-app-grey">{RULE}</p>
        </div>
        {newEntry}
      </div>
      <ul aria-label="Log entries" className={`${card} divide-y divide-app-line overflow-hidden`}>
        {entries.map((e) => {
          const title = entryTitle(e);
          const detail = entryDetail(e);
          const date = formatCalendarDate(dublinDate(e.createdAt));
          return (
            <li key={e.id} className={`grid gap-2 p-4 lg:grid-cols-[104px_84px_1fr_232px] lg:items-center lg:gap-4 ${e.visibleToTeacher ? "" : "bg-app-private-ground"}`}>
              <p className="order-2 font-mono text-app-help text-app-grey lg:order-none">
                {date}
                {e.editedAt && (
                  <span className="ml-2 inline-flex items-center gap-1 lg:hidden"><Pencil aria-hidden className="size-3" />Edited</span>
                )}
              </p>
              <span className="order-1 lg:order-none"><LogKindChip kind={e.kind} /></span>
              <div className="order-3 min-w-0 lg:order-none">
                <Link href={`/components/${componentId}/log/${e.id}`} className={`${textLink} line-clamp-2 text-app-lead font-semibold`}>{entryHeading(e)}</Link>
                {detail && <p className="text-app-small text-app-grey">{detail}</p>}
                {e.editedAt && (
                  <p className="hidden items-center gap-1 text-app-help text-app-grey lg:flex">
                    <Pencil aria-hidden className="size-3" />{`Edited · ${e.revisionCount} revisions`}
                  </p>
                )}
              </div>
              <div className="order-4 flex items-center justify-between gap-3 lg:order-none">
                <p className={`flex items-center gap-1.5 text-app-small ${e.visibleToTeacher ? "text-app-copy" : "font-bold text-app-ink"}`}>
                  {e.visibleToTeacher ? <Eye aria-hidden className="size-4" /> : <EyeOff aria-hidden className="size-4" />}
                  {e.visibleToTeacher ? "Teacher can read" : "Only you"}
                </p>
                <LogVisibilityToggle entryId={e.id} title={title} visible={e.visibleToTeacher} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
