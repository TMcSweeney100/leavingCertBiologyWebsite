import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { AiAppendix } from "@/components/app/ai-appendix";
import { ComponentTabs } from "@/components/app/component-tabs";
import { ErrorPanel } from "@/components/app/error-panel";
import { SourceList } from "@/components/app/source-list";
import { BackLink } from "@/components/app/back-link";
import { pageTitle } from "@/components/app/styles";
import { componentViewSchema, logEntrySchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import type { ListEntry } from "@/lib/app/citation";

export const dynamic = "force-dynamic";

/** The entries a reference list is built from: sources and AI uses; notes are left out. */
const listed = (entries: z.infer<typeof logEntrySchema>[]): ListEntry[] =>
  entries.flatMap((e): ListEntry[] =>
    e.kind === "SOURCE" ? [{ id: e.id, kind: e.kind, fields: e.fields }]
      : e.kind === "AI_USE" ? [{ id: e.id, kind: e.kind, fields: e.fields }] : []);

/** Roadmap §6 `/components/[id]/sources`. Reads the student's own log, hidden entries included (decisions S-14, A-3). */
export default async function SourcesPage({ params }: { params: Promise<{ id: string }> }) {
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
      <BackLink href="/home">Timeline</BackLink>
      {component.ok && component.data.view === "STUDENT" ? (
        <>
          <h1 className={`mt-2.5 ${pageTitle}`}>{`${component.data.subjectName} sources`}</h1>
          <ComponentTabs componentId={component.data.id} current="sources" />
          {entries.ok ? (
            <>
              <SourceList componentId={component.data.id} entries={listed(entries.data)} />
              <AiAppendix componentId={component.data.id} uses={listed(entries.data).flatMap((e) => (e.kind === "AI_USE" ? [e] : []))} />
            </>
          ) : <div className="mt-6"><ErrorPanel error={entries.error} /></div>}
        </>
      ) : (
        !component.ok && <div className="mt-6"><ErrorPanel error={component.error} /></div>
      )}
    </AppMain>
  );
}
