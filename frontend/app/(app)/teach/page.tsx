import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ClassList } from "@/components/app/class-list";
import { ErrorPanel } from "@/components/app/error-panel";
import { classSummarySchema, waitingCountSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function TeachPage() {
  const [classes, waiting] = await Promise.all([
    attempt(() => serverApi.get("/classes", z.array(classSummarySchema))),
    attempt(() => serverApi.get("/signoff-requests/waiting", z.array(waitingCountSchema))),
  ]);
  // The badge is a convenience: if its request fails, the class list still renders without it.
  const counts = waiting.ok ? Object.fromEntries(waiting.data.map((w) => [w.classId, w.waiting])) : {};
  return <AppMain>{classes.ok ? <ClassList classes={classes.data} waiting={counts} /> : <ErrorPanel error={classes.error} />}</AppMain>;
}
