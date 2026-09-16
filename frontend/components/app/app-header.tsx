import Image from "next/image";
import Link from "next/link";

import type { Me } from "@/lib/api/schemas";
import { APP_NAME, CREST_SRC, headerSchoolName } from "@/lib/app/brand";
import { APP_NAV, landingFor } from "@/lib/app/navigation";

import { RoleSwitcher } from "./role-switcher";
import { SignOutButton } from "./sign-out-button";
import { textLink } from "./styles";

function Divider() {
  return <span aria-hidden="true" className="hidden h-5 w-px flex-none bg-app-field-border lg:block" />;
}

/**
 * On every app page (roadmap §6.1, design pack D-1). Laptop: one row, identity left, switcher and
 * account right. Phone: identity, then the switcher as its own row, then the account row; the school
 * name drops and the crest stays.
 */
export function AppHeader({ me }: { me: Me }) {
  const nav = APP_NAV(me);
  const school = headerSchoolName(me.roles);
  return (
    <header className="border-b border-app-line bg-app-surface">
      <div className="flex flex-col lg:flex-row lg:items-center lg:gap-5 lg:px-7 lg:py-2.5">
        <div className="flex min-w-0 items-center gap-[9px] px-4 py-2.5 lg:flex-1 lg:gap-[11px] lg:p-0">
          <Image src={CREST_SRC} alt="" width={30} height={30} className="size-[26px] flex-none object-contain lg:size-[30px]" />
          <Link
            href={landingFor({ ...me, mustChangePassword: false })}
            className="font-heading text-app-base font-bold tracking-[-.025em] whitespace-nowrap text-app-ink lg:text-app-lead"
          >
            {APP_NAME}
          </Link>
          {school && (
            <>
              <Divider />
              <span className="hidden truncate text-app-small text-app-grey lg:inline" title={school}>
                {school}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3.5">
          {nav.length > 1 && <RoleSwitcher items={nav} />}
          {nav.length > 1 && <Divider />}
          <nav
            aria-label="Account"
            className="flex items-center justify-between gap-2.5 px-4 pt-2.5 pb-[11px] lg:gap-3.5 lg:p-0"
          >
            <span className="min-w-0 truncate text-app-small text-app-grey lg:text-app-copy">
              {me.firstName} {me.lastName}
            </span>
            <span className="flex flex-none items-center gap-2.5 lg:gap-3.5">
              <Link href="/account/password" className={`text-app-small whitespace-nowrap ${textLink}`}>
                Change password
              </Link>
              <SignOutButton />
            </span>
          </nav>
        </div>
      </div>
    </header>
  );
}
