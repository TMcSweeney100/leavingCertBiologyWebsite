import type { ReactNode } from "react";

/**
 * D-1's field group: one white card per form, rows split by hairlines, a mono label above a
 * borderless input. The row being typed in is tinted with a 2px accent edge, which is the input's
 * focus indicator; an invalid row is tinted red with its message under the input.
 */
export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-app-card border border-app-field-border bg-app-surface">{children}</div>;
}

const controlClass =
  "w-full min-w-0 border-0 bg-transparent p-0 text-app-base leading-normal text-app-ink outline-none focus-visible:outline-none";

export interface FieldControlProps {
  id: string;
  className: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

export function Field({
  id,
  label,
  help,
  error,
  controlClassName,
  children,
}: {
  id: string;
  label: string;
  /** Persistent helper text, shown before anything goes wrong (UI-STANDARDS §7). */
  help?: string;
  /** Replaces the helper text and marks the row invalid. */
  error?: string;
  controlClassName?: string;
  children: (control: FieldControlProps) => ReactNode;
}) {
  const note = error ?? help;
  const noteId = note ? `${id}-note` : undefined;
  const row = error
    ? "bg-app-error-tint shadow-[inset_2px_0_0_var(--app-error)]"
    : "focus-within:bg-app-accent-tint focus-within:shadow-[inset_2px_0_0_var(--app-accent)]";
  return (
    <div
      className={`group/field flex flex-col gap-[3px] border-b border-app-line px-[15px] pt-[11px] pb-3 transition-[background-color,box-shadow] duration-[var(--app-duration)] ease-app last:border-b-0 ${row}`}
    >
      <label
        htmlFor={id}
        className={`font-mono text-app-label font-bold uppercase tracking-[.09em] ${error ? "text-app-error-hover" : "text-app-muted group-focus-within/field:text-app-accent"}`}
      >
        {label}
      </label>
      {children({
        id,
        className: controlClassName ? `${controlClass} ${controlClassName}` : controlClass,
        "aria-describedby": noteId,
        "aria-invalid": error ? true : undefined,
      })}
      {note && (
        <p id={noteId} className={`mt-1 text-app-help leading-snug ${error ? "text-app-error-hover" : "text-app-muted"}`}>
          {note}
        </p>
      )}
    </div>
  );
}
