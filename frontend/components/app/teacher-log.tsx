import { EyeOff } from "lucide-react";

import type { TeacherStudentLog } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate } from "@/lib/app/log";

import { LogHistory, RevisionContent } from "./log-history";
import { LogKindChip } from "./log-kind-chip";
import { card, sectionTitle } from "./styles";

const day = (iso: string) => formatCalendarDate(dublinDate(iso));
const ROW = "grid gap-2 px-4 py-3 lg:grid-cols-[104px_84px_1fr] lg:gap-4";
const DATE = "font-mono text-app-help text-app-grey";

/**
 * FR-24d: a hidden entry looks different from no entry. It shows its kind and date and, when the student
 * hid something they'd shown before (Q3), when. Never its content, which the API doesn't send.
 * Pack D-6 words it as the student's choice: "Made private by Aoife", "Private entry".
 */
export function TeacherLog({ log, activity }: { log: TeacherStudentLog; activity?: string }) {
  if (log.entries.length === 0) {
    return (
      <div className={`${card} mt-6 flex flex-col gap-2 p-5`}>
        <h2 className={sectionTitle}>{`${log.firstName} hasn't written any log entries yet.`}</h2>
        <p className="text-app-base text-app-copy">
          {`Entries appear here as they're saved. You'll read the ones ${log.firstName} shares, and see only the kind and date of any they keep private.`}
        </p>
      </div>
    );
  }
  const shared = log.entries.filter((e) => e.visibility === "VISIBLE").length;
  return (
    <section className="mt-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className={sectionTitle}>Log</h2>
        <p className="text-app-small text-app-grey">{`${activity ? `${activity} ` : ""}${log.entries.length} ${log.entries.length === 1 ? "entry" : "entries"}. ${log.firstName} has shared ${shared} with you.`}</p>
      </div>
      <ul aria-label="Log entries" className={`${card} divide-y divide-app-line overflow-hidden`}>
        {log.entries.map((e) =>
          e.visibility === "HIDDEN" ? (
            <li key={e.id} className={`${ROW} items-center bg-app-private-ground`}>
              <p className={DATE}>{day(e.createdAt)}</p>
              <span><LogKindChip kind={e.kind} /></span>
              <p className="flex items-center gap-2 text-app-small text-app-ink">
                <EyeOff aria-hidden className="size-4 flex-none" />
                <strong>{e.hiddenAt ? `Made private by ${log.firstName} on ${day(e.hiddenAt)}` : "Private entry"}</strong>
              </p>
            </li>
          ) : (
            <li key={e.id} className={ROW}>
              <p className={DATE}>{day(e.createdAt)}</p>
              <span><LogKindChip kind={e.kind} /></span>
              <div className="flex min-w-0 flex-col gap-3">
                <RevisionContent body={e.body} fields={e.fields} />
                {e.editedAt && (
                  <p className="text-app-small text-app-grey">{`Edited · ${e.revisionCount} revisions, last on ${day(e.editedAt)}`}</p>
                )}
                {e.revisionCount > 1 && (
                  <details>
                    <summary className="min-h-11 cursor-pointer py-2 text-app-small font-semibold text-app-accent">{`History (${e.revisionCount} revisions)`}</summary>
                    <div className="mt-1"><LogHistory history={e.history} /></div>
                  </details>
                )}
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
