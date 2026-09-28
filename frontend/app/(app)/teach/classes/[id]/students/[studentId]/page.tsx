import Link from "next/link";
import { notFound } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { Notice } from "@/components/app/notice";
import { TeacherLog } from "@/components/app/teacher-log";
import { backLink, pageTitle } from "@/components/app/styles";
import { classDetailSchema, teacherStudentLogSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function StudentLogPage({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params;
  const detail = await attempt(() => serverApi.get(`/classes/${encodeURIComponent(id)}`, classDetailSchema));
  if (!detail.ok && detail.error.code === "NOT_FOUND") notFound();
  if (!detail.ok) return <AppMain width="class"><ErrorPanel error={detail.error} /></AppMain>;

  const cls = detail.data;
  const back = <Link href={`/teach/classes/${cls.id}`} className={backLink}>{cls.name}</Link>;
  if (!cls.componentId) {
    return (
      <AppMain width="class">
        {back}
        <h1 className={`mt-2.5 ${pageTitle}`}>Student log</h1>
        <div className="mt-6"><Notice tone="attention" heading="No component yet">{"Set up this class's component first. Students keep their log inside it."}</Notice></div>
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
          <p className="mt-1.5 text-app-base text-app-grey">{"Their log. Entries they've hidden show only the date."}</p>
          <TeacherLog log={log.data} />
        </>
      ) : (
        <div className="mt-6"><ErrorPanel error={log.error} /></div>
      )}
    </AppMain>
  );
}
