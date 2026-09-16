import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { EnrolmentView } from "@/lib/api/schemas";

import { card, eyebrow, pageTitle } from "./styles";
import { subjectEdge } from "./subject";

const STATUS = {
  PENDING: { label: "Pending approval", colour: "text-app-attention" },
  APPROVED: { label: "Approved", colour: "text-app-approved" },
  REMOVED: { label: "Removed", colour: "text-app-error-hover" },
} as const;

/**
 * Roadmap §6.2 `/home` in 1D: my classes with status. The timeline arrives in Phase 2 (pack D-4);
 * until then this borrows D-2's class cards and D-1's status eyebrows.
 */
export function MyClasses({ classes }: { classes: EnrolmentView[] }) {
  const allPending = classes.length > 0 && classes.every((c) => c.status === "PENDING");
  return (
    <section aria-labelledby="classes-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 id="classes-heading" className={pageTitle}>
          My classes
        </h1>
        <Link href="/join" className={buttonVariants({ size: "form" })}>
          Join a class
        </Link>
      </div>
      {classes.length === 0 ? (
        <p className="mt-[22px] rounded-app-card border border-dashed border-app-field-border bg-app-surface p-6 text-app-base">
          No classes yet. Ask your teacher for a join code.
        </p>
      ) : (
        <ul className="mt-[22px] flex flex-col gap-2.5">
          {classes.map((c) => (
            <li key={c.enrolmentId} className={`flex flex-col gap-1 border-l-4 px-[18px] py-4 ${card} ${subjectEdge(c.subjectName)}`}>
              <p className={`${eyebrow} ${STATUS[c.status].colour}`}>{STATUS[c.status].label}</p>
              <p className="font-heading text-app-title font-bold tracking-[-.02em] break-words text-app-ink">{c.className}</p>
              <p className="text-app-meta text-app-grey">
                {c.subjectName} · {c.schoolName}
              </p>
            </li>
          ))}
        </ul>
      )}
      {allPending && (
        <p role="status" className="mt-4 text-app-base text-app-grey">
          Waiting for a teacher to approve you. Check back after class.
        </p>
      )}
    </section>
  );
}
