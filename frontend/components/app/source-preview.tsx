import type { SourceFields } from "@/lib/api/schemas";
import { citation, missingLine } from "@/lib/app/citation";

/** Decision S-1 and S-13: the Sources page's output, live, in reading order after the fields. Not a live region. */
export function SourcePreview({ fields }: { fields: SourceFields | null }) {
  const c = fields && citation(fields);
  const flag = c && missingLine(c.missing);
  return (
    <section aria-labelledby="source-preview-heading" className="flex flex-col gap-2 rounded-app-card bg-app-inset p-4">
      <h2 id="source-preview-heading" className="font-mono text-app-label font-bold uppercase tracking-[.09em] text-app-muted">In your report</h2>
      {c ? (
        <>
          <p className="text-app-small break-words text-app-copy"><span className="font-semibold text-app-ink">In the text: </span>{c.inText}</p>
          <p className="text-app-small break-words text-app-copy"><span className="font-semibold text-app-ink">Reference list: </span>{c.reference}</p>
          {flag && <p className="text-app-small font-semibold text-app-attention">{flag}</p>}
        </>
      ) : (
        <p className="text-app-small text-app-copy">Add a title to see how this source will look in your report.</p>
      )}
    </section>
  );
}
