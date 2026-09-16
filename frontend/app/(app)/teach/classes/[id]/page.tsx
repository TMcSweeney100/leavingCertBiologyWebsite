import { notFound } from "next/navigation";

import { ClassStudents } from "@/components/app/class-students";
import { ErrorPanel } from "@/components/app/error-panel";
import { classDetailSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await attempt(() => serverApi.get(`/classes/${encodeURIComponent(id)}`, classDetailSchema));
  // Another teacher's class is a 404 from Spring, and stays a 404 here.
  if (!detail.ok && detail.error.code === "NOT_FOUND") notFound();
  return <main>{detail.ok ? <ClassStudents detail={detail.data} /> : <ErrorPanel error={detail.error} />}</main>;
}
