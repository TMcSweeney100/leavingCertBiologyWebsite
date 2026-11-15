import type { DocumentLink } from "@/lib/api/schemas";
import { initials } from "@/lib/app/student-page";

import { card } from "./styles";
import { WorkLinkBlock } from "./work-link";

/** Direction D: who the page is about. Initials, name (the page's h1), class, when they last wrote, and their work (R-18). */
export function StudentHeader({ student, className, activity, link }:
  { student: { firstName: string; lastName: string }; className: string; activity: string | null; link: DocumentLink | null }) {
  const name = `${student.firstName} ${student.lastName}`;
  return (
    <div className={`${card} mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-3 p-4 lg:px-[18px]`}>
      <span aria-hidden className="flex size-12 flex-none items-center justify-center rounded-app-card bg-app-accent font-heading text-[20px] font-bold text-app-on-accent">
        {initials(student)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-app-help text-app-muted">{activity ? `${className} · ${activity}` : className}</p>
        <h1 className="font-heading text-[24px] leading-[1.2] font-bold tracking-[-.015em] text-balance text-app-ink lg:text-[26px]">{name}</h1>
      </div>
      {link && <WorkLinkBlock url={link.url} name={name} firstName={student.firstName} className="w-full sm:w-auto" />}
    </div>
  );
}
