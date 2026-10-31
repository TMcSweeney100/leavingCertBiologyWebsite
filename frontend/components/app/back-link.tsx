import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { backLink } from "./styles";

/** A link up one level: muted chevron and label, no underline. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={backLink}>
      <ChevronLeft
        aria-hidden="true"
        className="size-4 transition-transform ease-app group-hover:-translate-x-0.5 motion-reduce:transition-none"
      />
      {children}
    </Link>
  );
}
