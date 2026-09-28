import { Eye, EyeOff, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { LogHistory, RevisionContent } from "@/components/app/log-history";
import { LogKindChip } from "@/components/app/log-kind-chip";
import { LogVisibilityToggle } from "@/components/app/log-visibility-toggle";
import { backLink, card, pageTitle, sectionTitle } from "@/components/app/styles";
import { buttonVariants } from "@/components/ui/button";
import { logEntryDetailSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate, entryHeading, entryTitle } from "@/lib/app/log";

export const dynamic = "force-dynamic";

const day = (iso: string) => formatCalendarDate(dublinDate(iso));

export default async function LogEntryPage({ params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { id, entryId } = await params;
  const loaded = await attempt(() => serverApi.get(`/log/${encodeURIComponent(entryId)}`, logEntryDetailSchema));
  if (!loaded.ok && loaded.error.code === "NOT_FOUND") notFound();
  // An entry from another component under this URL is a 404 too.
  if (loaded.ok && loaded.data.entry.componentId !== id) notFound();

  return (
    <AppMain>
      <Link href={`/components/${id}/log`} className={backLink}>Log</Link>
      {loaded.ok ? (() => {
        const { entry, history } = loaded.data;
        const current = history[0];
        const visible = entry.visibleToTeacher;
        return (
          <>
            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <LogKindChip kind={entry.kind} />
              {entry.editedAt && <span className="flex items-center gap-1 text-app-small text-app-grey"><Pencil aria-hidden className="size-3.5" />{`Edited · ${entry.revisionCount} revisions`}</span>}
            </div>
            {/* A note has no title, so its date is the heading; repeating the body there reads badly. */}
            <h1 className={`mt-2 ${pageTitle}`}>{entry.kind === "NOTE" ? day(entry.createdAt) : entryHeading(entry)}</h1>
            <p className="mt-2 text-app-small text-app-grey">
              {`${entry.kind === "NOTE" ? "" : `${day(entry.createdAt)}. `}Last revised ${day(current.createdAt)}. Dates are set by the app and can't be changed.`}
            </p>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
              <aside className="flex flex-col gap-4 lg:order-2">
                <div className={`${card} flex flex-col gap-3 p-4 ${visible ? "" : "bg-app-private-ground"}`}>
                  <p className="flex items-start gap-2 text-app-small text-app-copy">
                    {visible ? <Eye aria-hidden className="mt-0.5 size-4 flex-none" /> : <EyeOff aria-hidden className="mt-0.5 size-4 flex-none" />}
                    <span>
                      {visible
                        ? <><strong className="text-app-ink">Your teacher can read this</strong>{`, including all ${entry.revisionCount} ${entry.revisionCount === 1 ? "revision" : "revisions"}.`}</>
                        : <><strong className="text-app-ink">Only you can read this.</strong> Your teacher sees the date.</>}
                    </span>
                  </p>
                  <LogVisibilityToggle entryId={entryId} title={entryTitle(entry)} visible={visible} />
                </div>
                <Link href={`/components/${id}/log/${entryId}/revise`} className={buttonVariants({ size: "form" })}>Revise entry</Link>
                <p className="text-app-help text-app-muted">Revising adds a new version. Earlier ones stay in the history. Nothing is deleted.</p>
              </aside>
              <div className="flex min-w-0 flex-col gap-8 lg:order-1">
                <RevisionContent body={entry.body} fields={entry.fields} />
                <section aria-labelledby="history-heading" className="flex flex-col gap-3">
                  <h2 id="history-heading" className={sectionTitle}>History</h2>
                  <LogHistory history={history} />
                </section>
              </div>
            </div>
          </>
        );
      })() : (
        <div className="mt-6"><ErrorPanel error={loaded.error} /></div>
      )}
    </AppMain>
  );
}
