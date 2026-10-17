import Link from "next/link";

import type { WaitingRequest } from "@/lib/api/schemas";
import { askedWhen, checkpointAnchor, reviewName, waitingHeading } from "@/lib/app/ready";
import { fullName, shortCheckpoint } from "@/lib/app/progress";

import { card, sectionTitle } from "./styles";

/** Backlog §1: "3 students waiting for you", oldest request first; each opens the student page at that checkpoint (R-3). */
export function WaitingQueue({ classId, today, waiting }: { classId: string; today: string; waiting: ReadonlyArray<WaitingRequest> }) {
  if (waiting.length === 0) return null;
  const students = new Set(waiting.map((w) => w.studentId)).size;
  return (
    <section aria-labelledby="queue-heading" className={`${card} mt-6 flex flex-col gap-2 border-l-4 border-l-app-ready p-5`}>
      <h2 id="queue-heading" className={sectionTitle}>{waitingHeading(students)}</h2>
      <ol className="flex flex-col divide-y divide-app-line">
        {waiting.map((w) => {
          const name = fullName(w);
          return (
            <li key={`${w.studentId}/${w.checkpointId}`} className="flex flex-col gap-0.5 py-2">
              <Link href={`/teach/classes/${classId}/students/${w.studentId}#${checkpointAnchor(w.checkpointId)}`}
                aria-label={reviewName(w.checkpointText, name)}
                className="min-h-11 content-center text-app-base font-semibold text-app-accent underline underline-offset-3">
                <span data-private>{name}</span>{` · ${shortCheckpoint(w.checkpointText)}`}
              </Link>
              <span className="text-app-small text-app-grey"><span data-private>{askedWhen(w.askedOn, today)}</span></span>
              {w.note && <span data-private className="text-app-small text-app-copy">{w.note}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
