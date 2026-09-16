import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { BrandLockup } from "@/components/app/brand-lockup";
import { isAppEnabled } from "@/lib/app/routes";

// Sign-in, joining and reset pages. No app header: the user isn't signed in yet, and a forced
// password change has nowhere else to go. Pack D-1: one 440px column on the page ground.
export default function AuthLayout({ children }: { children: ReactNode }) {
  if (!isAppEnabled()) notFound();
  return (
    <div className="app-theme min-h-dvh bg-app-ground text-app-copy">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-7 pb-10 lg:pt-[52px] lg:pb-[72px]">
        <header className="mb-[22px] lg:mb-[26px]">
          <BrandLockup />
        </header>
        {children}
      </div>
    </div>
  );
}
