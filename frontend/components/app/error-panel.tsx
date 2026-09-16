import { ApiError, ApiErrorCode } from "@/lib/api/problem";

/** The one way every page shows an API failure (roadmap §6.2: "API unreachable"). */
export function ErrorPanel({ error }: { error: ApiError }) {
  const unreachable = error.code === ApiErrorCode.BACKEND_UNREACHABLE;
  return (
    <section role="alert" aria-live="polite">
      <h2>{unreachable ? "Can't reach the service" : error.title}</h2>
      <p>{unreachable ? "Check your connection and try again in a moment." : error.detail}</p>
      {/* A plain anchor to "?" reloads the current path (dropping any query), which re-runs a server page's load. */}
      <a href="?">Try again</a>
    </section>
  );
}
