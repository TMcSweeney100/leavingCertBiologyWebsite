import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { AppMain } from "@/components/app/app-main";
import { ClassHeader } from "@/components/app/class-header";
import { ErrorPanel } from "@/components/app/error-panel";
import { ProgressGrid } from "@/components/app/progress-grid";
import { card, sectionTitle } from "@/components/app/styles";
import { buttonVariants } from "@/components/ui/button";
import { classDetailSchema, progressGridSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { HIDE_NAMES_COOKIE, latestDueKey, parseStage } from "@/lib/app/progress";

export const dynamic = "force-dynamic";

function Empty({ head, body, href, action }: { head: string; body: string; href: string; action: string }) {
  return (
    <div className={`${card} mt-7 flex flex-wrap items-center justify-between gap-4 p-5`}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className={sectionTitle}>{head}</h2>
        <p className="max-w-[600px] text-app-base text-app-grey">{body}</p>
      </div>
      <Link href={href} className={buttonVariants({ variant: "outline" })}>{action}</Link>
    </div>
  );
}

export default async function ClassProgressPage({ params, searchParams }:
  { params: Promise<{ id: string }>; searchParams: Promise<{ stage?: string }> }) {
  const { id } = await params;
  const { stage } = await searchParams;
  const detail = await attempt(() => serverApi.get(`/classes/${encodeURIComponent(id)}`, classDetailSchema));
  if (!detail.ok && detail.error.code === "NOT_FOUND") notFound();
  if (!detail.ok) return <AppMain width="class"><ErrorPanel error={detail.error} /></AppMain>;

  const cls = detail.data;
  if (!cls.componentId) {
    return (
      <AppMain width="class">
        <ClassHeader detail={cls} current="progress" />
        <Empty head="Nothing to track yet." href={`/teach/classes/${cls.id}/component`} action="Go to the Component tab"
          body={`${cls.name} doesn't have a component set up, so there are no checkpoints to sign off. Set one up on the class's Component tab.`} />
      </AppMain>
    );
  }

  const grid = await attempt(() => serverApi.get(`/components/${cls.componentId}/progress`, progressGridSchema));
  if (!grid.ok && grid.error.code === "NOT_FOUND") notFound();
  // Read on the server so a projected page arrives already blurred (plan P4-15).
  const hideNames = (await cookies()).get(HIDE_NAMES_COOKIE)?.value === "1";

  return (
    <AppMain width="class">
      <ClassHeader detail={cls} current="progress" />
      {!grid.ok ? (
        <div className="mt-6"><ErrorPanel error={grid.error} /></div>
      ) : grid.data.students.length === 0 ? (
        <Empty head="No students yet." href={`/teach/classes/${cls.id}`} action="Go to the Students tab"
          body="Students appear here once you approve them. Share the join code from the Students tab, then approve their requests." />
      ) : (
        <ProgressGrid grid={grid.data} basePath={`/teach/classes/${cls.id}/progress`} hideNames={hideNames}
          laptopStage={parseStage(stage, grid.data) ?? "all"} phoneStage={parseStage(stage, grid.data) ?? latestDueKey(grid.data)} />
      )}
    </AppMain>
  );
}
