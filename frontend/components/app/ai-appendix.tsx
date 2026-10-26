"use client";

import { Copy } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { AiUseFields } from "@/lib/api/schemas";
import { APPENDIX_RULE, appendixHtml, appendixPairs, appendixRows, appendixText } from "@/lib/app/ai-appendix";

import { card, sectionTitle } from "./styles";


async function copyTable(html: string, text: string) {
  if (typeof ClipboardItem === "undefined") return navigator.clipboard.writeText(text);
  await navigator.clipboard.write([new ClipboardItem({
    "text/html": new Blob([html], { type: "text/html" }),
    "text/plain": new Blob([text], { type: "text/plain" }),
  })]);
}

export function AiAppendix({ componentId, uses }: { componentId: string; uses: Array<{ id: string; fields: AiUseFields }> }) {
  const [status, setStatus] = useState("");
  const rows = appendixRows(uses);
  const n = rows.length;

  async function copy() {
    try {
      await copyTable(appendixHtml(rows), appendixText(rows));
      setStatus(`Copied ${n} AI use${n === 1 ? "" : "s"}.`);
    } catch {
      setStatus("Couldn't copy. Select the text and copy it yourself.");
    }
  }

  return (
    <section aria-labelledby="ai-appendix-title" className="mt-10 flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="ai-appendix-title" className={sectionTitle}>AI use appendix</h2>
          <p className="mt-1 text-app-small text-app-grey">{`The SEC: “${APPENDIX_RULE}”`}</p>
        </div>
        {n > 0 && (
          <Button type="button" className="w-full lg:w-auto" onClick={copy}>
            <Copy aria-hidden />Copy appendix
          </Button>
        )}
      </div>
      <p aria-live="polite" className="text-app-small font-semibold text-app-ink">{status}</p>
      {n === 0 ? (
        <div className={`${card} flex flex-col items-start gap-3 p-5 lg:p-6`}>
          <p className="text-app-base text-app-copy">No AI uses in your log. If you use an AI tool, log it and it appears here as a row of your appendix.</p>
        </div>
      ) : (
        <ul aria-label="AI uses" className={`${card} divide-y divide-app-line overflow-hidden`}>
          {rows.map((r) => (
            <li key={r.id} className="p-4">
              <dl className="grid gap-x-4 gap-y-1 text-app-small lg:grid-cols-[9rem_1fr]">
                {appendixPairs(r).map(([term, value]) => (
                  <Fragment key={term}>
                    <dt className="font-semibold text-app-ink">{term}</dt>
                    <dd className="break-words whitespace-pre-line text-app-copy">{value}</dd>
                  </Fragment>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
          <Link href={`/components/${componentId}/log/new?kind=AI_USE`} className={buttonVariants({ variant: "outline", className: "w-full lg:w-auto" })}>
            Log an AI use
          </Link>
    </section>
  );
}
