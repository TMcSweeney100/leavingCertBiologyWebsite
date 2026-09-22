import Link from "next/link";
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { Notice } from "@/components/app/notice";
import { AddPersonalItem } from "@/components/app/personal-item-form";
import { pageTitle } from "@/components/app/styles";
import { StudentNav } from "@/components/app/student-nav";
import { TimelineView } from "@/components/app/timeline-view";
import { buttonVariants } from "@/components/ui/button";
import { enrolmentViewSchema, myComponentSchema, timelineSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { rangeFor, toIsoDate } from "@/lib/app/timeline";
import { dublinToday } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const today = toIsoDate(dublinToday());
  const range = rangeFor(params, today);
  const calendarOpen = params.calendar !== "off";
  const [timeline, classes, components] = await Promise.all([
    attempt(() => serverApi.get(`/me/timeline?from=${range.from}&to=${range.to}`, timelineSchema)),
    attempt(() => serverApi.get("/me/classes", z.array(enrolmentViewSchema))),
    attempt(() => serverApi.get("/me/components", z.array(myComponentSchema))),
  ]);

  const joined = classes.ok ? classes.data : [];
  const approved = joined.filter((c) => c.status === "APPROVED");
  const options = joined.map((c) => ({ classId: c.classId, className: c.className, subjectName: c.subjectName }));

  return (
    <AppMain>
      <div className="flex flex-col gap-6">
        {classes.ok && <StudentNav classes={classes.data} components={components.ok ? components.data : []} />}

        <h1 className={pageTitle}>{classes.ok && joined.length === 0 ? "Nothing here yet." : "Timeline"}</h1>
        {classes.ok && joined.length === 0 && (
          <p className="text-app-base text-app-copy">Join a class with the code your teacher gave you, and add anything else you need to remember.</p>
        )}
        {classes.ok && joined.length > 0 && approved.length === 0 && (
          <Notice tone="attention">A teacher needs to approve you before your coursework dates show here. Your own items still do.</Notice>
        )}
        {classes.ok && approved.length > 0 && components.ok && components.data.length === 0 && (
          <Notice tone="attention">{"Your teachers haven't set up coursework yet. Your own items still show here."}</Notice>
        )}
        {!classes.ok && <ErrorPanel error={classes.error} />}

        {/* The student's own items always show here, even if /me/classes failed or they've joined nothing yet. */}
        {timeline.ok ? (
          <TimelineView range={range} today={today} items={timeline.data.items} classes={options} components={components.ok ? components.data : []} calendarOpen={calendarOpen} />
        ) : (
          <ErrorPanel error={timeline.error} />
        )}

        <div className="flex flex-wrap gap-2.5">
          {classes.ok && joined.length === 0 && <Link href="/join" className={buttonVariants()}>Join a class</Link>}
          <AddPersonalItem classes={options} />
        </div>

        {!components.ok && <ErrorPanel error={components.error} />}
      </div>
    </AppMain>
  );
}
