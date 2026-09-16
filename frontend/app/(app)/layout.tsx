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
    <div className="app-theme min-h-dvh bg-app-ground text-app-copy">
      <a
        href="#main"
        className="sr-only z-10 rounded-app-control bg-app-accent px-4 py-3 font-semibold text-app-on-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <AppHeader me={me} />
      {children}
    </div>
  );
}
