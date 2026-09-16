import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { MyClasses } from "@/components/app/my-classes";
import { enrolmentViewSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const classes = await attempt(() => serverApi.get("/me/classes", z.array(enrolmentViewSchema)));
  return <AppMain>{classes.ok ? <MyClasses classes={classes.data} /> : <ErrorPanel error={classes.error} />}</AppMain>;
}
