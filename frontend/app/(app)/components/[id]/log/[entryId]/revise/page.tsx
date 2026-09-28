import Link from "next/link";
import { notFound } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { LogEntryForm } from "@/components/app/log-entry-form";
import { backLink, card, pageTitle } from "@/components/app/styles";
import { logEntryDetailSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate, KIND_WORD } from "@/lib/app/log";
import { toIsoDate } from "@/lib/app/timeline";
import { dublinToday } from "@/lib/schedule";

export const dynamic = "force-dynamic";

/** Pack D-6, frame 2j: revising is its own page, so Back and the unsaved-changes guard have one place to go. */
export default async function ReviseLogEntryPage({ params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { id, entryId } = await params;
  const loaded = await attempt(() => serverApi.get(`/log/${encodeURIComponent(entryId)}`, logEntryDetailSchema));
  if (!loaded.ok && loaded.error.code === "NOT_FOUND") notFound();
  if (loaded.ok && loaded.data.entry.componentId !== id) notFound();

  if (!loaded.ok) {
    return <AppMain><Link href={`/components/${id}/log/${entryId}`} className={backLink}>Back</Link><div className="mt-6"><ErrorPanel error={loaded.error} /></div></AppMain>;
  }
  const { entry, history } = loaded.data;
  const first = formatCalendarDate(dublinDate(entry.createdAt));
  const today = toIsoDate(dublinToday());
  return (
    <AppMain>
      <Link href={`/components/${id}/log/${entryId}`} className={backLink}>{`${KIND_WORD[entry.kind]}, ${first}`}</Link>
      <h1 className={`mt-2.5 ${pageTitle}`}>{`Revise ${KIND_WORD[entry.kind].toLowerCase()}`}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_250px] lg:items-start">
        <LogEntryForm mode="revise" entryId={entryId} kind={entry.kind} body={entry.body}
          fields={entry.fields as Record<string, string | null> | null} componentId={id} today={today}
          revisionCount={entry.revisionCount} lastRevisedOn={dublinDate(history[0].createdAt)} visible={entry.visibleToTeacher} />
        <aside className={`${card} hidden p-4 text-app-small text-app-copy lg:block`}>
          <p className="font-mono text-app-label font-bold uppercase tracking-[.09em] text-app-muted">Revision date</p>
          <p className="mt-1 text-app-base font-semibold text-app-ink">{formatCalendarDate(today)}</p>
          <p className="mt-2">{`The entry keeps its first date, ${first}.`}</p>
        </aside>
      </div>
    </AppMain>
  );
}
