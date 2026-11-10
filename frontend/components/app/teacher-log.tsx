"use client";

import { ChevronDown, EyeOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { EntryKind, TeacherStudentLog } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate, KIND_PLURAL, kindCounts, LOG_PREVIEW, showingWords, teacherEntryLines } from "@/lib/app/log";

import { LogHistory, RevisionContent } from "./log-history";
import { LogKindChip } from "./log-kind-chip";
import { card, sectionTitle } from "./styles";

type Entry = TeacherStudentLog["entries"][number];
type Filter = EntryKind | "ALL";

const KINDS: EntryKind[] = ["SOURCE", "NOTE", "AI_USE"];
const day = (iso: string) => formatCalendarDate(dublinDate(iso));
// R-14: date and kind are their own columns on a laptop; on a phone they share a line above the title (`lg:contents`).
const ROW = "grid grid-cols-[minmax(0,1fr)_20px] items-center gap-x-4 gap-y-1.5 px-4 py-3 lg:grid-cols-[104px_84px_minmax(0,1fr)_20px] lg:px-[18px]";
const DATE = "font-mono text-app-help text-app-grey";

/**
 * Direction D: the log as the evidence under the checkpoints. The latest three (R-5), then Show all with filter chips
 * (R-6); every entry opens in place (R-7). FR-24d: a private entry shows its kind and dates, never its content, which
 * the API doesn't send. Pack D-6 words it as the student's choice: "Made private by Aoife", "Private entry".
 */
export function TeacherLog({ log }: { log: TeacherStudentLog }) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");

  if (log.entries.length === 0) {
    return (
      <div className={`${card} mt-8 flex flex-col gap-2 p-5`}>
        <h2 className={sectionTitle}>{`${log.firstName} hasn't written any log entries yet.`}</h2>
        <p className="text-app-base text-app-copy">
          {`Entries appear here as they're saved. You'll read the ones ${log.firstName} shares, and see only the kind and date of any they keep private.`}
        </p>
      </div>
    );
  }

  const total = log.entries.length;
  const shared = log.entries.filter((e) => e.visibility === "VISIBLE").length;
  const counts = kindCounts(log.entries);
  const shown = expanded ? log.entries.filter((e) => filter === "ALL" || e.kind === filter) : log.entries.slice(0, LOG_PREVIEW);
  const toggle = () => { setExpanded((open) => !open); setFilter("ALL"); }; // R-15

  return (
    <section aria-labelledby="log-heading" className={`${card} mt-8 overflow-hidden`}>
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3 lg:px-[18px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="log-heading" className={sectionTitle}>{`${log.firstName}'s log`}</h2>
          <p className="text-app-small text-app-grey">{`${total} ${total === 1 ? "entry" : "entries"}. ${log.firstName} has shared ${shared} with you.`}</p>
        </div>
        {expanded && (
          <ToggleGroup aria-label="Show entries" value={[filter]} onValueChange={(v) => { if (v[0]) setFilter(v[0] as Filter); }}>
            <ToggleGroupItem value="ALL" className="text-app-small">All <b className="font-mono text-app-label">{total}</b></ToggleGroupItem>
            {KINDS.filter((k) => counts[k] > 0).map((k) => (
              <ToggleGroupItem key={k} value={k} className="text-app-small">{KIND_PLURAL[k]} <b className="font-mono text-app-label">{counts[k]}</b></ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>
      <ul id="log-entries" aria-label="Log entries" className="divide-y divide-app-line border-t border-app-line">
        {shown.map((e) => <EntryRow key={e.id} entry={e} firstName={log.firstName} />)}
      </ul>
      <p aria-live="polite" className="sr-only">{expanded ? showingWords(shown.length, filter) : ""}</p>
      {total > LOG_PREVIEW && (
        <div className="border-t border-app-line px-4 py-3 lg:px-[18px]">
          <Button type="button" variant="outline" aria-expanded={expanded} aria-controls="log-entries" onClick={toggle} className="w-full">
            {expanded ? `Show the latest ${LOG_PREVIEW}` : `Show all ${total} entries`}
          </Button>
        </div>
      )}
      <p className="flex items-center gap-2 border-t border-app-line px-4 py-3 text-app-help text-app-muted lg:px-[18px]">
        <EyeOff aria-hidden className="size-4 flex-none" />
        {`Entries ${log.firstName} keeps private show only their kind, the dates and how many times they were edited.`}
      </p>
    </section>
  );
}

function EntryRow({ entry: e, firstName }: { entry: Entry; firstName: string }) {
  const when = (
    <span className="flex items-center gap-3 lg:contents">
      <span className={DATE}>{day(e.createdAt)}</span>
      <span><LogKindChip kind={e.kind} /></span>
    </span>
  );

  if (e.visibility === "HIDDEN") {
    return (
      <li className={`${ROW} bg-app-private-ground`}>
        {when}
        <p className="col-start-1 flex items-center gap-2 text-app-small text-app-ink lg:col-start-3 lg:row-start-1">
          <EyeOff aria-hidden className="size-4 flex-none" />
          <strong>{e.hiddenAt ? `Made private by ${firstName} on ${day(e.hiddenAt)}` : "Private entry"}</strong>
        </p>
      </li>
    );
  }

  const { title, detail } = teacherEntryLines(e);
  return (
    <li>
      <Collapsible>
        <CollapsibleTrigger className={`${ROW} group w-full text-left touch-manipulation hover:bg-app-inset`}>
          {when}
          <span className="col-start-1 flex min-w-0 flex-col lg:col-start-3 lg:row-start-1">
            <span className="truncate text-app-base font-semibold text-app-ink">{title}</span>
            {detail && <span className="truncate text-app-help text-app-muted">{detail}</span>}
          </span>
          <ChevronDown aria-hidden className="col-start-2 row-span-2 row-start-1 size-5 text-app-muted transition-transform group-data-[panel-open]:rotate-180 lg:col-start-4 lg:row-span-1" />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-3 px-4 pb-4 lg:pr-[18px] lg:pl-[238px]">
          <RevisionContent body={e.body} fields={e.fields} />
          {e.editedAt && <p className="text-app-small text-app-grey">{`Edited · ${e.revisionCount} revisions, last on ${day(e.editedAt)}`}</p>}
          {e.revisionCount > 1 && (
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-app-small font-semibold text-app-accent">{`History (${e.revisionCount} revisions)`}</summary>
              <div className="mt-1"><LogHistory history={e.history} /></div>
            </details>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
