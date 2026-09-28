import type { TeacherStudentLog } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate, KIND_WORD } from "@/lib/app/log";

import { LogHistory, RevisionContent } from "./log-history";
import { card } from "./styles";

const day = (iso: string) => formatCalendarDate(dublinDate(iso));

/**
 * FR-24d: a hidden entry looks different from no entry. It shows its kind and date and, when the student
 * hid something they'd shown before (Q3), when — never its content, which the API doesn't send.
 */
export function TeacherLog({ log }: { log: TeacherStudentLog }) {
  if (log.entries.length === 0) {
    return <p className="mt-6 text-app-base text-app-grey">{`${log.firstName} hasn't written any log entries yet.`}</p>;
  }
  return (
    <ul aria-label="Log entries" className="mt-6 flex flex-col gap-3">
      {log.entries.map((e) =>
        e.visibility === "HIDDEN" ? (
          <li key={e.id} className={`${card} border-dashed px-4 py-3 text-app-small text-app-grey`}>
            {e.hiddenAt
              ? `${KIND_WORD[e.kind]} · ${day(e.createdAt)} · Hidden by the student on ${day(e.hiddenAt)}`
              : `${KIND_WORD[e.kind]} · Private entry · ${day(e.createdAt)}`}
          </li>
        ) : (
          <li key={e.id} className={`${card} flex flex-col gap-3 p-4`}>
            <p className="text-app-small text-app-grey">{`${KIND_WORD[e.kind]} · ${day(e.createdAt)}${e.editedAt ? " · Edited" : ""}`}</p>
            <RevisionContent body={e.body} fields={e.fields} />
            {e.revisionCount > 1 && (
              <details>
                <summary className="min-h-11 cursor-pointer text-app-small font-semibold text-app-accent">{`History (${e.revisionCount} revisions)`}</summary>
                <div className="mt-3"><LogHistory history={e.history} /></div>
              </details>
            )}
          </li>
        ),
      )}
    </ul>
  );
}
