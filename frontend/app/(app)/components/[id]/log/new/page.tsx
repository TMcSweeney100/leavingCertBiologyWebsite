import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { LogEntryForm } from "@/components/app/log-entry-form";
import { backLink, pageTitle } from "@/components/app/styles";
import { componentViewSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { toIsoDate } from "@/lib/app/timeline";
import { dublinToday } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function NewLogEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const component = await attempt(() => serverApi.get(`/components/${encodeURIComponent(id)}`, componentViewSchema));
  if (!component.ok && component.error.code === "NOT_FOUND") notFound();
  if (component.ok && component.data.view === "TEACHER") redirect(`/teach/classes/${component.data.classId}/component`);

  return (
    <AppMain>
      <Link href={`/components/${id}/log`} className={backLink}>Log</Link>
      <h1 className={`mt-2.5 ${pageTitle}`}>New entry</h1>
      {component.ok
        // Today's Irish date comes from the server so the FR-24e line can't disagree with the entry's date.
        ? <LogEntryForm mode="create" componentId={component.data.id} today={toIsoDate(dublinToday())} />
        : <div className="mt-6"><ErrorPanel error={component.error} /></div>}
    </AppMain>
  );
}
