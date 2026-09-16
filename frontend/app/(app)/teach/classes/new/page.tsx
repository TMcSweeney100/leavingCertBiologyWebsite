import { notFound } from "next/navigation";
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { CreateClassForm } from "@/components/app/create-class-form";
import { ErrorPanel } from "@/components/app/error-panel";
import { subjectSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { currentAcademicYear } from "@/lib/app/academic-year";
import { attempt } from "@/lib/app/attempt";
import { teacherSchoolId } from "@/lib/app/navigation";
import { requireSession } from "@/lib/app/session";

export const dynamic = "force-dynamic";

export default async function NewClassPage() {
  const me = await requireSession();
  const schoolId = teacherSchoolId(me);
  // A student who types the URL gets a 404, not a hint that the page exists (root CLAUDE.md).
  if (!schoolId) notFound();
  const subjects = await attempt(() => serverApi.get("/subjects", z.array(subjectSchema)));
  return (
    <AppMain width="form">
      {subjects.ok ? (
        <CreateClassForm schoolId={schoolId} subjects={subjects.data} defaultAcademicYear={currentAcademicYear()} />
      ) : (
        <ErrorPanel error={subjects.error} />
      )}
    </AppMain>
  );
}
