import Link from "next/link";
import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { MyClasses } from "@/components/app/my-classes";
import { MyComponents } from "@/components/app/my-components";
import { Notice } from "@/components/app/notice";
import { AddPersonalItem } from "@/components/app/personal-item-form";
import { pageTitle, textLink } from "@/components/app/styles";
import { TimelineView } from "@/components/app/timeline-view";
import { enrolmentViewSchema, myComponentSchema, timelineSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { rangeFor, relativeDay, toIsoDate } from "@/lib/app/timeline";
import { dublinToday } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const today = toIsoDate(dublinToday());
  const range = rangeFor(await searchParams, today);
  const [timeline, classes, components] = await Promise.all([
    attempt(() => serverApi.get(`/me/timeline?from=${range.from}&to=${range.to}`, timelineSchema)),
    attempt(() => serverApi.get("/me/classes", z.array(enrolmentViewSchema))),
    attempt(() => serverApi.get("/me/components", z.array(myComponentSchema))),
  ]);

  const joined = classes.ok ? classes.data : [];
  const approved = joined.filter((c) => c.status === "APPROVED");
  const next = timeline.ok ? timeline.data.items.find((i) => i.date >= today) : undefined;
  const options = joined.map((c) => ({ classId: c.classId, className: c.className, subjectName: c.subjectName }));

  return (
    <AppMain>
      <div className="flex flex-col gap-6">
        <h1 className={pageTitle}>Timeline</h1>
        {next && <p className="text-app-base text-app-ink">{`Next: ${next.title}, ${relativeDay(today, next.date)}.`}</p>}

        {classes.ok && joined.length === 0 && (
          <Notice tone="attention">
            <Link href="/join" className={textLink}>Join a class</Link> to see your coursework dates here. You can add your own items now.
          </Notice>
        )}
        {classes.ok && joined.length > 0 && approved.length === 0 && (
          <Notice tone="attention">A teacher needs to approve you before your coursework dates show here. Your own items still do.</Notice>
        )}
        {classes.ok && approved.length > 0 && components.ok && components.data.length === 0 && (
          <Notice tone="attention">{"Your teachers haven't set up coursework yet. Your own items still show here."}</Notice>
        )}

        {timeline.ok ? <TimelineView range={range} today={today} items={timeline.data.items} classes={options} /> : <ErrorPanel error={timeline.error} />}
        <AddPersonalItem classes={options} />

        {components.ok ? <MyComponents components={components.data} /> : <ErrorPanel error={components.error} />}
        {classes.ok ? <MyClasses classes={classes.data} /> : <ErrorPanel error={classes.error} />}
      </div>
    </AppMain>
  );
}
