import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { WaitingRequest } from "@/lib/api/schemas";
import { fullName } from "@/lib/app/progress";
import { checkpointAnchor, reviewName } from "@/lib/app/ready";

import { card } from "./styles";

/**
 * Plan progress-redesign P-12: pinned to the bottom of the window while another student is waiting, so a teacher
 * can answer a run of requests without going back to Progress. It is the last thing in the page, so at the very end
 * it sits in the flow and covers nothing; `data-next-request` gives the page scroll padding (globals.css), so a
 * control focused by keyboard is never left underneath it.
 */
export function NextRequest({ classId, next, others }: { classId: string; next: WaitingRequest; others: number }) {
  const name = fullName(next);
  return (
    <nav aria-label="Next request" data-next-request
      className={`${card} sticky bottom-3 z-10 mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-app-accent px-[18px] py-2.5`}>
      <p className="text-app-small text-app-copy">
        <span data-private>{others}</span> {others === 1 ? "more request is" : "more requests are"} waiting for you
      </p>
      <Link href={`/teach/classes/${classId}/students/${next.studentId}#${checkpointAnchor(next.checkpointId)}`}
        aria-label={`Next request: ${reviewName(next.checkpointText, name)}`} className={buttonVariants()}>
        Next: <span data-private>{name}</span> <span aria-hidden>›</span>
      </Link>
    </nav>
  );
}
