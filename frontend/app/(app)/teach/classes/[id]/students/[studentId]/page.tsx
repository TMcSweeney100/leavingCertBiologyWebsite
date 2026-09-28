import Link from "next/link";
import { notFound } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { TeacherLog } from "@/components/app/teacher-log";
import { backLink, card, pageTitle, sectionTitle } from "@/components/app/styles";
import { classDetailSchema, teacherStudentLogSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { buttonVariants } from "@/components/ui/button";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function StudentLogPage({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params;
  const detail = await attempt(() => serverApi.get(`/classes/${encodeURIComponent(id)}`, classDetailSchema));
  if (!detail.ok && detail.error.code === "NOT_FOUND") notFound();
  if (!detail.ok) return <AppMain width="class"><ErrorPanel error={detail.error} /></AppMain>;

  const cls = detail.data;
  const back = <Link href={`/teach/classes/${cls.id}`} className={backLink}>{`${cls.name}, Students`}</Link>;
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

  const log = await attempt(() => serverApi.get(
    `/components/${cls.componentId}/students/${encodeURIComponent(studentId)}/log`, teacherStudentLogSchema));
  if (!log.ok && log.error.code === "NOT_FOUND") notFound();

  return (
    <AppMain width="class">
      {back}
      {log.ok ? (
        <>
          <h1 className={`mt-2.5 ${pageTitle}`}>{`${log.data.firstName} ${log.data.lastName}`}</h1>
          <p className="mt-1.5 text-app-base text-app-grey">{"You read the entries they share. Any they keep private show only the kind and date."}</p>
          <TeacherLog log={log.data} />
        </>
      ) : (
        <div className="mt-6"><ErrorPanel error={log.error} /></div>
      )}
    </AppMain>
  );
}
