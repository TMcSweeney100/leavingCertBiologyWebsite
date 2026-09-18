import { notFound } from "next/navigation";
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ClassHeader } from "@/components/app/class-header";
import { CreateComponentForm } from "@/components/app/create-component-form";
import { ErrorPanel } from "@/components/app/error-panel";
import { StageDatesForm } from "@/components/app/stage-dates-form";
import { briefSummarySchema, classDetailSchema, teacherComponentSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function ClassComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const body = cls.componentId
    ? await attempt(() => serverApi.get(`/components/${cls.componentId}`, teacherComponentSchema))
    : await attempt(() => serverApi.get(`/briefs?subjectCode=${encodeURIComponent(cls.subjectCode)}`, z.array(briefSummarySchema)));

  return (
    <AppMain width="class">
      <ClassHeader detail={cls} current="component" />
      {!body.ok ? (
        <div className="mt-6">
          <ErrorPanel error={body.error} />
        </div>
      ) : Array.isArray(body.data) ? (
        <CreateComponentForm classId={cls.id} briefs={body.data} />
      ) : (
        <StageDatesForm component={body.data} />
      )}
    </AppMain>
  );
}
