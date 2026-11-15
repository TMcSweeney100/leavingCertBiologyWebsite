"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";

import { cn } from "@/lib/utils";

/** shadcn's toggle group (base-nova, Base UI), restyled as the app's chips: a row of pills, the pressed one navy. Arrow keys move between them. */
function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return <ToggleGroupPrimitive data-slot="toggle-group" className={cn("flex flex-wrap items-center gap-2", className)} {...props} />;
}

function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-app-field-border bg-app-surface px-3.5 font-semibold text-app-copy touch-manipulation hover:bg-app-inset data-[pressed]:border-app-accent data-[pressed]:bg-app-accent data-[pressed]:text-app-on-accent",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
