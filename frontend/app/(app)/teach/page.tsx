import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ClassList } from "@/components/app/class-list";
import { ErrorPanel } from "@/components/app/error-panel";
import { classSummarySchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function TeachPage() {
  const classes = await attempt(() => serverApi.get("/classes", z.array(classSummarySchema)));
  return <AppMain>{classes.ok ? <ClassList classes={classes.data} /> : <ErrorPanel error={classes.error} />}</AppMain>;
}
