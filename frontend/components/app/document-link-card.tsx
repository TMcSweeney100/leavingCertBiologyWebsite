"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api/client";
import { type DocumentLink, documentLinkSchema } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { BACKUP_ADVICE, BACKUP_SOURCE } from "@/lib/app/ready";

import { card, eyebrow, lead } from "./styles";
import { WorkLink } from "./work-link";

/** FR-38–40: where the student's report lives. One link per component; changing it keeps the old one on record. */
export function DocumentLinkCard({ componentId, link, requireLink }: { componentId: string; link: DocumentLink | null; requireLink: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(link === null);
  const [url, setUrl] = useState(link?.url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => { if (error) alertRef.current?.focus(); }, [error]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.send("PUT", `/components/${componentId}/document-link`, { url }, documentLinkSchema);
      setEditing(false);
      router.refresh();
    } catch (err) {
      const field = err instanceof ApiError ? err.fieldErrors.find((f) => f.field === "url") : undefined;
      setError(field ? "That isn't a link we can keep. It must start with https://." : "Couldn't save the link. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="work-heading" className={`${card} flex flex-col gap-3 p-5`}>
      <h2 id="work-heading" className={eyebrow}>Your work</h2>
      {link && !editing ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <WorkLink url={link.url} />
          <span className="font-mono text-app-label text-app-grey">{`Added ${formatCalendarDate(link.setOn)}`}</span>
          <Button type="button" variant="link" onClick={() => setEditing(true)} className="min-h-11 px-1">Change link</Button>
        </div>
      ) : (
        <form onSubmit={save} className="flex flex-col gap-2">
          <p className={lead}>
            {requireLink
              ? "Your teacher asks for this link before you can ask for a sign-off. Paste the share link to wherever your report lives."
              : "Paste the share link to wherever your report lives, so your teacher can open it when you ask for a sign-off."}
          </p>
          <label htmlFor="work-url" className="text-app-small font-semibold text-app-ink">Link to your work</label>
          <input id="work-url" type="url" inputMode="url" required value={url} onChange={(e) => setUrl(e.target.value)}
            aria-invalid={error !== null} aria-describedby={error ? "work-url-error" : undefined}
            className="min-h-11 rounded-app-control border border-app-field-border bg-app-surface px-3 text-app-base" />
          {error && <p id="work-url-error" ref={alertRef} tabIndex={-1} role="alert" className="text-app-small text-app-error">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save link"}</Button>
            {link && <Button type="button" variant="outline" onClick={() => { setEditing(false); setUrl(link.url); setError(null); }}>Cancel</Button>}
          </div>
          <p className="text-app-small text-app-grey">{"Make sure your teacher can open it: in Google Docs or OneDrive, share it with them first."}</p>
        </form>
      )}
      <figure className="flex flex-col gap-1 border-l-[3px] border-l-app-line pl-3">
        <blockquote className="text-app-small text-app-copy">{BACKUP_ADVICE}</blockquote>
        <figcaption className="text-app-label text-app-grey">{BACKUP_SOURCE}</figcaption>
      </figure>
    </section>
  );
}
