import Image from "next/image";

import { APP_NAME, CREST_SRC, PILOT_SCHOOL_SHORT_NAME } from "@/lib/app/brand";

/** D-1's quiet lockup on auth pages, so a student arriving from a join code knows whose site this is. */
export function BrandLockup() {
  return (
    <div className="flex items-center gap-2.5">
      <Image src={CREST_SRC} alt="" width={34} height={34} className="size-[30px] flex-none object-contain lg:size-[34px]" />
      <div className="flex flex-col gap-px">
        <span className="font-heading text-app-meta font-bold tracking-[-.025em] text-app-ink lg:text-app-base">{APP_NAME}</span>
        <span className="text-app-help text-app-muted">{PILOT_SCHOOL_SHORT_NAME}</span>
      </div>
    </div>
  );
}
