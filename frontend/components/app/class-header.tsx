import Link from "next/link";

import { backLink, pageTitle } from "./styles";

export type ClassTab = "students" | "component";

const TAB = "-mb-px border-b-2 px-0.5 py-2.5 text-app-base font-semibold";

/**
 * The top of every class page (pack D-2): back link, class name, and the section tabs. Progress is shown
 * but unusable until Phase 4.
 */
export function ClassHeader({
  detail,
  current,
}: {
  detail: { id: string; name: string; subjectName: string; yearGroup: number; academicYear: string };
  current: ClassTab;
}) {
  const tabs: ReadonlyArray<{ key: ClassTab; label: string; href: string }> = [
    { key: "students", label: "Students", href: `/teach/classes/${detail.id}` },
    { key: "component", label: "Component", href: `/teach/classes/${detail.id}/component` },
  ];
  return (
    <>
      <Link href="/teach" className={backLink}>
        My classes
      </Link>
      <h1 className={`mt-2.5 break-words ${pageTitle}`}>{detail.name}</h1>
      <p className="mt-1.5 text-app-base text-app-grey">
        {detail.subjectName}, year {detail.yearGroup}, {detail.academicYear}
      </p>
      <nav aria-label="Class sections" className="mt-5 flex gap-6 border-b border-app-line">
        {tabs.map((tab) =>
          tab.key === current ? (
            <Link key={tab.key} href={tab.href} aria-current="page" className={`${TAB} border-app-accent text-app-accent`}>
              {tab.label}
            </Link>
          ) : (
            <Link key={tab.key} href={tab.href} className={`${TAB} border-transparent text-app-grey hover:text-app-ink`}>
              {tab.label}
            </Link>
          ),
        )}
        <span aria-disabled="true" className={`${TAB} cursor-not-allowed border-transparent text-app-disabled`}>
          Progress
        </span>
      </nav>
    </>
  );
}
