import Link from "next/link";

import type { EnrolmentView } from "@/lib/api/schemas";

const STATUS_LABEL = { PENDING: "Pending approval", APPROVED: "Approved", REMOVED: "Removed" } as const;

/** Roadmap §6.2 `/home` in 1D: my classes with status. The timeline arrives in Phase 2. */
export function MyClasses({ classes }: { classes: EnrolmentView[] }) {
  const allPending = classes.length > 0 && classes.every((c) => c.status === "PENDING");
  return (
    <section aria-labelledby="classes-heading">
      <h1 id="classes-heading">My classes</h1>
      {classes.length === 0 ? (
        <p>No classes yet. Ask your teacher for a join code.</p>
      ) : (
        <ul>
          {classes.map((c) => (
            <li key={c.enrolmentId}>
              <strong>{c.className}</strong> — {c.subjectName}, {c.schoolName}: {STATUS_LABEL[c.status]}
            </li>
          ))}
        </ul>
      )}
      {allPending && <p role="status">Waiting for a teacher to approve you. Check back after class.</p>}
      <Link href="/join">Join a class</Link>
    </section>
  );
}
