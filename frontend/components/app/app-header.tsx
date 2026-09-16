import Link from "next/link";

import type { Me } from "@/lib/api/schemas";
import { APP_NAV } from "@/lib/app/navigation";

import { SignOutButton } from "./sign-out-button";

/** On every app page (roadmap §6.1). Plain until design pack D-1. */
export function AppHeader({ me }: { me: Me }) {
  const nav = APP_NAV(me);
  return (
    <header>
      {nav.length > 1 ? (
        <nav aria-label="Switch role">
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        nav[0] && <Link href={nav[0].href}>{nav[0].label}</Link>
      )}
      <nav aria-label="Account">
        <span>
          {me.firstName} {me.lastName}
        </span>
        <Link href="/account/password">Change password</Link>
        <SignOutButton />
      </nav>
    </header>
  );
}
