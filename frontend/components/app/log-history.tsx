import type { AiUseFields, Revision, SourceFields } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate, FIELD_LABELS, SOURCE_TYPES } from "@/lib/app/log";

import { textLink } from "./styles";

/** Design §9: a link is shown, opened in a new tab without an opener, and never fetched by us. */
function SafeLink({ href }: { href: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`${textLink} [overflow-wrap:anywhere]`}>{href}</a>;
}

function Row({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <dt className="text-app-small text-app-grey">{label.replace(" (optional)", "")}</dt>
      <dd className="text-app-base text-app-ink whitespace-pre-wrap">{link ? <SafeLink href={value} /> : value}</dd>
    </div>
  );
}

export function SourceFieldsView({ f }: { f: SourceFields }) {
  return (
    <dl className="flex flex-col gap-2">
      <Row label={FIELD_LABELS.type} value={SOURCE_TYPES.find((t) => t.value === f.type)?.label ?? f.type} />
      <Row label={FIELD_LABELS.title} value={f.title} />
      <Row label={FIELD_LABELS.author} value={f.author} />
      <Row label={FIELD_LABELS.publication} value={f.publication} />
      <Row label={FIELD_LABELS.datePublished} value={f.datePublished} />
      <Row label={FIELD_LABELS.url} value={f.url} link />
      <Row label={FIELD_LABELS.dateAccessed} value={f.dateAccessed && formatCalendarDate(f.dateAccessed)} />
      <Row label={FIELD_LABELS.locator} value={f.locator} />
      <Row label={FIELD_LABELS.keyInformation} value={f.keyInformation} />
      <Row label={FIELD_LABELS.relevance} value={f.relevance} />
      <Row label={FIELD_LABELS.reflections} value={f.reflections} />
    </dl>
  );
}

export function AiUseFieldsView({ f }: { f: AiUseFields }) {
  return (
    <dl className="flex flex-col gap-2">
      <Row label={FIELD_LABELS.toolNameAndVersion} value={f.toolNameAndVersion} />
      <Row label={FIELD_LABELS.developer} value={f.developer} />
      <Row label={FIELD_LABELS.dateGenerated} value={formatCalendarDate(f.dateGenerated)} />
      <Row label={FIELD_LABELS.howUsed} value={f.howUsed} />
      <Row label={FIELD_LABELS.prompts} value={f.prompts} />
      <Row label={FIELD_LABELS.shareUrl} value={f.shareUrl} link />
    </dl>
  );
}

export function RevisionContent({ body, fields }: { body: string | null; fields: Revision["fields"] }) {
  return (
    <div className="flex flex-col gap-2">
      {fields && ("toolNameAndVersion" in fields ? <AiUseFieldsView f={fields} /> : <SourceFieldsView f={fields} />)}
      {body && <p className="text-app-base text-app-ink whitespace-pre-wrap">{body}</p>}
    </div>
  );
}

/** Design §8.5: an edited entry keeps its history, newest first. */
export function LogHistory({ history }: { history: Revision[] }) {
  return (
    <ul aria-label="Revisions" className="flex flex-col gap-3">
      {history.map((r) => (
        <li key={r.number} className="flex flex-col gap-2 border-t border-app-line pt-3">
          <p className="text-app-small font-semibold text-app-grey">{`Revision ${r.number} · ${formatCalendarDate(dublinDate(r.createdAt))}`}</p>
          <RevisionContent body={r.body} fields={r.fields} />
        </li>
      ))}
    </ul>
  );
}
