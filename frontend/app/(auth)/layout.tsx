import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { isAppEnabled } from "@/lib/app/routes";

// Sign-in, joining and reset pages. No app header: the user isn't signed in yet.
export default function AuthLayout({ children }: { children: ReactNode }) {
  if (!isAppEnabled()) notFound();
  return <>{children}</>;
}
