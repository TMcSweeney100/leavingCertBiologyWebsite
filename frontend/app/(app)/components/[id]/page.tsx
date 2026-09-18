import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ComponentOverview } from "@/components/app/component-overview";
import { ComponentTabs } from "@/components/app/component-tabs";
import { ErrorPanel } from "@/components/app/error-panel";
import { backLink, pageTitle } from "@/components/app/styles";
import { componentViewSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function ComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await attempt(() => serverApi.get(`/components/${encodeURIComponent(id)}`, componentViewSchema));
  if (!loaded.ok && loaded.error.code === "NOT_FOUND") notFound();
  // Plan 2E P2-41: a teacher opening their own class's component belongs on its Component tab.
  if (loaded.ok && loaded.data.view === "TEACHER") redirect(`/teach/classes/${loaded.data.classId}/component`);

  return (
    <AppMain>
      <Link href="/home" className={backLink}>Timeline</Link>
      {loaded.ok && loaded.data.view === "STUDENT" ? (
        <>
          <h1 className={`mt-2.5 ${pageTitle}`}>{loaded.data.subjectName}</h1>
          <p className="mt-1.5 text-app-base text-app-grey">{`${loaded.data.brief.title}, ${loaded.data.brief.examYear} · ${loaded.data.className}`}</p>
          <ComponentTabs componentId={loaded.data.id} />
          <ComponentOverview component={loaded.data} />
        </>
      ) : (
        !loaded.ok && <div className="mt-6"><ErrorPanel error={loaded.error} /></div>
      )}
    </AppMain>
  );
}
