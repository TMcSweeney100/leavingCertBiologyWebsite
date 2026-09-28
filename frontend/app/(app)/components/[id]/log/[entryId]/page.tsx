import Link from "next/link";
import { notFound } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { LogEntryForm } from "@/components/app/log-entry-form";
import { LogHistory } from "@/components/app/log-history";
import { LogVisibilityToggle } from "@/components/app/log-visibility-toggle";
import { backLink, pageTitle, sectionTitle } from "@/components/app/styles";
import { logEntryDetailSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { entryTitle, KIND_WORD } from "@/lib/app/log";
import { toIsoDate } from "@/lib/app/timeline";
import { dublinToday } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function LogEntryPage({ params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { id, entryId } = await params;
  const loaded = await attempt(() => serverApi.get(`/log/${encodeURIComponent(entryId)}`, logEntryDetailSchema));
  if (!loaded.ok && loaded.error.code === "NOT_FOUND") notFound();
  // An entry from another component under this URL is a 404 too.
  if (loaded.ok && loaded.data.entry.componentId !== id) notFound();

  return (
    <AppMain>
      <Link href={`/components/${id}/log`} className={backLink}>Log</Link>
      {loaded.ok ? (
        <>
          <p className="mt-2.5 text-app-small text-app-grey">{KIND_WORD[loaded.data.entry.kind]}</p>
          <h1 className={pageTitle}>{entryTitle(loaded.data.entry)}</h1>
          <p className="mt-2 text-app-small text-app-copy">
            {loaded.data.entry.visibleToTeacher ? "Your teacher can read this, and its history." : "Only you can read this. Your teacher sees the date."}
          </p>
          <div className="mt-3">
            <LogVisibilityToggle entryId={entryId} title={entryTitle(loaded.data.entry)} visible={loaded.data.entry.visibleToTeacher} />
          </div>
          <section aria-labelledby="revise-heading" className="mt-8">
            <h2 id="revise-heading" className={sectionTitle}>Edit</h2>
            <p className="text-app-small text-app-grey">Saving adds a new revision. The earlier ones stay in the history.</p>
            <LogEntryForm mode="revise" entryId={entryId} kind={loaded.data.entry.kind} body={loaded.data.entry.body}
              fields={loaded.data.entry.fields as Record<string, string | null> | null} componentId={id} today={toIsoDate(dublinToday())} />
          </section>
          <section aria-labelledby="history-heading" className="mt-8">
            <h2 id="history-heading" className={sectionTitle}>History</h2>
            <LogHistory history={loaded.data.history} />
          </section>
        </>
      ) : (
        <div className="mt-6"><ErrorPanel error={loaded.error} /></div>
      )}
    </AppMain>
  );
}
