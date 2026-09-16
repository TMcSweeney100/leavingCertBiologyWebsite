import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/app/app-header";
import { isAppEnabled } from "@/lib/app/routes";
import { getSession } from "@/lib/app/session";

// Every signed-in page. Roadmap §6.1: forced password change first, then the page.
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!isAppEnabled()) notFound();
  const me = await getSession();
  if (!me) redirect("/login");
  if (me.mustChangePassword) redirect("/account/password");
  return (
    <>
      <AppHeader me={me} />
      {children}
    </>
  );
}
