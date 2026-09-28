import Link from "next/link";

import type { LogEntry } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate, entryTitle, KIND_WORD } from "@/lib/app/log";

import { LogVisibilityToggle } from "./log-visibility-toggle";
import { card, textLink } from "./styles";

/** Roadmap §6.2 `/components/[id]/log`: newest first; kind, date, "edited", and who can read each entry. */
export function LogList({ componentId, entries }: { componentId: string; entries: LogEntry[] }) {
  const newEntry = <Link href={`/components/${componentId}/log/new`} className={textLink}>New entry</Link>;
  if (entries.length === 0) {
    return (
      <div className="mt-6 flex flex-col gap-2">
        <p className="text-app-base text-app-grey">Nothing in your log yet.</p>
        {newEntry}
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-4">
      {newEntry}
      <ul aria-label="Log entries" className="flex flex-col gap-3">
        {entries.map((e) => {
          const title = entryTitle(e);
          return (
            <li key={e.id} className={`${card} flex flex-col gap-2 p-4 ${e.visibleToTeacher ? "" : "border-dashed"}`}>
              <p className="text-app-small text-app-grey">
                {`${KIND_WORD[e.kind]} · ${formatCalendarDate(dublinDate(e.createdAt))}${e.editedAt ? " · Edited" : ""}`}
              </p>
              <Link href={`/components/${componentId}/log/${e.id}`} className={`${textLink} text-app-lead font-semibold`}>{title}</Link>
              <p className="text-app-small text-app-copy">
                {e.visibleToTeacher ? "Your teacher can read this." : "Only you can read this. Your teacher sees the date."}
              </p>
              <LogVisibilityToggle entryId={e.id} title={title} visible={e.visibleToTeacher} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
