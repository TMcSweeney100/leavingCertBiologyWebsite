"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type EntryKind, logEntryDetailSchema, type SourceType } from "@/lib/api/schemas";
import { FIELD_LABELS, isOnline, KIND_WORD, SOURCE_TYPES, visibilityLine } from "@/lib/app/log";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";

type Values = Record<string, string>;
type Props = { componentId: string; today: string } & (
  | { mode: "create" }
  | { mode: "revise"; entryId: string; kind: EntryKind; body: string | null; fields: Record<string, string | null> | null }
);

const SOURCE_KEYS = ["type", "title", "author", "publication", "datePublished", "url", "dateAccessed", "locator", "keyInformation", "relevance", "reflections"] as const;
const AI_KEYS = ["toolNameAndVersion", "developer", "dateGenerated", "howUsed", "prompts", "shareUrl"] as const;
const LONG = new Set(["keyInformation", "relevance", "reflections", "howUsed", "prompts"]);
const DATES = new Set(["dateAccessed", "dateGenerated"]);

/** Empty inputs are sent as null, so the server's "required" rules see what the student left blank. */
function payload(kind: EntryKind, values: Values) {
  const pick = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, values[k]?.trim() ? values[k].trim() : null]));
  return kind === "SOURCE" ? pick(SOURCE_KEYS) : kind === "AI_USE" ? pick(AI_KEYS) : null;
}

/** Design §8.5 and FR-24e. Create chooses the kind and visibility; revise keeps both and adds a revision. */
export function LogEntryForm(props: Props) {
  const router = useRouter();
  const revising = props.mode === "revise";
  const [kind, setKind] = useState<EntryKind>(revising ? props.kind : "NOTE");
  const [body, setBody] = useState(revising ? (props.body ?? "") : "");
  const [values, setValues] = useState<Values>(() => {
    const start: Values = { type: "BOOK" };
    if (revising && props.fields) for (const [k, v] of Object.entries(props.fields)) start[k] = v ?? "";
    return start;
  });
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);

  const fieldError = (key: string) => error?.fieldErrors?.find((f) => f.field === key)?.message;
  const set = (key: string) => (e: { target: { value: string } }) => setValues({ ...values, [key]: e.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const content = { body: body.trim() ? body : null, fields: payload(kind, values) };
    try {
      if (props.mode === "create") {
        await api.send("POST", `/components/${props.componentId}/log`, { kind, ...content, visibleToTeacher: visible }, logEntryDetailSchema);
        router.push(`/components/${props.componentId}/log`);
      } else {
        await api.send("POST", `/log/${props.entryId}/revisions`, content, logEntryDetailSchema);
        setSaved(true);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  const input = (key: string) => (
    <Field key={key} id={`log-${key}`} label={FIELD_LABELS[key as keyof typeof FIELD_LABELS] as string} error={fieldError(`fields.${key}`)}>
      {(c) => LONG.has(key)
        ? <textarea {...c} rows={3} value={values[key] ?? ""} onChange={set(key)} />
        : <input {...c} type={DATES.has(key) ? "date" : key === "url" || key === "shareUrl" ? "url" : "text"}
            inputMode={key === "url" || key === "shareUrl" ? "url" : undefined} value={values[key] ?? ""} onChange={set(key)} />}
    </Field>
  );

  const online = isOnline((values.type ?? "BOOK") as SourceType);

  return (
    <form onSubmit={submit} noValidate className="mt-6 flex max-w-[620px] flex-col gap-4">
      {error && <ErrorPanel error={error} focus />}
      {!revising && (
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-2 text-app-base font-semibold text-app-ink">Kind of entry</legend>
          {(["NOTE", "SOURCE", "AI_USE"] as const).map((k) => (
            <label key={k} className="flex min-h-11 items-center gap-2 text-app-base">
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
              {KIND_WORD[k]}
            </label>
          ))}
        </fieldset>
      )}
      <FieldGroup>
        {kind === "SOURCE" && (
          <Field id="log-type" label={FIELD_LABELS.type} error={fieldError("fields.type")}>
            {(c) => (
              <select {...c} value={values.type} onChange={set("type")}>
                {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            )}
          </Field>
        )}
        {kind === "SOURCE" && ["title", "author", "publication", "datePublished"].map(input)}
        {kind === "SOURCE" && (online || values.url) && ["url", "dateAccessed"].map(input)}
        {kind === "SOURCE" && ["locator", "keyInformation", "relevance", "reflections"].map(input)}
        {kind === "AI_USE" && AI_KEYS.map(input)}
        <Field id="log-body" label={FIELD_LABELS.body[kind]} error={fieldError("body")}>
          {(c) => <textarea {...c} rows={kind === "NOTE" ? 6 : 3} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />}
        </Field>
      </FieldGroup>
      {!revising && (
        <div className="flex flex-col gap-1.5">
          <label className="flex min-h-11 items-center gap-2 text-app-base">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
            Let my teacher read this
          </label>
          <p aria-live="polite" className="text-app-small text-app-copy">{visibilityLine(visible, props.today)}</p>
        </div>
      )}
      {revising && <p role="status" className="text-app-small text-app-copy">{saved ? "Saved as a new revision." : ""}</p>}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : revising ? "Save new revision" : "Save entry"}
        </Button>
      </div>
    </form>
  );
}
