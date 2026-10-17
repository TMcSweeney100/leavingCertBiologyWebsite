import type { Answer } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";

const OUTCOME = { ACCEPTED: "Accepted", NOT_YET: "Not yet" } as const;

/** R-16: answered requests, newest first, the same on both sides. Withdrawn ones aren't sent. */
export function RequestHistory({ answers, studentLabel = "Your note" }: { answers: ReadonlyArray<Answer>; studentLabel?: string }) {
  if (answers.length === 0) return null;
  return (
    <details className="text-app-small">
      <summary className="min-h-11 cursor-pointer content-center font-semibold text-app-accent">{`Earlier requests (${answers.length})`}</summary>
      <ul className="mt-1 flex flex-col gap-2">
        {answers.map((a, i) => (
          <li key={i} className="flex flex-col gap-0.5 border-l-[3px] border-l-app-line pl-3 text-app-copy">
            <span className="font-mono text-app-label text-app-grey">{`Asked ${formatCalendarDate(a.askedOn)} · ${OUTCOME[a.outcome]} ${formatCalendarDate(a.answeredOn)}`}</span>
            {a.note && <span>{`${studentLabel}: ${a.note}`}</span>}
            {a.teacherNote && <span>{`Teacher: ${a.teacherNote}`}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}
