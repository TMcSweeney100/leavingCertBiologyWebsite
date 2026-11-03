import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ClassHeader } from "@/components/app/class-header";
import { CreateComponentForm } from "@/components/app/create-component-form";
import { ErrorPanel } from "@/components/app/error-panel";
import { RequireLinkSwitch } from "@/components/app/require-link-switch";
import { StageDatesForm } from "@/components/app/stage-dates-form";
import { briefSummarySchema, classDetailSchema, progressGridSchema, teacherComponentSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { HIDE_NAMES_COOKIE } from "@/lib/app/progress";
import { dublinToday } from "@/lib/schedule";
import { toIsoDate } from "@/lib/app/timeline";

export const dynamic = "force-dynamic";

export default async function ClassComponentPage({ params, searchParams }:
  { params: Promise<{ id: string }>; searchParams: Promise<{ stage?: string }> }) {
  const { id } = await params;
  const { stage } = await searchParams;
  const detail = await attempt(() => serverApi.get(`/classes/${encodeURIComponent(id)}`, classDetailSchema));
  // Another teacher's class is a 404 from Spring, and stays a 404 here.
  if (!detail.ok && detail.error.code === "NOT_FOUND") notFound();
  if (!detail.ok) {
    return (
      <AppMain width="class">
        <ErrorPanel error={detail.error} />
      </AppMain>
    );
  }

  const cls = detail.data;
  if (!cls.componentId) {
    const briefs = await attempt(() =>
      serverApi.get(`/briefs?subjectCode=${encodeURIComponent(cls.subjectCode)}`, z.array(briefSummarySchema)));
    return (
      <AppMain width="class">
        <ClassHeader detail={cls} current="component" />
        {briefs.ok ? <CreateComponentForm classId={cls.id} briefs={briefs.data} /> : <div className="mt-6"><ErrorPanel error={briefs.error} /></div>}
      </AppMain>
    );
  }

  // The grid feeds the stage sheet's counts and ticks (S-15). Both start at once; a failed grid blanks those two
  // sections of the sheet, never the page.
  const [body, progress] = await Promise.all([
    attempt(() => serverApi.get(`/components/${cls.componentId}`, teacherComponentSchema)),
    attempt(() => serverApi.get(`/components/${cls.componentId}/progress`, progressGridSchema)),
  ]);
  // Read on the server so names arrive already blurred, as on Progress (plan P4-15, S-20).
  const hideNames = (await cookies()).get(HIDE_NAMES_COOKIE)?.value === "1";

  return (
    <AppMain width="class">
      <ClassHeader detail={cls} current="component" />
      {!body.ok ? (
        <div className="mt-6">
          <ErrorPanel error={body.error} />
        </div>
      ) : (
        // The year view needs today's Dublin date; deriving it on the server keeps it off the
        // client's clock, the same rule the student pages follow.
        <>
          <RequireLinkSwitch componentId={body.data.id} requireLink={body.data.requireLink} />
          <StageDatesForm component={body.data} today={toIsoDate(dublinToday())} initialStage={stage ?? null}
            progress={progress} hideNames={hideNames} />
        </>
      )}
    </AppMain>
  );
}
