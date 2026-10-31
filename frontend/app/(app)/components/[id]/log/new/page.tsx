import { notFound, redirect } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { LogEntryForm } from "@/components/app/log-entry-form";
import { BackLink } from "@/components/app/back-link";
import { card, pageTitle } from "@/components/app/styles";
import { componentViewSchema, entryKindSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { toIsoDate } from "@/lib/app/timeline";
import { dublinToday } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function NewLogEntryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string }> }) {
  const { id } = await params;
  const asked = entryKindSchema.safeParse((await searchParams).kind);
  const component = await attempt(() => serverApi.get(`/components/${encodeURIComponent(id)}`, componentViewSchema));
  if (!component.ok && component.error.code === "NOT_FOUND") notFound();
  if (component.ok && component.data.view === "TEACHER") redirect(`/teach/classes/${component.data.classId}/component`);

  return (
    <AppMain>
      <BackLink href={`/components/${id}/log`}>Log</BackLink>
      <h1 className={`mt-2.5 ${pageTitle}`}>New entry</h1>
      {component.ok ? (() => {
        // Today's Irish date comes from the server so the FR-24e line can't disagree with the entry's date.
        const today = toIsoDate(dublinToday());
        return (
          <>
            <p className="mt-2 text-app-small text-app-grey lg:hidden">{`Dated ${formatCalendarDate(today)} when you save. You can't change the date.`}</p>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_250px] lg:items-start">
              <LogEntryForm mode="create" componentId={component.data.id} today={today} kind={asked.success ? asked.data : undefined} />
              <aside className={`${card} hidden p-4 text-app-small text-app-copy lg:block`}>
                <p className="font-mono text-app-label font-bold uppercase tracking-[.09em] text-app-muted">Date</p>
                <p className="mt-1 text-app-base font-semibold text-app-ink">{formatCalendarDate(today)}</p>
                <p className="mt-2">Set when you save. It can&apos;t be changed.</p>
              </aside>
            </div>
          </>
        );
      })() : <div className="mt-6"><ErrorPanel error={component.error} /></div>}
    </AppMain>
  );
}
