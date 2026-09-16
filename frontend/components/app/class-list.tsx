import Link from "next/link";

import type { ClassSummary } from "@/lib/api/schemas";

/** Roadmap §6.2 `/teach`: my classes with subject, name, year group, academic year, pending count. */
export function ClassList({ classes }: { classes: ClassSummary[] }) {
  return (
    <section aria-labelledby="teach-heading">
      <h1 id="teach-heading">My classes</h1>
      {classes.length === 0 ? (
        <p>No classes yet. Create one and read its join code out to the class.</p>
      ) : (
        <ul>
          {classes.map((c) => (
            <li key={c.id}>
              <Link href={`/teach/classes/${c.id}`}>
                {c.name} — {c.subjectName}
              </Link>{" "}
              Year {c.yearGroup}, {c.academicYear}
              {c.level ? `, ${c.level.toLowerCase()}` : ""}
              {c.pendingCount > 0 && (
                <>
                  {" "}
                  · {c.pendingCount} pending {c.pendingCount === 1 ? "request" : "requests"}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link href="/teach/classes/new">Create class</Link>
    </section>
  );
}
