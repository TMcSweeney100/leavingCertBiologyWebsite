import type { ReactNode } from "react";

import type { Answer } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";

const OUTCOME = { ACCEPTED: "Accepted", NOT_YET: "Not yet" } as const;

/** Pack D-10: one line under the row: the newest answer, with the Full history button beside it. */
export function LastAnswerLine({ firstName, answers, action }: { firstName: string; answers: ReadonlyArray<Answer>; action?: ReactNode }) {
  const last = answers[0];
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-app-line pt-2.5">
      <p className="min-w-0 flex-1 text-app-small leading-[1.45] text-app-copy">
        {last
          ? <>{`${OUTCOME[last.outcome]} on ${formatCalendarDate(last.answeredOn)}. `}{last.teacherNote ? <span data-private>{`Your note: “${last.teacherNote}”`}</span> : "No note."}</>
          : <>No earlier answers. This is <span data-private>{firstName}</span>&rsquo;s first request for this checkpoint.</>}
      </p>
      {action}
    </div>
  );
}

/** R-16: answered requests, newest first, each round as the student's ask then the teacher's answer. Withdrawn ones aren't sent. */
export function AnswerList({ firstName, answers }: { firstName: string; answers: ReadonlyArray<Answer> }) {
  if (answers.length === 0) return null;
  return (
    <section className="flex flex-col">
      <h3 className="mb-1 font-heading text-[16px] font-bold text-app-ink">Answered, newest first</h3>
      <ol className="flex flex-col">
        {answers.map((a) => (
          <li key={`${a.askedOn}|${a.answeredOn}|${a.outcome}|${a.teacherNote ?? ""}`} className="grid gap-x-4 gap-y-1 border-t border-app-line py-3.5 text-app-meta leading-[1.45] text-app-copy sm:grid-cols-[96px_1fr]">
            <span className="font-mono text-app-label text-app-muted">{formatCalendarDate(a.askedOn)}</span>
            <span data-private>{a.note ? `${firstName} asked. “${a.note}”` : `${firstName} asked. No note.`}</span>
            <span className="font-mono text-app-label text-app-muted">{formatCalendarDate(a.answeredOn)}</span>
            <span>
              <strong className={a.outcome === "ACCEPTED" ? "text-app-signed" : "text-app-ink"}>{OUTCOME[a.outcome]}</strong>
              {a.teacherNote ? <span data-private>{`. Your note: “${a.teacherNote}”`}</span> : ". No note."}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** R-16: the student's side keeps the folded list; the teacher has LastAnswerLine and the drawer instead (pack D-10). */
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
