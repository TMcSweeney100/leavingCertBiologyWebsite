"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** D-1's segmented switcher. On phones it's a full-width row of equal parts with shorter labels. */
const SHORT_LABEL: Record<string, string> = { "School overview": "School" };

export function RoleSwitcher({ items }: { items: ReadonlyArray<{ href: string; label: string }> }) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="Switch role"
      className="mx-4 flex gap-[3px] rounded-app-card bg-app-inset p-[3px] lg:mx-0 lg:flex-none"
    >
      {items.map((item) => {
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const short = SHORT_LABEL[item.label];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            // The phone label is shorter; the accessible name stays the full one.
            aria-label={short ? item.label : undefined}
            className={`flex min-h-10 flex-1 touch-manipulation items-center justify-center rounded-[7px] border px-1.5 text-app-help font-semibold whitespace-nowrap transition-[background-color] duration-[var(--app-duration)] lg:flex-none lg:px-3 lg:text-app-small ${
              current
                ? "border-app-field-border bg-app-surface text-app-accent shadow-[0_1px_2px_rgb(16_20_25/0.06)]"
                : "border-transparent text-app-grey hover:bg-white/75"
            }`}
          >
            {short ? (
              <>
                <span className="lg:hidden">{short}</span>
                <span className="hidden lg:inline">{item.label}</span>
              </>
            ) : (
              item.label
            )}
          </Link>
        );
      })}
    </nav>
  );
}
