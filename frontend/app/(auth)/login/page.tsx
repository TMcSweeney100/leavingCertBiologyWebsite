import { redirect } from "next/navigation";

import { LoginForm } from "@/components/app/login-form";
import { landingFor, safeNext } from "@/lib/app/navigation";
import { getSession } from "@/lib/app/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams;
  const next = safeNext(Array.isArray(params.next) ? params.next[0] : params.next);

  // Already signed in: route as if they'd just signed in (roadmap §6.2). If Spring is down the
  // page still renders and the form's own submit reports it.
  const me = await getSession().catch(() => null);
  if (me) redirect(landingFor(me, next));

  return (
    <main id="main">
      <LoginForm next={next} />
    </main>
  );
}
