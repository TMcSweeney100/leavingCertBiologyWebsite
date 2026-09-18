import Link from "next/link";

import type { MyComponent } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";

import { card, sectionTitle } from "./styles";
import { subjectEdge } from "./subject";

/** Working-first student navigation to each component (plan 2E P2-40), until D-4 designs it. */
export function MyComponents({ components }: { components: MyComponent[] }) {
  if (components.length === 0) return null;
  return (
    <section aria-labelledby="my-components" className="flex flex-col gap-3">
      <h2 id="my-components" className={sectionTitle}>My components</h2>
      <ul className="flex flex-col gap-2">
        {components.map((c) => (
          <li key={c.componentId}>
            <Link href={`/components/${c.componentId}`} className={`${card} flex flex-col gap-0.5 border-l-4 p-4 ${subjectEdge(c.subjectCode)}`}>
              <span className="font-semibold text-app-ink">{c.subjectName}</span>
              <span className="text-app-small text-app-grey">{c.briefTitle} · completion date {formatCalendarDate(c.completionDate)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
