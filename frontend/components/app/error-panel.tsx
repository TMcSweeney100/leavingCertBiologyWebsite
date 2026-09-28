"use client";

import { useEffect, useRef } from "react";

import { ApiError, ApiErrorCode } from "@/lib/api/problem";

import { textLink } from "./styles";

const SERVICE_FAILURES: ReadonlySet<string> = new Set([
  ApiErrorCode.BACKEND_UNREACHABLE,
  ApiErrorCode.UNEXPECTED_RESPONSE,
  ApiErrorCode.RESPONSE_SHAPE_UNEXPECTED,
]);

/**
 * The one way every page shows an API failure (roadmap §6.2: "API unreachable"). A validation
 * failure lists its field errors under the message, so forms don't need their own alert.
 *
 * D-1 draws it two ways: a request the service refused (wrong password, taken username) is one
 * sentence; a service that couldn't answer gets a heading and "Try again". Throttling is amber,
 * because it isn't a mistake and resolves by waiting.
 */
export function ErrorPanel({
  error,
  heading,
  summary,
  fieldLabel,
  focus,
}: {
  error: ApiError;
  /** Forces a heading on a refusal that isn't a service failure (pack D-5's "Your dates weren't saved"). */
  heading?: string;
  /** Replaces the server's detail when the panel leads with a count instead of one message. */
  summary?: string;
  /** Names a field error's target. Without it the raw field key is printed, which is fine for a
      username but not for a stage id. */
  fieldLabel?: (field: string) => string;
  /** A client form passes this so a failed submit puts keyboard focus on the message (UI-STANDARDS §83).
      Pages that failed to load don't: after a navigation, focus belongs to the main content (§105). */
  focus?: boolean;
}) {
  const unreachable = error.code === ApiErrorCode.BACKEND_UNREACHABLE;
  const serviceFailure = SERVICE_FAILURES.has(error.code) || error.status >= 500;
  const attention = error.code === "TOO_MANY_ATTEMPTS";
  const tone = attention
    ? "border-app-attention/30 border-l-app-attention bg-app-attention-tint"
    : "border-app-error/30 border-l-app-error bg-app-error-tint";
  const mark = attention ? "bg-app-attention" : "bg-app-error";
  const message = summary ?? (unreachable ? "Check your connection and try again in a moment." : error.detail || error.title);
  const title = heading ?? (unreachable ? "Can't reach the service" : error.title);
  const titled = serviceFailure || Boolean(heading);

  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus, error]);

  return (
    <section
      ref={ref}
      tabIndex={focus ? -1 : undefined}
      role="alert"
      aria-live="polite"
      className={`app-appear flex items-start gap-[9px] rounded-app-card border border-l-4 px-3.5 py-3 text-app-base leading-[1.45] text-app-copy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${tone}`}
    >
      <span
        aria-hidden="true"
        className={`mt-px flex size-5 flex-none items-center justify-center rounded-full text-app-help font-bold text-app-on-accent ${mark}`}
      >
        !
      </span>
      <div className="flex min-w-0 flex-col gap-1 text-pretty">
        {titled && (
          <h2 className={heading ? "font-heading text-[18px] font-bold tracking-[-.015em] text-app-error-hover" : "font-semibold text-app-error-hover"}>
            {title}
          </h2>
        )}
        <p>{message}</p>
        {error.fieldErrors.length > 0 && (
          <ul className="mt-1 flex flex-col gap-0.5">
            {error.fieldErrors.map((f) => (
              <li key={f.field} className="text-app-small">
                <span className="font-mono text-app-help">{fieldLabel ? fieldLabel(f.field) : f.field}</span>
                {fieldLabel ? " — " : ": "}
                {f.message}
              </li>
            ))}
          </ul>
        )}
        {serviceFailure && (
          // A plain anchor to "?" reloads the current path (dropping any query), which re-runs a server page's load.
          <a href="?" className={`mt-0.5 self-start font-semibold ${textLink}`}>
            Try again
          </a>
        )}
      </div>
    </section>
  );
}
