"use client";

import { Check, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { type EntryKind, logEntryDetailSchema, type SourceType } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { counterText, FIELD_LABELS, isOnline, KIND_WORD, linkMessage, SOURCE_TYPES, visibilityLine } from "@/lib/app/log";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";

type Values = Record<string, string>;
type Props = { componentId: string; today: string } & (
  | { mode: "create" }
  | { mode: "revise"; entryId: string; kind: EntryKind; body: string | null; fields: Record<string, string | null> | null;
      revisionCount: number; lastRevisedOn: string; visible: boolean }
);

const SOURCE_KEYS = ["type", "title", "author", "publication", "datePublished", "url", "dateAccessed", "locator", "keyInformation", "relevance", "reflections"] as const;
const AI_KEYS = ["toolNameAndVersion", "developer", "dateGenerated", "howUsed", "prompts", "shareUrl"] as const;
const LONG = new Set(["keyInformation", "relevance", "reflections", "howUsed", "prompts"]);
const DATES = new Set(["dateAccessed", "dateGenerated"]);
const LINKS = new Set(["url", "shareUrl"]);
const BODY_MAX = 4000; // LogContent.BODY_MAX / LONG_MAX
const SHORT_MAX = 500; // LogContent.SHORT_MAX

const HELP: Record<string, string> = {
  url: "Needed for online sources. Copy it from your browser's address bar; it starts with https://",
  dateAccessed: "The day you looked at it. Starts at today.",
  dateGenerated: "The day the tool gave you this. Starts at today.",
  shareUrl: "If the tool gives you a link to the conversation. It starts with https://",
};

/** What to tell the student when the server refuses a field; the server's own words are the fallback. */
const REQUIRED: Record<string, string> = {
  title: "Enter the title of the source.",
  toolNameAndVersion: "Enter the AI tool and its version.",
  developer: "Enter who makes the tool, for example OpenAI.",
  howUsed: "Say what you asked the tool to do and what you did with its answer.",
};

/** Empty inputs are sent as null, so the server's "required" rules see what the student left blank. */
function payload(kind: EntryKind, values: Values) {
  const pick = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, values[k]?.trim() ? values[k].trim() : null]));
  return kind === "SOURCE" ? pick(SOURCE_KEYS) : kind === "AI_USE" ? pick(AI_KEYS) : null;
}

/** Design §8.5 and FR-24e. Create chooses the kind and visibility; revise keeps both and adds a revision. */
export function LogEntryForm(props: Props) {
  const router = useRouter();
  const revising = props.mode === "revise";
  const backTo = revising ? `/components/${props.componentId}/log/${props.entryId}` : `/components/${props.componentId}/log`;
  const initial = useRef<{ kind: EntryKind; body: string; values: Values }>(null);
  const [kind, setKind] = useState<EntryKind>(revising ? props.kind : "NOTE");
  const [body, setBody] = useState(revising ? (props.body ?? "") : "");
  const [values, setValues] = useState<Values>(() => {
    const start: Values = { type: "BOOK", dateAccessed: props.today, dateGenerated: props.today };
    if (revising && props.fields) for (const [k, v] of Object.entries(props.fields)) start[k] = v ?? "";
    return start;
  });
  initial.current ??= { kind, body, values };
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Nothing typed yet counts as clean, so the guard only fires for text that would be lost.
  const dirty = body !== initial.current.body || kind !== initial.current.kind
    || Object.keys(values).some((k) => values[k] !== (initial.current?.values[k] ?? ""));
  const saving = useRef(false);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty && !saving.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const message = (key: string): string | undefined => {
    const server = error?.fieldErrors?.find((f) => f.field === `fields.${key}`)?.message;
    if (!server) return undefined;
    if (LINKS.has(key)) return linkMessage(values[key] ?? "");
    return !values[key]?.trim() && REQUIRED[key] ? REQUIRED[key] : server;
  };
  const set = (key: string) => (e: { target: { value: string } }) => setValues({ ...values, [key]: e.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const content = { body: body.trim() ? body : null, fields: payload(kind, values) };
    try {
      if (props.mode === "create") {
        await api.send("POST", `/components/${props.componentId}/log`, { kind, ...content, visibleToTeacher: visible }, logEntryDetailSchema);
      } else {
        await api.send("POST", `/log/${props.entryId}/revisions`, content, logEntryDetailSchema);
      }
      saving.current = true;
      router.push(backTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    if (dirty && !window.confirm("Leave without saving? What you've typed will be lost.")) return;
    saving.current = true;
    router.push(backTo);
  }

  const counter = (value: string, limit: number) => {
    const text = counterText(value, limit);
    return <p aria-live="polite" className="mt-1 font-mono text-app-help text-app-muted">{text}</p>;
  };

  const input = (key: string) => (
    <Field key={key} id={`log-${key}`} label={FIELD_LABELS[key as keyof typeof FIELD_LABELS] as string} error={message(key)} help={HELP[key]}>
      {(c) => LONG.has(key)
        ? <><textarea {...c} rows={3} maxLength={BODY_MAX} value={values[key] ?? ""} onChange={set(key)} />{counter(values[key] ?? "", BODY_MAX)}</>
        : <><input {...c} type={DATES.has(key) ? "date" : LINKS.has(key) ? "url" : "text"} maxLength={SHORT_MAX}
            inputMode={LINKS.has(key) ? "url" : undefined} value={values[key] ?? ""} onChange={set(key)} />
            {!DATES.has(key) && counter(values[key] ?? "", SHORT_MAX)}</>}
    </Field>
  );

  const online = isOnline((values.type ?? "BOOK") as SourceType);
  const bodyField = (
    <Field id="log-body" label={FIELD_LABELS.body[kind]} error={error?.fieldErrors?.find((f) => f.field === "body")?.message}>
      {(c) => <><textarea {...c} rows={kind === "NOTE" ? 6 : 3} maxLength={BODY_MAX} value={body} onChange={(e) => setBody(e.target.value)} />{counter(body, BODY_MAX)}</>}
    </Field>
  );
  const groupTitle = "font-mono text-app-label font-bold uppercase tracking-[.09em] text-app-muted";
  const fieldCount = error?.fieldErrors?.length ?? 0;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && (fieldCount > 0
        ? <ErrorPanel error={error} focus heading="That didn't save" fieldLabel={(f) => FIELD_LABELS[f.replace("fields.", "") as keyof typeof FIELD_LABELS]?.toString() ?? f}
            summary={`${fieldCount === 1 ? "One field needs" : `${fieldCount} fields need`} another look. Everything you typed is still here.`} />
        : <ErrorPanel error={error} focus />)}
      {revising && (
        <p className="rounded-app-control bg-app-inset px-3.5 py-2.5 text-app-small text-app-copy">
          {`Saving adds `}<strong className="text-app-ink">{`revision ${props.revisionCount + 1}`}</strong>
          {`. Revision ${props.revisionCount}, from ${formatCalendarDate(props.lastRevisedOn)}, is kept in the history.`}
        </p>
      )}
      {!revising && (
        <fieldset>
          <legend className="mb-2 text-app-base font-semibold text-app-ink">Kind of entry</legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-app-control bg-app-inset p-1">
            {(["NOTE", "SOURCE", "AI_USE"] as const).map((k) => (
              <label key={k} className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-app-inner border text-app-base has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring ${kind === k ? "border-app-field-border bg-app-surface font-bold text-app-ink" : "border-transparent text-app-grey"}`}>
                <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                {kind === k && <Check aria-hidden className="size-4" />}
                {KIND_WORD[k]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {kind === "SOURCE" ? (
        <>
          <h2 className={groupTitle}>The source</h2>
          <FieldGroup>
            <Field id="log-type" label={FIELD_LABELS.type} error={message("type")}>
              {(c) => (
                <select {...c} value={values.type} onChange={set("type")}>
                  {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              )}
            </Field>
            {["title", "author", "publication", "datePublished"].map(input)}
            {(online || values.url) && ["url", "dateAccessed"].map(input)}
          </FieldGroup>
          <h2 className={groupTitle}>Your notes on it</h2>
          <FieldGroup>
            {["locator", "keyInformation", "relevance", "reflections"].map(input)}
            {bodyField}
          </FieldGroup>
        </>
      ) : (
        <FieldGroup>
          {kind === "AI_USE" && AI_KEYS.map(input)}
          {bodyField}
        </FieldGroup>
      )}
      {!revising ? (
        <div className={`flex flex-col gap-2 rounded-app-card border border-app-field-border p-4 ${visible ? "bg-app-surface" : "bg-app-private-ground"}`}>
          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 text-app-base font-semibold text-app-ink">
            Let my teacher read this
            <span className="relative inline-flex h-7 w-12 flex-none">
              <input type="checkbox" role="switch" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
              <span aria-hidden className="absolute inset-0 rounded-full bg-app-switch-off transition-colors duration-[var(--app-duration)] motion-reduce:transition-none peer-checked:bg-app-accent" />
              <span aria-hidden className="absolute top-0.5 left-0.5 size-6 rounded-full bg-app-surface transition-transform duration-[var(--app-duration)] motion-reduce:transition-none peer-checked:translate-x-5" />
            </span>
          </label>
          <p aria-live="polite" className="flex items-start gap-2 text-app-small text-app-copy">
            {visible ? <Eye aria-hidden className="mt-0.5 size-4 flex-none" /> : <EyeOff aria-hidden className="mt-0.5 size-4 flex-none" />}
            <span>{visible ? visibilityLine(true, props.today) : <><strong className="text-app-ink">Only you can read this.</strong>{visibilityLine(false, props.today).replace("Only you can read this.", "")}</>}</span>
          </p>
        </div>
      ) : (
        <p className="text-app-small text-app-copy">
          {props.visible
            ? "Your teacher can read this entry and will see the new revision."
            : "Only you can read this entry. If you show it later, your teacher will see every revision."}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="form" disabled={busy}>
          {busy ? "Saving…" : revising ? "Save new revision" : "Save entry"}
        </Button>
        <Button type="button" variant="outline" size="form" onClick={cancel}>Cancel</Button>
      </div>
    </form>
  );
}
