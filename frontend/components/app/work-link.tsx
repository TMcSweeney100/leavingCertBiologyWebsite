import { ExternalLink } from "lucide-react";

import { linkHost, openWorkLabel, openWorkName } from "@/lib/app/ready";

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

/** Pack D-10: the same link as a bordered block on the teacher's review panel: "Open Cian's work", then the host. */
export function WorkLinkBlock({ url, name, firstName, className = "" }: { url: string; name: string; firstName: string; className?: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={openWorkName(name)}
      className={`flex min-h-11 flex-col justify-center rounded-app-control border border-app-accent bg-app-surface px-3.5 py-2 hover:bg-app-accent-tint ${className}`}>
      <span className="text-app-meta font-semibold text-app-accent"><span data-private>{openWorkLabel(firstName)}</span></span>
      <span className="font-mono text-app-help text-app-grey"><span data-private>{linkHost(url)}</span>, opens in a new tab</span>
    </a>
  );
}
