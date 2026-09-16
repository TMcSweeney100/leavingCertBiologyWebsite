import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Restyled for the pilot app from design packs D-1 and D-2 (UI-BRIEF §5). Only app components use
// Button; the live BiPi schedule doesn't. Sizes use `text-[length:var(--text-app-*)]` so
// tailwind-merge sees a font size, not a colour (UI-STANDARDS §2).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-app-control border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-[background-color,border-color,color] duration-[var(--app-duration)] ease-app outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[19px]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-app-accent-hover disabled:bg-app-inset disabled:text-app-muted",
        outline: "border-app-field-border bg-app-surface text-app-copy hover:bg-app-inset disabled:opacity-60",
        destructive:
          "border-app-error/40 bg-app-surface text-app-error-hover hover:bg-app-error-tint disabled:opacity-60",
        confirmDestructive: "bg-app-error text-app-on-accent hover:bg-app-error-hover disabled:opacity-60",
        onAccent: "border-white/30 bg-white/10 text-app-on-accent hover:bg-white/20",
        link: "text-primary underline underline-offset-3 hover:text-app-accent-hover",
      },
      size: {
        default: "min-h-11 px-3.5 text-[length:var(--text-app-meta)]",
        form: "min-h-12 px-5 text-[length:var(--text-app-base)]",
        header: "min-h-11 px-3.5 text-[length:var(--text-app-small)]",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
