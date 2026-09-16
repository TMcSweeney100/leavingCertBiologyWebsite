import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { ClassSummary } from "@/lib/api/schemas";

import { card, pageTitle } from "./styles";
import { subjectEdge } from "./subject";

const LEVEL = { HIGHER: "Higher", ORDINARY: "Ordinary", MIXED: "Mixed" } as const;

/**
 * Roadmap §6.2 `/teach`: my classes with subject, name, year group, academic year, pending count.
 * Pack D-2: the amber badge appears only when requests are waiting, so the eye lands on those rows.
 */
export function ClassList({ classes }: { classes: ClassSummary[] }) {
  const create = (
    <Link href="/teach/classes/new" className={buttonVariants({ size: "form" })}>
      Create class
    </Link>
  );
  return (
    <section aria-labelledby="teach-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 id="teach-heading" className={pageTitle}>
          My classes
        </h1>
        {classes.length > 0 && create}
      </div>
      {classes.length === 0 ? (
        <div className="mt-[22px] flex flex-col items-start gap-4 rounded-app-card border border-dashed border-app-field-border bg-app-surface p-6 lg:p-8">
          <p className="max-w-[440px] text-app-base leading-normal text-pretty">
            No classes yet. Create one and read its join code out to the class.
          </p>
          {create}
        </div>
      ) : (
        <ul className="mt-[22px] flex flex-col gap-2.5">
          {classes.map((c) => (
            <li
              key={c.id}
              className={`relative flex flex-col gap-3 border-l-4 px-[18px] py-4 transition-[background-color] duration-[var(--app-duration)] hover:bg-app-accent-tint lg:flex-row lg:items-center lg:gap-[18px] ${card} ${subjectEdge(c.subjectCode)}`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                {/* The link's hit area covers the card; the badge stays readable text on top. */}
                <Link
                  href={`/teach/classes/${c.id}`}
                  className="font-heading text-app-title font-bold tracking-[-.02em] break-words text-app-ink after:absolute after:inset-0 after:rounded-app-card"
                >
                  {c.name}
                </Link>
                <p className="text-app-meta text-app-grey">
                  {[c.subjectName, `Year ${c.yearGroup}`, c.academicYear, c.level && LEVEL[c.level]].filter(Boolean).join(" · ")}
                </p>
              </div>
              {c.pendingCount > 0 && (
                <span className="inline-flex flex-none items-center gap-2 self-start rounded-full bg-app-attention py-[7px] pr-[13px] pl-2.5 text-app-meta font-semibold text-app-on-accent tabular-nums lg:self-auto">
                  <span className="font-mono text-app-lead font-bold">{c.pendingCount}</span>{" "}
                  <span>pending {c.pendingCount === 1 ? "request" : "requests"}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
