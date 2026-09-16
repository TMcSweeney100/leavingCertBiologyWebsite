import { ApiError, ApiErrorCode } from "@/lib/api/problem";

/**
 * The one way every page shows an API failure (roadmap §6.2: "API unreachable"). A validation
 * failure lists its field errors under the message, so forms don't need their own alert.
 */
export function ErrorPanel({ error }: { error: ApiError }) {
  const unreachable = error.code === ApiErrorCode.BACKEND_UNREACHABLE;
  return (
    <section role="alert" aria-live="polite">
      <h2>{unreachable ? "Can't reach the service" : error.title}</h2>
      <p>{unreachable ? "Check your connection and try again in a moment." : error.detail}</p>
      {error.fieldErrors.length > 0 && (
        <ul>
          {error.fieldErrors.map((f) => (
            <li key={f.field}>
              {f.field}: {f.message}
            </li>
          ))}
        </ul>
      )}
      {/* A plain anchor to "?" reloads the current path (dropping any query), which re-runs a server page's load. */}
      <a href="?">Try again</a>
    </section>
  );
}
