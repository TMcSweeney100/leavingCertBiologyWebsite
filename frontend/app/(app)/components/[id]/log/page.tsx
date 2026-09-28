import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ComponentTabs } from "@/components/app/component-tabs";
import { ErrorPanel } from "@/components/app/error-panel";
import { LogList } from "@/components/app/log-list";
import { backLink, pageTitle } from "@/components/app/styles";
import { componentViewSchema, logEntrySchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function LogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = encodeURIComponent(id);
  const [component, entries] = await Promise.all([
    attempt(() => serverApi.get(`/components/${path}`, componentViewSchema)),
    attempt(() => serverApi.get(`/components/${path}/log`, z.array(logEntrySchema))),
  ]);
  if (!component.ok && component.error.code === "NOT_FOUND") notFound();
  if (component.ok && component.data.view === "TEACHER") redirect(`/teach/classes/${component.data.classId}/component`);

  return (
    <AppMain>
      <Link href="/home" className={backLink}>Timeline</Link>
      {component.ok && component.data.view === "STUDENT" ? (
        <>
          <h1 className={`mt-2.5 ${pageTitle}`}>{`${component.data.subjectName} log`}</h1>
          <ComponentTabs componentId={component.data.id} current="log" />
          {entries.ok ? <LogList componentId={component.data.id} entries={entries.data} /> : <div className="mt-6"><ErrorPanel error={entries.error} /></div>}
        </>
      ) : (
        !component.ok && <div className="mt-6"><ErrorPanel error={component.error} /></div>
      )}
    </AppMain>
  );
}
