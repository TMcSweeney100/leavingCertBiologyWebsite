import { ExternalLink } from "lucide-react";

import { linkHost, openWorkName } from "@/lib/app/ready";

/** The one way a student's link is drawn (FR-39, design §9): new tab, no opener, no referrer, said in the name. */
export function WorkLink({ url, name, className = "" }: { url: string; name?: string; className?: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={openWorkName(name)}
      className={`inline-flex min-h-11 items-center gap-1.5 text-app-base font-semibold text-app-accent underline underline-offset-3 ${className}`}>
      <span data-private>{linkHost(url)}</span>
      <ExternalLink aria-hidden className="size-4 flex-none" />
    </a>
  );
}
