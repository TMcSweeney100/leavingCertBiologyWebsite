import type { AiUseFields, Revision, SourceFields } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { dublinDate, FIELD_LABELS, linkHost, SOURCE_TYPES } from "@/lib/app/log";

import { card, textLink } from "./styles";

/** Design §9: a link is shown, opened in the same tab without an opener, and never fetched by us. The host says where it goes. */
function SafeLink({ href }: { href: string }) {
  return (
    <a href={href} rel="noopener noreferrer" className={`${textLink} flex flex-col [overflow-wrap:anywhere]`}>
      <span className="font-semibold">{linkHost(href)}</span>
      <span className="font-mono text-app-help">{href}</span>
    </a>
  );
}

function Row({ label, value, link, long }: { label: string; value: string | null; link?: boolean; long?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-app-line px-4 py-3 last:border-b-0 lg:grid lg:grid-cols-[260px_1fr] lg:gap-4">
      <dt className="text-app-small text-app-grey">{label.replace(" (optional)", "")}</dt>
      <dd className={`text-app-base text-app-ink ${long ? "whitespace-pre-wrap rounded-app-inner bg-app-inset px-3 py-2" : ""}`}>
        {link ? <SafeLink href={value} /> : value}
      </dd>
    </div>
  );
}

const Group = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    {title && <h3 className="font-mono text-app-label font-bold uppercase tracking-[.09em] text-app-muted">{title}</h3>}
    <dl className={`${card} overflow-hidden`}>{children}</dl>
  </div>
);

export function SourceFieldsView({ f }: { f: SourceFields }) {
  return (
    <div className="flex flex-col gap-4">
      <Group title="The source">
        <Row label={FIELD_LABELS.type} value={SOURCE_TYPES.find((t) => t.value === f.type)?.label ?? f.type} />
        <Row label={FIELD_LABELS.title} value={f.title} />
        <Row label={FIELD_LABELS.author} value={f.author} />
        <Row label={FIELD_LABELS.publication} value={f.publication} />
        <Row label={FIELD_LABELS.datePublished} value={f.datePublished} />
        <Row label={FIELD_LABELS.url} value={f.url} link />
        <Row label={FIELD_LABELS.dateAccessed} value={f.dateAccessed && formatCalendarDate(f.dateAccessed)} />
      </Group>
      <Group title="Your notes on it">
        <Row label={FIELD_LABELS.locator} value={f.locator} />
        <Row label={FIELD_LABELS.keyInformation} value={f.keyInformation} long />
        <Row label={FIELD_LABELS.relevance} value={f.relevance} long />
        <Row label={FIELD_LABELS.reflections} value={f.reflections} long />
      </Group>
    </div>
  );
}

export function AiUseFieldsView({ f }: { f: AiUseFields }) {
  return (
    <Group>
      <Row label={FIELD_LABELS.toolNameAndVersion} value={f.toolNameAndVersion} />
      <Row label={FIELD_LABELS.developer} value={f.developer} />
      <Row label={FIELD_LABELS.dateGenerated} value={formatCalendarDate(f.dateGenerated)} />
      <Row label={FIELD_LABELS.howUsed} value={f.howUsed} long />
      <Row label={FIELD_LABELS.prompts} value={f.prompts} long />
      <Row label={FIELD_LABELS.shareUrl} value={f.shareUrl} link />
    </Group>
  );
}

export function RevisionContent({ body, fields }: { body: string | null; fields: Revision["fields"] }) {
  return (
    <div className="flex flex-col gap-4">
      {fields && ("toolNameAndVersion" in fields ? <AiUseFieldsView f={fields} /> : <SourceFieldsView f={fields} />)}
      {body && <p className={`text-app-base text-app-ink whitespace-pre-wrap ${fields ? "rounded-app-inner bg-app-inset px-3 py-2" : ""}`}>{body}</p>}
    </div>
  );
}

/** Design §8.5: newest first. The current revision is the content shown above, so only earlier ones fold open. */
export function LogHistory({ history }: { history: Revision[] }) {
  return (
    <ol reversed aria-label="Revisions" className={`${card} divide-y divide-app-line`}>
      {history.map((r, i) => (
        <li key={r.number} className="flex flex-col gap-2 px-4 py-3">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-app-small text-app-grey">
            <span className="font-semibold text-app-ink">{`Revision ${r.number}`}</span>
            <span className="font-mono text-app-help">{formatCalendarDate(dublinDate(r.createdAt))}</span>
            {r.number === 1 && <span>Created</span>}
            {i === 0 && (
              <>
                <span className="rounded-full bg-app-ink px-2 py-0.5 text-app-label font-bold text-app-on-accent">Current</span>
                <span>Shown above</span>
              </>
            )}
          </p>
          {i > 0 && (
            <details className="group">
              <summary className="min-h-11 cursor-pointer py-2 text-app-small font-semibold text-app-accent">
                <span className="group-open:hidden">{`Show revision ${r.number}`}</span>
                <span className="hidden group-open:inline">{`Hide revision ${r.number}`}</span>
              </summary>
              <div className="mt-1"><RevisionContent body={r.body} fields={r.fields} /></div>
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}
