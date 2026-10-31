import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

// shadcn's base-nova Input, restyled for the pilot app: --app-* tokens, a 44px touch target, the Button's focus
// outline. The text size is written with an explicit `length:` hint, as in button.tsx, so tailwind-merge sees a
// font size, not a colour (UI-STANDARDS §2).
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "min-h-11 w-full min-w-0 rounded-app-control border border-app-field-border bg-app-surface px-3 py-2 text-[length:var(--text-app-base)] text-app-ink transition-[border-color] duration-[var(--app-duration)] ease-app outline-none placeholder:text-app-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-app-error",
        className
      )}
      {...props}
    />
  )
}

export { Input }
