"use client";

import { CircleAlert, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { SourceFields } from "@/lib/api/schemas";
import { AI_NOT_YET, copyText, LIST_RULE, missingLine, NO_FORMAL_STYLE, referenceList } from "@/lib/app/citation";

import { card, sectionTitle, textLink } from "./styles";

type Source = { id: string; fields: SourceFields };


export function SourceList({ componentId, sources }: { componentId: string; sources: Source[] }) {
  const [status, setStatus] = useState("");
  const list = referenceList(sources);
  const flagged = list.filter((s) => s.citation.missing.length > 0).length;

  async function copy(value: string, done: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(done);
    } catch {
      setStatus("Couldn't copy. Select the text and copy it yourself.");
    }
  }

  if (list.length === 0) {
    return (
      <div className={`${card} mt-6 flex flex-col items-start gap-3 p-5 lg:p-6`}>
        <h2 className={sectionTitle}>No sources yet</h2>
        <p className="text-app-base text-app-copy">Each source you add to your log appears here as a reference, ready to copy into your report.</p>
        <Link href={`/components/${componentId}/log/new?kind=SOURCE`} className={buttonVariants({ size: "default", className: "w-full lg:w-auto" })}>
          Add a source
        </Link>
      </div>
    );
  }
  const n = list.length;
  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className={sectionTitle}>Your reference list</h2>
          <p className="mt-1 text-app-small text-app-grey">{`${LIST_RULE} The NCCA: “${NO_FORMAL_STYLE}”`}</p>
        </div>
        <Button type="button" className="w-full lg:w-auto" onClick={() => copy(copyText(list), `Copied ${n} reference${n === 1 ? "" : "s"}.`)}>
          <Copy aria-hidden />Copy reference list
        </Button>
      </div>
      {flagged > 0 && (
        <p className="text-app-small text-app-copy">{`${flagged} of your sources ${flagged === 1 ? "is" : "are"} missing a detail. You can still copy the list.`}</p>
      )}
      <p aria-live="polite" className="text-app-small font-semibold text-app-ink">{status}</p>
      <ul aria-label="References" className={`${card} divide-y divide-app-line overflow-hidden`}>
        {list.map((s) => {
          const flag = missingLine(s.citation.missing);
          return (
            <li key={s.id} className="flex flex-col gap-2 p-4">
              <p className="text-app-base break-words text-app-ink">{s.citation.reference}</p>
              <p className="text-app-small break-words text-app-copy"><span className="font-semibold">In the text: </span>{s.citation.inText}</p>
              {flag && (
                <p className="flex items-start gap-1.5 text-app-small font-semibold text-app-attention">
                  <CircleAlert aria-hidden className="mt-0.5 size-4 flex-none" />{flag}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <Button type="button" variant="outline" aria-label={`Copy citation for ${s.fields.title}`}
                  onClick={() => copy(s.citation.inText, "Citation copied.")}>
                  Copy citation
                </Button>
                <Link href={`/components/${componentId}/log/${s.id}`} aria-label={`Open in log, ${s.fields.title}`}
                  className={`${textLink} inline-flex min-h-11 items-center text-app-small`}>
                  Open in log
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-app-small text-app-copy">{AI_NOT_YET}</p>
    </div>
  );
}
