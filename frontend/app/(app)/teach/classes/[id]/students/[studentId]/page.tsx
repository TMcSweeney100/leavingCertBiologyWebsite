import Link from "next/link";
import { notFound } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { NextRequest } from "@/components/app/next-request";
import { StudentCheckpoints } from "@/components/app/student-checkpoints";
import { StudentHeader } from "@/components/app/student-header";
import { TeacherLog } from "@/components/app/teacher-log";
import { BackLink } from "@/components/app/back-link";
import { card, pageTitle, sectionTitle } from "@/components/app/styles";
import { classDetailSchema, progressGridSchema, studentCheckpointsSchema, teacherStudentLogSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { buttonVariants } from "@/components/ui/button";
import { attempt } from "@/lib/app/attempt";
import { lastEntryWords } from "@/lib/app/progress";
import { nextRequest } from "@/lib/app/ready";

export const dynamic = "force-dynamic";

export default async function StudentLogPage({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params;
  const detail = await attempt(() => serverApi.get(`/classes/${encodeURIComponent(id)}`, classDetailSchema));
  if (!detail.ok && detail.error.code === "NOT_FOUND") notFound();
  if (!detail.ok) return <AppMain width="class"><ErrorPanel error={detail.error} /></AppMain>;

  const cls = detail.data;
  const back = (
    <nav aria-label="Back to class" className="flex flex-wrap gap-x-5 gap-y-1">
      <BackLink href={`/teach/classes/${cls.id}/progress`}>{`${cls.name}, Progress`}</BackLink>
      <BackLink href={`/teach/classes/${cls.id}`}>{`${cls.name}, Students`}</BackLink>
    </nav>
  );
  if (!cls.componentId) {
    return (
      <AppMain width="class">
        {back}
        <h1 className={`mt-2.5 ${pageTitle}`}>Student log</h1>
        <div className={`${card} mt-6 flex flex-col items-start gap-3 p-5`}>
          <h2 className={sectionTitle}>Nothing to read yet.</h2>
          <p className="text-app-base text-app-copy">{`${cls.name} doesn't have a component set up, so its students don't have a log. Set one up on the class's Component tab.`}</p>
          <Link href={`/teach/classes/${cls.id}/component`} className={buttonVariants({ variant: "outline" })}>Go to the Component tab</Link>
        </div>
      </AppMain>
    );
  }

  const componentId = cls.componentId;
  const [log, checkpoints, progress] = await Promise.all([
    attempt(() => serverApi.get(`/components/${componentId}/students/${encodeURIComponent(studentId)}/log`, teacherStudentLogSchema)),
    attempt(() => serverApi.get(`/components/${componentId}/students/${encodeURIComponent(studentId)}/checkpoints`, studentCheckpointsSchema)),
    attempt(() => serverApi.get(`/components/${componentId}/progress`, progressGridSchema)),
  ]);
  if ((!log.ok && log.error.code === "NOT_FOUND") || (!checkpoints.ok && checkpoints.error.code === "NOT_FOUND")) notFound();

  // Plan progress-redesign P-12: the class's queue, for Next request. If it didn't load, the page works without the bar.
  const next = progress.ok ? nextRequest(progress.data.waiting, studentId) : null;

  return (
    <AppMain width="class">
      {back}
      {log.ok ? (
        <>
          <StudentHeader student={log.data} className={cls.name}
            activity={checkpoints.ok ? lastEntryWords(checkpoints.data.daysSinceLastLogActivity) : null}
            link={checkpoints.ok ? checkpoints.data.documentLink : null} />
          {checkpoints.ok
            ? <StudentCheckpoints componentId={componentId} data={checkpoints.data} />
            : <div className="mt-6"><ErrorPanel error={checkpoints.error} /></div>}
          <TeacherLog log={log.data} />
          {next && <NextRequest classId={cls.id} next={next.next} others={next.others} />}
        </>
      ) : (
        <div className="mt-6"><ErrorPanel error={log.error} /></div>
      )}
    </AppMain>
  );
}
