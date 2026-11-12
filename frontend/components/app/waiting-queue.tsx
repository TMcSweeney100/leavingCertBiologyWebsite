import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { WaitingRequest } from "@/lib/api/schemas";
import { askedWhen, checkpointAnchor, reviewName, waitingHeading } from "@/lib/app/ready";
import { fullName } from "@/lib/app/progress";

import { card } from "./styles";

/**
 * "3 students waiting for you", oldest request first; each Review opens the student page at that checkpoint (R-3).
 * Design B's waiting card (plan progress-redesign): an amber strip over one row per request. It is the Progress
 * tab's main job, so every request is listed.
 */
export function WaitingQueue({ classId, today, waiting }: { classId: string; today: string; waiting: ReadonlyArray<WaitingRequest> }) {
  if (waiting.length === 0) return null;
  const students = new Set(waiting.map((w) => w.studentId)).size;
  return (
    <section aria-labelledby="queue-heading" className={`${card} mt-6 overflow-hidden border-app-attention-line`}>
      <h2 id="queue-heading" className="flex items-center gap-2 bg-app-attention-tint px-[18px] py-2.5 font-heading text-app-base font-bold text-app-attention">
        <span aria-hidden className="size-2 flex-none rounded-full bg-app-attention" />
        {waitingHeading(students)}
      </h2>
      <ol className="flex flex-col divide-y divide-app-line">
        {waiting.map((w) => {
          const name = fullName(w);
          return (
            <li key={`${w.studentId}/${w.checkpointId}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-[18px] py-3">
              <div className="flex min-w-0 flex-1 basis-72 flex-col gap-0.5">
                <p className="font-semibold text-app-ink"><span data-private>{name}</span></p>
                <p className="text-app-small text-app-copy">
                  <span>{w.checkpointText}</span>{" · "}<span data-private className="text-app-grey">{askedWhen(w.askedOn, today)}</span>
                </p>
                {w.note && <p data-private className="text-app-small text-app-copy">{w.note}</p>}
              </div>
              <Link href={`/teach/classes/${classId}/students/${w.studentId}#${checkpointAnchor(w.checkpointId)}`}
                aria-label={reviewName(w.checkpointText, name)} className={buttonVariants()}>
                Review
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
