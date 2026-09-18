import { z } from "zod";

import { AppMain } from "@/components/app/app-main";
import { ErrorPanel } from "@/components/app/error-panel";
import { MyClasses } from "@/components/app/my-classes";
import { MyComponents } from "@/components/app/my-components";
import { enrolmentViewSchema, myComponentSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [classes, components] = await Promise.all([
    attempt(() => serverApi.get("/me/classes", z.array(enrolmentViewSchema))),
    attempt(() => serverApi.get("/me/components", z.array(myComponentSchema))),
  ]);
  return (
    <AppMain>
      <div className="flex flex-col gap-8">
        {components.ok ? <MyComponents components={components.data} /> : <ErrorPanel error={components.error} />}
        {classes.ok ? <MyClasses classes={classes.data} /> : <ErrorPanel error={classes.error} />}
      </div>
    </AppMain>
  );
}
