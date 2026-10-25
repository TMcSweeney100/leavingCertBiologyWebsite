import * as React from "react"

import { cn } from "@/lib/utils"

// Restyled for the pilot app from design pack D-10: 16px so iOS doesn't zoom, field border, 8px radius.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "block min-h-11 w-full rounded-app-control border border-app-field-border bg-app-surface px-3 py-2.5 text-[length:var(--text-app-base)] leading-[1.45] text-app-ink outline-none placeholder:text-app-muted focus-visible:border-app-accent disabled:cursor-not-allowed disabled:bg-app-inset aria-invalid:border-app-error",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
